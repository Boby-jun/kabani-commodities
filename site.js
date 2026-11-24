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
  var ok = document.getElementById('form-success');
  ok.style.display = 'block'; ok.focus({ preventScroll: true }); ok.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

/* Contact form: commodities as a multiple-choice dropdown; ticking "Other" opens a box to name the commodity */
(function commodityDropdown() {
  var ms = document.getElementById('ms'); if (!ms) return;
  var btn = document.getElementById('ms-btn'), panel = document.getElementById('ms-panel'), value = document.getElementById('ms-value');
  var boxes = panel.querySelectorAll('input[type="checkbox"]'), other = document.getElementById('ms-other');
  var wrap = document.getElementById('ms-other-wrap'), text = document.getElementById('ms-other-text');
  function setOpen(o) { panel.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  document.addEventListener('click', function (e) { if (!panel.hidden && !ms.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
  function sync(focusOther) {
    var names = [].filter.call(boxes, function (b) { return b.checked && b !== other; }).map(function (b) { return b.value; });
    if (other.checked) names.push(text.value.trim() || 'Other');
    value.textContent = !names.length ? 'Select commodities' : names.length <= 2 ? names.join(', ') : names.length + ' commodities';
    btn.classList.toggle('has-value', names.length > 0);
    var proxy = document.getElementById('ms-proxy'); if (proxy) proxy.value = names.join(', ');
    wrap.hidden = !other.checked; text.required = other.checked;
    if (focusOther && other.checked) text.focus();
  }
  [].forEach.call(boxes, function (b) { b.addEventListener('change', function () { sync(b === other); }); });
  text.addEventListener('input', function () { sync(false); });
  ms.closest('form').addEventListener('reset', function () { setTimeout(function () { sync(false); setOpen(false); }, 0); });
  sync(false);
})();

/* Phone number with a searchable country-code list (flag, name, code). Works for every .phone[data-phone] on the page. */
(function phoneFields() {
  var dataEl = document.getElementById('cc-data'), roots = document.querySelectorAll('[data-phone]');
  if (!dataEl || !roots.length) return;
  var rows = JSON.parse(dataEl.textContent), fields = [];
  function flag(iso) { return iso.length === 2 && iso !== 'XK' ? String.fromCodePoint(127397 + iso.charCodeAt(0), 127397 + iso.charCodeAt(1)) : '🏳️'; }
  var region = ((navigator.language || '').split('-')[1] || '').toUpperCase();
  function byIso(c) { return rows.filter(function (x) { return x.iso === String(c).toUpperCase(); })[0]; }
  var start = byIso(region) || byIso('CH');

  [].forEach.call(roots, function (root) {
    var btn = root.querySelector('.cc-btn'), panel = root.querySelector('.cc-panel'), search = root.querySelector('.cc-search'), list = root.querySelector('.cc-list');
    var flagEl = root.querySelector('.cc-flag'), dialEl = root.querySelector('.cc-dial'), hidden = root.querySelector('.cc-value'), wrap = root.querySelector('.cc'), input = root.querySelector('.ph-input');
    var touched = false;
    function mark(iso) { items.forEach(function (it) { it.b.setAttribute('aria-selected', it.r.iso === iso ? 'true' : 'false'); }); }
    function pick(r) { flagEl.textContent = flag(r.iso); dialEl.textContent = r.dial; hidden.value = r.dial; btn.setAttribute('aria-label', 'Country code: ' + r.name + ' ' + r.dial); mark(r.iso); }
    function setOpen(o) {
      panel.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false');
      if (o) { search.value = ''; filter(); search.focus(); var cur = list.querySelector('[aria-selected="true"]'); if (cur) cur.scrollIntoView({ block: 'center' }); }
    }
    var items = rows.map(function (r) {
      var li = document.createElement('li'); li.setAttribute('role', 'presentation');
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cc-opt'; b.setAttribute('role', 'option'); b.setAttribute('data-iso', r.iso);
      b.innerHTML = '<span class="cc-flag" aria-hidden="true">' + flag(r.iso) + '</span><span class="cc-name"></span><span class="cc-code"></span>';
      b.querySelector('.cc-name').textContent = r.name; b.querySelector('.cc-code').textContent = r.dial;
      b.addEventListener('click', function () { touched = true; pick(r); setOpen(false); btn.focus(); });
      li.appendChild(b); list.appendChild(li); return { r: r, li: li, b: b, key: (r.name + ' ' + r.dial + ' ' + r.dial.slice(1) + ' ' + r.iso).toLowerCase() };
    });
    function filter() { var q = search.value.trim().toLowerCase().replace(/^\+/, ''); items.forEach(function (it) { it.li.hidden = q && it.key.indexOf(q) < 0; }); }
    function visible() { return items.filter(function (it) { return !it.li.hidden; }); }
    btn.addEventListener('click', function () { touched = true; setOpen(panel.hidden); });
    input.addEventListener('input', function () { touched = true; });
    search.addEventListener('input', filter);
    search.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { var v = visible(); if (v.length) { v[0].b.focus(); e.preventDefault(); } } if (e.key === 'Enter') { var v2 = visible(); if (v2.length) { v2[0].b.click(); e.preventDefault(); } } });
    list.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var v = visible(), i = v.map(function (x) { return x.b; }).indexOf(document.activeElement); if (i < 0) return;
      var n = v[i + (e.key === 'ArrowDown' ? 1 : -1)]; if (n) n.b.focus(); else if (e.key === 'ArrowUp') search.focus(); e.preventDefault();
    });
    document.addEventListener('click', function (e) { if (!panel.hidden && !wrap.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
    var f = { pick: pick, isTouched: function () { return touched; }, reset: function () { touched = false; setOpen(false); pick(f.country || start); } };
    fields.push(f); pick(start);
    var form = root.closest('form'); if (form) form.addEventListener('reset', function () { setTimeout(f.reset, 0); });
  });

  // then look up the visitor's country from their IP address (one small request; the browser language above is the fallback)
  function applyCountry(code) {
    var r = byIso(code); if (!r) return;
    fields.forEach(function (f) { f.country = r; if (!f.isTouched()) f.pick(r); });
  }
  var cached = null; try { cached = sessionStorage.getItem('kabani-cc'); } catch (e) { /* storage blocked */ }
  if (cached) applyCountry(cached);
  else if (window.fetch) {
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 3500);
    fetch('https://api.country.is/', { signal: ctl ? ctl.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (j) { if (j && j.country) { try { sessionStorage.setItem('kabani-cc', j.country); } catch (e) { /* ignore */ } applyCountry(j.country); } })
      .catch(function () { /* offline or blocked: keep the fallback */ })
      .then(function () { clearTimeout(timer); });
  }
})();

/* Commodities page, "Make a request": the questions follow the commodity (units, specifications). Saves the request for review and emails it when a notify address is set up. */
(function requestForm() {
  var form = document.getElementById('request-form'); if (!form) return;
  var cfg = window.KABANI_FIREBASE || {}, err = document.getElementById('rq-error'), ok = document.getElementById('rq-success');
  var SPEC = JSON.parse(document.getElementById('spec-data').textContent);
  var commodity = document.getElementById('rq-commodity'), otherWrap = document.getElementById('rq-other-wrap'), other = document.getElementById('rq-other');
  var destWrap = document.getElementById('rq-dest-wrap'), dest = document.getElementById('rq-dest'), originL = document.getElementById('rq-origin-l');
  var unit = document.getElementById('rq-unit'), specsWrap = document.getElementById('rq-specs-wrap'), specsBox = document.getElementById('rq-specs'), specsTitle = document.getElementById('rq-specs-title');
  var current = SPEC.generic;
  function kind() { var c = form.querySelector('input[name="kind"]:checked'); return c ? c.value : ''; }
  function opt(txt, val) { var o = document.createElement('option'); o.value = val == null ? txt : val; o.textContent = txt; return o; }
  function build() {
    var slug = commodity.value; current = SPEC[slug] || SPEC.generic;
    var keep = unit.value; unit.textContent = ''; unit.appendChild(opt('Unit', ''));
    current.units.forEach(function (u) { unit.appendChild(opt(u)); });
    if (current.units.indexOf(keep) >= 0) unit.value = keep; else if (current.units.length === 1) unit.value = current.units[0];
    specsBox.textContent = '';
    current.fields.forEach(function (f, i) {
      var g = document.createElement('div'); g.className = 'form-group'; var id = 'rq-s-' + f.key;
      var l = document.createElement('label'); l.htmlFor = id; l.textContent = f.label; g.appendChild(l);
      var c;
      if (f.options) { c = document.createElement('select'); c.appendChild(opt('Choose', '')); f.options.forEach(function (o) { c.appendChild(opt(o)); }); }
      else { c = document.createElement('input'); c.type = 'text'; c.maxLength = 120; c.placeholder = f.placeholder || ''; }
      c.id = id; c.name = 'spec_' + f.key; c.required = true; g.appendChild(c); specsBox.appendChild(g);
    });
    var name = slug ? (commodity.options[commodity.selectedIndex].textContent) : '';
    specsTitle.textContent = slug && slug !== 'other' ? 'Specifications for ' + name.toLowerCase() : 'Specifications';
    specsWrap.hidden = !slug;
  }
  function sync() {
    var isOther = commodity.value === 'other'; otherWrap.hidden = !isOther; other.required = isOther;
    var buy = kind() === 'demand'; destWrap.hidden = !buy; dest.required = buy; originL.textContent = buy ? 'Preferred country of origin (or Any)' : 'Country of origin';
  }
  commodity.addEventListener('change', function () { build(); sync(); });
  [].forEach.call(form.querySelectorAll('input[name="kind"]'), function (r) { r.addEventListener('change', sync); });
  form.addEventListener('reset', function () { setTimeout(function () { commodity.value = ''; build(); sync(); }, 0); });
  build(); sync();
  function say(msg) { err.textContent = msg || ''; err.hidden = !msg; }
  function str(v) { return { stringValue: String(v == null ? '' : v).trim() }; }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); say('');
    if (form.elements.website && form.elements.website.value) { ok.hidden = false; return; } // honeypot: pretend success to bots
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!cfg.projectId || !cfg.apiKey) { say('Requests are not switched on yet. Please use the contact form.'); return; }
    var v = function (n) { return form.elements[n] ? form.elements[n].value.trim() : ''; };
    var qual = [], lines = [];
    current.fields.forEach(function (f) { var val = v('spec_' + f.key); lines.push(f.label + ': ' + val); if (f.q) qual.push(val); });
    var data = { kind: kind(), commodity: v('commodity'), otherCommodity: v('other_commodity'), origin: v('origin'), volume: v('volume_qty') + ' ' + v('volume_unit'), volumeQty: v('volume_qty'), volumeUnit: v('volume_unit'),
      quality: qual.join(', ').slice(0, 160), specs: lines.join('\n').slice(0, 900), when: v('when'), incoterm: v('incoterm'), payment: v('payment'),
      destination: v('destination'), details: v('details'), name: v('name'), company: v('company'), email: v('email'), phone: (v('phone_code') + ' ' + v('phone')).trim() };
    var fields = {}; Object.keys(data).forEach(function (k) { fields[k] = str(data[k]); });
    fields.status = str('pending'); fields.createdAt = { timestampValue: new Date().toISOString() };
    var btn = form.querySelector('.form-submit'); btn.disabled = true;
    fetch('https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(cfg.projectId) + '/databases/(default)/documents/submissions?key=' + encodeURIComponent(cfg.apiKey),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields }), credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('save failed'); return r.json(); })
      .then(function () {
        if (cfg.notifyUrl) { try { fetch(cfg.notifyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.assign({ _subject: 'New ' + (data.kind === 'supply' ? 'supply offer' : 'purchase request') + ': ' + (data.commodity === 'other' ? data.otherCommodity : data.commodity) }, data)) }); } catch (x) { /* the request is saved either way */ } }
        form.reset(); ok.hidden = false; ok.focus({ preventScroll: true }); ok.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      })
      .catch(function () { say('We could not send your request just now. Please try again, or use the contact form.'); })
      .then(function () { btn.disabled = false; });
  });
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
function fmtAdded(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? (+m[3]) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + m[1] : '\u2014';
}
var MarketFilter = (function () {
  var sel = {}, subs = [], dims = { origin: {}, volume: {}, quality: {}, when: {}, added: {} };
  // what a listing shows in each column, with the same fallbacks the tables use
  function val(l, d) {
    if (d === 'origin') return l.origin || (l.type === 'supply' ? 'Shared on request' : 'Any');
    if (d === 'when') return l.when || 'Flexible';
    if (d === 'added') return fmtAdded(l.added);
    return l[d] || 'On request';
  }
  function fire() { subs.forEach(function (f) { f(); }); }
  function dimOk(v) { return Object.keys(dims).every(function (d) { return !Object.keys(dims[d]).length || !!dims[d][v[d]]; }); }
  return {
    has: function (slug) { return Object.keys(sel).length === 0 || !!sel[slug]; },
    list: function () { return Object.keys(sel); },
    set: function (slugs) { sel = {}; slugs.forEach(function (s) { sel[s] = true; }); fire(); },
    dim: function (d) { return Object.keys(dims[d]); },
    setDim: function (d, vals) { dims[d] = {}; vals.forEach(function (x) { dims[d][x] = true; }); fire(); },
    val: val,
    match: function (l) { return this.has(l.commodity) && dimOk({ origin: val(l, 'origin'), volume: val(l, 'volume'), quality: val(l, 'quality'), when: val(l, 'when'), added: val(l, 'added') }); },
    matchRow: function (slug, v) { return this.has(slug) && dimOk(v); },
    active: function () { return Object.keys(sel).length > 0 || Object.keys(dims).some(function (d) { return Object.keys(dims[d]).length > 0; }); },
    clear: function () { sel = {}; Object.keys(dims).forEach(function (d) { dims[d] = {}; }); fire(); },
    on: function (f) { subs.push(f); }
  };
})();

(function marketPage() {
  var tabs = document.querySelectorAll('.seg [role="tab"]'), dataEl = document.getElementById('market-data');
  if (!tabs.length || !dataEl) return;
  var mdata = JSON.parse(dataEl.textContent), byslug = {}, topics = mdata.topics || [], currentTab = 'supply';
  window.__currentTab = function () { return currentTab; };
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
    currentTab = which; if (window.__placeSlicers) window.__placeSlicers();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(t.id.replace('tab-', '')); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); show(n.id.replace('tab-', '')); e.preventDefault();
    });
  });
  if (location.hash === '#demand' || location.hash === '#map' || location.hash === '#request') show(location.hash.slice(1));

  /* --- commodity slicer --- */
  var btn = document.getElementById('slicer-btn'), panel = document.getElementById('slicer-panel'), clearBtn = document.getElementById('slicer-clear');
  var labelEl = btn.querySelector('.slicer-label');
  var boxes = panel.querySelectorAll('input[type="checkbox"][value]'), topicBoxes = panel.querySelectorAll('input[data-topic]');
  function setOpen(o) { panel.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  document.addEventListener('click', function (e) { if (!panel.hidden && e.target.closest('.slicer') !== btn.closest('.slicer')) setOpen(false); });
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
  function clearAll() { MarketFilter.clear(); }
  clearBtn.addEventListener('click', clearAll);
  document.querySelectorAll('[data-clear]').forEach(function (b) { b.addEventListener('click', clearAll); });

  function labelText() {
    var a = MarketFilter.list();
    if (!a.length) return 'Commodity';
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
        var cell = function (label) { var c = r.querySelector('td[data-label="' + label + '"]'); return c ? c.textContent.trim() : ''; };
        var off = !MarketFilter.matchRow(r.getAttribute('data-commodity'), { origin: cell('Origin'), volume: cell('Volume'), quality: cell('Quality'), when: cell('Shipment'), added: cell('Date added') });
        r.classList.toggle('is-filtered', off); if (!off) visible++;
      });
      var empty = p.querySelector('.market-empty');
      if (empty) {
        if (!empty.hasAttribute('data-some')) empty.setAttribute('data-some', empty.innerHTML);
        empty.innerHTML = p.querySelectorAll('tbody tr').length ? empty.getAttribute('data-some') : empty.getAttribute('data-none');
        empty.hidden = visible > 0;
        [].forEach.call(empty.querySelectorAll('[data-clear]'), function (b) { b.addEventListener('click', function () { MarketFilter.clear(); }); });
      }
      p.querySelector('.market-card').classList.toggle('is-empty', p.querySelectorAll('tbody tr').length === 0); // keep the headings (and their slicers) while a selection shows nothing
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
    clearBtn.hidden = !MarketFilter.active();
    applyRows();
  }
  MarketFilter.on(sync);
  window.__applyFilter = applyRows;

  // ?topic=<id> (from the home page) starts with that topic ticked
  var wanted = new URLSearchParams(location.search).get('topic');
  topics.forEach(function (t) { if (t.id === wanted) MarketFilter.set(t.slugs); });
  sync();
})();

/* Slicers for Origin, Volume, Quality and Shipment, next to the commodity slicer. Options come from the listings shown. */
(function columnSlicers() {
  var tools = document.querySelector('.market-tools'), clearBtn = document.getElementById('slicer-clear'), first = document.getElementById('slicer-btn');
  if (!tools || !clearBtn || !first) return;
  var DIMS = [['origin', 'Origin'], ['volume', 'Volume'], ['quality', 'Quality'], ['when', 'Shipment'], ['added', 'Date added']], parts = {};
  var chevron = first.querySelector('svg').outerHTML;

  function closeAll(except) {
    DIMS.forEach(function (d) { var p = parts[d[0]]; if (p.panel !== except && !p.panel.hidden) { p.panel.hidden = true; p.btn.setAttribute('aria-expanded', 'false'); } });
  }
  DIMS.forEach(function (d) {
    var wrap = document.createElement('div'); wrap.className = 'slicer';
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'slicer-btn'; btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="slicer-label">' + d[1] + '</span>' + chevron;
    var panel = document.createElement('div'); panel.className = 'slicer-panel col-panel'; panel.hidden = true; panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Choose ' + d[1].toLowerCase() + ' values');
    wrap.appendChild(btn); wrap.appendChild(panel); tools.insertBefore(wrap, clearBtn);
    parts[d[0]] = { wrap: wrap, btn: btn, panel: panel, label: btn.querySelector('.slicer-label'), name: d[1] };
    btn.addEventListener('click', function () {
      var open = panel.hidden; closeAll(panel); panel.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var f = document.getElementById('slicer-panel'); if (f && !f.hidden) first.click(); }
    });
    document.addEventListener('click', function (e) { if (!panel.hidden && e.target.closest('.slicer') !== wrap) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  });
  first.addEventListener('click', function () { closeAll(null); });

  function build() {
    var list = MarketStore.get();
    DIMS.forEach(function (d) {
      var key = d[0], p = parts[key], seen = {}, vals = [];
      list.forEach(function (l) { var v = MarketFilter.val(l, key); if (!seen[v]) { seen[v] = true; vals.push(v); } });
      vals.sort(function (x, y) { return x.localeCompare(y, undefined, { numeric: true }); });
      var keep = MarketFilter.dim(key).filter(function (v) { return seen[v]; });
      p.panel.textContent = '';
      var hint = document.createElement('p'); hint.className = 'slicer-hint'; hint.textContent = vals.length ? 'Tick the values to show. Nothing ticked shows all.' : 'Nothing listed yet.'; p.panel.appendChild(hint);
      vals.forEach(function (v) {
        var lab = document.createElement('label'); lab.className = 'slicer-opt';
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = v; cb.checked = keep.indexOf(v) >= 0;
        cb.addEventListener('change', function () {
          MarketFilter.setDim(key, [].filter.call(p.panel.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.value; }));
        });
        var s = document.createElement('span'); s.textContent = v; lab.appendChild(cb); lab.appendChild(s); p.panel.appendChild(lab);
      });
      if (keep.length !== MarketFilter.dim(key).length) MarketFilter.setDim(key, keep);
    });
    paint();
  }
  function paint() {
    DIMS.forEach(function (d) {
      var p = parts[d[0]], a = MarketFilter.dim(d[0]);
      [].forEach.call(p.panel.querySelectorAll('input'), function (i) { i.checked = a.indexOf(i.value) >= 0; });
      p.label.textContent = p.name + (a.length === 1 ? ' · ' + a[0] : a.length > 1 ? ' · ' + a.length : '');
      p.btn.classList.toggle('is-filtered', a.length > 0);
    });
  }
  MarketStore.on(build);
  MarketFilter.on(paint);

  /* Where the slicers live: inside the column headings of the visible table; in the bar above the map, and on phones (no headings). */
  var mq = window.matchMedia('(max-width: 720px)');
  window.__placeSlicers = function () {
    var tab = window.__currentTab ? window.__currentTab() : 'supply';
    tools.hidden = tab === 'request';
    var panelEl = document.getElementById('panel-' + tab);
    var inHeads = tab !== 'map' && !mq.matches && panelEl;
    var wraps = { commodity: first.closest('.slicer') };
    DIMS.forEach(function (d) { wraps[d[0]] = parts[d[0]].wrap; });
    var mmS = document.getElementById('mm-slicers'), onMap = tab === 'map' && !!mmS;   // on the Map tab the slicers sit right above the map, beside Supply / Demand / Both
    Object.keys(wraps).forEach(function (k) {
      var th = inHeads ? panelEl.querySelector('thead th[data-dim="' + k + '"]') : null;
      if (th) { th.textContent = ''; th.appendChild(wraps[k]); th.classList.add('has-slicer'); }
      else if (onMap) mmS.appendChild(wraps[k]);
      else if (wraps[k].parentNode !== tools) tools.insertBefore(wraps[k], clearBtn);
    });
    if (onMap) mmS.appendChild(clearBtn); else if (clearBtn.parentNode !== tools || clearBtn.nextElementSibling) tools.appendChild(clearBtn);
    document.querySelectorAll('.market-panel thead th[data-dim]').forEach(function (th) {
      if (!th.firstElementChild) th.textContent = th.getAttribute('data-name') || th.textContent;
    });
  };
  document.querySelectorAll('.market-panel thead th[data-dim]').forEach(function (th) { th.setAttribute('data-name', th.textContent); });
  if (mq.addEventListener) mq.addEventListener('change', window.__placeSlicers);
  window.__placeSlicers();
})();

/* Map tab: supply in green, demand in brass, both striped; the same commodity slicer applies */
(function marketMap() {
  var stage = document.getElementById('mm-stage'), svg = document.getElementById('mm-svg'), box = document.getElementById('mm-results');
  if (!stage || !svg) return;
  var data = JSON.parse(document.getElementById('market-data').textContent), byslug = {};
  data.commodities.forEach(function (c) { byslug[c.slug] = c.name; });
  var mode = 'both', selected = null, paths = {}, view = null;
  svg.querySelectorAll('path[data-country]').forEach(function (p) { paths[p.getAttribute('data-country')] = p; });

  function matches(l) { return (mode === 'both' || l.type === mode) && MarketFilter.match(l); }
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
               quality: str(d.fields, 'quality'), details: str(d.fields, 'details'), added: str(d.fields, 'added') };
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

  function fmtAdded(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? (+m[3]) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + m[1] : '—';
  }
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
      var dc = td('Date added', fmtAdded(r.added)); dc.className = 'cell-date'; tr.appendChild(dc);
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
  var admin = false, IDLE_MS = 30 * 60 * 1000;
  try {
    admin = localStorage.getItem('kabani-admin') === '1';
    var seen = Number(localStorage.getItem('kabani-admin-seen')) || 0;
    if (admin && seen && Date.now() - seen > IDLE_MS) { // idle for 30+ minutes: back to "Log in"; admin.js ends the saved session
      admin = false; localStorage.removeItem('kabani-admin');
    } else if (admin) {
      var last = 0; // browsing the public pages counts as activity, so the 30 minutes restart
      var bump = function () { var n = Date.now(); if (n - last < 20000) return; last = n; try { localStorage.setItem('kabani-admin-seen', String(n)); } catch (e) { /* ignore */ } };
      ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, bump, { passive: true, capture: true }); });
      bump();
    }
  } catch (e) { /* storage blocked */ }
  if (admin) { // signed in as the owner before: the link goes straight to the admin page
    document.querySelectorAll('a[data-login]').forEach(function (a) { a.textContent = 'Admin'; a.href = 'admin.html'; a.classList.add('is-admin'); a.removeAttribute('data-login'); });
  }
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
