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
    // Optional base64 data URL, shown to humans only, not matched on. It is
    // never sent in API responses -- clients get /api/items/:id/photo instead.
    photoUrl: { type: String, default: null },
    hasPhoto: { type: Boolean, default: false },
    // A question only the real owner could answer, used during the claim flow.
    verificationQuestion: { type: String, default: null },
    verificationAnswer: { type: String, default: null },
    // "matched" is legacy (items used to lock while a claim was pending);
    // it's migrated back to "active" on startup.
    status: {
      type: String,
      enum: ["active", "matched", "resolved", "closed"],
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.verificationAnswer; // never leaks unless a route adds it explicitly
        if ("hasPhoto" in ret) {
          ret.photoUrl = ret.hasPhoto ? `/api/items/${ret._id}/photo` : null;
        } else {
          delete ret.photoUrl;
        }
        return ret;
      },
    },
  }
);

// Fields to leave out of every list/detail query: photos are large and
// served separately; the verification answer is secret.
itemSchema.statics.PUBLIC_FIELDS = "-photoUrl -verificationAnswer";

// One-off fixes for data created before these fields/rules existed.
itemSchema.statics.migrateLegacy = async function () {
  await this.updateMany({ hasPhoto: { $exists: false }, photoUrl: { $nin: [null, ""] } }, { $set: { hasPhoto: true } });
  await this.updateMany({ hasPhoto: { $exists: false } }, { $set: { hasPhoto: false } });
  await this.updateMany({ status: "matched" }, { $set: { status: "active" } });
};

itemSchema.index({ type: 1, category: 1, status: 1 });
itemSchema.index({ type: 1, status: 1, createdAt: -1 }); // feed + match candidates
itemSchema.index({ reporter: 1, createdAt: -1 }); // "My reports"

module.exports = mongoose.model("Item", itemSchema);
module.exports.CATEGORIES = CATEGORIES;
