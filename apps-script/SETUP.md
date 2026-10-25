# Enquiry form + thank-you email: setup

Flow: visitor submits the form on cephionix.com, then

1. the enquiry is emailed to **hello@cephionix.com** (Reply answers the visitor), and
2. the visitor gets a branded thank-you email **from noreply@cephionix.com**
   (replies go to hello@cephionix.com).

Runs on Google Apps Script owned by **hello@cephionix.com** (Google Workspace).
Free, no server. `noreply@` is an alternative email of the hello@ user, so Gmail
and Apps Script can send as it with no SMTP settings or passwords.

## Status

- Script pushed with clasp; its ID lives in `.clasp.json` (git-ignored).
- clasp uses a separate named login for this project (`--user hello`), so other
  Google accounts logged in to clasp are not affected.
- Update the live web app after editing `Code.gs`:

      clasp push -f --user hello
      clasp deploy -i <deploymentId> --user hello

  (`clasp deployments --user hello` lists the deployment ID. The web app URL
  stays the same.)

## One-time step only the owner can do

Open the script as **hello@cephionix.com**:
`https://script.google.com/d/<SCRIPT_ID>/edit`

1. Choose **checkSetup** in the function dropdown and click **Run**.
2. **Review permissions → Advanced → Go to (project) (unsafe) → Allow.**
   ("Unsafe" shows for every script you write yourself.)
3. Open **Executions** (left sidebar) or the log. It should say:
   `OK: confirmations will be sent from noreply@cephionix.com`.
4. Choose **testPreview** and **Run**. hello@cephionix.com receives the
   new-enquiry email and a sample thank-you from noreply@.

If step 3 says NOT READY, the `noreply` alternative email is missing or not saved:
Admin console → *Directory → Users → hello@ → Add alternative emails → noreply*.
It can take a few minutes to take effect.

Then the web app URL (opened in a browser) answers `{"ok":true,...}` and goes into
`ENQUIRY_ENDPOINT` in `app.js`, with the Privacy Policy updated at the same time.

## Strongly recommended: email authentication (DNS)

cephionix.com has Google Workspace MX records but **no SPF, DKIM or DMARC**.
Without them, mail from your domain (including these emails) is more likely to land
in spam. Add in Namecheap (*Advanced DNS*):

| Type | Host | Value |
| --- | --- | --- |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@cephionix.com` |

Then in the Workspace admin console: *Apps → Google Workspace → Gmail →
Authenticate email*, generate the DKIM key, add the TXT record it shows, and
click *Start authentication*. Because the script sends from your Workspace account,
mail is then signed by cephionix.com itself.

## What the emails look like

- **To you:** "New enquiry: Custom software, Alex Singh", a clean table of the
  details and a *Reply to Alex* button.
- **To the visitor:** "Thanks, Alex. We've got your message." with what they sent,
  what happens next, and a link to your work. A plain-text version is included.

Change wording, colours or the "1-2 working days" promise in `Code.gs`
(`replyHtml_`, `replyText_`, `CONFIG`).

## Built-in protection

- Hidden honeypot field and a minimum fill time catch most bots.
- One thank-you per email address every 6 hours (you are still notified).
- Site-wide limit of 40 enquiries per hour.
- Visitor text is HTML-escaped and line breaks are stripped from names, so it
  cannot inject markup or email headers.
- Messages with more than 3 links are dropped as spam.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Web app URL shows "Access denied" | Do the one-time authorization above, then retry. |
| Thank-you comes from hello@ instead of noreply@ | Run `checkSetup`; the alias is not active yet. |
| No emails arrive | Check Spam, and *Executions* in the script editor for errors. |
| "Service invoked too many times" | Daily mail quota reached. It resets within 24 hours (Workspace allows about 1,500/day). |
