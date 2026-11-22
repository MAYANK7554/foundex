const test = require("node:test");
const assert = require("node:assert/strict");
const { scorePair, findMatches, textSimilarity, timeProximityScore, POSSIBLE_MATCH_THRESHOLD } = require("../utils/matching");
const { CAMPUS_LOCATIONS } = require("../utils/locations");

const loc = CAMPUS_LOCATIONS[0];
const base = { category: "Wallet / Purse", location: loc, date: "2026-11-01" };

test("identical descriptions score 1 on text", () => {
  assert.ok(Math.abs(textSimilarity("black leather wallet", "black leather wallet") - 1) < 1e-9);
});

test("unrelated or empty descriptions score 0 on text", () => {
  assert.equal(textSimilarity("blue bottle", "red umbrella"), 0);
  assert.equal(textSimilarity("", "wallet"), 0);
});

test("time proximity: full within 3 days, zero after 21, linear between", () => {
  assert.equal(timeProximityScore("2026-11-01", "2026-11-03"), 1);
  assert.equal(timeProximityScore("2026-11-01", "2026-11-30"), 0);
  assert.equal(timeProximityScore("2026-11-01", "2026-11-13"), 0.5);
});

test("different categories never match", () => {
  const lost = { ...base, type: "lost", description: "black wallet" };
  const found = { ...base, type: "found", category: "Keys", description: "black wallet" };
  assert.equal(scorePair(lost, found), null);
});

test("findMatches keeps only opposite-type items above threshold, best first", () => {
  const lost = { ...base, _id: "l1", type: "lost", description: "black leather wallet near library" };
  const strong = { ...base, _id: "f1", type: "found", description: "black leather wallet near library" };
  const weak = { ...base, _id: "f2", type: "found", description: "pink purse", date: "2026-10-01" };
  const sameType = { ...base, _id: "l2", type: "lost", description: "black leather wallet near library" };

  const results = findMatches(lost, [weak, sameType, strong]);
  assert.equal(results[0].item._id, "f1");
  assert.ok(results.every((r) => r.item.type === "found"));
  assert.ok(results.every((r) => r.score >= POSSIBLE_MATCH_THRESHOLD));
});
