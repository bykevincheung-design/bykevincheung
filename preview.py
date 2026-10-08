#!/usr/bin/env python3
"""Makes a copy of dist/ in preview/ with relative links, so it can be viewed
without a web server or on a private preview page. Not used by Netlify."""
import os
import re
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
OUT = os.path.join(ROOT, "preview")

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
shutil.copytree(DIST, OUT)


def fix_url(url, prefix):
    path, sep, frag = url.partition("#")
    if path == "" and sep:
        return url
    path = path.lstrip("/")
    if path == "" or path.endswith("/"):
        path += "index.html"
    return prefix + path + (sep + frag if sep else "")


for dirpath, _, files in os.walk(OUT):
    for name in files:
        full = os.path.join(dirpath, name)
        if name.endswith(".html"):
            depth = os.path.relpath(full, OUT).count(os.sep)
            prefix = "../" * depth or "./"
            s = open(full, encoding="utf-8").read()
            s = re.sub(r'(href|src)="(/[^"]*)"', lambda m: f'{m.group(1)}="{fix_url(m.group(2), prefix)}"', s)
            open(full, "w", encoding="utf-8").write(s)
        elif name.endswith(".css"):
            s = open(full, encoding="utf-8").read()
            s = s.replace("url(/static/", "url(")
            open(full, "w", encoding="utf-8").write(s)
print("Preview ready in preview/")
