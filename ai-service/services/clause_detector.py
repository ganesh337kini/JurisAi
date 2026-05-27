"""
Clause segmentation and keyword-based classification for legal documents.
"""

from __future__ import annotations

import re
from typing import Any

CLAUSE_TYPES: list[dict[str, Any]] = [
    {
        "title": "Rent Clause",
        "keywords": ["rent", "lease amount", "monthly payment", "base rent", "rental fee", "pay landlord"],
        "importance": "High",
    },
    {
        "title": "Security Deposit Clause",
        "keywords": ["deposit", "security deposit", "refundable deposit", "advance deposit"],
        "importance": "High",
    },
    {
        "title": "Termination Clause",
        "keywords": ["terminate", "termination", "end agreement", "cancel lease", "eviction", "vacate"],
        "importance": "High",
    },
    {
        "title": "Maintenance Clause",
        "keywords": ["maintenance", "repair", "damage", "upkeep", "structural", "condition"],
        "importance": "Medium",
    },
    {
        "title": "Penalty Clause",
        "keywords": ["penalty", "fine", "late fee", "overdue", "interest on late", "default charge"],
        "importance": "High",
    },
    {
        "title": "Confidentiality Clause",
        "keywords": ["confidential", "confidentiality", "non-disclosure", "nda", "secrecy", "proprietary"],
        "importance": "High",
    },
    {
        "title": "Governing Law Clause",
        "keywords": ["governing law", "jurisdiction", "courts of", "applicable law", "laws of the state"],
        "importance": "Medium",
    },
    {
        "title": "Force Majeure Clause",
        "keywords": ["force majeure", "act of god", "unforeseen", "natural disaster", "pandemic", "beyond control"],
        "importance": "Medium",
    },
    {
        "title": "Indemnification Clause",
        "keywords": ["indemnify", "indemnification", "hold harmless", "defend against", "liability", "damages caused"],
        "importance": "High",
    },
    {
        "title": "Dispute Resolution Clause",
        "keywords": ["arbitration", "dispute", "mediation", "settle", "resolution", "legal proceedings"],
        "importance": "High",
    },
]

# Require at least this many keyword hits to classify (reduces false positives).
_MIN_KEYWORD_SCORE = 2


def _split_paragraphs(text: str) -> list[str]:
    raw = re.split(r"\n\s*\n+|\r\n\s*\r\n+", text or "")
    paragraphs = [re.sub(r"\s+", " ", p).strip() for p in raw if p.strip()]
    if len(paragraphs) <= 1 and len(text or "") > 200:
        # Split on numbered section/article/clause headers (e.g. "1. RENT", "Article II", "SECTION 3")
        numbered = re.split(
            r"(?=(?:\d+[\.\)]\s+|Section\s+\d+|Article\s+[IVXLC]+|SECTION\s+\d+|CLAUSE\s+\d+))",
            text,
            flags=re.IGNORECASE,
        )
        paragraphs = [re.sub(r"\s+", " ", p).strip() for p in numbered if len(p.strip()) > 40]
    if len(paragraphs) <= 1:
        sentences = re.split(r"(?<=[.!?])\s+", text or "")
        paragraphs = []
        buf: list[str] = []
        for s in sentences:
            buf.append(s)
            if len(" ".join(buf)) > 280:
                paragraphs.append(" ".join(buf).strip())
                buf = []
        if buf:
            paragraphs.append(" ".join(buf).strip())
    return paragraphs


_STRONG_KEYWORDS = {
    "rent", "deposit", "terminate", "termination", "indemnify", "indemnification",
    "arbitration", "force majeure", "governing law", "jurisdiction", "confidentiality"
}


def _score_paragraph(paragraph: str, keywords: list[str]) -> int:
    lower = paragraph.lower()
    score = 0
    for kw in keywords:
        if " " in kw:
            if kw in lower:
                score += 2
        elif kw in _STRONG_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", lower):
                score += 2
        elif re.search(rf"\b{re.escape(kw)}\b", lower):
            score += 1
    return score


def detect_clauses(text: str) -> list[dict[str, str]]:
    """
    Split document into paragraphs and classify into known clause types.

    A paragraph must match at least two keywords (or one multi-word phrase) to qualify.
    """
    if not (text or "").strip():
        return []

    paragraphs = _split_paragraphs(text)
    clauses: list[dict[str, str]] = []
    used_indices: set[int] = set()

    for clause_type in CLAUSE_TYPES:
        best_idx = -1
        best_score = 0
        for idx, para in enumerate(paragraphs):
            if idx in used_indices:
                continue
            score = _score_paragraph(para, clause_type["keywords"])
            if score > best_score:
                best_score = score
                best_idx = idx

        if best_score >= _MIN_KEYWORD_SCORE and best_idx >= 0:
            used_indices.add(best_idx)
            snippet = paragraphs[best_idx]
            if len(snippet) > 600:
                snippet = snippet[:597] + "…"
            clauses.append(
                {
                    "title": clause_type["title"],
                    "text": snippet,
                    "importance": clause_type["importance"],
                }
            )

    for idx, para in enumerate(paragraphs):
        if idx in used_indices or len(para) < 80:
            continue
        if len(para) > 400:
            clauses.append(
                {
                    "title": "General Provision",
                    "text": para[:597] + ("…" if len(para) > 600 else ""),
                    "importance": "Low",
                }
            )
            if len([c for c in clauses if c["title"] == "General Provision"]) >= 2:
                break

    return clauses
