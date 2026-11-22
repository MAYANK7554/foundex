const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { rateLimit } = require("../middleware/rateLimit");
const asyncHandler = require("../utils/asyncHandler");

const DUPLICATE_EMAIL = "An account with that email already exists.";

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

const router = express.Router();

function allowedDomains() {
  return (process.env.COLLEGE_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

function isCollegeEmail(email) {
  // Temporarily open to everyone: domain check runs only when ENFORCE_COLLEGE_EMAIL=true.
  if (process.env.ENFORCE_COLLEGE_EMAIL !== "true") return true;
  const domains = allowedDomains();
  if (domains.length === 0) return true; // no restriction configured
  const domain = email.split("@")[1]?.toLowerCase();
  return domains.includes(domain);
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Login: 10 tries per 15 min per IP+email, reset on success (slows password guessing).
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}|${String(req.body?.email || "").trim().toLowerCase()}`,
  message: "Too many login attempts. Please wait 15 minutes and try again.",
});
// Register: 20 accounts per hour per IP.
const registerLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => req.ip,
  message: "Too many sign-ups from this network. Please try again later.",
});

router.post("/register", registerLimit, asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are all required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!isCollegeEmail(email)) {
    return res.status(400).json({
      error: `Please use your college email (${allowedDomains().join(" or ")}).`,
    });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: DUPLICATE_EMAIL });

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await User.create({ name, email, passwordHash });
  } catch (err) {
    // Two sign-ups with the same email at the same moment: the unique index catches the second.
    if (err.code === 11000) return res.status(409).json({ error: DUPLICATE_EMAIL });
    throw err;
  }

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post("/login", loginLimit, asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });
  loginLimit.reset(req.rateLimitKey);

  res.json({ token: signToken(user), user: publicUser(user) });
}));

module.exports = router;
