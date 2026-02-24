/**
 * Soft lock: record attempt number but never reject.
 * Sheet: 'Submissions' with headers:
 * timestamp | email | attempt | violations | timeRemainingSec | responses
 */
const SHEET_NAME = 'Submissions';

function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const sh = getSheet_();
  const email = String(p.email || '').trim().toLowerCase();

  const attempt = countAttempts_(email) + 1;
  sh.appendRow([
    new Date(),
    email,
    attempt,
    Number(p.violations || 0),
    Number(p.timeRemainingSec || 0),
    String(p.responses || '{}')
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true, attempt }))
          .setMimeType(ContentService.MimeType.JSON);
}

function countAttempts_(email) {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const emails = sh.getRange(2, 2, last - 1, 1).getValues()
    .flat()
    .map(v => String(v).trim().toLowerCase());
  return emails.filter(e => e === email).length;
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['timestamp','email','attempt','violations','timeRemainingSec','responses']);
  }
  return sh;
}
