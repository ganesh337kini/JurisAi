"""
Chunking with LangChain's RecursiveCharacterTextSplitter.

Phase 1 requirement:
- chunk "size" is measured in **words** (not characters)
- overlap is also in words
"""

from __future__ import annotations

from langchain_text_splitters import RecursiveCharacterTextSplitter


def word_len(text: str) -> int:
    """Counts words in a whitespace-delimited way (good enough for Phase 1)."""
    if not text or not text.strip():
        return 0
    return len(text.split())


def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    """
    Split long documents into overlapping chunks.

    Why RecursiveCharacterTextSplitter?
    - It tries big separators first (paragraph breaks), which tends to keep clauses together.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=word_len,
        separators=["\n\n", "\n", " ", ""],
    )

    chunks = splitter.split_text(text)
    return [c.strip() for c in chunks if c and c.strip()]
