const natural = require("natural");
const { locationProximityScore } = require("./locations");

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

// ---- Weights (tune these; they're the whole "why did it match" story) ----
const WEIGHTS = {
  text: 0.5,
  location: 0.3,
  time: 0.2,
};

// Score thresholds used by the routes layer.
const AUTO_NOTIFY_THRESHOLD = 0.7; // >= this -> notify both sides automatically
const POSSIBLE_MATCH_THRESHOLD = 0.4; // >= this -> show as "possible match"

function normalize(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

/**
 * Cosine similarity between two short text descriptions using TF-IDF
 * vectors built from just the two documents being compared. This is
 * intentionally lightweight (no external embedding API, no GPU) --
 * it's a "cheap, explainable signal" rather than a black box.
 */
function textSimilarity(textA, textB) {
  const a = normalize(textA);
  const b = normalize(textB);
  if (!a || !b) return 0;

  const tfidf = new TfIdf();
  tfidf.addDocument(a);
  tfidf.addDocument(b);

  const vocab = new Set([...tokenizer.tokenize(a), ...tokenizer.tokenize(b)]);
  if (vocab.size === 0) return 0;

  const vecA = [];
  const vecB = [];
  vocab.forEach((term) => {
    vecA.push(tfidf.tfidf(term, 0));
    vecB.push(tfidf.tfidf(term, 1));
  });

  const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));
  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

/**
 * Recency weighting: matches closer in time score higher.
 * Full credit inside 3 days, decaying to ~0 by 21 days apart.
 */
function timeProximityScore(dateA, dateB) {
  const diffDays = Math.abs(new Date(dateA) - new Date(dateB)) / (1000 * 60 * 60 * 24);
  if (diffDays <= 3) return 1;
  if (diffDays >= 21) return 0;
  return 1 - (diffDays - 3) / 18;
}

/**
 * Score a single lost-item / found-item pair.
 * Category mismatch is a hard filter -- returns null (no match at all)
 * rather than a low score, since a charger will never be a water bottle.
 */
function scorePair(lostItem, foundItem) {
  if (lostItem.category !== foundItem.category) return null;

  const text = textSimilarity(lostItem.description, foundItem.description);
  const location = locationProximityScore(lostItem.location, foundItem.location);
  const time = timeProximityScore(lostItem.date, foundItem.date);

  const score =
    text * WEIGHTS.text + location * WEIGHTS.location + time * WEIGHTS.time;

  return {
    score: Math.round(score * 1000) / 1000,
    breakdown: {
      text: Math.round(text * 1000) / 1000,
      location: Math.round(location * 1000) / 1000,
      time: Math.round(time * 1000) / 1000,
    },
  };
}

/**
 * Given one item and a list of candidate items from the *opposite* type
 * (lost vs found), return scored + sorted matches above the "possible"
 * threshold.
 */
function findMatches(item, candidates) {
  const results = [];
  for (const candidate of candidates) {
    if (String(candidate._id) === String(item._id)) continue;
    const lost = item.type === "lost" ? item : candidate;
    const found = item.type === "found" ? item : candidate;
    if (lost.type !== "lost" || found.type !== "found") continue;

    const result = scorePair(lost, found);
    if (!result) continue;
    if (result.score >= POSSIBLE_MATCH_THRESHOLD) {
      results.push({ item: candidate, ...result });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

module.exports = {
  scorePair,
  findMatches,
  textSimilarity,
  timeProximityScore,
  AUTO_NOTIFY_THRESHOLD,
  POSSIBLE_MATCH_THRESHOLD,
  WEIGHTS,
};
