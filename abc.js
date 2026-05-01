// ── ABC/Classification module ───────────────────────────
// Dépendances : S, P, ALERTS, P_ABC, zone, getTVMV, shareView

function showAbcList(zoneName,abcClass,fam){
  computeAlerts();
  var cc={A:'var(--g)',B:'var(--o)',C:'var(--r)',D:'#6b3fa0'};
  var prods=P.filter(function(p){return zone(p.a)===zoneName&&P_ABC[p.id]===abcClass&&p.f===fam;}).sort(function(a,b){return b.q-a.q;});
  buildUniversalModal({
    id:'abc-modal',
    badge:abcClass,badgeColor:cc[abcClass]||'var(--r)',
    title:fam+' — '+zoneName,
    prods:prods
  });
}
function abcRezone(id){
  var a=+document.getElementById('abcz-a-'+id).value,et=+document.getElementById('abcz-et-'+id).value,etg=+document.getElementById('abcz-etg-'+id).value;
  if(!a||!et||!etg){showToast('Remplir tous les champs');return;}
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var old=p.z;p.a=a;p.et=et;p.nv=Math.floor(etg/10);p.p=etg%10;p.z=a+'.'+et+'.'+etg;
  showToast('Rezoné: '+old+' → '+p.z);computeAlerts();updateBadge();
  document.getElementById('abc-modal').remove();
}


function showDProds(zoneName){
  var zP=P.filter(function(p){return zone(p.a)===zoneName;});
  var rk=[...zP].filter(function(p){return p.q>1;}).sort(function(a,b){return b.q-a.q;});
  var cfg=getTVMV(zoneName);
  var tQI=rk.reduce(function(s,p){return s+p.q;},0),cum=0,nA=0,nB=0;
  rk.forEach(function(p){cum+=p.q;var pct=tQI?cum/tQI*100:0;if(pct<=cfg.abcA)nA++;else if(pct<=cfg.abcB)nB++;});
  var dProds=zP.filter(function(p){
    var ri=rk.findIndex(function(r){return r.id===p.id;});
    var isParetoC=(ri>=nA+nB)||(p.q<=1);
    return isParetoC&&p.q<=6&&(p.c||1)<=6;
  }).sort(function(a,b){return b.q-a.q;});
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var modal=document.createElement('div');
  modal.id='d-modal';
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto';
  var h='<div style="background:#fff;border-radius:12px;width:880px;max-width:96vw;max-height:84vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2)">';
  h+='<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0">';
  h+='<span style="font-weight:800;font-size:15px;color:#6b3fa0;background:#f3e8ff;padding:3px 10px;border-radius:6px">D</span>';
  h+='<span style="font-size:14px;font-weight:700">'+zoneName+' — Faible rotation (QI≤6, colis≤6)</span>';
  h+='<span style="font-size:12px;color:var(--text3)">'+dProds.length+' produits</span>';
  h+='<button onclick="document.getElementById(\'d-modal\').remove()" style="margin-left:auto;border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h+='</div>';
  h+='<div style="overflow-y:auto;flex:1"><table style="border-collapse:collapse;width:100%;font-size:11px">';
  h+='<thead><tr style="background:var(--bg2);position:sticky;top:0">';
  ['Nom','EAN','Zonage','QI','Colis','Alertes','Rezonage',''].forEach(function(c){
    h+='<th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--border2);white-space:nowrap">'+c+'</th>';
  });
  h+='</tr></thead><tbody>';
  dProds.forEach(function(p){
    var al=ALERTS[p.id]||[];
    var pts=p.z.split('.');
    var bcUrl='https://bwipjs-api.metafloor.com/?bcid=ean13&text='+String(p.bc).replace(/\.0$/,'').trim()+'&scale=2&height=12&paddingwidth=10&paddingheight=5';
    h+='<tr style="border-bottom:1px solid var(--border)">';
    h+='<td style="padding:5px 8px;max-width:200px;font-size:11px"><a href="https://products.app.deleev.com/products/'+p.id+'?tab=stock" target="_blank" style="color:var(--text);text-decoration:none">'+p.n+'</a></td>';
    h+='<td style="padding:4px 8px"><img src="'+bcUrl+'" style="height:32px;display:block" title="'+p.bc+'" onerror="this.outerHTML=\'<span style=font-size:10px>\'+this.alt+\'</span>\'"></td>';
    h+='<td style="padding:5px 8px;color:var(--accent);font-weight:600;white-space:nowrap">'+p.z+'</td>';
    h+='<td style="padding:5px 8px;font-weight:700;color:#6b3fa0">'+p.q+'</td>';
    h+='<td style="padding:5px 8px;color:var(--text3)">'+p.c+'</td>';
    h+='<td style="padding:5px 8px">'+al.map(function(a){return'<span class="al a'+a.t+'" style="font-size:10px">'+AT[a.t]+'</span>';}).join(' ')+'</td>';
    h+='<td style="padding:4px 8px;white-space:nowrap"><div style="display:flex;gap:3px;align-items:center">';
    h+='<input type="number" value="'+pts[0]+'" id="drz-a-'+p.id+'" style="width:44px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
    h+='<span>.</span><input type="number" value="'+pts[1]+'" id="drz-et-'+p.id+'" style="width:38px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
    h+='<span>.</span><input type="number" value="'+pts[2]+'" id="drz-etg-'+p.id+'" style="width:38px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
    h+='<button class="btn xs" onclick="dRezone('+p.id+')">✓</button>';
    h+='</div></td>';
    h+='<td style="padding:5px 8px"><button class="btn xs" onclick="goAllee('+p.a+');document.getElementById(\'d-modal\').remove()">Voir allée</button></td>';
    h+='</tr>';
  });
  h+='</tbody></table></div></div>';
  modal.innerHTML=h;document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
}
function dRezone(id){
  var a=+document.getElementById('drz-a-'+id).value,et=+document.getElementById('drz-et-'+id).value,etg=+document.getElementById('drz-etg-'+id).value;
  if(!a||!et||!etg){showToast('Remplir tous les champs');return;}
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var old=p.z;p.a=a;p.et=et;p.nv=Math.floor(etg/10);p.p=etg%10;p.z=a+'.'+et+'.'+etg;
  showToast('Rezoné: '+old+' → '+p.z);computeAlerts();updateBadge();
  document.getElementById('d-modal').remove();
}



// → dashboard.js



