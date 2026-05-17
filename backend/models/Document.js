const mongoose = require("mongoose");

/**
 * Document metadata stored in MongoDB.
 * Binary files live on disk under /uploads; vectors live in ChromaDB (AI service).
 */
const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalname: {
      type: String,
      required: true,
    },
    filetype: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      default: "",
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    processingError: {
      type: String,
      default: "",
    },
    // Phase 2 — AI analysis results
    summary: {
      type: String,
      default: "",
    },
    shortSummary: {
      type: String,
      default: "",
    },
    entities: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    clauses: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    simplifiedText: {
      type: String,
      default: "",
    },
    analysisStatus: {
      type: String,
      enum: ["none", "pending", "processing", "completed", "failed"],
      default: "none",
    },
    analysisError: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
