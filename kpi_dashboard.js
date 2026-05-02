// ── KPI Dashboard module ─────────────────────────────────
// Dépendances : P, P_ABC, zone, ZC, DV (ventes.js – optionnel)

// ── Chargement initial depuis le Dashboard (produits + QI/QD) ─────────────
async function kdLoadAll() {
  var st = document.getElementById('kdLoadStatus');
  function setMsg(msg, color) {
    if (st) { st.textContent = msg; st.style.color = color || 'var(--accent,#1976d2)'; }
  }

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

  setMsg('⏳ Chargement QI/QD…');
  await uFetchQIQD({
    supplierIds: ids,
    statusEl:    st,
    btnEl:       null,
  });

  rKpiDashboard();
}

// ── Point d'entrée ───────────────────────────────────────
function rKpiDashboard() {
  var el = document.getElementById('kpi-dashboard-page');
  if (!el) return;
  if (!P || !P.length) {
    var timeline = (typeof kdBuildTodayTimeline === 'function') ? kdBuildTodayTimeline() : '';
    el.innerHTML = (timeline ? '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;margin:16px;overflow:hidden">' + timeline + '</div>' : '')
      + '<div style="padding:40px;text-align:center">'
      + '<div style="color:var(--text3);margin-bottom:18px;font-size:14px">Aucun produit chargé.</div>'
      + '<button onclick="kdLoadAll()" style="background:var(--accent,#1976d2);color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px">📊 Charger produits + QI/QD</button>'
      + '<div id="kdLoadStatus" style="margin-top:14px;font-size:13px;color:var(--accent)"></div>'
      + '</div>';
    return;
  }
  el.innerHTML = kdBuildPage();
}

// ── Index DV ─────────────────────────────────────────────
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

// ── Calcul données zone / ABC pour un tableau de produits donné ───────────
function kdComputeData(prods) {
  // hasQIQD = true seulement si au moins un produit de CE groupe a des données QI/QD réelles
  var hasQIQD = typeof window !== 'undefined' && window.QIQD
    && prods.some(function(p) { return !!window.QIQD[p.id]; });
  var dvIdx   = hasQIQD ? {} : kdBuildDvIdx();

  var ZONE_ORDER = ['LGV','PF','Rota','Prio','Salée','Sucrée','Liquide','DPH','Frais sec','Autre'];
  var ABC_ORDER  = ['A','B','C','D'];

  function mkNode() { return { withQI:0, inStock:0, qiReel:0 }; }

  var data = {};
  ZONE_ORDER.forEach(function(z) {
    data[z] = mkNode();
    data[z].abc = {};
    ABC_ORDER.forEach(function(abc) { data[z].abc[abc] = mkNode(); });
  });

  prods.forEach(function(p) {
    var z   = zone(p.a);
    var abc = P_ABC[p.id] || 'D';
    if (!data[z]) return;
    if (!data[z].abc[abc]) data[z].abc[abc] = mkNode();

    var q       = hasQIQD ? window.QIQD[p.id] : null;
    var qi      = q ? q.qi    : (p.q  || 0);
    var stock   = q ? q.stock : (p.st || 0);
    var rupDays = q ? q.rupt  : (p.rupt != null ? p.rupt : dvIdx[String(p.id)]);

    if (qi <= 0) return;

    var hasSt    = stock > 0;
    var isQiReel = (rupDays === undefined || rupDays === null || rupDays < 30);

    function acc(node) {
      node.withQI++;
      if (hasSt)    node.inStock++;
      if (isQiReel) node.qiReel++;
    }

    acc(data[z]);
    acc(data[z].abc[abc]);
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

// Badge cliquable si zoneName + supId fournis
function kdBadge(abc, val, color, zoneName, supId) {
  var bg    = _abcBg[abc]  || 'var(--bg2)';
  var col   = color || _abcCol[abc] || 'var(--text)';
  var click = (zoneName != null)
    ? ' onclick="kdOpenAbc(\'' + zoneName.replace(/'/g,"\\'") + '\',\'' + abc + '\',' + (supId != null ? '\'' + supId + '\'' : 'null') + ')" style="cursor:pointer;display:inline-flex;align-items:center;margin-left:5px;background:' + bg + ';color:' + col + ';border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;line-height:16px"'
    : ' style="display:inline-flex;align-items:center;margin-left:5px;background:' + bg + ';color:' + col + ';border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;line-height:16px"';
  return '<span' + click + '>' + abc + ' ' + val + '</span>';
}

function kdCell(total, zd, getVal, fmt, style, zoneName, supId) {
  var s = style || 'padding:7px 14px;text-align:right;white-space:nowrap';
  var h = '<td style="' + s + '"><span style="font-weight:700">' + (fmt ? fmt(total) : total) + '</span>';
  ['A','B','C'].forEach(function(abc) {
    var ad = zd.abc[abc];
    if (!ad || ad.withQI === 0) return;
    var v = getVal(ad);
    if (v === null || v === undefined) return;
    h += kdBadge(abc, fmt ? fmt(v) : v, null, zoneName, supId);
  });
  return h + '</td>';
}

function kdPctStockCell(pct, zd, style, zoneName, supId) {
  var s   = style || 'padding:7px 14px;text-align:right;white-space:nowrap';
  var fmt = function(v) { return v.toFixed(1) + '%'; };
  var h   = '<td style="' + s + '"><span style="font-weight:700;color:' + kdPctColor(pct) + '">' + fmt(pct) + '</span>';
  ['A','B','C'].forEach(function(abc) {
    var ad = zd.abc[abc];
    if (!ad || ad.withQI === 0) return;
    var p2 = ad.withQI > 0 ? ad.inStock / ad.withQI * 100 : 0;
    h += kdBadge(abc, fmt(p2), kdPctColor(p2), zoneName, supId);
  });
  return h + '</td>';
}

function kdDvCountCell(total, zd, hasDV, style, zoneName, supId) {
  if (!hasDV) return '<td style="' + (style || 'padding:7px 14px;text-align:right;color:var(--text3)') + '">—</td>';
  return kdCell(total, zd, function(ad) { return ad.qiReel; }, null, style, zoneName, supId);
}

function kdDvPctCell(pct, zd, hasDV, style, zoneName, supId) {
  if (!hasDV) return '<td style="' + (style || 'padding:7px 14px;text-align:right;color:var(--text3)') + '">—</td>';
  var s   = style || 'padding:7px 14px;text-align:right;white-space:nowrap';
  var fmt = function(v) { return v.toFixed(1) + '%'; };
  var h   = '<td style="' + s + '"><span style="font-weight:700;color:' + kdPctColor(100 - (pct - 100)) + '">' + fmt(pct) + '</span>';
  ['A','B','C'].forEach(function(abc) {
    var ad = zd.abc[abc];
    if (!ad || ad.withQI === 0) return;
    var p2 = ad.qiReel > 0 ? ad.withQI / ad.qiReel * 100 : 0;
    h += kdBadge(abc, fmt(p2), kdPctColor(200 - p2), zoneName, supId);
  });
  return h + '</td>';
}

// ── Rendu d'un tableau pour un fournisseur ────────────────
function kdBuildTable(supName, supId, comp) {
  var data       = comp.data;
  var hasQIQD    = comp.hasQIQD;
  var ZONE_ORDER = comp.ZONE_ORDER;

  // Vérifie qu'il y a au moins une zone non vide
  var hasRows = ZONE_ORDER.some(function(z) { return data[z] && data[z].withQI > 0; });
  if (!hasRows) return '';

  var th  = 'padding:8px 14px;text-align:left;border-bottom:1px solid var(--border2);white-space:nowrap';
  var thr = 'padding:8px 14px;text-align:right;border-bottom:1px solid var(--border2);white-space:nowrap';
  var thd = thr + (hasQIQD ? '' : ';color:var(--text3)');

  var h = '';

  // En-tête fournisseur
  h += '<div style="padding:16px 16px 6px 16px;display:flex;align-items:center;gap:8px">';
  h += '<span style="font-size:15px;font-weight:800;color:var(--text)">' + supName + '</span>';
  h += '</div>';

  // Tableau
  h += '<div style="overflow-x:auto;padding:0 0 24px 0">';
  h += '<table style="border-collapse:collapse;width:100%;font-size:12px;min-width:560px">';
  h += '<thead><tr style="background:var(--bg2)">';
  h += '<th style="' + th  + '">Zone</th>';
  h += '<th style="' + thr + '">Prod avec QI</th>';
  h += '<th style="' + thr + '">En stock</th>';
  h += '<th style="' + thr + '">% Rupture</th>';
  h += '<th style="' + thd + '" title="Produits avec QI ≥ 1 et rupture < 30j">QI réel</th>';
  h += '<th style="' + thd + '" title="Prod avec QI / QI réel × 100">% Rupt. réelle</th>';
  h += '</tr></thead><tbody>';

  ZONE_ORDER.forEach(function(zoneName) {
    var zd = data[zoneName];
    if (!zd || zd.withQI === 0) return;

    var zColor = ZC[zoneName] || '#757575';
    var pct  = zd.withQI > 0 ? zd.inStock / zd.withQI * 100 : 0;
    var pctR = zd.qiReel > 0 ? zd.withQI / zd.qiReel * 100 : 0;

    h += '<tr style="background:var(--bg2);border-bottom:1px solid var(--border)">';
    h += '<td style="padding:8px 14px;font-weight:700;font-size:13px;color:' + zColor + '">' + zoneName + '</td>';
    h += kdCell(zd.withQI, zd, function(ad) { return ad.withQI; }, null, null, zoneName, supId);
    h += kdCell(zd.inStock, zd, function(ad) { return ad.inStock; }, null, null, zoneName, supId);
    h += kdPctStockCell(pct, zd, null, zoneName, supId);
    h += kdDvCountCell(zd.qiReel, zd, hasQIQD, null, zoneName, supId);
    h += kdDvPctCell(pctR, zd, hasQIQD, null, zoneName, supId);
    h += '</tr>';
  });

  h += '</tbody></table></div>';
  return h;
}

// ── Construction de la page ───────────────────────────────
function kdBuildPage() {
  var qiqdCount = typeof window !== 'undefined' && window.QIQD ? Object.keys(window.QIQD).length : 0;
  var qiqdTs    = typeof S !== 'undefined' ? S.get('qiqd_ts') : null;
  var syncLabel = qiqdTs ? ('Sync ' + new Date(qiqdTs).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})) : '';

  var h = '';

  // Header global
  h += '<div style="position:sticky;top:0;z-index:20;background:var(--bg);border-bottom:1px solid var(--border);'
     + 'padding:10px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap">';
  h += '<span style="font-size:14px;font-weight:700">Dashboard Ruptures</span>';

  if (qiqdCount > 0) {
    h += '<span style="font-size:11px;background:var(--gbg);color:var(--g);border:1px solid var(--gbrd);'
       + 'padding:2px 10px;border-radius:20px">✓ QI/QD — ' + qiqdCount + ' produits'
       + (syncLabel ? ' · ' + syncLabel : '') + '</span>';
  } else {
    h += '<span style="font-size:11px;background:var(--obg);color:var(--o);border:1px solid var(--obrd);'
       + 'padding:2px 10px;border-radius:20px">⚠ QI/QD non chargé — ruptures estimées depuis CSV</span>';
  }
  h += '</div>';

  // Corps
  h += '<div style="overflow:auto;flex:1;padding:0 0 40px 0">';

  // ── Timeline équipe aujourd'hui ──────────────────────────
  h += kdBuildTodayTimeline();

  // Récupère les supIds présents dans P (dans l'ordre d'apparition)
  var supIds = [];
  var seen   = {};
  P.forEach(function(p) {
    var sid = p.supId || '__none__';
    if (!seen[sid]) { seen[sid] = true; supIds.push(sid); }
  });

  supIds.forEach(function(supId) {
    var prods   = P.filter(function(p) { return (p.supId || '__none__') === supId; });
    var supName = supId === '__none__'
      ? 'CSV / Data embarquée'
      : ((typeof SUPPLIERS_DICT !== 'undefined' && SUPPLIERS_DICT[supId])
          || (typeof NAV_SUPPLIERS !== 'undefined' && NAV_SUPPLIERS[supId])
          || ('#' + supId));

    var comp = kdComputeData(prods);
    var sid  = supId === '__none__' ? null : supId;
    h += kdBuildTable(supName, sid, comp);

    // Séparateur entre tableaux
    h += '<div style="height:1px;background:var(--border);margin:0 16px"></div>';
  });

  h += '</div>';
  return '<div style="display:flex;flex-direction:column;flex:1;overflow:hidden">' + h + '</div>';
}

// ── Popup produits par Zone × ABC ─────────────────────────
function _kdBuildRows(list) {
  var rows = '';
  list.forEach(function(p) {
    var _ean = String(p.bc || '').replace(/\.0$/, '').trim();
    rows += '<tr style="border-bottom:1px solid var(--border)">';
    rows += '<td style="padding:4px 6px;text-align:center"><input type="checkbox" class="share-cb" data-id="' + p.id + '" style="width:15px;height:15px;cursor:pointer"></td>';
    rows += '<td style="padding:4px 6px"><button class="btn xs" onclick="copyProdName(' + p.id + ')" title="Copier">📋</button></td>';
    rows += '<td style="padding:7px 10px;max-width:260px;font-size:12px"><a href="https://products.app.deleev.com/products/' + p.id + '?tab=stock" target="_blank" style="color:var(--text);text-decoration:none;font-weight:500" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text)\'">' + p.n + '</a></td>';
    rows += '<td style="padding:4px 6px;text-align:center"><button class="btn xs ean-check-btn" onclick="loadModalBarcode(\'' + _ean + '\',this)">✓</button></td>';
    rows += '<td style="padding:7px 10px;color:var(--accent);font-weight:600;white-space:nowrap">' + p.z + '</td>';
    rows += '<td style="padding:7px 10px;font-weight:700">' + p.q + '</td>';
    rows += '<td style="padding:7px 10px;font-weight:600;color:' + (p.st > 0 ? 'var(--g)' : 'var(--r)') + '">' + (p.st || 0) + '</td>';
    rows += '<td style="padding:7px 10px;font-weight:600;color:var(--text3)">' + (p.c || '—') + '</td>';
    rows += '<td style="padding:4px 6px"><span class="fam f' + p.f + '" style="font-size:10px;padding:1px 4px">' + p.f + '</span></td>';
    rows += '</tr>';
  });
  return rows;
}

function kdFamFilt(f) {
  var modalId = 'kd-abc-modal';
  window._kdAbcFamSel = (window._kdAbcFamSel === f) ? '' : f;
  document.querySelectorAll('#' + modalId + '-fam .fam').forEach(function(b) {
    b.style.opacity    = (!window._kdAbcFamSel || b.textContent === window._kdAbcFamSel) ? '1' : '0.3';
    b.style.fontWeight = b.textContent === window._kdAbcFamSel ? '800' : '400';
  });
  var list = window._kdAbcFamSel
    ? (window._kdAbcProds || []).filter(function(p) { return p.f === window._kdAbcFamSel; })
    : (window._kdAbcProds || []);
  var tbody = document.querySelector('#' + modalId + '-tbody');
  if (tbody) tbody.innerHTML = _kdBuildRows(list);
}

function kdOpenAbc(zoneName, abc, supId) {
  var modalId   = 'kd-abc-modal';
  var abcColors = { A: 'var(--g)', B: 'var(--o)', C: 'var(--r)', D: '#6b3fa0' };

  var prods = P.filter(function(p) {
    var zoneMatch = zone(p.a) === zoneName;
    var abcMatch  = (P_ABC[p.id] || 'D') === abc;
    var supMatch  = supId == null ? (!p.supId) : (p.supId === supId);
    return zoneMatch && abcMatch && supMatch;
  }).sort(function(a, b) { return b.q - a.q; });

  var ex = document.getElementById(modalId); if (ex) ex.remove();
  window._kdAbcProds  = prods;
  window._kdAbcFamSel = '';

  var fams = [...new Set(prods.map(function(p) { return p.f; }))].sort();

  // Nom fournisseur pour l'en-tête
  var supName = supId == null ? 'CSV / Data embarquée'
    : ((typeof SUPPLIERS_DICT !== 'undefined' && SUPPLIERS_DICT[supId])
        || (typeof NAV_SUPPLIERS !== 'undefined' && NAV_SUPPLIERS[supId])
        || ('#' + supId));

  var modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto';

  var h = '<div style="background:var(--bg,#fff);border-radius:12px;width:900px;max-width:98vw;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2)">';

  // Header
  h += '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap">';
  h += '<span style="font-weight:800;font-size:14px;color:' + (abcColors[abc] || 'var(--text)') + ';background:var(--bg2);padding:3px 10px;border-radius:6px">' + abc + '</span>';
  h += '<span style="font-size:14px;font-weight:700">' + zoneName + '</span>';
  h += '<span style="font-size:12px;color:var(--text2)">' + supName + '</span>';
  h += '<span style="font-size:12px;color:var(--text3)">' + prods.length + ' produits</span>';

  // Barcode zone
  h += '<div id="modal-barcode-zone" style="display:flex;flex-direction:column;align-items:center;min-width:160px;padding:4px 8px;background:var(--bg2);border-radius:var(--r6,6px);border:1px solid var(--border)">';
  h += '<span style="font-size:9px;color:var(--text3);margin-bottom:2px">Code-barre</span>';
  h += '<div id="modal-barcode-img" style="min-height:40px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:var(--text3)">— cliquer sur ✓ —</span></div></div>';

  // Famille filter
  h += '<div id="' + modalId + '-fam" style="display:flex;gap:3px;flex-wrap:wrap;align-items:center">';
  h += '<span style="font-size:10px;color:var(--text3)">Famille:</span>';
  fams.forEach(function(f) {
    h += '<span class="fam f' + f + '" style="cursor:pointer;font-size:10px;padding:1px 5px" onclick="kdFamFilt(\'' + f + '\')">' + f + '</span>';
  });
  h += '</div>';

  h += '<button onclick="document.getElementById(\'' + modalId + '\').remove()" style="margin-left:auto;border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h += '</div>';

  // Tableau
  h += '<div style="overflow-y:auto;flex:1"><table style="border-collapse:collapse;width:100%;font-size:11px">';
  h += '<thead><tr style="background:var(--bg2);position:sticky;top:0">';
  ['☐','','Nom','✓','Zonage','QI','Stock','Colis','Famille'].forEach(function(c) {
    h += '<th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--border2);white-space:nowrap">' + c + '</th>';
  });
  h += '</tr></thead><tbody id="' + modalId + '-tbody">' + _kdBuildRows(prods) + '</tbody></table></div></div>';

  modal.innerHTML = h;
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

// ── Planning du jour — timeline ───────────────────────────
function kdParseSlotTime(label) {
  var parts = label.split(/\s*[-–]\s*/);
  if (parts.length < 2) return null;
  function parseT(s) {
    var m = s.trim().match(/^(\d+)h(\d*)/i);
    if (!m) return null;
    return parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0);
  }
  var start = parseT(parts[0]);
  var end   = parseT(parts[1]);
  if (start === null || end === null) return null;
  return { start: start, end: end };
}

function kdBuildTodayTimeline() {
  if (typeof plGet !== 'function' || typeof plISOWeek !== 'function' || typeof plCellKey !== 'function') return '';

  var PL_START = 7  * 60;  // 7h
  var PL_END   = 23 * 60;  // 23h
  var PL_RANGE = PL_END - PL_START;

  var today    = new Date();
  var weekStr  = plISOWeek(today);
  var dayIdx   = (today.getDay() + 6) % 7;
  var planData = plGet();
  var weekData = planData.weeks[weekStr];
  if (!weekData) return '';

  var DAYS   = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  var MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var dayLabel = DAYS[dayIdx] + ' ' + today.getDate() + ' ' + MONTHS[today.getMonth()];

  // Collecte les entrées du jour groupées
  var rows = [];
  var groups = planData.groups || [];
  var slots  = planData.slots  || [];
  groups.forEach(function(group) {
    var key  = plCellKey(dayIdx, group);
    var cell = weekData[key] || [];
    if (!cell.length) return;
    rows.push({ type: 'group', label: group });
    cell.forEach(function(e) {
      var slotDef = slots.find(function(s) { return s.label === e.slot; });
      var color   = slotDef ? slotDef.color : '#888';
      var times   = kdParseSlotTime(e.slot);
      if (!times) return;
      rows.push({ type: 'entry', emp: e.emp, slot: e.slot, color: color,
                  startMin: times.start, endMin: times.end });
    });
  });

  if (!rows.some(function(r) { return r.type === 'entry'; })) return '';

  // Heure actuelle
  var nowMin      = today.getHours() * 60 + today.getMinutes();
  var nowInRange  = nowMin >= PL_START && nowMin <= PL_END;
  var nowPct      = (nowMin - PL_START) / PL_RANGE * 100;
  var nowHLabel   = today.getHours() + 'h' + (today.getMinutes() ? String(today.getMinutes()).padStart(2,'0') : '');

  var NAME_W = 88; // px

  var h = '<div style="border-bottom:1px solid var(--border);padding-bottom:16px">';

  // Section header
  h += '<div style="padding:12px 16px 10px;display:flex;align-items:center;gap:10px">';
  h += '<span style="font-size:13px;font-weight:700">👥 Équipe aujourd\'hui</span>';
  h += '<span style="font-size:11px;color:var(--text3)">' + dayLabel + '</span>';
  h += '</div>';

  h += '<div style="padding:0 16px">';

  // Ligne des heures
  h += '<div style="margin-left:' + NAME_W + 'px;position:relative;height:16px;margin-bottom:2px">';
  for (var hh = 7; hh <= 23; hh += 2) {
    var pct = (hh * 60 - PL_START) / PL_RANGE * 100;
    h += '<div style="position:absolute;left:' + pct + '%;font-size:9px;color:var(--text3);transform:translateX(-50%);white-space:nowrap">' + hh + 'h</div>';
  }
  h += '</div>';

  // Lignes employés
  rows.forEach(function(row) {
    if (row.type === 'group') {
      h += '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin:6px 0 2px 0">' + row.label + '</div>';
      return;
    }
    var barLeft  = Math.max(0, (row.startMin - PL_START) / PL_RANGE * 100);
    var barWidth = Math.min(100 - barLeft, (row.endMin - row.startMin) / PL_RANGE * 100);
    var sH = Math.floor(row.startMin/60)+'h'+(row.startMin%60?String(row.startMin%60).padStart(2,'0'):'');
    var eH = Math.floor(row.endMin/60)  +'h'+(row.endMin%60  ?String(row.endMin%60).padStart(2,'0')  :'');

    h += '<div style="display:flex;align-items:center;margin-bottom:4px">';
    // Nom
    h += '<div style="width:' + NAME_W + 'px;font-size:11px;font-weight:600;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px;color:var(--text)">' + row.emp + '</div>';
    // Track
    h += '<div style="flex:1;height:20px;position:relative;border-radius:4px;overflow:visible">';
    // Grille verticale légère
    for (var gh = 7; gh <= 23; gh += 2) {
      var gPct = (gh * 60 - PL_START) / PL_RANGE * 100;
      h += '<div style="position:absolute;top:0;bottom:0;left:' + gPct + '%;width:1px;background:var(--border);opacity:.5"></div>';
    }
    // Barre colorée
    h += '<div title="' + row.slot + '" style="position:absolute;top:2px;bottom:2px;left:' + barLeft + '%;width:' + barWidth + '%;background:' + row.color + ';border-radius:3px;display:flex;align-items:center;justify-content:center;min-width:4px;overflow:hidden">';
    if (barWidth > 8) {
      h += '<span style="font-size:9px;color:#fff;font-weight:600;white-space:nowrap;padding:0 5px">' + sH + '–' + eH + '</span>';
    }
    h += '</div>';
    // Ligne "maintenant"
    if (nowInRange) {
      h += '<div style="position:absolute;top:-3px;bottom:-3px;left:' + nowPct + '%;width:2px;background:var(--r,#d32f2f);border-radius:1px;z-index:3"></div>';
    }
    h += '</div>'; // track
    h += '</div>'; // row
  });

  h += '</div>'; // padding
  h += '</div>'; // widget
  return h;
}
