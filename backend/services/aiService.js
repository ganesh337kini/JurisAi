const axios = require("axios");

function getAiBaseUrl() {
  return (process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

/**
 * Phase 1 — extract, chunk, embed.
 */
async function processDocument({ filePath, userId, documentId, originalname, createReadStream }) {
  const FormData = require("form-data");
  const form = new FormData();
  form.append("user_id", userId);
  form.append("document_id", documentId);
  form.append("filename", originalname);
  form.append("file", createReadStream(filePath), {
    filename: require("path").basename(filePath),
    contentType: "application/octet-stream",
  });

  const response = await axios.post(`${getAiBaseUrl()}/process-document`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 10 * 60 * 1000,
  });

  return response.data;
}

/**
 * Phase 2 — summarize, NER, clauses, simplification.
 */
async function analyzeDocument({ documentId, extractedText, explanationMode = "normal" }) {
  const response = await axios.post(
    `${getAiBaseUrl()}/analyze-document`,
    {
      document_id: documentId,
      extracted_text: extractedText,
      explanation_mode: explanationMode,
    },
    {
      timeout: 15 * 60 * 1000,
      headers: { "Content-Type": "application/json" },
    }
  );

  return response.data;
}

async function purgeDocument(documentId) {
  try {
    await axios.post(
      `${getAiBaseUrl()}/purge-document`,
      { document_id: documentId },
      { timeout: 60 * 1000 }
    );
  } catch (err) {
    console.warn("AI purge failed (vectors may be orphaned):", err.message);
  }
}

module.exports = {
  processDocument,
  analyzeDocument,
  purgeDocument,
};
