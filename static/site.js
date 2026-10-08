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
