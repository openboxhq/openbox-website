/**
 * Openbox inbound form handler (Google Apps Script web app).
 *
 * Receives POSTs from the website's /demo/ form, appends each lead to the
 * bound Google Sheet, emails the details to NOTIFY_TO, and sends the lead a
 * short confirmation. The endpoint is public, so every input is validated,
 * neutralised for the sheet and rate limited before any email is sent.
 */

/** Team inbox for new leads, stored as the script property NOTIFY_TO so it stays out of source control. */
const NOTIFY_TO = PropertiesService.getScriptProperties().getProperty("NOTIFY_TO") || "";
const SENDER_NAME = "Openbox";
const SEND_CONFIRMATION = true;
const SHEET_NAME = "Leads";
const FIELDS = ["submittedAt", "interest", "name", "email", "company", "role", "projects", "message", "page"];

const MAX_LENGTH = { name: 120, email: 254, company: 160, role: 120, message: 2000, page: 300, submittedAt: 40, interest: 20, projects: 10 };
const ALLOWED_INTEREST = ["both", "twin", "watch", "portfolio", "company"];
const ALLOWED_PROJECTS = ["1", "2–5", "6–20", "20+"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SINGLE_LINE_FIELDS = ["name", "email", "company", "role", "interest", "projects", "page", "submittedAt"];

const MIN_FILL_MS = 3000;
const SAME_EMAIL_WINDOW_S = 6 * 60 * 60;
const DAILY_LEAD_CAP = 200;
const DAILY_CONFIRMATION_CAP = 50;
const LOCK_WAIT_MS = 10000;

const INTEREST_LABEL = {
  both: "Openbox (Twin + Watch)",
  twin: "Twin",
  watch: "Watch",
  portfolio: "Portfolio",
  company: "Company enquiry",
};

function doPost(e) {
  const params = (e && e.parameter) || {};
  if (params.website) return respond({ ok: true });
  if (!(Number(params.elapsedMs) >= MIN_FILL_MS)) return respond({ ok: true });

  const lead = cleanLead(params);
  const problem = validate(lead);
  if (problem) return respond({ ok: false, error: problem });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return respond({ ok: false, error: "busy" });
  try {
    if (!takeDailyQuota("leads", DAILY_LEAD_CAP)) return respond({ ok: false, error: "rate limited" });
    const repeat = isRepeat(lead.email);
    appendLead(lead);
    if (repeat) return respond({ ok: true });
    notifyTeam(lead);
    if (SEND_CONFIRMATION && takeDailyQuota("confirmations", DAILY_CONFIRMATION_CAP)) confirmToLead(lead);
    return respond({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function cleanLead(params) {
  const lead = {};
  FIELDS.forEach((key) => {
    let value = String(params[key] || "").trim().slice(0, MAX_LENGTH[key] || 200);
    if (SINGLE_LINE_FIELDS.indexOf(key) >= 0) value = value.replace(/[\r\n\t]+/g, " ");
    lead[key] = value;
  });
  lead.email = lead.email.toLowerCase();
  return lead;
}

function validate(lead) {
  if (!lead.name || !lead.company) return "missing fields";
  if (!EMAIL_RE.test(lead.email)) return "invalid email";
  if (ALLOWED_INTEREST.indexOf(lead.interest) < 0) return "invalid interest";
  if (lead.projects && ALLOWED_PROJECTS.indexOf(lead.projects) < 0) return "invalid projects";
  return "";
}

/** Blocks the same email from triggering emails more than once per window. */
function isRepeat(email) {
  const cache = CacheService.getScriptCache();
  const key = "seen:" + Utilities.base64EncodeWebSafe(email).slice(0, 200);
  if (cache.get(key)) return true;
  cache.put(key, "1", SAME_EMAIL_WINDOW_S);
  return false;
}

/** Counts events per UTC day in script properties; returns false once the cap is reached. */
function takeDailyQuota(name, cap) {
  const props = PropertiesService.getScriptProperties();
  const key = "quota:" + name + ":" + new Date().toISOString().slice(0, 10);
  const used = Number(props.getProperty(key) || 0);
  if (used >= cap) return false;
  props.setProperty(key, String(used + 1));
  return true;
}

/** Prevents spreadsheet formula injection by forcing text for risky leading characters. */
function asText(value) {
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function appendLead(lead) {
  getSheet().appendRow(FIELDS.map((key) => asText(lead[key])));
}

function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(FIELDS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function notifyTeam(lead) {
  const interest = INTEREST_LABEL[lead.interest];
  const subject = `Openbox lead: ${lead.company} — ${interest}`;
  const body = [
    `Interest: ${interest}`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Company: ${lead.company}`,
    `Role: ${lead.role || "-"}`,
    `Active projects: ${lead.projects || "-"}`,
    "",
    lead.message || "(no message)",
    "",
    `Page: ${lead.page}`,
    `Submitted: ${lead.submittedAt}`,
  ].join("\n");
  if (!NOTIFY_TO) return;
  MailApp.sendEmail({ to: NOTIFY_TO, subject, body, replyTo: lead.email, name: SENDER_NAME });
}

/** Fixed text only: the lead's own input never appears in this email, so it cannot be used to spam others. */
function confirmToLead(lead) {
  const body = [
    "Hi,",
    "",
    "Thanks for your interest in Openbox. We have your details and will reply within one business day to set up a 30-minute call.",
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "The Openbox team",
  ].join("\n");
  MailApp.sendEmail({ to: lead.email, subject: "Thanks for contacting Openbox", body, name: SENDER_NAME });
}

function respond(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
