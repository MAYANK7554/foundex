const test = require("node:test");
const assert = require("node:assert/strict");

test("sendMail logs instead of throwing when SMTP isn't configured", async () => {
  delete process.env.SMTP_HOST;
  const { sendMail } = require("../utils/mailer");
  const orig = console.log;
  console.log = () => {};
  try {
    assert.deepEqual(await sendMail({ to: "a@b.c", subject: "s", text: "t" }), { logged: true });
  } finally {
    console.log = orig;
  }
});
