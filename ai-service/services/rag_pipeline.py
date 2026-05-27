"""
RAG pipeline: retrieve chunks → build prompt → generate answer.
Integrates Phase 2 analysis context when provided.
"""

from __future__ import annotations

from services.llm_handler import NOT_FOUND_PHRASE, generate_answer
from services.prompt_template import build_rag_prompt
from services.rag_settings import get_rag_top_k
from services.retriever import format_context, retrieve_chunks


def _format_key_details(entities: dict | None) -> str:
    if not entities:
        return ""
    labels = {
        "owner": "Owner",
        "tenant": "Tenant",
        "rent": "Rent",
        "deposit": "Deposit",
        "duration": "Duration",
        "address": "Address",
    }
    lines = []
    for key, label in labels.items():
        val = entities.get(key)
        if val:
            lines.append(f"- {label}: {val}")
    return "\n".join(lines)


def _format_chat_history(messages: list[dict] | None, limit: int = 6) -> str:
    if not messages:
        return ""
    recent = messages[-limit:]
    lines = []
    for msg in recent:
        role = msg.get("role", "user")
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        label = "User" if role == "user" else "Assistant"
        lines.append(f"{label}: {content}")
    return "\n".join(lines)


def run_rag_chat(
    *,
    user_id: str,
    document_id: str,
    query: str,
    top_k: int = 5,
    chat_history: list[dict] | None = None,
    document_summary: str = "",
    entities: dict | None = None,
) -> dict:
    """
    Full RAG flow. Returns answer and source chunks.

    top_k defaults to the legacy value of 5 in the signature; when callers pass 5
    (including the HTTP default), RAG_TOP_K from the environment is used instead
    (default 3) so retrieval width can be tuned without code changes.
    """
    query = (query or "").strip()
    if not query:
        raise ValueError("Query cannot be empty.")

    effective_top_k = get_rag_top_k() if top_k == 5 else top_k

    chunks = retrieve_chunks(
        user_id=user_id,
        document_id=document_id,
        query=query,
        top_k=effective_top_k,
    )

    context = format_context(chunks)

    print("=== RETRIEVED CHUNKS ===")
    print(context)
    history_str = _format_chat_history(chat_history)
    key_details = _format_key_details(entities)

    prompt = build_rag_prompt(
        context=context,
        question=query,
        chat_history=history_str,
        document_summary=document_summary or "",
        key_details=key_details,
    )

    if not chunks:
        answer = NOT_FOUND_PHRASE
    else:
        answer = generate_answer(prompt)
        if not answer:
            answer = NOT_FOUND_PHRASE

    sources = [
        {
            "chunk_index": c.chunk_index,
            "text": c.text[:500] + ("…" if len(c.text) > 500 else ""),
            "score": c.score,
            "chunk_id": c.chunk_id,
        }
        for c in chunks
    ]

    return {
        "answer": answer,
        "sources": sources,
    }
