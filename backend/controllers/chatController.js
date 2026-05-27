const Document = require("../models/Document");
const Chat = require("../models/Chat");
const { chatWithDocument } = require("../services/aiService");

/**
 * GET /api/chat/:documentId — load chat history for a document.
 */
async function getChatHistory(req, res, next) {
  try {
    const { documentId } = req.params;

    const doc = await Document.findOne({ _id: documentId, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const chat = await Chat.findOne({
      userId: req.user.id,
      documentId,
    });

    res.json({
      chat: chat || { messages: [] },
      document: {
        _id: doc._id,
        originalname: doc.originalname,
        shortSummary: doc.shortSummary,
        summary: doc.summary,
        entities: doc.entities,
        clauses: doc.clauses,
        analysisStatus: doc.analysisStatus,
        processingStatus: doc.processingStatus,
        chunkCount: doc.chunkCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/chat — ask a question (RAG) and persist messages.
 * Body: { documentId, query }
 */
async function sendChatMessage(req, res, next) {
  try {
    const { documentId, query } = req.body;

    if (!documentId) {
      return res.status(400).json({ message: "documentId is required" });
    }
    if (!query || !String(query).trim()) {
      return res.status(400).json({ message: "Query cannot be empty" });
    }

    const doc = await Document.findOne({ _id: documentId, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (doc.processingStatus !== "completed") {
      return res.status(400).json({
        message: "Document must be fully processed before chatting.",
        processingStatus: doc.processingStatus,
      });
    }

    if (!doc.chunkCount || doc.chunkCount < 1) {
      return res.status(400).json({
        message: "No indexed chunks found for this document. Re-upload or re-process the file.",
      });
    }

    let chat = await Chat.findOne({ userId: req.user.id, documentId });
    if (!chat) {
      chat = await Chat.create({
        userId: req.user.id,
        documentId,
        messages: [],
      });
    }

    const historyForAi = chat.messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const trimmedQuery = String(query).trim();

    let aiResult;
    try {
      aiResult = await chatWithDocument({
        userId: req.user.id.toString(),
        documentId: documentId.toString(),
        query: trimmedQuery,
        chatHistory: historyForAi,
        documentSummary: doc.shortSummary || doc.summary || "",
        entities: doc.entities || {},
      });
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      return res.status(502).json({
        message: "AI chat service failed. Ensure the AI service is running.",
        aiError: typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }

    const userMessage = {
      role: "user",
      content: trimmedQuery,
      sources: [],
      timestamp: new Date(),
    };

    const aiMessage = {
      role: "ai",
      content: aiResult.answer || "This information is not present in the document.",
      sources: aiResult.sources || [],
      timestamp: new Date(),
    };

    chat.messages.push(userMessage, aiMessage);
    await chat.save();

    res.json({
      answer: aiMessage.content,
      sources: aiMessage.sources,
      messages: chat.messages,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/chat/:documentId — clear chat history.
 */
async function clearChatHistory(req, res, next) {
  try {
    const { documentId } = req.params;

    const doc = await Document.findOne({ _id: documentId, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    await Chat.findOneAndUpdate(
      { userId: req.user.id, documentId },
      { $set: { messages: [] } },
      { upsert: true }
    );

    res.json({ message: "Chat history cleared" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getChatHistory,
  sendChatMessage,
  clearChatHistory,
};
