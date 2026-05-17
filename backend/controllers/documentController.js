const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const Document = require("../models/Document");
const { analyzeDocument, processDocument, purgeDocument } = require("../services/aiService");

/**
 * Maps Multer mimetype / extension to a simple document type label for the UI.
 */
function inferFiletype(originalname, mimetype) {
  const ext = path.extname(originalname || "").toLowerCase();
  if (ext === ".pdf" || mimetype === "application/pdf") return "pdf";
  if (ext === ".docx" || mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    return "docx";
  if (ext === ".txt" || mimetype === "text/plain") return "txt";
  if ([".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"].includes(ext) || (mimetype && mimetype.startsWith("image/")))
    return "image";
  return "other";
}

/**
 * POST /api/documents/upload
 * Saves file, creates DB row, then calls the Python pipeline.
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    const originalname = req.file.originalname;
    const filename = req.file.filename;
    const filePath = req.file.path;
    const filetype = inferFiletype(originalname, req.file.mimetype);

    const doc = await Document.create({
      userId,
      filename,
      originalname,
      filetype,
      processingStatus: "processing",
    });

    try {
      const ai = await processDocument({
        filePath,
        userId,
        documentId: doc._id.toString(),
        originalname,
        createReadStream: fsSync.createReadStream,
      });

      doc.extractedText = ai.extracted_text || "";
      doc.chunkCount = typeof ai.chunk_count === "number" ? ai.chunk_count : 0;
      doc.processingStatus = ai.processing_status || "completed";
      doc.processingError = "";
      await doc.save();

      return res.status(201).json({
        document: doc,
      });
    } catch (err) {
      doc.processingStatus = "failed";
      doc.processingError = err.response?.data?.detail || err.message || "Processing failed";
      await doc.save();

      // Still 201: the upload record exists and can be retried in future phases.
      return res.status(201).json({
        document: doc,
        warning: "Document uploaded, but AI processing failed. Check that the AI service is running.",
        aiError: doc.processingError,
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents
 * Optional ?q= search on original filename (bonus).
 */
async function listDocuments(req, res, next) {
  try {
    const q = (req.query.q || "").toString().trim();
    const filter = { userId: req.user.id };

    if (q) {
      filter.originalname = { $regex: q, $options: "i" };
    }

    const documents = await Document.find(filter).sort({ uploadDate: -1 }).limit(200);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/:id
 */
async function getDocument(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json({ document: doc });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/documents/:id (bonus)
 * Removes Mongo record, disk file, and Chroma vectors for this document_id.
 */
async function deleteDocument(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const uploadsDir = path.join(__dirname, "..", "uploads");
    const diskPath = path.join(uploadsDir, doc.filename);

    await purgeDocument(doc._id.toString());

    try {
      await fs.unlink(diskPath);
    } catch {
      // File might already be removed — non-fatal
    }

    await doc.deleteOne();
    res.json({ message: "Document deleted" });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/documents/analyze/:id
 * Runs Phase 2 AI analysis and persists results on the document.
 */
async function analyzeDocumentById(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (doc.processingStatus !== "completed") {
      return res.status(400).json({
        message: "Document must be fully processed before analysis.",
        processingStatus: doc.processingStatus,
        processingError: doc.processingError || undefined,
      });
    }

    const extracted = (doc.extractedText || "").trim();
    if (!extracted) {
      return res.status(400).json({
        message: "No extracted text available. OCR may have failed or the file was empty.",
      });
    }

    const explanationMode = req.body?.explanationMode === "beginner" ? "beginner" : "normal";

    doc.analysisStatus = "processing";
    doc.analysisError = "";
    await doc.save();

    try {
      const ai = await analyzeDocument({
        documentId: doc._id.toString(),
        extractedText: extracted,
        explanationMode,
      });

      doc.summary = ai.summary || "";
      doc.shortSummary = ai.short_summary || "";
      doc.entities = ai.entities || {};
      doc.clauses = Array.isArray(ai.clauses) ? ai.clauses : [];
      doc.simplifiedText = ai.simplified_text || "";
      doc.analysisStatus = ai.analysis_status || "completed";
      doc.analysisError = "";
      await doc.save();

      return res.json({
        document: doc,
        analysis: {
          summary: doc.summary,
          shortSummary: doc.shortSummary,
          entities: doc.entities,
          clauses: doc.clauses,
          simplifiedText: doc.simplifiedText,
          analysisStatus: doc.analysisStatus,
        },
      });
    } catch (err) {
      doc.analysisStatus = "failed";
      doc.analysisError =
        err.response?.data?.detail || err.message || "Analysis failed";
      await doc.save();

      return res.status(502).json({
        message: "AI analysis failed. Ensure the AI service is running and models are installed.",
        analysisError: doc.analysisError,
        document: doc,
      });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  analyzeDocumentById,
};
