const express = require("express");
const {
  allMessages,
  sendMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// this route is to fetch all messages of one single chat
router.route("/:chatId").get(protect, allMessages);
// this api is to send the message
router.route("/").post(protect, sendMessage);

module.exports = router;
