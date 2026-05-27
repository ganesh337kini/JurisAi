"""
Retrieve relevant document chunks from ChromaDB for RAG.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from services.rag_settings import get_rag_distance_threshold
from services.vector_store import get_collection, get_embeddings

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    text: str
    chunk_index: int
    score: float
    chunk_id: str
    filename: str


def _apply_distance_threshold(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    """
    Drop low-confidence matches above the cosine distance threshold.

    If every chunk is filtered out, keep the top-1 result so the pipeline still
    has something to ground on.
    """
    if not chunks:
        return []

    threshold = get_rag_distance_threshold()
    filtered = [c for c in chunks if c.score <= threshold]

    if not filtered:
        logger.warning(
            "All %d retrieved chunks exceeded distance threshold %.2f; keeping top-1 result",
            len(chunks),
            threshold,
        )
        return [chunks[0]]

    removed = len(chunks) - len(filtered)
    if removed:
        logger.warning(
            "Filtered %d low-confidence chunk(s) with distance > %.2f",
            removed,
            threshold,
        )
    return filtered


def retrieve_chunks(
    *,
    user_id: str,
    document_id: str,
    query: str,
    top_k: int = 5,
) -> list[RetrievedChunk]:
    """
    Embed the query and fetch the most similar chunks for this user + document.

    Results are ordered by relevance; chunks with distance above
    RAG_DISTANCE_THRESHOLD (default 0.75) are dropped unless that would leave none.
    """
    query = (query or "").strip()
    if not query:
        return []

    embedder = get_embeddings()
    query_vector = embedder.embed_query(query)

    col = get_collection()
    try:
        results = col.query(
            query_embeddings=[query_vector],
            n_results=top_k,
            where={
                "$and": [
                    {"user_id": {"$eq": user_id}},
                    {"document_id": {"$eq": document_id}},
                ]
            },
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        # Older Chroma versions may use simpler where syntax
        results = col.query(
            query_embeddings=[query_vector],
            n_results=top_k,
            where={"document_id": document_id},
            include=["documents", "metadatas", "distances"],
        )

    documents = results.get("documents") or [[]]
    metadatas = results.get("metadatas") or [[]]
    distances = results.get("distances") or [[]]

    if not documents[0]:
        return []

    chunks: list[RetrievedChunk] = []
    for text, meta, dist in zip(documents[0], metadatas[0], distances[0]):
        if not text:
            continue
        meta = meta or {}
        # Filter by user_id if Chroma returned broader results
        if meta.get("user_id") and meta.get("user_id") != user_id:
            continue
        chunks.append(
            RetrievedChunk(
                text=text,
                chunk_index=int(meta.get("chunk_index", 0)),
                score=float(dist) if dist is not None else 0.0,
                chunk_id=str(meta.get("chunk_id", "")),
                filename=str(meta.get("filename", "")),
            )
        )

    return _apply_distance_threshold(chunks)


def format_context(chunks: list[RetrievedChunk]) -> str:
    """Combine retrieved chunks into a single context block for the LLM."""
    if not chunks:
        return ""

    parts: list[str] = []
    for chunk in chunks:
        parts.append(chunk.text.strip())
    return "\n\n".join(parts)
