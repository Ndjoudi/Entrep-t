// ── Paramètres ────────────────────────────────────────────
// Gère les 3 sous-onglets : Import CSV, Settings allées, Tokens API

var _paramTab = 'import';

function rParametres() {
  // Active le bon sous-onglet visuellement + rend le contenu
  _syncParamNav();
  _renderParamContent(_paramTab);
}

function rParamTab(tab) {
  _paramTab = tab;
  _syncParamNav();
  _renderParamContent(tab);
}

function _syncParamNav() {
  document.querySelectorAll('.param-tab-btn').forEach(function(b) {
    var on = b.dataset.tab === _paramTab;
    b.style.borderBottom   = on ? '2px solid var(--accent,#1976d2)' : '2px solid transparent';
    b.style.color          = on ? 'var(--accent,#1976d2)' : 'var(--text2)';
    b.style.fontWeight     = on ? '600' : '400';
  });
  document.querySelectorAll('.param-section').forEach(function(s) {
    s.style.display = s.dataset.section === _paramTab ? '' : 'none';
  });
}

function _renderParamContent(tab) {
  if (tab === 'import')   rImport();
  else if (tab === 'settings') rSettings();
  else if (tab === 'tokens')   rParamsTokens();
}

function rParamsTokens() {
  var el = document.getElementById('param-tokens');
  if (!el) return;
  var tokens = (typeof getApiTokens === 'function') ? getApiTokens() : {};
  var h = '<div style="padding:24px;max-width:560px">';
  h += '<div style="font-size:16px;font-weight:700;margin-bottom:20px">🔑 Tokens API</div>';
  h += '<div style="padding:16px;background:var(--bg2);border:1px solid var(--border);border-radius:10px">';
  h += '<div style="font-size:11px;color:var(--text3);font-family:\'Geist Mono\',monospace;margin-bottom:6px">';
  h += 'X-Api-Bypass-Token <span style="color:var(--text3)">(pour api.labellevie.com)</span></div>';
  h += '<div style="display:flex;gap:8px;align-items:center">';
  h += '<input id="fBypassToken" type="password" value="' + (typeof fEsc === 'function' ? fEsc(tokens.bypass||'') : (tokens.bypass||'')) + '" placeholder="Coller le token ici…" ';
  h += 'style="flex:1;font-family:\'Geist Mono\',monospace;font-size:11px;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:7px 10px;border-radius:7px;outline:none">';
  h += '<button onclick="fToggleTokenVis(\'fBypassToken\',this)" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface);cursor:pointer;font-size:12px">👁</button>';
  h += '<button onclick="fSaveTokens()" class="btn pri" style="font-size:12px;padding:6px 14px">Enregistrer</button>';
  h += '</div>';
  h += '<div id="fTokenStatus" style="font-size:11px;color:var(--text3);margin-top:6px;font-family:\'Geist Mono\',monospace">';
  h += tokens.bypass ? '✅ Token enregistré' : '⚠️ Token manquant — synchronisation QI/QD impossible';
  h += '</div></div></div>';
  el.innerHTML = h;
}
