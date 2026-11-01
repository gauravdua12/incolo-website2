'use strict';
/**
 * Sends booking emails (invitations and cancellations) through the site's SMTP transport.
 * In dry-run without SMTP, the message is written to outbox/<name>.eml for inspection.
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const google = require('./google');

/** @returns async (mail, name) => void, or null when email can't be sent at all. */
function makeMailer(transporter) {
  const dryRun = google.mode() === 'dry-run';
  const outboxDir = process.env.BOOKING_OUTBOX || path.join(__dirname, '..', '..', 'outbox');
  const t = transporter || (dryRun ? nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' }) : null);
  if (!t) return null;
  return async (mail, name) => {
    const info = await t.sendMail(mail);
    if (info.message && !transporter) {
      fs.mkdirSync(outboxDir, { recursive: true });
      fs.writeFileSync(path.join(outboxDir, `${name.replace(/[^\w@.+-]/g, '-')}.eml`), info.message);
    }
  };
}

module.exports = { makeMailer };
