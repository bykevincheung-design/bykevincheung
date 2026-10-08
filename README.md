# bykevincheung.com

Kevin Cheung's portfolio site.

## How it's put together

- `content/site.json` holds all the words: intro, about, contact details, every job and the extra credits.
- `static/img/<job-id>/` holds each job's images: `card.jpg` (homepage tile, 4:5), `hero.jpg` (top of the campaign page) and `1.jpg`, `2.jpg`, `3.jpg` (gallery).
- `build.py` turns those into the finished site in `dist/`. Netlify runs it automatically every time something changes.

## Quick edits

Open `content/site.json` and change the text. The order of `jobs` is the order of the homepage grid.

Each job has:

- `client`, `project`, `director`, `production`, `role`, `year`, `type` (Commercial, Fashion, Music or Live)
- `about`: a few lines about the job, shown on its page (leave empty to hide)
- `film`: a Vimeo or YouTube link, shown as a player at the top of its page (leave empty to hide)
- `gallery`: the gallery images and whether each is `landscape` or `portrait`

To add the photo for the About section, put it in `static/img/` and set `about_photo` to its path, for example `/static/img/kevin.jpg`.
