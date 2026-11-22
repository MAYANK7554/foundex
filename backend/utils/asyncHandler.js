// Express 4 doesn't catch rejected promises from async handlers -- the
// request would just hang. This forwards them to the error middleware.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
