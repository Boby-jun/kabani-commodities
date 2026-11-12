/* Listings admin: Google sign-in (owner only) and add / edit / delete of supply and demand listings.
   Security is enforced by firestore.rules on Google's side; the checks here only shape the screen. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, collection, getDocs, addDoc, setDoc, deleteDoc, doc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const $ = (id) => document.getElementById(id);
const cfg = window.KABANI_FIREBASE || {};
const data = JSON.parse($('admin-data').textContent);
const names = Object.fromEntries(data.commodities.map((c) => [c.slug, c.name]));
const order = Object.fromEntries(data.commodities.map((c, i) => [c.slug, i]));
for (const n of data.countries) { const o = document.createElement('option'); o.value = n; $('country-list').append(o); }
const views = ['admin-setup', 'admin-signin', 'admin-denied', 'admin-app'];
const show = (id) => views.forEach((v) => { $(v).hidden = v !== id; });

let db, auth, listings = [], tab = 'supply', editing = null;

if (!cfg.projectId) {
  show('admin-setup');
} else {
  const app = initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, appId: cfg.appId });
  auth = getAuth(app);
  db = getFirestore(app);
  $('admin-signin-btn').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: cfg.ownerEmail, hd: cfg.ownerEmail.split('@')[1] });
    try { $('admin-error').hidden = true; await signInWithPopup(auth, provider); }
    catch (e) { $('admin-error').textContent = 'Sign-in did not complete (' + (e.code || e.message) + ').'; $('admin-error').hidden = false; }
  });
  $('admin-signout').addEventListener('click', () => signOut(auth));
  onAuthStateChanged(auth, async (user) => {
    $('admin-user').hidden = !user;
    if (!user) { show('admin-signin'); return; }
    $('admin-email').textContent = user.email;
    const owner = user.email && user.email.toLowerCase() === cfg.ownerEmail.toLowerCase() && user.emailVerified;
    if (!owner) { show('admin-denied'); return; }
    show('admin-app');
    await load();
  });
}

async function load() {
  const snap = await getDocs(collection(db, 'listings'));
  listings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  $('admin-import').hidden = listings.length > 0 || sessionStorage.getItem('kabani-live') === '1';
  render();
}

function markLive() {
  sessionStorage.setItem('kabani-live', '1');
  return setDoc(doc(db, 'meta', 'live'), { updatedAt: serverTimestamp() }, { merge: true });
}

function cell(text) { const td = document.createElement('td'); td.textContent = text; return td; }

function render() {
  for (const t of ['supply', 'demand']) $('count-' + t).textContent = listings.filter((l) => l.type === t).length;
  const rows = listings.filter((l) => l.type === tab).sort((a, b) => (order[a.commodity] ?? 99) - (order[b.commodity] ?? 99));
  $('admin-thead').innerHTML = tab === 'supply'
    ? '<tr><th>Commodity</th><th>Volume</th><th>Origin</th><th></th></tr>'
    : '<tr><th>Commodity</th><th>Volume</th><th>When</th><th>Destination port</th><th>Country</th><th></th></tr>';
  const tbody = $('admin-tbody'); tbody.textContent = '';
  for (const l of rows) {
    const tr = document.createElement('tr');
    tr.append(cell(names[l.commodity] || l.commodity), cell(l.volume || ''));
    if (tab === 'supply') tr.append(cell(l.origin || 'Shared on request'));
    else tr.append(cell(l.when || ''), cell(l.port || ''), cell(l.country || ''));
    const actions = document.createElement('td'); actions.className = 'col-go';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'panel-showall'; edit.textContent = 'Edit';
    edit.addEventListener('click', () => startEdit(l));
    const del = document.createElement('button'); del.type = 'button'; del.className = 'panel-showall admin-del'; del.textContent = 'Delete';
    del.addEventListener('click', () => remove(l));
    actions.append(edit, ' ', del); tr.append(actions); tbody.append(tr);
  }
  $('admin-empty').hidden = rows.length > 0;
  $('admin-form-title').textContent = (editing ? 'Edit ' : 'Add a ') + (editing ? '' : '') + tab + ' listing';
  $('admin-save').textContent = editing ? 'Save changes' : 'Add listing';
  $('admin-cancel').hidden = !editing;
  $('row-supply').hidden = tab !== 'supply';
  $('row-demand').hidden = tab !== 'demand';
}

function setTab(t) {
  tab = t; editing = null; $('admin-form').reset();
  for (const x of ['supply', 'demand']) {
    $('atab-' + x).setAttribute('aria-selected', x === t ? 'true' : 'false');
    $('atab-' + x).tabIndex = x === t ? 0 : -1;
  }
  render();
}
$('atab-supply').addEventListener('click', () => setTab('supply'));
$('atab-demand').addEventListener('click', () => setTab('demand'));

const sel = $('f-commodity');
for (const c of data.commodities) { const o = document.createElement('option'); o.value = c.slug; o.textContent = c.name; sel.append(o); }

function startEdit(l) {
  editing = l.id;
  sel.value = l.commodity; $('f-volume').value = l.volume || '';
  $('f-origin').value = l.origin || ''; $('f-when').value = l.when || ''; $('f-port').value = l.port || ''; $('f-country').value = l.country || '';
  render(); $('admin-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
$('admin-cancel').addEventListener('click', () => { editing = null; $('admin-form').reset(); render(); });

function formError(msg) { const p = $('admin-form-error'); p.textContent = msg || ''; p.hidden = !msg; }

$('admin-form').addEventListener('submit', async (e) => {
  e.preventDefault(); formError('');
  const payload = { type: tab, commodity: sel.value, volume: $('f-volume').value.trim() };
  if (tab === 'supply') payload.origin = $('f-origin').value.trim();
  else { payload.when = $('f-when').value.trim(); payload.port = $('f-port').value.trim(); payload.country = $('f-country').value.trim(); }
  const place = tab === 'supply' ? payload.origin : payload.country;
  if (place && !data.countries.includes(place)) { formError('"' + place + '" is not a country on the map. Pick one from the suggestions so it shows up on the map (for example Netherlands, or United States of America).'); return; }
  try {
    if (editing) await setDoc(doc(db, 'listings', editing), payload);
    else await addDoc(collection(db, 'listings'), payload);
    await markLive();
    editing = null; $('admin-form').reset(); await load();
  } catch (err) { formError('Could not save (' + (err.code || err.message) + '). Check that you are signed in with the owner account and that firestore.rules is published.'); }
});

async function remove(l) {
  if (!confirm('Delete the ' + (names[l.commodity] || l.commodity) + ' listing? This cannot be undone.')) return;
  try { await deleteDoc(doc(db, 'listings', l.id)); await markLive(); await load(); }
  catch (err) { formError('Could not delete (' + (err.code || err.message) + ').'); }
}

$('admin-import-btn').addEventListener('click', async () => {
  formError('');
  try {
    const batch = writeBatch(db);
    for (const r of data.seed.supply) batch.set(doc(collection(db, 'listings')), { type: 'supply', commodity: r.commodity, volume: r.volume, origin: r.origin });
    for (const r of data.seed.demand) batch.set(doc(collection(db, 'listings')), { type: 'demand', commodity: r.commodity, volume: r.volume, when: r.when, port: r.port, country: r.country || '' });
    batch.set(doc(db, 'meta', 'live'), { updatedAt: serverTimestamp() }, { merge: true });
    await batch.commit(); sessionStorage.setItem('kabani-live', '1'); await load();
  } catch (err) { formError('Import failed (' + (err.code || err.message) + ').'); }
});
