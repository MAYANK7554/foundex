const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePhotoDataUrl, MAX_PHOTO_BYTES } = require("../utils/photo");

test("parses a valid image data URL", () => {
  const p = parsePhotoDataUrl(`data:image/jpeg;base64,${Buffer.from("hello").toString("base64")}`);
  assert.equal(p.contentType, "image/jpeg");
  assert.equal(p.buffer.toString(), "hello");
});

test("rejects non-images, junk and oversized photos", () => {
  assert.equal(parsePhotoDataUrl("data:text/html;base64,PGgxPg=="), null);
  assert.equal(parsePhotoDataUrl("https://example.com/a.jpg"), null);
  assert.equal(parsePhotoDataUrl(null), null);
  const big = Buffer.alloc(MAX_PHOTO_BYTES + 1).toString("base64");
  assert.equal(parsePhotoDataUrl(`data:image/png;base64,${big}`), null);
});
