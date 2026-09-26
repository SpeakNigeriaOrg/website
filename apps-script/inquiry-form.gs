/**
 * Speak Nigeria — courses page forms backend (Google Apps Script)
 *
 * Receives submissions from two forms on courses.html:
 *  - Class inquiry: one row per child in the "Inquiries" tab
 *  - Language interest (form=interest): one row in the "Language interest" tab
 * Each emails the team and sends the person a short confirmation.
 *
 * Setup: see apps-script/README.md. This file contains no secrets.
 */

// ---- Settings -------------------------------------------------------------
const NOTIFY_EMAIL = 'hello@speaknigeria.org';   // who hears about new inquiries
const SEND_CONFIRMATION = true;                  // email the family a receipt
const SHEET_NAME = 'Inquiries';
const INTEREST_SHEET_NAME = 'Language interest';

const HEADERS = [
  'Submitted', 'Inquiry ID', 'Status',
  'Parent/guardian', 'Email', 'Phone', 'Location',
  'Child', 'Age', 'Yorùbá level',
  'Membership interest', 'Hoping to start', 'Message',
];

const INTEREST_HEADERS = [
  'Submitted', 'Status', 'Name', 'Email',
  'Languages', 'Other language', 'Interested in', 'Message',
];

// ---- Web app entry points -------------------------------------------------
function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Spam traps: a hidden field only bots fill in, and a minimum fill time.
    const elapsed = Date.now() - Number(p.started || 0);
    if (p.website || !p.started || elapsed < 3000) return json({ ok: true });

    if (p.form === 'interest') return handleInterest(e);

    const parent = clean(p.parent_name, 120);
    const email = clean(p.email, 200);
    const location = clean(p.location, 200);
    if (!parent || !location || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, error: 'Please fill in the required fields.' });
    }

    const children = [];
    for (let i = 0; i < 6; i++) {
      const name = clean(p['child_name_' + i], 80);
      if (!name) continue;
      children.push({
        name,
        age: clean(p['child_age_' + i], 10),
        level: clean(p['child_level_' + i], 80),
      });
    }
    if (!children.length) {
      return json({ ok: false, error: 'Please tell us about at least one child.' });
    }

    const row = {
      phone: clean(p.phone, 40),
      membership: clean(p.membership, 80),
      start: clean(p.start, 80),
      message: clean(p.message, 2000),
    };
    const id = Utilities.getUuid().slice(0, 8).toUpperCase();
    const now = new Date();

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet(SHEET_NAME, HEADERS);
      children.forEach(c => sheet.appendRow([
        now, id, 'New',
        parent, email, row.phone, location,
        c.name, c.age, c.level,
        row.membership, row.start, row.message,
      ]));
    } finally {
      lock.releaseLock();
    }

    // The row is saved; don't report failure to the family if email fails
    // (e.g. the daily email quota is used up).
    try {
      notifyTeam(id, parent, email, location, children, row);
      if (SEND_CONFIRMATION) confirmFamily(parent, email, children);
    } catch (mailErr) {
      console.error('Email failed for inquiry ' + id, mailErr);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Something went wrong. Please email us instead.' });
  }
}

// Language interest form: one row per submission.
function handleInterest(e) {
  const p = e.parameter;
  const all = e.parameters || {};   // checkbox groups arrive as arrays here

  const name = clean(p.name, 120);
  const email = clean(p.email, 200);
  const languages = (all.languages || []).map(v => clean(v, 40)).join(', ');
  const other = clean(p.other_language, 100);
  const interests = (all.interests || []).map(v => clean(v, 60)).join(', ');
  const message = clean(p.message, 2000);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !(languages || other) || !interests) {
    return json({ ok: false, error: 'Please fill in the required fields.' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet(INTEREST_SHEET_NAME, INTEREST_HEADERS)
      .appendRow([new Date(), 'New', name, email, languages, other, interests, message]);
  } finally {
    lock.releaseLock();
  }

  const langList = [languages, other].filter(Boolean).join(', ');
  try {
    sendMail({
      to: NOTIFY_EMAIL,
      replyTo: email,
      subject: `Language interest: ${langList} (${name})`,
      body: [
        'New language interest',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Languages: ${langList}`,
        `Interested in: ${interests}`,
        '',
        'Message:',
        message || '—',
        '',
        `Sheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`,
      ].join('\n'),
    });
    if (SEND_CONFIRMATION) {
      sendMail({
        to: email,
        replyTo: NOTIFY_EMAIL,
        name: 'Speak Nigeria',
        subject: 'Thanks for your interest in Speak Nigeria',
        body: [
          `Hi ${name},`,
          '',
          `Thank you for letting us know you're interested in ${langList}. Hearing from families and speakers like you helps us decide which language to build next, and we'll be in touch when there's news.`,
          '',
          'If you have any questions in the meantime, just reply to this email.',
          '',
          'Warm regards,',
          'The Speak Nigeria team',
          'speaknigeria.org',
        ].join('\n'),
      });
    }
  } catch (mailErr) {
    console.error('Email failed for language interest from ' + email, mailErr);
  }

  return json({ ok: true });
}

function doGet() {
  return json({ ok: true, service: 'Speak Nigeria inquiry form' });
}

// ---- Helpers --------------------------------------------------------------
function getSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// Trim, cap length, and stop spreadsheet formula injection (=, +, -, @).
function clean(value, max) {
  let s = String(value || '').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

// Send plain text plus an HTML version, so paragraphs wrap to the reader's
// screen instead of being hard-wrapped at ~76 characters. Blank lines in the
// plain text separate paragraphs.
function sendMail(opts) {
  MailApp.sendEmail(Object.assign({}, opts, { htmlBody: toHtml(opts.body) }));
}

function toHtml(text) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paras = text.split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 1em">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#241F1C;max-width:600px">${paras}</div>`;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function notifyTeam(id, parent, email, location, children, row) {
  const kids = children
    .map(c => `  • ${c.name}, age ${c.age} — ${c.level}`)
    .join('\n');
  const body = [
    `New class inquiry (${id})`,
    '',
    `Parent/guardian: ${parent}`,
    `Email: ${email}`,
    `Phone: ${row.phone || '—'}`,
    `Location: ${location}`,
    '',
    'Children:',
    kids,
    '',
    `Membership interest: ${row.membership || '—'}`,
    `Hoping to start: ${row.start || '—'}`,
    '',
    'Message:',
    row.message || '—',
    '',
    `Sheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`,
  ].join('\n');

  sendMail({
    to: NOTIFY_EMAIL,
    replyTo: email,
    subject: `Class inquiry: ${parent} (${children.length} ${children.length === 1 ? 'child' : 'children'})`,
    body,
  });
}

function confirmFamily(parent, email, children) {
  const names = children.map(c => c.name).join(', ');
  const body = [
    `Hi ${parent},`,
    '',
    `Thank you for your interest in Speak Nigeria's Yorùbá classes for ${names}.`,
    '',
    "We group children into small cohorts by age and level, so a member of our team will be in touch to confirm the right class and start date. Please hold off on starting a membership until we've confirmed your child's start date.",
    '',
    'If you have any questions in the meantime, just reply to this email.',
    '',
    'Ẹ ṣeun,',
    'The Speak Nigeria team',
    'speaknigeria.org',
  ].join('\n');

  sendMail({
    to: email,
    replyTo: NOTIFY_EMAIL,
    name: 'Speak Nigeria',
    subject: 'We received your class inquiry',
    body,
  });
}
