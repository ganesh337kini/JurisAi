"""
Clause segmentation and keyword-based classification for legal documents.
"""

from __future__ import annotations

import re
from typing import Any

CLAUSE_TYPES: list[dict[str, Any]] = [
    {
        "title": "Rent Clause",
        "keywords": ["rent", "rental", "monthly payment", "lease amount", "payable on"],
        "importance": "High",
    },
    {
        "title": "Security Deposit Clause",
        "keywords": ["security deposit", "refundable deposit", "advance deposit", "earnest money"],
        "importance": "High",
    },
    {
        "title": "Termination Clause",
        "keywords": [
            "terminate",
            "termination",
            "notice period",
            "vacate",
            "end of agreement",
            "expiry",
        ],
        "importance": "High",
    },
    {
        "title": "Maintenance Clause",
        "keywords": [
            "maintenance",
            "repairs",
            "upkeep",
            "structural",
            "utilities",
            "society charges",
        ],
        "importance": "Medium",
    },
    {
        "title": "Penalty Clause",
        "keywords": [
            "penalty",
            "penal",
            "late fee",
            "default",
            "breach",
            "damages",
            "forfeit",
        ],
        "importance": "High",
    },
]


def _split_paragraphs(text: str) -> list[str]:
    raw = re.split(r"\n\s*\n+|\r\n\s*\r\n+", text or "")
    paragraphs = [re.sub(r"\s+", " ", p).strip() for p in raw if p.strip()]
    if len(paragraphs) <= 1 and len(text or "") > 200:
        # Fallback: split on numbered clauses or sentence groups
        numbered = re.split(r"(?=\d+[\.\)]\s+)", text)
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


def _score_paragraph(paragraph: str, keywords: list[str]) -> int:
    lower = paragraph.lower()
    return sum(1 for kw in keywords if kw in lower)


def detect_clauses(text: str) -> list[dict[str, str]]:
    """
    Split document into paragraphs and classify into known clause types.
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

        if best_score > 0 and best_idx >= 0:
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

    # Add uncategorized substantial paragraphs as "General Provision"
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
