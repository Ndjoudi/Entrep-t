// ── Ventes module ────────────────────────────────────────────────────────────
// Analyse des ventes CSV (groupes / produits) avec agrégation par période.
// Dépendances globales : P (core.js), getCat (fiche.js – optionnel)

const PU = 'https://admin.deleev.com/products/';
const V_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfM1pfKdlM8P9_st0b9Mj_7A6SCargdFzfMaVlqDPNUnnYEyGPuUknGkdBdacALVll/exec?action=ventes';

// ── State ────────────────────────────────────────────────────────────────────
let DV = null;
let gran = 'week', per = 'ALL', vSortV = 'ca_desc', vQV = '', vExpId = null;
let vRupOnly = false, vPageV = 1, vPageSizeV = 25, vPromoOnly = false, vGroupeOnly = false;
let vRuptFournIds = new Set(), vRuptFournOnly = false;
let vQiFilter = null, vStFilter = null, vZoneFilter = null;

// ── Helpers ──────────────────────────────────────────────────────────────────
const vFc = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const vFi = n => Math.round(n).toLocaleString('fr-FR');
const vSo = o => Object.values(o).reduce((s, v) => s + v, 0);

function vSplitL(line, sep = ',') {
  const r = []; let c = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === sep && !q) { r.push(c.trim()); c = ''; }
    else c += ch;
  }
  r.push(c.trim());
  return r;
}

// ── Produit data lookup (from depot P array) ─────────────────────────────────
function vGetProdData(g) {
  if (typeof P === 'undefined' || !P || !P.length) return null;
  const ids = g.soloId ? [String(g.soloId)] : (g.pids || []).map(String);
  const prods = ids.map(id => P.find(p => String(p.id) === id)).filter(Boolean);
  if (!prods.length) return null;
  return {
    qi: prods.reduce((s, p) => s + (p.q || 0), 0),
    st: prods.reduce((s, p) => s + (p.st || 0), 0)
  };
}

function vGetGroupZones(g) {
  if (typeof P === 'undefined' || !P || !P.length) return [];
  const ids = g.soloId ? [String(g.soloId)] : (g.pids || []).map(String);
  return [...new Set(ids.map(id => P.find(p => String(p.id) === id)).filter(Boolean).map(p => zone(p.a)))];
}

function vBuildZoneSel() {
  const sel = document.getElementById('vZoneSel');
  if (!sel || typeof P === 'undefined' || !P.length) return;
  const order = ['LGV','PF','Rota','Prio','Salée','Sucrée','Liquide','DPH','Frais sec','Autre'];
  const present = order.filter(z => P.some(p => zone(p.a) === z));
  sel.innerHTML = '<option value="">Toutes les zones</option>' +
    present.map(z => `<option value="${z}"${vZoneFilter === z ? ' selected' : ''}>${z}</option>`).join('');
}

function vToggleQi(val) {
  vQiFilter = vQiFilter === val ? null : val;
  document.querySelectorAll('#ventes-page .vqi-btn').forEach(b => b.classList.toggle('active', b.dataset.qi === vQiFilter));
  vPageV = 1; renderV();
}

function vToggleSt(val) {
  vStFilter = vStFilter === val ? null : val;
  document.querySelectorAll('#ventes-page .vst-btn').forEach(b => b.classList.toggle('active', b.dataset.st === vStFilter));
  vPageV = 1; renderV();
}

// ── Drop zone setup ───────────────────────────────────────────────────────────
function vSetupDrop(dzId, inpId, nameId, cb) {
  const dz = document.getElementById(dzId);
  const inp = document.getElementById(inpId);
  if (!dz || !inp) return;
  dz.addEventListener('click', () => inp.click());
  inp.addEventListener('change', e => { if (e.target.files[0]) vReadF(e.target.files[0], dzId, nameId, cb); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('over');
    if (e.dataTransfer.files[0]) vReadF(e.dataTransfer.files[0], dzId, nameId, cb);
  });
}

function vReadF(file, dzId, nameId, cb) {
  const r = new FileReader();
  r.onload = e => { try { cb(e.target.result, file.name); } catch (err) { vShowErr(err.message); } };
  r.readAsText(file, 'UTF-8');
}

function vCheckReady() {
  const btn = document.getElementById('btnL');
  if (btn) btn.classList.toggle('ready', !!DV);
}

function vShowErr(m) {
  const e = document.getElementById('vErrBox');
  if (e) { e.textContent = m; e.style.display = 'block'; }
}

// ── Date column detection (multi-format) ─────────────────────────────────────
function vParseColDate(s) {
  let m;
  // dd/mm/yyyy  (format export Deleev standard)
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // dd/mm/yy
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  // yyyy-mm-dd
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  // dd.mm.yyyy
  m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // dd-mm-yyyy
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // contains dd/mm/yyyy anywhere (e.g. "Lun 01/04/2024")
  m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseVentes(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('Fichier vide.');
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const header = vSplitL(lines[0], sep);
  const dcols = [];
  for (let i = 0; i < header.length; i++) {
    const iso = vParseColDate(header[i].trim());
    if (iso) dcols.push({ idx: i, iso, label: header[i] });
  }
  const MET = {
    "Nombre d'unité vendue": 'u', "dont unité en promotion": 'up',
    "CA TTC": 'ca', "dont CA TTC en promotion": 'cp', "Nombre de jour en rupture": 'rr'
  };
  if (!dcols.length) {
    console.warn('[Ventes] Headers:', header.slice(0, 10));
    throw new Error(`Aucune colonne de date détectée. En-têtes : ${header.slice(0, 6).join(' | ')}`);
  }
  const fi = dcols[0].idx, gmap = {};
  for (let i = 1; i < lines.length; i++) {
    const row = vSplitL(lines[i], sep);
    if (row.length < fi) continue;
    const idP = row[0]?.trim(); if (!idP || isNaN(+idP)) continue;
    let mk = null, mi = -1;
    for (let j = 1; j < fi; j++) { const v = row[j]?.trim(); if (MET[v]) { mk = MET[v]; mi = j; break; } }
    if (!mk) continue;
    const ig = row[2]?.trim(), ng = row.slice(3, mi).join(', ').trim();
    const gid = (ig && ig !== '0' && ig !== '') ? ig : `s_${idP}`;
    const gnm = (ig && ig !== '0' && ig !== '') ? (ng || ig) : (row[1]?.trim() || idP);
    const hg = !gid.startsWith('s_');
    if (!gmap[gid]) gmap[gid] = { id: gid, nom: gnm, hg, soloId: hg ? null : idP, prods: {}, pids: [] };
    if (!gmap[gid].prods[idP]) { gmap[gid].prods[idP] = { id: idP }; gmap[gid].pids.push(idP); }
    if (!gmap[gid].prods[idP][mk]) gmap[gid].prods[idP][mk] = {};
    dcols.forEach(dc => {
      const v = parseFloat((row[dc.idx] || '0').replace(',', '.')) || 0;
      gmap[gid].prods[idP][mk][dc.iso] = v;
    });
  }
  const allD = dcols.map(dc => dc.iso);
  const groups = [];
  for (const gid of Object.keys(gmap)) {
    const g = gmap[gid]; const ps = Object.values(g.prods);
    const j = { u: {}, up: {}, ca: {}, cp: {}, rup: {}, rj: {} };
    allD.forEach(d => {
      j.u[d] = ps.reduce((s, p) => s + (p.u?.[d] || 0), 0);
      j.up[d] = ps.reduce((s, p) => s + (p.up?.[d] || 0), 0);
      j.ca[d] = Math.round(ps.reduce((s, p) => s + (p.ca?.[d] || 0), 0) * 100) / 100;
      j.cp[d] = Math.round(ps.reduce((s, p) => s + (p.cp?.[d] || 0), 0) * 100) / 100;
      const pr = ps.filter(p => p.rr !== undefined);
      if (!pr.length) { j.rup[d] = 0; j.rj[d] = 0; }
      else if (ps.length === 1) { j.rup[d] = (pr[0]?.rr?.[d] || 0) > 0 ? 1 : 0; j.rj[d] = j.rup[d]; }
      else { j.rup[d] = pr.every(p => (p.rr?.[d] || 0) > 0) ? 1 : 0; j.rj[d] = pr.filter(p => (p.rr?.[d] || 0) > 0).length; }
    });
    groups.push({ id: gid, nom: g.nom, hg: g.hg, soloId: g.soloId, pids: g.pids, supplierId: gid.startsWith('s_') ? null : gid, j });
  }
  groups.sort((a, b) => vSo(b.j.ca) - vSo(a.j.ca));
  const dates = dcols.map(dc => {
    const dt = new Date(dc.iso + 'T00:00:00');
    const dn = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const mn = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const dl = `${dn[dt.getDay()]} ${dc.iso.slice(8)}/${dc.iso.slice(5, 7)}`;
    const tmp = new Date(dt); tmp.setHours(0, 0, 0, 0); tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7);
    const w1 = new Date(tmp.getFullYear(), 0, 4);
    const wn = 1 + Math.round(((tmp - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
    const wk = `${dt.getFullYear()}-W${String(wn).padStart(2, '0')}`;
    const mo = new Date(dt); mo.setDate(dt.getDate() - (dt.getDay() + 6) % 7);
    const wl = `Sem. ${String(wn).padStart(2, '0')} (${String(mo.getDate()).padStart(2, '0')}/${String(mo.getMonth() + 1).padStart(2, '0')})`;
    return { date: dc.iso, dl, wk, wl, mk: dc.iso.slice(0, 7), ml: `${mn[dt.getMonth()]} ${dt.getFullYear()}` };
  });
  return { groups, dates };
}

// ── Rupture fournisseur detection ─────────────────────────────────────────────
function vDetectRuptFourn() {
  if (!DV) return new Set();
  const allDates = DV.dates.map(d => d.date).sort();
  if (!allDates.length) return new Set();
  const window90 = allDates.slice(-90);
  const ids = new Set();
  DV.groups.forEach(g => {
    const allZero = window90.every(d => (g.j.u[d] || 0) === 0);
    if (allZero) ids.add(g.id);
  });
  return ids;
}

// ── Launch ────────────────────────────────────────────────────────────────────
function launchV() {
  if (!DV) return;
  document.getElementById('vV-drop').style.display = 'none';
  document.getElementById('vV-dash').style.display = 'flex';
  const ad = DV.dates.map(d => d.date).sort();
  document.getElementById('vTopMeta').textContent =
    `${DV.groups.length} groupes · ${DV.dates.length} jours (${ad[0]?.split('-').reverse().join('/')} → ${ad.at(-1)?.split('-').reverse().join('/')})`;
  vRuptFournIds = vDetectRuptFourn();
  vBuildZoneSel();
  vBuildPer(); renderV();
  var _kdPage = document.getElementById('kpi-dashboard-page');
  if (_kdPage && _kdPage.style.display !== 'none') rKpiDashboard();
}

// ── Period selector ───────────────────────────────────────────────────────────
function vBuildPer() {
  if (!DV) return;
  const seen = new Map();
  DV.dates.forEach(d => {
    if (gran === 'day') { if (!seen.has(d.date)) seen.set(d.date, d.dl); }
    else if (gran === 'week') { if (!seen.has(d.wk)) seen.set(d.wk, d.wl); }
    else { if (!seen.has(d.mk)) seen.set(d.mk, d.ml); }
  });
  const all = [['ALL', 'Tout'], ...seen.entries()];
  const sel = document.getElementById('pSel');
  sel.innerHTML = all.map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  const keys = all.map(([k]) => k);
  sel.value = keys.includes(per) ? per : 'ALL'; per = sel.value;
}

function vGetDates() {
  if (!DV) return [];
  if (per === 'ALL') return DV.dates.map(d => d.date);
  if (gran === 'day') return DV.dates.filter(d => d.date === per).map(d => d.date);
  if (gran === 'week') return DV.dates.filter(d => d.wk === per).map(d => d.date);
  return DV.dates.filter(d => d.mk === per).map(d => d.date);
}

// ── Aggregation ───────────────────────────────────────────────────────────────
function vAgg(g, dates) {
  let ca = 0, u = 0, cp = 0, up = 0, r = 0;
  dates.forEach(d => {
    ca += g.j.ca[d] || 0; u += g.j.u[d] || 0;
    cp += g.j.cp[d] || 0; up += g.j.up[d] || 0;
    if (g.j.rup[d]) r++;
  });
  const jt = dates.length, js = dates.filter(d => !g.j.rup[d]).length;
  const uSR = js > 0 ? Math.round(u / js * jt) : u;
  const tr = jt > 0 ? Math.round(r / jt * 100) : 0;
  const uLost = Math.max(0, uSR - u);
  const uNonPromo = u - up, caNonPromo = ca - cp;
  const prixPlein = uNonPromo > 0 ? (caNonPromo / uNonPromo) : (u > 0 ? ca / u : 0);
  const caPerduRupture = Math.max(0, uLost * prixPlein);
  const prixPromo = up > 0 ? cp / up : 0;
  const caPerduPromo = up > 0 ? Math.max(0, up * (prixPlein - prixPromo)) : 0;
  const caP = Math.round((caPerduRupture + caPerduPromo) * 100) / 100;
  return {
    ca: Math.round(ca * 100) / 100, u: Math.round(u), uSR,
    cp: Math.round(cp * 100) / 100, up: Math.round(up), r, tr, caP,
    caPerduRupture: Math.round(caPerduRupture * 100) / 100,
    caPerduPromo: Math.round(caPerduPromo * 100) / 100
  };
}

// ── Heat color ────────────────────────────────────────────────────────────────
function vHc(rj, nb) {
  if (!rj) return 'var(--surface3)';
  if (nb <= 1 || rj >= nb) return 'var(--rupture)';
  return rj / nb >= 0.5 ? 'color-mix(in srgb,var(--rupture) 70%,transparent)' : 'color-mix(in srgb,var(--rupture) 35%,transparent)';
}

// ── Product badge (links to admin, uses depot P if available) ─────────────────
function vBuildPidBadge(p) {
  if (typeof P !== 'undefined' && P.length) {
    const prod = P.find(x => String(x.id) === String(p));
    if (prod && typeof prod.nom !== 'undefined') {
      const cat = typeof getCat === 'function' ? getCat(prod.cat) : { color: 'var(--text3)', label: '' };
      const label = prod.dvs != null ? (prod.dvs + 'j') : '—';
      const name = prod.nom.slice(0, 22);
      return '<span onclick="vBuildPidBadge.jump(' + prod.id + ')" style="font-family:\'Geist Mono\',monospace;font-size:10px;border:1px solid ' + cat.color + '55;border-radius:5px;padding:2px 8px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;background:' + cat.color + '11;color:' + cat.color + '">📦 #' + p + ' · ' + name + ' · ' + label + '</span>';
    }
  }
  return '<a href="' + PU + p + '" target="_blank" style="font-family:\'Geist Mono\',monospace;font-size:10px;color:var(--units);text-decoration:none;border:1px solid var(--border);border-radius:5px;padding:2px 8px">→ #' + p + '</a>';
}

// ── Filters ───────────────────────────────────────────────────────────────────
function vToggleRup() {
  vRupOnly = !vRupOnly;
  document.getElementById('rfBtn').classList.toggle('on', vRupOnly);
  if (vRupOnly) {
    vRuptFournOnly = false; vPromoOnly = false; vGroupeOnly = false;
    document.getElementById('rfFournBtn').classList.remove('on');
    document.getElementById('promoBtn').classList.remove('on');
    document.getElementById('groupeBtn').classList.remove('on');
  }
  vPageV = 1; renderV();
}

function vToggleRuptFourn() {
  vRuptFournOnly = !vRuptFournOnly;
  document.getElementById('rfFournBtn').classList.toggle('on', vRuptFournOnly);
  if (vRuptFournOnly) {
    vRupOnly = false; vPromoOnly = false; vGroupeOnly = false;
    document.getElementById('rfBtn').classList.remove('on');
    document.getElementById('promoBtn').classList.remove('on');
    document.getElementById('groupeBtn').classList.remove('on');
  }
  vPageV = 1; renderV();
}

function vTogglePromo() {
  vPromoOnly = !vPromoOnly;
  document.getElementById('promoBtn').classList.toggle('on', vPromoOnly);
  if (vPromoOnly) {
    vRupOnly = false; vRuptFournOnly = false; vGroupeOnly = false;
    document.getElementById('rfBtn').classList.remove('on');
    document.getElementById('rfFournBtn').classList.remove('on');
    document.getElementById('groupeBtn').classList.remove('on');
  }
  vPageV = 1; renderV();
}

function vToggleGroupe() {
  vGroupeOnly = !vGroupeOnly;
  document.getElementById('groupeBtn').classList.toggle('on', vGroupeOnly);
  if (vGroupeOnly) {
    vRupOnly = false; vRuptFournOnly = false; vPromoOnly = false;
    document.getElementById('rfBtn').classList.remove('on');
    document.getElementById('rfFournBtn').classList.remove('on');
    document.getElementById('promoBtn').classList.remove('on');
  }
  vPageV = 1; renderV();
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderV() {
  if (!DV) return;
  const dates = vGetDates();
  let gs = DV.groups.map(g => ({ ...g, a: vAgg(g, dates), isRF: vRuptFournIds.has(g.id) }));
  if (vRuptFournOnly) gs = gs.filter(g => g.isRF);
  else if (vRupOnly) gs = gs.filter(g => g.a.r > 0 && !g.isRF);
  else if (vPromoOnly) gs = gs.filter(g => g.a.cp > 0 && !g.isRF);
  else if (vGroupeOnly) gs = gs.filter(g => g.hg);
  if (vQV) { const q = vQV.toLowerCase(); gs = gs.filter(g => g.nom.toLowerCase().includes(q)); }
  const hasP = typeof P !== 'undefined' && P && P.length > 0;
  if (hasP && vQiFilter !== null) {
    gs = gs.filter(g => {
      const d = vGetProdData(g); if (!d) return true;
      if (vQiFilter === '0') return d.qi === 0;
      if (vQiFilter === '1') return d.qi === 1;
      if (vQiFilter === '1+') return d.qi >= 1;
      return d.qi >= 2;
    });
  }
  if (hasP && vStFilter !== null) {
    gs = gs.filter(g => {
      const d = vGetProdData(g); if (!d) return true;
      if (vStFilter === '0') return d.st === 0;
      if (vStFilter === '1') return d.st === 1;
      if (vStFilter === '1+') return d.st >= 1;
      return d.st >= 2;
    });
  }
  if (hasP && vZoneFilter) {
    gs = gs.filter(g => vGetGroupZones(g).includes(vZoneFilter));
  }
  const [sk, sd] = vSortV.split('_');
  gs.sort((a, b) => {
    if (sk === 'ca') return sd === 'desc' ? b.a.ca - a.a.ca : a.a.ca - b.a.ca;
    if (sk === 'u') return b.a.u - a.a.u;
    if (sk === 'r') return b.a.tr - a.a.tr;
    if (sk === 'promo') return (b.a.ca > 0 ? b.a.cp / b.a.ca : 0) - (a.a.ca > 0 ? a.a.cp / a.a.ca : 0);
    return a.nom.localeCompare(b.nom, 'fr');
  });
  const gsStats = vRuptFournOnly ? gs : gs.filter(g => !g.isRF);
  const tCA = gsStats.reduce((s, g) => s + g.a.ca, 0);
  const tU = gsStats.reduce((s, g) => s + g.a.u, 0);
  const tCP = gsStats.reduce((s, g) => s + g.a.caP, 0);
  const trMoy = gsStats.length > 0 ? Math.round(gsStats.reduce((s, g) => s + g.a.tr, 0) / gsStats.length) : 0;
  document.getElementById('vKca').textContent = vFc(tCA) + ' €';
  document.getElementById('vKu').textContent = vFi(tU);
  document.getElementById('vKcp').textContent = vFc(tCP) + ' €';
  document.getElementById('vKr').textContent = trMoy + '%';
  const nRF = gs.filter(g => g.isRF).length;
  const ng = gs.filter(g => g.hg).length, np = gs.filter(g => !g.hg).length;
  document.getElementById('vRcV').textContent = [
    ng > 0 ? `${ng} groupe${ng > 1 ? 's' : ''}` : null,
    np > 0 ? `${np} produit${np > 1 ? 's' : ''}` : null,
    nRF > 0 ? `${nRF} rupt. fourn.` : null
  ].filter(Boolean).join(' · ');
  const mCA = Math.max(...gs.map(g => g.a.ca), 1);
  const mU = Math.max(...gs.map(g => g.a.u), 1);
  const allD = DV.dates.map(d => d.date);
  const totalGs = gs.length;
  const totalPages = Math.max(1, Math.ceil(totalGs / vPageSizeV));
  if (vPageV > totalPages) vPageV = totalPages;
  const gsPage = gs.slice((vPageV - 1) * vPageSizeV, vPageV * vPageSizeV);

  // Pagination
  (function () {
    const el = document.getElementById('paginV'); if (!el) return;
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    const maxBtn = 7; let pages = [];
    if (totalPages <= maxBtn) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages = [1];
      if (vPageV > 3) pages.push('…');
      const s = Math.max(2, vPageV - 1), e = Math.min(totalPages - 1, vPageV + 1);
      for (let i = s; i <= e; i++) pages.push(i);
      if (vPageV < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    const btnHtml = pages.map(p =>
      p === '…'
        ? `<span class="pagin-btn" style="border:none;background:transparent;cursor:default">…</span>`
        : `<button class="pagin-btn${p === vPageV ? ' cur' : ''}" onclick="vPageV=${p};renderV()">${p}</button>`
    ).join('');
    el.innerHTML = `<div class="pagin">
      <button class="pagin-btn" onclick="vPageV=Math.max(1,vPageV-1);renderV()" ${vPageV === 1 ? 'disabled' : ''}>← Préc.</button>
      ${btnHtml}
      <button class="pagin-btn" onclick="vPageV=Math.min(${totalPages},vPageV+1);renderV()" ${vPageV === totalPages ? 'disabled' : ''}>Suiv. →</button>
      <span class="pagin-info">${(vPageV - 1) * vPageSizeV + 1}–${Math.min(vPageV * vPageSizeV, totalGs)} / ${totalGs}</span>
      <select class="pagin-size" onchange="vPageSizeV=parseInt(this.value);vPageV=1;renderV()">
        ${[25, 50, 100].map(n => `<option value="${n}"${n === vPageSizeV ? ' selected' : ''}>${n} / page</option>`).join('')}
      </select>
    </div>`;
  })();

  const tb = document.getElementById('tbV'); tb.innerHTML = '';
  const colSpan = 10 + (hasP ? 2 : 0);
  if (!gsPage.length) { tb.innerHTML = `<tr class="empty"><td colspan="${colSpan}">Aucun résultat</td></tr>`; return; }

  gsPage.forEach(g => {
    const { ca, u, uSR, cp, r, tr, caP, caPerduRupture, caPerduPromo } = g.a;
    const pct = ca > 0 ? (cp / ca * 100).toFixed(1) : '0.0';
    const isE = vExpId === g.id;
    const nb = g.pids?.length || 1;
    const heat = allD.map(d => {
      const rj = g.j.rj?.[d] || 0;
      return `<div class="hd" style="background:${vHc(rj, nb)}" title="${d}${rj > 0 ? ` (${rj}/${nb})` : ' OK'}"></div>`;
    }).join('');
    const nH = g.hg
      ? `<span>${g.nom}</span>`
      : `<a class="pl" href="${PU}${g.soloId}" target="_blank" onclick="event.stopPropagation()">${g.nom}</a>`;
    const tg = g.hg ? '<span class="tag">groupe</span>' : '<span class="tag">produit</span>';
    const tr2 = document.createElement('tr');
    if (isE) tr2.classList.add('exp');
    const caLostHtml = g.isRF ? '' : (caP > 0
      ? `<div style="font-size:9px;font-family:'Geist Mono',monospace;margin-top:2px;line-height:1.6">
          ${caPerduRupture > 0 ? `<span style="color:var(--rupture)">-${vFc(caPerduRupture)}€ rupt.</span>` : ''}
          ${caPerduPromo > 0 ? `<span style="color:var(--promo);margin-left:2px">-${vFc(caPerduPromo)}€ promo</span>` : ''}
        </div>` : '');
    const partCA = (function () {
      const real = tCA > 0 ? ca / tCA * 100 : 0;
      const disp = real < 1 ? (real * 100).toFixed(1).replace(/\.0$/, '') + '‰' : real.toFixed(1).replace(/\.0$/, '') + '%';
      const col = real < 1 ? 'var(--warn)' : 'var(--text3)';
      return `<span style="font-family:'Geist Mono',monospace;font-size:10px;color:${col};min-width:36px;cursor:default" title="${real.toFixed(2)}%">${disp}</span>`;
    })();
    const partU = (function () {
      const real = tU > 0 ? u / tU * 100 : 0;
      const disp = real < 1 ? (real * 100).toFixed(1).replace(/\.0$/, '') + '‰' : real.toFixed(1).replace(/\.0$/, '') + '%';
      const col = real < 1 ? 'var(--warn)' : 'var(--text3)';
      return `<span style="font-family:'Geist Mono',monospace;font-size:10px;color:${col};min-width:36px;cursor:default" title="${real.toFixed(2)}%">${disp}</span>`;
    })();
    const pd = hasP ? vGetProdData(g) : null;
    const qiH = hasP ? `<td class="num" style="color:${pd ? (pd.qi === 0 ? 'var(--rupture)' : pd.qi === 1 ? 'var(--warn)' : 'var(--text)') : 'var(--text3)'}">${pd ? pd.qi : '—'}</td>` : '';
    const stH = hasP ? `<td class="num" style="color:${pd ? (pd.st === 0 ? 'var(--rupture)' : 'var(--ok)') : 'var(--text3)'}">${pd ? pd.st : '—'}</td>` : '';
    tr2.innerHTML = `
      <td><div class="gname"><span class="chev">▶</span>${nH}${tg}</div></td>
      <td class="num kv-ca">${vFc(ca)} €</td>
      <td><div class="bw"><div class="bb"><div class="bf ca" style="width:${Math.round(ca / mCA * 100)}%"></div></div>${partCA}</div></td>
      <td class="num kv-u">${vFi(u)}</td>
      <td class="num" style="color:${uSR > u ? 'var(--ok)' : 'var(--text3)'}">${vFi(uSR)}</td>
      <td><div class="bw"><div class="bb"><div class="bf u" style="width:${Math.round(u / mU * 100)}%"></div></div>${partU}</div></td>
      <td class="num kv-promo">${vFc(cp)} €</td>
      <td class="num"><span class="badge ${parseFloat(pct) > 20 ? 'b-promo' : 'b-muted'}">${pct}%</span></td>
      <td class="num">
        ${g.isRF
          ? `<span class="badge b-rf">Rupt. fourn.</span>`
          : `<span class="badge ${r === 0 ? 'b-ok' : 'b-bad'}">${tr}%</span>
            ${caP > 0 ? `<span style="font-size:10px;color:var(--rupture);margin-left:3px;font-family:'Geist Mono',monospace">-${vFc(caP)}€</span>` : ''}
            ${caLostHtml}`}
      </td>
      ${qiH}${stH}
      <td><div class="heat">${heat}</div></td>`;
    tr2.addEventListener('click', () => { vExpId = vExpId === g.id ? null : g.id; renderV(); });
    tb.appendChild(tr2);

    if (isE) {
      let items = [];
      if (gran === 'day' && per !== 'ALL') {
        items = [{ lbl: DV.dates.find(x => x.date === per)?.dl || per, dates: [per] }];
      } else if (gran === 'week' && per !== 'ALL') {
        items = DV.dates.filter(x => x.wk === per).map(x => ({ lbl: x.dl, dates: [x.date] }));
      } else if (gran === 'month' && per !== 'ALL') {
        const wks = [...new Set(DV.dates.filter(x => x.mk === per).map(x => x.wk))];
        items = wks.map(wk => ({ lbl: DV.dates.find(x => x.wk === wk)?.wl || wk, dates: DV.dates.filter(x => x.wk === wk).map(x => x.date) }));
      } else if (gran === 'month') {
        const mks = [...new Set(allD.map(d => DV.dates.find(x => x.date === d)?.mk).filter(Boolean))];
        items = mks.map(mk => ({ lbl: DV.dates.find(x => x.mk === mk)?.ml || mk, dates: DV.dates.filter(x => x.mk === mk).map(x => x.date) }));
      } else {
        const wks = [...new Set(allD.map(d => DV.dates.find(x => x.date === d)?.wk).filter(Boolean))];
        items = wks.map(wk => ({ lbl: DV.dates.find(x => x.wk === wk)?.wl || wk, dates: DV.dates.filter(x => x.wk === wk).map(x => x.date) }));
      }
      const cards = items.map(pi => {
        const a = vAgg(g, pi.dates);
        const pp = a.ca > 0 ? (a.cp / a.ca * 100).toFixed(1) : '0.0';
        return `<div class="det-card"><div class="dct">${pi.lbl}</div>
          <div class="dr"><span class="drl">CA TTC</span><span class="drv kv-ca">${vFc(a.ca)} €</span></div>
          <div class="dr"><span class="drl">Unités</span><span class="drv kv-u">${vFi(a.u)}</span></div>
          <div class="dr"><span class="drl">SR est.</span><span class="drv kv-ok">${vFi(a.uSR)}</span></div>
          <div class="dr"><span class="drl">Promo</span><span class="drv kv-promo">${pp}%</span></div>
          <div class="dr"><span class="drl">Rupture</span><span class="drv" style="color:${a.r > 0 ? 'var(--rupture)' : 'var(--ok)'}">${a.tr}%</span></div>
          ${a.caPerduRupture > 0 ? `<div class="dr"><span class="drl">Perdu (rupt.)</span><span class="drv kv-r">-${vFc(a.caPerduRupture)} €</span></div>` : ''}
          ${a.caPerduPromo > 0 ? `<div class="dr"><span class="drl">Perdu (promo)</span><span class="drv" style="color:var(--promo)">-${vFc(a.caPerduPromo)} €</span></div>` : ''}
          ${a.caP > 0 ? `<div class="dr" style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px"><span class="drl">Total perdu</span><span class="drv kv-r">-${vFc(a.caP)} €</span></div>` : ''}
        </div>`;
      }).join('');
      const rfLinks = g.isRF
        ? '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">' +
          (g.pids || [g.soloId]).filter(Boolean).map(p => '<a class="rf-link" href="' + PU + p + '?tab=qiqd" target="_blank">⚠ #' + p + ' → QI/QD</a>').join('') +
          '</div>' : '';
      const pl = g.hg && g.pids?.length > 0
        ? '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">' + g.pids.map(p => vBuildPidBadge(p)).join('') + '</div>'
        : '';
      const dr = document.createElement('tr'); dr.className = 'det-row';
      const dd = document.createElement('td'); dd.colSpan = 10;
      dd.innerHTML = `<div class="det-panel"><div class="det-lbl">${g.nom}</div>${rfLinks}<div class="det-grid">${cards}</div>${pl}</div>`;
      dr.appendChild(dd); tb.appendChild(dr);
    }
  });
}

// ── Export XLSX ───────────────────────────────────────────────────────────────
function expV() {
  if (!DV) return;
  const dates = vGetDates();
  let gs = DV.groups.map(g => ({ ...g, a: vAgg(g, dates) }));
  if (vRupOnly) gs = gs.filter(g => g.a.r > 0);
  if (vQV) { const q = vQV.toLowerCase(); gs = gs.filter(g => g.nom.toLowerCase().includes(q)); }
  const tCA = gs.reduce((s, g) => s + g.a.ca, 0);
  const rows = gs.map(g => {
    const { ca, u, uSR, cp, r, tr, caP, caPerduRupture, caPerduPromo } = g.a;
    const pct = ca > 0 ? +(cp / ca * 100).toFixed(1) : 0;
    return {
      'Groupe/Produit': g.nom, 'Type': g.hg ? 'Groupe' : 'Produit',
      'CA TTC': +ca.toFixed(2), 'Part CA %': +(ca / tCA * 100).toFixed(1),
      'Unités': u, 'SR est.': uSR, 'CA Promo': +cp.toFixed(2), '% Promo': +pct,
      'Taux Rupture %': tr, 'CA Perdu Rupt.': +caPerduRupture.toFixed(2),
      'CA Perdu Promo': +caPerduPromo.toFixed(2), 'CA Perdu Total': +caP.toFixed(2)
    };
  });
  vDlXLSX(rows, 'ventes_export.xlsx');
}

function vDlXLSX(rows, filename) {
  if (!rows.length) { alert('Aucune donnée à exporter.'); return; }
  if (typeof XLSX === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => vDoXLSX(rows, filename);
    document.head.appendChild(s);
  } else { vDoXLSX(rows, filename); }
}

function vDoXLSX(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const cols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, Math.max(...rows.map(r => String(r[k] || '').length))) + 2 }));
  ws['!cols'] = cols;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  XLSX.writeFile(wb, filename);
}

// ── Sync depuis Google Drive (Apps Script) ────────────────────────────────────
async function vSyncDrive() {
  const btn = document.getElementById('vSyncBtn');
  const status = document.getElementById('vSyncStatus');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Chargement…'; }
  if (status) { status.textContent = ''; status.style.display = 'none'; }
  document.getElementById('vErrBox').style.display = 'none';
  try {
    const res = await fetch(V_SCRIPT_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (!text || text.length < 10) throw new Error('Réponse vide');
    console.log('[Ventes] Raw (500 chars):', text.slice(0, 500));
    DV = parseVentes(text);
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Sync Drive'; }
    if (status) {
      const d = new Date();
      status.textContent = `✓ Synchronisé à ${d.getHours()}h${String(d.getMinutes()).padStart(2,'0')}`;
      status.style.display = 'block';
    }
    launchV();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Sync Drive'; }
    vShowErr('Sync Drive échoué : ' + e.message);
  }
}

// ── Resync depuis le dashboard (sans revenir au drop) ────────────────────────
async function vResync() {
  const btn = document.getElementById('vResyncBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }
  try {
    const res = await fetch(V_SCRIPT_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (!text || text.length < 10) throw new Error('Réponse vide');
    console.log('[Ventes] Resync raw (500 chars):', text.slice(0, 500));
    DV = parseVentes(text);
    vRuptFournIds = vDetectRuptFourn();
    const ad = DV.dates.map(d => d.date).sort();
    document.getElementById('vTopMeta').textContent =
      `${DV.groups.length} groupes · ${DV.dates.length} jours (${ad[0]?.split('-').reverse().join('/')} → ${ad.at(-1)?.split('-').reverse().join('/')})`;
    vBuildPer(); renderV();
    var _kdPage = document.getElementById('kpi-dashboard-page');
    if (_kdPage && _kdPage.style.display !== 'none') rKpiDashboard();
    if (btn) { btn.disabled = false; btn.textContent = '✓ Resynced'; setTimeout(() => { btn.textContent = '🔄 Resync'; }, 2000); }
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Resync'; }
    alert('Resync échoué : ' + e.message);
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetV() {
  DV = null;
  vRuptFournIds = new Set(); vRuptFournOnly = false;
  document.getElementById('vV-dash').style.display = 'none';
  document.getElementById('vV-drop').style.display = 'flex';
  document.getElementById('vFVname').style.display = 'none';
  document.getElementById('dzV').style.borderColor = '';
  document.getElementById('vErrBox').style.display = 'none';
  document.getElementById('btnL').classList.remove('ready');
  vRupOnly = false; vRuptFournOnly = false; vPromoOnly = false; vGroupeOnly = false;
  vQiFilter = null; vStFilter = null; vZoneFilter = null;
  document.querySelectorAll('#ventes-page .vqi-btn, #ventes-page .vst-btn').forEach(b => b.classList.remove('active'));
  const zs = document.getElementById('vZoneSel'); if (zs) zs.value = '';
  vExpId = null; vPageV = 1;
}

// ── Event wiring (runs at script load, DOM already present) ───────────────────
vSetupDrop('dzV', 'fV', 'vFVname', (text, name) => {
  DV = parseVentes(text);
  const el = document.getElementById('vFVname');
  el.textContent = '✓ ' + name; el.style.display = 'block';
  document.getElementById('dzV').style.borderColor = 'var(--ok)';
  vCheckReady();
});

document.querySelectorAll('#ventes-page .v-sb').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#ventes-page .v-sb').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gran = btn.dataset.g; per = null; vPageV = 1; vBuildPer(); renderV();
  });
});

document.getElementById('pSel').addEventListener('change', e => { per = e.target.value; vPageV = 1; renderV(); });
document.getElementById('sV').addEventListener('change', e => { vSortV = e.target.value; vPageV = 1; renderV(); });
document.getElementById('siV').addEventListener('input', e => { vQV = e.target.value.trim(); vPageV = 1; renderV(); });
