const express = require("express");
const Item = require("../models/Item");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { findMatches, AUTO_NOTIFY_THRESHOLD } = require("../utils/matching");
const { sendMail } = require("../utils/mailer");
const { CAMPUS_LOCATIONS } = require("../utils/locations");

const router = express.Router();

// Static reference data the frontend needs for dropdowns.
router.get("/meta", (req, res) => {
  res.json({ categories: Item.CATEGORIES, locations: CAMPUS_LOCATIONS });
});

// Report a lost or found item.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { type, category, description, location, date, photoUrl, verificationQuestion, verificationAnswer } = req.body;

    if (!["lost", "found"].includes(type)) {
      return res.status(400).json({ error: "type must be 'lost' or 'found'." });
    }
    if (!category || !description || !location || !date) {
      return res.status(400).json({ error: "category, description, location and date are required." });
    }
    if (type === "found" && (!verificationQuestion || !verificationAnswer)) {
      return res.status(400).json({
        error: "For found items, please add a verification question only the real owner would know the answer to.",
      });
    }

    const item = await Item.create({
      type,
      reporter: req.user.id,
      category,
      description,
      location,
      date,
      photoUrl: photoUrl || null,
      verificationQuestion: type === "found" ? verificationQuestion : null,
      verificationAnswer: type === "found" ? verificationAnswer : null,
    });

    // Try to find matches immediately and notify both sides if it's a strong one.
    const oppositeType = type === "lost" ? "found" : "lost";
    const candidates = await Item.find({ type: oppositeType, status: "active" }).populate("reporter", "name email");
    const populatedItem = await item.populate("reporter", "name email");
    const matches = findMatches(populatedItem, candidates);

    const strongMatch = matches.find((m) => m.score >= AUTO_NOTIFY_THRESHOLD);
    if (strongMatch) {
      const lostReporter = type === "lost" ? populatedItem.reporter : strongMatch.item.reporter;
      const foundReporter = type === "found" ? populatedItem.reporter : strongMatch.item.reporter;

      await sendMail({
        to: lostReporter.email,
        subject: "Possible match for your lost item",
        text: `Hi ${lostReporter.name},\n\nSomeone reported finding an item that looks like a strong match (${Math.round(
          strongMatch.score * 100
        )}% confidence) for your lost report. Log in to Campus Lost & Found to view details and start a claim.\n\n- Campus Lost & Found`,
      });
      await sendMail({
        to: foundReporter.email,
        subject: "Someone may be looking for the item you found",
        text: `Hi ${foundReporter.name},\n\nA lost-item report was just submitted that looks like a strong match (${Math.round(
          strongMatch.score * 100
        )}% confidence) for the item you found. Log in to Campus Lost & Found to view details.\n\n- Campus Lost & Found`,
      });
    }

    res.status(201).json({ item, matches, autoNotified: Boolean(strongMatch) });
  } catch (err) {
    res.status(500).json({ error: "Could not create report.", detail: err.message });
  }
});

// List items (optionally filtered by type/category/status). Verification
// answers are never sent to the client.
router.get("/", requireAuth, async (req, res) => {
  try {
    const { type, category, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    filter.status = status || "active";

    const items = await Item.find(filter)
      .select("-verificationAnswer")
      .populate("reporter", "name")
      .sort({ createdAt: -1 });

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch items.", detail: err.message });
  }
});

// Items reported by the logged-in user.
router.get("/mine", requireAuth, async (req, res) => {
  const items = await Item.find({ reporter: req.user.id })
    .select("-verificationAnswer")
    .sort({ createdAt: -1 });
  res.json({ items });
});

// Single item detail + live-computed matches.
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).select("-verificationAnswer").populate("reporter", "name");
    if (!item) return res.status(404).json({ error: "Item not found." });

    const oppositeType = item.type === "lost" ? "found" : "lost";
    const candidates = await Item.find({ type: oppositeType, status: "active" })
      .select("-verificationAnswer")
      .populate("reporter", "name");
    const matches = findMatches(item, candidates);

    res.json({ item, matches });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch item.", detail: err.message });
  }
});

module.exports = router;
