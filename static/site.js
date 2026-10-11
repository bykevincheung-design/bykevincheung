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

  // 1. Tile image and name morph into the campaign page (and back)
  function nameTile(tile, on) {
    var m = tile && tile.querySelector('.tile-media'), c = tile && tile.querySelector('.tile-client');
    if (!m) return;
    m.style.viewTransitionName = on ? 'job-media' : '';
    if (c) c.style.viewTransitionName = on ? 'job-title' : '';
  }
  document.querySelectorAll('a.tile').forEach(function (t) {
    t.addEventListener('click', function () { nameTile(t, true); });
  });
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition || !window.navigation || !navigation.activation || !navigation.activation.from) return;
    var from = new URL(navigation.activation.from.url).pathname;
    var tile = document.querySelector('a.tile[href="' + from + '"]');
    if (!tile) return;
    tile.scrollIntoView({ block: 'center' });
    nameTile(tile, true);
    e.viewTransition.finished.finally(function () { nameTile(tile, false); });
  });
  window.addEventListener('pageshow', function () {
    document.querySelectorAll('a.tile').forEach(function (t) { nameTile(t, false); });
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
  var lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true, anchors: { offset: -72 } });
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
