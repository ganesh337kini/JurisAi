const axios = require('axios');
const RiskAnalysis = require('../models/RiskAnalysis');
const Document = require('../models/Document');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Analyze document for risks
 */
async function analyzeDocumentRisks(userId, documentId) {
  try {
    // Fetch document from MongoDB
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.extractedText) {
      throw new Error('Document text not extracted yet');
    }

    // Extract clauses from document (simple implementation)
    const clauses = extractClauses(document.extractedText);

    // Call AI service risk analysis endpoint
    const response = await axios.post(`${AI_SERVICE_URL}/analyze-risk`, {
      document_id: documentId,
      extracted_text: document.extractedText,
      clauses: clauses,
    });

    const riskData = response.data;

    // Determine overall risk level
    const riskLevel = getRiskLevel(riskData.overall_risk_score);

    // Create or update risk analysis record
    const riskAnalysis = await RiskAnalysis.findOneAndUpdate(
      { documentId, userId },
      {
        userId,
        documentId,
        overallRiskScore: riskData.overall_risk_score,
        riskLevel,
        riskBreakdown: riskData.risk_breakdown,
        clauseRisks: riskData.clause_risks,
        missingClauses: riskData.missing_clauses,
        riskyLanguage: riskData.risky_language,
        financialRisks: riskData.financial_risks,
        recommendations: riskData.recommendations,
        complianceScore: calculateComplianceScore(
          riskData.missing_clauses,
          riskData.clause_risks
        ),
        analysisStatus: 'completed',
        analyzedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return riskAnalysis;
  } catch (error) {
    console.error('Risk analysis error:', error.message);
    throw error;
  }
}

/**
 * Get risk analysis for a document
 */
async function getRiskAnalysis(documentId) {
  try {
    const riskAnalysis = await RiskAnalysis.findOne({
      documentId,
    }).populate('documentId', 'filename');

    if (!riskAnalysis) {
      throw new Error('Risk analysis not found');
    }

    return riskAnalysis;
  } catch (error) {
    console.error('Get risk analysis error:', error.message);
    throw error;
  }
}

/**
 * Get all risk analyses for a user
 */
async function getUserRiskAnalyses(userId) {
  try {
    const riskAnalyses = await RiskAnalysis.find({
      userId,
    })
      .populate('documentId', 'filename')
      .sort({ createdAt: -1 });

    return riskAnalyses;
  } catch (error) {
    console.error('Get user risk analyses error:', error.message);
    throw error;
  }
}

/**
 * Delete risk analysis
 */
async function deleteRiskAnalysis(documentId) {
  try {
    const result = await RiskAnalysis.deleteOne({
      documentId,
    });

    return result;
  } catch (error) {
    console.error('Delete risk analysis error:', error.message);
    throw error;
  }
}

/**
 * Extract clauses from document text using simple pattern matching
 */
function extractClauses(text) {
  const clauses = [];
  const lines = text.split('\n');

  // Look for common clause patterns
  const clausePatterns = [
    /^\s*\d+\.\s+(.+?)(?=\n|$)/gm,
    /^(.*?clause.*?)(?=\n|$)/gim,
    /^(.*?)(?=\n\d+\.|$)/gm,
  ];

  for (const pattern of clausePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 20 && match[1].length < 1000) {
        clauses.push(match[1].trim());
      }
    }
  }

  // Remove duplicates
  return [...new Set(clauses)].slice(0, 20); // Limit to 20 clauses
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score) {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  return 'High';
}

/**
 * Calculate compliance score
 */
function calculateComplianceScore(missingClauses, clauseRisks) {
  let score = 100;

  // Deduct for missing clauses
  for (const missing of missingClauses) {
    if (missing.importance === 'high') {
      score -= 15;
    } else if (missing.importance === 'medium') {
      score -= 10;
    } else {
      score -= 5;
    }
  }

  // Deduct for high-risk clauses
  for (const clause of clauseRisks) {
    if (clause.risk_level === 'High') {
      score -= 10;
    } else if (clause.risk_level === 'Medium') {
      score -= 5;
    }
  }

  return Math.max(0, Math.min(100, score));
}

module.exports = {
  analyzeDocumentRisks,
  getRiskAnalysis,
  getUserRiskAnalyses,
  deleteRiskAnalysis,
};
