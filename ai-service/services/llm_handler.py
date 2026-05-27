"""
LLM handler — OpenAI when configured, otherwise HuggingFace or extractive fallback.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache

from services.prompt_template import METADATA_HEADER, RETRIEVED_CONTEXT_HEADER

NOT_FOUND_PHRASE = "This information is not present in the document."

_HF_MAX_PROMPT_CHARS = 1500


@lru_cache(maxsize=1)
def _openai_available() -> bool:
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


def _generate_openai(prompt: str) -> str:
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage

    model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    llm = ChatOpenAI(model=model, temperature=0.2, timeout=120)

    system = (
        "You are JurisAI, a legal document assistant. "
        "Answer only from the user's context. Use simple English."
    )
    response = llm.invoke(
        [
            SystemMessage(content=system),
            HumanMessage(content=prompt),
        ]
    )
    return (response.content or "").strip()


@lru_cache(maxsize=1)
def _get_hf_pipeline():
    from transformers import pipeline

    model_name = os.getenv("HF_LLM_MODEL", "google/flan-t5-base")
    return pipeline(
        "text2text-generation",
        model=model_name,
        max_new_tokens=256,
        device=-1,
    )


def _truncate_retrieved_context(prompt: str, max_total_chars: int = _HF_MAX_PROMPT_CHARS) -> str:
    """
    Shorten only the retrieved-context body so the question and instructions stay intact.

    Previously the full prompt was tail-truncated, which could drop the question when
    many chunks were included.
    """
    if len(prompt) <= max_total_chars:
        return prompt

    header_idx = prompt.find(RETRIEVED_CONTEXT_HEADER)
    if header_idx < 0:
        return prompt[:max_total_chars]

    context_start = header_idx + len(RETRIEVED_CONTEXT_HEADER)
    while context_start < len(prompt) and prompt[context_start] in "\r\n":
        context_start += 1

    metadata_idx = prompt.find(METADATA_HEADER, context_start)
    question_idx = prompt.find("\nQuestion:", context_start)

    end_candidates = [i for i in (metadata_idx, question_idx) if i >= 0]
    context_end = min(end_candidates) if end_candidates else len(prompt)

    prefix = prompt[:context_start]
    context_body = prompt[context_start:context_end]
    suffix = prompt[context_end:]

    budget = max_total_chars - len(prefix) - len(suffix)
    if budget < 200:
        return prefix.rstrip() + "\n\n" + suffix.lstrip()

    if len(context_body) > budget:
        context_body = context_body[:budget].rstrip() + "\n…[context truncated]"

    return prefix + context_body + suffix


def _generate_huggingface(prompt: str) -> str:
    """
    Run the HF text2seq model on a length-limited prompt.

    Truncates only the retrieved-context section so the question is always preserved.
    """
    truncated = _truncate_retrieved_context(prompt)
    pipe = _get_hf_pipeline()
    result = pipe(truncated)
    text = result[0].get("generated_text", "").strip()
    return text or NOT_FOUND_PHRASE


def _extract_retrieved_context(prompt: str) -> str:
    """Pull the factual context block from the structured RAG prompt."""
    pattern = (
        re.escape(RETRIEVED_CONTEXT_HEADER)
        + r"\s*\n(.*?)(?=\n"
        + re.escape(METADATA_HEADER)
        + r"|\nQuestion:|\Z)"
    )
    match = re.search(pattern, prompt, re.DOTALL)
    if match:
        return match.group(1).strip()

    legacy = re.search(
        r"Context:\n(.*?)\n\nQuestion:",
        prompt,
        re.DOTALL | re.IGNORECASE,
    )
    return legacy.group(1).strip() if legacy else ""


def _generate_extractive(prompt: str) -> str:
    """
    Lightweight fallback when no API key / HF model: answer from context block.
    Reads the [RETRIEVED CONTEXT] section only so supplementary metadata cannot
    override vector-retrieved excerpts.
    """
    question_match = re.search(r"Question:\s*(.+?)\n\n", prompt, re.DOTALL)

    context = _extract_retrieved_context(prompt)
    question = (question_match.group(1).strip() if question_match else "").strip()

    if not context or context == "(No relevant passages retrieved.)":
        return NOT_FOUND_PHRASE

    if not question:
        return NOT_FOUND_PHRASE

    excerpts = re.split(r"\[Excerpt \d+[^\]]*\]\n", context)
    excerpts = [e.strip() for e in excerpts if e.strip()]

    if not excerpts:
        excerpts = [context.strip()]

    stop_words = {"what", "when", "where", "which", "who", "whom", "this", "that", "these", "those", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can", "will", "just", "should", "now"}
    q_words = {w for w in re.findall(r"[a-z]{3,}", question.lower()) if w not in stop_words}
    
    all_sentences = []
    for ex in excerpts:
        ex = re.sub(r"^\[Excerpt \d+[^\]]*\]\s*", "", ex).strip()
        sentences = re.split(r"(?<=[.!?\n])\s+", ex)
        for s in sentences:
            if s.strip():
                all_sentences.append(s.strip())
                
    scored_sentences = []
    for s in all_sentences:
        s_words = set(re.findall(r"[a-z]{3,}", s.lower()))
        overlap = q_words & s_words
        if overlap:
            score = len(overlap)
            scored_sentences.append((score, s))

    if not scored_sentences:
        return NOT_FOUND_PHRASE

    # Sort by score descending (most relevant first)
    scored_sentences.sort(key=lambda x: x[0], reverse=True)

    seen = set()
    final_sentences = []
    for score, s in scored_sentences:
        if s not in seen:
            seen.add(s)
            final_sentences.append(s)
            if len(final_sentences) >= 3:
                break

    answer = " ".join(final_sentences)
    if len(answer) < 10:
        return NOT_FOUND_PHRASE

    return f"Based on the document: {answer}"


def generate_answer(prompt: str) -> str:
    """
    Generate an answer from the constructed RAG prompt.

    HF mode truncates retrieved context only; OpenAI receives the full prompt.
    Uses HuggingFace flan-t5-base by default for local generative answers.
    """
    if _openai_available():
        try:
            return _generate_openai(prompt)
        except Exception as exc:
            print(f"OpenAI failed, falling back: {exc}")

    # Use HF model only if explicitly enabled
    if os.getenv("USE_HF_LLM", "false").lower() == "true":
        try:
            return _generate_huggingface(prompt)
        except Exception as exc:
            print(f"HuggingFace LLM failed, falling back: {exc}")

    return _generate_extractive(prompt)
