const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/campus-lost-found";
  try {
    await mongoose.connect(uri);
    console.log(`[db] connected -> ${uri}`);
  } catch (err) {
    console.error("[db] connection failed:", err.message);
    console.error(
      "[db] Make sure MongoDB is running locally, or set MONGO_URI in .env to an Atlas connection string."
    );
    process.exit(1);
  }
}

module.exports = connectDB;
