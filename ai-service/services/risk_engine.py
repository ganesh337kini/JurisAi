"""
Legal Risk Analysis Engine

Analyzes legal documents for:
- Risky clauses
- Missing clauses
- One-sided language
- Financial risks
- Compliance issues
- Overall risk scoring
"""

import json
from typing import Dict, List, Tuple, Any
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_community.chat_models import ChatOllama


class RiskEngine:
    """Analyzes legal documents for risks and compliance issues."""

    def __init__(self, llm=None):
        """Initialize risk engine with LLM."""
        # Use local LLM or OpenAI fallback
        self.llm = llm or ChatOllama(model="llama2")
        
        # Risk scoring thresholds
        self.HIGH_RISK_THRESHOLD = 0.7
        self.MEDIUM_RISK_THRESHOLD = 0.4
        
        # Standard clauses that should be present
        self.STANDARD_CLAUSES = {
            "termination": {
                "name": "Termination Clause",
                "importance": "high",
                "description": "Specifies how and when the agreement can be terminated"
            },
            "confidentiality": {
                "name": "Confidentiality/NDA Clause",
                "importance": "high",
                "description": "Protects sensitive information shared between parties"
            },
            "liability": {
                "name": "Liability Clause",
                "importance": "high",
                "description": "Limits liability and specifies remedies for breaches"
            },
            "dispute_resolution": {
                "name": "Dispute Resolution Clause",
                "importance": "high",
                "description": "Specifies how disputes will be handled (mediation, arbitration, court)"
            },
            "force_majeure": {
                "name": "Force Majeure Clause",
                "importance": "medium",
                "description": "Handles performance impossibility due to unforeseeable events"
            },
            "payment_terms": {
                "name": "Payment Terms Clause",
                "importance": "high",
                "description": "Specifies payment amounts, schedules, and methods"
            },
            "renewal": {
                "name": "Renewal Clause",
                "importance": "medium",
                "description": "Specifies renewal terms and automatic renewal conditions"
            },
            "indemnification": {
                "name": "Indemnification Clause",
                "importance": "high",
                "description": "Specifies who bears responsibility for damages"
            }
        }
        
        # Risky language patterns
        self.RISKY_PHRASES = {
            "unlimited_liability": {
                "patterns": [
                    r"unlimited liability",
                    r"unlimited damages",
                    r"without limit",
                    r"in excess of.*liability"
                ],
                "risk_level": "high",
                "explanation": "Exposes one party to unlimited financial liability"
            },
            "non_refundable": {
                "patterns": [
                    r"non-refundable",
                    r"non refundable",
                    r"no refunds",
                    r"all sales final"
                ],
                "risk_level": "medium",
                "explanation": "Prevents recovery of payments in certain conditions"
            },
            "automatic_renewal": {
                "patterns": [
                    r"automatic renewal",
                    r"automatically renew",
                    r"auto-renew",
                    r"shall renew unless",
                    r"will renew automatically"
                ],
                "risk_level": "high",
                "explanation": "Agreement renews without explicit consent"
            },
            "excessive_penalties": {
                "patterns": [
                    r"penalty.*\$\d+",
                    r"termination fee",
                    r"early termination.*\$\d+",
                    r"liquidated damages"
                ],
                "risk_level": "high",
                "explanation": "Substantial financial penalties for non-performance"
            },
            "one_sided_termination": {
                "patterns": [
                    r"may terminate.*at will",
                    r"can terminate.*at any time",
                    r"termination.*sole discretion"
                ],
                "risk_level": "high",
                "explanation": "One party can terminate without cause or notice"
            },
            "broad_indemnification": {
                "patterns": [
                    r"indemnify.*all.*claims",
                    r"hold harmless.*all.*liability",
                    r"indemnify.*any.*claims"
                ],
                "risk_level": "high",
                "explanation": "Broad indemnification obligations"
            },
            "confidentiality_restrictions": {
                "patterns": [
                    r"perpetual.*confidential",
                    r"confidential.*forever",
                    r"indefinite.*confidentiality"
                ],
                "risk_level": "medium",
                "explanation": "Indefinite confidentiality obligations"
            }
        }

    async def analyze_clause_risk(self, clauses: List[str]) -> List[Dict[str, Any]]:
        """
        Analyze individual clauses for risk level.
        
        Args:
            clauses: List of clause texts
            
        Returns:
            List of clause risk assessments
        """
        prompt = f"""Analyze each of these legal clauses and assess the risk level for each party.

Clauses:
{json.dumps(clauses, indent=2)}

For each clause, provide:
1. The clause text
2. Risk level (Low/Medium/High)
3. Explanation of risks
4. Who bears the risk (party A/party B/both)
5. Mitigation suggestions

Return as JSON array with structure:
[
  {{
    "clause": "...",
    "risk_level": "...",
    "risk_score": 0-1,
    "explanation": "...",
    "affected_party": "...",
    "mitigation": "..."
  }}
]
"""
        
        message = HumanMessage(content=prompt)
        response = await self.llm.ainvoke([message])
        
        try:
            # Extract JSON from response
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            return json.loads(content)
        except (json.JSONDecodeError, IndexError):
            # Fallback: return basic analysis
            return [
                {
                    "clause": clause,
                    "risk_level": "Medium",
                    "risk_score": 0.5,
                    "explanation": "Requires expert review",
                    "affected_party": "both",
                    "mitigation": "Consider consulting legal counsel"
                }
                for clause in clauses
            ]

    def detect_missing_clauses(self, document_text: str) -> List[Dict[str, Any]]:
        """
        Detect important clauses missing from document.
        
        Args:
            document_text: Full document text
            
        Returns:
            List of missing clauses
        """
        document_lower = document_text.lower()
        missing = []
        
        for clause_id, clause_info in self.STANDARD_CLAUSES.items():
            # Simple keyword matching for detection
            keywords = clause_info["name"].lower().split()
            found = any(keyword in document_lower for keyword in keywords)
            
            if not found:
                missing.append({
                    "clause_id": clause_id,
                    "clause_name": clause_info["name"],
                    "importance": clause_info["importance"],
                    "description": clause_info["description"],
                    "risk_if_missing": self._get_risk_if_missing(clause_id),
                    "recommendation": self._get_clause_recommendation(clause_id)
                })
        
        return missing

    def detect_risky_language(self, document_text: str) -> List[Dict[str, Any]]:
        """
        Detect risky language patterns in document.
        
        Args:
            document_text: Full document text
            
        Returns:
            List of detected risky phrases with locations
        """
        import re
        
        risky_items = []
        document_lower = document_text.lower()
        
        for risk_id, risk_info in self.RISKY_PHRASES.items():
            for pattern in risk_info.get("patterns", []):
                matches = re.finditer(pattern, document_lower, re.IGNORECASE)
                
                for match in matches:
                    # Get surrounding context
                    start = max(0, match.start() - 50)
                    end = min(len(document_text), match.end() + 50)
                    context = document_text[start:end].strip()
                    
                    risky_items.append({
                        "risk_id": risk_id,
                        "risk_type": risk_id.replace("_", " ").title(),
                        "detected_text": match.group(),
                        "context": context,
                        "risk_level": risk_info["risk_level"],
                        "explanation": risk_info["explanation"],
                        "location": {
                            "start": match.start(),
                            "end": match.end()
                        }
                    })
        
        return risky_items

    def analyze_financial_risks(self, document_text: str) -> Dict[str, Any]:
        """
        Analyze financial risks in document.
        
        Args:
            document_text: Full document text
            
        Returns:
            Financial risk analysis
        """
        import re
        
        financial_risks = {
            "deposits": [],
            "fees": [],
            "penalties": [],
            "high_value_items": [],
            "total_financial_exposure": None,
            "risk_level": "Low"
        }
        
        # Find financial amounts
        amount_pattern = r"\$\s*([0-9,]+(?:\.\d{2})?)"
        amounts = re.findall(amount_pattern, document_text)
        
        # Find deposits
        deposit_pattern = r"deposit.*?(\$\s*[0-9,]+(?:\.\d{2})?)"
        deposits = re.findall(deposit_pattern, document_text, re.IGNORECASE)
        if deposits:
            financial_risks["deposits"] = deposits
        
        # Find fees
        fee_pattern = r"fee.*?(\$\s*[0-9,]+(?:\.\d{2})?)"
        fees = re.findall(fee_pattern, document_text, re.IGNORECASE)
        if fees:
            financial_risks["fees"] = fees
        
        # Find penalties
        penalty_pattern = r"penalty.*?(\$\s*[0-9,]+(?:\.\d{2})?)"
        penalties = re.findall(penalty_pattern, document_text, re.IGNORECASE)
        if penalties:
            financial_risks["penalties"] = penalties
        
        # Determine risk level based on amounts
        if penalties or amounts and max(float(a.replace(",", "")) for a in amounts if a) > 50000:
            financial_risks["risk_level"] = "High"
        elif deposits or fees:
            financial_risks["risk_level"] = "Medium"
        
        return financial_risks

    def calculate_risk_score(
        self,
        clause_risks: List[Dict],
        missing_clauses: List[Dict],
        risky_language: List[Dict],
        financial_risks: Dict
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Calculate overall risk score (0-100).
        
        Args:
            clause_risks: Clause risk assessments
            missing_clauses: Missing clauses
            risky_language: Detected risky language
            financial_risks: Financial risk analysis
            
        Returns:
            Tuple of (overall_score, breakdown)
        """
        risk_scores = {
            "clause_risk": self._score_clauses(clause_risks),
            "missing_clauses": self._score_missing_clauses(missing_clauses),
            "risky_language": self._score_risky_language(risky_language),
            "financial_risk": self._score_financial_risks(financial_risks)
        }
        
        # Weighted average
        weights = {
            "clause_risk": 0.35,
            "missing_clauses": 0.30,
            "risky_language": 0.20,
            "financial_risk": 0.15
        }
        
        overall_score = sum(
            risk_scores[key] * weights[key]
            for key in risk_scores
        )
        
        # Convert to 0-100 scale
        overall_score = int(overall_score * 100)
        
        return overall_score, risk_scores

    def generate_recommendations(
        self,
        risk_analysis: Dict[str, Any],
        overall_score: int
    ) -> List[Dict[str, Any]]:
        """
        Generate recommendations based on risk analysis.
        
        Args:
            risk_analysis: Complete risk analysis
            overall_score: Overall risk score
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # Critical recommendations for high-risk documents
        if overall_score > 70:
            recommendations.append({
                "priority": "Critical",
                "type": "General",
                "action": "Engage legal counsel immediately",
                "rationale": "High overall risk score indicates significant issues that require expert review"
            })
        
        # Address missing critical clauses
        for missing in risk_analysis.get("missing_clauses", []):
            if missing.get("importance") == "high":
                recommendations.append({
                    "priority": "High",
                    "type": "Missing Clause",
                    "action": f"Add {missing['clause_name']}",
                    "rationale": missing.get("description", "")
                })
        
        # Address high-risk language
        high_risk_items = [
            item for item in risk_analysis.get("risky_language", [])
            if item.get("risk_level") == "high"
        ]
        
        if high_risk_items:
            recommendations.append({
                "priority": "High",
                "type": "Language Review",
                "action": f"Negotiate {len(high_risk_items)} high-risk clause(s)",
                "rationale": "Found language that heavily favors one party"
            })
        
        # Financial risk recommendations
        if risk_analysis.get("financial_risks", {}).get("risk_level") == "High":
            recommendations.append({
                "priority": "High",
                "type": "Financial",
                "action": "Review financial obligations and penalties",
                "rationale": "Unusually high financial commitments detected"
            })
        
        # Compliance recommendations
        compliance_issues = len(risk_analysis.get("missing_clauses", []))
        if compliance_issues > 3:
            recommendations.append({
                "priority": "Medium",
                "type": "Compliance",
                "action": f"Address {compliance_issues} compliance gaps",
                "rationale": "Multiple missing clauses may indicate incomplete legal protections"
            })
        
        # General improvements
        if overall_score > 50:
            recommendations.append({
                "priority": "Medium",
                "type": "Review",
                "action": "Schedule legal review meeting",
                "rationale": "Moderate-to-high risk requires detailed discussion"
            })
        
        return recommendations

    def _score_clauses(self, clause_risks: List[Dict]) -> float:
        """Score clause risks on 0-1 scale."""
        if not clause_risks:
            return 0.0
        
        score = 0.0
        for clause in clause_risks:
            if "risk_score" in clause:
                score += clause["risk_score"]
        
        return score / len(clause_risks)

    def _score_missing_clauses(self, missing_clauses: List[Dict]) -> float:
        """Score missing clauses on 0-1 scale."""
        if not missing_clauses:
            return 0.0
        
        score = 0.0
        for clause in missing_clauses:
            if clause.get("importance") == "high":
                score += 0.1
            elif clause.get("importance") == "medium":
                score += 0.05
        
        return min(score, 1.0)

    def _score_risky_language(self, risky_language: List[Dict]) -> float:
        """Score risky language on 0-1 scale."""
        if not risky_language:
            return 0.0
        
        high_risk_count = sum(1 for item in risky_language if item.get("risk_level") == "high")
        medium_risk_count = sum(1 for item in risky_language if item.get("risk_level") == "medium")
        
        score = (high_risk_count * 0.08) + (medium_risk_count * 0.03)
        return min(score, 1.0)

    def _score_financial_risks(self, financial_risks: Dict) -> float:
        """Score financial risks on 0-1 scale."""
        if financial_risks.get("risk_level") == "High":
            return 0.8
        elif financial_risks.get("risk_level") == "Medium":
            return 0.4
        return 0.1

    def _get_risk_if_missing(self, clause_id: str) -> str:
        """Get risk explanation for missing clause."""
        risks = {
            "termination": "Difficult to exit the agreement or terminate relationship",
            "confidentiality": "Sensitive business information could be disclosed",
            "liability": "Unlimited liability exposure for breaches",
            "dispute_resolution": "Disputes could be costly and unpredictable",
            "force_majeure": "Performance obligations may be unenforceable in emergencies",
            "payment_terms": "Unclear payment obligations could lead to disputes",
            "renewal": "Agreement could auto-renew without clear terms",
            "indemnification": "Unclear who bears responsibility for damages"
        }
        return risks.get(clause_id, "Legal protection gap identified")

    def _get_clause_recommendation(self, clause_id: str) -> str:
        """Get specific recommendation for missing clause."""
        recommendations = {
            "termination": "Add clear termination conditions, notice periods, and wind-down procedures",
            "confidentiality": "Include confidentiality obligations, exceptions, and duration limits",
            "liability": "Define liability caps, remedies, and exclusions",
            "dispute_resolution": "Specify mediation/arbitration procedures and governing law",
            "force_majeure": "Define triggering events and performance suspension procedures",
            "payment_terms": "Clarify payment amounts, schedule, method, and late payment penalties",
            "renewal": "Specify renewal conditions, notice requirements, and opt-out procedures",
            "indemnification": "Define indemnification triggers, scope, and limitations"
        }
        return recommendations.get(clause_id, "Consult legal counsel to add this clause")
