"""Unit tests for document chunking."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

# Allow imports from ai-service root when running tests directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.chunking import MIN_CHUNK_WORDS, chunk_text, word_len


class TestChunking(unittest.TestCase):
    def test_no_chunk_under_min_words_on_long_doc_with_short_tail(self):
        """~3000-word body plus a 2-sentence tail must not leave tiny chunks."""
        body = "obligation " * 2990
        tail = "The monthly rent is INR 42,500. Late fees apply after the fifth."
        text = body + tail

        chunks = chunk_text(text)

        self.assertGreater(len(chunks), 0)
        for index, chunk in enumerate(chunks):
            count = word_len(chunk)
            self.assertGreaterEqual(
                count,
                MIN_CHUNK_WORDS,
                f"chunk {index} has {count} words (minimum {MIN_CHUNK_WORDS})",
            )


if __name__ == "__main__":
    unittest.main()
