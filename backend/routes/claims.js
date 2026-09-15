const express = require("express");
const Item = require("../models/Item");
const Claim = require("../models/Claim");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { sendMail } = require("../utils/mailer");

const router = express.Router();

// Claim a found item by answering the verification question.
// This is the human-in-the-loop step: the algorithm never auto-confirms
// ownership, it only ever suggests candidates.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { foundItemId, lostItemId, answer, matchScore } = req.body;
    if (!foundItemId || !answer) {
      return res.status(400).json({ error: "foundItemId and answer are required." });
    }

    const foundItem = await Item.findById(foundItemId).populate("reporter", "name email");
    if (!foundItem || foundItem.type !== "found") {
      return res.status(404).json({ error: "Found item not found." });
    }
    if (foundItem.status !== "active") {
      return res.status(400).json({ error: "This item is no longer active." });
    }

    const claim = await Claim.create({
      foundItem: foundItemId,
      lostItem: lostItemId || null,
      claimant: req.user.id,
      answer,
      matchScore: matchScore ?? null,
    });

    foundItem.status = "matched";
    await foundItem.save();

    await sendMail({
      to: foundItem.reporter.email,
      subject: "Someone has claimed the item you found",
      text: `Hi ${foundItem.reporter.name},\n\n${req.user.name} has submitted a claim for the item you reported found. Log in to Campus Lost & Found to review their answer and confirm or reject the claim.\n\n- Campus Lost & Found`,
    });

    res.status(201).json({ claim });
  } catch (err) {
    res.status(500).json({ error: "Could not submit claim.", detail: err.message });
  }
});

// The person who reported the found item reviews claims against it.
router.get("/for-item/:foundItemId", requireAuth, async (req, res) => {
  const foundItem = await Item.findById(req.params.foundItemId);
  if (!foundItem) return res.status(404).json({ error: "Found item not found." });
  if (String(foundItem.reporter) !== req.user.id) {
    return res.status(403).json({ error: "Only the person who reported this item can view its claims." });
  }

  const claims = await Claim.find({ foundItem: req.params.foundItemId })
    .populate("claimant", "name email")
    .sort({ createdAt: -1 });
  res.json({ claims, verificationQuestion: foundItem.verificationQuestion });
});

// Approve/reject a claim. Only the finder (or an admin) can decide.
router.patch("/:id/decision", requireAuth, async (req, res) => {
  try {
    const { decision } = req.body; // "approved" | "rejected"
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'approved' or 'rejected'." });
    }

    const claim = await Claim.findById(req.params.id).populate("claimant", "name email");
    if (!claim) return res.status(404).json({ error: "Claim not found." });

    const foundItem = await Item.findById(claim.foundItem).populate("reporter", "name email");
    const isFinder = String(foundItem.reporter._id) === req.user.id;
    if (!isFinder && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only the finder or an admin can decide on this claim." });
    }

    claim.status = decision;
    await claim.save();

    if (decision === "approved") {
      foundItem.status = "resolved";
      await foundItem.save();
      if (claim.lostItem) {
        await Item.findByIdAndUpdate(claim.lostItem, { status: "resolved" });
      }
    } else {
      foundItem.status = "active"; // reopen for other claimants
      await foundItem.save();
    }

    await sendMail({
      to: claim.claimant.email,
      subject: `Your claim was ${decision}`,
      text: `Hi ${claim.claimant.name},\n\nYour claim on a found item was ${decision} by the finder. ${
        decision === "approved"
          ? "Reach out to them to arrange pickup."
          : "You can check the matches feed for other possible matches."
      }\n\n- Campus Lost & Found`,
    });

    res.json({ claim });
  } catch (err) {
    res.status(500).json({ error: "Could not update claim.", detail: err.message });
  }
});

module.exports = router;
