#!/usr/bin/env python3
# © 2026 Cephionix Software Developer (OPC) Pvt. Ltd. All rights reserved. Proprietary: no copying, hosting or reuse without written permission. hello@cephionix.com
"""Re-generate the Content-Security-Policy <meta> in every page.

GitHub Pages cannot send HTTP security headers, so the policy lives in a <meta> tag.
Inline scripts are allowed only by SHA-256 hash, so run this after editing any inline
<script> in a page:   python3 tools/update-csp.py
"""
import base64, hashlib, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'about.html', 'privacy.html', '404.html']

GOOGLE = ['https://*.googletagmanager.com', 'https://*.google-analytics.com',
          'https://*.analytics.google.com', 'https://*.g.doubleclick.net']

def policy(hashes):
    script = ["'self'", 'https://*.googletagmanager.com'] + [f"'sha256-{h}'" for h in hashes]
    parts = [
        "default-src 'self'",
        'script-src ' + ' '.join(script),
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: " + ' '.join(GOOGLE),
        "connect-src 'self' https://script.google.com https://script.googleusercontent.com " + ' '.join(GOOGLE),
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'none'",
        'upgrade-insecure-requests',
    ]
    return '; '.join(parts)

META_RE = re.compile(r'<meta http-equiv="Content-Security-Policy"[^>]*>')
INLINE_RE = re.compile(r'<script>(.*?)</script>', re.S)

for name in PAGES:
    p = ROOT / name
    if not p.exists():
        continue
    html = META_RE.sub('', p.read_text(encoding='utf-8'))
    hashes = []
    for body in INLINE_RE.findall(html):
        h = base64.b64encode(hashlib.sha256(body.encode('utf-8')).digest()).decode()
        if h not in hashes:
            hashes.append(h)
    meta = f'<meta http-equiv="Content-Security-Policy" content="{policy(hashes)}">'
    if '<head>' not in html:
        sys.exit(f'{name}: no <head>')
    html = html.replace('<head>', '<head>' + meta, 1)
    p.write_text(html, encoding='utf-8')
    print(f'{name}: {len(hashes)} inline script hash(es)')
