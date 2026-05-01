// ── fetch_api.js — Chargement produits via API Deleev ────────────────────────

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

// IDs sélectionnés par défaut
let navSelSuppliers = new Set(['191']);

// ── Initialise le panel fournisseurs (appelé au 1er clic)
let navPanelInited = false;
function initNavApiPanel() {
  if (navPanelInited) return;
  navPanelInited = true;
  const list = document.getElementById('navSupList');
  if (!list) return;
  Object.entries(NAV_SUPPLIERS).forEach(function([id, name]) {
    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = id;
    cb.checked = navSelSuppliers.has(id);
    cb.onchange = function() {
      if (cb.checked) navSelSuppliers.add(id); else navSelSuppliers.delete(id);
    };
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(name + ' (' + id + ')'));
    list.appendChild(lbl);
  });
}

function toggleNavApiPanel() {
  const panel = document.getElementById('navApiPanel');
  if (!panel) return;
  const open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  if (!open) initNavApiPanel();
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
    let allProducts = [];

    for (let si = 0; si < supplierIds.length; si++) {
      const supId = supplierIds[si];
      const supName = NAV_SUPPLIERS[supId] || ('#' + supId);
      setStatus('Fournisseur ' + (si + 1) + '/' + supplierIds.length + ' — ' + supName + '…');

      // ── Page 1 ──────────────────────────────────────────────
      const r1 = await fetch(U_PROXY + '?action=products&page=1&perPage=' + U_PER_PAGE + '&supplier=' + supId);
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
        const r = await fetch(U_PROXY + '?action=products&page=' + page + '&perPage=' + U_PER_PAGE + '&supplier=' + supId);
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
