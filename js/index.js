/* Borneo Digital Capital - homepage motion.
   Ported verbatim from the component that used to run inside the page's
   framework, minus the framework: same scroll-scrubbed pinned scenes, node
   field, magnetic buttons and custom cursor. Runs standalone. */
(function () {
  'use strict';

  function startNet(cv) {
    var ctx = cv.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, cx = 0, cy = 0, stars = [], raf = 0, mx = -1e4, my = -1e4, t = 0;
    var lastScroll = window.scrollY || window.pageYOffset || 0, flow = 0;
    var MAXZ = 1.7;
    var spawn = function (s) {
      s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1;
      s.seed = Math.random() * 6.28; s.gold = Math.random() < 0.18;
      s.px = null; s.py = null; return s;
    };
    var resize = function () {
      W = window.innerWidth; H = window.innerHeight; cx = W / 2; cy = H / 2;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.max(140, Math.min(340, Math.round((W * H) / 5400)));
      stars = [];
      for (var i = 0; i < n; i++) { var s = spawn({}); s.z = 0.05 + Math.random() * MAXZ; stars.push(s); }
    };
    var onMove = function (e) { mx = e.clientX; my = e.clientY; };
    var onLeave = function () { mx = -1e4; my = -1e4; };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('blur', onLeave);
    var tick = function () {
      t += 0.016;
      var sy = window.scrollY || window.pageYOffset || 0;
      flow += ((sy - lastScroll) - flow) * 0.18;
      lastScroll = sy;
      var speed = 0.0015 + flow * 0.00045;   // idle forward drift + scroll-driven warp
      var f = Math.min(W, H) * 0.5;
      var ox = (mx > -1e3 ? (mx - cx) / cx : 0) * 16;
      var oy = (my > -1e3 ? (my - cy) / cy : 0) * 16;
      ctx.clearRect(0, 0, W, H);
      var streaking = Math.abs(flow) > 2.2;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.z -= speed;
        if (s.z < 0.05) { spawn(s); s.z = MAXZ; }
        else if (s.z > MAXZ) { spawn(s); s.z = 0.05; }
        var k = f / s.z;
        var sx = cx + s.x * k + ox / s.z;
        var syy = cy + s.y * k + oy / s.z;
        var depth = 1 - s.z / MAXZ;
        var r = 0.4 + depth * 2.5;
        var tw = 0.6 + 0.4 * Math.sin(t * 2 + s.seed);
        var a = Math.min(1, (0.16 + depth * 0.66) * tw);
        if (streaking && s.px != null && sx > -60 && sx < W + 60 && syy > -60 && syy < H + 60) {
          ctx.strokeStyle = (s.gold ? 'rgba(232,204,122,' : 'rgba(226,231,240,') + (a * 0.55) + ')';
          ctx.lineWidth = Math.max(0.6, r * 0.85);
          ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(sx, syy); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(sx, syy, r, 0, 6.2832);
        ctx.fillStyle = (s.gold ? 'rgba(236,208,128,' : 'rgba(233,237,242,') + a + ')';
        ctx.fill();
        if (depth > 0.72) {
          ctx.beginPath(); ctx.arc(sx, syy, r * 2.6, 0, 6.2832);
          ctx.fillStyle = (s.gold ? 'rgba(230,201,118,' : 'rgba(220,226,234,') + (a * 0.13) + ')';
          ctx.fill();
        }
        s.px = sx; s.py = syy;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
  }

  function mobileNav() {
    var btn = document.getElementById('bdgNavBtn');
    var header = btn && btn.closest('header');
    var nav = header && header.querySelector('nav');
    if (!btn || !nav) return;
    nav.id = nav.id || 'bdgNav';
    btn.setAttribute('aria-controls', nav.id);
    var close = function () {
      nav.classList.remove('bdg-open');
      btn.setAttribute('aria-expanded', 'false');
    };
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var open = nav.classList.toggle('bdg-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) close(); });
  }

  function init() {
    mobileNav();

    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    var reveal = function (el) {
      if (el._shown) return;
      el._shown = true;
      el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none';
    };

    // Pinned scenes: content scrubbed in by scroll progress
    var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
    var sceneItemSet = new Set();
    var sceneData = scenes.map(function (sc) {
      var items = Array.prototype.slice.call(sc.querySelectorAll('[data-decode],h2,p,[data-reveal]'));
      items.forEach(function (el) { sceneItemSet.add(el); });
      return { sc: sc, items: items };
    });
    var flat = Array.prototype.slice
      .call(document.querySelectorAll('h1,h2,[data-reveal],[data-decode]'))
      .filter(function (el) { return !sceneItemSet.has(el); });

    // Phones take the same flattened path as prefers-reduced-motion: the
    // pinned scroll-scrub does not work on a small screen, and nothing may be
    // left hidden at opacity 0.
    function goFlat() {
      scenes.forEach(function (sc) {
        sc.style.height = 'auto';
        var pin = sc.querySelector('[data-pin]');
        if (pin) { pin.style.position = 'static'; pin.style.minHeight = '0'; }
      });
    }

    if (reduce) { goFlat(); return; }
    if (window.innerWidth <= 900) {
      goFlat();
      // a tablet rotated into landscape should get the full treatment
      window.addEventListener('resize', function () {
        if (window.innerWidth > 900) goRich();
      });
      return;
    }
    goRich();

    function goRich() {
      if (goRich.done) return;
      goRich.done = true;

    sceneData.forEach(function (d) {
      d.items.forEach(function (el) {
        el.style.opacity = '0';
        if (el.hasAttribute('data-reveal')) {
          el.style.transform = 'translateY(34px) scale(.98)';
          el.style.filter = 'blur(8px)';
        } else {
          el.style.transform = 'translateY(18px)';
        }
      });
    });

    var layoutScenes = function () {
      var vh = window.innerHeight || 800;
      sceneData.forEach(function (d) {
        var pin = d.sc.querySelector('[data-pin]');
        var panel = pin ? pin.firstElementChild : null;
        d.pin = pin; d.panel = panel;
        if (pin) {
          pin.style.position = 'sticky'; pin.style.top = '0';
          pin.style.height = vh + 'px'; pin.style.minHeight = '0';
          pin.style.display = 'block'; pin.style.overflow = 'hidden';
        }
        d.panelH = panel ? panel.offsetHeight : 0;
        d.maxPan = Math.max(0, d.panelH - vh);   // how far the content must pan through the pin
        d.base = d.maxPan > 0 ? 0 : Math.round((vh - d.panelH) / 2);
        d.sc.style.height = Math.round(vh + Math.max(vh * 0.85, d.maxPan + vh * 0.5)) + 'px';
        if (panel) panel.style.willChange = 'transform';
      });
    };

    var updateScenes = function () {
      var vh = window.innerHeight || 800;
      sceneData.forEach(function (d) {
        var r = d.sc.getBoundingClientRect();
        var total = d.sc.offsetHeight - vh;
        var p = total > 4 ? clamp(-r.top / total, 0, 1) : (r.top < vh ? 1 : 0);
        if (d.panel) d.panel.style.transform = 'translateY(' + (d.base - d.maxPan * easeOut(p)) + 'px)';
        var N = d.items.length || 1;
        d.items.forEach(function (el, i) {
          var start = (i / N) * 0.68;
          var local = easeOut(clamp((p - start) / 0.2, 0, 1));
          var card = el.hasAttribute('data-reveal');
          if (local >= 0.999) { el.style.opacity = ''; el.style.transform = ''; el.style.filter = ''; }
          else {
            el.style.opacity = String(local);
            var ty = (card ? 30 : 16) * (1 - local);
            el.style.transform = card
              ? 'translateY(' + ty + 'px) scale(' + (0.985 + 0.015 * local) + ')'
              : 'translateY(' + ty + 'px)';
            if (card) el.style.filter = 'blur(' + (7 * (1 - local)) + 'px)';
          }
        });
      });
    };

    var seen = new Map();
    flat.forEach(function (el) {
      var pnt = el.parentElement;
      var idx = seen.get(pnt) || 0;
      seen.set(pnt, idx + 1);
      var dl = Math.min(idx, 6) * 65;
      el.style.opacity = '0';
      if (el.hasAttribute('data-reveal')) {
        el.style.transform = 'translateY(30px) scale(.985)';
        el.style.filter = 'blur(7px)';
        el.style.transition = 'opacity .7s cubic-bezier(.2,.7,.2,1) ' + dl + 'ms, transform .8s cubic-bezier(.2,.7,.2,1) ' + dl + 'ms, filter .8s ease ' + dl + 'ms';
      } else {
        el.style.transform = 'translateY(14px)';
        el.style.transition = 'opacity .55s ease ' + dl + 'ms, transform .55s ease ' + dl + 'ms';
      }
    });

    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    flat.forEach(function (el) { io.observe(el); });

    var sweepFlat = function () {
      var vh = window.innerHeight || 800;
      flat.forEach(function (el) {
        if (el._shown) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.94 && r.bottom > 0) reveal(el);
      });
    };

    layoutScenes();
    var loop = function () { updateScenes(); sweepFlat(); requestAnimationFrame(loop); };
    loop();
    window.addEventListener('resize', layoutScenes);
    setTimeout(function () { flat.forEach(reveal); }, 1600);

    // Node-network canvas in the hero
    var cv = document.getElementById('bdgnet');
    if (cv) startNet(cv);

    // Custom cursor + magnetic buttons (fine pointer only)
    if (matchMedia('(pointer:fine)').matches) {
      var ring = document.createElement('div');
      ring.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;margin:-15px 0 0 -15px;border:1.5px solid rgba(201,162,75,.7);border-radius:50%;pointer-events:none;z-index:99999;background-color:transparent;transition:width .22s,height .22s,margin .22s,background-color .22s;will-change:transform;';
      var dot = document.createElement('div');
      dot.style.cssText = 'position:fixed;left:0;top:0;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;background:#e6c976;border-radius:50%;pointer-events:none;z-index:99999;will-change:transform;';
      document.body.appendChild(ring);
      document.body.appendChild(dot);
      document.body.style.cursor = 'none';
      var tx = window.innerWidth / 2, ty = window.innerHeight / 2, rx = tx, ry = ty;
      window.addEventListener('mousemove', function (e) {
        tx = e.clientX; ty = e.clientY;
        dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      });
      var cursorLoop = function () {
        rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
        ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
        requestAnimationFrame(cursorLoop);
      };
      cursorLoop();
      var grow = function () {
        ring.style.width = '54px'; ring.style.height = '54px';
        ring.style.margin = '-27px 0 0 -27px';
        ring.style.backgroundColor = 'rgba(201,162,75,.1)';
      };
      var shrink = function () {
        ring.style.width = '30px'; ring.style.height = '30px';
        ring.style.margin = '-15px 0 0 -15px';
        ring.style.backgroundColor = 'transparent';
      };
      document.querySelectorAll('a,button,[data-magnetic]').forEach(function (el) {
        el.addEventListener('mouseenter', grow);
        el.addEventListener('mouseleave', shrink);
      });
      document.querySelectorAll('[data-magnetic]').forEach(function (el) {
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          el.style.transform = 'translate(' +
            (e.clientX - (r.left + r.width / 2)) * 0.3 + 'px,' +
            (e.clientY - (r.top + r.height / 2)) * 0.45 + 'px)';
        });
        el.addEventListener('mouseleave', function () { el.style.transform = 'translate(0,0)'; });
      });
    }
    }  // goRich
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
