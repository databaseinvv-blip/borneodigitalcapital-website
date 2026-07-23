// Snapshot helper, loaded into a _capture_*.html page during un-bundling.
// Normalises the framework's rendered DOM into plain static markup and POSTs
// it to the capture server. See tools/capture_server.py.
window.__grab = function (name) {
  if (window.__CAPTURE__ !== true) return Promise.resolve('ERROR: not a capture build');
  var root = document.getElementById('dc-root').cloneNode(true);

  // <image-slot> is a shadow-DOM wrapper; a plain absolutely-positioned
  // cover-fit <img> renders identically inside the same relative parent.
  root.querySelectorAll('image-slot').forEach(function (s) {
    var img = document.createElement('img');
    img.setAttribute('src', s.getAttribute('src'));
    img.setAttribute('alt', s.getAttribute('placeholder') || '');
    // deliberately NOT loading="lazy": these sit inside a transformed,
    // position:sticky scene where the lazy heuristic does not fire, leaving
    // the photos permanently blank. The originals loaded eagerly too.
    img.setAttribute('decoding', 'async');
    img.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;');
    s.parentNode.replaceChild(img, s);
  });

  // the bundler served manifest images as blob: URLs - point back at the file
  root.querySelectorAll('[src^="blob:"]').forEach(function (e) {
    e.setAttribute('src', 'images/BDC-logo.png');
  });
  root.querySelectorAll('script').forEach(function (e) { e.remove(); });
  root.querySelectorAll('*').forEach(function (e) {
    ['data-dc-tpl', 'data-filled', 'data-dc-atomics', 'hint-placeholder-count',
     'hint-placeholder-val', 'data-sc-name'].forEach(function (a) { e.removeAttribute(a); });
  });

  // style-hover is compiled into .scpN:hover rules via CSSOM, so these exist
  // only in the live stylesheet - not in any <style> tag's text.
  var hover = [];
  for (var i = 0; i < document.styleSheets.length; i++) {
    try {
      var rs = document.styleSheets[i].cssRules;
      for (var j = 0; j < rs.length; j++) {
        var t = rs[j].cssText;
        if (/^\.scp\d+:hover/.test(t)) hover.push(t);
      }
    } catch (e) { /* cross-origin sheet, nothing we need */ }
  }

  var counts = {};
  root.querySelectorAll('*').forEach(function (e) {
    counts[e.tagName] = (counts[e.tagName] || 0) + 1;
  });

  return fetch('/save?name=' + name, {
    method: 'POST',
    body: JSON.stringify({
      html: root.innerHTML,
      hover: hover.join('\n'),
      counts: counts,
      text: root.textContent.replace(/\s+/g, ' ').trim(),
    }),
  }).then(function (r) { return r.text(); });
};
