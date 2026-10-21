// Soft glow that follows the cursor
(function () {
  var glow = document.querySelector('.glow');
  if (!glow || !window.matchMedia('(hover: hover)').matches) return;
  var mx = -600, my = -600, x = -600, y = -600;
  window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  (function tick() {
    x += (mx - x) * 0.1;
    y += (my - y) * 0.1;
    glow.style.transform = 'translate3d(' + (x - 210) + 'px,' + (y - 210) + 'px,0)';
    requestAnimationFrame(tick);
  })();
})();

// Play a short clip when hovering a work tile
(function () {
  if (!window.matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('.tile').forEach(function (tile) {
    var v = tile.querySelector('video');
    if (!v) return;
    tile.addEventListener('mouseenter', function () {
      var p = v.play();
      if (p && p.then) p.then(function () { tile.classList.add('playing'); }).catch(function () {});
      else tile.classList.add('playing');
    });
    tile.addEventListener('mouseleave', function () {
      tile.classList.remove('playing');
      v.pause();
      try { v.currentTime = 0; } catch (e) {}
    });
  });
})();

// Credits filter
(function () {
  var pills = document.querySelectorAll('.pill');
  var rows = document.querySelectorAll('.table .row[data-type]');
  pills.forEach(function (p) {
    p.addEventListener('click', function () {
      var f = p.getAttribute('data-filter');
      pills.forEach(function (q) { q.setAttribute('aria-pressed', q === p ? 'true' : 'false'); });
      rows.forEach(function (r) { r.hidden = !(f === 'All' || r.getAttribute('data-type') === f); });
    });
  });
})();

// Motion: page morphs, scroll reveals, scroll-linked film
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  document.documentElement.classList.add('motion');

  // 1. The picture you click travels into the next page (tile -> campaign, campaign -> home, Next -> next campaign)
  function pageMedia() { return document.querySelector('.job-page .film, .job-page .first-media'); }
  function nameEl(el, on) { if (el) el.style.viewTransitionName = on ? 'job-media' : 'none'; }
  function nameTile(tile, on) { nameEl(tile && tile.querySelector('.tile-media'), on); }
  document.querySelectorAll('a.tile').forEach(function (t) {
    t.addEventListener('click', function () { nameTile(t, true); });
  });
  var nextLink = document.querySelector('.next-in');
  document.querySelectorAll('a.logo, a.wordmark').forEach(function (a) {
    a.addEventListener('click', function () { try { sessionStorage.setItem('vt-top', '1'); } catch (x) {} });
  });
  if (nextLink) nextLink.addEventListener('click', function () {
    nameEl(pageMedia(), false);                       // only one travelling picture per page
    nameEl(nextLink.querySelector('.next-media'), true);
  });
  // Leaving a campaign page for anywhere else: only morph if its film is on screen
  window.addEventListener('pageswap', function (e) {
    var m = pageMedia();
    if (!m || !e.viewTransition) return;
    var r = m.getBoundingClientRect();
    var top = false; try { top = sessionStorage.getItem('vt-top') === '1'; } catch (x) {}
    if (top || r.bottom < 0 || r.top > innerHeight) nameEl(m, false);
  });
  // Arriving: show what's on screen straight away (no fade-in lag), and line up the tile we came from
  function settleVisible() {
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { el.style.transition = 'none'; el.classList.add('in'); el.offsetWidth; el.style.transition = ''; }
    });
  }
  // A fresh visit to a campaign page (Next, a tile, a link) always starts at the top; Back/Forward keeps your place
  function startAtTop() {
    var nav = window.navigation && navigation.activation;
    var type = nav ? nav.navigationType : (performance.getEntriesByType('navigation')[0] || {}).type;
    if (document.body.querySelector('.job-page') && !location.hash && type !== 'traverse' && type !== 'back_forward' && type !== 'reload') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (window.lenis) window.lenis.scrollTo(0, { immediate: true, force: true });
    }
  }
  startAtTop();
  window.addEventListener('pageshow', function (ev) { if (!ev.persisted) startAtTop(); });
  window.addEventListener('pagereveal', function (e) {
    startAtTop();
    if (!e.viewTransition) return;
    var from = window.navigation && navigation.activation && navigation.activation.from;
    var path = from && from.url ? new URL(from.url).pathname : '';
    var tile = path && document.querySelector('a.tile[href="' + path + '"]');
    var toTop = false;
    try { toTop = sessionStorage.getItem('vt-top') === '1'; sessionStorage.removeItem('vt-top'); } catch (x) {}
    if (toTop) tile = null;   // logo goes to the top of home, no morph
    // On a campaign page we came back to: if its film is off screen, the Next banner (if it led to where we were) takes the morph
    var m = pageMedia();
    if (m) {
      var mr = m.getBoundingClientRect();
      if (mr.bottom < 0 || mr.top > innerHeight) {
        nameEl(m, false);
        if (nextLink && path === nextLink.getAttribute('href')) {
          var nm = nextLink.querySelector('.next-media');
          nameEl(nm, true);
          e.viewTransition.finished.finally(function () { nm.style.viewTransitionName = ''; m.style.viewTransitionName = ''; });
        } else e.viewTransition.finished.finally(function () { m.style.viewTransitionName = ''; });
      }
    }
    if (tile) {
      var r = tile.getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight) window.scrollTo({ top: scrollY + r.top - (innerHeight - r.height) / 2, behavior: 'instant' });
      nameTile(tile, true);
      e.viewTransition.finished.finally(function () { nameTile(tile, false); });
    }
    settleVisible();
  });
  window.addEventListener('pageshow', function () {
    document.querySelectorAll('a.tile').forEach(function (t) { t.querySelector('.tile-media') && (t.querySelector('.tile-media').style.viewTransitionName = ''); });
    var m = pageMedia(); if (m) m.style.viewTransitionName = '';
    var nm = document.querySelector('.next-media'); if (nm) nm.style.viewTransitionName = '';
  });

  // 2. Ease content in as it scrolls into view
  var els = [];
  document.querySelectorAll('.grid .tile').forEach(function (t, i) { t.style.transitionDelay = (i % 4) * 70 + 'ms'; els.push(t); });
  document.querySelectorAll('.job-panel, .gallery img, .about-text, .services, .contact-cols, .next-in, .table .row, .section-head, h2:not(.visually-hidden)')
    .forEach(function (el) { els.push(el); });
  els.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add('in'); });

  // 3. Campaign pages: film opens out and the title drifts as you scroll
  var film = document.querySelector('.job-page .film, .job-page .job-hero.first-media');
  var head = document.querySelector('.job-head');
  if (!head) return;
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY, p = Math.min(1, y / 320);
    head.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
    head.style.opacity = Math.max(0.15, 1 - y / 520).toFixed(3);
    if (film && !document.body.classList.contains('theatre')) {
      film.style.transform = 'scale(' + (0.9 + 0.1 * p).toFixed(4) + ')';
      film.style.borderRadius = (18 * (1 - p)).toFixed(1) + 'px';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

// Smooth, weighted scrolling on desktop (mouse/trackpad only, never on touch, off for reduced motion)
(function () {
  if (!window.Lenis) return;
  if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1.15, smoothWheel: true, anchors: { offset: -72 } });
  window.lenis = lenis;
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
})();

// Theatre mode: click the film cover, the page dims, the film grows a little and plays.
// Scroll away, press Esc or click the dark area to bring the page back (the film pauses).
(function () {
  var box = document.querySelector('.film-cinema');
  if (!box) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cover = box.querySelector('.cine-cover');
  var head = document.querySelector('.job-head');
  var scrim = document.createElement('div');
  scrim.className = 'theatre-scrim';
  document.body.appendChild(scrim);
  var ifr = null, on = false, y0 = null, isVimeo = /vimeo/.test(box.dataset.play);

  function send(msg) { if (ifr && ifr.contentWindow) ifr.contentWindow.postMessage(JSON.stringify(msg), '*'); }
  function pause() { if (isVimeo) send({ method: 'pause' }); else send({ event: 'command', func: 'pauseVideo', args: [] }); }

  function size() {
    box.style.transform = 'none';
    var r = box.getBoundingClientRect();
    var s = Math.min((innerWidth - 48) / r.width, (innerHeight - 96) / r.height);
    return { s: Math.max(1, s), h: r.height };
  }
  function enter() {
    if (on) return; on = true; y0 = null;
    var m = size();
    document.body.classList.add('theatre');
    box.classList.add('theatre-anim');
    box.style.borderRadius = '0px';
    box.style.transform = 'scale(' + m.s.toFixed(4) + ')';
    var top = box.getBoundingClientRect().top + scrollY;
    var target = top - Math.max(0, (innerHeight - m.h * m.s) / 2);
    if (window.lenis) window.lenis.scrollTo(target, { duration: reduce ? 0 : 1.1, onComplete: settle });
    else { scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' }); setTimeout(settle, reduce ? 0 : 900); }
    function settle() { y0 = scrollY; }
  }
  function leave() {
    if (!on) return; on = false; y0 = null;
    pause();
    document.body.classList.remove('theatre');
    box.style.transform = ''; box.style.borderRadius = '';
    window.dispatchEvent(new Event('scroll'));
    setTimeout(function () { if (!on) box.classList.remove('theatre-anim'); }, 900);
  }
  cover.addEventListener('click', function () {
    ifr = document.createElement('iframe');
    ifr.src = box.dataset.play; ifr.title = 'Film';
    ifr.allow = 'autoplay; fullscreen; picture-in-picture'; ifr.setAttribute('allowfullscreen', '');
    ifr.addEventListener('load', function () {
      box.classList.add('playing');
      if (isVimeo) send({ method: 'addEventListener', value: 'play' });
    });
    box.appendChild(ifr);
    enter();
  });
  // Pressing play again in the Vimeo player brings theatre mode back
  addEventListener('message', function (ev) {
    if (!ifr || ev.source !== ifr.contentWindow) return;
    try { var d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; if (d && d.event === 'play') enter(); } catch (x) {}
  });
  addEventListener('scroll', function () { if (on && y0 !== null && Math.abs(scrollY - y0) > 140) leave(); }, { passive: true });
  addEventListener('keydown', function (ev) { if (ev.key === 'Escape') leave(); });
  scrim.addEventListener('click', leave);
  addEventListener('resize', function () { if (on) { var m = size(); box.style.transform = 'scale(' + m.s.toFixed(4) + ')'; } });
})();

// Work categories: tiles leaving fade out, the rest glide to their new spots, new ones fade up
(function () {
  var bar = document.querySelector('.work-filters');
  var grid = document.querySelector('.grid');
  if (!bar || !grid) return;
  var btns = [].slice.call(bar.querySelectorAll('.wf'));
  var line = bar.querySelector('.wf-bar');
  var tiles = [].slice.call(grid.querySelectorAll('.tile'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ease = 'cubic-bezier(.65,0,.2,1)', busy = false, current = 'All';

  function moveLine(b, instant) {
    var r = b.getBoundingClientRect(), p = bar.getBoundingClientRect();
    if (instant) line.style.transition = 'none';
    line.style.width = r.width + 'px';
    line.style.transform = 'translate(' + (r.left - p.left + bar.scrollLeft) + 'px,' + (r.bottom - p.top - 3) + 'px)';
    if (!instant && b.scrollIntoView && bar.scrollWidth > bar.clientWidth) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    if (instant) { line.offsetWidth; line.style.transition = ''; }
  }
  var active = bar.querySelector('[aria-pressed="true"]');
  moveLine(active, true);
  addEventListener('resize', function () { moveLine(bar.querySelector('[aria-pressed="true"]'), true); });
  if (document.fonts) document.fonts.ready.then(function () { moveLine(bar.querySelector('[aria-pressed="true"]'), true); });

  function show(cat) {
    if (busy || cat === current) return;
    busy = true; current = cat;
    var match = function (t) { return cat === 'All' || t.dataset.cat === cat; };
    var visible = tiles.filter(function (t) { return !t.classList.contains('is-out'); });
    var first = new Map();
    visible.forEach(function (t) { first.set(t, t.getBoundingClientRect()); });
    var leaving = visible.filter(function (t) { return !match(t); });
    var outDur = reduce ? 0 : 180;
    var fades = leaving.map(function (t) {
      return t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: outDur, easing: 'ease-in', fill: 'forwards' }).finished;
    });
    Promise.all(fades).then(function () {
      tiles.forEach(function (t) {
        t.getAnimations().forEach(function (a) { a.cancel(); });
        t.classList.toggle('is-out', !match(t));
        if (match(t) && !t.classList.contains('in')) {
          t.style.transition = 'none'; t.classList.add('in'); t.offsetWidth;
          setTimeout(function () { t.style.transition = ''; }, 50);
        }
      });
      var moveDur = reduce ? 0 : 650;
      tiles.forEach(function (t, i) {
        if (t.classList.contains('is-out')) return;
        var a = first.get(t), b = t.getBoundingClientRect();
        // only glide tiles that were on screen; anything coming from off screen fades up instead of flying in
        if (a && (a.bottom < 0 || a.top > innerHeight)) a = null;
        if (a) {
          var dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(sx - 1) > .01) {
            t.style.transformOrigin = '0 0';
            t.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }, { transform: 'none' }], { duration: moveDur, easing: ease });
          }
        } else {
          t.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: reduce ? 0 : 520, delay: reduce ? 0 : (i % 4) * 40, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        }
      });
      setTimeout(function () { busy = false; }, reduce ? 0 : 420);
      // keep the grid in view if the page got shorter
      var top = grid.getBoundingClientRect().top;
      if (top < 0) {
        var y = scrollY + bar.getBoundingClientRect().top - 90;
        if (window.lenis) window.lenis.scrollTo(y, { duration: 0.9 }); else scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (busy) return;
      btns.forEach(function (q) { q.setAttribute('aria-pressed', q === b ? 'true' : 'false'); });
      moveLine(b);
      show(b.dataset.cat);
    });
  });
})();

// Analytics: send named clicks (Play film, filters, CV, email, Instagram) to Google Analytics,
// and let visitors switch counting off from the footer.
(function () {
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-ev]');
    if (!el || typeof window.gtag !== 'function') return;
    var params = {};
    for (var k in el.dataset) if (k.indexOf('ev') === 0 && k.length > 2) params[k.slice(2).toLowerCase()] = el.dataset[k];
    window.gtag('event', el.dataset.ev.toLowerCase().replace(/\s+/g, '_'), params);
  }, true);
  var note = document.querySelector('.ga-note');
  if (!note || !/(^|\.)bykevincheung\.com$/.test(location.hostname)) return;
  var btn = note.querySelector('.ga-toggle');
  function off() { try { return localStorage.getItem('ga-off') === '1'; } catch (e) { return false; } }
  function paint() {
    note.firstChild.nodeValue = off() ? 'Visit counting is off. ' : 'Visits counted with Google Analytics, no ad tracking. ';
    btn.textContent = off() ? 'Turn on' : 'Turn off';
  }
  note.hidden = false; paint();
  btn.addEventListener('click', function () {
    try { if (off()) localStorage.removeItem('ga-off'); else localStorage.setItem('ga-off', '1'); } catch (e) {}
    if (window.__gaId) window['ga-disable-' + window.__gaId] = off();
    if (off()) { document.cookie.split(';').forEach(function (c) { var n = c.split('=')[0].trim(); if (/^_ga/.test(n)) document.cookie = n + '=; Max-Age=0; path=/; domain=.bykevincheung.com'; }); }
    paint();
    if (!off()) location.reload();
  });
})();


// Scroll rail: a fine line down the right edge with a marker that travels as you move through the work,
// naming the campaign in view. Plus a gentle depth effect on the tile pictures.
(function () {
  var grid = document.querySelector('.grid');
  if (!grid) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine) and (min-width: 1000px)');

  // depth: pictures drift slightly against the scroll
  var media = [].slice.call(grid.querySelectorAll('.tile-media'));
  var seen = new Set();
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); }); }, { rootMargin: '100px 0px' });
    media.forEach(function (m) { io.observe(m); });
  }

  // rail
  var rail = document.createElement('div');
  rail.className = 'rail mono';
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '<span class="rail-line"></span><span class="rail-mark"><span class="rail-tick"></span><span class="rail-lab"><span class="rail-txt"></span></span></span>';
  document.body.appendChild(rail);
  var mark = rail.querySelector('.rail-mark'), lab = rail.querySelector('.rail-lab');
  var current = null;

  // One label at a time: wait until the scroll settles on a campaign, then roll the old name out and the new one in
  var labTimer = null, shown = '';
  function setLabel(text) {
    clearTimeout(labTimer);
    labTimer = setTimeout(function () {
      if (text === shown) return;
      shown = text;
      [].slice.call(lab.querySelectorAll('.rail-txt')).forEach(function (o) {
        if (o.classList.contains('out')) { o.remove(); return; }
        o.classList.add('out');
        setTimeout(function () { o.remove(); }, 340);
      });
      var nu = document.createElement('span');
      nu.className = 'rail-txt in'; nu.textContent = text;
      lab.appendChild(nu);
      nu.offsetWidth; nu.classList.remove('in');
    }, 30);
  }

  var ticking = false;
  function update() {
    ticking = false;
    var vh = innerHeight;
    // depth
    seen.forEach(function (m) {
      var r = m.getBoundingClientRect();
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      m.style.setProperty('--py', (-p * 3).toFixed(2) + '%');
    });
    if (!fine.matches) { rail.classList.remove('on'); return; }
    // keep clear of the showreel: the rail starts below it and only shows once most of it has gone
    var reelEl = document.querySelector('.reel');
    var reelBottom = reelEl ? reelEl.getBoundingClientRect().bottom : 0;
    rail.classList.toggle('on', reelBottom < vh * 0.5);
    var top = Math.max(70, reelBottom + 16), bottom = vh - 40;
    rail.style.setProperty('--rail-top', top + 'px');
    // tick travels with the whole page; the label names the section you're in
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    var prog = Math.min(1, Math.max(0, scrollY / max));
    var y = top + prog * (bottom - top);
    mark.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    mark.classList.toggle('below', y < top + 260);   // near the top, the label hangs below the tick so the header never covers it
    var name = sections[0].name;
    sections.forEach(function (sec) { if (sec.el.getBoundingClientRect().top <= vh * 0.88) name = sec.name; });   // switch as soon as the section comes into view
    setLabel(name);
  }
  var sections = [['Portfolio', '.reel, #work'], ['Credits', '#credits'], ['About', '#about']]
    .map(function (p) { return { name: p[0], el: document.querySelector(p[1]) }; })
    .filter(function (p) { return p.el; });
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.wf')) setTimeout(req, 750); });
  update();
})();

// ---- Decode effects (inspired by data-sheet title cards) ----
// flip(el): letters start mirrored and flicker into place. decode(el): mono text resolves out of random digits.
var Decode = (function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function split(el) {
    if (el.dataset.split) return [].slice.call(el.querySelectorAll('.ch'));
    var text = el.textContent;
    el.setAttribute('aria-label', text.trim());
    el.textContent = '';
    var out = [];
    text.split(/(\s+)/).forEach(function (word) {
      if (!word) return;
      if (/^\s+$/.test(word)) { el.appendChild(document.createTextNode(' ')); return; }
      var wr = document.createElement('span'); wr.className = 'wd'; wr.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (c) { var s = document.createElement('span'); s.className = 'ch'; s.textContent = c; wr.appendChild(s); out.push(s); });
      el.appendChild(wr);
    });
    el.dataset.split = '1';
    return out;
  }
  function flip(el, delay) {
    if (!el || reduce) return;
    var chars = split(el);
    chars.forEach(function (c, i) {
      c.animate([
        { transform: 'scaleX(-1)', opacity: 0 },
        { transform: 'scaleX(-1)', opacity: 1, offset: 0.35 },
        { transform: 'scaleX(-1)', opacity: 0.25, offset: 0.5 },
        { transform: 'scaleX(1)', opacity: 1 }
      ], { duration: 620, delay: (delay || 0) + i * 38 + Math.random() * 120, easing: 'steps(1, end)', fill: 'backwards' });
      // steps keeps the flips crisp; a soft settle follows
      c.animate([{ filter: 'blur(2px)' }, { filter: 'blur(0)' }], { duration: 380, delay: (delay || 0) + i * 38 + 420, easing: 'ease-out', fill: 'backwards' });
    });
  }
  function decode(el, delay, dur) {
    if (!el || reduce) return;
    var nodes = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (w.currentNode.nodeValue.trim()) nodes.push({ n: w.currentNode, t: w.currentNode.nodeValue });
    if (!nodes.length) return;
    dur = dur || 700;
    var start = null, digits = '0123456789';
    nodes.forEach(function (o) { o.when = o.t.split('').map(function () { return Math.random(); }); o.n.nodeValue = o.t.replace(/\S/g, function () { return digits[Math.random() * 10 | 0]; }); });
    el.style.visibility = 'hidden';
    setTimeout(function () {
      el.style.visibility = '';
      (function tick(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur), done = true;
        nodes.forEach(function (o) {
          var s = '';
          for (var i = 0; i < o.t.length; i++) {
            var c = o.t[i];
            if (c === ' ' || o.when[i] * 0.8 < p - 0.2) s += c;
            else { s += digits[Math.random() * 10 | 0]; done = false; }
          }
          o.n.nodeValue = s;
        });
        if (!done && p < 1) requestAnimationFrame(tick); else nodes.forEach(function (o) { o.n.nodeValue = o.t; });
      })(performance.now());
    }, delay || 0);
  }
  return { flip: flip, decode: decode, split: split };
})();

// 1. Homepage intro: the reel opens like data loading in. Rows of production readouts type in and tick over
//    (timecode, frame rate, campaign count, London coordinates, a load percentage), then drop away,
//    leaving your roles in place while your name flips in. Once per visit, under two seconds.
(function () {
  var root = document.documentElement;
  var reel = document.querySelector('.reel');
  if (!reel || !root.classList.contains('intro')) return;
  var variant = (location.search.match(/intro=([abc])/) || [])[1] || 'a';
  if (variant !== 'a') return;
  try { sessionStorage.setItem('intro-done', '1'); } catch (e) {}
  var mobile = innerWidth < 700;
  var cols = mobile ? 3 : 6, rows = mobile ? 16 : 12;
  var wordRow = mobile ? rows - 6 : rows - 3;
  var words = mobile
    ? [[wordRow, 0, 'Production Manager', 3], [wordRow + 1, 0, 'Producer', 3], [wordRow + 2, 0, 'Fixer', 3], [wordRow + 3, 0, 'London', 3]]
    : [[wordRow, 0, 'Production Manager', 2], [wordRow, 2, 'Producer', 1], [wordRow, 3, 'Fixer', 1], [wordRow, 4, 'London', 2]];
  // brands you've worked with, mixed through a sheet of countdown numbers
  var brands = ['Nike', 'Chanel', 'adidas', 'Apple', 'Jaeger-LeCoultre', 'Burberry', "Levi's", 'McLaren',
    'Primark', 'Moncler', 'Bvlgari', 'Arsenal', 'Gentle Monster', 'Williams F1', 'Puma', 'Lucozade', 'Gap',
    'Corteiz', 'Atlassian', 'New Era', 'Aston Martin', 'Ocado', 'C.P. Company', 'OUAI', 'Axel Arigato', 'Vogue',
    'Interview', 'Camperlab', 'GlenDronach', 'Ottolinger', 'Mowalola', 'Coldplay'];
  var bi = 0;
  function p3(n) { return ('00' + Math.max(0, n)).slice(-3); }
  var feeds = [
    function (r, c, el) { el.dataset.v = (el.dataset.v || (199 - c * 31 - r * 2)) - (Math.random() < .5 ? 1 : 0); return p3(+el.dataset.v); },
    function (r, c, el) { return el.dataset.b || (el.dataset.b = brands[bi++ % brands.length]); }
  ];
  var sheet = document.createElement('div');
  sheet.className = 'reel-code mono';
  sheet.setAttribute('aria-hidden', 'true');
  sheet.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  sheet.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';
  var cells = [], wordEls = [];
  for (var r = 0; r < rows; r++) {
    var c = 0;
    while (c < cols) {
      var w = null;
      words.forEach(function (x) { if (x[0] === r && x[1] === c) w = x; });
      var el = document.createElement('span');
      if (w) {
        el.textContent = w[2]; el.className = 'rc-word'; el.style.gridColumn = 'span ' + w[3];
        wordEls.push(el); c += w[3];
      } else {
        var f = ((r * 5 + c * 3) % 7 < 3) ? 1 : 0;   // a little under half the cells are brands
        el.dataset.f = f; el.dataset.r = r; el.dataset.c = c; el.className = 'rc-cell' + (f ? ' rc-brand' : '');
        el.style.visibility = 'hidden';
        cells.push(el); c += 1;
      }
      el.dataset.row = r;
      sheet.appendChild(el);
    }
  }
  reel.appendChild(sheet);
  function paint(el) { el.textContent = feeds[el.dataset.f](+el.dataset.r, +el.dataset.c, el); }
  cells.forEach(paint);
  wordEls.forEach(function (el) { el.style.visibility = 'hidden'; });

  // 0 to 0.45s: rows load in from the top, like a readout filling
  var rowStep = 450 / rows;
  for (var rr = 0; rr < rows; rr++) (function (rr) {
    setTimeout(function () {
      sheet.querySelectorAll('[data-row="' + rr + '"]').forEach(function (el) {
        el.style.visibility = '';
        if (el.classList.contains('rc-brand')) Decode.decode(el, 0, 260);   // brand names resolve out of digits
      });
    }, rr * rowStep);
  })(rr);
  // live values tick while loading
  var live = setInterval(function () {
    cells.forEach(function (el) { if (!el.dataset.gone && el.dataset.f === '0') paint(el); });
  }, 50);
  // 0.75 to 1.35s: readouts drop out at random, roles stay
  setTimeout(function () {
    var order = cells.slice().sort(function () { return Math.random() - .5; });
    var step = 600 / order.length;
    order.forEach(function (el, i) {
      setTimeout(function () {
        el.dataset.gone = '1';
        var t = el.textContent;
        el.textContent = t.replace(/\S/g, function (ch) { return Math.random() < .5 ? ' ' : ch; });
        setTimeout(function () { el.textContent = ''; }, 90 + Math.random() * 120);
      }, i * step);
    });
  }, 750);
  // 1.2s: name flips in, role line rises, roles and sheet fade
  setTimeout(function () {
    root.classList.remove('intro');
    Decode.flip(document.querySelector('.reel-name'), 0);
    var role = document.querySelector('.reel-role');
    if (role) role.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 350, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  }, 1200);
  setTimeout(function () { clearInterval(live); sheet.classList.add('rc-out'); }, 1500);
  setTimeout(function () { sheet.remove(); }, 2600);
})();

// Intro variants B (terminal readout) and C (slate), for comparison
(function () {
  var root = document.documentElement, reel = document.querySelector('.reel');
  if (!reel || !root.classList.contains('intro')) return;
  var variant = (location.search.match(/intro=([abc])/) || [])[1] || 'a';
  if (variant === 'a') return;
  try { sessionStorage.setItem('intro-done', '1'); } catch (e) {}
  function p2(n) { return ('0' + n).slice(-2); }
  var t0 = performance.now();
  function tc() { var f = Math.floor((performance.now() - t0) / 40); return p2(0) + ':' + p2(0) + ':' + p2(Math.floor(f / 25) % 60) + ':' + p2(f % 25); }
  var box = document.createElement('div');
  box.className = 'reel-code mono intro-' + variant;
  box.setAttribute('aria-hidden', 'true');
  reel.appendChild(box);
  function finish(at) {
    setTimeout(function () {
      root.classList.remove('intro');
      Decode.flip(document.querySelector('.reel-name'), 0);
      var role = document.querySelector('.reel-role');
      if (role) role.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 350, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    }, at);
    setTimeout(function () { box.classList.add('rc-out'); }, at + 300);
    setTimeout(function () { box.remove(); }, at + 1400);
  }
  if (variant === 'b') {
    // Terminal: lines type in at the bottom left, values tick, then clear to leave the roles
    var load = 0;
    var lines = [
      function () { return 'Loading showreel ' + ('00' + Math.min(100, load | 0)).slice(-3) + '%'; },
      function () { return 'TC ' + tc() + '  ·  25 fps'; },
      function () { return '34 campaigns  ·  2018 to 2026'; },
      function () { return 'London  ·  51.5072 N  0.1276 W'; }
    ];
    var els = lines.map(function () { var d = document.createElement('div'); d.className = 'tl'; box.appendChild(d); return d; });
    var roles = document.createElement('div'); roles.className = 'rc-word tl-roles'; roles.textContent = 'Production Manager  ·  Producer  ·  Fixer'; roles.style.visibility = 'hidden'; box.appendChild(roles);
    var shown = 0;
    var tick = setInterval(function () { load = Math.min(100, load + 8 + Math.random() * 6); els.forEach(function (el, i) { if (i < shown && !el.dataset.gone) el.textContent = lines[i](); }); }, 45);
    els.forEach(function (el, i) { setTimeout(function () { shown = i + 1; el.textContent = lines[i](); }, i * 160); });
    setTimeout(function () { roles.style.visibility = ''; Decode.decode(roles, 0, 380); }, 700);
    setTimeout(function () { els.forEach(function (el, i) { setTimeout(function () { el.dataset.gone = 1; el.classList.add('tl-gone'); }, i * 70); }); }, 1050);
    setTimeout(function () { clearInterval(tick); }, 1500);
    finish(1250);
  } else {
    // Slate: a clapperboard readout in the centre decodes, then collapses to the roles
    var rows = [['Prod', 'Kevin Cheung'], ['Roll', '034'], ['Scene', '01'], ['Take', '01'], ['Date', '2018 to 2026'], ['TC', '']];
    var grid = document.createElement('div'); grid.className = 'slate';
    rows.forEach(function (r) {
      var k = document.createElement('span'); k.className = 'sl-k'; k.textContent = r[0];
      var v = document.createElement('span'); v.className = 'sl-v'; v.textContent = r[1] || tc();
      grid.appendChild(k); grid.appendChild(v);
    });
    box.appendChild(grid);
    var tcEl = grid.querySelectorAll('.sl-v')[5];
    var tick2 = setInterval(function () { tcEl.textContent = tc(); }, 40);
    [].slice.call(grid.querySelectorAll('.sl-v')).slice(0, 5).forEach(function (v, i) { Decode.decode(v, i * 70, 420); });
    var roles2 = document.createElement('div'); roles2.className = 'rc-word sl-roles'; roles2.textContent = 'Production Manager  ·  Producer  ·  Fixer'; roles2.style.visibility = 'hidden'; box.appendChild(roles2);
    setTimeout(function () { grid.classList.add('sl-out'); roles2.style.visibility = ''; Decode.decode(roles2, 0, 380); }, 850);
    setTimeout(function () { clearInterval(tick2); }, 1400);
    finish(1250);
  }
})();

// 2. Campaign pages: the client name flips in and the details decode out of digits
(function () {
  var page = document.querySelector('.job-page');
  if (!page) return;
  var head = page.querySelector('.job-head');
  function run() {
    Decode.flip(head.querySelector('.job-title'), 150);
    Decode.decode(head.querySelector('.mono'), 100, 650);
    Decode.decode(head.querySelector('.job-meta'), 350, 800);
  }
  var ran = false;
  function once() { if (!ran) { ran = true; run(); } }
  addEventListener('pagereveal', once);
  setTimeout(once, 60);   // browsers without pagereveal
})();

// ---- On-set details ----
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hover = matchMedia('(hover: hover)').matches;
  function p2(n) { return ('0' + Math.floor(n)).slice(-2); }
  function tcOf(sec) { var f = Math.floor(sec * 25); return p2(f / 90000) + ':' + p2((f / 1500) % 60) + ':' + p2((f / 25) % 60) + ':' + p2(f % 25); }

  // 6. Live London clock in the footer
  var clock = document.querySelector('.clock-t');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    var tickC = function () {
      var parts = fmt.formatToParts(new Date()), h = '', mi = '', z = '';
      parts.forEach(function (p) { if (p.type === 'hour') h = p.value; if (p.type === 'minute') mi = p.value; if (p.type === 'timeZoneName') z = p.value; });
      if (z === 'GMT+1') z = 'BST';
      clock.innerHTML = h + '<span class="clock-colon">:</span>' + mi + ' ' + z;
    };
    tickC(); setInterval(tickC, 15000);
  }

  // 7. Click an email to copy it (on a computer); a quick "Copied" decodes in its place
  if (hover && navigator.clipboard) document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
    a.setAttribute('title', 'Click to copy');
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;   // modifier click still opens your mail app
      e.preventDefault();
      var addr = a.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
      navigator.clipboard.writeText(addr).then(function () {
        if (a.dataset.copying) return; a.dataset.copying = '1';
        var keep = a.textContent, w = a.getBoundingClientRect().width;
        a.style.display = 'inline-block'; a.style.minWidth = w + 'px';
        a.textContent = 'Copied to clipboard';
        if (window.Decode) Decode.decode(a, 0, 300);
        setTimeout(function () { a.textContent = keep; a.style.minWidth = ''; a.style.display = ''; delete a.dataset.copying; }, 1600);
      });
    });
  });
})();
