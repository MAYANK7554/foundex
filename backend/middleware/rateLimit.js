// Small in-memory fixed-window rate limiter (no extra dependency).
// Fine for a single server process; use a shared store (e.g. Redis) if you
// ever run more than one instance.
function createLimiter({ windowMs, max }) {
  const hits = new Map(); // key -> { count, resetAt }

  function sweep(now) {
    if (hits.size < 1000) return;
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }

  return {
    hit(key, now = Date.now()) {
      sweep(now);
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return {
        allowed: entry.count <= max,
        retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
      };
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

// Express middleware: keyFn(req) decides what is being limited.
function rateLimit({ windowMs, max, keyFn, message }) {
  const limiter = createLimiter({ windowMs, max });
  const mw = (req, res, next) => {
    const key = keyFn(req);
    const { allowed, retryAfterSec } = limiter.hit(key);
    if (!allowed) {
      res.set("Retry-After", String(retryAfterSec));
      const mins = Math.ceil(retryAfterSec / 60);
      return res.status(429).json({ error: message || `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` });
    }
    req.rateLimitKey = key;
    next();
  };
  mw.reset = (key) => limiter.reset(key);
  return mw;
}

module.exports = { createLimiter, rateLimit };
