"""
Risk detection module for legal documents.
Identifies potential liabilities, missing clauses, and disadvantageous terms.
"""

from __future__ import annotations

import re
from typing import Any


def detect_risks(text: str, clauses: list[dict[str, str]], entities: dict[str, Any]) -> list[dict[str, str]]:
    """
    Scan the document and its detected clauses to identify legal and financial risks.
    """
    risks: list[dict[str, str]] = []
    text_lower = (text or "").lower()

    # Track which clauses are present by title
    detected_titles = {c["title"] for c in clauses}

    # 1. Missing Clauses Checks
    if "Governing Law Clause" not in detected_titles:
        risks.append({
            "severity": "Medium",
            "category": "Compliance",
            "clause": "Governing Law Clause",
            "description": "No Governing Law or Jurisdiction clause was detected in the document.",
            "suggestion": "Add a Governing Law clause specifying the appropriate state/jurisdiction to avoid confusion in case of disputes."
        })

    if "Dispute Resolution Clause" not in detected_titles:
        risks.append({
            "severity": "Medium",
            "category": "Dispute Resolution",
            "clause": "Dispute Resolution Clause",
            "description": "No Dispute Resolution or Arbitration clause was detected.",
            "suggestion": "Add a Dispute Resolution clause (arbitration or mediation) to resolve conflicts faster without expensive court litigation."
        })

    if "Indemnification Clause" not in detected_titles:
        risks.append({
            "severity": "Medium",
            "category": "Liability",
            "clause": "Indemnification Clause",
            "description": "No Indemnification or hold-harmless clause was found.",
            "suggestion": "Include a mutual indemnification clause to protect both parties from liability arising from breaches or third-party claims."
        })

    if "Force Majeure Clause" not in detected_titles:
        risks.append({
            "severity": "Low",
            "category": "Compliance",
            "clause": "Force Majeure Clause",
            "description": "No Force Majeure clause was detected in the contract.",
            "suggestion": "Add a Force Majeure clause to excuse performance in case of natural disasters, wars, or other unforeseen events outside human control."
        })

    if "Termination Clause" not in detected_titles:
        risks.append({
            "severity": "High",
            "category": "Termination",
            "clause": "Termination Clause",
            "description": "No explicit Termination clause was detected.",
            "suggestion": "Add a Termination clause specifying clear terms for ending the agreement, notice periods, and curing breaches."
        })

    # 2. Text-Based and Clause-Specific Risk Analysis

    # Check for short notice periods (e.g. 7, 10, 14, 15 days notice) in termination contexts
    termination_texts = [c["text"] for c in clauses if "termination" in c["title"].lower()]
    # Fallback to scanning paragraphs in the text if no termination clause detected
    if not termination_texts:
        termination_texts = re.findall(r"([^.]{30,200}terminate[^.]{30,200})", text_lower)

    for term_text in termination_texts:
        # Match "X days notice" or "notice of X days"
        m = re.search(r"\b(1|2|3|5|7|10|14|15|20|21)\b\s*days?\s+(?:prior\s+)?(?:written\s+)?notice", term_text, re.IGNORECASE)
        if m:
            days = m.group(1)
            risks.append({
                "severity": "High",
                "category": "Termination",
                "clause": "Termination Clause",
                "description": f"A short notice period of {days} days for termination or default cure was detected.",
                "suggestion": "Negotiate a notice period of at least 30 days to allow adequate time to cure defaults or make transition arrangements."
            })
            break

    # Check for unilateral / one-sided termination (e.g. Landlord may terminate, but Tenant is not mentioned)
    for term_text in termination_texts:
        term_text_lower = term_text.lower()
        has_landlord_terminate = any(k in term_text_lower for k in ["landlord may terminate", "lessor may terminate", "employer may terminate", "company may terminate"])
        has_tenant_terminate = any(k in term_text_lower for k in ["tenant may terminate", "lessee may terminate", "employee may terminate", "either party may terminate", "mutual termination"])
        if has_landlord_terminate and not has_tenant_terminate:
            risks.append({
                "severity": "High",
                "category": "Termination",
                "clause": "Termination Clause",
                "description": "One-sided termination clause detected. The landlord or employer has clear termination rights, but equivalent rights for the tenant or employee are missing.",
                "suggestion": "Negotiate mutual termination rights or ensure a fair termination-for-cause clause is added for both parties."
            })
            break

    # Check for High Late Fees/Penalty Clauses
    penalty_texts = [c["text"] for c in clauses if "penalty" in c["title"].lower() or "rent" in c["title"].lower()]
    if not penalty_texts:
        penalty_texts = re.findall(r"([^.]{30,200}penalty[^.]{30,200})", text_lower)

    for pen_text in penalty_texts:
        pen_text_lower = pen_text.lower()
        # Look for percentage rates like "18% interest" or "late fee of 15%" (before or after the label)
        m_pct = re.search(
            r"(?:(?:interest|penalty|late\s*fee)\s+(?:of|at|@)?\s*([1-9][0-9])%|([1-9][0-9])%\s*(?:interest|penalty|late\s*fee))",
            pen_text_lower
        )
        if m_pct:
            rate_str = m_pct.group(1) or m_pct.group(2)
            if rate_str and int(rate_str) > 10:
                risks.append({
                    "severity": "High",
                    "category": "Financial",
                    "clause": "Penalty Clause",
                    "description": f"A high late fee penalty interest rate of {rate_str}% was detected in the document.",
                    "suggestion": "Negotiate to reduce the late interest fee to a reasonable standard (typically 1-2% per month or 5% of monthly rent flat fee) and cap the total penalty."
                })
                break

    # Check for Exorbitant Security Deposit (ratio of deposit to rent)
    rent_str = entities.get("rent", "")
    deposit_str = entities.get("deposit", "")
    if rent_str and deposit_str:
        # Extract numeric value (strip symbols and commas)
        rent_num = re.sub(r"[^\d.]", "", rent_str)
        deposit_num = re.sub(r"[^\d.]", "", deposit_str)
        rent_val = float(rent_num) if rent_num else 0.0
        deposit_val = float(deposit_num) if deposit_num else 0.0
        if rent_val > 0 and deposit_val > 0:
            ratio = deposit_val / rent_val
            if ratio > 3.0:
                risks.append({
                    "severity": "High",
                    "category": "Financial",
                    "clause": "Security Deposit Clause",
                    "description": f"The security deposit ({deposit_str}) is extremely high relative to the monthly rent ({rent_str}) — approximately {ratio:.1f} months of rent.",
                    "suggestion": "Negotiate to lower the security deposit to a standard 1-2 months of rent, or structure payments in monthly installments."
                })

    # Check for Non-Refundable Deposit
    deposit_clause_texts = [c["text"] for c in clauses if "deposit" in c["title"].lower()]
    non_refund_scope = " ".join(deposit_clause_texts) if deposit_clause_texts else text_lower
    if re.search(r"non[- ]?refundable\s+(?:security\s+)?deposit", non_refund_scope, re.IGNORECASE):
        risks.append({
            "severity": "High",
            "category": "Financial",
            "clause": "Security Deposit Clause",
            "description": "The security deposit is stated to be non-refundable, which is an unusual and disadvantageous condition.",
            "suggestion": "Negotiate to make the deposit fully refundable upon end of the agreement, subject to deductions for damages only."
        })

    # Check for Non-Compete covenants
    non_compete_matches = re.findall(r"([^.]{30,200}non-compete|not compete|covenant not to compete[^.]{30,200})", text_lower)
    if non_compete_matches:
        risks.append({
            "severity": "High",
            "category": "Liability",
            "clause": "Non-Compete Clause",
            "description": "A restrictive non-compete covenant was detected, limiting post-agreement employment or business options.",
            "suggestion": "Ensure the non-compete is narrow in geographical scope, duration (e.g. less than 1 year), and scope of activity to protect enforceability and career mobility."
        })

    return risks
