// ── Dashboard module ────────────────────────────────────
// Dépendances : S, P, ALERTS, P_ABC, zone, showToast, shareView, loadModalBarcode

function showAllDProds(zoneName){
  computeAlerts();
  var zP=zoneName?P.filter(function(p){return zone(p.a)===zoneName;}):P.slice();
  var prods=zP.filter(function(p){return P_ABC[p.id]==='D';}).sort(function(a,b){return b.q-a.q;});
  window._dProdsG=prods;
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var ATC={M:'var(--b)',D:'var(--g)',S:'var(--r)',R:'var(--o)',A:'var(--accent)',P:'var(--pu)',F:'#6b3fa0'};

  function buildTable(list){
    if(!list.length)return '<div style="padding:20px;color:var(--text3);text-align:center">Aucun produit</div>';
    var rows='';
    list.forEach(function(p){
      var al=ALERTS[p.id]||[];
      var pts=p.z.split('.');
      var _eanCode=String(p.bc).replace(/\.0$/,'').trim();
      var abc=P_ABC[p.id]||'?';
      var abcC=abc==='A'?'var(--g)':abc==='B'?'var(--o)':abc==='D'?'#6b3fa0':'var(--r)';
      rows+='<tr style="border-bottom:1px solid var(--border)">';
      rows+='<td style="padding:4px 8px;text-align:center"><input type="checkbox" class="share-cb" data-id="'+p.id+'" style="width:16px;height:16px;cursor:pointer"></td>';
      rows+='<td style="padding:4px 8px"><button class="btn xs" onclick="copyProdName('+p.id+')" title="Copier le nom">📋</button></td>';
      rows+='<td style="padding:8px 12px;max-width:260px;font-size:12px"><a href="https://products.app.deleev.com/products/'+p.id+'?tab=stock" target="_blank" style="color:var(--text);text-decoration:none;font-weight:500" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text)\'">'+p.n+'</a></td>';
      rows+='<td style="padding:4px 8px;text-align:center"><button class="btn xs ean-check-btn" onclick="loadModalBarcode(\''+_eanCode+'\',this)" title="Afficher le code-barre">✓</button></td>';
      rows+='<td style="padding:8px 12px;color:var(--accent);font-weight:600;white-space:nowrap">'+p.z+'</td>';
      rows+='<td style="padding:8px 12px;font-weight:700">'+p.q+'</td>';
      rows+='<td style="padding:8px 12px;font-weight:600;color:'+(p.st>0?'var(--g)':'var(--r)')+'">'+p.st+'</td>';
      rows+='<td style="padding:8px 12px;font-weight:700;color:'+abcC+'">'+abc+'</td>';
      rows+='<td style="padding:8px 12px;font-weight:600;color:var(--text3)">'+(p.c||'—')+'</td>';
      rows+='<td style="padding:4px 8px"><span class="fam f'+p.f+'" id="fam-badge-'+p.id+'" style="font-size:10px;padding:1px 5px">'+p.f+'</span>'+
        '<select onchange="setFamInModal('+p.id+',this.value)" style="border:1px solid var(--border);border-radius:4px;padding:1px 3px;font-size:10px;margin-left:3px"><option value="N">N</option><option value="H">H</option><option value="L">L</option><option value="U">U</option><option value="E">E</option><option value="K">K</option><option value="C">C</option><option value="B">B</option><option value="A">A</option><option value="P">P</option><option value="V">V</option><option value="Z">Z</option></select></td>';
      rows+='<td style="padding:8px 12px">'+al.map(function(a){return'<span class="al a'+a.t+'" style="font-size:10px">'+AT[a.t]+'</span>';}).join(' ')+'</td>';
      rows+='<td style="padding:8px 12px;white-space:nowrap"><div style="display:flex;gap:3px;align-items:center">';
      rows+='<input type="number" value="'+pts[0]+'" id="dz-a-'+p.id+'" style="width:44px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
      rows+='<span>.</span><input type="number" value="'+pts[1]+'" id="dz-et-'+p.id+'" style="width:38px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
      rows+='<span>.</span><input type="number" value="'+pts[2]+'" id="dz-etg-'+p.id+'" style="width:38px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
      rows+='<button class="btn xs" onclick="dashRezone('+p.id+')">✓</button>';
      _copyMap[p.id]=p.n;
      rows+='</td></tr>';
    });
    return '<table style="border-collapse:collapse;width:100%;font-size:11px">'+
      '<thead><tr style="background:var(--bg2);position:sticky;top:0">'+
      ['☐','','Nom','✓','Zonage','QI','Stock','ABC','Colis','Famille','Alertes','Rezonage'].map(function(c){
        return'<th style="padding:9px 12px;text-align:left;border-bottom:1px solid var(--border2);white-space:nowrap">'+c+'</th>';
      }).join('')+
      '</tr></thead><tbody>'+rows+'</tbody></table>';
  }

  var fond=prods.filter(function(p){return(ALERTS[p.id]||[]).some(function(a){return a.t==='F';});}).length;
  var ok=prods.length-fond;
  var title=zoneName||'Toutes zones';

  var modal=document.createElement('div');modal.id='all-d-modal';
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto';
  var h='<div style="background:#fff;border-radius:12px;width:1080px;max-width:98vw;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2)">';
  h+='<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap">';
  h+='<span style="font-weight:800;font-size:15px;color:#6b3fa0;background:var(--bg2);padding:3px 10px;border-radius:6px">D</span>';
  h+='<span style="font-size:14px;font-weight:700">'+title+' — Produits faible rotation</span>';
  h+='<span style="font-size:12px;color:var(--text3)">'+prods.length+' produits</span>';
  h+='<div id="modal-barcode-zone" style="display:flex;flex-direction:column;align-items:center;min-width:180px;padding:4px 10px;background:var(--bg2);border-radius:var(--r6);border:1px solid var(--border)">';
  h+='<span style="font-size:9px;color:var(--text3);margin-bottom:2px">Code-barre</span>';
  h+='<div id="modal-barcode-img" style="min-height:40px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:var(--text3)">— cliquer sur ✓ —</span></div></div>';
  h+='<div style="display:flex;gap:4px;margin-left:4px">';
  h+='<button id="adf-all" onclick="adfilt(\'all\')" style="padding:2px 10px;border:1px solid #d8b4fe;border-radius:20px;background:#f3e8ff;color:#6b3fa0;cursor:pointer;font-size:11px;font-weight:600">Tous '+prods.length+'</button>';
  h+='<button id="adf-fond" onclick="adfilt(\'fond\')" style="padding:2px 10px;border:1px solid #d8b4fe;border-radius:20px;background:#fff;color:#6b3fa0;cursor:pointer;font-size:11px">⚠ FOND '+fond+'</button>';
  h+='<button id="adf-ok" onclick="adfilt(\'ok\')" style="padding:2px 10px;border:1px solid #d8b4fe;border-radius:20px;background:#fff;color:#6b3fa0;cursor:pointer;font-size:11px">✓ OK '+ok+'</button>';
  h+='</div>';
  h+='<button onclick="adExportCSV()" style="padding:2px 10px;border:1px solid var(--border2);border-radius:20px;background:#fff;color:var(--text2);cursor:pointer;font-size:11px">📥 CSV</button>';
  h+='<button onclick="adShareView()" style="padding:2px 10px;border:1px solid #93c5fd;border-radius:20px;background:#eff6ff;color:#1d4ed8;cursor:pointer;font-size:11px">🔗 Partager</button>';
  h+='<div id="ad-fam-filters" style="display:flex;gap:3px;flex-wrap:wrap;align-items:center">';
  h+='<span style="font-size:10px;color:var(--text3)">Famille:</span>';
  var _adFams=[...new Set(prods.map(function(p){return p.f;}))].sort();
  _adFams.forEach(function(f){
    h+='<span class="fam f'+f+'" style="cursor:pointer;font-size:10px;padding:1px 5px" onclick="adFamFilt(\''+f+'\')">' +f+'</span>';
  });
  h+='</div>';
  h+='<button onclick="document.getElementById(\'all-d-modal\').remove()" style="margin-left:auto;border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h+='</div>';
  h+='<div id="all-d-table" style="overflow-y:auto;flex:1">'+buildTable(prods)+'</div>';
  h+='</div>';
  modal.innerHTML=h;document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  _lastCheckedCb=null;initShiftClick(modal);

  var _adFamSel='';
  window.adFamFilt=function(f){
    _adFamSel=_adFamSel===f?'':f;
    document.querySelectorAll('#ad-fam-filters .fam').forEach(function(b){
      b.style.opacity=(!_adFamSel||b.textContent===_adFamSel)?'1':'0.3';
      b.style.fontWeight=b.textContent===_adFamSel?'800':'400';
    });
    var base=document.getElementById('adf-all').style.fontWeight==='600'?window._dProdsG:
      document.getElementById('adf-fond').style.fontWeight==='600'?
        window._dProdsG.filter(function(p){return(ALERTS[p.id]||[]).some(function(a){return a.t==='F';});}):
        window._dProdsG.filter(function(p){return!(ALERTS[p.id]||[]).some(function(a){return a.t==='F';});});
    var list=_adFamSel?base.filter(function(p){return p.f===_adFamSel;}):base;
    window._dCurrentList=list;
    document.getElementById('all-d-table').innerHTML=buildTable(list);
    _lastCheckedCb=null;initShiftClick(document.getElementById('all-d-modal'));
  };
  window.adfilt=function(f){
    var list=f==='fond'?window._dProdsG.filter(function(p){return(ALERTS[p.id]||[]).some(function(a){return a.t==='F';});}):
      f==='ok'?window._dProdsG.filter(function(p){return!(ALERTS[p.id]||[]).some(function(a){return a.t==='F';});}):window._dProdsG;
    document.getElementById('all-d-table').innerHTML=buildTable(list);
    window._dCurrentList=list;
    ['all','fond','ok'].forEach(function(x){
      var b=document.getElementById('adf-'+x);
      if(b){b.style.background=x===f?'#f3e8ff':'#fff';b.style.fontWeight=x===f?'600':'400';}
    });
  };
  window._dCurrentList=prods;
  window.adShareView=function(){
    var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
    var toShare=getCheckedProds(window._dCurrentList);
    var rows=toShare.map(function(p){
      var al=ALERTS[p.id]||[];
      return {nom:p.n,ean:String(p.bc||'').replace(/\.0$/,'').trim(),zonage:p.z,qi:p.q,stock:p.st||0,colis:p.c||0,alertes:al.map(function(a){return AT[a.t];}).join(', ')};
    });
    shareView('D — '+title+' ('+toShare.length+' produits)',rows);
  };
  window.adExportCSV=function(){
    var csv='ID,Nom,Zone,Zonage,QI,Stock,Colis\n';
    window._dProdsG.forEach(function(p){csv+=p.id+',"'+p.n.replace(/"/g,'""')+'",'+zone(p.a)+','+p.z+','+p.q+','+(p.st||0)+','+(p.c||0)+'\n';});
    var blob=new Blob([csv],{type:'text/csv'});
    var a2=document.createElement('a');a2.href=URL.createObjectURL(blob);
    a2.download='produits_D_'+title+'.csv';a2.click();
  };
}
function adRezone(id){
  var a=+document.getElementById('adz-a-'+id).value,et=+document.getElementById('adz-et-'+id).value,etg=+document.getElementById('adz-etg-'+id).value;
  if(!a||!et||!etg){showToast('Remplir tous les champs');return;}
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var old=p.z;p.a=a;p.et=et;p.nv=Math.floor(etg/10);p.p=etg%10;p.z=a+'.'+et+'.'+etg;
  showToast('Rezoné: '+old+' → '+p.z);computeAlerts();updateBadge();
  document.getElementById('all-d-modal').remove();
}


var SHARE_URL='https://script.google.com/macros/s/AKfycbxHGm28NqbmQNlEoZ9wIg7yN1rPoUHBaseaA-i06JdAtMEX_F7YPxKYTkBchxMMjePhnQ/exec';

function shareView(titre,rows){
  // Compress: use short keys
  rows=rows.slice(0,20);
  var compact=rows.map(function(r){
    return [r.nom.slice(0,50),r.ean||'',r.zonage,r.qi,r.stock,r.colis,(r.alertes||'').slice(0,20)];
  });
  var data={t:titre,d:new Date().toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),r:compact};
  var b64=btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  var url=SHARE_URL+'?view=1&d='+b64;
  _showShareModal(url,titre);
}
function _fbShare(data,titre){
  var b64=btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  _showShareModal(SHARE_URL+'?view=1&d='+b64,titre);
}
function _showShareModal(url,titre){
  var ex=document.getElementById('share-modal');if(ex)ex.remove();
  var modal=document.createElement('div');
  modal.id='share-modal';
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center';
  var inner=document.createElement('div');
  inner.style.cssText='background:#fff;border-radius:16px;padding:24px;text-align:center;max-width:340px;width:90%';
  var qrSrc='https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl='+encodeURIComponent(url)+'&choe=UTF-8';
  var img=document.createElement('img');
  img.src=qrSrc;img.style.cssText='width:220px;height:220px;border-radius:8px;display:block;margin:0 auto 14px;border:1px solid #eee';
  img.onerror=function(){this.style.display='none';};
  inner.innerHTML='<div style="font-weight:700;color:#1e3a5f;margin-bottom:4px;font-size:14px">'+titre+'</div>'
    +'<div style="font-size:11px;color:#888;margin-bottom:14px">Scanner ou partager</div>';
  inner.appendChild(img);
  var rest=document.createElement('div');
  rest.innerHTML='<div id="s-url-box" style="font-size:11px;color:#1e3a5f;background:#f0f4ff;border-radius:6px;padding:8px;margin-bottom:14px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+url+'</div>'
    +'<div style="display:flex;gap:8px;justify-content:center">'
    +'<button id="s-copy" style="padding:8px 16px;background:#1e3a5f;color:#fff;border:none;border-radius:6px;cursor:pointer">Copier</button>'
    +'<button id="s-open" style="padding:8px 16px;background:#f0f4ff;color:#1e3a5f;border:1px solid #1e3a5f;border-radius:6px;cursor:pointer">Ouvrir</button>'
    +'<button id="s-close" style="padding:8px 16px;background:#f5f5f5;color:#666;border:none;border-radius:6px;cursor:pointer">X</button>'
    +'</div>';
  inner.appendChild(rest);
  modal.appendChild(inner);document.body.appendChild(modal);
  var cp=function(){try{navigator.clipboard.writeText(url);}catch(e){}showToast('Lien copie !');};
  document.getElementById('s-copy').onclick=cp;
  document.getElementById('s-url-box').onclick=cp;
  document.getElementById('s-open').onclick=function(){window.open(url,'_blank');};
  document.getElementById('s-close').onclick=function(){modal.remove();};
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  cp();
}


var _lastCheckedCb=null;
function initShiftClick(container){
  var cbs=[].slice.call(container.querySelectorAll('.share-cb'));
  cbs.forEach(function(cb){
    cb.addEventListener('click',function(e){
      if(e.shiftKey&&_lastCheckedCb&&_lastCheckedCb!==cb){
        var all=[].slice.call(document.querySelectorAll('.share-cb'));
        var i1=all.indexOf(_lastCheckedCb);
        var i2=all.indexOf(cb);
        var start=Math.min(i1,i2);var end=Math.max(i1,i2);
        var newState=cb.checked;
        for(var i=start;i<=end;i++)all[i].checked=newState;
      }
      _lastCheckedCb=cb;
    });
  });
}
function getCheckedProds(allProds){
  var checked=document.querySelectorAll('.share-cb:checked');
  if(!checked.length)return allProds;
  var ids=[].map.call(checked,function(cb){return +cb.getAttribute('data-id');});
  return allProds.filter(function(p){return ids.indexOf(p.id)>=0;});
}

function updGlobalD(qi,colis){
  var zones=[...new Set(P.map(function(p){return zone(p.a);}))];
  zones.forEach(function(z){
    var cfg=getTVMV(z);
    if(qi!==null)cfg.dQI=qi;
    if(colis!==null)cfg.dColis=colis;
  });
  S.set('tvmv',TVMV);
  computeAlerts();updateBadge();rDash();
}

function updTVMV(z,k,v){getTVMV(z)[k]=v;stvmv();computeAlerts();updateBadge();refreshDashIfActive();}

function getIdealDist(prods){
  var brackets=[{l:"0",min:0,max:0},{l:"1",min:1,max:1},{l:"2-3",min:2,max:3},{l:"4-5",min:4,max:5},{l:"6-9",min:6,max:9},{l:"10+",min:10,max:99999}];
  var tot=prods.length||1;
  var fams=["N","H","L","U","E","K"];
  return brackets.map(function(b){
    var ps=prods.filter(function(p){var id=Math.max(1,Math.ceil(p.q/Math.max(p.c,1)));return id>=b.min&&id<=b.max;});
    var cnt=ps.length;
    var fb={};
    fams.forEach(function(f){var n=ps.filter(function(p){return p.f===f;}).length;if(n>0)fb[f]=n;});
    return{l:b.l,cnt:cnt,pct:Math.round(cnt/tot*100),fams:fb};
  }).filter(function(d){return d.cnt>0;});
}
var NALC=/\b(jus|nectar|sirop|boisson\s+v[\xe9e]g[\xe9e]tale|boisson\s+(soja|avoine|amande|riz)|oatly|alpro|eau\b|smoothie|kombucha)\b/i;
function computeAlerts(){
  ALERTS={};
  // Pre-calcul ABC par zone
  var _abc={};
  var _zones=[...new Set(P.map(function(p){return zone(p.a);}))];
  _zones.forEach(function(z){
    var cfg=getTVMV(z);
    var zP=P.filter(function(p){return zone(p.a)===z;});
    var rk=[...zP].filter(function(p){return p.q>1;}).sort(function(a,b){return b.q-a.q;});
    var tQI=rk.reduce(function(s,p){return s+p.q;},0),cum=0,nA=0,nB=0;
    rk.forEach(function(p){cum+=p.q;var pct=tQI?cum/tQI*100:0;if(pct<=cfg.abcA)nA++;else if(pct<=cfg.abcB)nB++;});
    rk.forEach(function(p,i){
      var cls=i<nA?'A':i<nA+nB?'B':'C';
      var _cfg=getTVMV(zone(p.a));
      if(cls==='C'&&p.q>0&&p.q<=(_cfg.dQI||6)&&(p.c||1)<=(_cfg.dColis||6))cls='D';
      _abc[p.id]=cls;
    });
    zP.filter(function(p){return p.q<=1;}).forEach(function(p){
      var _cfg2=getTVMV(z);
      _abc[p.id]=(p.c||1)<=(_cfg2.dColis||6)?'D':'C';
    });
  });
  P_ABC=_abc;

  P.forEach(p=>{
    if(p.f==='?')return;
    var als=[];

    // ── MONTER / DESCENDRE / SORTIR (étage × famille) ──────────────
    const fams=getNvFams(p.a,p.nv);
    const etageOk=fams.length>0&&fams.includes(p.f);
    if(!etageOk){
      const nvs=Object.keys(PARAMS[p.a]||{}).map(Number);
      const famNvs=nvs.filter(nv=>(PARAMS[p.a][nv]||[]).includes(p.f));
      if(famNvs.length===0){
        if(fams.length>0)
          als.push({t:'S',m:'Famille '+p.f+' — etage '+p.nv*10+'x attend: '+fams.join(',')});
      }else{
        const minFamNv=Math.min(...famNvs);
        // PLEIN : tous les étages cibles validés OK
        var _allAlleEts=[...new Set(P.filter(function(x){return x.a===p.a;}).map(function(x){return x.et;}))];
        const allTargetOk=_allAlleEts.length>0&&famNvs.every(function(nv){
          // Si aucun produit à ce niveau -> place disponible -> pas PLEIN
          var hasProds=P.some(function(x){return x.a===p.a&&x.nv===nv;});
          if(!hasProds)return false;
          // Toutes les étagères connues de l'allée doivent être OK à ce niveau
          return _allAlleEts.every(function(et){return VALID[p.a+'_'+et+'_'+nv];});
        });
        if(allTargetOk)
          als.push({t:'P',m:'Étages cibles pleins (nv '+minFamNv*10+'x)'});
        else if(p.nv>minFamNv)
          als.push({t:'M',m:'Famille '+p.f+' plus haut (nv '+minFamNv*10+'x)'});
        else
          als.push({t:'D',m:'Famille '+p.f+' plus bas (nv '+minFamNv*10+'x)'});
      }
    }

    // ── AVANCER / RECULER (étagère × ABC_POS) ──────────────────────
    var abc=_abc[p.id]||'C';
    var posAbcNv=(ABC_POS[p.a]&&ABC_POS[p.a][p.et]&&ABC_POS[p.a][p.et][p.nv])||'';
    var posAbcGen=(ABC_POS[p.a]&&ABC_POS[p.a][p.et]&&ABC_POS[p.a][p.et][0])||'';
    var posAbc=posAbcNv||posAbcGen;
    if(posAbc&&posAbc!==abc){
      // Ordre ABC : A=1, B=2, C=3
      var rank={A:1,B:2,C:3,D:4};
      var prodRank=rank[abc]||3;
      var posRank=rank[posAbc]||3;
      if(prodRank<posRank){
        // Produit "meilleur" que sa position → doit AVANCER vers une étagère de sa classe
        var betterEt=-1;
        Object.keys(ABC_POS[p.a]||{}).forEach(function(et){
          var etCfg=ABC_POS[p.a][et]||{};
          var etAbc=etCfg[p.nv]||etCfg[0]||'';
          if(etAbc===abc&&+et<p.et)betterEt=Math.max(betterEt,+et);
        });
        if(betterEt>=0)als.push({t:'A',m:'Produit '+abc+' en position '+posAbc+', devrait être ét.'+betterEt});
        else als.push({t:'A',m:'Produit '+abc+' en position '+posAbc+' (ét.'+p.et+')'});
      }else{
        // Produit "moins bon" que sa position → doit RECULER vers une étagère de sa classe
        var worseEt=-1;
        Object.keys(ABC_POS[p.a]||{}).forEach(function(et){
          var etCfg=ABC_POS[p.a][et]||{};
          var etAbc=etCfg[p.nv]||etCfg[0]||'';
          if(etAbc===abc&&+et>p.et)worseEt=Math.min(worseEt===-1?99999:worseEt,+et);
        });
        var alertType2=(abc==='D')?'F':'R';
        if(worseEt>=0)als.push({t:alertType2,m:'Produit '+abc+' en position '+posAbc+', devrait être ét.'+worseEt});
        else als.push({t:alertType2,m:'Produit '+abc+' en position '+posAbc+' (ét.'+p.et+')'});
      }
    }

    if(als.length)ALERTS[p.id]=als;
  });
}
function updateBadge(){const n=Object.keys(ALERTS).length;const el=document.getElementById('ab');el.textContent=n;el.style.display=n?'inline-block':'none';}


var _copyMap={};
function copyProdName(id){
  var name=_copyMap[id]||(P.find(function(p){return p.id===id;})||{}).n||'';
  try{
    var ta=document.createElement('textarea');
    ta.value=name;ta.style.cssText='position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(ta);ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copié : '+name.slice(0,40));
  }catch(e){showToast('Erreur copie');}
}

var _scrollPos={};
function T(tab){
  // Sauvegarde le scroll de l'onglet actuellement actif
  document.querySelectorAll('.page').forEach(function(p){
    if(p.classList.contains('active'))_scrollPos[p.id]=p.scrollTop;
  });

  const tabs=['kpi-dashboard','dash','plan','allee','fournisseurs','etiquettes','analyse','ventes','planning','kpi-sec','parametres'];
  document.querySelectorAll('.nb').forEach((b,i)=>b.classList.toggle('active',tabs[i]===tab));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(tab+'-page').classList.add('active');

  // Rendu (synchrone)
  if(tab==='plan')rPlan();else if(tab==='allee')rAllee();
  else if(tab==='dash')rDash();
  else if(tab==='fournisseurs')rFournisseurs();
  else if(tab==='etiquettes')rEtiquettes();
  else if(tab==='analyse')anInit();
  else if(tab==='kpi-dashboard')rKpiDashboard();
  else if(tab==='planning')rPlanning();
  else if(tab==='kpi-sec')rKpiSec();
  else if(tab==='parametres')rParametres();

  // Restaure le scroll après le rendu
  var saved=_scrollPos[tab+'-page'];
  if(saved){var el=document.getElementById(tab+'-page');if(el)el.scrollTop=saved;}
}
