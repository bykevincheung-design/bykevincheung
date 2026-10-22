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
# Google Analytics 4: only on the real domain, ads features off, visitors can switch it off in the footer.
GA = S.get("ga_id", "")
ANALYTICS = ("""<script>
(function(){var id='%s',h=location.hostname;window.__gaId=id;
if(!/(^|\\.)bykevincheung\\.com$/.test(h))return;
try{if(localStorage.getItem('ga-off')==='1'){window['ga-disable-'+id]=true;return;}}catch(e){}
var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(s);
window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};
gtag('js',new Date());gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false});})();
</script>""" % GA) if GA else ""
FONTS = ('<link rel="preload" href="/static/fonts/archivo-wdth.woff2" as="font" type="font/woff2" crossorigin>'
         '<link rel="preload" href="/static/fonts/plex-mono-400.woff2" as="font" type="font/woff2" crossorigin>')


def picture(folder, name, sizes, alt, cls="", lazy=True, fallback=None, w=None, h=None, fetch=None):
    """<picture> with AVIF and WebP at every width optimise.py made, JPG fallback."""
    import glob
    d = os.path.join(ROOT, "static", "img", folder)
    widths = sorted({int(m.group(1)) for f in glob.glob(os.path.join(d, f"{name}-*.avif"))
                     for m in [re.search(r"-(\d+)\.avif$", f)] if m})
    fb = fallback or f"{name}.jpg"
    srcs = ""
    for ext, typ in (("avif", "image/avif"), ("webp", "image/webp")):
        if widths:
            ss = ", ".join(f"/static/img/{folder}/{name}-{w_}.{ext} {w_}w" for w_ in widths)
            srcs += f'<source type="{typ}" srcset="{ss}" sizes="{sizes}">'
    dims = f' width="{w}" height="{h}"' if w and h else ""
    attrs = (' loading="lazy" decoding="async"' if lazy else ' fetchpriority="high"' if fetch else "")
    c = f' class="{cls}"' if cls else ""
    return f'<picture>{srcs}<img{c} src="/static/img/{folder}/{fb}" alt="{e(alt)}"{dims}{attrs}></picture>'


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + '</script>'


def head(title, desc, image, path, kind="website", schema=""):
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="expect" href="#vt-ready" blocking="render">
<script>(function(){{try{{var p=location.pathname;if(p.indexOf('/work/')<0&&(p.slice(-1)==='/'||p.slice(-10)==='index.html')&&!sessionStorage.getItem('intro-done')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('intro');}}catch(e){{}}}})();</script>
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{SITE_URL}{path}">
<meta property="og:site_name" content="Kevin Cheung">
<meta property="og:locale" content="en_GB">
<meta property="og:type" content="{kind}">
<meta property="og:url" content="{SITE_URL}{path}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{SITE_URL}{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{e(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE_URL}{image}">
{schema}
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
{FONTS}
<link rel="stylesheet" href="/static/site.css?v={CSS_V}">
{ANALYTICS}
<script type="speculationrules">{{"prerender":[{{"where":{{"or":[{{"href_matches":"/work/*"}},{{"href_matches":"/"}}]}},"eagerness":"moderate"}}]}}</script>
</head>
<body>
<div class="glow" aria-hidden="true"></div>
"""


def header(on_home):
    work = "#work" if on_home else "/#work"
    credits = "#credits" if on_home else "/#credits"
    about = "#about" if on_home else "/#about"
    contact = "#about" if on_home else "/#about"
    return f"""<header class="top">
<div class="wrap top-in">
<a class="logo" href="/">{e(S['name'])}<span class="logo-role"> | Production Manager · Producer · Fixer</span></a>
<nav aria-label="Main">
<a href="{work}">Work</a>
<a href="{credits}">Credits</a>
<a href="{e(S['cv'])}" target="_blank" rel="noopener" data-ev="CV">CV ↗</a>
<a href="{contact}">About</a>
</nav>
</div>
</header>
"""


def footer():
    return FOOT.replace("JSV", JS_V)


FOOT = """<footer class="foot">
<div class="wrap"><a class="wordmark" href="/#top" aria-label="Kevin Cheung, back to the top">Kevin Cheung</a></div>
<div class="wrap foot-in">
<span>© 2026 Gweilo Prod Ltd</span>
<span>gwei.lo studios 鬼佬工作室</span>
<span class="clock" aria-label="Time in London">London <span class="clock-t">--:--</span></span>
<span class="ga-note" hidden>Visits counted with Google Analytics, no ad tracking. <button type="button" class="ga-toggle">Turn off</button></span>
<a href="#top">Back to top ↑</a>
</div>
</footer>
<script src="/static/vendor/lenis.min.js?v=1.1.20"></script>
<script src="/static/site.js?v=JSV"></script>
<div id="vt-ready" hidden></div>
</body>
</html>
"""


def meta_line(j):
    parts = []
    if j["director"]:
        parts.append("Dir. " + j["director"])
    parts += [j["role"], j["production"]]
    return " · ".join(parts)


def credit_pairs(j):
    pairs = []
    if j["director"]:
        pairs.append((j.get("director_label", "Director"), j["director"]))
    pairs.append(("Role", j["role"]))
    return '<span class="tile-credits">' + "".join(
        f'<span class="tc"><span class="tc-l">{e(l)}</span><span class="tc-v">{short_role(v) if l == "Role" else e(v)}</span></span>' for l, v in pairs) + "</span>"


def short_role(v):
    # "Production Manager" becomes "Prod Manager" on phones
    return e(v).replace("Production Manager", 'Prod<span class="long">uction</span> Manager')


def film_cinema(j, src):
    """A cover that opens the film full screen. Plays a silent loop until clicked."""
    jid = j["id"]
    loop = next((c for c in ("preview-wide.mp4", "preview.mp4")
                 if os.path.exists(os.path.join(ROOT, "static", "img", jid, c))), None)
    sep = "&" if "?" in src else "?"
    play = src + sep + ("autoplay=1&title=0&byline=0&portrait=0&dnt=1" if "vimeo" in src else "autoplay=1")
    vid = (f'<video class="cine-loop" src="/static/img/{jid}/{loop}" muted loop playsinline autoplay preload="auto" aria-hidden="true"></video>'
           if loop else "")
    return (f'<div class="film film-cinema" data-play="{e(play)}">'
            f'<button class="cine-cover" type="button" aria-label="Play film: {e(j["client"])}, {e(j["project"])}" data-ev="Play film" data-ev-job="{e(j["client"])}, {e(j["project"])}">'
            f'{picture(jid, "hero", "(max-width: 900px) 100vw, 1280px", "", lazy=False)}{vid}'
            f'<span class="cine-play"><span class="cine-dot" aria-hidden="true"></span>Play film</span>'
            f'</button></div>')


def film_embed(url, j=None):
    if not url:
        return ""
    if url.endswith(".mp4"):
        return (f'<div class="film film-file"><video src="{e(url)}" controls playsinline preload="metadata" '
                f'poster="{e(url.rsplit("/", 1)[0])}/hero.jpg"></video></div>')
    m = re.search(r"vimeo\.com/(?:video/)?(\d+)(?:/(\w+))?", url)
    if m:
        src = f"https://player.vimeo.com/video/{m.group(1)}" + (f"?h={m.group(2)}" if m.group(2) else "")
        if j:
            return film_cinema(j, src)
    else:
        m = re.search(r"(?:youtu\.be/|v=|embed/)([\w-]{11})", url)
        if not m:
            return ""
        src = f"https://www.youtube-nocookie.com/embed/{m.group(1)}"
        if j:
            return film_cinema(j, src + "?enablejsapi=1&rel=0")
    return (f'<div class="film"><iframe src="{e(src)}" title="Film" loading="lazy" '
            'allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>')


def work_filters():
    from collections import Counter
    c = Counter("Fashion" if j["type"] == "Editorial" else j["type"] for j in JOBS)
    cats = [("All", sum(1 for j in JOBS if not j.get("filter_only")))] + [(k, c[k]) for k in ("Commercial", "Fashion", "Music", "Live") if c[k]]
    btns = "".join(f'<button type="button" class="wf" data-cat="{k}" aria-pressed="{"true" if k == "All" else "false"}" data-ev="Filter" data-ev-category="{k}">'
                   f'{k}<sup>{n}</sup></button>' for k, n in cats)
    return f'<div class="work-filters mono" role="group" aria-label="Show work by category">{btns}<span class="wf-bar" aria-hidden="true"></span></div>'


def build_home():
    tiles = []
    for n, j in enumerate(JOBS):
        feat = bool(j.get("feature"))
        clip = "preview-wide.mp4" if feat else "preview.mp4"
        has_clip = os.path.exists(os.path.join(ROOT, "static", "img", j["id"], clip))
        video = (f'<video src="/static/img/{j["id"]}/{clip}" muted loop playsinline preload="none" aria-hidden="true"></video>'
                 if has_clip else "")
        alt = f"{j['client']}, {j['project']}"
        if feat:
            img = picture(j["id"], "feat", "(max-width: 900px) 100vw, 50vw", alt, lazy=n > 3, fallback="feat-800.jpg", w=1600, h=1000)
        else:
            img = picture(j["id"], "card", "(max-width: 600px) 50vw, (max-width: 900px) 50vw, 25vw", alt, lazy=n > 3, w=900, h=1125)
        cat = "Fashion" if j["type"] == "Editorial" else j["type"]
        only = ' data-only="1"' if j.get("filter_only") else ''
        tiles.append(f"""<a class="tile{' feature' if feat else ''}{' is-out' if only else ''}" href="/work/{j['id']}/" data-cat="{e(cat)}"{only}>
<span class="tile-media">{img}{video}</span>
<span class="tile-client">{e(j['client'])}</span>
<span class="tile-project">{e(j['project'])}</span>
<span class="tile-prod">{e(j['production'])}</span>
{credit_pairs(j)}
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

    person = {"@context": "https://schema.org", "@type": "Person", "name": S["name"], "url": SITE_URL + "/",
              "image": SITE_URL + "/static/share.jpg", "jobTitle": ["Production Manager", "Producer", "Fixer"],
              "description": "London-based Production Manager, Producer and Fixer working across commercials, fashion, music and live events.",
              "address": {"@type": "PostalAddress", "addressLocality": "London", "addressCountry": "GB"},
              "email": "mailto:" + S["email"], "sameAs": [S["instagram"]],
              "knowsAbout": ["Commercial production", "Fashion campaigns", "Music videos", "Live events"],
              "worksFor": {"@type": "Organization", "name": "Gweilo Prod Ltd"}}
    html = head(f"{S['name']} · Production Manager, Producer & Fixer, London",
                "London-based Production Manager, Producer and Fixer working across commercials, fashion, music and live events, for Nike, Chanel, adidas, Apple and Jaeger-LeCoultre.",
                "/static/share.jpg", "/", schema=ld(person))
    html += header(True)
    html += f"""<main id="top">
<h1 class="visually-hidden">{e(S['name'])}, Production Manager, Producer and Fixer, London</h1>
<section class="reel" aria-label="Showreel">
<video class="reel-v" autoplay muted loop playsinline preload="auto" poster="/static/reel/poster.jpg" aria-hidden="true">
<source src="/static/reel/reel-600x750.mp4" type="video/mp4" media="(max-width: 700px)">
<source src="/static/reel/reel-1280.mp4" type="video/mp4">
</video>
<div class="reel-cap wrap"><span class="reel-name">Kevin Cheung</span><span class="reel-role">Production Manager, Producer <em>&amp;</em> Fixer, London</span></div>
<a class="reel-down mono" href="#work">Selected work ↓</a>
</section>


<section id="work" class="wrap section" aria-labelledby="work-h">
<h2 id="work-h" class="visually-hidden">Selected work</h2>
{work_filters()}
<div class="grid">
{chr(10).join(tiles)}
</div>
</section>

<section id="credits" class="wrap section" aria-labelledby="credits-h">
<div class="credits-head">
<div>
<h2 id="credits-h" class="h2">Selected credits</h2>
<span class="mono muted small">Full list on request, or in the <a class="u" href="{e(S['cv'])}" target="_blank" rel="noopener" data-ev="CV">CV</a></span>
</div>
<div class="pills" role="group" aria-label="Filter by category">{''.join(pills)}</div>
</div>
<div class="table-scroll">
<div class="table">
<div class="row row-head mono"><span>Client</span><span>Project</span><span>Director</span><span>Production company</span><span>Role</span></div>
{chr(10).join(rows)}
</div>
</div>
</section>

<section id="about" class="about" aria-labelledby="about-h">
<div class="wrap about-in">
<div class="about-text">
<h2 id="about-h" class="mono about-label">About &amp; contact</h2>
{photo}
<p class="about-lead">{e(about_lead)}</p>
{''.join(f'<p class="about-body">{e(p)}</p>' for p in about_rest)}
</div>
<div class="services">{services}</div>
</div>
<div class="wrap">
<div class="contact-cols">
<div><span class="mono label">Representation</span>
<strong>{e(agent['name'])}</strong>
<a class="u" href="mailto:{e(agent['email'])}" data-ev="Email Chapters">{e(agent['email'])}</a>
<a href="tel:{e(agent['phone'].replace(' ', ''))}" data-ev="Call Chapters">{e(agent['phone'])}</a></div>
<div><span class="mono label">Direct</span>
<a class="u" href="mailto:{e(S['email'])}" data-ev="Email Kevin">{e(S['email'])}</a>
<a href="{e(S['instagram'])}" target="_blank" rel="noopener" data-ev="Instagram">Instagram ↗</a></div>
<div><span class="mono label">Studio</span>
<span>{'<br>'.join(e(l) for l in S['studio'])}</span></div>
</div>
</div>
</section>
</main>
"""
    html += footer()
    return html


def build_job(i):
    j = JOBS[i]
    chain = [x for x in JOBS if not x.get("filter_only")] if not j.get("filter_only") else JOBS
    n = chain[(chain.index(j) + 1) % len(chain)]
    note = f"{j['client']}, {j['project']}. " + (
        f"{'Shot by' if j.get('director_label') == 'Photographer' else 'Directed by'} {j['director']} with {j['production']}." if j["director"] else f"With {j['production']}.")
    gallery = "".join(
        picture(j["id"], os.path.splitext(g["src"])[0], "(max-width: 900px) 100vw, " + ("66vw" if g["shape"] == "landscape" else "33vw"),
                f"{j['client']}, {j['project']}", cls=f"g-{g['shape']}", fallback=g["src"])
        for g in j["gallery"])
    about = f'<p class="note">{e(j["about"])}</p>' if j.get("about") else ""
    director_row = (f'<div class="dl-row"><dt>{e(j.get("director_label", "Director"))}</dt><dd>{e(j["director"])}</dd></div>' if j["director"] else "")
    work = {"@context": "https://schema.org", "@type": "CreativeWork", "name": f"{j['client']}, {j['project']}",
            "description": j.get("about") or note, "image": f"{SITE_URL}/static/img/{j['id']}/share.jpg",
            "url": f"{SITE_URL}/work/{j['id']}/", "dateCreated": j["year"], "genre": j["type"],
            "contributor": {"@type": "Person", "name": S["name"], "url": SITE_URL + "/", "jobTitle": j["role"]}}
    html = head(f"{j['client']}, {j['project']} · {S['name']}, {j['role']}",
                f"{note} {S['name']}, {j['role']}.",
                f"/static/img/{j['id']}/share.jpg", f"/work/{j['id']}/", kind="article", schema=ld(work))
    html += header(False)
    html += f"""<main id="top" class="job-page">
<section class="wrap job-head">
<div class="mono muted">{e(j['type'])} · {e(j['year'])}</div>
<h1 class="job-title">{e(j['client'])}</h1>
<p class="job-sub">{e(j['project'])}</p>
<div class="job-meta mono"><span><span class="muted">Production company </span>{e(j['production'])}</span><span><span class="muted">Role </span>{e(j['role'])}</span></div>
</section>
{('<section class="wrap">' + film_embed(j.get('film'), j) + '</section>') if j.get('film') else ''}
<section class="wrap job-main">
{picture(j['id'], 'hero', '(max-width: 900px) 100vw, 66vw', j['client'] + ', ' + j['project'], cls='job-hero' + ('' if j.get('film') else ' first-media'), lazy=bool(j.get('film')), fetch=True)}
<div class="job-panel">
<dl>
<div class="dl-row first"><dt>Role</dt><dd class="b">{e(j['role'])}</dd></div>
<div class="dl-row"><dt>Production company</dt><dd class="b">{e(j['production'])}</dd></div>
{director_row}
<div class="dl-row last"><dt>Year</dt><dd>{e(j['year'])}</dd></div>
</dl>
{about or f'<p class="note">{e(note)}</p>'}
</div>
</section>
<section class="wrap gallery" aria-label="Gallery">{gallery}</section>
<section class="wrap job-contact" aria-label="Contact">
<span class="mono jc-k">Work together</span>
<div class="jc-row">
<span class="jc-item"><span class="mono muted">Represented by</span> {e(S['agent']['name'])}</span>
<a class="jc-item u" href="mailto:{e(S['agent']['email'])}" data-ev="Email Chapters">{e(S['agent']['email'])}</a>
<a class="jc-item" href="tel:{e(S['agent']['phone'].replace(' ', ''))}" data-ev="Call Chapters">{e(S['agent']['phone'])}</a>
<span class="jc-item"><span class="mono muted">Direct</span> <a class="u" href="mailto:{e(S['email'])}" data-ev="Email Kevin">{e(S['email'])}</a></span>
</div>
</section>
<section class="next" aria-label="Next project">
<a class="next-in" href="/work/{n['id']}/">
<span class="next-media">{picture(n['id'], 'hero', '100vw', n['client'] + ', ' + n['project'])}</span>
<span class="wrap next-cap"><span class="mono next-k">Next project</span><span class="next-t">{e(n['client']).replace('\u2011', '-')}</span><span class="next-s">{e(n['project'])}</span></span>
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
        f.write(head("Page not found · " + S["name"], "Page not found", "/static/share.jpg", "/404")
                + header(False)
                + '<main id="top" class="lost">'
                '<video class="lost-v" autoplay muted loop playsinline poster="/static/reel/poster.jpg" aria-hidden="true">'
                '<source src="/static/reel/reel-600x750.mp4" type="video/mp4" media="(max-width: 700px)">'
                '<source src="/static/reel/reel-1280.mp4" type="video/mp4"></video>'
                '<div class="wrap lost-in"><span class="mono lost-k">Error 404 · Scene missing</span>'
                '<h1 class="lost-t">Cut.</h1>'
                '<p class="lost-s">This page has moved, or it was never in the edit.</p>'
                '<p class="lost-l mono"><a href="/#work">Back to the work →</a><a href="/#about">About</a></p></div></main>'
                + footer())
    with open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8") as f:
        urls = [SITE_URL + "/"] + [f"{SITE_URL}/work/{j['id']}/" for j in JOBS]
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + "".join(f"<url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")
    with open(os.path.join(DIST, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    print(f"Built {len(JOBS)} campaign pages into dist/")


if __name__ == "__main__":
    main()
