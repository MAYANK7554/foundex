const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Never throws: an email failing to send must not fail the request that
// triggered it (the DB change has already happened by then).
async function sendMail({ to, subject, text }) {
  if (!transporter) {
    // No SMTP configured (fine for local dev / demo) -- just log it.
    console.log(`\n[mailer] (SMTP not configured, logging instead)\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { logged: true };
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "Campus Lost & Found <no-reply@example.edu>",
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[mailer] failed to send "${subject}" to ${to}: ${err.message}`);
    return { error: err.message };
  }
}

module.exports = { sendMail };
