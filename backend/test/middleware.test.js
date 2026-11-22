const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

process.env.JWT_SECRET = "test-secret";

function mockRes() {
  return { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}

test("requireAuth accepts a valid token and rejects bad/missing ones", () => {
  const token = jwt.sign({ id: "u1" }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let called = false;
  requireAuth(req, mockRes(), () => (called = true));
  assert.ok(called);
  assert.equal(req.user.id, "u1");

  const res1 = mockRes();
  requireAuth({ headers: {} }, res1, () => assert.fail("should not continue"));
  assert.equal(res1.code, 401);

  const res2 = mockRes();
  requireAuth({ headers: { authorization: "Bearer nope" } }, res2, () => assert.fail("should not continue"));
  assert.equal(res2.code, 401);
});

test("asyncHandler forwards rejected promises to next()", async () => {
  const boom = new Error("boom");
  const err = await new Promise((resolve) => asyncHandler(async () => { throw boom; })({}, {}, resolve));
  assert.equal(err, boom);
});
