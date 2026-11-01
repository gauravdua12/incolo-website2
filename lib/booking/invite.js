'use strict';
/**
 * Calendar invitation sent FROM the organizer's own mailbox (success@incolosystems.com)
 * over SMTP, as an iCalendar METHOD:REQUEST. Gmail, Outlook and Apple Mail show it as a
 * real invite (Accept/Decline) and put it in the recipient's calendar. The UID matches the
 * Google Calendar event, so Google users see one event, not a duplicate.
 * Hidden copies (settings.bcc) are Bcc'd and left out of the ATTENDEE list.
 * Cancellations reuse the same UID with METHOD:CANCEL, which removes the event.
 */
const { label } = require('./time');

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Fold content lines at 75 octets (RFC 5545 §3.1), CRLF line endings. */
function fold(line) {
  const out = [];
  let buf = Buffer.from(line, 'utf8');
  let first = true;
  while (buf.length > (first ? 75 : 74)) {
    let n = first ? 75 : 74;
    while (n > 0 && (buf[n] & 0xc0) === 0x80) n--; // never split a UTF-8 character
    out.push((first ? '' : ' ') + buf.subarray(0, n).toString('utf8'));
    buf = buf.subarray(n);
    first = false;
  }
  out.push((first ? '' : ' ') + buf.toString('utf8'));
  return out.join('\r\n');
}

function buildIcs({ uid, start, end, summary, description, meetLink, organizer, attendees, sequence = 0, method = 'REQUEST' }) {
  const cancel = method === 'CANCEL';
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Incolo Systems//incolo.si booking//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SEQUENCE:${sequence}`,
    `STATUS:${cancel ? 'CANCELLED' : 'CONFIRMED'}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(meetLink)}`,
    `URL:${meetLink}`,
    `X-GOOGLE-CONFERENCE:${meetLink}`,
    `ORGANIZER;CN=${esc(organizer.name)}:mailto:${organizer.email}`,
    ...attendees.map((a) => `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=${a.email === organizer.email ? 'ACCEPTED' : 'NEEDS-ACTION'};RSVP=${a.email === organizer.email ? 'FALSE' : 'TRUE'}${a.name ? `;CN=${esc(a.name)}` : ''}:mailto:${a.email}`),
    ...(cancel ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'TRIGGER:-PT15M', 'END:VALARM']),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

const html = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** " · 10:00 CET your time" when the customer's timezone shows a different clock time. */
function yourTime({ startMs, tz }, orgTz) {
  if (!tz || label(startMs, tz, { withDate: false }).slice(0, 5) === label(startMs, orgTz, { withDate: false }).slice(0, 5)) return '';
  const sameDay = new Date(startMs).toLocaleDateString('en-CA', { timeZone: tz }) === new Date(startMs).toLocaleDateString('en-CA', { timeZone: orgTz });
  return ` · ${label(startMs, tz, { withDate: !sameDay })} your time`;
}

/** Plain-text + HTML bodies shown above the invite card. */
function bodies({ booking, settings, meetLink, summary }) {
  const when = `${label(booking.startMs, settings.timezone)}${yourTime(booking, settings.timezone)} (${settings.slotMinutes} min)`;
  const rows = [
    ['When', when],
    ['Join', meetLink],
    ['Name', `${booking.name}, ${booking.designation}`],
    ['Company', booking.company],
    ['Email', booking.email],
    ...(booking.phone ? [['Phone', booking.phone]] : []),
    ...(booking.program ? [['Program', booking.program]] : []),
    ['Challenge', booking.challenge],
  ];
  const text = `${summary}\n\n${settings.meetingNote ? settings.meetingNote + '\n\n' : ''}` +
    rows.map(([k, v]) => `${(k + ':').padEnd(11)}${v}`).join('\n') +
    `\n\nTo reschedule, reply to this email.\n\n${settings.organizerName}\nIncolo Systems · https://incolo.si\n`;
  const htmlBody = `<!doctype html><html><body style="margin:0;background:#f7fafd;font-family:Segoe UI,Arial,sans-serif;color:#0b2340">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e2ecf6;border-radius:12px">
<tr><td style="padding:28px 28px 8px"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1d65cc;font-weight:600">Scoping call confirmed</div>
<h1 style="font-size:22px;line-height:28px;font-weight:500;margin:10px 0 6px">${html(summary)}</h1>
<p style="margin:0 0 18px;color:#4f647c;font-size:15px">${html(when)}</p>
<a href="${html(meetLink)}" style="display:inline-block;background:#1d65cc;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:6px">Join with Google Meet</a>
<p style="margin:10px 0 0;font-size:13px;color:#8098b0">${html(meetLink)}</p></td></tr>
${settings.meetingNote ? `<tr><td style="padding:16px 28px 0;font-size:14px;line-height:21px;color:#4f647c">${html(settings.meetingNote)}</td></tr>` : ''}
<tr><td style="padding:18px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:20px">
${rows.filter(([k]) => k !== 'Join' && k !== 'When').map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#8098b0;width:96px;vertical-align:top">${html(k)}</td><td style="padding:6px 0;color:#14324f">${html(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:16px 28px 26px;font-size:13px;color:#8098b0;border-top:1px solid #e2ecf6"><span style="color:#14324f;font-weight:600">${html(settings.organizerName)}</span> · Incolo Systems<br>To reschedule, just reply to this email. · <a href="https://incolo.si" style="color:#1d65cc">incolo.si</a></td></tr>
</table></td></tr></table></body></html>`;
  return { text, html: htmlBody };
}

/** Assemble the nodemailer message (sent by the caller). */
function message({ booking, settings, event, summary, description }) {
  const organizer = { name: settings.organizerName, email: settings.organizerEmail };
  const attendees = [
    { name: booking.name, email: booking.email },
    ...settings.invitees.filter((e) => e !== booking.email).map((email) => ({ email })),
  ];
  const bcc = settings.bcc.filter((e) => e !== booking.email && e !== organizer.email);
  if (!attendees.some((a) => a.email === organizer.email)) attendees.push({ name: organizer.name, email: organizer.email });
  const ics = buildIcs({ uid: event.iCalUID, start: booking.startMs, end: booking.endMs, summary, description, meetLink: event.meetLink, organizer, attendees });
  const { text, html: htmlBody } = bodies({ booking, settings, meetLink: event.meetLink, summary });
  return {
    ics,
    attendees,
    bcc,
    mail: {
      from: { name: organizer.name, address: organizer.email },
      to: attendees.map((a) => (a.name ? { name: a.name, address: a.email } : a.email)),
      ...(bcc.length ? { bcc } : {}),
      replyTo: { name: organizer.name, address: organizer.email },
      subject: `Invitation: ${summary} · ${label(booking.startMs, settings.timezone)}`,
      text,
      html: htmlBody,
      icalEvent: { method: 'REQUEST', filename: 'invite.ics', content: ics },
    },
  };
}

/**
 * Cancellation for a stored booking: same UID, organizer and guest list as the invitation,
 * METHOD:CANCEL so calendars remove the event, and a short note for the customer.
 */
function cancelMessage({ record, settings, reason }) {
  const organizer = record.organizer || { name: settings.organizerName, email: settings.organizerEmail };
  const summary = record.summary || settings.meetingTitle.replace(/\{company\}/g, record.company).replace(/\{name\}/g, record.name);
  const startMs = Date.parse(record.start);
  const endMs = Date.parse(record.end);
  const attendees = (record.invitees && record.invitees.length ? record.invitees : [record.email, organizer.email])
    .map((email) => ({ email, name: email === record.email ? record.name : email === organizer.email ? organizer.name : undefined }));
  const bcc = (record.bcc || []).filter((e) => e !== record.email && e !== organizer.email);
  const when = `${label(startMs, settings.timezone)}`;
  const note = String(reason || '').trim();
  const ics = buildIcs({
    uid: record.iCalUID, start: startMs, end: endMs, summary,
    description: note || 'This meeting has been cancelled.', meetLink: record.meetLink,
    organizer, attendees, sequence: 1, method: 'CANCEL',
  });
  const rebook = 'https://incolo.si/contact';
  const text = `${summary}\n\nHi ${record.name},\n\nWe're sorry, we need to cancel your scoping call on ${when}.` +
    `${note ? `\n\n${note}` : ''}\n\nPlease pick a new time that suits you: ${rebook}\nOr simply reply to this email.\n\n` +
    `${organizer.name}\nIncolo Systems · https://incolo.si\n`;
  const htmlBody = `<!doctype html><html><body style="margin:0;background:#f7fafd;font-family:Segoe UI,Arial,sans-serif;color:#0b2340">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e2ecf6;border-radius:12px">
<tr><td style="padding:28px 28px 8px"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#c02b2b;font-weight:600">Scoping call cancelled</div>
<h1 style="font-size:22px;line-height:28px;font-weight:500;margin:10px 0 6px">${html(summary)}</h1>
<p style="margin:0 0 18px;color:#4f647c;font-size:15px;text-decoration:line-through">${html(when)}</p>
<p style="margin:0 0 14px;font-size:15px;line-height:23px;color:#14324f">Hi ${html(record.name)}, we're sorry, we need to cancel this call.</p>
${note ? `<p style="margin:0 0 14px;font-size:15px;line-height:23px;color:#4f647c">${html(note).replace(/\n/g, '<br>')}</p>` : ''}
<a href="${rebook}" style="display:inline-block;margin:6px 0 4px;background:#1d65cc;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:6px">Pick a new time</a></td></tr>
<tr><td style="padding:16px 28px 26px;font-size:13px;color:#8098b0;border-top:1px solid #e2ecf6"><span style="color:#14324f;font-weight:600">${html(organizer.name)}</span> · Incolo Systems<br>Or simply reply to this email. · <a href="https://incolo.si" style="color:#1d65cc">incolo.si</a></td></tr>
</table></td></tr></table></body></html>`;
  return {
    ics,
    mail: {
      from: { name: organizer.name, address: organizer.email },
      to: attendees.map((a) => (a.name ? { name: a.name, address: a.email } : a.email)),
      ...(bcc.length ? { bcc } : {}),
      replyTo: { name: organizer.name, address: organizer.email },
      subject: `Cancelled: ${summary} · ${when}`,
      text,
      html: htmlBody,
      icalEvent: { method: 'CANCEL', filename: 'cancel.ics', content: ics },
    },
  };
}

module.exports = { buildIcs, fold, message, cancelMessage };
