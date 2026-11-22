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

// Finder's review list and pending-claim counts.
claimSchema.index({ foundItem: 1, status: 1 });
// "My claims" for a claimant.
claimSchema.index({ claimant: 1, createdAt: -1 });
// Lost-report cleanup on delete.
claimSchema.index({ lostItem: 1 });
// One pending claim per person per item, enforced by the database so two
// simultaneous submits can't both get through.
claimSchema.index(
  { foundItem: 1, claimant: 1 },
  { unique: true, partialFilterExpression: { status: "pending" }, name: "one_pending_claim_per_user" }
);

module.exports = mongoose.model("Claim", claimSchema);
