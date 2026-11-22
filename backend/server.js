require("dotenv").config();

// Refuse to start with a missing or guessable JWT secret: anyone who knows it
// can forge a login token for any user.
const KNOWN_PLACEHOLDERS = ["change_this_to_a_long_random_string", "generate_with__openssl_rand_-hex_48", "secret", "changeme"];
const secret = process.env.JWT_SECRET || "";
if (secret.length < 32 || KNOWN_PLACEHOLDERS.includes(secret)) {
  console.error(
    "[config] JWT_SECRET is missing, too short or still the example value.\n" +
      "         Generate one with:  openssl rand -hex 48\n" +
      "         and put it in backend/.env as JWT_SECRET=..."
  );
  process.exit(1);
}
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Item = require("./models/Item");

const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");
const claimRoutes = require("./routes/claims");

const app = express();
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "6mb" })); // room for a compressed base64 photo

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found." }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Malformed ids like /api/items/abc
  if (err.name === "CastError") return res.status(404).json({ error: "Not found." });
  if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "That upload is too large." });
  if (err.code === 11000) return res.status(409).json({ error: "That already exists." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5001; // the frontend dev proxy expects 5001

connectDB().then(async () => {
  await Item.migrateLegacy().catch((err) => console.error("[db] legacy migration failed:", err.message));
  app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
});
