#!/usr/bin/env python3
"""Builds bykevincheung.com into the dist/ folder.

All the words and the list of jobs live in content/site.json.
Images live in static/img/<job-id>/ (card.jpg, hero.jpg, 1.jpg, 2.jpg ...).
Run:  python3 build.py
"""
import json
import os
import re
import shutil
from html import escape as e

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
SITE_URL = "https://bykevincheung.com"

with open(os.path.join(ROOT, "content", "site.json"), encoding="utf-8") as f:
    S = json.load(f)

JOBS = S["jobs"]


def _version(path):
    import hashlib
    with open(os.path.join(ROOT, path), "rb") as fh:
        return hashlib.md5(fh.read()).hexdigest()[:8]


CSS_V = _version("static/site.css")
JS_V = _version("static/site.js")
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800'
         '&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap" rel="stylesheet">')


def head(title, desc, image, path):
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{SITE_URL}{path}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{SITE_URL}{image}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
{FONTS}
<link rel="stylesheet" href="/static/site.css?v={CSS_V}">
</head>
<body>
<div class="glow" aria-hidden="true"></div>
"""


def header(on_home):
    work = "#work" if on_home else "/#work"
    credits = "#credits" if on_home else "/#credits"
    about = "#about" if on_home else "/#about"
    contact = "#contact" if on_home else "/#contact"
    return f"""<header class="top">
<div class="wrap top-in">
<a class="logo" href="/">{e(S['name'])}</a>
<nav aria-label="Main">
<a href="{work}">Work</a>
<a href="{credits}">Credits</a>
<a href="{about}">About</a>
<a href="{e(S['cv'])}" target="_blank" rel="noopener">CV ↗</a>
<a class="btn" href="{contact}">Contact</a>
</nav>
</div>
</header>
"""


def footer():
    return """<footer class="foot">
<div class="wrap foot-in">
<span>© 2026 Gweilo Prod Ltd</span>
<span>gwei.lo studios 鬼佬工作室</span>
<a href="#top">Back to top ↑</a>
</div>
</footer>
<script src="/static/site.js?v={JS_V}"></script>
</body>
</html>
"""


def meta_line(j):
    parts = []
    if j["director"]:
        parts.append("Dir. " + j["director"])
    parts += [j["role"], j["production"]]
    return " · ".join(parts)


def film_embed(url):
    if not url:
        return ""
    m = re.search(r"vimeo\.com/(?:video/)?(\d+)(?:/(\w+))?", url)
    if m:
        src = f"https://player.vimeo.com/video/{m.group(1)}" + (f"?h={m.group(2)}" if m.group(2) else "")
    else:
        m = re.search(r"(?:youtu\.be/|v=|embed/)([\w-]{11})", url)
        if not m:
            return ""
        src = f"https://www.youtube-nocookie.com/embed/{m.group(1)}"
    return (f'<div class="film"><iframe src="{e(src)}" title="Film" loading="lazy" '
            'allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>')


def build_home():
    tiles = []
    for j in JOBS:
        video = (f'<video src="/static/img/{j["id"]}/preview.mp4" muted loop playsinline preload="none" aria-hidden="true"></video>'
                 if j.get("preview") else "")
        tiles.append(f"""<a class="tile" href="/work/{j['id']}/">
<span class="tile-media"><img src="/static/img/{j['id']}/card.jpg" alt="{e(j['client'])}, {e(j['project'])}" loading="lazy" width="900" height="1125">{video}</span>
<span class="tile-client">{e(j['client'])}</span>
<span class="tile-project">{e(j['project'])}</span>
<span class="tile-meta">{e(meta_line(j))}</span>
</a>""")

    credits = []
    for j in JOBS:
        credits.append(dict(year=j["year"], client=j["client"], project=j["project"], director=j["director"],
                            production=j["production"], role=j["role"], type=j["type"], href=f"/work/{j['id']}/"))
    for c in S["other_credits"]:
        credits.append(dict(c, href=""))
    credits.sort(key=lambda c: c["year"], reverse=True)
    types = ["Commercial", "Fashion", "Music", "Live"]
    pills = [f'<button type="button" class="pill" aria-pressed="true" data-filter="All">All <span>{len(credits)}</span></button>']
    for t in types:
        n = sum(1 for c in credits if c["type"] == t)
        pills.append(f'<button type="button" class="pill" aria-pressed="false" data-filter="{t}">{t} <span>{n}</span></button>')
    rows = []
    for c in credits:
        tag = "a" if c["href"] else "div"
        href = f' href="{c["href"]}"' if c["href"] else ""
        arrow = "  →" if c["href"] else ""
        rows.append(f"""<{tag} class="row" data-type="{e(c['type'])}"{href}>
<span class="c-client">{e(c['client'])}</span>
<span>{e(c['project'])}{arrow}</span>
<span class="muted">{e(c['director'] or '')}</span>
<span class="muted">{e(c['production'])}</span>
<span class="mono">{e(c['role'])}</span>
</{tag}>""")

    services = "".join(f"""<div class="service"><span class="service-t">{e(s['title'])}</span>
<span class="service-d">{e(s['text'])}</span></div>""" for s in S["services"])
    photo = (f'<img class="about-photo" src="{e(S["about_photo"])}" alt="Kevin Cheung" loading="lazy">'
             if S.get("about_photo") else "")
    about_lead, *about_rest = S["about"]
    agent = S["agent"]
    clients = "".join(f"<span>{e(c)}</span>" for c in S["clients"])

    html = head(f"{S['name']} · Production Manager, Producer & Fixer, London",
                "London-based Production Manager, Producer and Fixer working across commercials, fashion, music and live.",
                "/static/img/adidas-predator/hero.jpg", "/")
    html += header(True)
    html += f"""<main id="top">
<section class="wrap intro" aria-label="Introduction">
<h1>{e(S['name'])}</h1>
<div class="intro-side">
<p>{e(S['intro'])}</p>
<div class="intro-meta mono">
<span class="dotline"><span class="dot"></span>Represented by <a href="mailto:{e(agent['email'])}">{e(agent['name'])}</a></span>
<span>London · Working worldwide</span>
</div>
</div>
</section>

<section class="clients" aria-label="Selected clients">
<div class="wrap clients-in">{clients}</div>
</section>

<section id="work" class="wrap section" aria-labelledby="work-h">
<h2 id="work-h" class="visually-hidden">Selected work</h2>
<div class="grid">
{chr(10).join(tiles)}
</div>
</section>

<section id="credits" class="wrap section" aria-labelledby="credits-h">
<div class="credits-head">
<div>
<h2 id="credits-h" class="h2">Selected credits</h2>
<span class="mono muted small">Full list on request, or in the <a class="u" href="{e(S['cv'])}" target="_blank" rel="noopener">CV</a></span>
</div>
<div class="pills" role="group" aria-label="Filter by category">{''.join(pills)}</div>
</div>
<div class="table-scroll">
<div class="table">
<div class="row row-head mono"><span>Client</span><span>Project</span><span>Director</span><span>Production</span><span>Role</span></div>
{chr(10).join(rows)}
</div>
</div>
</section>

<section id="about" class="about" aria-labelledby="about-h">
<div class="wrap about-in">
<div class="about-text">
<h2 id="about-h" class="mono about-label">About</h2>
{photo}
<p class="about-lead">{e(about_lead)}</p>
{''.join(f'<p class="about-body">{e(p)}</p>' for p in about_rest)}
</div>
<div class="services">{services}</div>
</div>
</section>

<section id="contact" class="wrap section contact" aria-labelledby="contact-h">
<h2 id="contact-h" class="big">Let’s make<br>something</h2>
<div class="contact-cols">
<div><span class="mono muted label">Work enquiries</span>
<strong>{e(agent['name'])}</strong>
<a class="u" href="mailto:{e(agent['email'])}">{e(agent['email'])}</a>
<a href="tel:{e(agent['phone'].replace(' ', ''))}">{e(agent['phone'])}</a></div>
<div><span class="mono muted label">Direct</span>
<a class="u" href="mailto:{e(S['email'])}">{e(S['email'])}</a>
<a href="{e(S['instagram'])}" target="_blank" rel="noopener">Instagram ↗</a></div>
<div><span class="mono muted label">Studio</span>
<span>{'<br>'.join(e(l) for l in S['studio'])}</span></div>
</div>
</section>
</main>
"""
    html += footer()
    return html


def build_job(i):
    j = JOBS[i]
    n = JOBS[(i + 1) % len(JOBS)]
    note = f"{j['client']}, {j['project']}. " + (
        f"Directed by {j['director']} with {j['production']}." if j["director"] else f"With {j['production']}.")
    gallery = "".join(
        f'<img class="g-{g["shape"]}" src="/static/img/{j["id"]}/{g["src"]}" alt="{e(j["client"])}, {e(j["project"])}" loading="lazy">'
        for g in j["gallery"])
    about = f'<p class="note">{e(j["about"])}</p>' if j.get("about") else ""
    director_row = (f'<div class="dl-row"><dt>Director</dt><dd>{e(j["director"])}</dd></div>' if j["director"] else "")
    html = head(f"{j['client']}, {j['project']} · {S['name']}",
                f"{note} {S['name']}: {j['role']}.",
                f"/static/img/{j['id']}/hero.jpg", f"/work/{j['id']}/")
    html += header(False)
    html += f"""<main id="top">
<section class="wrap job-head">
<div class="mono muted">{e(j['type'])} · {e(j['year'])}</div>
<h1 class="job-title">{e(j['client'])}</h1>
<p class="job-sub">{e(j['project'])}</p>
<div class="job-meta mono"><span><span class="muted">Production </span>{e(j['production'])}</span><span><span class="muted">Role </span>{e(j['role'])}</span></div>
</section>
{('<section class="wrap">' + film_embed(j.get('film')) + '</section>') if j.get('film') else ''}
<section class="wrap job-main">
<img class="job-hero" src="/static/img/{j['id']}/hero.jpg" alt="{e(j['client'])}, {e(j['project'])}">
<div class="job-panel">
<dl>
<div class="dl-row first"><dt>Role</dt><dd class="b">{e(j['role'])}</dd></div>
<div class="dl-row"><dt>Production</dt><dd class="b">{e(j['production'])}</dd></div>
{director_row}
<div class="dl-row last"><dt>Year</dt><dd>{e(j['year'])}</dd></div>
</dl>
<p class="note">{e(note)}</p>
<p class="note">Role: {e(j['role'])}</p>
{about}
</div>
</section>
<section class="wrap gallery" aria-label="Gallery">{gallery}</section>
<section class="next" aria-label="Next project">
<a class="wrap next-in" href="/work/{n['id']}/">
<span class="mono muted">Next</span>
<span class="next-t">{e(n['client'])} →</span>
<span class="next-s">{e(n['project'])}</span>
</a>
</section>
</main>
"""
    html += footer()
    return html


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    shutil.copytree(os.path.join(ROOT, "static"), os.path.join(DIST, "static"))
    with open(os.path.join(DIST, "index.html"), "w", encoding="utf-8") as f:
        f.write(build_home())
    for i, j in enumerate(JOBS):
        d = os.path.join(DIST, "work", j["id"])
        os.makedirs(d)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(build_job(i))
    with open(os.path.join(DIST, "404.html"), "w", encoding="utf-8") as f:
        f.write(head("Page not found · " + S["name"], "Page not found", "/static/img/adidas-predator/hero.jpg", "/404")
                + header(False)
                + '<main id="top" class="wrap section"><h1 class="h2">Page not found</h1><p><a class="u" href="/">Back to the work →</a></p></main>'
                + footer())
    with open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8") as f:
        urls = [SITE_URL + "/"] + [f"{SITE_URL}/work/{j['id']}/" for j in JOBS]
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + "".join(f"<url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")
    print(f"Built {len(JOBS)} campaign pages into dist/")


if __name__ == "__main__":
    main()
