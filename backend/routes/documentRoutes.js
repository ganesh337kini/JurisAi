const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  analyzeDocumentById,
} = require("../controllers/documentController");

const router = express.Router();

// Ensure uploads directory exists at startup (also done in server.js).
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, safe);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = /\.(pdf|docx|txt|png|jpe?g|webp|tiff?)$/i;
  if (allowed.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * Multer wraps the handler — normalize errors to JSON for the client.
 */
function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    }
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    next();
  });
}

router.use(requireAuth);

router.post("/upload", uploadSingle, uploadDocument);
router.get("/", listDocuments);
router.post("/analyze/:id", analyzeDocumentById);
router.get("/:id", getDocument);
router.delete("/:id", deleteDocument);

module.exports = router;
