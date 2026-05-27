"""
Orchestrates Phase 2 document analysis pipeline.
"""

from __future__ import annotations

from services.clause_detector import detect_clauses
from services.ner import extract_entities
from services.simplifier import simplify_text
from services.summarizer import summarize_document
from services.risk_detector import detect_risks


def analyze_document_text(text: str, explanation_mode: str = "normal") -> dict:
    """
    Run full analysis on extracted document text.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("Document has no extracted text. Re-upload or ensure OCR succeeded.")

    if len(cleaned) < 20:
        raise ValueError("Document text is too short to analyze.")

    summaries = summarize_document(cleaned)
    entities = extract_entities(cleaned)
    clauses = detect_clauses(cleaned)
    simplified = simplify_text(cleaned, mode=explanation_mode)
    risks = detect_risks(cleaned, clauses, entities)

    return {
        "summary": summaries["summary"],
        "short_summary": summaries["short_summary"],
        "entities": entities,
        "clauses": clauses,
        "simplified_text": simplified,
        "risks": risks,
    }
