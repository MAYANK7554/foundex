const test = require("node:test");
const assert = require("node:assert/strict");
const { createLimiter, rateLimit } = require("../middleware/rateLimit");

test("allows up to max hits per window, then blocks until it resets", () => {
  const l = createLimiter({ windowMs: 1000, max: 2 });
  assert.equal(l.hit("a", 0).allowed, true);
  assert.equal(l.hit("a", 10).allowed, true);
  assert.equal(l.hit("a", 20).allowed, false);
  assert.equal(l.hit("b", 20).allowed, true, "keys are independent");
  assert.equal(l.hit("a", 1001).allowed, true, "window expired");
});

test("reset clears a key", () => {
  const l = createLimiter({ windowMs: 1000, max: 1 });
  l.hit("a", 0);
  assert.equal(l.hit("a", 1).allowed, false);
  l.reset("a");
  assert.equal(l.hit("a", 2).allowed, true);
});

test("middleware answers 429 with Retry-After once over the limit", () => {
  const mw = rateLimit({ windowMs: 60000, max: 1, keyFn: () => "k" });
  const res = {
    headers: {}, code: 200, body: null,
    set(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
  };
  let nextCalls = 0;
  mw({}, res, () => nextCalls++);
  mw({}, res, () => nextCalls++);
  assert.equal(nextCalls, 1);
  assert.equal(res.code, 429);
  assert.ok(Number(res.headers["Retry-After"]) > 0);
  assert.match(res.body.error, /Too many/);
});
