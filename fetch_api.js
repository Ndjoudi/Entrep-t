// ── fetch_api.js — Chargement produits via API Deleev ────────────────────────

// ── Cache QIQD : { product_id → { stock, qi, qd, rupt, inStock, ... } } ──────
window.QIQD = {};  // mis à jour par uFetchQIQD()

// ── Fetch QIQD (stock + rupture temps réel) pour les fournisseurs actifs ──────
async function uFetchQIQD(opts) { // retourne une Promise
  opts = opts || {};
  const supplierIds = opts.supplierIds && opts.supplierIds.length
    ? opts.supplierIds
    : (typeof getActiveFournIds === 'function' ? getActiveFournIds() : ['191']);

  const statusEl  = opts.statusEl  || null;
  const btnEl     = opts.btnEl     || null;
  const bypassToken = (typeof getBypassToken === 'function') ? getBypassToken() : '';

  function setStatus(msg, color) {
    if (statusEl) { statusEl.style.display='block'; statusEl.textContent=msg; statusEl.style.color=color||'var(--accent,#1976d2)'; }
  }

  if (!bypassToken) { setStatus('⚠️ Token manquant — configurez dans l\'onglet Fournisseurs', 'var(--o,#f57c00)'); return; }
  if (location.hostname==='localhost'||location.hostname==='127.0.0.1') { setStatus('⚠️ API disponible uniquement sur Vercel', 'var(--o,#f57c00)'); return; }
  if (btnEl) btnEl.disabled = true;

  try {
    var totalLoaded = 0;
    for (var si = 0; si < supplierIds.length; si++) {
      var supId = supplierIds[si];
      var supName = (typeof NAV_SUPPLIERS !== 'undefined' && NAV_SUPPLIERS[supId]) || ('#' + supId);
      setStatus('QIQD ' + (si+1) + '/' + supplierIds.length + ' — ' + supName + '…');

      var offset = 0, limit = 500, pageTotal = 0, maxIter = 50;
      while (maxIter-- > 0) {
        var url = U_PROXY + '?action=qiqd&supplier=' + supId + '&offset=' + offset + '&limit=' + limit
                + '&bypass_token=' + encodeURIComponent(bypassToken);
        var r = await fetch(url);
        var d = await r.json();
        if (d.error) { setStatus('❌ ' + d.error, 'var(--r,#d32f2f)'); break; }
        var prods = d.products || [];
        prods.forEach(function(p) { window.QIQD[p.id] = p; });
        totalLoaded += prods.length;
        pageTotal = d.total || 0;
        offset += limit;
        if (pageTotal > 0 && offset >= pageTotal) break;
        if (prods.length < limit) break;
        await new Promise(function(res){ setTimeout(res, 60); });
      }
    }

    // Applique sur P si chargé
    if (typeof P !== 'undefined' && P && P.length) {
      var updated = 0;
      P.forEach(function(p) {
        var q = window.QIQD[p.id];
        if (!q) return;
        p.st  = q.stock != null ? q.stock : p.st;
        p.q   = q.qi   != null ? q.qi    : p.q;
        p.rupt = q.rupt;      // jours de rupture 30j
        updated++;
      });
      if (typeof computeAlerts  === 'function') computeAlerts();
      if (typeof updateBadge    === 'function') updateBadge();
      if (typeof rKpiDashboard  === 'function') rKpiDashboard();
    }

    var msg = '✅ QIQD : ' + totalLoaded + ' produits (' + supplierIds.length + ' fournisseur(s))';
    setStatus(msg, 'var(--g,#388e3c)');
    if (typeof showToast === 'function') showToast(msg);

  } catch(err) {
    setStatus('❌ ' + err.message, 'var(--r,#d32f2f)');
    console.error('[uFetchQIQD]', err);
  }

  if (btnEl) btnEl.disabled = false;
}

const U_PROXY = '/api/su';
const U_PER_PAGE = 500;

// ── Fournisseurs disponibles (même dict que Dashboard Frais, filtré Système U)
const NAV_SUPPLIERS = {
  '191':  'Système U',
  '192':  'Système U Frais',
  '435':  'Système U Surgelés',
  '508':  'Système U LGV',
  '2286': 'Système U Jardin BIO',
};

// IDs sélectionnés = fournisseurs actifs depuis localStorage (sync avec onglet Fournisseurs)
let navSelSuppliers = new Set();

// ── Initialise le panel fournisseurs (appelé au 1er clic)
let navPanelInited = false;
function initNavApiPanel() {
  // Toujours reconstruire depuis la liste persistée (peut changer depuis l'onglet Fournisseurs)
  navPanelInited = false;
  navSelSuppliers.clear();
  const saved = (typeof getFournisseurs === 'function') ? getFournisseurs() : [];
  saved.filter(function(f){ return f.active; }).forEach(function(f){ navSelSuppliers.add(f.id); });

  if (navPanelInited) return;
  navPanelInited = true;
  const list = document.getElementById('navSupList');
  if (!list) return;
  list.innerHTML = '';

  const fourn = (typeof getFournisseurs === 'function') ? getFournisseurs() : [];
  if (!fourn.length) {
    list.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:4px 0">Aucun fournisseur — configurez dans l\'onglet <b>Fournisseurs</b></div>';
    return;
  }
  fourn.forEach(function(f) {
    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = f.id;
    cb.checked = f.active;
    if (f.active) navSelSuppliers.add(f.id);
    cb.onchange = function() {
      if (cb.checked) navSelSuppliers.add(f.id); else navSelSuppliers.delete(f.id);
    };
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode((f.name || f.id) + ' (' + f.id + ')'));
    list.appendChild(lbl);
  });
}

function toggleNavApiPanel() {
  const panel = document.getElementById('navApiPanel');
  if (!panel) return;
  const open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  if (!open) { navPanelInited = false; initNavApiPanel(); }
  // Ferme au clic extérieur
  if (!open) {
    setTimeout(function() {
      document.addEventListener('click', function _close(e) {
        if (!panel.contains(e.target) && e.target.id !== 'navApiBtn') {
          panel.style.display = 'none';
          document.removeEventListener('click', _close);
        }
      });
    }, 10);
  }
}

function navApiAddCustom() {
  const inp = document.getElementById('navSupCustom');
  if (!inp) return;
  const ids = inp.value.split(/[,;\s]+/).map(function(s){ return s.trim(); }).filter(Boolean);
  const list = document.getElementById('navSupList');
  ids.forEach(function(id) {
    if (navSelSuppliers.has(id)) return;
    navSelSuppliers.add(id);
    if (!list) return;
    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0;color:var(--text2)';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = id;
    cb.checked = true;
    cb.onchange = function() {
      if (cb.checked) navSelSuppliers.add(id); else navSelSuppliers.delete(id);
    };
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode('#' + id));
    list.appendChild(lbl);
  });
  inp.value = '';
}

// ── Fetch depuis le panel nav ─────────────────────────────────────────────────
async function uFetchNavProducts() {
  const ids = Array.from(navSelSuppliers);
  if (!ids.length) {
    const st = document.getElementById('navApiStatus');
    if (st) { st.style.display = 'block'; st.textContent = '⚠️ Aucun fournisseur sélectionné'; st.style.color = 'var(--o,#f57c00)'; }
    return;
  }
  await uFetchProducts({
    supplierIds:  ids,
    statusEl:     document.getElementById('navApiStatus'),
    progressEl:   document.getElementById('navApiProgress'),
    fillEl:       document.getElementById('navApiProgressFill'),
    textEl:       document.getElementById('navApiProgressText'),
    btnEl:        null,
  });
}

// ── Fetch depuis l'onglet Import (bouton existant) ────────────────────────────
async function uFetchProductsImport() {
  await uFetchProducts({
    supplierIds:  Array.from(navSelSuppliers),   // reprend la même sélection
    statusEl:     document.getElementById('uProdStatus'),
    progressEl:   document.getElementById('uProdProgress'),
    fillEl:       document.getElementById('uProdProgressFill'),
    textEl:       document.getElementById('uProdProgressText'),
    btnEl:        document.getElementById('uProdBtn'),
  });
}

// ── Cœur : fetch multi-fournisseurs ──────────────────────────────────────────
async function uFetchProducts(opts) {
  opts = opts || {};
  const statusEl   = opts.statusEl   || document.getElementById('uProdStatus');
  const progressEl = opts.progressEl || document.getElementById('uProdProgress');
  const fillEl     = opts.fillEl     || document.getElementById('uProdProgressFill');
  const textEl     = opts.textEl     || document.getElementById('uProdProgressText');
  const btnEl      = opts.btnEl      || document.getElementById('uProdBtn');
  const supplierIds = opts.supplierIds && opts.supplierIds.length
    ? opts.supplierIds
    : ['191'];

  function setStatus(msg, color) {
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = msg; statusEl.style.color = color || 'var(--accent,#1976d2)'; }
  }
  function setProgress(loaded, total) {
    const pct = total > 0 ? Math.round(loaded / total * 100) : 0;
    if (fillEl) fillEl.style.width = pct + '%';
    if (textEl) textEl.textContent = loaded + ' / ' + total + ' produits (' + pct + '%)';
    if (progressEl) progressEl.style.display = 'block';
  }
  function done() { if (btnEl) btnEl.disabled = false; }

  if (btnEl) btnEl.disabled = true;

  // Sur localhost, /api/su n'est pas disponible
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    setStatus('⚠️ API disponible uniquement sur Vercel (pas en local)', 'var(--o,#f57c00)');
    done(); return;
  }

  try {
    const bypassToken = (typeof getBypassToken === 'function') ? getBypassToken() : '';
    let allProducts = [];

    for (let si = 0; si < supplierIds.length; si++) {
      const supId = supplierIds[si];
      const supName = NAV_SUPPLIERS[supId] || ('#' + supId);
      setStatus('Fournisseur ' + (si + 1) + '/' + supplierIds.length + ' — ' + supName + '…');

      // ── Page 1 ──────────────────────────────────────────────
      const bParam = bypassToken ? '&bypass_token=' + encodeURIComponent(bypassToken) : '';
      const r1 = await fetch(U_PROXY + '?action=products&page=1&perPage=' + U_PER_PAGE + '&supplier=' + supId + bParam);
      const d1 = await r1.json();

      if (d1.error) { setStatus('❌ ' + d1.error, 'var(--r,#d32f2f)'); done(); return; }
      if (!d1.products || !d1.products.length) { continue; } // fournisseur vide, on passe

      const totalFound    = d1.found || 0;
      const actualPerPage = d1.perPage || d1.products.length || U_PER_PAGE;
      const totalPages    = totalFound > 0 ? Math.ceil(totalFound / actualPerPage) : 999;

      allProducts = allProducts.concat(d1.products);
      setProgress(allProducts.length, totalFound * supplierIds.length);
      setStatus('Fourn. ' + (si+1) + '/' + supplierIds.length + ' — page 1/' + totalPages + ' (' + allProducts.length + ' produits)');

      // ── Pages suivantes ──────────────────────────────────────
      for (let page = 2; page <= totalPages; page++) {
        if (totalFound > 0 && allProducts.length >= totalFound * (si + 1)) break;
        setStatus('Fourn. ' + (si+1) + '/' + supplierIds.length + ' — page ' + page + '/' + totalPages);
        const r = await fetch(U_PROXY + '?action=products&page=' + page + '&perPage=' + U_PER_PAGE + '&supplier=' + supId + bParam);
        const d = await r.json();
        if (d.error || !d.products || !d.products.length) break;
        allProducts = allProducts.concat(d.products);
        setProgress(allProducts.length, totalFound * supplierIds.length);
        await new Promise(function(res) { setTimeout(res, 80); });
      }
    }

    if (!allProducts.length) { setStatus('Aucun produit chargé.', 'var(--o,#f57c00)'); done(); return; }

    // ── Merge ou chargement complet ──────────────────────────
    const pLoaded = typeof P !== 'undefined' && P && P.length > 0;

    if (pLoaded) {
      const idx = {};
      P.forEach(function(p) { idx[p.id] = p; });
      let updated = 0, added = 0;

      allProducts.forEach(function(ap) {
        const id = +ap.id;
        if (idx[id]) {
          idx[id].q  = ap.qi    != null ? +ap.qi    : idx[id].q;
          idx[id].st = ap.stock != null ? +ap.stock : idx[id].st;
          updated++;
        } else {
          P.push(uMapProd(ap));
          added++;
        }
      });

      computeAlerts(); updateBadge();
      if (typeof rKpiDashboard === 'function') rKpiDashboard();

      const msg = '✅ ' + updated + ' mis à jour' + (added ? ', ' + added + ' ajoutés' : '') + ' (' + allProducts.length + ' total)';
      setStatus(msg, 'var(--g,#388e3c)');
      if (typeof showToast === 'function') showToast(msg);

    } else {
      P.length = 0;
      allProducts.forEach(function(ap) { P.push(uMapProd(ap)); });
      computeAlerts(); updateBadge();
      T('kpi-dashboard');
      const msg = '✅ ' + P.length + ' produits chargés depuis l\'API';
      setStatus(msg, 'var(--g,#388e3c)');
      if (typeof showToast === 'function') showToast(msg);
    }

    setProgress(allProducts.length, allProducts.length);
    console.log('[fetch_api] ' + allProducts.length + ' produits, ' + supplierIds.length + ' fournisseur(s)');

  } catch (err) {
    setStatus('❌ ' + err.message, 'var(--r,#d32f2f)');
    console.error('[fetch_api]', err);
  }

  done();
}

// ── Mapping API → format P de core.js ────────────────────────────────────────
function uMapProd(ap) {
  const a = ap.zone || 0;
  return {
    id:  +ap.id,
    n:   ap.name    || '',
    bc:  String(ap.barcode || '').replace(/\.0$/, ''),
    q:   ap.qi      != null ? +ap.qi    : 0,
    st:  ap.stock   != null ? +ap.stock : 0,
    a:   a,
    f:   '?',
    z:   a + '.0.0',
    nv:  0,
    et:  0,
    p:   0,
    c:   ap.pack    || 1,
    bio: !!ap.bio,
    typo:    ap.typology   || '',
    supRef:  ap.supplier_ref || '',
    groupId: ap.group_id   || null,
  };
}

// ── Panel Sources 🔄 ──────────────────────────────────────────────────────────
var NAV_SRC_STATE = {};   // { data: bool, drive: bool, sup_191: bool, … }
var navSrcPanelInited = false;

function toggleNavSrcPanel() {
  var panel = document.getElementById('navSrcPanel');
  if (!panel) return;
  var open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  if (!open) {
    navSrcPanelInited = false;
    initNavSrcPanel();
    setTimeout(function() {
      document.addEventListener('click', function _close(e) {
        if (!panel.contains(e.target) && e.target.id !== 'navSrcBtn') {
          panel.style.display = 'none';
          document.removeEventListener('click', _close);
        }
      });
    }, 10);
  }
}

function initNavSrcPanel() {
  if (navSrcPanelInited) return;
  navSrcPanelInited = true;
  var list = document.getElementById('navSrcList');
  if (!list) return;

  // Valeurs par défaut
  if (NAV_SRC_STATE.data  === undefined) NAV_SRC_STATE.data  = true;
  if (NAV_SRC_STATE.drive === undefined) NAV_SRC_STATE.drive = false;

  var html = '';

  // ── Sources fichiers ──────────────────────────────────────
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">';
  html += '<div><div style="font-size:12px;font-weight:500">📦 Data embarquée</div><div style="font-size:10px;color:var(--text3)">Données intégrées dans data.js</div></div>';
  html += mkNavTog('data', NAV_SRC_STATE.data);
  html += '</div>';

  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">';
  html += '<div><div style="font-size:12px;font-weight:500">☁️ Google Drive</div><div style="font-size:10px;color:var(--text3)">Fichier CSV sur Drive</div></div>';
  html += mkNavTog('drive', NAV_SRC_STATE.drive);
  html += '</div>';

  // ── Fournisseurs API ──────────────────────────────────────
  var fourn = (typeof getFournisseurs === 'function') ? getFournisseurs() : [];
  if (fourn.length) {
    html += '<div style="font-size:10px;color:var(--text3);font-family:\'Geist Mono\',monospace;text-transform:uppercase;letter-spacing:.8px;margin:10px 0 6px">Fournisseurs API</div>';
    fourn.forEach(function(f) {
      var sid = 'sup_' + f.id;
      if (NAV_SRC_STATE[sid] === undefined) NAV_SRC_STATE[sid] = false;
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0">';
      html += '<div><div style="font-size:12px">' + (f.name || f.id) + '</div>'
            + '<div style="font-size:10px;color:var(--text3);font-family:\'Geist Mono\',monospace">ID ' + f.id + '</div></div>';
      html += mkNavTog(sid, NAV_SRC_STATE[sid]);
      html += '</div>';
    });
  } else {
    html += '<div style="font-size:11px;color:var(--text3);margin-top:8px">Aucun fournisseur — configurez l\'onglet <b>Fournisseurs</b></div>';
  }

  list.innerHTML = html;
}

// ── Toggle switch HTML ────────────────────────────────────────────────────────
function mkNavTog(id, on) {
  var bg = on ? 'var(--accent,#1976d2)' : '#bbb';
  var tx = on ? '16px' : '2px';
  return '<span id="ntog_' + id + '" onclick="navToglSrc(\'' + id + '\')" '
    + 'style="display:inline-flex;width:38px;height:22px;border-radius:11px;background:' + bg + ';'
    + 'align-items:center;cursor:pointer;transition:background .2s;padding:3px;box-sizing:border-box;flex-shrink:0">'
    + '<span id="ntog_k_' + id + '" style="width:16px;height:16px;border-radius:50%;background:#fff;'
    + 'transform:translateX(' + tx + ');transition:transform .2s;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.25)"></span>'
    + '</span>';
}

function navToglSrc(id) {
  NAV_SRC_STATE[id] = !NAV_SRC_STATE[id];
  var on = NAV_SRC_STATE[id];
  var track = document.getElementById('ntog_' + id);
  var knob  = document.getElementById('ntog_k_' + id);
  if (track) track.style.background = on ? 'var(--accent,#1976d2)' : '#bbb';
  if (knob)  knob.style.transform   = on ? 'translateX(16px)' : 'translateX(2px)';
}

// ── Chargement des sources sélectionnées ─────────────────────────────────────
async function navSrcLoad() {
  var st = document.getElementById('navSrcStatus');
  function setMsg(msg, color) {
    if (st) { st.style.display = 'block'; st.textContent = msg; st.style.color = color || 'var(--accent,#1976d2)'; }
  }

  // 1. Data embarquée (B64)
  if (NAV_SRC_STATE.data) {
    setMsg('⏳ Data embarquée…');
    try {
      var bin = atob(B64);
      var b = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
      var ds = new DecompressionStream('gzip');
      var dw = ds.writable.getWriter(); dw.write(b); dw.close();
      var dr = ds.readable.getReader(); var ch = [];
      while (true) { var rv = await dr.read(); if (rv.done) break; ch.push(rv.value); }
      var all = new Uint8Array(ch.reduce(function(a, c) { return a + c.length; }, 0));
      var off = 0; ch.forEach(function(c) { all.set(c, off); off += c.length; });
      var parsed = JSON.parse(new TextDecoder().decode(all));
      P.length = 0;
      parsed.forEach(function(p) { P.push(p); });
      if (typeof applyFamOv === 'function') applyFamOv();
      setMsg('✅ Data : ' + P.length + ' produits', 'var(--g,#388e3c)');
    } catch (e) {
      setMsg('❌ Data : ' + e.message, 'var(--r,#d32f2f)');
    }
  }

  // 2. Google Drive
  if (NAV_SRC_STATE.drive) {
    setMsg('⏳ Google Drive…');
    var driveOk = false;
    for (var di = 0; di < DRIVE_PROXIES.length; di++) {
      try {
        var resp = await fetch(DRIVE_PROXIES[di], { redirect: 'follow' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var text = await resp.text();
        if (!text || text.length < 100) throw new Error('Vide');
        if (typeof parseC === 'function') parseC(text);
        setMsg('✅ Drive : ' + P.length + ' produits', 'var(--g,#388e3c)');
        driveOk = true;
        break;
      } catch (e) { /* proxy suivant */ }
    }
    if (!driveOk) setMsg('⚠️ Drive inaccessible', 'var(--o,#f57c00)');
  }

  // 3. Fournisseurs API
  var supIds = Object.keys(NAV_SRC_STATE)
    .filter(function(k) { return k.indexOf('sup_') === 0 && NAV_SRC_STATE[k]; })
    .map(function(k) { return k.replace('sup_', ''); });

  if (supIds.length) {
    setMsg('⏳ Chargement API (' + supIds.length + ' fournisseur(s))…');
    await uFetchProducts({
      supplierIds: supIds,
      statusEl:    st,
      progressEl:  null,
      fillEl:      null,
      textEl:      null,
      btnEl:       null,
    });
  }

  // Finalise — rafraîchit l'onglet actif (quel qu'il soit)
  if (P && P.length) {
    if (typeof computeAlerts === 'function') computeAlerts();
    if (typeof updateBadge  === 'function') updateBadge();
    var di2 = document.getElementById('dinfo');
    if (di2) di2.textContent = P.length + ' produits';
    // Trouve l'onglet actuellement visible et le re-rend
    if (typeof T === 'function') {
      var activePage = document.querySelector('.page.active');
      var activeTab  = activePage ? activePage.id.replace('-page', '') : 'kpi-dashboard';
      T(activeTab);
    }
    setTimeout(function() {
      var panel = document.getElementById('navSrcPanel');
      if (panel) panel.style.display = 'none';
    }, 1500);
  }
}
