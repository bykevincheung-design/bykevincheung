#!/usr/bin/env python3
"""Makes the link preview images (1200x630) shown when a page is shared on
WhatsApp, iMessage, LinkedIn and so on. One per campaign, plus the homepage.
Run locally after adding or changing a campaign:  python3 share.py
(Needs Pillow, fontTools and brotli. Netlify does not run this; outputs are committed.)
"""
import io
import json
import os

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "static", "img")
S = json.load(open(os.path.join(ROOT, "content", "site.json"), encoding="utf-8"))
W, H = 1200, 630


def font(name, size, axes=None):
    t = TTFont(os.path.join(ROOT, "static", "fonts", name + ".woff2"))
    t.flavor = None
    buf = io.BytesIO()
    t.save(buf)
    buf.seek(0)
    f = ImageFont.truetype(buf, size)
    if axes:
        f.set_variation_by_axes(axes)
    return f


def fit_text(draw, text, name, start, maxw, axes=None):
    size = start
    while size > 40:
        f = font(name, size, axes)
        if draw.textlength(text, font=f) <= maxw:
            return f
        size -= 4
    return font(name, size, axes)


def card(src, title, sub, out, cy=0.5):
    title, sub = title.replace("\u2011", "-"), (sub or "").replace("\u2011", "-")
    raw = Image.open(src).convert("RGB")
    if raw.size[0] < raw.size[1]:
        cy = 0.22   # portrait pictures: keep faces in frame
    im = ImageOps.fit(raw, (W, H), Image.LANCZOS, centering=(0.5, cy))
    # soft dark gradient at the bottom so the type reads on any picture
    grad = Image.new("L", (1, H))
    for y in range(H):
        grad.putpixel((0, y), int(max(0, (y - H * 0.35) / (H * 0.65)) ** 1.4 * 200))
    im.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), grad.resize((W, H)))
    top = Image.new("L", (1, H))
    for y in range(H):
        top.putpixel((0, y), int(max(0, 1 - y / 140) * 120))
    im.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), top.resize((W, H)))
    d = ImageDraw.Draw(im)
    pad = 56
    mono = font("plex-mono-400", 20)
    d.text((pad, pad - 6), "KEVIN CHEUNG", font=mono, fill=(241, 241, 239))
    tag = "PRODUCTION MANAGER  ·  PRODUCER  ·  FIXER"
    d.text((W - pad - d.textlength(tag, font=mono), pad - 6), tag, font=mono, fill=(241, 241, 239))
    big = fit_text(d, title.upper(), "archivo-wdth", 112, W - pad * 2, [800, 125])
    serif = font("instrument-serif-italic", 44)
    sub_y = H - pad - 44
    title_h = big.getbbox(title.upper())[3]
    d.text((pad, sub_y - title_h - 14), title.upper(), font=big, fill=(241, 241, 239))
    if sub:
        d.text((pad + 4, sub_y), sub, font=serif, fill=(241, 241, 239))
    im.save(out, quality=84, optimize=True, progressive=True)


def main():
    for j in S["jobs"]:
        d = os.path.join(IMG, j["id"])
        src = next((os.path.join(d, f) for f in ("feat-src.jpg", "hero.jpg", "card.jpg") if os.path.exists(os.path.join(d, f))), None)
        if not src:
            continue
        card(src, j["client"], j["project"], os.path.join(d, "share.jpg"), j.get("feature_y", 0.45))
        print("ok", j["id"])
    card(os.path.join(ROOT, "static", "reel", "poster.jpg"), "Kevin Cheung",
         "Production Manager, Producer & Fixer, London", os.path.join(ROOT, "static", "share.jpg"), 0.4)
    print("ok home")


if __name__ == "__main__":
    main()
