# Inbound form backend

The website's `/demo/` form posts to a Google Apps Script web app. The script:

1. appends each submission to a Google Sheet (tab `Leads`),
2. emails the details to `NOTIFY_TO` with reply-to set to the lead,
3. sends the lead a short confirmation (turn off with `SEND_CONFIRMATION = false`).

It runs under the Google account that deploys it, so mail comes from that account with the display name "Openbox".

## Set up (about 10 minutes)

1. Create a Google Sheet named **Openbox leads** while signed in to the account that should receive leads.
2. In the sheet: **Extensions → Apps Script**. Replace the editor contents with `Code.gs` from this folder and save.
3. In the script editor: **Project Settings → Script properties → Add**, name `NOTIFY_TO`, value the team inbox that should receive leads.
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Approve the permission prompts (send email, edit the sheet).
6. Copy the web app URL (`https://script.google.com/macros/s/…/exec`).
7. Paste it into `FORM_ENDPOINT` in `src/data/site.ts`, then rebuild and deploy the site.

If `FORM_ENDPOINT` is empty, the form shows an error instead of sending.

## Protections

- Required fields, an allowlist for interest and project count, and per-field length limits.
- Submissions filled in under 3 seconds and those with the hidden `website` field are dropped silently.
- Values starting with `=`, `+`, `-` or `@` are stored as text so they cannot run as spreadsheet formulas.
- Line breaks are stripped from single-line fields before they reach email headers.
- One notification and confirmation per email address every 6 hours; at most 200 leads and 50 confirmations per day.
- The confirmation text is fixed and never includes submitted content.

## Notes

- The site posts with `mode: "no-cors"`, so the browser cannot read the script's response. The form shows success once the request is sent. Check the sheet to confirm delivery.
- Google Workspace accounts can send about 1,500 emails a day through Apps Script, which is far above expected volume.
- After editing the script, use **Deploy → Manage deployments → Edit → New version**. The URL stays the same.
