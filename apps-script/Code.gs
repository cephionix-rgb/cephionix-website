/**
 * Cephionix: website enquiry handler (Google Apps Script web app)
 *
 * What it does
 *  1. Receives the enquiry form from https://www.cephionix.com
 *  2. Emails the enquiry to OWNER_EMAIL (Reply goes straight to the visitor)
 *  3. Sends the visitor a branded confirmation email (auto-reply)
 *
 * Setup steps are in SETUP.md. Deploy this from the Google account that should
 * send the emails (ideally hello@cephionix.com).
 */

const CONFIG = {
  OWNER_EMAIL: 'hello@cephionix.com',   // where enquiries are delivered
  FROM_NAME: 'Cephionix',               // sender name shown to visitors
  FROM_ALIAS: 'noreply@cephionix.com',  // the thank-you email is sent from this address (needs Gmail "Send mail as", see SETUP.md)
  REPLY_TO: 'hello@cephionix.com',      // replies to the thank-you email land here
  SITE_URL: 'https://www.cephionix.com',
  LOGO_URL: 'https://www.cephionix.com/assets/email-logo.png',
  AUTO_REPLY: true,                     // set false to switch the confirmation email off
  REPLY_COOLDOWN_SECONDS: 6 * 60 * 60,  // one confirmation per address per 6 hours (max the cache allows)
  MAX_PER_HOUR: 40,                     // site-wide ceiling to stop floods
  MIN_FILL_SECONDS: 3,                  // bots submit instantly; humans don't
  TIMEZONE: 'Asia/Kolkata',
  INTERESTS: [
    'Custom software', 'CRM development', 'Web & mobile', 'Intelligent systems',
    'NeuralWings', 'EarnWings', 'NavCalc launch updates'
  ]
};

const BRAND = { navy: '#071936', blue: '#064bff', paper: '#f6f5ef', line: '#e3e1d8', muted: '#5d6b82' };

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doGet() {
  return json_({ ok: true, service: 'cephionix-enquiry' });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Honeypot: real visitors never see or fill this field.
    if (p.website) return json_({ ok: true });

    // Too fast to be a person.
    const started = Number(p.ts);
    const now = Date.now();
    if (started && started < now && now - started < 6 * 60 * 60 * 1000 &&
        now - started < CONFIG.MIN_FILL_SECONDS * 1000) {
      return json_({ ok: true });
    }

    const lead = clean_(p);
    const problem = validate_(lead);
    if (problem) return json_({ ok: false, error: problem });

    if (looksLikeSpam_(lead)) return json_({ ok: true });
    if (!underHourlyLimit_()) return json_({ ok: false, error: 'busy' });

    notifyOwner_(lead);
    if (CONFIG.AUTO_REPLY && !repliedRecently_(lead.email)) sendAutoReply_(lead);

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

/* ------------------------------------------------------------------ */
/* Input handling                                                      */
/* ------------------------------------------------------------------ */

function clean_(p) {
  const strip = function (s, max) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, max);
  };
  const oneLine = function (s, max) { return strip(s, max).replace(/[\r\n\t]+/g, ' '); };
  const interest = oneLine(p.interest, 60);
  return {
    name: oneLine(p.name, 100),
    email: oneLine(p.email, 254).toLowerCase(),
    interest: CONFIG.INTERESTS.indexOf(interest) !== -1 ? interest : 'Other',
    message: strip(p.message, 4000)
  };
}

function validate_(lead) {
  if (!lead.name) return 'name';
  if (!/^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/.test(lead.email)) return 'email';
  if (!lead.message) return 'message';
  return '';
}

function looksLikeSpam_(lead) {
  const links = (lead.message.match(/https?:\/\//gi) || []).length;
  return links > 3;
}

function underHourlyLimit_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const cache = CacheService.getScriptCache();
    const key = 'hour_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
    const count = Number(cache.get(key) || 0);
    if (count >= CONFIG.MAX_PER_HOUR) return false;
    cache.put(key, String(count + 1), 3700);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function repliedRecently_(email) {
  const cache = CacheService.getScriptCache();
  const key = 'reply_' + Utilities.base64EncodeWebSafe(email).slice(0, 80);
  if (cache.get(key)) return true;
  cache.put(key, '1', Math.min(CONFIG.REPLY_COOLDOWN_SECONDS, 21600));
  return false;
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

function notifyOwner_(lead) {
  const received = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd MMM yyyy, HH:mm') + ' IST';
  send_({
    to: CONFIG.OWNER_EMAIL,
    subject: 'New enquiry: ' + lead.interest + ', ' + lead.name,
    body: ownerText_(lead, received),
    htmlBody: ownerHtml_(lead, received),
    name: CONFIG.FROM_NAME + ' website',
    replyTo: lead.email
  });
}

function sendAutoReply_(lead) {
  send_({
    to: lead.email,
    subject: 'We’ve received your enquiry | Cephionix',
    body: replyText_(lead),
    htmlBody: replyHtml_(lead),
    name: CONFIG.FROM_NAME,
    replyTo: CONFIG.REPLY_TO,
    fromAlias: CONFIG.FROM_ALIAS
  });
}

/**
 * Sends an email. With fromAlias set (and verified in Gmail > Settings > Accounts >
 * "Send mail as") the message goes out from that address; otherwise it falls back to
 * the account that owns this script, so an enquiry is never lost.
 */
function send_(o) {
  const aliases = o.fromAlias ? GmailApp.getAliases() : [];
  if (o.fromAlias && aliases.indexOf(o.fromAlias) !== -1) {
    GmailApp.sendEmail(o.to, o.subject, o.body, {
      htmlBody: o.htmlBody, name: o.name, replyTo: o.replyTo, from: o.fromAlias
    });
    return;
  }
  if (o.fromAlias) console.warn('Alias ' + o.fromAlias + ' is not set up in Gmail "Send mail as"; sending from the script owner instead.');
  MailApp.sendEmail({ to: o.to, subject: o.subject, body: o.body, htmlBody: o.htmlBody, name: o.name, replyTo: o.replyTo });
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function replyHtml_(lead) {
  const first = esc_(firstName_(lead.name));
  const body =
    eyebrow_('Message received') +
    '<h1 style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:32px;line-height:1.15;font-weight:700;letter-spacing:-0.5px;color:' + BRAND.navy + ';">Thanks, ' + first + '.<br>We’ve got your message.</h1>' +
    para_('Your enquiry about <strong style="color:' + BRAND.navy + ';">' + esc_(lead.interest) + '</strong> is with the Cephionix team. We read every message ourselves and will reply within <strong style="color:' + BRAND.navy + ';">1–2 working days</strong>.', '22px 0 0') +

    // Summary card
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:' + BRAND.paper + ';border-radius:16px;">' +
      '<tr><td style="padding:22px 24px;">' +
        label_('What you sent us') +
        '<div style="margin-top:12px;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:' + BRAND.muted + ';">Interest</div>' +
        '<div style="margin-top:3px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:' + BRAND.navy + ';">' + esc_(lead.interest) + '</div>' +
        '<div style="margin-top:16px;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:' + BRAND.muted + ';">Your message</div>' +
        '<div style="margin-top:3px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:' + BRAND.navy + ';">' + nl2br_(esc_(truncate_(lead.message, 700))) + '</div>' +
      '</td></tr></table>' +

    // What happens next
    '<div style="margin-top:34px;">' + label_('What happens next') + '</div>' +
    step_('01', 'We read and understand', 'Someone from the team reads your message properly, not a template reply.') +
    step_('02', 'We reply with next steps', 'Expect questions, ideas or a suggested direction within 1–2 working days.') +
    step_('03', 'A short call, if it helps', 'If talking is easier than typing, we’ll find a time that suits you.') +

    // CTA
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:34px;"><tr><td style="border-radius:99px;background:' + BRAND.blue + ';">' +
      '<a href="' + CONFIG.SITE_URL + '/#work" style="display:inline-block;padding:15px 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:99px;">See our work &rarr;</a>' +
    '</td></tr></table>' +

    para_('Want to add something? Just reply to this email, or write to <a href="mailto:' + CONFIG.REPLY_TO + '" style="color:' + BRAND.blue + ';text-decoration:none;">' + CONFIG.REPLY_TO + '</a>. It reaches us directly.', '30px 0 0') +
    '<p style="margin:26px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:' + BRAND.navy + ';"><strong>The Cephionix team</strong><br><span style="font-size:10px;letter-spacing:2.3px;color:' + BRAND.muted + ';">INTELLIGENCE AT THE CORE</span></p>';

  return shell_('We’ve received your enquiry', 'Thanks for getting in touch. We’ll reply within 1–2 working days.', body,
    'This is an automated confirmation from an unmonitored address, but replies reach ' + CONFIG.REPLY_TO + '. You’re receiving it because you sent an enquiry through cephionix.com. If that wasn’t you, you can safely ignore it.');
}

function replyText_(lead) {
  return [
    'Hi ' + firstName_(lead.name) + ',',
    '',
    'Thanks for getting in touch. We’ve received your enquiry about ' + lead.interest + ' and will reply within 1–2 working days.',
    '',
    'WHAT YOU SENT US',
    truncate_(lead.message, 700),
    '',
    'WHAT HAPPENS NEXT',
    '1. We read and understand your message.',
    '2. We reply with questions, ideas or next steps.',
    '3. A short call, if it helps.',
    '',
    'Want to add something? Just reply to this email or write to ' + CONFIG.REPLY_TO + '.',
    '',
    'The Cephionix team',
    'Intelligence at the core',
    CONFIG.SITE_URL,
    '',
    '-- You’re receiving this because you sent an enquiry through cephionix.com.'
  ].join('\n');
}

function ownerHtml_(lead, received) {
  const row = function (k, v) {
    return '<tr><td style="padding:12px 0;border-top:1px solid ' + BRAND.line + ';width:120px;vertical-align:top;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.6px;color:' + BRAND.muted + ';text-transform:uppercase;">' + k + '</td>' +
           '<td style="padding:12px 0;border-top:1px solid ' + BRAND.line + ';vertical-align:top;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:' + BRAND.navy + ';">' + v + '</td></tr>';
  };
  const body =
    eyebrow_('New website enquiry') +
    '<h1 style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;color:' + BRAND.navy + ';">' + esc_(lead.name) + ' wrote in about ' + esc_(lead.interest) + '.</h1>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;">' +
      row('Name', esc_(lead.name)) +
      row('Email', '<a href="mailto:' + esc_(lead.email) + '" style="color:' + BRAND.blue + ';text-decoration:none;">' + esc_(lead.email) + '</a>') +
      row('Interest', esc_(lead.interest)) +
      row('Message', nl2br_(esc_(lead.message))) +
      row('Received', esc_(received)) +
    '</table>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="border-radius:99px;background:' + BRAND.blue + ';">' +
      '<a href="mailto:' + esc_(lead.email) + '?subject=' + encodeURIComponent('Re: your enquiry to Cephionix') + '" style="display:inline-block;padding:14px 26px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:99px;">Reply to ' + esc_(firstName_(lead.name)) + ' &rarr;</a>' +
    '</td></tr></table>' +
    para_('Tip: just hit Reply on this email. It goes straight to ' + esc_(lead.name) + '.', '24px 0 0');
  return shell_('New enquiry: ' + lead.interest, lead.name + ': ' + truncate_(lead.message, 90), body, 'Sent by the cephionix.com enquiry form.');
}

function ownerText_(lead, received) {
  return [
    'New website enquiry',
    '',
    'Name: ' + lead.name,
    'Email: ' + lead.email,
    'Interest: ' + lead.interest,
    'Received: ' + received,
    '',
    lead.message,
    '',
    'Reply to this email to answer ' + firstName_(lead.name) + ' directly.'
  ].join('\n');
}

/* ---- template building blocks ---- */

function shell_(title, preheader, innerHtml, footNote) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<title>' + esc_(title) + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + BRAND.paper + ';">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' + esc_(preheader) + '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + BRAND.paper + ';"><tr><td align="center" style="padding:32px 14px;">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">' +
        '<tr><td style="padding:0 6px 22px;"><a href="' + CONFIG.SITE_URL + '" style="text-decoration:none;"><img src="' + CONFIG.LOGO_URL + '" width="190" alt="CEPHIONIX" style="display:block;border:0;outline:none;height:auto;width:190px;max-width:100%;"></a></td></tr>' +
        '<tr><td style="background:#ffffff;border:1px solid ' + BRAND.line + ';border-radius:24px;overflow:hidden;">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
            '<tr><td style="height:6px;line-height:6px;font-size:0;background:' + BRAND.blue + ';">&nbsp;</td></tr>' +
            '<tr><td style="padding:38px 38px 40px;">' + innerHtml + '</td></tr>' +
          '</table>' +
        '</td></tr>' +
        '<tr><td style="padding:24px 10px 0;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:' + BRAND.muted + ';">' +
          '<strong style="color:' + BRAND.navy + ';">Cephionix Software Developer (OPC) Pvt. Ltd.</strong><br>Built with purpose. Based in India.<br>' +
          '<a href="' + CONFIG.SITE_URL + '" style="color:' + BRAND.blue + ';text-decoration:none;">cephionix.com</a> &nbsp;&middot;&nbsp; ' +
          '<a href="mailto:' + CONFIG.OWNER_EMAIL + '" style="color:' + BRAND.blue + ';text-decoration:none;">' + CONFIG.OWNER_EMAIL + '</a><br>' +
          '<span style="display:inline-block;margin-top:12px;font-size:11px;color:#8a95a8;">' + esc_(footNote) + '</span>' +
        '</td></tr>' +
      '</table>' +
    '</td></tr></table></body></html>';
}

function eyebrow_(text) {
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.3px;color:' + BRAND.blue + ';text-transform:uppercase;">' + esc_(text) + '</div>';
}

function label_(text) {
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.3px;color:' + BRAND.muted + ';text-transform:uppercase;">' + esc_(text) + '</div>';
}

function para_(html, margin) {
  return '<p style="margin:' + margin + ';font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#3d4c66;">' + html + '</p>';
}

function step_(num, title, text) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>' +
    '<td width="44" valign="top" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:' + BRAND.blue + ';padding-top:2px;">' + num + '</td>' +
    '<td valign="top" style="font-family:Helvetica,Arial,sans-serif;">' +
      '<div style="font-size:15px;font-weight:700;color:' + BRAND.navy + ';">' + esc_(title) + '</div>' +
      '<div style="margin-top:2px;font-size:14px;line-height:1.55;color:' + BRAND.muted + ';">' + esc_(text) + '</div>' +
    '</td></tr></table>';
}

/* ---- helpers ---- */

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function nl2br_(s) { return s.replace(/\r?\n/g, '<br>'); }
function truncate_(s, n) { return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; }
function firstName_(name) { return (name.split(/\s+/)[0] || 'there'); }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Run this ONCE from the editor: it asks for permission and sends     */
/* both sample emails to OWNER_EMAIL so you can check the design.       */
/* ------------------------------------------------------------------ */
function testPreview() {
  const lead = {
    name: 'Alex Singh',
    email: CONFIG.OWNER_EMAIL,
    interest: 'Custom software',
    message: 'We run a small flight school and need a simple way to schedule aircraft and instructors.\nCould we talk about what that could look like?'
  };
  notifyOwner_(lead);
  sendAutoReply_(lead);
  console.log('Sent 2 sample emails to ' + CONFIG.OWNER_EMAIL);
}

/* Run from the editor to confirm the noreply alias is ready (see View > Executions for the log). */
function checkSetup() {
  const aliases = GmailApp.getAliases();
  console.log('Account: ' + Session.getEffectiveUser().getEmail());
  console.log('Send-as aliases: ' + (aliases.join(', ') || '(none)'));
  console.log(aliases.indexOf(CONFIG.FROM_ALIAS) !== -1
    ? 'OK: confirmations will be sent from ' + CONFIG.FROM_ALIAS
    : 'NOT READY: add ' + CONFIG.FROM_ALIAS + ' under Gmail > Settings > Accounts > Send mail as. Until then confirmations come from the account itself.');
}
