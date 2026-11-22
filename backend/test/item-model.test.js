const test = require("node:test");
const assert = require("node:assert/strict");
const Item = require("../models/Item");

test("toJSON hides the verification answer and swaps the photo for a URL", () => {
  const item = new Item({
    type: "found", reporter: "507f1f77bcf86cd799439011", category: "Keys",
    description: "keys", location: "x", date: new Date(),
    photoUrl: "data:image/jpeg;base64,AAAA", hasPhoto: true,
    verificationQuestion: "What keychain?", verificationAnswer: "a duck",
  });
  const json = item.toJSON();
  assert.equal(json.verificationAnswer, undefined);
  assert.equal(json.verificationQuestion, "What keychain?");
  assert.equal(json.photoUrl, `/api/items/${item._id}/photo`);
});

test("items without a photo get photoUrl null", () => {
  const item = new Item({ type: "lost", reporter: "507f1f77bcf86cd799439011", category: "Keys", description: "k", location: "x", date: new Date() });
  assert.equal(item.toJSON().photoUrl, null);
});
