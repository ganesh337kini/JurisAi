"""
Named-entity and pattern extraction for legal rental/lease documents.
spaCy when available; regex fallbacks always run.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

# Common legal role labels in Indian rental agreements
OWNER_PATTERNS = [
    r"(?:lessor|landlord|owner|licensor)[ \t]*[:\-]?[ \t]*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){0,3})",
    r"Mr\.?[ \t]*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)?)[ \t]*,?(?:.{0,30})?(?:lessor|landlord|owner)",
]
TENANT_PATTERNS = [
    r"(?:lessee|tenant|licensee)[ \t]*[:\-]?[ \t]*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){0,3})",
    r"Mr\.?[ \t]*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)?)[ \t]*,?(?:.{0,30})?(?:lessee|tenant)",
]
RENT_PATTERNS = [
    r"(?:monthly\s+)?rent(?:al)?(?:\s+amount)?\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)",
    r"pay(?:able)?\s+(?:a\s+)?(?:monthly\s+)?rent\s+of\s+(?:Rs\.?|INR|₹)?\s*([\d,]+)",
]
DEPOSIT_PATTERNS = [
    r"(?:security\s+)?deposit\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)",
    r"refundable\s+deposit\s+of\s+(?:Rs\.?|INR|₹)?\s*([\d,]+)",
]
DURATION_PATTERNS = [
    r"(?:period|term|duration|tenancy)\s+(?:of\s+)?(\d+)\s*(months?|years?)",
    r"for\s+a\s+period\s+of\s+(\d+)\s*(months?|years?)",
    r"(\d+)\s*(months?|years?)\s+(?:from|commencing)",
]
ADDRESS_PATTERNS = [
    r"(?:premises|property|address|located\s+at)\s*[:\-]?\s*([A-Za-z0-9\s,.\-]{10,80}?)(?:\.|,|\n|$)",
    r"at\s+([A-Z][a-z]+(?:\s+[A-Za-z]+){0,5}(?:,\s*[A-Za-z]+)?)",
]


def _first_match(patterns: list[str], text: str, group: int = 1) -> str:
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
        if m:
            val = m.group(group).strip()
            if val and len(val) > 1:
                return val
    return ""


def _normalize_money(val: str) -> str:
    return re.sub(r"[^\d.]", "", val) if val else ""


@lru_cache(maxsize=1)
def _get_nlp():
    try:
        import spacy

        try:
            return spacy.load("en_core_web_sm")
        except OSError:
            return None
    except ImportError:
        return None


def _extract_with_spacy(text: str) -> dict[str, str]:
    nlp = _get_nlp()
    if nlp is None:
        return {}

    doc = nlp(text[:100000])
    persons: list[str] = []
    dates: list[str] = []
    money: list[str] = []
    locations: list[str] = []

    for ent in doc.ents:
        if ent.label_ == "PERSON" and ent.text not in persons:
            persons.append(ent.text)
        elif ent.label_ == "DATE" and ent.text not in dates:
            dates.append(ent.text)
        elif ent.label_ == "MONEY" and ent.text not in money:
            money.append(ent.text)
        elif ent.label_ in ("GPE", "LOC", "FAC") and ent.text not in locations:
            locations.append(ent.text)

    result: dict[str, str] = {}
    if len(persons) >= 1:
        result.setdefault("owner", persons[0])
    if len(persons) >= 2:
        result.setdefault("tenant", persons[1])
    if money:
        nums = [_normalize_money(m) for m in money if _normalize_money(m)]
        if nums:
            result.setdefault("rent", nums[0])
            if len(nums) > 1:
                result.setdefault("deposit", nums[1])
    if dates:
        result.setdefault("duration", dates[0])
    if locations:
        result.setdefault("address", locations[0])

    return result


def extract_entities(text: str) -> dict[str, Any]:
    """
    Extract structured key details from legal document text.
    """
    if not (text or "").strip():
        return {
            "owner": "",
            "tenant": "",
            "rent": "",
            "deposit": "",
            "duration": "",
            "address": "",
        }

    regex_entities = {
        "owner": _first_match(OWNER_PATTERNS, text),
        "tenant": _first_match(TENANT_PATTERNS, text),
        "rent": _normalize_money(_first_match(RENT_PATTERNS, text)),
        "deposit": _normalize_money(_first_match(DEPOSIT_PATTERNS, text)),
        "duration": "",
        "address": _first_match(ADDRESS_PATTERNS, text),
    }

    dur_m = None
    for pat in DURATION_PATTERNS:
        dur_m = re.search(pat, text, re.IGNORECASE)
        if dur_m:
            break
    if dur_m:
        regex_entities["duration"] = f"{dur_m.group(1)} {dur_m.group(2)}"
    else:
        term_m = re.search(r"term[ \t]*[:\-]?[ \t]*(\d+[ \t]*months?)", text, re.IGNORECASE)
        if term_m:
            regex_entities["duration"] = term_m.group(1).strip()

    spacy_entities = _extract_with_spacy(text)

    merged: dict[str, str] = {}
    for key in ("owner", "tenant", "rent", "deposit", "duration", "address"):
        merged[key] = regex_entities.get(key) or spacy_entities.get(key) or ""

    return merged
