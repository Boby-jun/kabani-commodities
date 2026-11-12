function toggleMenu() {
  document.getElementById('hamburger').classList.toggle('open');
  document.getElementById('mobile-menu').classList.toggle('open');
}
function closeMenu() {
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('mobile-menu').classList.remove('open');
}
function handleContactForm(e) {
  e.preventDefault();
  document.getElementById('form-success').style.display = 'block';
  e.target.reset();
}
(function preselectCommodity() {
  var wanted = new URLSearchParams(location.search).get('commodity');
  var role = new URLSearchParams(location.search).get('role');
  if (role) {
    var radios = document.querySelectorAll('input[name="role"]');
    for (var r = 0; r < radios.length; r++) if (radios[r].value.toLowerCase() === role.toLowerCase()) radios[r].checked = true;
  }
  if (!wanted) return;
  var boxes = document.querySelectorAll('input[name="commodity"]');
  for (var i = 0; i < boxes.length; i++) {
    if (boxes[i].value.toLowerCase() === wanted.toLowerCase()) { boxes[i].checked = true; break; }
  }
})();

/* Edge dividers rise into place once, as they scroll into view */
(function scaleReveal() {
  var els = document.querySelectorAll('.edge');
  if (!els.length || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { threshold: 0.5 });
  els.forEach(function (el) { el.classList.add('is-armed'); io.observe(el); });
})();

/* ---------- shared world-map view: pan, zoom, pick a country ---------- */
function createMapView(stage, svg, o) {
  var W = +svg.dataset.w, H = +svg.dataset.h, PX = +svg.dataset.pad, MAXZ = 16;
  var WW = W + 2 * PX, HH = WW * H / W, PY = (HH - H) / 2; // whole-world view, with a margin all round
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vb = { x: -PX, y: -PY, w: WW, h: HH }, anim = null, moved = false;

  function clamp(v) {
    v.w = Math.min(WW, Math.max(W / MAXZ, v.w)); v.h = v.w * H / W;
    v.x = Math.min(W + PX - v.w, Math.max(-PX, v.x)); v.y = Math.min(H + PY - v.h, Math.max(-PY, v.y));
    return v;
  }
  function apply() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    var k = vb.w / W; // pins keep a constant on-screen size
    var fade = Math.min(1, Math.max(0, (vb.w - W / 6) / (W / 6)));
    var list = svg.querySelectorAll('.pin');
    for (var i = 0; i < list.length; i++) { list[i].setAttribute('r', Math.max((+list[i].getAttribute('data-r') || 3) * k, 0.4)); list[i].style.opacity = fade; }
  }
  function ease(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function go(to, ms) {
    to = clamp({ x: to.x, y: to.y, w: to.w, h: to.h });
    if (anim) cancelAnimationFrame(anim);
    if (reduce || !ms) { vb = to; apply(); return; }
    var from = { x: vb.x, y: vb.y, w: vb.w, h: vb.h }, t0 = null;
    (function step(t) {
      if (t0 === null) t0 = t;
      var k = ease((t - t0) / ms);
      vb = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, w: from.w + (to.w - from.w) * k, h: from.h + (to.h - from.h) * k };
      apply();
      if (k < 1) anim = requestAnimationFrame(step);
    })(performance.now());
  }
  function zoomAt(f, cx, cy, ms) { // f > 1 zooms in; cx, cy are 0..1 within the stage
    var nw = vb.w / f, nh = nw * H / W;
    go({ x: vb.x + (vb.w - nw) * cx, y: vb.y + (vb.h - nh) * cy, w: nw, h: nh }, ms);
  }
  function flyTo(name) {
    var p = svg.querySelector('path[data-country="' + name + '"]');
    if (!p || !p.dataset.bbox) return;
    var b = p.dataset.bbox.split(' ').map(Number), bw = b[2] - b[0], bh = b[3] - b[1];
    var w = Math.max(bw * 2.4, bh * 2.4 * W / H, W / 9), h = w * H / W;
    go({ x: (b[0] + b[2]) / 2 - w / 2, y: (b[1] + b[3]) / 2 - h / 2, w: w, h: h }, 700);
  }
  function home() { go({ x: -PX, y: -PY, w: WW, h: HH }, 600); }

  var zi = stage.querySelector('.mz-in'), zo = stage.querySelector('.mz-out'), zr = stage.querySelector('.mz-reset');
  if (zi) zi.addEventListener('click', function () { zoomAt(1.7, 0.5, 0.5, 350); });
  if (zo) zo.addEventListener('click', function () { zoomAt(1 / 1.7, 0.5, 0.5, 350); });
  if (zr) zr.addEventListener('click', function () { if (o.onReset) o.onReset(); else home(); });

  svg.addEventListener('click', function (e) {
    if (moved) return;
    var p = e.target.closest && e.target.closest(o.pick);
    if (p) o.onPick(p.getAttribute('data-country'));
  });
  svg.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var p = e.target.closest && e.target.closest(o.pick);
    if (p) { e.preventDefault(); o.onPick(p.getAttribute('data-country')); }
  });

  // drag to pan, pinch to zoom
  var ptrs = {}, startVB = null, startPt = null, pinch0 = null;
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.map-controls')) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs);
    if (ids.length === 1) { moved = false; startVB = { x: vb.x, y: vb.y }; startPt = { x: e.clientX, y: e.clientY }; }
    if (ids.length === 2) { var a = ptrs[ids[0]], c = ptrs[ids[1]]; pinch0 = { d: Math.hypot(a.x - c.x, a.y - c.y), w: vb.w }; }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs), rect = stage.getBoundingClientRect();
    if (ids.length === 2 && pinch0) {
      var a = ptrs[ids[0]], c = ptrs[ids[1]], d = Math.hypot(a.x - c.x, a.y - c.y);
      var nw = pinch0.w * pinch0.d / d, mx = ((a.x + c.x) / 2 - rect.left) / rect.width, my = ((a.y + c.y) / 2 - rect.top) / rect.height;
      var nh = nw * H / W; moved = true;
      if (anim) cancelAnimationFrame(anim);
      vb = clamp({ x: vb.x + (vb.w - nw) * mx, y: vb.y + (vb.h - nh) * my, w: nw, h: nh }); apply();
      return;
    }
    if (ids.length !== 1 || !startPt) return;
    var dx = e.clientX - startPt.x, dy = e.clientY - startPt.y;
    if (!moved && Math.hypot(dx, dy) < 5) return;
    if (!moved) { moved = true; stage.classList.add('is-dragging'); }
    if (anim) cancelAnimationFrame(anim);
    vb = clamp({ x: startVB.x - dx * vb.w / rect.width, y: startVB.y - dy * vb.w / rect.width, w: vb.w, h: vb.h }); apply();
  });
  function up(e) {
    delete ptrs[e.pointerId]; pinch0 = null; stage.classList.remove('is-dragging');
    if (Object.keys(ptrs).length === 0) setTimeout(function () { moved = false; }, 0);
  }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return; // plain scrolling keeps scrolling the page
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.01), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 0);
  }, { passive: false });
  stage.addEventListener('keydown', function (e) {
    if (e.target !== stage) return;
    var step = vb.w * 0.15, k = e.key;
    if (k === '+' || k === '=') zoomAt(1.5, 0.5, 0.5, 250);
    else if (k === '-' || k === '_') zoomAt(1 / 1.5, 0.5, 0.5, 250);
    else if (k === '0') { if (o.onReset) o.onReset(); else home(); }
    else if (k === 'ArrowLeft') go({ x: vb.x - step, y: vb.y, w: vb.w, h: vb.h }, 200);
    else if (k === 'ArrowRight') go({ x: vb.x + step, y: vb.y, w: vb.w, h: vb.h }, 200);
    else if (k === 'ArrowUp') go({ x: vb.x, y: vb.y - step, w: vb.w, h: vb.h }, 200);
    else if (k === 'ArrowDown') go({ x: vb.x, y: vb.y + step, w: vb.w, h: vb.h }, 200);
    else return;
    e.preventDefault();
  });
  apply();
  return { flyTo: flyTo, home: home, refresh: apply };
}

/* ---------- home page: "Where we source" ---------- */
(function sourcingMap() {
  var stage = document.getElementById('map-stage'), svg = document.getElementById('world-map'), detail = document.getElementById('map-detail');
  if (!stage || !svg || !detail) return;
  var sources = JSON.parse(document.getElementById('map-sources').textContent);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, active = null, view;

  function select(name, fly) {
    active = name;
    svg.querySelectorAll('[data-country]').forEach(function (e) {
      var on = !!name && e.getAttribute('data-country') === name;
      e.classList.toggle('is-active', on);
      if (e.hasAttribute('aria-pressed')) e.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (!name) { detail.hidden = true; return; }
    document.getElementById('md-title').textContent = name;
    var items = document.getElementById('md-items'); items.textContent = '';
    (sources[name] || []).forEach(function (c) {
      var a = document.createElement('a'); a.className = 'source-chip'; a.href = c.slug + '.html'; a.textContent = c.name; items.appendChild(a);
    });
    document.getElementById('md-market').href = 'market.html?country=' + encodeURIComponent(name) + '#map';
    detail.hidden = false;
    if (fly) view.flyTo(name);
    var r = detail.getBoundingClientRect(); // keep the map in view, bring the result into view
    if (r.bottom > window.innerHeight - 20) detail.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }
  function reset() { select(null); view.home(); }

  view = createMapView(stage, svg, { pick: 'path.is-source', onPick: function (n) { if (n === active) reset(); else select(n, true); }, onReset: reset });
  document.getElementById('map-showall').addEventListener('click', reset);
})();

/* ---------- supply & demand page ---------- */
var MarketStore = (function () {
  var list = [], subs = [];
  return {
    get: function () { return list; },
    set: function (l) { list = l; subs.forEach(function (f) { f(list); }); },
    on: function (f) { subs.push(f); f(list); }
  };
})();

/* The commodity slicer's selection, shared by both lists and the map. Nothing selected means everything. */
var MarketFilter = (function () {
  var sel = {}, subs = [];
  return {
    has: function (slug) { return Object.keys(sel).length === 0 || !!sel[slug]; },
    list: function () { return Object.keys(sel); },
    set: function (slugs) { sel = {}; slugs.forEach(function (s) { sel[s] = true; }); subs.forEach(function (f) { f(); }); },
    on: function (f) { subs.push(f); }
  };
})();

(function marketPage() {
  var tabs = document.querySelectorAll('.seg [role="tab"]'), dataEl = document.getElementById('market-data');
  if (!tabs.length || !dataEl) return;
  var mdata = JSON.parse(dataEl.textContent), byslug = {}, topics = mdata.topics || [];
  mdata.commodities.forEach(function (c) { byslug[c.slug] = c.name; });
  MarketStore.set(mdata.listings || []);

  function show(which) {
    tabs.forEach(function (t) {
      var on = t.id === 'tab-' + which;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + which);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(t.id.replace('tab-', '')); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); show(n.id.replace('tab-', '')); e.preventDefault();
    });
  });
  if (location.hash === '#demand' || location.hash === '#map') show(location.hash.slice(1));

  /* --- commodity slicer --- */
  var btn = document.getElementById('slicer-btn'), panel = document.getElementById('slicer-panel'), clearBtn = document.getElementById('slicer-clear');
  var labelEl = btn.querySelector('.slicer-label');
  var boxes = panel.querySelectorAll('input[type="checkbox"][value]'), topicBoxes = panel.querySelectorAll('input[data-topic]');
  function setOpen(o) { panel.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  document.addEventListener('click', function (e) { if (!panel.hidden && !e.target.closest('.slicer')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
  function pushFromBoxes() { MarketFilter.set([].filter.call(boxes, function (b) { return b.checked; }).map(function (b) { return b.value; })); }
  boxes.forEach(function (b) { b.addEventListener('change', pushFromBoxes); });
  topicBoxes.forEach(function (tb) {
    tb.addEventListener('change', function () {
      var t = topics.filter(function (x) { return x.id === tb.getAttribute('data-topic'); })[0];
      boxes.forEach(function (b) { if (t.slugs.indexOf(b.value) >= 0) b.checked = tb.checked; });
      pushFromBoxes();
    });
  });
  function clearAll() { MarketFilter.set([]); }
  clearBtn.addEventListener('click', clearAll);
  document.querySelectorAll('[data-clear]').forEach(function (b) { b.addEventListener('click', clearAll); });

  function labelText() {
    var a = MarketFilter.list();
    if (!a.length) return 'All commodities';
    if (a.length === 1) return byslug[a[0]];
    for (var i = 0; i < topics.length; i++) {
      var t = topics[i];
      if (t.slugs.length === a.length && t.slugs.every(function (s) { return a.indexOf(s) >= 0; })) return t.name;
    }
    return a.length + ' commodities';
  }
  function applyRows() {
    document.querySelectorAll('.market-panel[data-type="supply"], .market-panel[data-type="demand"]').forEach(function (p) {
      var visible = 0;
      p.querySelectorAll('tbody tr').forEach(function (r) {
        var off = !MarketFilter.has(r.getAttribute('data-commodity'));
        r.classList.toggle('is-filtered', off); if (!off) visible++;
      });
      var empty = p.querySelector('.market-empty'); if (empty) empty.hidden = visible > 0;
      p.querySelector('.market-card').classList.toggle('is-empty', visible === 0);
      var count = document.querySelector('#tab-' + p.getAttribute('data-type') + ' span'); if (count) count.textContent = visible;
    });
  }
  function sync() {
    var a = MarketFilter.list();
    boxes.forEach(function (b) { b.checked = a.indexOf(b.value) >= 0; });
    topicBoxes.forEach(function (tb) {
      var t = topics.filter(function (x) { return x.id === tb.getAttribute('data-topic'); })[0];
      var n = t.slugs.filter(function (s) { return a.indexOf(s) >= 0; }).length;
      tb.checked = n === t.slugs.length; tb.indeterminate = n > 0 && n < t.slugs.length;
    });
    labelEl.textContent = labelText();
    btn.classList.toggle('is-filtered', a.length > 0);
    clearBtn.hidden = a.length === 0;
    applyRows();
  }
  MarketFilter.on(sync);
  window.__applyFilter = applyRows;

  // ?topic=<id> (from the home page) starts with that topic ticked
  var wanted = new URLSearchParams(location.search).get('topic');
  topics.forEach(function (t) { if (t.id === wanted) MarketFilter.set(t.slugs); });
  sync();
})();

/* Map tab: supply in green, demand in brass, both striped; the same commodity slicer applies */
(function marketMap() {
  var stage = document.getElementById('mm-stage'), svg = document.getElementById('mm-svg'), box = document.getElementById('mm-results');
  if (!stage || !svg) return;
  var data = JSON.parse(document.getElementById('market-data').textContent), byslug = {};
  data.commodities.forEach(function (c) { byslug[c.slug] = c.name; });
  var mode = 'both', selected = null, paths = {}, view = null;
  svg.querySelectorAll('path[data-country]').forEach(function (p) { paths[p.getAttribute('data-country')] = p; });

  function matches(l) { return (mode === 'both' || l.type === mode) && MarketFilter.has(l.commodity); }
  function countryOf(l) { return l.type === 'supply' ? l.origin : l.country; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function svgEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

  function recolor() {
    var sup = {}, dem = {}, sample = false;
    MarketStore.get().forEach(function (l) {
      if (l.sample) sample = true;
      if (!matches(l)) return;
      var c = countryOf(l);
      if (!c || !paths[c]) return;
      (l.type === 'supply' ? sup : dem)[c] = true;
    });
    Object.keys(paths).forEach(function (n) {
      var p = paths[n], s = !!sup[n], d = !!dem[n], on = s || d;
      p.classList.toggle('is-sup', s && !d); p.classList.toggle('is-dem', d && !s); p.classList.toggle('is-both', s && d);
      p.classList.toggle('is-listed', on);
      if (on) { p.setAttribute('tabindex', '0'); p.setAttribute('role', 'button'); p.setAttribute('aria-label', n + ': ' + (s ? 'supply' : '') + (s && d ? ' and ' : '') + (d ? 'demand' : '')); }
      else { p.removeAttribute('tabindex'); p.removeAttribute('role'); p.removeAttribute('aria-label'); }
    });
    var layer = svg.querySelector('g.pins');
    if (!layer) { layer = svgEl('g'); layer.setAttribute('class', 'pins'); svg.appendChild(layer); }
    layer.textContent = '';
    Object.keys(paths).forEach(function (n) {
      var s = !!sup[n], d = !!dem[n];
      if (!s && !d) return;
      var b = paths[n].dataset.bbox.split(' ').map(Number), c = svgEl('circle');
      c.setAttribute('class', 'pin is-listed ' + (s && d ? 'is-both' : s ? 'is-sup' : 'is-dem'));
      c.setAttribute('data-country', n); c.setAttribute('data-r', '4.5');
      c.setAttribute('cx', (b[0] + b[2]) / 2); c.setAttribute('cy', (b[1] + b[3]) / 2); c.setAttribute('r', 4.5);
      layer.appendChild(c);
    });
    if (view) view.refresh();
    var note = document.getElementById('mm-sample'); if (note) note.hidden = !sample;
    if (selected && !(sup[selected] || dem[selected])) selected = null;
    renderResults();
  }

  function renderResults() {
    box.textContent = '';
    Object.keys(paths).forEach(function (n) { paths[n].classList.toggle('is-selected', n === selected); });
    if (selected && paths[selected]) paths[selected].parentNode.appendChild(paths[selected]); // draw the outline on top
    if (!selected) { box.appendChild(el('p', 'mm-hint', 'Select a coloured country to see what is offered and wanted there.')); return; }
    var head = el('div', 'mm-head'); head.appendChild(el('h3', '', selected));
    var back = el('button', 'panel-showall', 'Show whole map'); back.type = 'button'; back.addEventListener('click', resetAll);
    head.appendChild(back); box.appendChild(head);
    var ul = el('ul', 'mm-list'), any = false;
    MarketStore.get().filter(function (l) { return matches(l) && countryOf(l) === selected; }).forEach(function (l) {
      any = true;
      var li = el('li', 'mm-item');
      li.appendChild(el('span', 'mm-badge ' + (l.type === 'supply' ? 'is-sup' : 'is-dem'), l.type === 'supply' ? 'Supply' : 'Demand'));
      var a = el('a', 'row-name', byslug[l.commodity]); a.href = l.commodity + '.html'; li.appendChild(a);
      li.appendChild(el('span', 'mm-meta', [l.volume || 'On request', l.quality, l.when].concat(l.type === 'demand' ? [l.port] : []).filter(Boolean).join(' · ')));
      var go = el('a', 'row-go', l.type === 'supply' ? 'Enquire' : 'Offer supply');
      go.href = 'contact.html?commodity=' + encodeURIComponent(byslug[l.commodity]) + '&role=' + (l.type === 'supply' ? 'Buyer' : 'Supplier');
      li.appendChild(go); ul.appendChild(li);
    });
    if (!any) box.appendChild(el('p', 'mm-hint', 'Nothing matches the current filter here.')); else box.appendChild(ul);
  }

  function resetAll() { selected = null; renderResults(); view.home(); }
  view = createMapView(stage, svg, {
    pick: '.is-listed',
    onPick: function (n) { if (n === selected) { resetAll(); return; } selected = n; renderResults(); view.flyTo(n); },
    onReset: resetAll
  });

  document.querySelectorAll('#mm-modes button').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-mode');
      document.querySelectorAll('#mm-modes button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      recolor();
    });
  });
  MarketFilter.on(recolor);
  MarketStore.on(recolor);

  // ?country=<name> (from the home page map) opens with that country selected
  var want = new URLSearchParams(location.search).get('country');
  if (want && paths[want] && paths[want].classList.contains('is-listed')) { selected = want; renderResults(); view.flyTo(want); }
})();

/* Live listings: when a Firebase project is configured and the owner has published listings from
   admin.html, show those instead of the built-in ones. Plain REST read, no SDK. */
(function liveListings() {
  var cfg = window.KABANI_FIREBASE, page = document.getElementById('market-page'), dataEl = document.getElementById('market-data');
  if (!cfg || !cfg.projectId || !page || !dataEl) return;
  var commodities = JSON.parse(dataEl.textContent).commodities, byslug = {}, order = {};
  commodities.forEach(function (c, i) { byslug[c.slug] = c.name; order[c.slug] = i; });
  var base = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(cfg.projectId) + '/databases/(default)/documents';
  function str(f, k) { return f && f[k] && f[k].stringValue ? f[k].stringValue : ''; }

  Promise.all([fetch(base + '/meta/live'), fetch(base + '/listings?pageSize=300')]).then(function (rs) {
    if (!rs[0].ok || !rs[1].ok) throw new Error('not live');
    return Promise.all([rs[0].json(), rs[1].json()]);
  }).then(function (res) {
    var docs = (res[1].documents || []).map(function (d) {
      return { type: str(d.fields, 'type'), commodity: str(d.fields, 'commodity'), volume: str(d.fields, 'volume'),
               origin: str(d.fields, 'origin'), when: str(d.fields, 'when'), port: str(d.fields, 'port'), country: str(d.fields, 'country'),
               quality: str(d.fields, 'quality'), details: str(d.fields, 'details') };
    }).filter(function (d) { return byslug[d.commodity] && (d.type === 'supply' || d.type === 'demand'); });
    docs.sort(function (a, b) { return order[a.commodity] - order[b.commodity] || a.origin.localeCompare(b.origin); });
    render('supply', docs.filter(function (d) { return d.type === 'supply'; }));
    render('demand', docs.filter(function (d) { return d.type === 'demand'; }));
    var note = page.querySelector('.market-sample'); if (note) note.remove();
    var ts = res[0].fields && res[0].fields.updatedAt && res[0].fields.updatedAt.timestampValue;
    var up = document.getElementById('market-updated');
    if (up && ts) up.textContent = 'Updated ' + new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (window.__applyFilter) window.__applyFilter();
    MarketStore.set(docs);
  }).catch(function () { /* keep the built-in listings */ });

  function td(label, node) {
    var c = document.createElement('td'); c.setAttribute('data-label', label);
    c.appendChild(typeof node === 'string' ? document.createTextNode(node) : node); return c;
  }
  function render(type, rows) {
    var tbody = document.getElementById('panel-' + type).querySelector('tbody');
    tbody.textContent = '';
    rows.forEach(function (r) {
      var tr = document.createElement('tr'); tr.setAttribute('data-commodity', r.commodity);
      var a = document.createElement('a'); a.className = 'row-name'; a.href = r.commodity + '.html'; a.textContent = byslug[r.commodity];
      var nameCell = td('Commodity', a); nameCell.className = 'cell-name';
      if (r.details) { var note = document.createElement('span'); note.className = 'row-note'; note.textContent = r.details; nameCell.appendChild(note); }
      tr.appendChild(nameCell);
      tr.appendChild(td('Origin', r.origin || (type === 'supply' ? 'Shared on request' : 'Any')));
      tr.appendChild(td('Volume', r.volume || 'On request'));
      tr.appendChild(td('Quality', r.quality || 'On request'));
      tr.appendChild(td('Shipment', r.when || 'Flexible'));
      if (type === 'demand') tr.appendChild(td('Destination', r.port || r.country || ''));
      var go = document.createElement('td'); go.className = 'col-go';
      var l = document.createElement('a'); l.className = 'row-go';
      l.href = 'contact.html?commodity=' + encodeURIComponent(byslug[r.commodity]) + '&role=' + (type === 'supply' ? 'Buyer' : 'Supplier');
      l.textContent = type === 'supply' ? 'Enquire' : 'Offer supply'; go.appendChild(l); tr.appendChild(go);
      tbody.appendChild(tr);
    });
  }
})();

/* Log in: opens a small dialog. Creating an account is not available yet, so it says so. */
(function loginDialog() {
  var dlg = document.getElementById('login-dialog');
  if (!dlg || typeof dlg.showModal !== 'function') return; // without dialog support the links go straight to admin.html
  var note = document.getElementById('login-note');
  document.querySelectorAll('a[data-login]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); note.hidden = true; dlg.showModal(); });
  });
  document.getElementById('login-create').addEventListener('click', function () { note.hidden = false; });
  document.getElementById('login-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // click on the dimmed backdrop
})();
