// ── KPI Dashboard module ─────────────────────────────────
// Dépendances : P, P_ABC, zone, ZC, DV (ventes.js – optionnel)

var KD_OPEN_ZONES = {};

// ── Chargement initial depuis le Dashboard (produits + QI/QD) ─────────────
async function kdLoadAll() {
  var st = document.getElementById('kdLoadStatus');
  function setMsg(msg, color) {
    if (st) { st.textContent = msg; st.style.color = color || 'var(--accent,#1976d2)'; }
  }

  // 1. Charger les produits via API Deleev
  setMsg('⏳ Chargement des produits…');
  const ids = (typeof getActiveFournIds === 'function') ? getActiveFournIds() : ['191'];
  if (!ids.length) { setMsg('⚠️ Aucun fournisseur actif — configurez l\'onglet Fournisseurs', 'var(--o,#f57c00)'); return; }

  await uFetchProducts({
    supplierIds: ids,
    statusEl:    st,
    progressEl:  null,
    fillEl:      null,
    textEl:      null,
    btnEl:       null,
  });

  if (!P || !P.length) { setMsg('❌ Aucun produit chargé', 'var(--r,#d32f2f)'); return; }

  // 2. Charger QI/QD
  setMsg('⏳ Chargement QI/QD…');
  await uFetchQIQD({
    supplierIds: ids,
    statusEl:    st,
    btnEl:       null,
  });

  // 3. Rafraîchir le dashboard
  rKpiDashboard();
}

// ── Point d'entrée ───────────────────────────────────────
function rKpiDashboard() {
  var el = document.getElementById('kpi-dashboard-page');
  if (!el) return;
  if (!P || !P.length) {
    el.innerHTML = '<div style="padding:40px;text-align:center">'
      + '<div style="color:var(--text3);margin-bottom:18px;font-size:14px">Aucun produit chargé.</div>'
      + '<button onclick="kdLoadAll()" style="background:var(--accent,#1976d2);color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px">📊 Charger produits + QI/QD</button>'
      + '<div id="kdLoadStatus" style="margin-top:14px;font-size:13px;color:var(--accent)"></div>'
      + '</div>';
    return;
  }
  el.innerHTML = kdBuildPage();
}

// ── Index DV : nb jours de rupture sur les 30 derniers jours par produit ──
// dvIdx[pid] = rupDays (int)  — absent si produit non trouvé dans DV
function kdBuildDvIdx() {
  var idx = {};
  if (typeof DV === 'undefined' || !DV || !DV.groups || !DV.dates) return idx;
  var allDates = DV.dates.map(function(d) { return d.date; }).sort();
  var last30   = allDates.slice(-30);
  if (!last30.length) return idx;
  DV.groups.forEach(function(g) {
    if (!g.j) return;
    var rupDays = last30.reduce(function(s, d) {
      return s + (g.j.rup && g.j.rup[d] ? 1 : 0);
    }, 0);
    var pids = g.soloId ? [String(g.soloId)] : (g.pids || []).map(String);
    pids.forEach(function(pid) { idx[pid] = rupDays; });
  });
  return idx;
}

// ── Calcul données zone / ABC / famille ──────────────────
function kdComputeData() {
  var hasQIQD = typeof window !== 'undefined' && window.QIQD && Object.keys(window.QIQD).length > 0;
  // Fallback DV si pas de QIQD
  var dvIdx = hasQIQD ? {} : kdBuildDvIdx();

  var ZONE_ORDER = ['LGV','PF','Rota','Prio','Salée','Sucrée','Liquide','DPH','Frais sec','Autre'];
  var ABC_ORDER  = ['A','B','C','D'];

  function mkNode() { return { withQI:0, inStock:0, qiReel:0, fam:{} }; }

  var data = {};
  ZONE_ORDER.forEach(function(z) {
    data[z] = mkNode();
    data[z].abc = {};
    ABC_ORDER.forEach(function(abc) { data[z].abc[abc] = mkNode(); });
  });

  P.forEach(function(p) {
    var z   = zone(p.a);
    var abc = P_ABC[p.id] || 'D';
    var fam = p.f || 'Z';
    if (!data[z]) return;
    if (!data[z].abc[abc]) data[z].abc[abc] = mkNode();

    // ── Source QI/stock : QIQD en priorité, sinon P ──────────────────────────
    var q = hasQIQD ? window.QIQD[p.id] : null;
    var qi    = q ? q.qi    : (p.q  || 0);
    var stock = q ? q.stock : (p.st || 0);
    var rupDays = q ? q.rupt
                    : (p.rupt != null ? p.rupt : dvIdx[String(p.id)]);

    if (qi <= 0) return; // pas de QI → ignoré

    var hasSt    = stock > 0;
    var isQiReel = (rupDays === undefined || rupDays === null || rupDays < 30);

    function acc(node) {
      node.withQI++;
      if (hasSt)    node.inStock++;
      if (isQiReel) node.qiReel++;
    }

    acc(data[z]);
    acc(data[z].abc[abc]);
    if (!data[z].abc[abc].fam[fam]) data[z].abc[abc].fam[fam] = mkNode();
    acc(data[z].abc[abc].fam[fam]);
  });

  return { data:data, hasQIQD:hasQIQD, ZONE_ORDER:ZONE_ORDER };
}

// ── Couleur % ─────────────────────────────────────────────
function kdPctColor(pct) {
  if (pct >= 85) return 'var(--ok)';
  if (pct >= 70) return 'var(--o)';
  return 'var(--r)';
}

var _abcCol = { A: 'var(--g)', B: 'var(--o)', C: 'var(--r)', D: '#6b3fa0' };
var _abcBg  = { A: 'var(--gbg)', B: 'var(--obg)', C: 'var(--rbg)', D: '#f3e8ff' };

// Badge [A 6] — lettre + valeur dans le même carré coloré
function kdBadge(abc, val, color) {
  var bg  = _abcBg[abc]  || 'var(--bg2)';
  var col = color || _abcCol[abc] || 'var(--text)';
  return '<span style="display:inline-flex;align-items:center;margin-left:5px;'
    + 'background:' + bg + ';color:' + col + ';border-radius:4px;'
    + 'padding:1px 6px;font-size:10px;font-weight:700;line-height:16px">'
    + abc + ' ' + val + '</span>';
}

// Cellule comptage : total gras + badges A/B/C
function kdCell(total, zd, getVal, fmt, style) {
  var s = style || 'padding:7px 14px;text-align:right;white-space:nowrap';
  var h = '<td style="' + s + '"><span style="font-weight:700">' + (fmt ? fmt(total) : total) + '</span>';
  ['A','B','C'].forEach(function(abc) {
    var ad = zd.abc[abc];
    if (!ad || ad.withQI === 0) return;
    var v = getVal(ad);
    if (v === null || v === undefined) return;
    h += kdBadge(abc, fmt ? fmt(v) : v);
  });
  return h + '</td>';
}

// Cellule % rupture stock (snapshot) — couleur selon %
function kdPctStockCell(pct, zd, style) {
  var s   = style || 'padding:7px 14px;text-align:right;white-space:nowrap';
  var fmt = function(v) { return v.toFixed(1) + '%'; };
  var h   = '<td style="' + s + '"><span style="font-weight:700;color:' + kdPctColor(pct) + '">' + fmt(pct) + '</span>';
  ['A','B','C'].forEach(function(abc) {
    var ad = zd.abc[abc];
    if (!ad || ad.withQI === 0) return;
    var p2 = ad.withQI > 0 ? ad.inStock / ad.withQI * 100 : 0;
    h += kdBadge(abc, fmt(p2), kdPctColor(p2));
  });
  return h + '</td>';
}

// Cellule QI réel = produits avec QI >= 1 et rupt DV < 30j
function kdDvCountCell(total, zd, hasDV, style) {
  if (!hasDV) return '<td style="' + (style || 'padding:7px 14px;text-align:right;color:var(--text3)') + '">—</td>';
  return kdCell(total, zd, function(ad) { return ad.qiReel; }, null, style);
}

// Cellule % Rupt. réelle = Prod avec QI / QI réel * 100
function kdDvPctCell(pct, zd, hasDV, style) {
  if (!hasDV) return '<td style="' + (style || 'padding:7px 14px;text-align:right;color:var(--text3)') + '">—</td>';
  var s   = style || 'padding:7px 14px;text-align:right;white-space:nowrap';
  var fmt = function(v) { return v.toFixed(1) + '%'; };
  var h   = '<td style="' + s + '"><span style="font-weight:700;color:' + kdPctColor(100 - (pct - 100)) + '">' + fmt(pct) + '</span>';
  ['A','B','C'].forEach(function(abc) {
    var ad = zd.abc[abc];
    if (!ad || ad.withQI === 0) return;
    var p2 = ad.qiReel > 0 ? ad.withQI / ad.qiReel * 100 : 0;
    h += kdBadge(abc, fmt(p2), kdPctColor(200 - p2));
  });
  return h + '</td>';
}

// ── Construction de la page ───────────────────────────────
function kdBuildPage() {
  var comp      = kdComputeData();
  var data      = comp.data;
  var hasQIQD   = comp.hasQIQD;
  var ZONE_ORDER = comp.ZONE_ORDER;

  var h = '';
  var qiqdCount = typeof window !== 'undefined' && window.QIQD ? Object.keys(window.QIQD).length : 0;
  var qiqdTs    = typeof S !== 'undefined' ? S.get('qiqd_ts') : null;
  var syncLabel = qiqdTs ? ('Sync ' + new Date(qiqdTs).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})) : '';

  // Header
  h += '<div style="position:sticky;top:0;z-index:20;background:var(--bg);border-bottom:1px solid var(--border);'
     + 'padding:10px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap">';
  h += '<span style="font-size:14px;font-weight:700">Dashboard Ruptures</span>';

  // Statut QIQD
  if (qiqdCount > 0) {
    h += '<span style="font-size:11px;background:var(--gbg);color:var(--g);border:1px solid var(--gbrd);'
       + 'padding:2px 10px;border-radius:20px">✓ QI/QD — ' + qiqdCount + ' produits'
       + (syncLabel ? ' · ' + syncLabel : '') + '</span>';
  } else {
    h += '<span style="font-size:11px;background:var(--obg);color:var(--o);border:1px solid var(--obrd);'
       + 'padding:2px 10px;border-radius:20px">⚠ QI/QD non chargé — ruptures estimées depuis CSV</span>';
  }

  // Bouton sync QIQD
  h += '<button id="kdSyncBtn" onclick="kdSyncQIQD()" style="font-size:11px;padding:4px 12px;border:1px solid var(--accent,#1976d2);'
     + 'border-radius:6px;background:color-mix(in srgb,var(--accent,#1976d2) 10%,transparent);'
     + 'color:var(--accent,#1976d2);cursor:pointer;white-space:nowrap">📊 Sync QI/QD</button>';
  h += '<div id="kdSyncStatus" style="font-size:11px;font-family:\'Geist Mono\',monospace;color:var(--text3)"></div>';

  h += '<button class="btn" style="margin-left:auto;font-size:11px" onclick="KD_OPEN_ZONES={};rKpiDashboard()">↺ Replier</button>';
  h += '</div>';

  // Tableau
  h += '<div style="overflow:auto;flex:1;padding:0 0 40px 0">';
  h += '<table style="border-collapse:collapse;width:100%;font-size:12px;min-width:560px">';
  var th  = 'padding:8px 14px;text-align:left;border-bottom:1px solid var(--border2);white-space:nowrap';
  var thr = 'padding:8px 14px;text-align:right;border-bottom:1px solid var(--border2);white-space:nowrap';
  var thd = thr + (hasQIQD ? '' : ';color:var(--text3)');
  h += '<thead><tr style="background:var(--bg2);position:sticky;top:0;z-index:10">';
  h += '<th style="' + th  + '">Zone / Famille</th>';
  h += '<th style="' + thr + '">Prod avec QI</th>';
  h += '<th style="' + thr + '">En stock</th>';
  h += '<th style="' + thr + '">% Rupture</th>';
  h += '<th style="' + thd + '" title="Produits avec QI ≥ 1 et rupture < 30j (source QI/QD)">QI réel</th>';
  h += '<th style="' + thd + '" title="Prod avec QI / QI réel × 100">% Rupt. réelle</th>';
  h += '</tr></thead><tbody>';

  ZONE_ORDER.forEach(function(zoneName) {
    var zd = data[zoneName];
    if (!zd || zd.withQI === 0) return;

    var zOpen  = !!KD_OPEN_ZONES[zoneName];
    var zColor = ZC[zoneName] || '#757575';
    var icon   = zOpen ? '▾' : '▸';
    var pct  = zd.withQI > 0 ? zd.inStock / zd.withQI * 100 : 0;
    var pctR = zd.qiReel > 0 ? zd.withQI / zd.qiReel * 100 : 0;

    // Ligne zone
    h += '<tr style="background:var(--bg2);cursor:pointer;border-bottom:1px solid var(--border)" onclick="kdToggleZone(\'' + zoneName + '\')">';
    h += '<td style="padding:8px 14px;font-weight:700;font-size:13px">'
       + '<span style="margin-right:6px;color:var(--text3);font-size:11px">' + icon + '</span>'
       + '<span style="color:' + zColor + '">' + zoneName + '</span></td>';
    h += kdCell(zd.withQI, zd, function(ad) { return ad.withQI; });
    h += kdCell(zd.inStock, zd, function(ad) { return ad.inStock; });
    h += kdPctStockCell(pct, zd);
    h += kdDvCountCell(zd.qiReel, zd, hasQIQD);
    h += kdDvPctCell(pctR, zd, hasQIQD);
    h += '</tr>';

    if (!zOpen) return;

    // Familles groupées par ABC
    ['A','B','C'].forEach(function(abc) {
      var ad = zd.abc[abc];
      if (!ad || ad.withQI === 0) return;

      var aCol  = _abcCol[abc];
      var aBg   = _abcBg[abc];
      var aPct  = ad.withQI > 0 ? ad.inStock / ad.withQI * 100 : 0;
      var aPctR = ad.qiReel > 0 ? ad.withQI / ad.qiReel * 100 : 0;

      // Header ABC
      h += '<tr style="background:' + aBg + '22;border-bottom:1px solid var(--border)">';
      h += '<td style="padding:5px 14px 5px 30px">'
         + '<span style="background:' + aBg + ';color:' + aCol + ';border-radius:3px;padding:1px 8px;font-size:11px;font-weight:700">' + abc + '</span>'
         + '<span style="font-size:10px;color:var(--text3);margin-left:6px">' + ad.withQI + ' produits</span></td>';
      h += '<td style="padding:5px 14px;text-align:right;font-weight:600;color:var(--text2)">' + ad.withQI + '</td>';
      h += '<td style="padding:5px 14px;text-align:right;font-weight:600;color:var(--text2)">' + ad.inStock + '</td>';
      h += '<td style="padding:5px 14px;text-align:right;font-weight:700;color:' + kdPctColor(aPct) + '">' + aPct.toFixed(1) + '%</td>';
      if (hasQIQD) {
        h += '<td style="padding:5px 14px;text-align:right;color:var(--text2)">' + ad.qiReel + '</td>';
        h += '<td style="padding:5px 14px;text-align:right;font-weight:700;color:' + kdPctColor(200 - aPctR) + '">' + aPctR.toFixed(1) + '%</td>';
      } else {
        h += '<td colspan="2" style="padding:5px 14px;text-align:right;color:var(--text3)">—</td>';
      }
      h += '</tr>';

      // Lignes famille
      Object.keys(ad.fam).sort().forEach(function(fam) {
        var fd = ad.fam[fam];
        if (!fd || fd.withQI === 0) return;
        var fPct  = fd.withQI > 0 ? fd.inStock / fd.withQI * 100 : 0;
        var fPctR = fd.qiReel > 0 ? fd.withQI / fd.qiReel * 100 : 0;
        h += '<tr style="background:var(--bg);border-bottom:1px solid var(--border)">';
        h += '<td style="padding:5px 14px 5px 50px"><span class="fam f' + fam + '" style="font-size:10px;padding:1px 6px">' + fam + '</span></td>';
        h += '<td style="padding:5px 14px;text-align:right;color:var(--text3);font-size:11px">' + fd.withQI + '</td>';
        h += '<td style="padding:5px 14px;text-align:right;color:var(--text3);font-size:11px">' + fd.inStock + '</td>';
        h += '<td style="padding:5px 14px;text-align:right;font-size:11px;color:' + kdPctColor(fPct) + '">' + fPct.toFixed(1) + '%</td>';
        if (hasQIQD) {
          h += '<td style="padding:5px 14px;text-align:right;color:var(--text3);font-size:11px">' + fd.qiReel + '</td>';
          h += '<td style="padding:5px 14px;text-align:right;font-size:11px;color:' + kdPctColor(200 - fPctR) + '">' + fPctR.toFixed(1) + '%</td>';
        } else {
          h += '<td colspan="2" style="padding:5px 14px;text-align:right;color:var(--text3)">—</td>';
        }
        h += '</tr>';
      });
    });
  });

  h += '</tbody></table></div>';
  return '<div style="display:flex;flex-direction:column;flex:1;overflow:hidden">' + h + '</div>';
}

function kdToggleZone(z) {
  KD_OPEN_ZONES[z] = !KD_OPEN_ZONES[z];
  rKpiDashboard();
}

// ── Sync QI/QD depuis le bouton Dashboard ─────────────────────────────────────
function kdSyncQIQD() {
  var btn = document.getElementById('kdSyncBtn');
  var st  = document.getElementById('kdSyncStatus');
  var ids = (typeof getActiveFournIds === 'function') ? getActiveFournIds() : [];

  if (!ids.length) {
    if (st) { st.textContent = '⚠ Aucun fournisseur actif — configurez dans l\'onglet Fournisseurs'; st.style.color='var(--o)'; }
    return;
  }
  if (btn) btn.disabled = true;
  if (st)  { st.textContent = 'Chargement…'; st.style.color = 'var(--text3)'; }

  uFetchQIQD({
    supplierIds: ids,
    statusEl: st,
    btnEl: btn,
  }).then(function() {
    // Sauvegarde timestamp
    if (typeof S !== 'undefined') S.set('qiqd_ts', Date.now());
    if (btn) btn.disabled = false;
    rKpiDashboard(); // rebuild avec nouvelles données
  }).catch(function() {
    if (btn) btn.disabled = false;
  });
}
