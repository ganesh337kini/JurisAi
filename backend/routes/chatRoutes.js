const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getChatHistory,
  sendChatMessage,
  clearChatHistory,
} = require("../controllers/chatController");

const router = express.Router();

router.use(requireAuth);

router.post("/", sendChatMessage);
router.get("/:documentId", getChatHistory);
router.delete("/:documentId", clearChatHistory);

module.exports = router;
