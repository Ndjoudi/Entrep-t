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
        prods.forEach(function(p) { window.QIQD[p.id] = Object.assign({}, p, { supId: String(supId) }); });
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

// ── Fetch depuis l'onglet Import (bouton API) ─────────────────────────────────
async function uFetchProductsImport() {
  var ids = (typeof getActiveFournIds === 'function') ? getActiveFournIds() : ['191'];
  await uFetchProducts({
    supplierIds:  ids,
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

      allProducts = allProducts.concat(d1.products.map(function(p){ p._supId=supId; return p; }));
      setProgress(allProducts.length, totalFound * supplierIds.length);
      setStatus('Fourn. ' + (si+1) + '/' + supplierIds.length + ' — page 1/' + totalPages + ' (' + allProducts.length + ' produits)');

      // ── Pages suivantes ──────────────────────────────────────
      for (let page = 2; page <= totalPages; page++) {
        if (totalFound > 0 && allProducts.length >= totalFound * (si + 1)) break;
        setStatus('Fourn. ' + (si+1) + '/' + supplierIds.length + ' — page ' + page + '/' + totalPages);
        const r = await fetch(U_PROXY + '?action=products&page=' + page + '&perPage=' + U_PER_PAGE + '&supplier=' + supId + bParam);
        const d = await r.json();
        if (d.error || !d.products || !d.products.length) break;
        allProducts = allProducts.concat(d.products.map(function(p){ p._supId=supId; return p; }));
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
          P.push(uMapProd(ap, ap._supId));
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
      allProducts.forEach(function(ap) { P.push(uMapProd(ap, ap._supId)); });
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
function uMapProd(ap, supId) {
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
    supId:   supId || null,
  };
}

// ── Panel Sources 🔄 ──────────────────────────────────────────────────────────
var NAV_LOADED  = { data: false, prod: {}, qiqd: {} };
var NAV_FILTER  = {};   // supId → true/false (undefined = ON)
var P_ALL       = [];   // tableau maître — contient TOUS les produits chargés

function toggleNavSrcPanel() {
  var panel = document.getElementById('navSrcPanel');
  if (!panel) return;
  var open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  if (!open) {
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
  var list = document.getElementById('navSrcList');
  if (!list) return;

  var html = '';

  // ── Data embarquée ────────────────────────────────────────
  var dataLoaded = typeof P !== 'undefined' && P && P.length > 0;
  var dataOk = NAV_LOADED.data;
  var dataSt = dataOk
    ? 'border:1px solid var(--g,#388e3c);background:color-mix(in srgb,var(--g,#388e3c) 10%,transparent);color:var(--g,#388e3c)'
    : 'border:1px solid var(--accent,#1976d2);background:color-mix(in srgb,var(--accent,#1976d2) 10%,transparent);color:var(--accent,#1976d2)';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);gap:8px">';
  html += '<div><div style="font-size:12px;font-weight:500">📦 Data embarquée</div>'
        + '<div style="font-size:10px;color:var(--text3)">' + (dataLoaded ? P.length + ' produits en mémoire' : 'Données intégrées dans data.js') + '</div></div>';
  html += '<button onclick="navSrcLoadData()" style="font-size:11px;padding:3px 10px;border-radius:5px;cursor:pointer;white-space:nowrap;' + dataSt + '">'
        + (dataOk ? '✓ Chargé' : 'Charger') + '</button>';
  html += '</div>';

  // ── Import CSV ────────────────────────────────────────────
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);gap:8px">';
  html += '<div><div style="font-size:12px;font-weight:500">📂 Import CSV</div>'
        + '<div style="font-size:10px;color:var(--text3)">Importer un fichier manuellement</div></div>';
  html += '<button onclick="document.getElementById(\'navSrcPanel\').style.display=\'none\';T(\'import\')" '
        + 'style="font-size:11px;padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);cursor:pointer;color:var(--text);white-space:nowrap">Ouvrir →</button>';
  html += '</div>';

  // ── Fournisseurs API ──────────────────────────────────────
  var fourn = (typeof getFournisseurs === 'function') ? getFournisseurs() : [];
  if (fourn.length) {
    html += '<div style="font-size:10px;color:var(--text3);font-family:\'Geist Mono\',monospace;'
          + 'text-transform:uppercase;letter-spacing:.8px;margin:10px 0 4px">Fournisseurs API</div>';
    fourn.forEach(function(f) {
      var prodOk = !!NAV_LOADED.prod[f.id];
      var qiqdOk = !!NAV_LOADED.qiqd[f.id];
      var prodSt = prodOk
        ? 'border:1px solid var(--g,#388e3c);background:color-mix(in srgb,var(--g,#388e3c) 10%,transparent);color:var(--g,#388e3c)'
        : 'border:1px solid var(--accent,#1976d2);background:color-mix(in srgb,var(--accent,#1976d2) 10%,transparent);color:var(--accent,#1976d2)';
      var qiqdSt = qiqdOk
        ? 'border:1px solid var(--g,#388e3c);background:color-mix(in srgb,var(--g,#388e3c) 10%,transparent);color:var(--g,#388e3c)'
        : 'border:1px solid var(--border);background:var(--surface2);color:var(--text2)';
      html += '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border)">';
      html += '<div style="flex:1;min-width:0">'
            + '<div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (f.name || f.id) + '</div>'
            + '<div style="font-size:10px;color:var(--text3);font-family:\'Geist Mono\',monospace">ID ' + f.id + '</div></div>';
      html += '<button onclick="navSrcOneProd(\'' + f.id + '\')" style="font-size:11px;padding:3px 8px;border-radius:5px;cursor:pointer;white-space:nowrap;' + prodSt + '">' + (prodOk ? '✓ Prod' : 'Prod') + '</button>';
      html += '<button onclick="navSrcOneQIQD(\'' + f.id + '\')" style="font-size:11px;padding:3px 8px;border-radius:5px;cursor:pointer;white-space:nowrap;' + qiqdSt + '">' + (qiqdOk ? '✓ QI/QD' : 'QI/QD') + '</button>';
      // Toggle filtre — apparaît seulement si chargé
      if (prodOk || qiqdOk) {
        if (NAV_FILTER[f.id] === undefined) NAV_FILTER[f.id] = true;
        var fOn = NAV_FILTER[f.id];
        var fBg = fOn ? 'var(--accent,#1976d2)' : '#bbb';
        var fTx = fOn ? '16px' : '2px';
        html += '<span id="nfil_' + f.id + '" onclick="navFilterToggle(\'' + f.id + '\')" '
              + 'style="display:inline-flex;width:38px;height:22px;border-radius:11px;background:' + fBg + ';'
              + 'align-items:center;cursor:pointer;transition:background .2s;padding:3px;box-sizing:border-box;flex-shrink:0" title="Afficher dans le dashboard">'
              + '<span id="nfil_k_' + f.id + '" style="width:16px;height:16px;border-radius:50%;background:#fff;'
              + 'transform:translateX(' + fTx + ');transition:transform .2s;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.25)"></span>'
              + '</span>';
      }
      html += '</div>';
    });
  } else {
    html += '<div style="font-size:11px;color:var(--text3);margin-top:8px">Aucun fournisseur — configurez l\'onglet <b>Fournisseurs</b></div>';
  }

  list.innerHTML = html;
}

// ── Chargement Data embarquée (B64) ──────────────────────────────────────────
async function navSrcLoadData() {
  var st = document.getElementById('navSrcStatus');
  function setMsg(msg, color) {
    if (st) { st.style.display='block'; st.textContent=msg; st.style.color=color||'var(--accent,#1976d2)'; }
  }
  setMsg('⏳ Data embarquée…');
  try {
    var bin = atob(B64);
    var b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    var ds = new DecompressionStream('gzip');
    var dw = ds.writable.getWriter(); dw.write(b); dw.close();
    var dr = ds.readable.getReader(); var ch = [];
    while (true) { var rv = await dr.read(); if (rv.done) break; ch.push(rv.value); }
    var all = new Uint8Array(ch.reduce(function(a,c){return a+c.length;},0));
    var off = 0; ch.forEach(function(c){all.set(c,off);off+=c.length;});
    var parsed = JSON.parse(new TextDecoder().decode(all));
    P.length = 0;
    parsed.forEach(function(p){P.push(p);});
    if (typeof applyFamOv === 'function') applyFamOv();
    NAV_LOADED.data = true;
    navSyncPAll();
    setMsg('✅ Data : ' + P.length + ' produits', 'var(--g,#388e3c)');
    initNavSrcPanel();
    navSrcRefresh();
  } catch(e) {
    setMsg('❌ Data : ' + e.message, 'var(--r,#d32f2f)');
  }
}

// ── Chargement individuel : Prod pour un fournisseur ─────────────────────────
async function navSrcOneProd(supId) {
  var st = document.getElementById('navSrcStatus');
  if (st) { st.style.display='block'; st.textContent='⏳ Prod ' + supId + '…'; st.style.color='var(--accent)'; }
  await uFetchProducts({ supplierIds:[supId], statusEl:st, progressEl:null, fillEl:null, textEl:null, btnEl:null });
  NAV_LOADED.prod[supId] = true;
  if (NAV_FILTER[supId] === undefined) NAV_FILTER[supId] = true;
  navSyncPAll();       // met à jour P_ALL après le chargement
  initNavSrcPanel();
  navSrcRefresh();
}

// ── Chargement individuel : QI/QD pour un fournisseur ────────────────────────
async function navSrcOneQIQD(supId) {
  var st = document.getElementById('navSrcStatus');
  if (st) { st.style.display='block'; st.textContent='⏳ QI/QD ' + supId + '…'; st.style.color='var(--accent)'; }
  await uFetchQIQD({ supplierIds:[supId], statusEl:st, btnEl:null });
  NAV_LOADED.qiqd[supId] = true;
  initNavSrcPanel();   // rafraîchit le panel (bouton → vert)
  navSrcRefresh();
}


// ── Synchronise P_ALL avec P courant (appelé après chaque chargement) ─────────
function navSyncPAll() {
  // Ajoute dans P_ALL les produits nouveaux (pas déjà présents)
  var ids = {};
  P_ALL.forEach(function(p){ ids[p.id] = true; });
  P.forEach(function(p){ if (!ids[p.id]) P_ALL.push(p); });
}

// ── Applique NAV_FILTER sur P depuis P_ALL ────────────────────────────────────
function navApplyFilter() {
  P.length = 0;
  P_ALL.forEach(function(p) {
    // Inclure si : pas de supId, ou supId non filtré, ou filtre explicitement ON
    if (!p.supId || NAV_FILTER[p.supId] !== false) P.push(p);
  });
}

// ── Toggle filtre fournisseur ─────────────────────────────────────────────────
function navFilterToggle(supId) {
  NAV_FILTER[supId] = (NAV_FILTER[supId] === false) ? true : false;
  var on = NAV_FILTER[supId] !== false;

  // Reconstruit P depuis P_ALL selon les filtres actifs
  navApplyFilter();

  // Visuel toggle
  var trk = document.getElementById('nfil_' + supId);
  var knb = document.getElementById('nfil_k_' + supId);
  if (trk) trk.style.background = on ? 'var(--accent,#1976d2)' : '#bbb';
  if (knb) knb.style.transform  = on ? 'translateX(16px)' : 'translateX(2px)';

  // Re-rend tout
  if (typeof computeAlerts === 'function') computeAlerts();
  if (typeof updateBadge   === 'function') updateBadge();
  var di = document.getElementById('dinfo');
  if (di) di.textContent = P.length + ' produits';
  if (typeof T === 'function') {
    var ap = document.querySelector('.page.active');
    T(ap ? ap.id.replace('-page', '') : 'kpi-dashboard');
  }
}

// ── Rafraîchit l'onglet actif ─────────────────────────────────────────────────
function navSrcRefresh() {
  if (!P || !P.length) return;
  if (typeof computeAlerts === 'function') computeAlerts();
  if (typeof updateBadge  === 'function') updateBadge();
  var di = document.getElementById('dinfo');
  if (di) di.textContent = P.length + ' produits';
  if (typeof T === 'function') {
    var ap = document.querySelector('.page.active');
    T(ap ? ap.id.replace('-page','') : 'kpi-dashboard');
  }
}
