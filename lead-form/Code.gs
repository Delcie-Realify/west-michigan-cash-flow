/**
 * Realify "Talk to Delcie" lead form — Google Apps Script web app
 * ================================================================
 * What it does when someone sends the website form:
 *   1. Checks the answers (name, valid email, etc.) and quietly drops spam.
 *   2. Adds a row to the "Leads" tab of the Google Sheet this script is attached to.
 *   3. Emails Delcie a nicely formatted notification (reply goes straight to the visitor).
 *   4. Sends a small "ok" / "error" reply back to the website.
 *
 * Setup instructions: see SETUP.md in this folder.
 * The only line you MUST change is NOTIFY_EMAIL below.
 */

var CONFIG = {
  NOTIFY_EMAIL: 'YOUR-EMAIL-HERE',      // <-- where lead emails go, e.g. 'you@yourdomain.com'
  SHEET_NAME: 'Leads',                  // tab name inside the Google Sheet (created automatically)
  SUBJECT_PREFIX: 'New investor lead',  // email subject starts with this
  MIN_SECONDS_ON_PAGE: 3                // forms sent faster than this are treated as bots
};

var COLUMNS = [
  'Timestamp', 'Name', 'Email', 'Phone', 'Investor type', 'Budget', 'Timeline',
  'Message', 'Property ID', 'Property address', 'Page URL'
];

var INVESTOR_TYPES = { 'first-time': 'First-time investor', 'experienced': 'Experienced investor', 'out-of-state': 'Out-of-state investor' };

/** The website sends the form here (HTTP POST). */
function doPost(e) {
  try {
    var data = readBody_(e);

    // Spam trap 1: a hidden "website" box only bots fill in. Pretend success, save nothing.
    if (data.website) return json_({ ok: true });
    // Spam trap 2: real people take more than a few seconds to fill in a form.
    var elapsed = Number(data.elapsedMs);
    if (isFinite(elapsed) && elapsed > 0 && elapsed < CONFIG.MIN_SECONDS_ON_PAGE * 1000) return json_({ ok: true });

    var lead = clean_(data);
    var errors = validate_(lead);
    if (errors.length) return json_({ ok: false, error: errors.join(' ') });

    // Only one submission writes at a time (avoids two leads landing on the same row).
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet_().appendRow([
        new Date(), lead.name, lead.email, lead.phone, INVESTOR_TYPES[lead.investorType] || lead.investorType,
        lead.budget, lead.timeline, lead.message, lead.propertyId, lead.propertyAddress, lead.pageUrl
      ].map(safeCell_));
    } finally {
      lock.releaseLock();
    }

    notify_(lead);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Something went wrong on our side. Please try again or contact Delcie directly.' });
  }
}

/** Visiting the web app URL in a browser shows this — handy to check it's live. */
function doGet() {
  return json_({ ok: true, message: 'Realify lead form is running. Submissions must be sent by POST from the website.' });
}

/* ------------------------------------------------------------------ */

// Accepts JSON sent as text/plain (the website's default) OR normal form fields
// (URL-encoded / hidden-iframe posts).
function readBody_(e) {
  var out = {};
  if (e && e.postData && e.postData.contents) {
    try { out = JSON.parse(e.postData.contents); } catch (ignore) { out = {}; }
  }
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (k) { if (out[k] === undefined) out[k] = e.parameter[k]; });
  }
  return out;
}

function str_(v, max) { return String(v == null ? '' : v).replace(/\s+$/, '').replace(/^\s+/, '').slice(0, max || 500); }

function clean_(d) {
  return {
    name: str_(d.name, 120),
    email: str_(d.email, 200).toLowerCase(),
    phone: str_(d.phone, 40),
    investorType: str_(d.investorType, 40),
    budget: str_(d.budget, 60),
    timeline: str_(d.timeline, 60),
    message: str_(d.message, 4000),
    propertyId: str_(d.propertyId, 80),
    propertyAddress: str_(d.propertyAddress, 300),
    pageUrl: str_(d.pageUrl, 500)
  };
}

function validate_(l) {
  var errs = [];
  if (l.name.length < 2) errs.push('Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(l.email)) errs.push('Please enter a valid email address.');
  if (l.phone && l.phone.replace(/\D/g, '').length < 10) errs.push('Please enter a 10-digit phone number.');
  if (!l.investorType) errs.push('Please tell us what kind of investor you are.');
  return errs;
}

// Stops spreadsheet "formula injection": a value starting with = + - @ is stored as text.
function safeCell_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNS);
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#1E1E1E').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function notify_(l) {
  if (!CONFIG.NOTIFY_EMAIL || CONFIG.NOTIFY_EMAIL === 'YOUR-EMAIL-HERE') {
    console.warn('NOTIFY_EMAIL is not set — lead saved to the sheet but no email sent.');
    return;
  }
  var rows = [
    ['Name', l.name], ['Email', l.email], ['Phone', l.phone || '—'],
    ['Investor type', INVESTOR_TYPES[l.investorType] || l.investorType], ['Budget', l.budget || '—'], ['Timeline', l.timeline || '—'],
    ['Property', l.propertyAddress || '—'], ['Page', l.pageUrl || '—']
  ];
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#333">' +
      '<div style="background:#1E1E1E;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0">' +
        '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#FF4D85">Realify Investor Site</div>' +
        '<div style="font-size:20px;font-weight:bold;margin-top:4px">New lead: ' + esc_(l.name) + '</div>' +
      '</div>' +
      '<div style="border:1px solid #E4E7EC;border-top:0;padding:18px 22px;border-radius:0 0 10px 10px">' +
        '<table style="border-collapse:collapse;width:100%;font-size:14px">' +
          rows.map(function (r) {
            return '<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top">' + esc_(r[0]) +
              '</td><td style="padding:6px 0;color:#1E1E1E">' + esc_(r[1]) + '</td></tr>';
          }).join('') +
        '</table>' +
        (l.message ? '<div style="margin-top:14px;padding:12px 14px;background:#F3F5F8;border-left:3px solid #ED135A;border-radius:6px;white-space:pre-wrap;font-size:14px">' + esc_(l.message) + '</div>' : '') +
        '<p style="margin-top:18px;font-size:13px;color:#666">Hit “Reply” to answer ' + esc_(l.name) + ' directly. This lead is also saved in your Leads sheet.</p>' +
      '</div>' +
    '</div>';
  var subject = CONFIG.SUBJECT_PREFIX + ': ' + l.name + (l.propertyAddress ? ' — ' + l.propertyAddress : '');
  MailApp.sendEmail({
    to: CONFIG.NOTIFY_EMAIL,
    replyTo: l.email,
    subject: subject.slice(0, 200),
    htmlBody: html,
    body: rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') + (l.message ? '\n\nMessage:\n' + l.message : ''),
    name: 'Realify Investor Site'
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Optional: run this once from the Apps Script editor to test the sheet + email without the website. */
function testSubmission() {
  var fake = { postData: { contents: JSON.stringify({
    name: 'Test Person', email: 'test@example.com', phone: '616-555-0100', investorType: 'first-time',
    budget: '$150k – $250k', timeline: '3–6 months', message: 'This is a test lead.',
    propertyId: 'TEST-1', propertyAddress: '123 Example St, Grand Rapids, MI', pageUrl: 'https://example.com', elapsedMs: 10000
  }) } };
  Logger.log(doPost(fake).getContent());
}
