const express = require("express");
const Item = require("../models/Item");
const Claim = require("../models/Claim");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", async (req, res) => {
  const [activeLost, activeFound, resolved, pendingClaims] = await Promise.all([
    Item.countDocuments({ type: "lost", status: "active" }),
    Item.countDocuments({ type: "found", status: "active" }),
    Item.countDocuments({ status: "resolved" }),
    Claim.countDocuments({ status: "pending" }),
  ]);
  res.json({ activeLost, activeFound, resolved, pendingClaims });
});

router.get("/items", async (req, res) => {
  const items = await Item.find({})
    .select("-verificationAnswer")
    .populate("reporter", "name email")
    .sort({ createdAt: -1 });
  res.json({ items });
});

router.get("/claims", async (req, res) => {
  const claims = await Claim.find({})
    .populate("claimant", "name email")
    .populate("foundItem", "description category status")
    .sort({ createdAt: -1 });
  res.json({ claims });
});

module.exports = router;
