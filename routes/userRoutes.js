const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
// /api/user/
router.route("/").get(protect, allUsers);
// /api/user/
router.route("/").post(registerUser);
//  /api/user/login
router.post("/login", authUser);

module.exports = router;
