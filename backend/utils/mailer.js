const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, text }) {
  if (!transporter) {
    // No SMTP configured (fine for local dev / demo) -- just log it.
    console.log(`\n[mailer] (SMTP not configured, logging instead)\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { logged: true };
  }
  return transporter.sendMail({
    from: process.env.MAIL_FROM || "Campus Lost & Found <no-reply@example.edu>",
    to,
    subject,
    text,
  });
}

module.exports = { sendMail };
