"""
Convert legal language into plain English.
Rule-based replacements plus optional summarizer compression for beginner mode.
"""

from __future__ import annotations

import re

LEGAL_REPLACEMENTS: list[tuple[str, str]] = [
    (r"\blessee\b", "tenant"),
    (r"\blessor\b", "landlord"),
    (r"\bhereinafter\b", "from now on called"),
    (r"\bwhereas\b", "whereas"),
    (r"\bnotwithstanding\b", "despite"),
    (r"\bindemnify\b", "compensate or cover damages for"),
    (r"\bindemnification\b", "compensation for damages"),
    (r"\bshall\b", "will"),
    (r"\bherein\b", "in this document"),
    (r"\bhereby\b", "by this document"),
    (r"\bhereof\b", "of this agreement"),
    (r"\bthereof\b", "of that"),
    (r"\btherein\b", "in that"),
    (r"\bforthwith\b", "immediately"),
    (r"\bmutatis mutandis\b", "with necessary changes"),
    (r"\bforce majeure\b", "events outside anyone's control (like natural disasters)"),
    (r"\bpenalty\b", "fine"),
    (r"\bdefault\b", "failure to follow the agreement"),
    (r"\bterminate\b", "end"),
    (r"\btermination\b", "ending"),
    (r"\bobligation\b", "duty"),
    (r"\bobligations\b", "duties"),
    (r"\bparty\b", "person or company in the agreement"),
    (r"\bparties\b", "people or companies in the agreement"),
    (r"\bpremises\b", "property"),
    (r"\bconsideration\b", "payment or benefit exchanged"),
    (r"\bwhereof\b", "of which"),
    (r"\bwitnesseth\b", "shows that"),
    (r"\bexecuted\b", "signed"),
    (r"\bexecution\b", "signing"),
]

BEGINNER_EXTRA: list[tuple[str, str]] = [
    (r"\bnotwithstanding anything contained herein\b", "no matter what else this document says"),
    (r"\bto the fullest extent permitted by law\b", "as much as the law allows"),
    (r"\bwithout prejudice\b", "without giving up other legal rights"),
    (r"\btime is of the essence\b", "deadlines in this agreement are very important"),
]


def _apply_replacements(text: str, pairs: list[tuple[str, str]]) -> str:
    result = text
    for pattern, replacement in pairs:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result


def _shorten_sentences(text: str, max_words: int = 22) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    out: list[str] = []
    for s in sentences:
        words = s.split()
        if len(words) <= max_words:
            out.append(s)
        else:
            mid = len(words) // 2
            out.append(" ".join(words[:mid]) + ".")
            out.append(" ".join(words[mid:]))
    return " ".join(out)


def simplify_text(text: str, mode: str = "normal") -> str:
    """
    mode: 'normal' | 'beginner'
    """
    if not (text or "").strip():
        return ""

    simplified = _apply_replacements(text, LEGAL_REPLACEMENTS)
    if mode == "beginner":
        simplified = _apply_replacements(simplified, BEGINNER_EXTRA)
        simplified = _shorten_sentences(simplified, max_words=18)

    # Trim excessive whitespace
    simplified = re.sub(r"\s+", " ", simplified).strip()

    # For very long docs, use summarizer for a readable plain-English overview
    if len(simplified) > 4000:
        try:
            from services.summarizer import summarize_document

            short = summarize_document(simplified)["summary"]
            if short:
                header = (
                    "This is a plain-language overview of your document:\n\n"
                    if mode == "beginner"
                    else "Plain-language summary:\n\n"
                )
                return header + short + "\n\n[Full simplified text available in legal view.]"
        except Exception:
            simplified = simplified[:4000] + "…"

    return simplified
