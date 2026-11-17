/* Listings admin: Google sign-in (owner only) and add / edit / duplicate / delete of supply and demand listings.
   Security is enforced by firestore.rules on Google's side; the checks here only shape the screen.
   admin.html?demo=1 runs the same screen against throw-away sample data, with no sign-in and nothing published. */
const $ = (id) => document.getElementById(id);
const cfg = window.KABANI_FIREBASE || {};
const data = JSON.parse($('admin-data').textContent);
const names = Object.fromEntries(data.commodities.map((c) => [c.slug, c.name]));
const hints = Object.fromEntries(data.commodities.map((c) => [c.slug, c.hint]));
const order = Object.fromEntries(data.commodities.map((c, i) => [c.slug, i]));
const demo = new URLSearchParams(location.search).has('demo');
const views = ['admin-setup', 'admin-signin', 'admin-denied', 'admin-app'];
const show = (id) => views.forEach((v) => { $(v).hidden = v !== id; });

for (const n of data.countries) { const o = document.createElement('option'); o.value = n; $('country-list').append(o); }
(function shipmentSuggestions() {
  const now = new Date(), list = $('when-list');
  const add = (v) => { const o = document.createElement('option'); o.value = v; list.append(o); };
  add('Immediately'); add('Within 30 days');
  for (let i = 1; i <= 12; i++) add(new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
  for (let i = 1; i <= 4; i++) { const q = Math.floor(now.getMonth() / 3) + i; add('Q' + (((q - 1) % 4) + 1) + ' ' + (now.getFullYear() + Math.floor((q - 1) / 4))); }
  add('Flexible');
})();

let store = null, listings = [], tab = 'supply', editing = null;
const picked = new Set(); // commodity slicer: nothing ticked shows everything

/* ---------- data layers ---------- */
const SAMPLE = [
  { type: 'supply', commodity: 'coffee', origin: 'Kenya', volume: '40 t per month', quality: 'Arabica AA, screen 17+', when: 'October to December', details: 'Washed, FAQ grade. Cupping samples can be sent on request.' },
  { type: 'supply', commodity: 'tea', origin: 'Kenya', volume: '2 containers per month', quality: 'BP1 black tea', when: 'Flexible', details: 'Orthodox and CTC available. Packed in paper sacks.' },
  { type: 'supply', commodity: 'avocado', origin: 'Tanzania', volume: '1 container weekly', quality: 'Hass, size 18 to 22', when: 'April to September', details: 'Packed in 4 kg cartons, palletised.' },
  { type: 'demand', commodity: 'coffee', origin: 'Ethiopia', volume: '2 containers', quality: 'Arabica, specialty grade', when: 'Q1 2027', port: 'Rotterdam', country: 'Netherlands', details: 'Buyer wants samples approved before contract.' },
  { type: 'demand', commodity: 'urea', origin: '', volume: '5,000 t', quality: '46% nitrogen, granular', when: 'March 2027', port: 'Mombasa', country: 'Kenya', details: 'Bagged in 50 kg, or bulk. Origin open.' },
];

/* ---------- sign-in lifetime: signed out after 30 minutes without activity ----------
   'kabani-admin-seen' holds the time of the last activity. site.js keeps it fresh while the owner
   browses the public pages and reads the same key, so the clock is shared across the whole site. */
const IDLE_MS = 30 * 60 * 1000;
let signOutNow = () => {};
const seenAt = () => { try { return Number(localStorage.getItem('kabani-admin-seen')) || 0; } catch (e) { return 0; } };
const touch = () => { try { localStorage.setItem('kabani-admin-seen', String(Date.now())); } catch (e) { /* storage blocked */ } };
const idleExpired = () => { const t = seenAt(); return t > 0 && Date.now() - t > IDLE_MS; };
const expire = () => {
  try { localStorage.removeItem('kabani-admin'); localStorage.removeItem('kabani-admin-seen'); } catch (e) { /* storage blocked */ }
  $('admin-timeout').hidden = false; // shown on the sign-in card once the sign-out lands
  return signOutNow();
};
(function watchActivity() {
  let last = 0;
  const bump = () => { const n = Date.now(); if (n - last < 20000) return; last = n; if (!idleExpired()) touch(); };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, bump, { passive: true, capture: true }));
  setInterval(() => { if (!demo && store && store.live && idleExpired()) expire(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !demo && store && store.live && idleExpired()) expire(); });
})();

function demoStore() {
  let seq = 0, rows = [];
  try { rows = JSON.parse(sessionStorage.getItem('kabani-demo') || 'null') || []; } catch (e) { /* storage blocked */ }
  if (!rows.length) rows = SAMPLE.map((r) => ({ ...r, id: 'd' + (++seq) }));
  seq = rows.length + 100;
  const keep = () => { try { sessionStorage.setItem('kabani-demo', JSON.stringify(rows)); } catch (e) { /* ignore */ } };
  return {
    live: false,
    async load() { return rows.map((r) => ({ ...r })); },
    async save(id, payload) { if (id) rows = rows.map((r) => (r.id === id ? { ...payload, id } : r)); else rows.push({ ...payload, id: 'd' + (++seq) }); keep(); },
    async remove(id) { rows = rows.filter((r) => r.id !== id); keep(); },
    async importSeed() { /* not needed in preview */ },
  };
}

async function firebaseStore(onUser) {
  const base = 'https://www.gstatic.com/firebasejs/11.0.2/';
  const [{ initializeApp }, A, F] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const app = initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, appId: cfg.appId });
  const auth = A.getAuth(app), db = F.getFirestore(app);
  $('admin-signin-btn').addEventListener('click', async () => {
    touch(); $('admin-timeout').hidden = true; // a fresh sign-in starts a fresh 30 minutes
    const provider = new A.GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: cfg.ownerEmail, hd: cfg.ownerEmail.split('@')[1] });
    try { $('admin-error').hidden = true; await A.signInWithPopup(auth, provider); }
    catch (e) { $('admin-error').textContent = 'Sign-in did not complete (' + (e.code || e.message) + ').'; $('admin-error').hidden = false; }
  });
  $('admin-signout').addEventListener('click', () => A.signOut(auth));
  signOutNow = () => A.signOut(auth);
  const markLive = () => { sessionStorage.setItem('kabani-live', '1'); return F.setDoc(F.doc(db, 'meta', 'live'), { updatedAt: F.serverTimestamp() }, { merge: true }); };
  const api = {
    live: true,
    async load() { const snap = await F.getDocs(F.collection(db, 'listings')); return snap.docs.map((d) => ({ id: d.id, ...d.data() })); },
    async save(id, payload) { if (id) await F.setDoc(F.doc(db, 'listings', id), payload); else await F.addDoc(F.collection(db, 'listings'), payload); await markLive(); },
    async remove(id) { await F.deleteDoc(F.doc(db, 'listings', id)); await markLive(); },
    async importSeed() {
      const batch = F.writeBatch(db), col = F.collection(db, 'listings');
      const pick = (t, r) => ({ type: t, commodity: r.commodity, origin: r.origin || '', volume: r.volume || '', quality: r.quality || '', when: r.when || '', details: r.details || '', ...(t === 'demand' ? { port: r.port || '', country: r.country || '' } : {}) });
      for (const r of data.seed.supply) batch.set(F.doc(col), pick('supply', r));
      for (const r of data.seed.demand) batch.set(F.doc(col), pick('demand', r));
      batch.set(F.doc(db, 'meta', 'live'), { updatedAt: F.serverTimestamp() }, { merge: true });
      await batch.commit(); sessionStorage.setItem('kabani-live', '1');
    },
  };
  store = api;
  A.onAuthStateChanged(auth, onUser);
  return api;
}

/* ---------- screen ---------- */
const text = (s) => document.createTextNode(s);
function cell(content, label) {
  const td = document.createElement('td'); if (label) td.setAttribute('data-label', label);
  td.append(typeof content === 'string' ? text(content) : content); return td;
}
function button(label, cls, fn) {
  const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.addEventListener('click', fn); return b;
}

async function load() {
  listings = await store.load();
  $('admin-import').hidden = !store.live || listings.length > 0 || sessionStorage.getItem('kabani-live') === '1';
  render();
}

function render() {
  for (const t of ['supply', 'demand']) $('count-' + t).textContent = listings.filter((l) => l.type === t).length;
  const isDemand = tab === 'demand';
  const all = listings.filter((l) => l.type === tab);
  const rows = all.filter((l) => !picked.size || picked.has(l.commodity)).sort((a, b) => (order[a.commodity] ?? 99) - (order[b.commodity] ?? 99) || (a.origin || '').localeCompare(b.origin || ''));
  $('admin-thead').innerHTML = '<tr><th>Commodity</th><th>Origin</th><th>Volume</th><th>Quality</th><th>Shipment</th>' + (isDemand ? '<th>Destination</th>' : '') + '<th><span class="sr-only">Actions</span></th></tr>';
  const tbody = $('admin-tbody'); tbody.textContent = '';
  for (const l of rows) {
    const tr = document.createElement('tr');
    const name = document.createElement('span'); name.className = 'row-name'; name.textContent = names[l.commodity] || l.commodity;
    const nameCell = cell(name); nameCell.className = 'cell-name';
    if (l.details) { const n = document.createElement('span'); n.className = 'row-note'; n.textContent = l.details; nameCell.append(n); }
    tr.append(nameCell, cell(l.origin || (isDemand ? 'Any' : 'Shared on request'), 'Origin'), cell(l.volume || '', 'Volume'), cell(l.quality || 'On request', 'Quality'), cell(l.when || 'Flexible', 'Shipment'));
    if (isDemand) tr.append(cell([l.port, l.country].filter(Boolean).join(', '), 'Destination'));
    const actions = document.createElement('td'); actions.className = 'col-go';
    actions.append(button('Edit', 'panel-showall', () => fill(l, true)), ' ', button('Duplicate', 'panel-showall', () => fill(l, false)), ' ', button('Delete', 'panel-showall admin-del', () => remove(l)));
    tr.append(actions); tbody.append(tr);
  }
  const empty = $('admin-empty');
  empty.hidden = rows.length > 0; empty.textContent = '';
  $('admin-list-title').textContent = (isDemand ? 'Demand' : 'Supply') + ' listings' + (picked.size ? ' (' + rows.length + ' of ' + all.length + ')' : '');
  document.querySelector('.admin-table').closest('.market-card').hidden = rows.length === 0;
  if (!rows.length) {
    if (picked.size && all.length) {
      empty.append('Nothing matches this selection. ');
      empty.append(button('Show all commodities', 'slicer-link', () => setPicked([])));
    } else empty.append('No ' + tab + ' listings yet. Add the first one above.');
  }
  $('admin-form-title').textContent = (editing ? 'Edit this ' : 'Add a ') + tab + ' listing';
  $('admin-form-sub').textContent = isDemand ? 'Something a buyer is looking for. Suppliers can offer against it.' : 'Something we can source and offer to buyers.';
  $('admin-save').textContent = editing ? 'Save changes' : 'Add listing';
  $('admin-cancel').hidden = !editing;
  $('l-origin').textContent = isDemand ? 'Preferred country of origin' : 'Country of origin';
  $('f-origin').placeholder = isDemand ? 'Optional, leave empty if open' : 'Start typing, e.g. Kenya';
  $('l-when').textContent = isDemand ? 'Needed by / shipment date' : 'Date of export / shipment';
  document.querySelectorAll('[data-demand]').forEach((el) => { el.hidden = !isDemand; });
  setHint();
}

function setHint() { $('f-quality').placeholder = hints[$('f-commodity').value] || 'Grade, specification or standard'; }
function counter() { $('details-count').textContent = $('f-details').value.length + ' / 600'; }
function notice(msg, link) {
  const p = $('admin-notice'); p.textContent = msg || ''; p.hidden = !msg;
  if (msg && link) { const a = document.createElement('a'); a.href = link.href; a.textContent = link.text; p.append(' ', a); }
}
function formError(msg) { const p = $('admin-form-error'); p.textContent = msg || ''; p.hidden = !msg; }

function setTab(t) {
  tab = t; editing = null; $('admin-form').reset(); formError(''); notice('');
  for (const x of ['supply', 'demand']) { $('atab-' + x).setAttribute('aria-selected', x === t ? 'true' : 'false'); $('atab-' + x).tabIndex = x === t ? 0 : -1; }
  render(); counter();
}
$('atab-supply').addEventListener('click', () => setTab('supply'));
$('atab-demand').addEventListener('click', () => setTab('demand'));

const sel = $('f-commodity');
for (const c of data.commodities) { const o = document.createElement('option'); o.value = c.slug; o.textContent = c.name; sel.append(o); }
sel.addEventListener('change', setHint);
$('f-details').addEventListener('input', counter);

function fill(l, edit) {
  editing = edit ? l.id : null; notice(''); formError('');
  sel.value = l.commodity;
  for (const k of ['origin', 'volume', 'quality', 'when', 'port', 'country', 'details']) $('f-' + k).value = l[k] || '';
  render(); counter();
  $('admin-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('f-volume').focus({ preventScroll: true });
}
$('admin-cancel').addEventListener('click', () => { editing = null; $('admin-form').reset(); formError(''); render(); counter(); });

$('admin-form').addEventListener('submit', async (e) => {
  e.preventDefault(); formError(''); notice('');
  const v = (k) => $('f-' + k).value.trim();
  const payload = { type: tab, commodity: sel.value, origin: v('origin'), volume: v('volume'), quality: v('quality'), when: v('when'), details: v('details') };
  if (tab === 'demand') { payload.port = v('port'); payload.country = v('country'); }
  for (const [field, label] of [['origin', 'Country of origin'], ['country', 'Destination country']]) {
    const place = payload[field];
    if (place && !data.countries.includes(place)) { formError('"' + place + '" is not a country on the map. Pick one from the suggestions in "' + label + '" so it shows up on the map (for example Netherlands, or United States of America).'); return; }
  }
  const wasEditing = !!editing;
  try {
    await store.save(editing, payload);
    editing = null; $('admin-form').reset(); await load(); counter();
    if (store.live) notice(wasEditing ? 'Changes saved.' : 'Listing added.', { href: 'market.html', text: 'See it on the Commodities page' });
    else notice((wasEditing ? 'Changes saved' : 'Listing added') + ' in the preview list. Nothing was published.');
  } catch (err) { formError('Could not save (' + (err.code || err.message) + '). Check that you are signed in with the owner account and that firestore.rules is published.'); }
});

async function remove(l) {
  if (!confirm('Delete the ' + (names[l.commodity] || l.commodity) + ' listing? This cannot be undone.')) return;
  try { await store.remove(l.id); notice('Listing deleted.'); await load(); }
  catch (err) { formError('Could not delete (' + (err.code || err.message) + ').'); }
}

$('admin-import-btn').addEventListener('click', async () => {
  formError('');
  try { await store.importSeed(); await load(); }
  catch (err) { formError('Import failed (' + (err.code || err.message) + ').'); }
});

/* ---------- start ---------- */
(async function start() {
  counter();
  if (demo) {
    $('admin-preview').hidden = false; store = demoStore(); show('admin-app'); await load(); return;
  }
  if (!cfg.projectId) { show('admin-setup'); return; }
  try {
    await firebaseStore(async (user) => {
      $('admin-user').hidden = !user;
      const remember = (on) => { try { if (on) localStorage.setItem('kabani-admin', '1'); else localStorage.removeItem('kabani-admin'); } catch (e) { /* storage blocked */ } };
      if (!user) { remember(false); show('admin-signin'); return; }
      $('admin-email').textContent = user.email;
      const owner = user.email && user.email.toLowerCase() === cfg.ownerEmail.toLowerCase() && user.emailVerified;
      if (!owner) { remember(false); show('admin-denied'); return; }
      if (idleExpired()) { await expire(); return; } // came back after 30+ minutes: the saved sign-in is no longer valid
      if (!seenAt()) touch();
      remember(true); show('admin-app'); await load();
    });
  } catch (err) {
    show('admin-signin'); $('admin-error').textContent = 'Could not reach the sign-in service (' + (err.message || err) + ').'; $('admin-error').hidden = false;
  }
})();

/* ---------- commodity slicer (same control as the public Commodities page) ---------- */
(function slicer() {
  const btn = $('slicer-btn'), panel = $('slicer-panel'), clearBtn = $('slicer-clear'), label = btn.querySelector('.slicer-label');
  const boxes = [...panel.querySelectorAll('input[type="checkbox"][value]')], topicBoxes = [...panel.querySelectorAll('input[data-topic]')];
  const setOpen = (o) => { panel.hidden = !o; btn.setAttribute('aria-expanded', String(o)); };
  btn.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('click', (e) => { if (!panel.hidden && !e.target.closest('.slicer')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
  const fromBoxes = () => setPicked(boxes.filter((b) => b.checked).map((b) => b.value));
  boxes.forEach((b) => b.addEventListener('change', fromBoxes));
  topicBoxes.forEach((tb) => tb.addEventListener('change', () => {
    const t = data.topics.find((x) => x.id === tb.dataset.topic);
    boxes.forEach((b) => { if (t.slugs.includes(b.value)) b.checked = tb.checked; });
    fromBoxes();
  }));
  clearBtn.addEventListener('click', () => setPicked([]));
  window.__syncSlicer = () => {
    boxes.forEach((b) => { b.checked = picked.has(b.value); });
    for (const tb of topicBoxes) {
      const t = data.topics.find((x) => x.id === tb.dataset.topic), n = t.slugs.filter((s) => picked.has(s)).length;
      tb.checked = n === t.slugs.length; tb.indeterminate = n > 0 && n < t.slugs.length;
    }
    const a = [...picked];
    label.textContent = !a.length ? 'All commodities' : a.length === 1 ? names[a[0]] : a.length + ' commodities';
    btn.classList.toggle('is-filtered', a.length > 0); clearBtn.hidden = !a.length;
  };
})();
function setPicked(slugs) { picked.clear(); slugs.forEach((s) => picked.add(s)); window.__syncSlicer(); render(); }
