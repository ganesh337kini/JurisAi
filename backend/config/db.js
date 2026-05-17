/**
 * MongoDB connection helper.
 * Keeps connection logic in one place for easier maintenance.
 */
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    // Modern driver defaults are fine; keep options minimal for clarity.
  });

  console.log("MongoDB connected");
}

module.exports = { connectDB };
