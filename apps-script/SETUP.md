# Enquiry form + thank-you email: setup

Flow: visitor submits the form on cephionix.com, then

1. the enquiry is emailed to **hello@cephionix.com** (Reply answers the visitor), and
2. the visitor gets a branded thank-you email **from noreply@cephionix.com**
   (replies go to hello@cephionix.com).

Runs on Google Apps Script under **cephionix@gmail.com**. Free, no server.

## Status

- Script pushed with clasp (script ID in `.clasp.json`, which is git-ignored).
- Web app deployed (version 1). Update it any time with:
  `clasp push -f --user cephionix && clasp deploy -i <deploymentId> --user cephionix`
- clasp has a separate named login for this project (`--user cephionix`), so other
  Google accounts logged in to clasp are not affected.

## Steps only you can do (about 10 minutes)

### 1. Authorize the script (once)

Open the script, signed in as **cephionix@gmail.com**:
`https://script.google.com/d/<SCRIPT_ID>/edit`

Choose **checkSetup** in the function dropdown, click **Run**, then
**Review permissions → Advanced → Go to (project) (unsafe) → Allow**.
("Unsafe" shows for every script you write yourself.)

The log shows whether the noreply address is ready (step 2).

### 2. Let Gmail send as noreply@cephionix.com

1. Make sure mail to **noreply@cephionix.com** reaches you. In the Google Workspace
   admin console: *Directory → Users → hello@cephionix.com → Add alternate email
   address → noreply*. (Gmail sends a verification message to that address.)
2. In the **cephionix@gmail.com** Gmail: gear icon → *See all settings →
   Accounts and Import → Send mail as → Add another email address*.
3. Name: **Cephionix**. Email: **noreply@cephionix.com**. Keep *Treat as an alias* ticked.
   Next, then *Send verification*.
4. Open the verification email in hello@cephionix.com and click the link.

Until this is done the thank-you email still goes out, but from cephionix@gmail.com.

### 3. Send yourself the two sample emails

Run **testPreview** in the editor. hello@cephionix.com receives the new-enquiry
email and a sample thank-you (sent from noreply@ once step 2 is done).

### 4. Tell the developer to switch the website form on

Once the web app URL answers (it returns `{"ok":true,...}` when opened in a
browser), it goes into `ENQUIRY_ENDPOINT` in `app.js` and the Privacy Policy is
updated at the same time.

## Strongly recommended: email authentication (DNS)

cephionix.com currently has Google Workspace MX records but **no SPF, DKIM or
DMARC**. Without them, mail from your domain (including these emails) is more
likely to land in spam. Add in Namecheap (*Advanced DNS*):

| Type | Host | Value |
| --- | --- | --- |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@cephionix.com` |

Then in the Workspace admin console: *Apps → Google Workspace → Gmail →
Authenticate email*, generate the DKIM key, add the TXT record it shows, and
click *Start authentication*.

Note: mail sent through a personal Gmail "Send mail as" is signed by gmail.com,
so it may show "via gmail.com" in some inboxes. For fully aligned sending, deploy
the same script from a Workspace account on cephionix.com instead.

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
| Web app URL shows "Access denied" | Do step 1 (authorize), then redeploy and retry. |
| Thank-you comes from cephionix@gmail.com | Step 2 is not finished. Run `checkSetup` to see the aliases Gmail knows. |
| No emails arrive | Check Spam, and *Executions* in the script editor for errors. |
| "Service invoked too many times" | Daily mail quota reached (about 100/day on personal Gmail). It resets within 24 hours. |
