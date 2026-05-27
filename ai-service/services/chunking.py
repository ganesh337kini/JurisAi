"""
Chunking with LangChain's RecursiveCharacterTextSplitter.

Phase 1 requirement:
- chunk "size" is measured in **words** (not characters)
- overlap is also in words
"""

from __future__ import annotations

from langchain_text_splitters import RecursiveCharacterTextSplitter

MIN_CHUNK_WORDS = 100


def word_len(text: str) -> int:
    """Counts words in a whitespace-delimited way (good enough for Phase 1)."""
    if not text or not text.strip():
        return 0
    return len(text.split())


def _merge_small_chunks(chunks: list[str], min_words: int = MIN_CHUNK_WORDS) -> list[str]:
    """
    Merge undersized chunks into a neighbor so tails/headers are not isolated.

    Prefers merging forward into the next chunk; the last chunk merges backward.
    """
    if len(chunks) <= 1:
        return chunks

    merged = [c for c in chunks if c and c.strip()]
    i = 0
    while i < len(merged):
        if word_len(merged[i]) >= min_words:
            i += 1
            continue
        if i < len(merged) - 1:
            merged[i] = f"{merged[i].strip()}\n\n{merged[i + 1].strip()}".strip()
            del merged[i + 1]
            continue
        if i > 0:
            merged[i - 1] = f"{merged[i - 1].strip()}\n\n{merged[i].strip()}".strip()
            del merged[i]
            i -= 1
            continue
        i += 1
    return merged


def chunk_text(text: str, chunk_size: int = 600, chunk_overlap: int = 100) -> list[str]:
    """
    Split long documents into overlapping chunks.

    Uses RecursiveCharacterTextSplitter (paragraph-first separators), then merges
    any chunk under MIN_CHUNK_WORDS into an adjacent chunk to avoid tiny tails.
    Default overlap was raised to 100 words for better continuity across boundaries.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=word_len,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    )

    chunks = splitter.split_text(text)
    stripped = [c.strip() for c in chunks if c and c.strip()]
    return _merge_small_chunks(stripped)
