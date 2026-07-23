/* Borneo Digital Capital - article page motion (thesis / market-view /
   press-release). Ported from the page's former framework component: drifting
   star field plus scroll-reveal on [data-reveal]. Runs standalone. */
(function () {
  'use strict';

  function startStars(cv) {
    var ctx = cv.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, cx = 0, cy = 0, stars = [], raf = 0, t = 0;
    var MAXZ = 1.7;
    var spawn = function (s) {
      s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1;
      s.seed = Math.random() * 6.28; s.gold = Math.random() < 0.16; return s;
    };
    var resize = function () {
      W = window.innerWidth; H = window.innerHeight; cx = W / 2; cy = H / 2;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.max(120, Math.min(300, Math.round((W * H) / 6000)));
      stars = [];
      for (var i = 0; i < n; i++) { var s = spawn({}); s.z = 0.05 + Math.random() * MAXZ; stars.push(s); }
    };
    resize();
    window.addEventListener('resize', resize);
    var tick = function () {
      t += 0.016;
      var f = Math.min(W, H) * 0.5;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.z -= 0.0011;
        if (s.z < 0.05) { spawn(s); s.z = MAXZ; }
        var k = f / s.z;
        var sx = cx + s.x * k, sy = cy + s.y * k;
        var depth = 1 - s.z / MAXZ;
        var r = 0.4 + depth * 2.1;
        var tw = 0.6 + 0.4 * Math.sin(t * 2 + s.seed);
        var a = Math.min(1, (0.16 + depth * 0.6) * tw);
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832);
        ctx.fillStyle = (s.gold ? 'rgba(236,208,128,' : 'rgba(226,231,240,') + a + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
  }

  function init() {
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cv = document.getElementById('stars');
    if (cv && !reduce) startStars(cv);

    var targets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (reduce) return;

    var show = function (el) { el.style.opacity = '1'; el.style.transform = 'none'; };
    targets.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition = 'opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1)';
    });

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });

    var sweep = function () {
      var vh = window.innerHeight || 800;
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.94 && r.bottom > 0) show(el);
      });
    };
    requestAnimationFrame(sweep);
    window.addEventListener('scroll', sweep, { passive: true });
    setTimeout(function () { targets.forEach(show); }, 1600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
