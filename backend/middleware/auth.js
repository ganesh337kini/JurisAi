const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getJwtSecret } = require("../config/jwt");

/**
 * Protects routes that require a logged-in user.
 * Expects: Authorization: Bearer <token>
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    const token = match ? match[1].trim() : "";

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    let secret;
    try {
      secret = getJwtSecret();
    } catch {
      return res.status(500).json({ message: "Server misconfiguration: JWT_SECRET missing" });
    }

    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = { id: user._id.toString(), email: user.email, name: user.name };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired — please log in again." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        message:
          "Invalid token — please log in again. If you recently changed JWT_SECRET in backend/.env, old sessions stop working until you sign in again.",
      });
    }
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
