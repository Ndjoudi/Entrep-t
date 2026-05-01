// ── Fiche produit module ────────────────────────────────
// Dépendances : S, P, ALERTS, computeAlerts, showToast

function rFiche(){
  var el=document.getElementById('fiche-page');if(!el)return;
  var q=(document.getElementById('fiche-q')||{}).value||'';
  var found=null;
  if(q.trim()){
    var qt=q.trim().toLowerCase();
    found=P.find(function(p){return String(p.id)===q.trim()||String(p.bc)===q.trim()||p.n.toLowerCase().indexOf(qt)>=0;});
  }
  var FAMS=['N','H','L','U','E','K','C','B','A','P','V','Z'];
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var h='<div style="padding:14px;max-width:680px">';
  h+='<div style="font-size:15px;font-weight:700;margin-bottom:12px">Fiche produit</div>';
  h+='<input id="fiche-q" placeholder="ID, code-barre ou nom..." value="'+q+'" style="width:100%;border:1px solid var(--border2);border-radius:var(--r6);padding:8px 12px;font-size:13px;margin-bottom:12px" oninput="rFiche()">';
  if(!q.trim()){
    h+='<div style="color:var(--text3);padding:20px 0">Saisir un ID, code-barre ou nom.</div>';
  }else if(!found){
    h+='<div style="color:var(--r);padding:20px 0">Aucun produit trouvé pour "'+q+'".</div>';
  }else{
    var al=ALERTS[found.id]||[];
    var pts=found.z.split('.');
    h+='<div style="background:#fff;border:1px solid var(--border);border-radius:var(--r10);padding:16px;box-shadow:var(--sh)">';
    h+='<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">';
    h+='<span class="fam f'+found.f+'" style="font-size:13px;padding:3px 9px">'+found.f+'</span>';
    h+='<div style="flex:1"><div style="font-size:15px;font-weight:700">'+found.n+'</div>';
    h+='<div style="font-size:11px;color:var(--text3);margin-top:2px">ID: <b>'+found.id+'</b> | EAN: <b>'+found.bc+'</b></div></div>';
    h+='<a href="https://products.app.deleev.com/products/'+found.id+'?tab=stock" target="_blank" class="btn sm">Voir</a>';
    h+='</div>';
    h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">';
    [{l:'Zonage',v:found.z,c:'var(--accent)'},{l:'QI',v:found.q,c:'var(--text)'},{l:'Stock',v:found.st,c:found.st>0?'var(--g)':'var(--text3)'}].forEach(function(it){
      h+='<div style="background:var(--bg2);border-radius:var(--r6);padding:8px 10px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">'+it.l+'</div><div style="font-size:13px;font-weight:700;color:'+it.c+'">'+it.v+'</div></div>';
    });
    h+='</div>';
    h+='<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;margin-bottom:7px">Famille</div>';
    h+='<div style="display:flex;gap:5px;flex-wrap:wrap">';
    FAMS.forEach(function(f){h+='<button class="btn sm fam f'+f+'"'+(found.f===f?' style="outline:2px solid var(--accent);outline-offset:2px"':'')+' onclick="ficheSetFam('+found.id+',\x27'+f+'\x27)">'+f+'</button>';});
    h+='</div></div>';
    h+='<div><div style="font-size:11px;font-weight:600;margin-bottom:7px">Rezonage</div>';
    h+='<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">';
    var rs='width:70px;border:1px solid var(--border2);border-radius:var(--r6);padding:6px;font-size:14px;font-weight:700;text-align:center';
    h+='<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Allée</label><input id="frz-a" type="number" value="'+pts[0]+'" style="'+rs+'"></div>';
    h+='<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Étagère</label><input id="frz-et" type="number" value="'+pts[1]+'" style="'+rs+'"></div>';
    h+='<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:2px">Étage</label><input id="frz-etg" type="number" value="'+pts[2]+'" style="'+rs+'"></div>';
    h+='<button class="btn pri" onclick="ficheRezone('+found.id+')">✓ Valider</button>';
    h+='</div></div>';
    if(al.length){
      h+='<div style="margin-top:12px"><div style="font-size:11px;font-weight:600;margin-bottom:7px">Alertes</div><div style="display:flex;gap:5px;flex-wrap:wrap">';
      al.forEach(function(a){h+='<span class="al a'+a.t+'" style="padding:4px 10px;font-size:11px">'+AT[a.t]+'</span>';});
      h+='</div></div>';
    }
    h+='</div>';
  }
  h+='</div>';
  el.innerHTML=h;
}
function ficheSetFam(id,f){
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  p.f=f;
  if(!FAM_OVERRIDE)window.FAM_OVERRIDE={};
  FAM_OVERRIDE[id]=f;S.set('fam_ov',FAM_OVERRIDE);
  computeAlerts();updateBadge();rFiche();
}
function ficheRezone(id){
  var a=+document.getElementById('frz-a').value,et=+document.getElementById('frz-et').value,etg=+document.getElementById('frz-etg').value;
  if(!a||!et||!etg){showToast('Remplir tous les champs');return;}
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var old=p.z;p.a=a;p.et=et;p.nv=Math.floor(etg/10);p.p=etg%10;p.z=a+'.'+et+'.'+etg;
  showToast('Rezoné: '+old+' → '+p.z);computeAlerts();updateBadge();rFiche();
}