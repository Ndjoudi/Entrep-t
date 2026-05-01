// ── fetch_api.js — Chargement produits via API Deleev ────────────────────────
// Proxy : /api/su (su.js déployé sur Vercel)
// Mode merge  : si P est déjà chargé depuis le Drive, met à jour QI + stock par ID
// Mode complet: si P est vide, peuple P avec les données API (zonage/famille à '?')

const U_PROXY = '/api/su';
const U_PER_PAGE = 500;

async function uFetchProducts() {
  const statusEl  = document.getElementById('uProdStatus');
  const barEl     = document.getElementById('uProdProgress');
  const fillEl    = document.getElementById('uProdProgressFill');
  const textEl    = document.getElementById('uProdProgressText');
  const btnEl     = document.getElementById('uProdBtn');

  function setStatus(msg, color) {
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = msg; statusEl.style.color = color || 'var(--accent)'; }
  }
  function setProgress(loaded, total) {
    const pct = total > 0 ? Math.round(loaded / total * 100) : 0;
    if (fillEl) fillEl.style.width = pct + '%';
    if (textEl) textEl.textContent = loaded + ' / ' + total + ' produits (' + pct + '%)';
    if (barEl)  barEl.style.display = 'block';
  }
  function done() { if (btnEl) btnEl.disabled = false; }

  if (btnEl) btnEl.disabled = true;

  // Sur localhost, /api/su n'est pas disponible
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    setStatus('⚠️ API disponible uniquement sur Vercel (pas en local)', 'var(--o)');
    done(); return;
  }

  setStatus('Chargement page 1…');

  try {
    let all = [];
    let totalFound = 0;
    let actualPerPage = U_PER_PAGE;

    // ── Page 1 ──────────────────────────────────────────────
    const r1 = await fetch(U_PROXY + '?action=products&page=1&perPage=' + U_PER_PAGE);
    const d1 = await r1.json();

    if (d1.error) { setStatus('❌ ' + d1.error, 'var(--r)'); done(); return; }
    if (!d1.products || !d1.products.length) { setStatus('Aucun produit.', 'var(--o)'); done(); return; }

    totalFound    = d1.found || 0;
    actualPerPage = d1.perPage || d1.products.length || U_PER_PAGE;
    const totalPages = totalFound > 0 ? Math.ceil(totalFound / actualPerPage) : 999;

    all = all.concat(d1.products);
    setProgress(all.length, totalFound);
    setStatus('Page 1/' + totalPages + ' — ' + all.length + ' produits…');

    // ── Pages suivantes ──────────────────────────────────────
    for (let page = 2; page <= totalPages; page++) {
      if (totalFound > 0 && all.length >= totalFound) break;
      setStatus('Page ' + page + '/' + totalPages + ' — ' + all.length + ' / ' + totalFound + '…');
      const r = await fetch(U_PROXY + '?action=products&page=' + page + '&perPage=' + U_PER_PAGE);
      const d = await r.json();
      if (d.error || !d.products || !d.products.length) break;
      all = all.concat(d.products);
      setProgress(all.length, totalFound);
      await new Promise(res => setTimeout(res, 80));
    }

    if (!all.length) { setStatus('Aucun produit chargé.', 'var(--o)'); done(); return; }

    // ── Merge ou chargement complet ──────────────────────────
    const pLoaded = typeof P !== 'undefined' && P && P.length > 0;

    if (pLoaded) {
      // Mode merge : on met à jour QI et stock pour les IDs connus
      const idx = {};
      P.forEach(function(p) { idx[p.id] = p; });
      let updated = 0, added = 0;

      all.forEach(function(ap) {
        const id = +ap.id;
        if (idx[id]) {
          idx[id].q  = ap.qi    != null ? +ap.qi    : idx[id].q;
          idx[id].st = ap.stock != null ? +ap.stock : idx[id].st;
          updated++;
        } else {
          // Produit inconnu dans le CSV → on l'ajoute avec defaults
          P.push(uMapProd(ap));
          added++;
        }
      });

      computeAlerts(); updateBadge();
      if (typeof anInit === 'function' && document.getElementById('analyse-page').classList.contains('active')) anInit();
      if (typeof rKpiDashboard === 'function') rKpiDashboard();

      const msg = '✅ ' + updated + ' mis à jour' + (added ? ', ' + added + ' ajoutés' : '') + ' (sur ' + all.length + ')';
      setStatus(msg, 'var(--g)');
      showToast(msg);

    } else {
      // Mode complet : peuple P depuis zéro
      P.length = 0;
      all.forEach(function(ap) { P.push(uMapProd(ap)); });

      computeAlerts(); updateBadge();
      T('kpi-dashboard');

      const msg = '✅ ' + P.length + ' produits chargés depuis l\'API';
      setStatus(msg, 'var(--g)');
      showToast(msg);
    }

    setProgress(all.length, totalFound);
    console.log('[fetch_api] ' + all.length + ' produits, ' + totalPages + ' pages, perPage=' + actualPerPage);

  } catch (err) {
    setStatus('❌ ' + err.message, 'var(--r)');
    console.error('[fetch_api]', err);
  }

  done();
}

// ── Mapping API → format P de core.js ────────────────────
function uMapProd(ap) {
  const a = ap.zone || 0;
  return {
    id:  +ap.id,
    n:   ap.name    || '',
    bc:  String(ap.barcode || '').replace(/\.0$/, ''),
    q:   ap.qi      != null ? +ap.qi    : 0,
    st:  ap.stock   != null ? +ap.stock : 0,
    a:   a,
    // Champs non fournis par l'API — defaults neutres
    f:   '?',
    z:   a + '.0.0',
    nv:  0,
    et:  0,
    p:   0,
    c:   ap.pack    || 1,
    bio: !!ap.bio,
    // Champs bonus conservés pour info
    typo:    ap.typology  || '',
    supRef:  ap.supplier_ref || '',
    groupId: ap.group_id  || null,
  };
}
