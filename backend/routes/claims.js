const express = require("express");
const Item = require("../models/Item");
const Claim = require("../models/Claim");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { sendMail } = require("../utils/mailer");

const router = express.Router();
const DUPLICATE_CLAIM = "You already have a pending claim on this item. Check “My claims” for updates.";

// Claim a found item by answering the verification question.
// This is the human-in-the-loop step: the algorithm never auto-confirms
// ownership, it only ever suggests candidates. Claims don't lock the item:
// several people can claim it, and the finder approves one.
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { foundItemId, lostItemId, matchScore } = req.body;
  const answer = String(req.body.answer || "").trim();
  if (!foundItemId || !answer) {
    return res.status(400).json({ error: "foundItemId and answer are required." });
  }
  if (answer.length > 500) {
    return res.status(400).json({ error: "Please keep your answer under 500 characters." });
  }

  const foundItem = await Item.findById(foundItemId).populate("reporter", "name email");
  if (!foundItem || foundItem.type !== "found") {
    return res.status(404).json({ error: "Found item not found." });
  }
  if (foundItem.status !== "active") {
    return res.status(400).json({ error: "This item is no longer available to claim." });
  }
  if (String(foundItem.reporter._id) === req.user.id) {
    return res.status(400).json({ error: "You can't claim an item you reported found." });
  }
  if (lostItemId) {
    const lostItem = await Item.findById(lostItemId);
    if (!lostItem || lostItem.type !== "lost" || String(lostItem.reporter) !== req.user.id) {
      return res.status(403).json({ error: "You can only claim using your own lost report." });
    }
  }
  const already = await Claim.exists({ foundItem: foundItemId, claimant: req.user.id, status: "pending" });
  if (already) {
    return res.status(409).json({ error: DUPLICATE_CLAIM });
  }

  let claim;
  try {
    claim = await Claim.create({
      foundItem: foundItemId,
      lostItem: lostItemId || null,
      claimant: req.user.id,
      answer,
      matchScore: typeof matchScore === "number" ? matchScore : null,
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: DUPLICATE_CLAIM });
    throw err;
  }

  await sendMail({
    to: foundItem.reporter.email,
    subject: "Someone has claimed the item you found",
    text: `Hi ${foundItem.reporter.name},\n\n${req.user.name} has submitted a claim for the item you reported found. Log in to Campus Lost & Found to review their answer and confirm or reject the claim.\n\n- Campus Lost & Found`,
  });

  res.status(201).json({ claim });
}));

// Claims the logged-in user has made, so they can follow their status.
// The finder's email is only revealed once the claim is approved.
router.get("/mine", requireAuth, asyncHandler(async (req, res) => {
  const claims = await Claim.find({ claimant: req.user.id })
    .populate({
      path: "foundItem",
      select: `${Item.PUBLIC_FIELDS} -verificationQuestion`,
      populate: { path: "reporter", select: "name email" },
    })
    .sort({ createdAt: -1 });

  res.json({
    claims: claims.map((c) => {
      const json = c.toJSON();
      if (json.foundItem?.reporter) {
        const { _id, name, email } = json.foundItem.reporter;
        json.foundItem.reporter = c.status === "approved" ? { _id, name, email } : { _id, name };
      }
      return json;
    }),
  });
}));

// The person who reported the found item reviews claims against it.
router.get("/for-item/:foundItemId", requireAuth, asyncHandler(async (req, res) => {
  const foundItem = await Item.findById(req.params.foundItemId);
  if (!foundItem) return res.status(404).json({ error: "Found item not found." });
  if (String(foundItem.reporter) !== req.user.id) {
    return res.status(403).json({ error: "Only the person who reported this item can view its claims." });
  }

  const claims = await Claim.find({ foundItem: req.params.foundItemId })
    .populate("claimant", "name email")
    .sort({ createdAt: -1 });
  res.json({
    claims,
    verificationQuestion: foundItem.verificationQuestion,
    verificationAnswer: foundItem.verificationAnswer, // the finder's own expected answer
  });
}));

// Approve/reject a pending claim. Only the finder can decide,
// and each claim can only be decided once.
router.patch("/:id/decision", requireAuth, asyncHandler(async (req, res) => {
  const { decision } = req.body; // "approved" | "rejected"
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approved' or 'rejected'." });
  }

  const claim = await Claim.findById(req.params.id).populate("claimant", "name email");
  if (!claim) return res.status(404).json({ error: "Claim not found." });

  const foundItem = await Item.findById(claim.foundItem).populate("reporter", "name email");
  if (!foundItem) return res.status(404).json({ error: "The found item no longer exists." });
  const isFinder = String(foundItem.reporter._id) === req.user.id;
  if (!isFinder) {
    return res.status(403).json({ error: "Only the finder can decide on this claim." });
  }
  if (claim.status !== "pending") {
    return res.status(409).json({ error: `This claim was already ${claim.status}.` });
  }

  if (decision === "approved") {
    // Atomically take the item off the board so two approvals can't both win.
    const taken = await Item.findOneAndUpdate(
      { _id: foundItem._id, status: "active" },
      { $set: { status: "resolved" } }
    );
    if (!taken) return res.status(409).json({ error: "This item is no longer active." });
  }

  const updated = await Claim.findOneAndUpdate(
    { _id: claim._id, status: "pending" },
    { $set: { status: decision } },
    { new: true }
  );
  if (!updated) {
    if (decision === "approved") await Item.updateOne({ _id: foundItem._id }, { $set: { status: "active" } });
    return res.status(409).json({ error: "This claim was already decided." });
  }

  const finder = foundItem.reporter;
  if (decision === "approved") {
    if (claim.lostItem) await Item.findByIdAndUpdate(claim.lostItem, { status: "resolved" });

    // Everyone else who claimed it is turned down.
    const others = await Claim.find({ foundItem: foundItem._id, status: "pending" }).populate("claimant", "name email");
    await Claim.updateMany({ _id: { $in: others.map((o) => o._id) } }, { $set: { status: "rejected" } });
    for (const o of others) {
      await sendMail({
        to: o.claimant.email,
        subject: "Your claim was rejected",
        text: `Hi ${o.claimant.name},\n\nThe item you claimed has been returned to another claimant. You can check the matches feed for other possible matches.\n\n- Campus Lost & Found`,
      });
    }
  }

  await sendMail({
    to: claim.claimant.email,
    subject: `Your claim was ${decision}`,
    text: `Hi ${claim.claimant.name},\n\nYour claim on a found item was ${decision} by the finder. ${
      decision === "approved"
        ? `Reach out to ${finder.name} at ${finder.email} to arrange pickup.`
        : "You can check the matches feed for other possible matches."
    }\n\n- Campus Lost & Found`,
  });

  res.json({ claim: updated });
}));

module.exports = router;
