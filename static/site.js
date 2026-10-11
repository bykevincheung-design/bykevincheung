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
    if (film) {
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

// Cinema film: the cover grows to fill the screen, then the film plays. Esc, X or a scroll closes it.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.film-cinema').forEach(function (box) {
    var cover = box.querySelector('.cine-cover');
    cover.addEventListener('click', function () { open(box); });
  });
  function fit() {
    var vw = innerWidth, vh = innerHeight, w = vw, h = vw * 9 / 16;
    if (h > vh) { h = vh; w = vh * 16 / 9; }
    return { x: (vw - w) / 2, y: (vh - h) / 2, w: w, h: h };
  }
  function open(box) {
    var r = box.getBoundingClientRect(), f = fit();
    var layer = document.createElement('div');
    layer.className = 'cine-layer';
    layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Film');
    var stage = document.createElement('div');
    stage.className = 'cine-stage';
    stage.style.cssText = 'left:' + f.x + 'px;top:' + f.y + 'px;width:' + f.w + 'px;height:' + f.h + 'px';
    var img = box.querySelector('.cine-cover img').cloneNode();
    stage.appendChild(img);
    var close = document.createElement('button');
    close.className = 'cine-close'; close.type = 'button'; close.setAttribute('aria-label', 'Close film'); close.textContent = '×';
    var hint = document.createElement('div'); hint.className = 'cine-hint'; hint.textContent = 'Esc to close';
    layer.appendChild(stage); layer.appendChild(close); layer.appendChild(hint);
    document.body.appendChild(layer);
    if (window.lenis) window.lenis.stop();
    document.documentElement.style.overflow = 'hidden';
    var loop = box.querySelector('.cine-loop'); if (loop) loop.pause();
    var from = 'translate(' + (r.left - f.x) + 'px,' + (r.top - f.y) + 'px) scale(' + (r.width / f.w) + ',' + (r.height / f.h) + ')';
    var dur = reduce ? 1 : 750, ease = 'cubic-bezier(.7,0,.2,1)';
    requestAnimationFrame(function () { layer.classList.add('on'); });
    stage.animate([{ transform: from }, { transform: 'none' }], { duration: dur, easing: ease, fill: 'both' }).finished.then(function () {
      var ifr = document.createElement('iframe');
      ifr.src = box.dataset.play; ifr.title = 'Film';
      ifr.allow = 'autoplay; fullscreen; picture-in-picture'; ifr.setAttribute('allowfullscreen', '');
      ifr.addEventListener('load', function () { stage.classList.add('ready'); });
      stage.appendChild(ifr);
      close.focus();
    });
    var closing = false;
    function shut() {
      if (closing) return; closing = true;
      var r2 = box.getBoundingClientRect(), f2 = fit();
      var to = 'translate(' + (r2.left - f2.x) + 'px,' + (r2.top - f2.y) + 'px) scale(' + (r2.width / f2.w) + ',' + (r2.height / f2.h) + ')';
      stage.classList.remove('ready');
      var ifr = stage.querySelector('iframe'); if (ifr) ifr.remove();
      layer.classList.remove('on');
      stage.animate([{ transform: 'none' }, { transform: to }], { duration: reduce ? 1 : 650, easing: ease, fill: 'both' }).finished.then(function () {
        layer.remove();
        document.documentElement.style.overflow = '';
        if (window.lenis) window.lenis.start();
        if (loop) loop.play().catch(function () {});
        box.querySelector('.cine-cover').focus({ preventScroll: true });
      });
      removeEventListener('keydown', onKey); layer.removeEventListener('wheel', onWheel);
    }
    function onKey(ev) { if (ev.key === 'Escape') shut(); }
    var wheelAcc = 0;
    function onWheel(ev) { wheelAcc += Math.abs(ev.deltaY); if (wheelAcc > 60) shut(); }
    close.addEventListener('click', shut);
    layer.addEventListener('click', function (ev) { if (ev.target === layer) shut(); });
    addEventListener('keydown', onKey);
    layer.addEventListener('wheel', onWheel, { passive: true });
  }
})();
