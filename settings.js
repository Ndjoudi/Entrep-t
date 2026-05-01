// ── Settings module ─────────────────────────────────────
// Dépendances : S, ALLEE_SETTINGS, showToast

function rSettings(){
  var el=document.getElementById('settings-page');if(!el)return;
  if(!P.length){el.innerHTML='<div style="padding:20px;color:var(--text3)">Importer un CSV d\'abord.</div>';return;}
  var allees=[...new Set(P.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
  var zones=['LGV','PF','Rota','Prio','Salée','Sucrée','Liquide','DPH','Frais sec','Autre'];
  var h='<div style="display:flex;flex-direction:column;height:100%">';
  h+='<div style="padding:10px 14px;border-bottom:1px solid var(--border);background:#fff;display:flex;align-items:center;gap:10px;flex-shrink:0">';
  h+='<span style="font-size:14px;font-weight:700">Settings allées</span>';
  h+='<button class="btn pri" onclick="saveAlleeSide()">💾 Sauvegarder</button>';
  h+='<span id="stg-saved" style="font-size:11px;color:var(--g);display:none">✓ Sauvegardé</span>';
  h+='</div><div style="flex:1;overflow:auto;padding:12px">';
  h+='<table style="border-collapse:collapse;min-width:max-content"><thead><tr>';
  ['Allée','Zone auto','Sous-zone','Sens étagères','Produits'].forEach(function(th){
    h+='<th style="background:var(--bg2);border:1px solid var(--border2);padding:6px 12px;font-size:11px;font-weight:600;color:var(--text2);position:sticky;top:0">'+th+'</th>';
  });
  h+='</tr></thead><tbody>';
  allees.forEach(function(a){
    var cfg=(ALLEE_SETTINGS||{})[a]||{};
    var autoZ=zone(a);var col=ZC[autoZ]||'#999';
    var nb=P.filter(function(p){return p.a===a;}).length;
    var isSide=!!((ALLEE_SIDE||{})[a]);
    h+='<tr><td style="border:1px solid var(--border);padding:5px 10px;font-weight:700;font-size:13px;color:'+col+';background:#fff;position:sticky;left:0">'+a+'</td>';
    h+='<td style="border:1px solid var(--border);padding:5px 10px;text-align:center"><span style="font-size:11px;background:'+col+'18;color:'+col+';padding:2px 8px;border-radius:5px">'+autoZ+'</span></td>';
    h+='<td style="border:1px solid var(--border);padding:4px 6px"><select onchange="updAlleeCfg('+a+',\'zone\',this.value)" style="border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:11px;width:100%"><option value="">— auto</option>';
    zones.forEach(function(z){h+='<option value="'+z+'"'+(cfg.zone===z?' selected':'')+'>'+z+'</option>';});
    h+='</select></td>';
    h+='<td style="border:1px solid var(--border);padding:5px 12px;text-align:center"><label style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;user-select:none"><input type="checkbox" '+(isSide?'checked':'')+' onchange="chgSide('+a+',this.checked)"><span>'+(isSide?'↔ Inversé':'Normal')+'</span></label></td>';
    h+='<td style="border:1px solid var(--border);padding:5px 12px;text-align:center;font-size:12px;color:var(--text3)">'+nb+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  el.innerHTML=h;
}
function updAlleeCfg(a,k,v){if(!ALLEE_SETTINGS)window.ALLEE_SETTINGS={};if(!ALLEE_SETTINGS[a])ALLEE_SETTINGS[a]={};ALLEE_SETTINGS[a][k]=v;}
function chgSide(a,v){
  if(!ALLEE_SIDE)window.ALLEE_SIDE={};
  if(v)ALLEE_SIDE[a]=true;else delete ALLEE_SIDE[a];
  var row=event.target.closest('tr');
  if(row){var sp=row.querySelector('label span');if(sp)sp.textContent=v?'↔ Inversé':'Normal';}
}
function saveAlleeSide(){
  S.set('allee_side',ALLEE_SIDE||{});S.set('allee_cfg',ALLEE_SETTINGS||{});
  computeAlerts();updateBadge();
  var m=document.getElementById('stg-saved');if(m){m.style.display='inline';setTimeout(function(){m.style.display='none';},2000);}
}


function parseFamCSV(input){
  var file=input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    var lines=e.target.result.split('\n');
    var count=0;
    var valid=['N','H','L','U','E','K','C','B','A','P','V','Z'];
    for(var i=1;i<lines.length;i++){
      var cols=lines[i].split(',');
      var id=+cols[0];
      var fam=(cols[1]||'').trim().replace(/^"|"$/g,'').toUpperCase();
      if(!id||valid.indexOf(fam)<0)continue;
      FAM_OVERRIDE[id]=fam;
      var p=P.find(function(x){return x.id===id;});
      if(p){p.f=fam;count++;}
    }
    S.set('fam_ov',FAM_OVERRIDE);
    computeAlerts();updateBadge();
    showToast(count+' familles importées');
    document.getElementById('fam-import-log').textContent='✅ '+count+' familles mises à jour';
  };
  reader.readAsText(file);
}

function exportFamCSV(){
  var keys=Object.keys(FAM_OVERRIDE);
  if(!keys.length){showToast('Aucune correction à exporter');return;}
  var csv='ID,Famille\n';
  keys.forEach(function(id){csv+=id+','+FAM_OVERRIDE[id]+'\n';});
  var blob=new Blob([csv],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='familles_corrections.csv';
  a.click();
}
