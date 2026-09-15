const mongoose = require("mongoose");

const CATEGORIES = [
  "ID Card",
  "Water Bottle",
  "Charger / Cable",
  "Electronics (phone, earbuds, etc.)",
  "Bag / Backpack",
  "Wallet / Purse",
  "Keys",
  "Books / Stationery",
  "Clothing / Accessories",
  "Other",
];

const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lost", "found"], required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    location: { type: String, required: true },
    date: { type: Date, required: true }, // date the item was lost / found
    photoUrl: { type: String, default: null }, // optional, shown to humans only, not matched on
    // A question only the real owner could answer, used during the claim flow.
    verificationQuestion: { type: String, default: null },
    verificationAnswer: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "matched", "resolved", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

itemSchema.index({ type: 1, category: 1, status: 1 });

module.exports = mongoose.model("Item", itemSchema);
module.exports.CATEGORIES = CATEGORIES;
