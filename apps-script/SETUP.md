# Enquiry form + automatic reply: setup (about 10 minutes)

This makes the contact form on cephionix.com send the enquiry straight to
**hello@cephionix.com** and send the visitor a branded confirmation email.
It runs on Google Apps Script, so it is free and needs no server.

## 1. Pick the sending account

Sign in to Google as **hello@cephionix.com** (your Google Workspace mailbox).
Emails will be sent *from that account*, which keeps the confirmation looking
like it comes from your company and passes spam checks.

> Using a personal Gmail instead? It works, but confirmations will come from
> that Gmail address, and the daily send limit is lower (about 100 vs 1,500).

## 2. Create the script

1. Go to **https://script.google.com** and click **New project**.
2. Click the project name at the top and rename it **Cephionix Enquiry**.
3. Delete everything in the editor, then paste the whole contents of
   `apps-script/Code.gs` from this repo.
4. Click **Save** (disk icon).

## 3. Test the emails (and grant permission)

1. In the function dropdown at the top, choose **testPreview**, then click **Run**.
2. Google asks for permission: **Review permissions → choose the account →
   Advanced → Go to Cephionix Enquiry (unsafe) → Allow**.
   (The "unsafe" wording appears for every script you write yourself.)
3. Check the hello@cephionix.com inbox. You should see two emails:
   the **new enquiry** notification and the **confirmation** a visitor receives.

## 4. Publish it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** Enquiry form
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

## 5. Connect the website

Send the Web app URL to your developer (or paste it into `ENQUIRY_ENDPOINT`
at the bottom of `app.js`). The site then:

- shows **Send enquiry** instead of "Prepare your enquiry"
- sends the form to your script
- shows a thank-you message to the visitor
- updates the Privacy Policy to describe the new flow

Until the URL is added, the form keeps working the old way (it opens the
visitor's email app).

## What the emails look like

- **To you:** "New enquiry: Custom software, Alex Singh". The *Reply* button
  answers the visitor directly.
- **To the visitor:** "Thanks, Alex. We've got your message." with a summary of
  what they sent, what happens next, and a link to your work.

Edit the wording, colours or the "1-2 working days" promise in `Code.gs`
(`replyHtml_` and `replyText_`).

## Built-in protection

- Hidden honeypot field and a minimum fill time catch most bots.
- Only one confirmation per email address every 6 hours (you are still notified).
- Site-wide limit of 40 enquiries per hour.
- Visitor text is HTML-escaped and line breaks are stripped from names, so it
  cannot inject markup or email headers.
- Messages with more than 3 links are dropped as spam.

## Changing things later

After editing `Code.gs`, redeploy: **Deploy → Manage deployments → pencil icon →
Version: New version → Deploy**. The URL stays the same.

To switch the confirmation email off, set `AUTO_REPLY: false`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "We couldn't send that just now" on the site | Check *Who has access* is **Anyone**, and that you redeployed after editing. |
| No emails arrive | Run `testPreview` again and check Spam. Look at **Executions** in the left sidebar for errors. |
| Confirmation goes to Spam | Deploy from the hello@cephionix.com Workspace account, not a personal Gmail. |
| "Service invoked too many times" | You hit the daily email quota. It resets within 24 hours. |
