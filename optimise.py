#!/usr/bin/env python3
"""Makes fast, sharp web versions of every image in static/img/.

For each job folder it writes AVIF and WebP copies at a couple of sizes
(e.g. card-450.avif, card-900.webp, hero-2000.avif), plus a landscape
feature crop for jobs marked "feature": true in content/site.json.
Only files that are missing or older than their source are rebuilt.
Run locally after adding images:  python3 optimise.py
(Netlify does not need to run this; the outputs are committed.)
"""
import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "static", "img")
S = json.load(open(os.path.join(ROOT, "content", "site.json"), encoding="utf-8"))

WIDTHS = {"card": (450, 900), "feat": (800, 1600), "hero": (1000, 2000), "gallery": (800, 1600)}


def stale(out, src):
    return not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src)


def save_set(im, folder, name, widths, src, jpg=False):
    w0 = im.size[0]
    for w in widths:
        w = min(w, w0)
        h = round(im.size[1] * w / w0)
        r = None
        for ext, kw in (("avif", dict(quality=52, speed=6)), ("webp", dict(quality=80, method=6)), ("jpg", dict(quality=84, progressive=True, optimize=True))):
            if ext == "jpg" and not jpg:
                continue
            out = os.path.join(folder, f"{name}-{w}.{ext}")
            if stale(out, src):
                r = r or im.resize((w, h), Image.LANCZOS)
                r.save(out, **kw)


def feature_crop(im, cy=0.45):
    w, h = im.size
    if w / h > 1.6:
        cw, ch = int(h * 1.6), h
    else:
        cw, ch = w, int(w / 1.6)
    x = (w - cw) // 2
    y = int(min(max(cy * h - ch / 2, 0), h - ch))
    return im.crop((x, y, x + cw, y + ch))


for j in S["jobs"]:
    d = os.path.join(IMG, j["id"])
    if not os.path.isdir(d):
        continue
    card = os.path.join(d, "card.jpg")
    hero = os.path.join(d, "hero.jpg")
    if os.path.exists(card):
        save_set(Image.open(card).convert("RGB"), d, "card", WIDTHS["card"], card)
    if os.path.exists(hero):
        im = Image.open(hero).convert("RGB")
        save_set(im, d, "hero", WIDTHS["hero"], hero)
        if j.get("feature"):
            fsrc = os.path.join(d, "feat-src.jpg")  # optional landscape source just for the big tile
            src = fsrc if os.path.exists(fsrc) else hero
            save_set(feature_crop(Image.open(src).convert("RGB"), j.get("feature_y", 0.45)), d, "feat", WIDTHS["feat"], src, jpg=True)
    for g in j.get("gallery", []):
        p = os.path.join(d, g["src"])
        if os.path.exists(p):
            save_set(Image.open(p).convert("RGB"), d, os.path.splitext(g["src"])[0], WIDTHS["gallery"], p)
    print("ok", j["id"])
