const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
  {
    foundItem: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    lostItem: { type: mongoose.Schema.Types.ObjectId, ref: "Item", default: null },
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answer: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    matchScore: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Claim", claimSchema);
