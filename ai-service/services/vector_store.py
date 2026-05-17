"""
Vector storage in ChromaDB.

We store:
- embedding vectors (computed by SentenceTransformers)
- chunk text as the Chroma "document"
- metadata for filtering (user_id, document_id, filename, chunk_index, chunk_id)
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import chromadb
from chromadb.config import Settings
from langchain_community.embeddings import SentenceTransformerEmbeddings


def _persist_dir() -> str:
    base = Path(__file__).resolve().parent.parent
    env_dir = os.getenv("CHROMA_PERSIST_DIR")
    path = Path(env_dir) if env_dir else (base / "chroma_db")
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


_client = None
_collection = None
_embeddings = None


def get_embeddings() -> SentenceTransformerEmbeddings:
    """Lazy-load embeddings model (first request downloads weights)."""
    global _embeddings
    if _embeddings is None:
        _embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings


def get_collection():
    """
    Chroma persistent client + collection.

    Beginner note: "persistent" means vectors survive service restarts on disk.
    """
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(
            path=_persist_dir(),
            settings=Settings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name="jurisai_chunks",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def upsert_chunks(
    *,
    user_id: str,
    document_id: str,
    filename: str,
    chunks: list[str],
) -> int:
    """
    Embed each chunk and insert into Chroma.

    Returns number of chunks stored.
    """
    if not chunks:
        return 0

    embedder = get_embeddings()
    vectors = embedder.embed_documents(chunks)

    ids: list[str] = []
    metadatas: list[dict] = []

    for idx, _chunk in enumerate(chunks):
        chunk_id = str(uuid.uuid4())
        ids.append(chunk_id)
        metadatas.append(
            {
                "user_id": user_id,
                "document_id": document_id,
                "filename": filename,
                "chunk_index": int(idx),
                "chunk_id": chunk_id,
            }
        )

    col = get_collection()
    col.add(ids=ids, embeddings=vectors, documents=chunks, metadatas=metadatas)
    return len(chunks)


def purge_document(document_id: str) -> None:
    """Delete all vectors tied to a single Mongo document id."""
    col = get_collection()
    col.delete(where={"document_id": document_id})
