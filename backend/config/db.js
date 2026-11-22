const mongoose = require("mongoose");

// Pin the database name: a connection string without one silently falls back
// to a database called "test", which is how reports once ended up split
// across two databases.
const DB_NAME = process.env.MONGO_DB_NAME || "campus-lost-found";

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/campus-lost-found";
  try {
    await mongoose.connect(uri, { dbName: DB_NAME });
    const { host, name } = mongoose.connection;
    // Don't log the URI itself: it contains the database password.
    console.log(`[db] connected -> ${host} / ${name}`);
  } catch (err) {
    console.error("[db] connection failed:", err.message);
    console.error(
      "[db] Make sure MongoDB is running locally, or set MONGO_URI in .env to an Atlas connection string."
    );
    process.exit(1);
  }
}

module.exports = connectDB;
