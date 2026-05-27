"""
Document summarization using HuggingFace transformers.
Uses distilbart-cnn by default (lighter than bart-large-cnn for local dev).
"""

from __future__ import annotations

import os
import re
from functools import lru_cache


def _model_name() -> str:
    return os.getenv("SUMMARIZER_MODEL", "sshleifer/distilbart-cnn-12-6")


@lru_cache(maxsize=1)
def _get_summarizer():
    from transformers import pipeline

    return pipeline(
        "summarization",
        model=_model_name(),
        device=-1,
    )


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text


def _chunk_for_model(text: str, max_chars: int = 3500) -> list[str]:
    """Split long documents at sentence boundaries for the summarizer."""
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    start = 0
    overlap = 400
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunk = text[start:end]
        if end < len(text):
            last_period = chunk.rfind(". ")
            if last_period > max_chars // 2:
                chunk = chunk[: last_period + 1]
                end = start + len(chunk)
        chunks.append(chunk.strip())
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return [c for c in chunks if c]


def _summarize_chunk(summarizer, chunk: str, max_length: int, min_length: int) -> str:
    if not chunk.strip():
        return ""
        
    words = len(chunk.split())
    if words < max_length:
        max_length = max(10, words - 1)
        min_length = min(min_length, max(5, max_length // 2))
    try:
        result = summarizer(
            chunk,
            max_length=max_length,
            min_length=min_length,
            do_sample=False,
            truncation=True,
        )
        return result[0]["summary_text"].strip()
    except Exception:
        sentences = re.split(r"(?<=[.!?])\s+", chunk)
        return " ".join(sentences[:3]).strip()


def _structure_summary(summary: str) -> str:
    """Format multi-sentence summaries as readable bullets without changing API fields."""
    if not summary:
        return ""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", summary) if s.strip()]
    if len(sentences) <= 1:
        return summary
    return "\n".join(f"• {s}" for s in sentences[:6])


def summarize_document(text: str) -> dict[str, str]:
    """
    Returns a structured full summary and a concise short summary.

    Length caps preserve legal meaning while avoiding oversized dashboard text.
    """
    text = _clean_text(text)
    if not text:
        return {"summary": "", "short_summary": ""}

    summarizer = _get_summarizer()
    chunks = _chunk_for_model(text)

    if len(chunks) == 1:
        summary = _summarize_chunk(summarizer, chunks[0], max_length=150, min_length=35)
    else:
        partials = [_summarize_chunk(summarizer, c, max_length=100, min_length=20) for c in chunks]
        combined = " ".join(partials)
        if len(combined) > 500:
            combined = _chunk_for_model(combined, max_chars=2000)[0]
        summary = _summarize_chunk(summarizer, combined, max_length=150, min_length=35)

    summary = _structure_summary(summary or text[:500])
    if len(summary) > 1200:
        summary = summary[:1197] + "…"

    short = _summarize_chunk(summarizer, summary or text[:2000], max_length=45, min_length=12)
    if not short and summary:
        sentences = re.split(r"(?<=[.!?])\s+", summary.replace("• ", ""))
        short = " ".join(sentences[:2])

    if short:
        sentences = re.split(r"(?<=[.!?])\s+", short)
        if len(sentences) > 1 and not re.search(r"[.!?]$", sentences[-1]):
            short = " ".join(sentences[:-1]).strip()
        else:
            short = short.strip()
            if not re.search(r"[.!?]$", short):
                short += "."

    if len(short) > 280:
        short = short[:277] + "…"

    return {
        "summary": summary,
        "short_summary": short or summary[:200] or text[:200],
    }
