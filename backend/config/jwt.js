/**
 * Single place for JWT secret so sign + verify always use the same value.
 * Trims whitespace (common .env copy/paste issue).
 */
function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw || !String(raw).trim()) {
    throw new Error("JWT_SECRET is not set");
  }
  return String(raw).trim();
}

module.exports = { getJwtSecret };
