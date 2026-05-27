"""
Named-entity and pattern extraction for legal rental/lease documents.
spaCy when available; regex fallbacks always run.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

OWNER_PATTERNS = [
    r"(?:lessor|landlord|owner|licensor)[ \t]*[:\-]?[ \t]*([A-Z0-9][A-Za-z0-9\-\.]*(?:\s+[A-Z0-9][A-Za-z0-9\-\.]*){0,5}(?:\s+(?:LLC|Inc\.?|Ltd\.?|Co\.?|Corp\.?|Corporation|Limited))?)",
    r"([A-Z0-9][A-Za-z0-9\-\.]*(?:\s+[A-Z0-9][A-Za-z0-9\-\.]*){0,5}(?:\s+(?:LLC|Inc\.?|Ltd\.?|Co\.?|Corp\.?|Corporation|Limited))?)[ \t]*,?[ \t]*(?:is\s+)?(?:the\s+)?(?:lessor|landlord|owner|licensor)",
    r"(?:lessor|landlord|owner|licensor)[ \t]*[:\-]?[ \t]*([A-Z0-9\s,\.\-]{3,50})(?:\s+is\s+|\s+and\s+|\s*,\s*|\n|\r|\Z)",
]
TENANT_PATTERNS = [
    r"(?:lessee|tenant|licensee)[ \t]*[:\-]?[ \t]*([A-Z0-9][A-Za-z0-9\-\.]*(?:\s+[A-Z0-9][A-Za-z0-9\-\.]*){0,5}(?:\s+(?:LLC|Inc\.?|Ltd\.?|Co\.?|Corp\.?|Corporation|Limited))?)",
    r"([A-Z0-9][A-Za-z0-9\-\.]*(?:\s+[A-Z0-9][A-Za-z0-9\-\.]*){0,5}(?:\s+(?:LLC|Inc\.?|Ltd\.?|Co\.?|Corp\.?|Corporation|Limited))?)[ \t]*,?[ \t]*(?:is\s+)?(?:the\s+)?(?:lessee|tenant|licensee)",
    r"(?:lessee|tenant|licensee)[ \t]*[:\-]?[ \t]*([A-Z0-9\s,\.\-]{3,50})(?:\s+is\s+|\s+and\s+|\s*,\s*|\n|\r|\Z)",
]
RENT_PATTERNS = [
    r"monthly\s+rent[^.]{0,80}?((?:Rs\.?|INR|₹|\$|£|€|¥)\s*[\d,]+(?:\.\d{2})?)",
    r"(?:monthly\s+)?rent(?:al)?(?:\s+amount)?\s*[:\-]?\s*((?:Rs\.?|INR|₹|\$|£|€|¥)?\s*[\d,]+(?:\.\d{2})?)",
    r"pay(?:able)?\s+(?:a\s+)?(?:monthly\s+)?rent\s+of\s+((?:Rs\.?|INR|₹|\$|£|€|¥)?\s*[\d,]+)",
    r"((?:Rs\.?|INR|₹|\$|£|€|¥)\s*[\d,]+)(?:\s+per\s+month|\s*/\s*month)",
]
DEPOSIT_PATTERNS = [
    r"(?:security\s+)?deposit\s*[:\-]?\s*((?:Rs\.?|INR|₹|\$|£|€|¥)?\s*[\d,]+(?:\.\d{2})?)",
    r"refundable\s+deposit\s+of\s+((?:Rs\.?|INR|₹|\$|£|€|¥)?\s*[\d,]+)",
    r"((?:Rs\.?|INR|₹|\$|£|€|¥)\s*[\d,]+(?:\.\d{2})?)\s+as\s+a\s+(?:security\s+)?deposit",
    r"deposit\s+(?:of|amounting\s+to|sum\s+of)?\s*((?:Rs\.?|INR|₹|\$|£|€|¥)\s*[\d,]+(?:\.\d{2})?)",
    r"Tenant\s+shall\s+deposit\s+((?:Rs\.?|INR|₹|\$|£|€|¥)?\s*[\d,]+)",
]
SALARY_PATTERNS = [
    r"(?:base\s+)?(?:salary|compensation|pay|wage)[^.]{0,80}?((?:Rs\.?|INR|₹|\$|£|€|¥)\s*[\d,]+(?:\.\d{2})?)",
    r"((?:Rs\.?|INR|₹|\$|£|€|¥)\s*[\d,]+(?:\.\d{2})?)\s+(?:per\s+(?:year|annum|month|hour))",
]
EMPLOYER_PATTERNS = [
    r"(?:employer|company)[ \t]*[:\-]?[ \t]*([A-Z0-9][A-Za-z0-9\-\.]*(?:\s+[A-Z0-9][A-Za-z0-9\-\.]*){0,5}(?:\s+(?:LLC|Inc\.?|Ltd\.?|Co\.?|Corp\.?|Corporation|Limited))?)",
    r"(?:employer|company)[ \t]*[:\-]?[ \t]*([A-Z0-9\s,\.\-]{3,50})(?:\s+is\s+|\s+and\s+|\s*,\s*|\n|\r|\Z)",
]
EMPLOYEE_PATTERNS = [
    r"(?:employee|contractor)[ \t]*[:\-]?[ \t]*([A-Z0-9][A-Za-z0-9\-\.]*(?:\s+[A-Z0-9][A-Za-z0-9\-\.]*){0,5})",
    r"(?:employee|contractor)[ \t]*[:\-]?[ \t]*([A-Z0-9\s,\.\-]{3,50})(?:\s+is\s+|\s+and\s+|\s*,\s*|\n|\r|\Z)",
]
JOB_TITLE_PATTERNS = [
    r"(?:title|position|role)[ \t]*[:\-]?[ \t]*([A-Z0-9][A-Za-z0-9\-\.]*(?:\s+[A-Za-z0-9\-\.]+){0,4})",
    r"employed\s+as\s+(?:a|an)?\s*([A-Z0-9][A-Za-z0-9\-\.]*(?:\s+[A-Za-z0-9\-\.]+){0,4})",
]
DURATION_PATTERNS = [
    r"(?:period|term|duration|tenancy)\s+(?:of\s+)?([a-zA-Z]+\s*(?:\(\d+\))?|\d+)\s*(months?|years?)",
    r"for\s+a\s+period\s+of\s+([a-zA-Z]+\s*(?:\(\d+\))?|\d+)\s*(months?|years?)",
    r"([a-zA-Z]+\s*(?:\(\d+\))?|\d+)\s*(months?|years?)\s+(?:from|commencing)",
]
ADDRESS_PATTERNS = [
    r"(?:leases?.*|the\s+)(?:premises|property)[^.]*?located\s+at\s+([A-Za-z0-9]+[A-Za-z0-9\s,.\-#]{8,100}?)(?:\s*\(|\.|,|\n|$)",
    r"(?:premises|address)[ \t]*[:\-]?\s*([A-Za-z0-9]+[A-Za-z0-9\s,.\-#]{8,100}?)(?:\s*\(|\.|,|\n|$)",
    r"located\s+at\s+([A-Za-z0-9]+[A-Za-z0-9\s,.\-#]{8,100}?)(?:\s*\(|\.|,|\n|$)",
    r"known\s+as\s+([A-Za-z0-9]+[A-Za-z0-9\s,.\-#]{8,100}?)(?:\s*\(|\.|,|\n|$)",
    r"at\s+([0-9]+[A-Za-z0-9\s,.\-#]{6,60}?)(?:\s*\(|\.|,|\n)",
]

# Pre-compiled regular expressions for runtime speed optimization
_OWNER_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in OWNER_PATTERNS]
_TENANT_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in TENANT_PATTERNS]
_RENT_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in RENT_PATTERNS]
_DEPOSIT_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in DEPOSIT_PATTERNS]
_SALARY_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in SALARY_PATTERNS]
_EMPLOYER_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in EMPLOYER_PATTERNS]
_EMPLOYEE_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in EMPLOYEE_PATTERNS]
_JOB_TITLE_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in JOB_TITLE_PATTERNS]
_DURATION_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in DURATION_PATTERNS]
_ADDRESS_PATTERNS_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in ADDRESS_PATTERNS]
_TERM_PATTERN_COMPILED = re.compile(r"term[ \t]*[:\-]?[ \t]*(\d+[ \t]*months?)", re.IGNORECASE)


def _first_match(compiled_patterns: list[re.Pattern], text: str, group: int = 1) -> str:
    for pat in compiled_patterns:
        m = pat.search(text)
        if m:
            val = m.group(group).strip()
            if val and len(val) > 1:
                return val
    return ""

def _is_duration_string(val: str) -> bool:
    if not val:
        return False
    val_lower = val.lower()
    if not any(w in val_lower for w in ("year", "month", "week", "day", "yr", "mo")):
        return False
    month_names = {"january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"}
    words = set(re.findall(r"[a-z]+", val_lower))
    if words & month_names:
        return False
    return True


def _normalize_money(val: str) -> str:
    digits = re.sub(r"[^\d.]", "", val) if val else ""
    if not digits:
        return ""
    return digits


def _format_money(amount: str) -> str:
    """Standardize numeric amounts for UI display, preserving currency symbol."""
    if not amount:
        return ""
    m = re.match(r"([^\d.,]*)?([\d.,]+)", amount.strip())
    if not m:
        return amount
    sym = m.group(1) or "$"
    sym = sym.strip()
    if not sym:
        sym = "$"
    digits = _normalize_money(m.group(2))
    if not digits:
        return ""
    try:
        if "." in digits:
            whole, frac = digits.split(".", 1)
            return f"{sym}{int(whole):,}.{frac[:2]}"
        return f"{sym}{int(digits):,}"
    except ValueError:
        return f"{sym}{digits}"


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
    locations: list[str] = []

    for ent in doc.ents:
        if ent.label_ in ("PERSON", "ORG") and ent.text not in persons:
            persons.append(ent.text)
        elif ent.label_ == "DATE" and ent.text not in dates:
            dates.append(ent.text)
        elif ent.label_ in ("GPE", "LOC", "FAC") and ent.text not in locations:
            locations.append(ent.text)

    result: dict[str, str] = {}
    if len(persons) >= 1:
        result.setdefault("owner", persons[0])
    if len(persons) >= 2:
        result.setdefault("tenant", persons[1])
    if dates:
        result.setdefault("duration", dates[0])
    if locations:
        result.setdefault("address", locations[0])

    return result


def extract_entities(text: str) -> dict[str, Any]:
    """
    Extract structured key details from legal document text.

    Regex wins over spaCy for money fields to reduce false rent/deposit assignment.
    """
    empty = {
        "owner": "",
        "tenant": "",
        "employer": "",
        "employee": "",
        "rent": "",
        "deposit": "",
        "salary": "",
        "duration": "",
        "address": "",
        "job_title": "",
    }
    if not (text or "").strip():
        return empty

    regex_entities = {
        "owner": _first_match(_OWNER_PATTERNS_COMPILED, text),
        "tenant": _first_match(_TENANT_PATTERNS_COMPILED, text),
        "employer": _first_match(_EMPLOYER_PATTERNS_COMPILED, text),
        "employee": _first_match(_EMPLOYEE_PATTERNS_COMPILED, text),
        "rent": _format_money(_first_match(_RENT_PATTERNS_COMPILED, text)),
        "deposit": _format_money(_first_match(_DEPOSIT_PATTERNS_COMPILED, text)),
        "salary": _format_money(_first_match(_SALARY_PATTERNS_COMPILED, text)),
        "duration": "",
        "address": _first_match(_ADDRESS_PATTERNS_COMPILED, text),
        "job_title": _first_match(_JOB_TITLE_PATTERNS_COMPILED, text),
    }

    dur_m = None
    for pat in _DURATION_PATTERNS_COMPILED:
        dur_m = pat.search(text)
        if dur_m:
            break
    if dur_m:
        regex_entities["duration"] = f"{dur_m.group(1)} {dur_m.group(2)}"
    else:
        term_m = _TERM_PATTERN_COMPILED.search(text)
        if term_m:
            regex_entities["duration"] = term_m.group(1).strip()

    spacy_entities = _extract_with_spacy(text)

    merged: dict[str, str] = {}
    for key in empty:
        if key in ("rent", "deposit", "salary"):
            merged[key] = regex_entities.get(key) or ""
        elif key == "duration":
            val = regex_entities.get(key)
            if not val or not val.strip():
                spacy_val = spacy_entities.get(key)
                if spacy_val and _is_duration_string(spacy_val):
                    val = spacy_val
            merged[key] = val or ""
        else:
            merged[key] = regex_entities.get(key) or spacy_entities.get(key) or ""

    return merged
