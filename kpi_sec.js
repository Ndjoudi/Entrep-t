// ── KPI Sec ───────────────────────────────────────────────
// Données quotidiennes depuis Deleev admin → Google Sheets
// Affichage filtré selon les fournisseurs actifs (getActiveFournIds)

var KF_PROXY = 'https://project-rps1u.vercel.app/api/kpi_depot'; // ← URL Vercel (fichier api/kpi_depot.js dans GitHub)

var _kfRows   = [];
var _kfFilter = 'day';   // 'day' | 'week' | 'month'
var _kfLoaded = false;

// ── Parse helpers ────────────────────────────────────────
function kfParseValue(td) {
  var m = td.match(/<strong>([^<]+)<\/strong>/);
  var v = m ? m[1].trim() : td.replace(/<[^>]+>/g, '').trim();
  if (!v || v === '0') return 0;
  if (v.indexOf('€') !== -1) return parseFloat(v.replace(/[€\s ]/g, '').replace(',', '.')) || 0;
  if (v.indexOf('%') !== -1) return parseFloat(v.replace('%', '').replace(',', '.')) || 0;
  if (v.indexOf('m') !== -1 && v.indexOf('s') !== -1) {
    var mm = v.match(/(\d+)m/), ss = v.match(/(\d+)s/);
    return (mm ? parseInt(mm[1]) * 60 : 0) + (ss ? parseInt(ss[1]) : 0);
  }
  if (/^\d+s$/.test(v)) return parseInt(v);
  return parseFloat(v.replace(/[\s ]/g, '').replace(',', '.')) || 0;
}

function kfExtractByLabel(html, label) {
  if (!html) return 0;
  var e = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var r = new RegExp('<tr[^>]*>[\\s\\S]*?<strong>' + e + '</strong>[\\s\\S]*?<td[^>]*class="[^"]*table-info[^"]*"[^>]*>([\\s\\S]*?)</td>', 'i');
  var m = html.match(r);
  return m ? kfParseValue(m[1]) : 0;
}

function kfExtractById(html, id) {
  if (!html) return 0;
  var r = new RegExp('<tr[^>]*id="' + id + '"[^>]*>[\\s\\S]*?<td[^>]*class="[^"]*table-info[^"]*"[^>]*>([\\s\\S]*?)</td>', 'i');
  var m = html.match(r);
  return m ? kfParseValue(m[1]) : 0;
}

// ── Parse réponse Deleev ─────────────────────────────────
function kfParseFetchResponse(data) {
  var d   = data.data || {};
  var dsh = (d.dashboard    || {}).html || '';
  var stk = (d.stockstat    || {}).html || '';
  var pck = (d.packingstat  || {}).html || '';
  var wh  = (d.warehousezone|| {}).html || '';
  var sup = (d.supplier     || {}).html || '';

  var kpis = {
    ca_ttc:                  kfExtractById(dsh, 'ca_ttc'),
    montant_dlc:             kfExtractByLabel(stk, 'Montant Sorti DLC'),
    couts_zone_frais:        kfExtractByLabel(pck, 'Coûts Zone Frais'),
    ca_ht_frais:             kfExtractByLabel(wh,  'CA HT Frais'),
    pct_ca_ht_frais:         kfExtractByLabel(wh,  '% CA HT Frais'),
    item_prep_frais:         kfExtractByLabel(wh,  'Item Prép. Frais'),
    tps_picking_moyen_frais: kfExtractByLabel(wh,  'Tps picking moyen Frais'),
    vrai_manquants_frais:    kfExtractByLabel(wh,  'Vrai Manquants Frais'),
    suppliers: {}
  };

  // Extrait CA HT + marge pour chaque fournisseur connu
  if (sup && typeof SUPPLIERS_DICT !== 'undefined') {
    Object.keys(SUPPLIERS_DICT).forEach(function(id) {
      var name = SUPPLIERS_DICT[id];
      if (!name) return;
      var ca    = kfExtractByLabel(sup, 'CA HT ' + name);
      var marge = kfExtractByLabel(sup, 'Taux de marge ' + name);
      if (ca || marge) {
        kpis.suppliers['sup_' + id] = { name: name, ca_ht: ca, marge: marge };
      }
    });
  }

  return kpis;
}

// ── API calls ────────────────────────────────────────────
async function kfFetchForDate(ds) {
  var r = await fetch(KF_PROXY + '?action=fetch_kpis&date_min=' + ds + '&date_max=' + ds + '&agregation=day');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  var data = await r.json();
  if (data.error) throw new Error(data.error);
  var kpis = kfParseFetchResponse(data);
  kpis.date = ds;
  return kpis;
}

async function kfSave(kpis) {
  var payload = {
    date:                    kpis.date || '',
    ca_ttc:                  kpis.ca_ttc              || 0,
    montant_dlc:             kpis.montant_dlc         || 0,
    couts_zone_frais:        kpis.couts_zone_frais    || 0,
    ca_ht_frais:             kpis.ca_ht_frais         || 0,
    pct_ca_ht_frais:         kpis.pct_ca_ht_frais     || 0,
    item_prep_frais:         kpis.item_prep_frais      || 0,
    tps_picking_moyen_frais: kpis.tps_picking_moyen_frais || 0,
    vrai_manquants_frais:    kpis.vrai_manquants_frais || 0
  };
  if (kpis.suppliers) {
    var sd = {};
    Object.keys(kpis.suppliers).forEach(function(k) {
      var s = kpis.suppliers[k];
      sd[k + '_ca']    = s.ca_ht || 0;
      sd[k + '_marge'] = s.marge || 0;
    });
    payload.suppliers = sd;
  }
  var r = await fetch(KF_PROXY + '?action=save_kpis', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.json();
}

async function kfLoad() {
  var r = await fetch(KF_PROXY + '?action=load_kpis');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  var res = await r.json();
  if (res.error) throw new Error(res.error);
  return (res.rows || []).map(function(row) {
    // Convertit les strings numériques
    ['ca_ttc','montant_dlc','couts_zone_frais','ca_ht_frais','pct_ca_ht_frais',
     'item_prep_frais','tps_picking_moyen_frais','vrai_manquants_frais'].forEach(function(k) {
      if (typeof row[k] === 'string') row[k] = parseFloat(row[k].replace(/[^\d.,-]/g,'').replace(',','.')) || 0;
    });
    return row;
  }).filter(function(r) { return !!r.date; });
}

// ── Actions boutons ───────────────────────────────────────

// Charge une plage de dates jour par jour
async function kfLoadPeriod() {
  var minEl = document.getElementById('kfDateMin');
  var maxEl = document.getElementById('kfDateMax');
  if (!minEl || !maxEl || !minEl.value || !maxEl.value) return;

  var dateMin = minEl.value;
  var dateMax = maxEl.value;
  if (dateMin > dateMax) { var tmp = dateMin; dateMin = dateMax; dateMax = tmp; }

  function setStatus(msg, color) {
    var st = document.getElementById('kfStatus');
    if (!st) return;
    st.textContent   = msg;
    st.style.color   = color || 'var(--accent,#1976d2)';
    st.style.display = 'block';
  }

  // Construit la liste des jours
  var days = [], cur = new Date(dateMin + 'T12:00:00');
  var end  = new Date(dateMax + 'T12:00:00');
  while (cur <= end) {
    days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }

  // Charge les données existantes pour éviter les doublons
  var existingDates = {};
  _kfRows.forEach(function(r) { existingDates[r.date] = true; });

  var ok = 0, skip = 0, err = 0;
  for (var i = 0; i < days.length; i++) {
    var ds = days[i];
    setStatus('⏳ ' + ds + ' (' + (i + 1) + '/' + days.length + ') — ✅ ' + ok + ' · ⏭ ' + skip + ' · ❌ ' + err);
    if (existingDates[ds]) { skip++; continue; }
    try {
      var kpis = await kfFetchForDate(ds);
      await kfSave(kpis);
      existingDates[ds] = true;
      ok++;
    } catch(e) { err++; }
  }

  try { await fetch(KF_PROXY + '?action=trim_kpis&keep=90'); } catch(e) {}
  setStatus('✅ Terminé — ' + ok + ' chargés · ' + skip + ' déjà présents · ' + err + ' erreurs', 'var(--g,#2e7d32)');
  await kfRefresh();
}

async function kfLoadJ1() {
  function setStatus(msg, color) {
    var st = document.getElementById('kfStatus');
    if (!st) return;
    st.textContent   = msg;
    st.style.color   = color || 'var(--accent,#1976d2)';
    st.style.display = 'block';
  }

  setStatus('⏳ Récupération J-1 depuis Deleev…');
  try {
    var d = new Date(); d.setDate(d.getDate() - 1);
    var ds = d.toISOString().split('T')[0];
    var kpis = await kfFetchForDate(ds);
    setStatus('⏳ Sauvegarde dans Google Sheets…');
    await kfSave(kpis);
    try { await fetch(KF_PROXY + '?action=trim_kpis&keep=90'); } catch(e) {}
    setStatus('✅ ' + ds + ' chargé !', 'var(--g,#2e7d32)');
    await kfRefresh();
    setTimeout(function() {
      var st = document.getElementById('kfStatus');
      if (st) st.style.display = 'none';
    }, 3000);
  } catch(err) {
    setStatus('❌ ' + err.message, 'var(--r,#d32f2f)');
  }
}

async function kfRefresh() {
  try {
    var rows = await kfLoad();
    _kfRows  = rows;
    _kfLoaded = true;
    kfRenderSection();
  } catch(err) {
    var st = document.getElementById('kfStatus');
    if (st) { st.textContent = '❌ ' + err.message; st.style.color = 'var(--r,#d32f2f)'; st.style.display = 'block'; }
  }
}

// Init appelé après que kdBuildPage() a injecté le placeholder #kf-section
async function kfInit() {
  if (!document.getElementById('kf-section')) return;
  await kfRefresh();
}

function kfSetFilter(f) {
  _kfFilter = f;
  kfRenderSection();
}

// ── Format helpers ────────────────────────────────────────
function kfFE(v)  { return typeof v === 'number' && v ? v.toLocaleString('fr-FR', {maximumFractionDigits:0}) + '€' : '—'; }
function kfFE2(v) { return typeof v === 'number' && v ? v.toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '€' : '—'; }
function kfFP(v)  { return typeof v === 'number' && v ? v.toFixed(2) + '%' : '—'; }
function kfFN(v)  { return typeof v === 'number' && v ? Math.round(v).toLocaleString('fr-FR') : '—'; }
function kfFT(v)  {
  if (typeof v !== 'number' || !v) return '—';
  if (v >= 60) return Math.floor(v / 60) + 'm' + (v % 60 ? (v % 60) + 's' : '');
  return Math.round(v) + 's';
}

function kfDelta(cur, prev, invert) {
  if (!prev || !cur) return '';
  var pct = (cur - prev) / Math.abs(prev) * 100;
  if (Math.abs(pct) < 0.5) return '';
  var good  = invert ? (pct < 0) : (pct > 0);
  var color = good ? 'var(--g,#2e7d32)' : 'var(--r,#d32f2f)';
  var bg    = good ? 'var(--gbg,#e8f5e9)' : 'var(--rbg,#ffebee)';
  var sign  = pct > 0 ? '+' : '';
  return ' <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:' + bg + ';color:' + color + '">' + sign + pct.toFixed(1) + '%</span>';
}

function kfFormatDate(ds, filter) {
  var d    = new Date(ds + 'T12:00:00');
  var days = ['dim','lun','mar','mer','jeu','ven','sam'];
  if (filter === 'month') return d.toLocaleDateString('fr-FR', {month:'short', year:'numeric'});
  if (filter === 'week')  return 'Sem. ' + ds.substring(5, 10);
  return days[d.getDay()] + ' ' + d.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'});
}

// ── Agrégation semaine / mois ─────────────────────────────
function kfAggregate(rows, filter) {
  if (filter === 'day') return rows.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });

  var g = {};
  rows.forEach(function(row) {
    var d = new Date(row.date + 'T12:00:00');
    var k;
    if (filter === 'week') {
      var mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      k = mon.toISOString().split('T')[0];
    } else {
      k = row.date.substring(0, 7) + '-01';
    }
    if (!g[k]) {
      g[k] = { date:k, ca_ttc:0, montant_dlc:0, couts_zone_frais:0, ca_ht_frais:0,
                pct_ca_ht_frais:0, item_prep_frais:0, tps_picking_moyen_frais:0, vrai_manquants_frais:0,
                _c:0, _sup:{} };
    }
    var o = g[k];
    ['ca_ttc','montant_dlc','couts_zone_frais','ca_ht_frais','item_prep_frais','vrai_manquants_frais'].forEach(function(fk) {
      o[fk] += Number(row[fk]) || 0;
    });
    o.pct_ca_ht_frais         += Number(row.pct_ca_ht_frais)         || 0;
    o.tps_picking_moyen_frais += Number(row.tps_picking_moyen_frais) || 0;
    o._c++;

    // Fournisseurs
    Object.keys(row).forEach(function(rk) {
      if (rk.startsWith('sup_') && rk.endsWith('_ca')) {
        if (!o._sup[rk]) o._sup[rk] = 0;
        o._sup[rk] += Number(row[rk]) || 0;
      }
      if (rk.startsWith('sup_') && rk.endsWith('_marge')) {
        var sk = rk + '_sum', ck = rk + '_cnt';
        if (!o._sup[sk]) o._sup[sk] = 0;
        if (!o._sup[ck]) o._sup[ck] = 0;
        o._sup[sk] += Number(row[rk]) || 0;
        o._sup[ck]++;
      }
    });
  });

  return Object.values(g).sort(function(a, b) { return b.date.localeCompare(a.date); })
    .map(function(o) {
      if (o._c > 0) {
        o.pct_ca_ht_frais         /= o._c;
        o.tps_picking_moyen_frais /= o._c;
      }
      Object.keys(o._sup).forEach(function(sk) {
        if (sk.endsWith('_marge_sum')) {
          var base = sk.replace('_sum', '');
          var cnt  = sk.replace('_sum', '_cnt');
          o._sup[base] = o._sup[cnt] ? o._sup[sk] / o._sup[cnt] : 0;
        }
      });
      return o;
    });
}

// ── Render principal ──────────────────────────────────────
function kfRenderSection() {
  var el = document.getElementById('kf-section');
  if (!el) return;

  var activeIds = (typeof getActiveFournIds === 'function') ? getActiveFournIds() : [];

  var h = '<div style="border-bottom:1px solid var(--border)">';

  // ── Header ──
  h += '<div style="padding:12px 16px 10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
  h += '<span style="font-size:13px;font-weight:700">📈 KPI Sec</span>';

  if (_kfLoaded && _kfRows.length) {
    h += '<span style="font-size:11px;color:var(--text3)">' + _kfRows.length + ' jours</span>';
    // Filtres
    h += '<div style="display:flex;gap:3px">';
    [['day','Jour'],['week','Semaine'],['month','Mois']].forEach(function(f) {
      var on = _kfFilter === f[0];
      h += '<button onclick="kfSetFilter(\'' + f[0] + '\')" style="font-size:10px;padding:2px 8px;border-radius:4px;'
         + 'border:1px solid ' + (on ? 'var(--accent,#1976d2)' : 'var(--border)') + ';'
         + 'background:' + (on ? 'var(--accent,#1976d2)' : 'var(--surface)') + ';'
         + 'color:' + (on ? '#fff' : 'var(--text2)') + ';cursor:pointer">' + f[1] + '</button>';
    });
    h += '</div>';
  }

  h += '<div style="display:flex;align-items:center;gap:6px;margin-left:auto;flex-wrap:wrap">';
  // Champ date début / fin + bouton période
  var defMax = (function(){ var d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; })();
  var defMin = (function(){ var d=new Date(); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; })();
  var inputStyle = 'font-family:\'Geist Mono\',monospace;font-size:10px;background:var(--surface);border:1px solid var(--border);'
                 + 'color:var(--text);padding:3px 6px;border-radius:5px;outline:none';
  h += '<input type="date" id="kfDateMin" value="' + defMin + '" style="' + inputStyle + '">';
  h += '<span style="font-size:10px;color:var(--text3)">→</span>';
  h += '<input type="date" id="kfDateMax" value="' + defMax + '" style="' + inputStyle + '">';
  h += '<button onclick="kfLoadPeriod()" style="font-size:11px;padding:4px 10px;border-radius:6px;'
     + 'border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer">📥 Charger</button>';
  // Bouton J-1 rapide
  h += '<button onclick="kfLoadJ1()" style="font-size:11px;padding:4px 10px;border-radius:6px;'
     + 'border:1px solid var(--accent,#1976d2);background:var(--surface);color:var(--accent,#1976d2);cursor:pointer;font-weight:600">'
     + 'J-1</button>';
  h += '</div>';
  h += '</div>';

  // Status
  h += '<div id="kfStatus" style="display:none;font-size:11px;font-family:\'Geist Mono\',monospace;'
     + 'padding:0 16px 8px;color:var(--accent)"></div>';

  // Pas de données
  if (!_kfLoaded || !_kfRows.length) {
    h += '<div style="padding:16px 16px 20px;color:var(--text3);font-size:12px">'
       + 'Aucune donnée KPI Sec — cliquez sur "Charger J-1" pour démarrer.</div>';
    h += '</div>';
    el.innerHTML = h;
    return;
  }

  // ── KPI cards globales (7 derniers jours vs 7 précédents) ──
  var sorted = _kfRows.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  var last7  = sorted.slice(0, 7);
  var prev7  = sorted.slice(7, 14);

  function sum7(arr, k) { return arr.reduce(function(s, r) { return s + (Number(r[k]) || 0); }, 0); }
  function avg7(arr, k) {
    var v = arr.filter(function(r) { return r[k]; });
    return v.length ? v.reduce(function(s, r) { return s + (Number(r[k]) || 0); }, 0) / v.length : 0;
  }
  var w1 = { ca_ttc:sum7(last7,'ca_ttc'), ca_ht_frais:sum7(last7,'ca_ht_frais'),
              montant_dlc:sum7(last7,'montant_dlc'), couts:sum7(last7,'couts_zone_frais'), tps:avg7(last7,'tps_picking_moyen_frais') };
  var w0 = { ca_ttc:sum7(prev7,'ca_ttc'), ca_ht_frais:sum7(prev7,'ca_ht_frais'),
              montant_dlc:sum7(prev7,'montant_dlc'), couts:sum7(prev7,'couts_zone_frais'), tps:avg7(prev7,'tps_picking_moyen_frais') };

  function cardD(cur, prev, inv) {
    if (!prev || !cur) return '';
    var pct = (cur - prev) / Math.abs(prev) * 100;
    if (Math.abs(pct) < 0.1) return '';
    var sign  = pct > 0 ? '+' : '';
    var color = inv ? (pct > 0 ? 'var(--r,#d32f2f)' : 'var(--g,#2e7d32)') : (pct > 0 ? 'var(--g,#2e7d32)' : 'var(--r,#d32f2f)');
    return '<div style="font-size:9px;font-family:\'Geist Mono\',monospace;color:' + color + ';margin-top:2px">' + sign + pct.toFixed(1) + '% vs S-1</div>';
  }

  var cards = [
    { lbl:'CA TTC · 7j',      val:kfFE(w1.ca_ttc),       delta:cardD(w1.ca_ttc,       w0.ca_ttc,       false), col:'var(--accent,#1976d2)' },
    { lbl:'CA HT Sec · 7j',   val:kfFE(w1.ca_ht_frais),  delta:cardD(w1.ca_ht_frais,  w0.ca_ht_frais,  false), col:'var(--g,#2e7d32)' },
    { lbl:'DLC Sorti · 7j',   val:kfFE(w1.montant_dlc),  delta:cardD(w1.montant_dlc,  w0.montant_dlc,  true),  col:'var(--o,#f57c00)' },
    { lbl:'Coûts Zone · 7j',  val:kfFE(w1.couts),        delta:cardD(w1.couts,        w0.couts,        true),  col:'var(--text)' },
    { lbl:'Tps Picking · 7j', val:kfFT(Math.round(w1.tps)), delta:cardD(w1.tps,       w0.tps,          true),  col:'var(--text)' },
  ];

  h += '<div style="display:flex;gap:1px;background:var(--border2);padding:0 16px 14px;flex-wrap:wrap">';
  cards.forEach(function(c) {
    h += '<div style="background:var(--surface);padding:8px 14px;flex:1;min-width:100px">';
    h += '<div style="font-family:\'Geist Mono\',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:3px">' + c.lbl + '</div>';
    h += '<div style="font-family:\'Geist Mono\',monospace;font-size:14px;font-weight:600;color:' + c.col + '">' + c.val + '</div>';
    h += c.delta;
    h += '</div>';
  });
  h += '</div>';

  // ── Cards fournisseurs actifs ──
  var supCardsHTML = '';
  activeIds.forEach(function(sid) {
    var caKey    = 'sup_' + sid + '_ca';
    var margeKey = 'sup_' + sid + '_marge';
    var totalCa  = _kfRows.reduce(function(s, r) { return s + (Number(r[caKey]) || 0); }, 0);
    if (!totalCa) return;

    var name     = (typeof SUPPLIERS_DICT !== 'undefined' && SUPPLIERS_DICT[sid]) || ('#' + sid);
    var tm = 0, tc = 0;
    _kfRows.forEach(function(r) { if (r[margeKey]) { tm += Number(r[margeKey]) || 0; tc++; } });
    var avgMarge  = tc ? tm / tc : 0;
    var caLast7   = last7.reduce(function(s, r) { return s + (Number(r[caKey]) || 0); }, 0);
    var caPrev7   = prev7.reduce(function(s, r) { return s + (Number(r[caKey]) || 0); }, 0);

    supCardsHTML += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;flex:1 1 140px;min-width:120px">';
    supCardsHTML += '<div style="font-size:11px;font-weight:700;margin-bottom:5px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div>';
    supCardsHTML += '<div style="font-family:\'Geist Mono\',monospace;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.6px">CA HT total</div>';
    supCardsHTML += '<div style="font-family:\'Geist Mono\',monospace;font-size:15px;font-weight:600;color:var(--g,#2e7d32)">' + kfFE(totalCa) + '</div>';
    if (avgMarge) supCardsHTML += '<div style="font-family:\'Geist Mono\',monospace;font-size:10px;color:var(--text3);margin-top:3px">Marge moy. <span style="color:var(--accent)">' + kfFP(avgMarge) + '</span></div>';
    supCardsHTML += cardD(caLast7, caPrev7, false);
    supCardsHTML += '</div>';
  });

  if (supCardsHTML) {
    h += '<div style="padding:0 16px 14px">';
    h += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin-bottom:8px">Fournisseurs actifs</div>';
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap">' + supCardsHTML + '</div>';
    h += '</div>';
  }

  // ── Mini graphique CA HT Frais ──
  var chartRows = kfAggregate(_kfRows, _kfFilter).slice().reverse();
  var chartHTML = kfBuildChart(chartRows, 'ca_ht_frais', 'CA HT Sec · évolution');
  if (chartHTML) h += '<div style="padding:0 16px 14px">' + chartHTML + '</div>';

  // ── Tableau ──
  var tableRows = kfAggregate(_kfRows, _kfFilter);
  var dateMap   = {};
  _kfRows.forEach(function(r) { dateMap[r.date] = r; });

  var th  = 'padding:6px 12px;text-align:right;border-bottom:1px solid var(--border2);font-size:11px;white-space:nowrap';
  var thl = 'padding:6px 12px;text-align:left;border-bottom:1px solid var(--border2);font-size:11px';
  var td  = 'padding:6px 12px;text-align:right;border-bottom:1px solid var(--border);white-space:nowrap;font-size:11px';
  var tdl = 'padding:6px 12px;border-bottom:1px solid var(--border);font-size:11px;font-weight:500';

  h += '<div style="padding:0 16px 16px;overflow-x:auto">';
  h += '<table style="border-collapse:collapse;width:100%;min-width:680px">';
  h += '<thead><tr style="background:var(--bg2)">';
  h += '<th style="' + thl + '">Date</th>';
  h += '<th style="' + th  + '">CA TTC</th>';
  h += '<th style="' + th  + '">DLC Sorti</th>';
  h += '<th style="' + th  + '">Coûts Zone</th>';
  h += '<th style="' + th  + '">CA HT Sec</th>';
  h += '<th style="' + th  + '">% CA</th>';
  h += '<th style="' + th  + '">Items</th>';
  h += '<th style="' + th  + '">Picking</th>';
  h += '<th style="' + th  + '">Manquants</th>';
  h += '</tr></thead><tbody>';

  tableRows.slice(0, 90).forEach(function(r, i) {
    var prev = null;
    if (_kfFilter === 'day') {
      var dp = new Date(r.date + 'T12:00:00'); dp.setDate(dp.getDate() - 7);
      prev = dateMap[dp.toISOString().split('T')[0]] || null;
    } else {
      prev = tableRows[i + 1] || null;
    }
    var pn = function(k) { return Number(r[k]) || 0; };
    var pp = function(k) { return prev ? (Number(prev[k]) || 0) : 0; };

    h += '<tr>';
    h += '<td style="' + tdl + '">' + kfFormatDate(r.date, _kfFilter) + '</td>';
    h += '<td style="' + td + ';color:var(--accent,#1976d2)">' + kfFE(pn('ca_ttc'))              + kfDelta(pn('ca_ttc'),              pp('ca_ttc'),              false) + '</td>';
    h += '<td style="' + td + ';color:var(--o,#f57c00)">'      + kfFE2(pn('montant_dlc'))        + kfDelta(pn('montant_dlc'),        pp('montant_dlc'),        true)  + '</td>';
    h += '<td style="' + td + '">'                              + kfFE2(pn('couts_zone_frais'))   + kfDelta(pn('couts_zone_frais'),   pp('couts_zone_frais'),   true)  + '</td>';
    h += '<td style="' + td + ';color:var(--g,#2e7d32)">'      + kfFE(pn('ca_ht_frais'))         + kfDelta(pn('ca_ht_frais'),        pp('ca_ht_frais'),        false) + '</td>';
    h += '<td style="' + td + '">'                              + kfFP(pn('pct_ca_ht_frais'))     + '</td>';
    h += '<td style="' + td + '">'                              + kfFN(pn('item_prep_frais'))     + kfDelta(pn('item_prep_frais'),    pp('item_prep_frais'),    false) + '</td>';
    h += '<td style="' + td + '">'                              + kfFT(pn('tps_picking_moyen_frais')) + kfDelta(pn('tps_picking_moyen_frais'), pp('tps_picking_moyen_frais'), true) + '</td>';
    h += '<td style="' + td + '">'                              + kfFN(pn('vrai_manquants_frais'))+ kfDelta(pn('vrai_manquants_frais'), pp('vrai_manquants_frais'), true) + '</td>';
    h += '</tr>';
  });

  h += '</tbody></table></div>';
  h += '</div>'; // border-bottom wrapper

  el.innerHTML = h;
}

// ── Mini graphique SVG ────────────────────────────────────
function kfBuildChart(rows, field, label) {
  var vals = rows.map(function(r) { return Number(r[field]) || 0; });
  if (vals.length < 2 || vals.every(function(v) { return v === 0; })) return '';

  var W = 800, H = 100, pad = 28;
  var max  = Math.max.apply(null, vals) * 1.1 || 1;
  var step = (W - pad * 2) / Math.max(vals.length - 1, 1);

  var pts  = vals.map(function(v, i) {
    return { x: pad + i * step, y: H - pad - (v / max) * (H - pad * 2), v: v };
  });
  var line = pts.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
  var area = line + ' L' + pts[pts.length-1].x + ',' + (H - pad) + ' L' + pts[0].x + ',' + (H - pad) + ' Z';

  var stepLbl = Math.ceil(pts.length / 8);
  var xLabels = '';
  pts.forEach(function(p, i) {
    if (i % stepLbl !== 0 && i !== pts.length - 1) return;
    xLabels += '<text x="' + p.x + '" y="' + (H - 6) + '" text-anchor="middle" fill="var(--text3)" font-size="9" font-family="monospace">'
             + kfFormatDate(rows[i].date, _kfFilter) + '</text>';
  });

  return '<div style="font-family:\'Geist Mono\',monospace;font-size:10px;color:var(--text3);margin-bottom:4px">' + label + '</div>'
    + '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:' + H + 'px;background:var(--surface);border:1px solid var(--border);border-radius:8px">'
    + '<defs><linearGradient id="kfGrad" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="#2e7d32" stop-opacity="0.3"/>'
    + '<stop offset="100%" stop-color="#2e7d32" stop-opacity="0"/>'
    + '</linearGradient></defs>'
    + '<path d="' + area + '" fill="url(#kfGrad)"/>'
    + '<path d="' + line + '" fill="none" stroke="#2e7d32" stroke-width="2"/>'
    + pts.map(function(p) { return '<circle cx="' + p.x + '" cy="' + p.y + '" r="2" fill="#2e7d32"/>'; }).join('')
    + xLabels
    + '</svg>';
}
