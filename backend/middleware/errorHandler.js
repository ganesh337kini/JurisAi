/**
 * Central Express error handler — keeps responses consistent.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== "production" && err.details ? { details: err.details } : {}),
  });
}

module.exports = { errorHandler };
