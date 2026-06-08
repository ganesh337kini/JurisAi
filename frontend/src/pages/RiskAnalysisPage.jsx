import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import {
  RiskScoreCard,
  RiskBreakdown,
  MissingClauses,
  RiskyLanguage,
  RecommendationsPanel,
  FinancialRisks,
} from '../components/RiskAnalysisComponents';
import client from '../api/client';
import Spinner from '../components/Spinner';

export default function RiskAnalysisPage() {
  const { documentId } = useParams();
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchRiskAnalysis();
  }, [documentId]);

  const fetchRiskAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get(`/risk/${documentId}`);
      setRiskAnalysis(response.data?.data);
    } catch (err) {
      // Risk analysis might not exist yet
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRisks = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const response = await client.post(`/risk/analyze/${documentId}`);
      setRiskAnalysis(response.data?.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze risks');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!riskAnalysis) return;

    const report = generateReport(riskAnalysis);
    const element = document.createElement('a');
    const file = new Blob([report], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `risk_analysis_${documentId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const normalizeAnalysis = (analysis) => ({
    overallRiskScore: analysis.overallRiskScore ?? analysis.overall_risk_score ?? 0,
    riskLevel: analysis.riskLevel ?? analysis.risk_level ?? 'Unknown',
    complianceScore: analysis.complianceScore ?? analysis.compliance_score ?? null,
    analysisStatus: analysis.analysisStatus ?? analysis.analysis_status ?? 'unknown',
    analyzedAt: analysis.analyzedAt ?? analysis.analyzed_at ?? null,
    riskBreakdown: analysis.riskBreakdown ?? analysis.risk_breakdown ?? null,
    missingClauses: analysis.missingClauses ?? analysis.missing_clauses ?? [],
    riskyLanguage: analysis.riskyLanguage ?? analysis.risky_language ?? [],
    financialRisks: analysis.financialRisks ?? analysis.financial_risks ?? null,
    recommendations: analysis.recommendations ?? [],
    ...analysis,
  });

  const generateReport = (analysis) => {
    const normalized = normalizeAnalysis(analysis);
    let report = `LEGAL RISK ANALYSIS REPORT\n`;
    report += `${'='.repeat(60)}\n\n`;
    report += `Overall Risk Score: ${normalized.overallRiskScore}/100\n`;
    report += `Risk Level: ${normalized.riskLevel}\n`;
    report += `Compliance Score: ${normalized.complianceScore ?? 'N/A'}/100\n`;
    report += `Analysis Status: ${normalized.analysisStatus}\n`;
    report += `Analyzed At: ${normalized.analyzedAt ? new Date(normalized.analyzedAt).toLocaleDateString() : 'N/A'}\n\n`;

    report += `RISK BREAKDOWN\n`;
    report += `${'-'.repeat(60)}\n`;
    const breakdown = analysis.risk_breakdown;
    if (breakdown) {
      report += `Clause Risk: ${Math.round(breakdown.clause_risk * 100)}%\n`;
      report += `Missing Clauses: ${Math.round(breakdown.missing_clauses * 100)}%\n`;
      report += `Risky Language: ${Math.round(breakdown.risky_language * 100)}%\n`;
      report += `Financial Risk: ${Math.round(breakdown.financial_risk * 100)}%\n\n`;
    }

    if (normalized.missingClauses && normalized.missingClauses.length > 0) {
      report += `MISSING CLAUSES (${normalized.missingClauses.length})\n`;
      report += `${'-'.repeat(60)}\n`;
      normalized.missingClauses.forEach((clause) => {
        report += `- ${clause.clause_name} (${clause.importance.toUpperCase()})\n`;
        report += `  ${clause.description}\n`;
        report += `  Risk: ${clause.risk_if_missing}\n`;
        report += `  Recommendation: ${clause.recommendation}\n\n`;
      });
    }

    if (normalized.riskyLanguage && normalized.riskyLanguage.length > 0) {
      report += `RISKY LANGUAGE (${normalized.riskyLanguage.length} items)\n`;
      report += `${'-'.repeat(60)}\n`;
      normalized.riskyLanguage.forEach((item) => {
        report += `- "${item.detected_text}" [${item.risk_level} Risk]\n`;
        report += `  Type: ${item.risk_type}\n`;
        report += `  Explanation: ${item.explanation}\n\n`;
      });
    }

    if (analysis.recommendations && analysis.recommendations.length > 0) {
      report += `RECOMMENDATIONS (${analysis.recommendations.length})\n`;
      report += `${'-'.repeat(60)}\n`;
      analysis.recommendations.forEach((rec) => {
        report += `[${rec.priority}] ${rec.action}\n`;
        report += `Type: ${rec.type}\n`;
        report += `Rationale: ${rec.rationale}\n\n`;
      });
    }

    return report;
  };

  const normalizedRiskAnalysis = riskAnalysis ? normalizeAnalysis(riskAnalysis) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Analysis Dashboard</h1>
          <p className="text-gray-600">Comprehensive legal risk assessment for your document</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* No Analysis State */}
        {!riskAnalysis && !analyzing && (
          <div className="bg-white rounded-lg shadow p-8 text-center mb-6">
            <div className="mb-4">
              <AlertCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Risk Analysis Yet</h2>
              <p className="text-gray-600 mb-6">
                Run a comprehensive risk analysis to identify potential legal issues and compliance gaps.
              </p>
            </div>
            <button
              onClick={handleAnalyzeRisks}
              disabled={analyzing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Run Risk Analysis
                </>
              )}
            </button>
          </div>
        )}

        {/* Analysis Results */}
        {riskAnalysis && (
          <>
            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleAnalyzeRisks}
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Re-analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Re-analyze
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadReport}
                className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-6 rounded-lg inline-flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Report
              </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Risk Score */}
              <div className="lg:col-span-1">
                <RiskScoreCard
                  overallScore={normalizedRiskAnalysis?.overallRiskScore}
                  riskLevel={normalizedRiskAnalysis?.riskLevel}
                />
              </div>

              {/* Risk Breakdown */}
              <div className="lg:col-span-2">
                <RiskBreakdown breakdown={normalizedRiskAnalysis?.riskBreakdown} />
              </div>
            </div>

            {/* Missing Clauses */}
            <div className="mb-6">
              <MissingClauses missingClauses={normalizedRiskAnalysis?.missingClauses} />
            </div>

            {/* Financial Risks */}
            {normalizedRiskAnalysis?.financialRisks && (
              <div className="mb-6">
                <FinancialRisks financialRisks={normalizedRiskAnalysis.financialRisks} />
              </div>
            )}

            {/* Risky Language */}
            <div className="mb-6">
              <RiskyLanguage riskyItems={normalizedRiskAnalysis?.riskyLanguage} />
            </div>

            {/* Recommendations */}
            <div className="mb-6">
              <RecommendationsPanel recommendations={normalizedRiskAnalysis?.recommendations} />
            </div>

            {/* Compliance Score */}
            {normalizedRiskAnalysis?.complianceScore !== undefined && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="text-xl font-bold mb-4">Compliance Score</h3>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">{normalizedRiskAnalysis.complianceScore}</span>
                  </div>
                  <div>
                    <p className="text-gray-700 mb-4">
                      This score indicates how well your document meets standard legal compliance requirements.
                    </p>
                    <p className="text-sm text-gray-600">
                      Score above 70 indicates good compliance. Scores below 50 suggest significant gaps.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
