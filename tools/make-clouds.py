#!/usr/bin/env python3
# © 2026 Cephionix Software Developer (OPC) Pvt. Ltd. All rights reserved. Proprietary: no copying, hosting or reuse without written permission. hello@cephionix.com
"""Generate realistic cumulus cloud sprites (transparent WebP) for the 404 page.

Fractal noise gives the billowy shape; light is integrated from the upper left so cloud tops
glow white and the undersides fall into soft blue-grey, like real cumulus.
Run:  python3 tools/make-clouds.py
"""
import pathlib, numpy as np
from PIL import Image, ImageFilter

OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets'

def blur(a, r):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im).astype('float32') / 255

def fbm(w, h, seed, octaves=7, base=3, persistence=0.52):
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), 'float32'); amp = 1.0; tot = 0.0
    for o in range(octaves):
        gw = base * 2 ** o; gh = max(2, int(gw * h / w))
        g = (rng.random((gh + 2, gw + 2)) * 255).astype('uint8')
        img = Image.fromarray(g).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(max(0.6, w / (gw * 5))))
        out += amp * (np.asarray(img).astype('float32') / 255); tot += amp; amp *= persistence
    out /= tot
    return (out - out.min()) / (out.max() - out.min())

def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def render(T, w, h, tscale=2.2, facing_gain=0.16):
    """T = cloud thickness (>= 0). Returns (rgb, alpha). Sun is at the upper left."""
    alpha = np.clip(smooth(T, 0.0, 0.5), 0, 1)
    Tn = blur(np.clip(T / tscale, 0, 1), max(1.0, w / 420))
    # 1) how much cloud lies between each pixel and the sun
    lx, ly = -0.5, -1.0
    step = max(2, w // 200); occl = np.zeros_like(Tn); n = 12
    for i in range(1, n + 1):
        occl += np.roll(np.roll(Tn, int(ly * step * i), 0), int(lx * step * i), 1)
    occl /= n
    light = np.exp(-occl * 1.05)
    # 2) billows: surfaces that face the sun are brighter
    gy, gx = np.gradient(blur(np.clip(T / tscale, 0, 1), max(1.0, w / 260)))
    norm = max(1e-6, np.percentile(np.hypot(gx, gy), 98))
    facing = -(gx * lx + gy * ly) / np.hypot(lx, ly) / norm
    # 3) the base of a cloud is always a little darker
    yy = np.linspace(0, 1, h, dtype='float32')[:, None]
    under = smooth(yy, 0.50, 1.0) * 0.20
    b = np.clip(0.60 * light + 0.30 + facing_gain * np.clip(facing, -1, 1) - under, 0, 1)
    shadow = np.array([158, 178, 210], 'float32')
    high = np.array([255, 255, 255], 'float32')
    rgb = shadow + (high - shadow) * (b[..., None] ** 1.15)
    return np.clip(rgb, 0, 255), alpha

def cloud(w, h, seed, spread=1.0, flat=0.80, density=1.0):
    n = fbm(w, h, seed, octaves=8, base=4, persistence=0.56)
    n2 = fbm(w, h, seed + 99, octaves=6, base=9)
    x = np.linspace(-1, 1, w, dtype='float32')[None, :]
    y = np.linspace(-1, 1, h, dtype='float32')[:, None]
    ex = x / (0.80 * spread)
    ey = np.where(y < 0.30, (y + 0.18) / 0.72, 0.48 / 0.72 + (y - 0.30) * 3.4)
    env = np.exp(-(ex ** 2 + ey ** 2) * 1.55)
    val = env * 1.7 * density + (n - 0.5) * 1.05 + (n2 - 0.5) * 0.38 - 0.62
    T = np.clip(val, 0, None) * 1.7
    T *= 1 - smooth(y, flat - 0.10, flat + 0.10)
    T *= (1 - smooth(np.abs(x), 0.90, 1.0)) * (1 - smooth(np.abs(y), 0.92, 1.0))
    return T

def bank(w, h, seed, side):
    """A dense cloud wall that fills one side of the screen and ends in a ragged, billowy edge."""
    n1 = fbm(w, h, seed, octaves=8, base=3); n2 = fbm(w, h, seed + 7, octaves=7, base=7)
    x = np.linspace(0, 1, w, dtype='float32')[None, :]
    if side == 'right': x = 1 - x
    edge = 0.60 + (n1 - 0.5) * 0.46
    T = np.clip((edge - x) * 3.6 + (n2 - 0.5) * 1.15 + 0.42, 0, None) * 1.5
    return T

def save(T, name, quality=82, **kw):
    h, w = T.shape
    rgb, a = render(T, w, h, **kw)
    a = np.clip(blur(a, max(0.7, w / 1100)), 0, 1)
    img = np.dstack([rgb, a * 255]).astype('uint8')
    Image.fromarray(img, 'RGBA').save(OUT / name, 'WEBP', quality=quality, alpha_quality=90, method=6)
    print(name, (OUT / name).stat().st_size // 1024, 'KB', (w, h))

if __name__ == '__main__':
    save(cloud(900, 470, 11, spread=1.0), 'cloud-1.webp', facing_gain=0.27)
    save(cloud(900, 470, 23, spread=0.95, density=1.05), 'cloud-2.webp', facing_gain=0.27)
    save(cloud(760, 400, 37, spread=1.05), 'cloud-3.webp', facing_gain=0.27)
    save(cloud(600, 320, 51, spread=1.0, density=0.95), 'cloud-4.webp', facing_gain=0.27)
    save(cloud(1100, 420, 64, spread=1.25, flat=0.86, density=0.92), 'cloud-5.webp', facing_gain=0.27)
    save(cloud(700, 540, 77, spread=0.82, flat=0.84, density=1.08), 'cloud-6.webp', facing_gain=0.27)
    save(bank(1500, 1100, 5, 'left'), 'cloudbank-left.webp', 80, tscale=5.0, facing_gain=0.36)
    save(bank(1500, 1100, 13, 'right'), 'cloudbank-right.webp', 80, tscale=5.0, facing_gain=0.36)
