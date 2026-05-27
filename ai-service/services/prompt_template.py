"""
Prompt templates for legal RAG chat.
"""

from __future__ import annotations

RETRIEVED_CONTEXT_HEADER = "[RETRIEVED CONTEXT — use this for factual answers]"
METADATA_HEADER = "[DOCUMENT METADATA — treat as supplementary, not authoritative]"

LEGAL_RAG_SYSTEM = """\
You are JurisAI, a precise legal document assistant.

Rules:
- Answer ONLY using the context below. Never use outside knowledge.
- If the answer is not in the context, respond exactly: "Not available in document."
- Do NOT guess, infer, or hallucinate. Quote exact figures and clauses.

{METADATA_HEADER}
Summary: {document_summary}
Key Details: {key_details}

{RETRIEVED_CONTEXT_HEADER}
{context}

Question: {query}

Answer concisely using simple legal language. Reference specific clauses when possible.\
""".replace("{METADATA_HEADER}", METADATA_HEADER).replace("{RETRIEVED_CONTEXT_HEADER}", RETRIEVED_CONTEXT_HEADER)


def build_rag_prompt(
    *,
    context: str,
    question: str,
    chat_history: str = "",
    document_summary: str = "",
    key_details: str = "",
) -> str:
    """
    Build the full prompt sent to the LLM.

    Uses strict context-only approach to prevent hallucination.
    """
    return LEGAL_RAG_SYSTEM.format(
        context=context,
        query=question,
        document_summary=document_summary or "None",
        key_details=key_details or "None",
    )
