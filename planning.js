// ── Planning ──────────────────────────────────────────────

// ── Storage ───────────────────────────────────────────────
function plGet() {
  return S.get('planning') || {
    employees: ['Sylvain','Alpha','michel','Abdoul','Kamel','Fourat','Alexandre','Dagit'],
    groups:    ['recep','Matin','Journée Aprem','soir'],
    slots: [
      { label:'8h - 15h30',  color:'#a07830' },
      { label:'8h - 16h',    color:'#a07830' },
      { label:'11h-18H',     color:'#6b7280' },
      { label:'14h - 22h',   color:'#2563a8' },
      { label:'14h30 - 22h', color:'#2563a8' },
      { label:'19h - 22h',   color:'#9b3a3a' },
    ],
    weeks: {}
  };
}
function plSave(d) { S.set('planning', d); }

// ── Week utils ────────────────────────────────────────────
var _plWeek = null;

function plISOWeek(date) {
  var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  var y1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return d.getUTCFullYear() + '-W' + String(Math.ceil((((d - y1) / 86400000) + 1) / 7)).padStart(2,'0');
}

function plWeekDates(weekStr) {
  var parts = weekStr.split('-W');
  var year = +parts[0], week = +parts[1];
  var jan4 = new Date(year, 0, 4);
  var monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1) + (week - 1) * 7);
  return Array.from({length:7}, function(_, i) {
    var d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}

function plWeekLabel(weekStr) {
  var days = plWeekDates(weekStr);
  var months = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  var fmt = function(d) { return d.getDate() + ' ' + months[d.getMonth()]; };
  return 'Semaine du ' + fmt(days[0]) + ' – ' + fmt(days[6]) + ' ' + days[6].getFullYear();
}

function plWeekOffset(weekStr, offset) {
  var d = plWeekDates(weekStr)[0];
  d.setDate(d.getDate() + offset * 7);
  return plISOWeek(d);
}

function plCellKey(dayIdx, group) { return dayIdx + '||' + group; }

function plGetCell(data, weekStr, dayIdx, group) {
  if (!data.weeks[weekStr]) data.weeks[weekStr] = {};
  var key = plCellKey(dayIdx, group);
  if (!data.weeks[weekStr][key]) data.weeks[weekStr][key] = [];
  return data.weeks[weekStr][key];
}

// ── Main render ───────────────────────────────────────────
function rPlanning() {
  var el = document.getElementById('planning-page');
  if (!el) return;
  if (!_plWeek) _plWeek = plISOWeek(new Date());
  el.innerHTML = plBuildPage();
}

function plBuildPage() {
  var data  = plGet();
  var DAYS  = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  var dates = plWeekDates(_plWeek);
  var todayWeek = plISOWeek(new Date());
  var todayDow  = (new Date().getDay() + 6) % 7; // 0=Mon…6=Sun

  var h = '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">';

  // ── Header ──────────────────────────────────────────────
  h += '<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg);flex-shrink:0;flex-wrap:wrap">';
  h += '<button onclick="plNav(-1)" style="padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer;font-size:13px">←</button>';
  h += '<span style="font-size:13px;font-weight:600;min-width:260px;text-align:center">' + plWeekLabel(_plWeek) + '</span>';
  h += '<button onclick="plNav(1)"  style="padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer;font-size:13px">→</button>';
  if (_plWeek !== todayWeek) {
    h += '<button onclick="plGoToday()" style="padding:4px 10px;border:1px solid var(--accent,#1976d2);border-radius:6px;background:transparent;cursor:pointer;font-size:12px;color:var(--accent,#1976d2)">Aujourd\'hui</button>';
  }
  h += '<div style="margin-left:auto;display:flex;gap:8px;align-items:center">';
  h += '<button id="pl-capture-btn" onclick="plCapture()" style="padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer;font-size:12px">📸 Copier</button>';
  h += '<button onclick="plOpenDuplicate()" style="padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer;font-size:12px">⧉ Dupliquer</button>';
  h += '<label style="font-size:12px;padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer">⬆ Import CSV<input type="file" accept=".csv" onchange="plImportCSV(this)" style="display:none"></label>';
  h += '<button onclick="plExportCSV()" style="padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer;font-size:12px">⬇ Export CSV</button>';
  h += '<button onclick="plOpenConfig()" style="padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer;font-size:12px">⚙ Config</button>';
  h += '</div></div>';

  // ── Zone capturable (en-tête semaine + grille) ───────────
  h += '<div id="pl-capture-zone" style="background:var(--bg,#fff)">';
  h += '<div style="padding:10px 16px;font-size:13px;font-weight:700;border-bottom:1px solid var(--border)">' + plWeekLabel(_plWeek) + '</div>';

  // ── Grid ─────────────────────────────────────────────────
  h += '<div style="overflow:auto;flex:1">';
  h += '<table style="border-collapse:collapse;table-layout:fixed;min-width:900px;width:100%">';

  // Column widths
  h += '<colgroup><col style="width:110px">';
  DAYS.forEach(function() { h += '<col style="width:calc((100% - 110px)/7)">'; });
  h += '</colgroup>';

  // Header row
  h += '<thead><tr>';
  h += '<th style="padding:8px;border:1px solid var(--border);background:var(--bg2);position:sticky;top:0;left:0;z-index:20"></th>';
  DAYS.forEach(function(day, i) {
    var isToday = _plWeek === todayWeek && i === todayDow;
    var acBg  = isToday ? 'background:color-mix(in srgb,var(--accent,#1976d2) 12%,var(--bg2))' : 'background:var(--bg2)';
    var acCol = isToday ? 'color:var(--accent,#1976d2)' : '';
    h += '<th style="padding:8px 10px;border:1px solid var(--border);text-align:center;font-size:12px;font-weight:700;position:sticky;top:0;z-index:10;' + acBg + ';' + acCol + '">';
    h += day + '<div style="font-size:10px;font-weight:400;opacity:.65;margin-top:1px">' + dates[i].getDate() + '/' + (dates[i].getMonth()+1) + '</div>';
    h += '</th>';
  });
  h += '</tr></thead><tbody>';

  // Group rows
  data.groups.forEach(function(group) {
    h += '<tr>';
    // Row header
    h += '<td style="padding:10px 10px;border:1px solid var(--border);background:var(--bg2);font-size:11px;font-weight:700;vertical-align:top;position:sticky;left:0;z-index:5;white-space:nowrap">';
    h += group;
    h += '</td>';

    DAYS.forEach(function(day, i) {
      var cell    = plGetCell(plGet(), _plWeek, i, group);
      var isToday = _plWeek === todayWeek && i === todayDow;
      var cellBg  = isToday ? 'background:color-mix(in srgb,var(--accent,#1976d2) 4%,var(--bg))' : 'background:var(--bg)';
      var gSafe   = group.replace(/'/g,"\\'");
      var wk      = _plWeek;
      h += '<td id="plcell_' + i + '_' + gSafe + '" style="padding:6px;border:1px solid var(--border);vertical-align:top;transition:background .15s;' + cellBg + '"';
      h += ' ondragover="plDragOver(event)" ondragleave="plDragLeave(event)" ondrop="plDrop(event,\'' + wk + '\',' + i + ',\'' + gSafe + '\')">';

      // Cards
      cell.forEach(function(entry, ei) {
        var slot  = data.slots.find(function(s) { return s.label === entry.slot; });
        var sc    = slot ? slot.color : '#888';
        h += '<div draggable="true" ondragstart="plDragStart(event,\'' + wk + '\',' + i + ',\'' + gSafe + '\',' + ei + ')" ondragend="plDragEnd(event)" ';
        h += 'style="background:var(--bg2);border:1px solid var(--border);border-radius:7px;padding:6px 8px;margin-bottom:4px;font-size:11px;cursor:grab">';
        // Ligne nom + actions
        h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:4px">';
        h += '<span style="font-weight:600;font-size:12px">☰ ' + entry.emp + '</span>';
        h += '<div style="display:flex;gap:3px;flex-shrink:0">';
        h += '<button title="Dupliquer" onclick="plDuplicateCard(\'' + wk + '\',' + i + ',\'' + gSafe + '\',' + ei + ')" style="background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text3);font-size:11px;padding:1px 5px;line-height:1.4">⧉</button>';
        h += '<button title="Modifier le créneau" onclick="plEditSlot(\'' + wk + '\',' + i + ',\'' + gSafe + '\',' + ei + ')" style="background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text3);font-size:11px;padding:1px 5px;line-height:1.4">✏️</button>';
        h += '<button title="Supprimer" onclick="plDeleteEntry(\'' + wk + '\',' + i + ',\'' + gSafe + '\',' + ei + ')" style="background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text3);font-size:12px;padding:1px 5px;line-height:1.4">×</button>';
        h += '</div></div>';
        // Badge créneau
        h += '<span style="background:' + sc + ';color:#fff;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:600;white-space:nowrap">' + entry.slot + '</span>';
        h += '</div>';
      });

      // Add button
      h += '<button onclick="plOpenAdd(\'' + wk + '\',' + i + ',\'' + gSafe + '\')" style="width:100%;padding:5px;border:1px dashed var(--border2,#ccc);border-radius:6px;background:none;cursor:pointer;color:var(--text3);font-size:11px">+ Ajouter</button>';
      h += '</td>';
    });
    h += '</tr>';
  });

  h += '</tbody></table></div>';
  h += '</div>'; // fin pl-capture-zone
  h += '</div>'; // fin wrapper principal
  return h;
}

function plNav(offset) { _plWeek = plWeekOffset(_plWeek, offset); rPlanning(); }
function plGoToday()   { _plWeek = plISOWeek(new Date()); rPlanning(); }

// ── Capture → modale image ────────────────────────────────
function plCapture() {
  var zone = document.getElementById('pl-capture-zone');
  var btn  = document.getElementById('pl-capture-btn');
  if (!zone) return;
  if (!window.html2canvas) {
    if (btn) { btn.textContent = '❌ Librairie manquante'; setTimeout(function(){ btn.textContent = '📸 Copier'; }, 2000); }
    return;
  }

  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  // Masque les boutons/icônes d'action pendant la capture
  var actionBtns = zone.querySelectorAll('button');
  var grabIcons  = [];
  zone.querySelectorAll('[draggable]').forEach(function(el) {
    var span = el.querySelector('span');
    if (span && span.textContent.startsWith('☰')) {
      span.dataset._orig = span.textContent;
      span.textContent   = span.textContent.replace('☰ ', '');
      grabIcons.push(span);
    }
  });
  actionBtns.forEach(function(b) { b.style.visibility = 'hidden'; });

  html2canvas(zone, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  }).then(function(canvas) {
    // Restaure
    actionBtns.forEach(function(b) { b.style.visibility = ''; });
    grabIcons.forEach(function(s) { if (s.dataset._orig) s.textContent = s.dataset._orig; });
    if (btn) { btn.textContent = '📸 Copier'; btn.disabled = false; }

    var dataUrl = canvas.toDataURL('image/png');

    // Tente clipboard API (fonctionne en HTTPS / navigateurs modernes)
    canvas.toBlob(function(blob) {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([new ClipboardItem({'image/png': blob})])
          .then(function() { plShowCaptureModal(dataUrl, true); })
          .catch(function()  { plShowCaptureModal(dataUrl, false); });
      } else {
        plShowCaptureModal(dataUrl, false);
      }
    }, 'image/png');

  }).catch(function(err) {
    actionBtns.forEach(function(b) { b.style.visibility = ''; });
    grabIcons.forEach(function(s) { if (s.dataset._orig) s.textContent = s.dataset._orig; });
    if (btn) { btn.textContent = '📸 Copier'; btn.disabled = false; }
    console.error('html2canvas error', err);
  });
}

function plShowCaptureModal(dataUrl, copied) {
  var ex = document.getElementById('pl-img-modal'); if (ex) ex.remove();
  var modal = document.createElement('div');
  modal.id = 'pl-img-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box';

  var notice = copied
    ? '<div style="margin-bottom:10px;padding:8px 18px;background:#e8f5e9;color:#2e7d32;border-radius:8px;font-size:13px;font-weight:600">✓ Image copiée — colle directement dans ta messagerie (Ctrl+V / Cmd+V)</div>'
    : '<div style="margin-bottom:10px;padding:8px 18px;background:#fff8e1;color:#f57c00;border-radius:8px;font-size:13px;font-weight:600">Clic droit sur l\'image → "Copier l\'image" puis colle dans ta messagerie</div>';

  var h = '<div style="display:flex;flex-direction:column;align-items:center;gap:0;max-width:100%;max-height:100%">';
  h += notice;
  h += '<div style="position:relative;width:100%">';
  h += '<img src="' + dataUrl + '" style="max-width:90vw;max-height:75vh;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.4);display:block;margin:0 auto">';
  h += '</div>';
  h += '<div style="display:flex;gap:10px;margin-top:12px">';
  h += '<button onclick="plDownloadCapture(\'' + dataUrl + '\')" style="padding:8px 18px;border:none;border-radius:8px;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:13px">⬇ Télécharger</button>';
  h += '<button onclick="document.getElementById(\'pl-img-modal\').remove()" style="padding:8px 18px;border:none;border-radius:8px;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:13px">✕ Fermer</button>';
  h += '</div></div>';

  modal.innerHTML = h;
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

function plDownloadCapture(dataUrl) {
  var a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'planning_' + _plWeek + '.png';
  a.click();
}

// ── Add entry modal ───────────────────────────────────────
function plOpenAdd(weekStr, dayIdx, group) {
  var data = plGet();
  var ex = document.getElementById('pl-modal'); if (ex) ex.remove();
  var DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

  var modal = document.createElement('div');
  modal.id = 'pl-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';

  var h = '<div style="background:var(--bg,#fff);border-radius:12px;width:420px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2);overflow:hidden">';

  // Header
  h += '<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">';
  h += '<span style="font-weight:700;font-size:14px">' + DAYS[dayIdx] + ' — <span style="color:var(--text2)">' + group + '</span></span>';
  h += '<button onclick="document.getElementById(\'pl-modal\').remove()" style="border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h += '</div>';

  h += '<div style="padding:16px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:16px">';

  // Employee picker
  h += '<div>';
  h += '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Employé</div>';
  h += '<div id="pl-emp-list" style="display:flex;flex-wrap:wrap;gap:6px">';
  data.employees.forEach(function(emp) {
    h += '<button class="pl-emp-btn" data-emp="' + emp + '" onclick="plSelectEmp(this)" ';
    h += 'style="padding:6px 14px;border:1px solid var(--border);border-radius:20px;background:var(--bg2);cursor:pointer;font-size:12px;color:var(--text);transition:.1s">' + emp + '</button>';
  });
  h += '</div></div>';

  // Slot picker
  h += '<div>';
  h += '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Créneau</div>';
  h += '<div id="pl-slot-list" style="display:flex;flex-wrap:wrap;gap:6px">';
  data.slots.forEach(function(slot) {
    h += '<button class="pl-slot-btn" data-slot="' + slot.label + '" onclick="plSelectSlot(this)" ';
    h += 'style="padding:6px 14px;border:2px solid ' + slot.color + ';border-radius:20px;background:transparent;cursor:pointer;font-size:12px;color:' + slot.color + ';font-weight:600;transition:.1s">' + slot.label + '</button>';
  });
  h += '</div></div>';

  h += '</div>';
  h += '<div style="padding:12px 16px;border-top:1px solid var(--border);flex-shrink:0">';
  h += '<button onclick="plConfirmAdd(\'' + weekStr + '\',' + dayIdx + ',\'' + group.replace(/'/g,"\\'") + '\')" style="width:100%;padding:10px;background:var(--accent,#1976d2);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Ajouter</button>';
  h += '</div></div>';

  modal.innerHTML = h;
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  window._plSelEmp  = null;
  window._plSelSlot = null;
}

function plSelectEmp(btn) {
  document.querySelectorAll('.pl-emp-btn').forEach(function(b) {
    b.style.background   = 'var(--bg2)';
    b.style.borderColor  = 'var(--border)';
    b.style.color        = 'var(--text)';
    b.style.fontWeight   = '400';
  });
  btn.style.background   = 'var(--accent,#1976d2)';
  btn.style.borderColor  = 'var(--accent,#1976d2)';
  btn.style.color        = '#fff';
  btn.style.fontWeight   = '600';
  window._plSelEmp = btn.dataset.emp;
}

function plSelectSlot(btn) {
  var data  = plGet();
  document.querySelectorAll('.pl-slot-btn').forEach(function(b) {
    var s = data.slots.find(function(x) { return x.label === b.dataset.slot; });
    var c = s ? s.color : '#888';
    b.style.background  = 'transparent';
    b.style.borderColor = c;
    b.style.color       = c;
  });
  var slot  = data.slots.find(function(s) { return s.label === btn.dataset.slot; });
  var color = slot ? slot.color : '#888';
  btn.style.background  = color;
  btn.style.borderColor = color;
  btn.style.color       = '#fff';
  window._plSelSlot = btn.dataset.slot;
}

function plConfirmAdd(weekStr, dayIdx, group) {
  if (!window._plSelEmp || !window._plSelSlot) {
    if (!window._plSelEmp)  { var el = document.getElementById('pl-emp-list');  if(el){el.style.outline='2px solid var(--r,#d32f2f)';setTimeout(function(){el.style.outline='';},1200);} }
    if (!window._plSelSlot) { var el2 = document.getElementById('pl-slot-list'); if(el2){el2.style.outline='2px solid var(--r,#d32f2f)';setTimeout(function(){el2.style.outline='';},1200);} }
    return;
  }
  var data = plGet();
  if (!data.weeks[weekStr]) data.weeks[weekStr] = {};
  var key = plCellKey(dayIdx, group);
  if (!data.weeks[weekStr][key]) data.weeks[weekStr][key] = [];
  data.weeks[weekStr][key].push({ emp: window._plSelEmp, slot: window._plSelSlot });
  plSave(data);
  var m = document.getElementById('pl-modal'); if (m) m.remove();
  rPlanning();
}

function plDeleteEntry(weekStr, dayIdx, group, ei) {
  var data = plGet();
  var key  = plCellKey(dayIdx, group);
  if (data.weeks[weekStr] && data.weeks[weekStr][key]) {
    data.weeks[weekStr][key].splice(ei, 1);
    plSave(data);
    rPlanning();
  }
}

// ── Drag & Drop ───────────────────────────────────────────
var _plDrag = null;

function plDragStart(e, weekStr, dayIdx, group, ei) {
  _plDrag = { weekStr: weekStr, dayIdx: dayIdx, group: group, ei: ei };
  e.dataTransfer.effectAllowed = 'move';
  // Légère transparence sur la carte en cours de déplacement
  var card = e.currentTarget;
  setTimeout(function() { if (card) card.style.opacity = '0.4'; }, 0);
}

function plDragEnd(e) {
  if (e.currentTarget) e.currentTarget.style.opacity = '';
  // Retire tous les highlights de cellule
  document.querySelectorAll('td[id^="plcell_"]').forEach(function(td) {
    td.style.outline = '';
    td.style.background = '';
  });
  _plDrag = null;
}

function plDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.style.outline = '2px solid var(--accent,#1976d2)';
  e.currentTarget.style.background = 'color-mix(in srgb,var(--accent,#1976d2) 10%,var(--bg))';
}

function plDragLeave(e) {
  e.currentTarget.style.outline = '';
  e.currentTarget.style.background = '';
}

function plDrop(e, weekStr, dayIdx, group) {
  e.preventDefault();
  e.currentTarget.style.outline   = '';
  e.currentTarget.style.background = '';
  if (!_plDrag) return;

  var src = _plDrag;
  // Même cellule → rien
  if (src.weekStr === weekStr && src.dayIdx === dayIdx && src.group === group) {
    _plDrag = null; return;
  }

  var data   = plGet();
  var srcKey = plCellKey(src.dayIdx, src.group);
  var dstKey = plCellKey(dayIdx, group);

  if (!data.weeks[src.weekStr]) { _plDrag = null; return; }
  var srcArr = data.weeks[src.weekStr][srcKey];
  if (!srcArr || !srcArr[src.ei]) { _plDrag = null; return; }

  // Extrait la carte de la source
  var entry = srcArr.splice(src.ei, 1)[0];

  // Insère dans la destination
  if (!data.weeks[weekStr]) data.weeks[weekStr] = {};
  if (!data.weeks[weekStr][dstKey]) data.weeks[weekStr][dstKey] = [];
  data.weeks[weekStr][dstKey].push(entry);

  plSave(data);
  _plDrag = null;
  rPlanning();
}

// Duplique la carte (même employé, même créneau) dans la même cellule
function plDuplicateCard(weekStr, dayIdx, group, ei) {
  var data  = plGet();
  var key   = plCellKey(dayIdx, group);
  if (!data.weeks[weekStr] || !data.weeks[weekStr][key]) return;
  var entry = data.weeks[weekStr][key][ei];
  if (!entry) return;
  data.weeks[weekStr][key].splice(ei + 1, 0, { emp: entry.emp, slot: entry.slot });
  plSave(data);
  rPlanning();
}

// Ouvre une modale pour modifier uniquement le créneau d'une carte existante
function plEditSlot(weekStr, dayIdx, group, ei) {
  var data  = plGet();
  var key   = plCellKey(dayIdx, group);
  if (!data.weeks[weekStr] || !data.weeks[weekStr][key]) return;
  var entry = data.weeks[weekStr][key][ei];
  if (!entry) return;

  var ex = document.getElementById('pl-edit-modal'); if (ex) ex.remove();
  var DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

  var modal = document.createElement('div');
  modal.id = 'pl-edit-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';

  var h = '<div style="background:var(--bg,#fff);border-radius:12px;width:380px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.2);overflow:hidden">';
  h += '<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">';
  h += '<div>';
  h += '<div style="font-weight:700;font-size:14px">✏️ Modifier le créneau</div>';
  h += '<div style="font-size:12px;color:var(--text2);margin-top:2px">' + entry.emp + ' — ' + DAYS[dayIdx] + ' · ' + group + '</div>';
  h += '</div>';
  h += '<button onclick="document.getElementById(\'pl-edit-modal\').remove()" style="border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h += '</div>';

  h += '<div style="padding:16px">';
  h += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin-bottom:10px">Choisir un créneau</div>';
  h += '<div id="pl-edit-slot-list" style="display:flex;flex-wrap:wrap;gap:7px">';
  data.slots.forEach(function(slot) {
    var isCurrent = slot.label === entry.slot;
    h += '<button class="pl-edit-slot-btn" data-slot="' + slot.label + '" onclick="plEditSelectSlot(this)" ';
    h += 'style="padding:7px 14px;border:2px solid ' + slot.color + ';border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;';
    h += isCurrent ? 'background:' + slot.color + ';color:#fff"' : 'background:transparent;color:' + slot.color + '"';
    h += '>' + slot.label + '</button>';
  });
  h += '</div></div>';

  h += '<div style="padding:12px 16px;border-top:1px solid var(--border)">';
  h += '<button onclick="plConfirmEditSlot(\'' + weekStr + '\',' + dayIdx + ',\'' + group.replace(/'/g,"\\'") + '\',' + ei + ')" style="width:100%;padding:10px;background:var(--accent,#1976d2);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Enregistrer</button>';
  h += '</div></div>';

  modal.innerHTML = h;
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  window._plEditSelSlot = entry.slot; // pré-sélectionné = créneau actuel
}

function plEditSelectSlot(btn) {
  var data = plGet();
  document.querySelectorAll('.pl-edit-slot-btn').forEach(function(b) {
    var s = data.slots.find(function(x) { return x.label === b.dataset.slot; });
    var c = s ? s.color : '#888';
    b.style.background = 'transparent';
    b.style.borderColor = c;
    b.style.color = c;
  });
  var slot  = data.slots.find(function(s) { return s.label === btn.dataset.slot; });
  var color = slot ? slot.color : '#888';
  btn.style.background  = color;
  btn.style.borderColor = color;
  btn.style.color       = '#fff';
  window._plEditSelSlot = btn.dataset.slot;
}

function plConfirmEditSlot(weekStr, dayIdx, group, ei) {
  if (!window._plEditSelSlot) return;
  var data = plGet();
  var key  = plCellKey(dayIdx, group);
  if (data.weeks[weekStr] && data.weeks[weekStr][key] && data.weeks[weekStr][key][ei]) {
    data.weeks[weekStr][key][ei].slot = window._plEditSelSlot;
    plSave(data);
  }
  var m = document.getElementById('pl-edit-modal'); if (m) m.remove();
  rPlanning();
}

// ── Config modal ──────────────────────────────────────────
var _plCfgTab = 'employees';

function plOpenConfig() {
  var ex = document.getElementById('pl-cfg'); if (ex) ex.remove();
  _plCfgTab = 'employees';
  var modal = document.createElement('div');
  modal.id   = 'pl-cfg';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = _plCfgHTML();
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

function _plCfgHTML() {
  var data = plGet();
  var tabs = [{id:'employees',label:'Employés'},{id:'groups',label:'Groupes'},{id:'slots',label:'Créneaux'}];
  var h = '<div style="background:var(--bg,#fff);border-radius:12px;width:500px;max-width:95vw;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2)">';

  h += '<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">';
  h += '<span style="font-weight:700;font-size:14px">⚙ Configuration</span>';
  h += '<button onclick="document.getElementById(\'pl-cfg\').remove()" style="border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h += '</div>';

  h += '<div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">';
  tabs.forEach(function(t) {
    var on = _plCfgTab === t.id;
    h += '<button onclick="plCfgTab(\'' + t.id + '\')" style="padding:10px 18px;border:none;border-bottom:2px solid ' + (on?'var(--accent,#1976d2)':'transparent') + ';background:none;cursor:pointer;font-size:13px;color:' + (on?'var(--accent,#1976d2)':'var(--text2)') + ';font-weight:' + (on?'600':'400') + '">' + t.label + '</button>';
  });
  h += '</div>';

  h += '<div id="pl-cfg-body" style="padding:16px;overflow-y:auto;flex:1">' + _plCfgBody(data) + '</div>';
  h += '</div>';
  return h;
}

function _plCfgBody(data) {
  var h = '';
  if (_plCfgTab === 'employees') {
    h += '<div style="display:flex;gap:8px;margin-bottom:12px">';
    h += '<input id="pl-n-emp" type="text" placeholder="Nom de l\'employé…" style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:7px;font-size:12px;background:var(--surface);color:var(--text);outline:none" onkeydown="if(event.key===\'Enter\')plAddEmp()">';
    h += '<button onclick="plAddEmp()" style="padding:7px 14px;background:var(--accent,#1976d2);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600">+ Ajouter</button>';
    h += '</div>';
    data.employees.forEach(function(emp, i) {
      h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">';
      h += '<span style="font-size:13px">' + emp + '</span>';
      h += '<button onclick="plDelEmp(' + i + ')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 10px;cursor:pointer;font-size:11px;color:var(--r,#d32f2f)">Supprimer</button>';
      h += '</div>';
    });
  } else if (_plCfgTab === 'groups') {
    h += '<div style="display:flex;gap:8px;margin-bottom:12px">';
    h += '<input id="pl-n-grp" type="text" placeholder="Nom du groupe…" style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:7px;font-size:12px;background:var(--surface);color:var(--text);outline:none" onkeydown="if(event.key===\'Enter\')plAddGrp()">';
    h += '<button onclick="plAddGrp()" style="padding:7px 14px;background:var(--accent,#1976d2);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600">+ Ajouter</button>';
    h += '</div>';
    data.groups.forEach(function(grp, i) {
      h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">';
      h += '<span style="font-size:13px">' + grp + '</span>';
      h += '<button onclick="plDelGrp(' + i + ')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 10px;cursor:pointer;font-size:11px;color:var(--r,#d32f2f)">Supprimer</button>';
      h += '</div>';
    });
  } else if (_plCfgTab === 'slots') {
    h += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">';
    h += '<input id="pl-n-slot" type="text" placeholder="ex: 9h - 17h" style="flex:1;min-width:120px;padding:7px 10px;border:1px solid var(--border);border-radius:7px;font-size:12px;background:var(--surface);color:var(--text);outline:none" onkeydown="if(event.key===\'Enter\')plAddSlot()">';
    h += '<input id="pl-n-slot-c" type="color" value="#2563a8" style="width:40px;height:36px;border:1px solid var(--border);border-radius:7px;padding:2px;cursor:pointer">';
    h += '<button onclick="plAddSlot()" style="padding:7px 14px;background:var(--accent,#1976d2);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600">+ Ajouter</button>';
    h += '</div>';
    data.slots.forEach(function(slot, i) {
      h += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">';
      h += '<span style="background:' + slot.color + ';color:#fff;border-radius:5px;padding:3px 10px;font-size:11px;font-weight:600;white-space:nowrap">' + slot.label + '</span>';
      h += '<span style="flex:1"></span>';
      h += '<button onclick="plDelSlot(' + i + ')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 10px;cursor:pointer;font-size:11px;color:var(--r,#d32f2f)">Supprimer</button>';
      h += '</div>';
    });
  }
  return h;
}

function plCfgTab(tab) {
  _plCfgTab = tab;
  var modal = document.getElementById('pl-cfg');
  if (modal) {
    modal.innerHTML = _plCfgHTML();
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  }
}

function _plCfgRefresh() {
  var el = document.getElementById('pl-cfg-body');
  if (el) el.innerHTML = _plCfgBody(plGet());
}

function plAddEmp()  { var inp=document.getElementById('pl-n-emp');  var v=(inp||{}).value.trim(); if(!v)return; var d=plGet(); if(d.employees.indexOf(v)<0){d.employees.push(v);plSave(d);} inp.value=''; _plCfgRefresh(); }
function plDelEmp(i) { var d=plGet(); d.employees.splice(i,1); plSave(d); _plCfgRefresh(); }
function plAddGrp()  { var inp=document.getElementById('pl-n-grp');  var v=(inp||{}).value.trim(); if(!v)return; var d=plGet(); if(d.groups.indexOf(v)<0){d.groups.push(v);plSave(d);} inp.value=''; _plCfgRefresh(); }
function plDelGrp(i) { var d=plGet(); d.groups.splice(i,1); plSave(d); _plCfgRefresh(); }
function plAddSlot() {
  var inp=document.getElementById('pl-n-slot'); var col=document.getElementById('pl-n-slot-c');
  var label=(inp||{}).value.trim(); var color=(col||{}).value||'#888';
  if(!label)return; var d=plGet();
  if(!d.slots.find(function(s){return s.label===label;})){d.slots.push({label:label,color:color});plSave(d);}
  inp.value=''; _plCfgRefresh();
}
function plDelSlot(i) { var d=plGet(); d.slots.splice(i,1); plSave(d); _plCfgRefresh(); }

// ── Export CSV ────────────────────────────────────────────
function plExportCSV() {
  var data = plGet();
  var DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  var week = data.weeks[_plWeek] || {};
  var csv  = 'Jour,Groupe,Employé,Créneau\n';
  DAYS.forEach(function(day, i) {
    data.groups.forEach(function(group) {
      var entries = week[plCellKey(i, group)] || [];
      entries.forEach(function(e) {
        csv += [day, group, e.emp, e.slot].map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',') + '\n';
      });
    });
  });
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'planning_' + _plWeek + '.csv';
  a.click();
}

// ── Import CSV ────────────────────────────────────────────
function plImportCSV(input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var lines = e.target.result.split('\n').slice(1); // skip header
    var DAYS  = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
    var data  = plGet();
    if (!data.weeks[_plWeek]) data.weeks[_plWeek] = {};
    lines.forEach(function(line) {
      var cols = line.match(/("([^"]*)"|([^,]*))(,("([^"]*)"|([^,]*)))?/g);
      if (!cols || cols.length < 4) return;
      var clean = function(s) { return s.replace(/^"|"$/g,'').trim(); };
      var day   = clean(cols[0]);
      var group = clean(cols[1]);
      var emp   = clean(cols[2]);
      var slot  = clean(cols[3]);
      var dayIdx = DAYS.indexOf(day.toLowerCase());
      if (dayIdx < 0 || !group || !emp || !slot) return;
      var key = plCellKey(dayIdx, group);
      if (!data.weeks[_plWeek][key]) data.weeks[_plWeek][key] = [];
      data.weeks[_plWeek][key].push({ emp: emp, slot: slot });
    });
    plSave(data);
    rPlanning();
  };
  reader.readAsText(file);
  input.value = '';
}

// ── Dupliquer une semaine ─────────────────────────────────
var _plDupTarget = null;

function plOpenDuplicate() {
  var ex = document.getElementById('pl-dup'); if (ex) ex.remove();
  _plDupTarget = plWeekOffset(_plWeek, 1); // cible par défaut = semaine suivante

  var modal = document.createElement('div');
  modal.id = 'pl-dup';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = _plDupHTML();
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

function _plDupHTML() {
  var data     = plGet();
  var srcLabel = plWeekLabel(_plWeek);
  var dstLabel = plWeekLabel(_plDupTarget);
  var srcHasData = data.weeks[_plWeek] && Object.keys(data.weeks[_plWeek]).length > 0;
  var dstHasData = data.weeks[_plDupTarget] && Object.keys(data.weeks[_plDupTarget]).length > 0;

  var h = '<div style="background:var(--bg,#fff);border-radius:12px;width:460px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.2);overflow:hidden">';

  // Header
  h += '<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">';
  h += '<span style="font-weight:700;font-size:14px">⧉ Dupliquer une semaine</span>';
  h += '<button onclick="document.getElementById(\'pl-dup\').remove()" style="border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h += '</div>';

  h += '<div style="padding:20px 20px 8px 20px;display:flex;flex-direction:column;gap:18px">';

  // Source
  h += '<div>';
  h += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin-bottom:6px">Source — copier depuis</div>';
  h += '<div style="padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;font-size:13px;font-weight:600">';
  h += srcLabel;
  if (!srcHasData) h += ' <span style="font-size:11px;color:var(--o,#f57c00);font-weight:400">(semaine vide)</span>';
  h += '</div>';
  h += '</div>';

  // Destination
  h += '<div>';
  h += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin-bottom:6px">Destination — copier vers</div>';
  h += '<div style="display:flex;align-items:center;gap:8px">';
  h += '<button onclick="plDupNav(-1)" style="padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer;font-size:13px">←</button>';
  h += '<div id="pl-dup-dst" style="flex:1;padding:10px 14px;background:var(--bg2);border:1px solid var(--accent,#1976d2);border-radius:8px;font-size:13px;font-weight:600;text-align:center">' + dstLabel + '</div>';
  h += '<button onclick="plDupNav(1)"  style="padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);cursor:pointer;font-size:13px">→</button>';
  h += '</div>';
  if (dstHasData) {
    h += '<div id="pl-dup-warn" style="margin-top:6px;font-size:11px;color:var(--o,#f57c00)">⚠ Cette semaine a déjà des données — elles seront remplacées.</div>';
  } else {
    h += '<div id="pl-dup-warn" style="margin-top:6px;font-size:11px;color:var(--text3)">Semaine vide — prête à recevoir la copie.</div>';
  }
  h += '</div>';

  h += '</div>';

  // Confirm
  h += '<div style="padding:16px 20px;border-top:1px solid var(--border);margin-top:8px">';
  h += '<button onclick="plConfirmDuplicate()" style="width:100%;padding:10px;background:var(--accent,#1976d2);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Dupliquer →</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

function plDupNav(offset) {
  _plDupTarget = plWeekOffset(_plDupTarget, offset);
  var data     = plGet();
  var dstLabel = plWeekLabel(_plDupTarget);
  var dstHasData = data.weeks[_plDupTarget] && Object.keys(data.weeks[_plDupTarget]).length > 0;

  var dstEl   = document.getElementById('pl-dup-dst');
  var warnEl  = document.getElementById('pl-dup-warn');
  if (dstEl)  dstEl.textContent = dstLabel;
  if (warnEl) {
    if (dstHasData) {
      warnEl.textContent = '⚠ Cette semaine a déjà des données — elles seront remplacées.';
      warnEl.style.color = 'var(--o,#f57c00)';
    } else {
      warnEl.textContent = 'Semaine vide — prête à recevoir la copie.';
      warnEl.style.color = 'var(--text3)';
    }
  }
}

function plConfirmDuplicate() {
  if (!_plDupTarget || _plDupTarget === _plWeek) return;
  var data = plGet();
  var src  = data.weeks[_plWeek] || {};
  // Deep copy de la semaine source vers la cible
  data.weeks[_plDupTarget] = JSON.parse(JSON.stringify(src));
  plSave(data);
  var m = document.getElementById('pl-dup'); if (m) m.remove();
  // Naviguer vers la semaine dupliquée
  _plWeek = _plDupTarget;
  rPlanning();
  if (typeof showToast === 'function') showToast('Planning dupliqué → ' + plWeekLabel(_plWeek));
}
