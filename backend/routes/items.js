const express = require("express");
const mongoose = require("mongoose");
const Item = require("../models/Item");
const Claim = require("../models/Claim");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { findMatches, AUTO_NOTIFY_THRESHOLD } = require("../utils/matching");
const { sendMail } = require("../utils/mailer");
const { parsePhotoDataUrl } = require("../utils/photo");
const { CAMPUS_LOCATIONS } = require("../utils/locations");

const router = express.Router();

// Reporter info other users may see: name only, never email.
function publicMatches(matches) {
  return matches.map((m) => {
    const item = m.item.toJSON();
    if (item.reporter && typeof item.reporter === "object") {
      item.reporter = { _id: item.reporter._id, name: item.reporter.name };
    }
    return { ...m, item };
  });
}

function canManage(item, user) {
  return String(item.reporter?._id || item.reporter) === user.id;
}

// Static reference data the frontend needs for dropdowns.
router.get("/meta", (req, res) => {
  res.json({ categories: Item.CATEGORIES, locations: CAMPUS_LOCATIONS });
});

// Report a lost or found item.
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { type, category, description, location, date, photoUrl, verificationQuestion, verificationAnswer } = req.body;

  if (!["lost", "found"].includes(type)) {
    return res.status(400).json({ error: "type must be 'lost' or 'found'." });
  }
  if (!category || !description || !location || !date) {
    return res.status(400).json({ error: "category, description, location and date are required." });
  }
  if (type === "found" && (!verificationQuestion?.trim() || !verificationAnswer?.trim())) {
    return res.status(400).json({
      error: "For found items, please add a verification question only the real owner would know the answer to.",
    });
  }
  if (photoUrl && !parsePhotoDataUrl(photoUrl)) {
    return res.status(400).json({ error: "That photo couldn't be read. Please try a different image (max 2 MB)." });
  }

  const item = await Item.create({
    type,
    reporter: req.user.id,
    category,
    description,
    location,
    date,
    photoUrl: photoUrl || null,
    hasPhoto: Boolean(photoUrl),
    verificationQuestion: type === "found" ? verificationQuestion.trim() : null,
    verificationAnswer: type === "found" ? verificationAnswer.trim() : null,
  });

  // Try to find matches immediately and notify both sides if it's a strong one.
  const oppositeType = type === "lost" ? "found" : "lost";
  const candidates = await Item.find({ type: oppositeType, status: "active" })
    .select(Item.PUBLIC_FIELDS)
    .populate("reporter", "name email");
  const populatedItem = await item.populate("reporter", "name email");
  const matches = findMatches(populatedItem, candidates);

  const strongMatch = matches.find((m) => m.score >= AUTO_NOTIFY_THRESHOLD);
  if (strongMatch) {
    const lostReporter = type === "lost" ? populatedItem.reporter : strongMatch.item.reporter;
    const foundReporter = type === "found" ? populatedItem.reporter : strongMatch.item.reporter;
    const pct = Math.round(strongMatch.score * 100);

    await sendMail({
      to: lostReporter.email,
      subject: "Possible match for your lost item",
      text: `Hi ${lostReporter.name},\n\nSomeone reported finding an item that looks like a strong match (${pct}% confidence) for your lost report. Log in to Campus Lost & Found to view details and start a claim.\n\n- Campus Lost & Found`,
    });
    await sendMail({
      to: foundReporter.email,
      subject: "Someone may be looking for the item you found",
      text: `Hi ${foundReporter.name},\n\nA lost-item report was just submitted that looks like a strong match (${pct}% confidence) for the item you found. Log in to Campus Lost & Found to view details.\n\n- Campus Lost & Found`,
    });
  }

  res.status(201).json({ item, matches: publicMatches(matches), autoNotified: Boolean(strongMatch) });
}));

// List items (optionally filtered by type/category/status).
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const { type, category, status } = req.query;
  const filter = { status: String(status || "active") };
  if (type) filter.type = String(type);
  if (category) filter.category = String(category);

  const items = await Item.find(filter)
    .select(Item.PUBLIC_FIELDS)
    .populate("reporter", "name")
    .sort({ createdAt: -1 });

  res.json({ items });
}));

// Items reported by the logged-in user, with pending-claim counts on found items.
router.get("/mine", requireAuth, asyncHandler(async (req, res) => {
  const items = await Item.find({ reporter: req.user.id })
    .select(Item.PUBLIC_FIELDS)
    .sort({ createdAt: -1 });

  const foundIds = items.filter((i) => i.type === "found").map((i) => i._id);
  const counts = await Claim.aggregate([
    { $match: { foundItem: { $in: foundIds }, status: "pending" } },
    { $group: { _id: "$foundItem", n: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));

  res.json({
    items: items.map((i) => ({ ...i.toJSON(), pendingClaims: byId.get(String(i._id)) || 0 })),
  });
}));

// Photo bytes. Public (no auth) because <img> tags can't send the auth
// header; item ids aren't listed anywhere without logging in.
router.get("/:id/photo", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
  const item = await Item.findById(req.params.id).select("photoUrl").lean();
  const photo = item && parsePhotoDataUrl(item.photoUrl);
  if (!photo) return res.status(404).end();
  res.set("Content-Type", photo.contentType);
  res.set("Cache-Control", "private, max-age=86400, immutable");
  res.send(photo.buffer);
}));

// Single item detail + live-computed matches.
router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).select(Item.PUBLIC_FIELDS).populate("reporter", "name");
  if (!item) return res.status(404).json({ error: "Item not found." });

  const oppositeType = item.type === "lost" ? "found" : "lost";
  const candidates = await Item.find({ type: oppositeType, status: "active" })
    .select(Item.PUBLIC_FIELDS)
    .populate("reporter", "name");
  const matches = item.status === "active" ? findMatches(item, candidates) : [];

  res.json({ item, matches: publicMatches(matches) });
}));

// Owner marks a report resolved/closed, or reopens it.
router.patch("/:id/status", requireAuth, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["active", "resolved", "closed"].includes(status)) {
    return res.status(400).json({ error: "status must be 'active', 'resolved' or 'closed'." });
  }

  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found." });
  if (!canManage(item, req.user)) {
    return res.status(403).json({ error: "Only the person who reported this item can change it." });
  }

  if (status === "active" && item.type === "found") {
    const approved = await Claim.exists({ foundItem: item._id, status: "approved" });
    if (approved) {
      return res.status(400).json({ error: "This item was already handed to an approved claimant." });
    }
  }

  item.status = status;
  await item.save();

  // A found item that's no longer available can't be claimed.
  if (status !== "active" && item.type === "found") {
    await Claim.updateMany({ foundItem: item._id, status: "pending" }, { $set: { status: "rejected" } });
  }

  res.json({ item });
}));

// Owner deletes a report and anything that only exists because of it.
router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found." });
  if (!canManage(item, req.user)) {
    return res.status(403).json({ error: "Only the person who reported this item can delete it." });
  }

  if (item.type === "found") {
    await Claim.deleteMany({ foundItem: item._id });
  } else {
    await Claim.updateMany({ lostItem: item._id }, { $set: { lostItem: null } });
  }
  await item.deleteOne();

  res.json({ ok: true });
}));

module.exports = router;
