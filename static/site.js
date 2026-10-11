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
