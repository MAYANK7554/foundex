// Photos arrive from the browser as compressed base64 data URLs.
const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function parsePhotoDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) return null;
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) return null;
  return { contentType: m[1], buffer };
}

module.exports = { parsePhotoDataUrl, MAX_PHOTO_BYTES };
