var AN_PAGE=1, AN_PER_PAGE=25;
// ── Analyse module ───────────────────────────────────────
// Dépendances : S, P, zone, showToast

var anStockF='all';
var anZoneF='all';
var anDupeF='all';
var anGrFilter='all';
var anGrSort={col:'score',dir:-1};
var anScSort={col:'ratio',dir:-1};
var anStSort={col:'surplus',dir:-1};
var anCurTab='stock';

function anInit(){
  anRenderAll();
  switchAnTab(anCurTab);
}

function anRenderAll(){
  anRenderStock();
  anRenderDoublons();
  anRenderSurCmd();
  anRenderGroupes();
  anUpdateBadges();
}

function anUpdateBadges(){
  var surCmd=P.filter(function(p){return p.q>0&&p.c>0&&p.q>2*p.c;}).length;
  var dc=anComputeDoublons();
  var groups=anComputeGroupes();
  var rupture=P.filter(function(p){return p.st===0&&p.q>0&&p.dsp==='order';}).length;

  document.getElementById('an-nb-stock').textContent=rupture||'';
  document.getElementById('an-nb-doublons').textContent=dc.totalGroups||'';
  document.getElementById('an-nb-surCmd').textContent=surCmd||'';
  document.getElementById('an-nb-groupes').textContent=groups.length||'';
  document.getElementById('an-nb-msg').textContent=AN_MSG.length;

  // update nav badge
  var total=rupture+dc.totalGroups+surCmd;
  var nb=document.getElementById('an-badge-nav');
  if(nb){nb.textContent=total>0?total:'';nb.style.display=total>0?'inline-block':'none';}
}

function switchAnTab(t){
  anCurTab=t;
  document.querySelectorAll('.antab').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.an-pane').forEach(function(p){p.classList.remove('active');});
  var idx=['stock','doublons','surCmd','groupes','msg'];
  var tabBtns=document.querySelectorAll('.antab');
  tabBtns[idx.indexOf(t)].classList.add('active');
  document.getElementById('an-tp-'+t).classList.add('active');
  if(t==='msg')anRenderMsgTab();
}

/* ── helpers ── */
function anFmtZone(z){if(!z||z==='—')return'—';var p=z.split('.');return p.length===3?p[0]+'.'+p[2]+'.'+p[1]:z;}
function anEscQ(s){return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}
function anSortArr(data,col,dir){
  return data.slice().sort(function(a,b){
    var va=a[col],vb=b[col];
    if(va==null)va=dir===1?Infinity:-Infinity;
    if(vb==null)vb=dir===1?Infinity:-Infinity;
    if(typeof va==='string')return dir*va.localeCompare(vb,'fr',{sensitivity:'base'});
    return dir*(va-vb);
  });
}
function anNorm(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function anExtractUnit(nom){
  var n=anNorm(nom);
  var m=n.match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)\b/);
  if(m)return{val:m[2].replace(',','.')+m[3],mult:parseInt(m[1])};
  m=n.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)\b/);
  if(m)return{val:m[1].replace(',','.')+m[2],mult:1};
  return{val:'',mult:1};
}
function anBaseName(nom){
  var n=anNorm(nom);
  n=n.replace(/\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|l)\b/g,'');
  n=n.replace(/lot de \d+/g,'');
  n=n.replace(/\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|l)\b/g,'');
  n=n.replace(/\(.*?\)/g,'');
  n=n.replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
  return n;
}

/* ── Ventes 90j helper ── */
function anGetVentes90(pid){
  if(typeof DV==='undefined'||!DV)return null;
  var allD=DV.dates.map(function(d){return d.date;}).sort();
  var d90=allD.slice(-90);
  var g=DV.groups.find(function(g){return g.soloId===String(pid);});
  var grp=false;
  if(!g){g=DV.groups.find(function(g){return g.pids&&g.pids.indexOf(String(pid))!==-1;});grp=true;}
  if(!g)return null;
  var u=0,ca=0,cp=0,rd=0;
  d90.forEach(function(d){
    u+=g.j.u[d]||0;ca+=g.j.ca[d]||0;cp+=g.j.cp[d]||0;
    if(!grp&&g.j.rup[d])rd++;
    else if(grp&&(g.j.rj[d]||0)>0)rd++;
  });
  return{u:Math.round(u),ca:Math.round(ca*100)/100,cp:Math.round(cp*100)/100,rupt:rd>0};
}
function anFmtEur(n){return n.toLocaleString('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:0})+' €';}

/* ── STOCK ── */
function anSetStockFilter(f,el){AN_PAGE=1;
  anStockF=f;
  document.querySelectorAll('#an-stock-filters .an-pill').forEach(function(p){p.className='an-pill';});
  el.classList.add('on');
  anRenderStock();
}

function anGetStockData(){
  var q=(document.getElementById('an-stock-search')||{}).value||'';
  q=q.toLowerCase();
  var data=P.map(function(p){
    var surplus=p.st-(p.q+2*p.c);
    var semaines=p.q>0?Math.round(p.st/p.q*10)/10:null;
    var fantome=p.q>0&&(p.dsp==='unavailable'||p.dsp==='abandoned');
    var surstock=!fantome&&p.q>0&&surplus>0;
    var mort=p.st>0&&p.q===0;
    var rupture=p.st===0&&p.q>0&&p.dsp==='order';
    var vd=anGetVentes90(p.id);
    return Object.assign({},p,{surplus:surplus,semaines:semaines,fantome:fantome,surstock:surstock,mort:mort,rupture:rupture,
      vu:vd?vd.u:null,vca:vd?vd.ca:null,vcp:vd?vd.cp:null,vrupt:vd?vd.rupt:false});
  });
  if(anStockF==='fantome')data=data.filter(function(p){return p.fantome;});
  else if(anStockF==='surstock')data=data.filter(function(p){return p.surstock;});
  else if(anStockF==='mort')data=data.filter(function(p){return p.mort;});
  else if(anStockF==='rupture')data=data.filter(function(p){return p.rupture;});
  if(anZoneF!=='all')data=data.filter(function(p){return zone(p.a)===anZoneF;});
  if(q)data=data.filter(function(p){return p.n.toLowerCase().includes(q);});
  return data;
}

function anRenderStock(){
  var data=anGetStockData();
  var titles={all:'Tous les produits',fantome:'Commandes fantômes',surstock:'Produits en surplus',mort:'Stock mort',rupture:'Ruptures'};
  var totalRupture=P.filter(function(p){return p.st===0&&p.q>0&&p.dsp==='order';}).length;
  var totalSurstock=P.filter(function(p){var s=p.st-(p.q+2*p.c);return p.q>0&&s>0&&!(p.dsp==='unavailable'||p.dsp==='abandoned');}).length;
  var totalMort=P.filter(function(p){return p.st>0&&p.q===0;}).length;
  var totalFantome=P.filter(function(p){return p.q>0&&(p.dsp==='unavailable'||p.dsp==='abandoned');}).length;

  document.getElementById('an-stock-kpis').innerHTML=
    '<div class="an-kpi cb"><div class="an-klbl">Total produits</div><div class="an-kval b">'+P.length+'</div><div class="an-ksub">dans l\'entrepôt</div></div>'+
    '<div class="an-kpi cr"><div class="an-klbl">Ruptures</div><div class="an-kval r">'+totalRupture+'</div><div class="an-ksub">stock = 0, QI active</div></div>'+
    '<div class="an-kpi co"><div class="an-klbl">Surstock</div><div class="an-kval o">'+totalSurstock+'</div><div class="an-ksub">au-dessus du seuil</div></div>'+
    '<div class="an-kpi cg"><div class="an-klbl">Stock mort</div><div class="an-kval g">'+totalMort+'</div><div class="an-ksub">stock > 0, QI = 0</div></div>'+
    '<div class="an-kpi cr"><div class="an-klbl">Fantômes</div><div class="an-kval r">'+totalFantome+'</div><div class="an-ksub">QI sur produit inactif</div></div>';

  // Zone select
  var zoneOrder=['LGV','PF','Rota','Prio','Salée','Sucrée','Liquide','DPH','Frais sec','Autre'];
  var presentZones=zoneOrder.filter(function(z){return P.some(function(p){return zone(p.a)===z;});});
  var zSel=document.getElementById('an-zone-sel');
  if(zSel){
    zSel.innerHTML='<option value="all">Toutes les zones</option>'+
      presentZones.map(function(z){return'<option value="'+z+'"'+(anZoneF===z?' selected':'')+'>'+z+'</option>';}).join('');
  }

  data=anSortArr(data,anStSort.col,anStSort.dir);
  document.getElementById('an-stock-title').textContent=titles[anStockF]||'Tous les produits';
  document.getElementById('an-stock-count').textContent=data.length+' produit'+(data.length!==1?'s':'');

  // Thead
  var showSem=['surstock','all','mort'].includes(anStockF);
  var showDispo=['all','mort','fantome'].includes(anStockF);
  var hasV=typeof DV!=='undefined'&&!!DV;
  document.getElementById('an-stock-thead').innerHTML=
    '<th onclick="anSrtSt(\'n\')" id="an-sth-n">Produit <span class="an-si">⇅</span></th>'+
    '<th onclick="anSrtSt(\'z\')" id="an-sth-z">Zone <span class="an-si">⇅</span></th>'+
    '<th class="r" onclick="anSrtSt(\'q\')" id="an-sth-q">QI <span class="an-si">⇅</span></th>'+
    '<th class="r" onclick="anSrtSt(\'st\')" id="an-sth-st">Stock <span class="an-si">⇅</span></th>'+
    '<th class="r" onclick="anSrtSt(\'surplus\')" id="an-sth-surplus">Surplus <span class="an-si">⇅</span></th>'+
    (showSem?'<th class="r" onclick="anSrtSt(\'semaines\')" id="an-sth-sem">Semaines <span class="an-si">⇅</span></th>':'')+
    (showDispo?'<th onclick="anSrtSt(\'dsp\')" id="an-sth-dsp">Statut <span class="an-si">⇅</span></th>':'')+
    (hasV?'<th class="r" onclick="anSrtSt(\'vu\')" id="an-sth-vu">Unités <span class="an-si">⇅</span></th>':'')+
    (hasV?'<th class="r" onclick="anSrtSt(\'vca\')" id="an-sth-vca">CA <span class="an-si">⇅</span></th>':'')+
    (hasV?'<th class="r" onclick="anSrtSt(\'vcp\')" id="an-sth-vcp">CA Promo <span class="an-si">⇅</span></th>':'')+
    '<th style="width:32px"></th>';

  // Pagination
  var _tot=data.length;
  var _pages=Math.max(1,Math.ceil(_tot/AN_PER_PAGE));
  if(AN_PAGE>_pages)AN_PAGE=_pages;
  var _start=(AN_PAGE-1)*AN_PER_PAGE;
  data=data.slice(_start,_start+AN_PER_PAGE);

  // Render pagination controls
  var pgEl=document.getElementById('an-stock-pagination');
  if(pgEl){
    if(_pages<=1){pgEl.innerHTML='';}
    else{
      var pg='<div class="pagin">';
      pg+='<button class="pagin-btn" onclick="AN_PAGE=Math.max(1,AN_PAGE-1);anRenderStock()" '+(AN_PAGE===1?'disabled':'')+'>← Préc.</button>';
      var pgs=[];
      if(_pages<=7){for(var i=1;i<=_pages;i++)pgs.push(i);}
      else{pgs.push(1);if(AN_PAGE>3)pgs.push('…');var ps=Math.max(2,AN_PAGE-1),pe=Math.min(_pages-1,AN_PAGE+1);for(var i=ps;i<=pe;i++)pgs.push(i);if(AN_PAGE<_pages-2)pgs.push('…');pgs.push(_pages);}
      pgs.forEach(function(p){
        if(p==='…')pg+='<span class="pagin-btn" style="border:none;background:transparent;cursor:default">…</span>';
        else pg+='<button class="pagin-btn'+(p===AN_PAGE?' cur':'')+'" onclick="AN_PAGE='+p+';anRenderStock()">'+p+'</button>';
      });
      pg+='<button class="pagin-btn" onclick="AN_PAGE=Math.min('+_pages+',AN_PAGE+1);anRenderStock()" '+(AN_PAGE===_pages?'disabled':'')+'>Suiv. →</button>';
      pg+='<span class="pagin-info">'+(_start+1)+'–'+Math.min(AN_PAGE*AN_PER_PAGE,_tot)+' / '+_tot+'</span>';
      pg+='<select class="pagin-size" onchange="AN_PER_PAGE=parseInt(this.value);AN_PAGE=1;anRenderStock()">';
      [25,50,100].forEach(function(n){pg+='<option value="'+n+'"'+(AN_PER_PAGE===n?' selected':'')+'>'+n+' / page</option>';});
      pg+='</select></div>';
      pgEl.innerHTML=pg;
    }
  }

  document.getElementById('an-stock-body').innerHTML=data.map(function(p){
    var url='https://products.app.deleev.com/products/'+p.id+'?tab=stockpilling';
    var nomShort=p.n.length>48?p.n.slice(0,48)+'…':p.n;
    var isSel=AN_MSG.some(function(m){return m.id===p.id;});
    var sv=p.surplus;
    var surH=sv>0?'<span class="an-badge an-bo">+'+sv+'</span>':
      sv<0?'<span style="color:var(--r);font-weight:500">'+sv+'</span>':
      '<span style="color:var(--text3)">0</span>';
    var semH=showSem?(p.semaines!=null?'<td class="r"><span class="an-badge '+(p.semaines<2?'an-bg':p.semaines<=4?'an-bo':'an-br')+'">'+p.semaines+' sem</span></td>':'<td class="r">—</td>'):'' ;
    var disH=showDispo?'<td><span class="an-badge '+(p.dsp==='order'?'an-bg':p.dsp==='unavailable'?'an-br':'an-bk')+'">'+p.dsp+'</span></td>':'';
    var promoB=hasV&&p.vcp>0?' <span style="font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;background:color-mix(in srgb,var(--promo) 12%,transparent);color:var(--promo)">€</span>':'';
    var ruptB=hasV&&p.vrupt?' <span style="font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;background:color-mix(in srgb,var(--rupture) 12%,transparent);color:var(--rupture)">Rupt</span>':'';
    var vuH=hasV?'<td class="r" style="font-size:11px">'+(p.vu!=null?p.vu.toLocaleString('fr-FR'):'—')+'</td>':'';
    var vcaH=hasV?'<td class="r" style="font-size:11px;color:var(--ca)">'+(p.vca!=null&&p.vca>0?anFmtEur(p.vca):'—')+'</td>':'';
    var vcpH=hasV?'<td class="r" style="font-size:11px;color:var(--promo)">'+(p.vcp!=null&&p.vcp>0?anFmtEur(p.vcp):'—')+'</td>':'';
    return'<tr>'+
      '<td class="pcell" title="'+anEscQ(p.n)+'"><a class="an-plink'+(p.fantome?' style="color:var(--r)"':'')+'" href="'+url+'" target="_blank">'+nomShort+'</a>'+promoB+ruptB+'</td>'+
      '<td style="font-size:11px;color:var(--text3)">'+anFmtZone(p.z)+'</td>'+
      '<td class="r">'+p.q+'</td>'+
      '<td class="r">'+p.st+'</td>'+
      '<td class="r">'+surH+'</td>'+
      semH+disH+vuH+vcaH+vcpH+
      '<td style="text-align:center"><button class="an-sel-btn'+(isSel?' selected':'')+'" onclick="anToggleMsg(\''+p.id+'\',\''+anEscQ(p.n)+'\',\''+anFmtZone(p.z)+'\',\''+url+'\',\'Stock\')">✓</button></td>'+
      '</tr>';
  }).join('')||'<tr><td colspan="8" class="an-empty">Aucun produit</td></tr>';
}
function anSrtSt(col){AN_PAGE=1;if(anStSort.col===col)anStSort.dir*=-1;else{anStSort.col=col;anStSort.dir=-1;}anRenderStock();}

/* ── DOUBLONS ── */
function anSetDupeFilter(f,el){
  anDupeF=f;
  document.querySelectorAll('#an-tp-doublons .an-frow .an-pill').forEach(function(p){p.className='an-pill';});
  el.classList.add('on');
  anRenderDoublons();
}

function anSimScore(rows){
  var ruptAndStock=rows.some(function(r){return r.st===0&&r.q>0;})&&rows.some(function(r){return r.st>0;});
  var multiQi=rows.filter(function(r){return r.q>0;}).length>=2;
  var hasSurplus=rows.some(function(r){return r.st>r.q*3&&r.q>0;});
  var hasDead=rows.some(function(r){return r.st>0&&r.q===0;});
  return(ruptAndStock?200:0)+(multiQi?100:0)+(hasSurplus?80:0)+(hasDead?60:0);
}

function anComputeDoublons(){
  // Code barre
  var bcMap={};
  P.forEach(function(p){
    if(!p.bc||p.bc===''||p.bc.length<4)return;
    if(!bcMap[p.bc])bcMap[p.bc]=[];
    bcMap[p.bc].push(p);
  });
  // Noms similaires
  var nomMap={};
  P.forEach(function(p){
    var u=anExtractUnit(p.n);
    var base=anBaseName(p.n);
    var mn=anNorm(p.mk||'').replace(/\s+/g,'');
    if(!u.val||base.length<8)return;
    var key=mn+'||'+base+'||'+u.val;
    if(!nomMap[key])nomMap[key]=[];
    p._mult=u.mult;
    nomMap[key].push(p);
  });

  function makeGroups(map,type,keyFn){
    return Object.entries(map)
      .filter(function(e){return e[1].length>1&&e[1].some(function(p){return p.q>0;});})
      .map(function(e){
        var rows=e[1];
        var score=anSimScore(rows);
        var ruptAndStock=rows.some(function(r){return r.st===0&&r.q>0;})&&rows.some(function(r){return r.st>0;});
        var multiQi=rows.filter(function(r){return r.q>0;}).length>=2;
        var hasSurplus=rows.some(function(r){return r.st>r.q*3&&r.q>0;});
        var hasDead=rows.some(function(r){return r.st>0&&r.q===0;});
        return{type:type,key:keyFn(e[0]),arr:rows,score:score,ruptAndStock:ruptAndStock,multiQi:multiQi,hasSurplus:hasSurplus,hasDead:hasDead};
      })
      .sort(function(a,b){return b.score-a.score;});
  }

  var bcGroups=makeGroups(bcMap,'bc',function(k){return'Code barre '+k;});

  var simGroups=Object.entries(nomMap)
    .filter(function(e){
      if(e[1].length<2||!e[1].some(function(p){return p.q>0;}))return false;
      var rows=e[1];
      var ruptAndStock=rows.some(function(r){return r.st===0&&r.q>0;})&&rows.some(function(r){return r.st>0;});
      var multiQiSurplus=rows.filter(function(r){return r.q>0;}).length>=2&&rows.some(function(r){return r.st>r.q*3&&r.q>0;});
      var multiQiDead=rows.filter(function(r){return r.q>0;}).length>=2&&rows.some(function(r){return r.st>0&&r.q===0;});
      return ruptAndStock||multiQiSurplus||multiQiDead;
    })
    .map(function(e){
      var rows=e[1];
      var score=anSimScore(rows);
      var ruptAndStock=rows.some(function(r){return r.st===0&&r.q>0;})&&rows.some(function(r){return r.st>0;});
      var multiQi=rows.filter(function(r){return r.q>0;}).length>=2;
      var hasSurplus=rows.some(function(r){return r.st>r.q*3&&r.q>0;});
      var hasDead=rows.some(function(r){return r.st>0&&r.q===0;});
      return{type:'sim',key:'Noms similaires',arr:rows,score:score,ruptAndStock:ruptAndStock,multiQi:multiQi,hasSurplus:hasSurplus,hasDead:hasDead};
    })
    .sort(function(a,b){return b.score-a.score;})
    .slice(0,80);

  return{bcGroups:bcGroups,simGroups:simGroups,totalGroups:bcGroups.length+simGroups.length};
}

function anRenderDoublons(){
  var d=anComputeDoublons();
  document.getElementById('an-kd-ref').textContent='—';
  document.getElementById('an-kd-bc').textContent=d.bcGroups.length;
  document.getElementById('an-kd-sim').textContent=d.simGroups.length;
  document.getElementById('an-nb-doublons').textContent=d.totalGroups||'';

  var q=((document.getElementById('an-dupe-search')||{}).value||'').toLowerCase();
  var groups=[];
  if(anDupeF==='all'||anDupeF==='bc')groups=groups.concat(d.bcGroups);
  if(anDupeF==='all'||anDupeF==='sim')groups=groups.concat(d.simGroups);
  if(q)groups=groups.filter(function(g){return g.arr.some(function(p){return p.n.toLowerCase().includes(q);});});

  var body=document.getElementById('an-doublons-body');
  if(!groups.length){body.innerHTML='<div class="an-empty">Aucun doublon trouvé</div>';return;}

  var tClass={bc:'an-bb',sim:'an-br'};
  var tLabel={bc:'Code barre',sim:'Noms similaires'};

  body.innerHTML=groups.map(function(g){
    var flags=[];
    if(g.ruptAndStock)flags.push('<span class="an-badge an-br">RUPTURE+STOCK</span>');
    if(g.multiQi)flags.push('<span class="an-badge an-bb">2× QI</span>');
    if(g.hasSurplus)flags.push('<span class="an-badge an-bo">SURPLUS</span>');
    if(g.hasDead)flags.push('<span class="an-badge an-bk">STOCK MORT</span>');
    return'<div class="an-dupe-card">'+
      '<div class="an-dupe-head">'+
        '<span class="an-badge '+tClass[g.type]+'">'+tLabel[g.type]+'</span>'+
        (g.arr[0]&&g.arr[0].mk?'<span style="font-size:11px;color:var(--text);font-weight:500">'+g.arr[0].mk+'</span>':'')+
        '<span style="display:flex;gap:4px;flex-wrap:wrap">'+flags.join('')+'</span>'+
        '<span style="margin-left:auto;font-size:10px;color:var(--text3)">'+g.arr.length+' fiches</span>'+
      '</div>'+
      '<table class="an-table">'+
        '<thead><tr>'+
          '<th>Produit</th><th>Zone</th><th class="r">QI</th><th class="r">Stock</th><th>Statut</th><th>Signal</th><th style="width:32px"></th>'+
        '</tr></thead>'+
        '<tbody>'+g.arr.map(function(p){
          var url='https://products.app.deleev.com/products/'+p.id+'?tab=stockpilling';
          var nom=p.n.length>50?p.n.slice(0,50)+'…':p.n;
          var isSel=AN_MSG.some(function(m){return m.id===p.id;});
          var dc=p.dsp==='order'?'an-bg':p.dsp==='unavailable'?'an-br':'an-bk';
          var rowSig='';
          if(p.st===0&&p.q>0)rowSig='<span class="an-badge an-br">Rupture</span>';
          else if(p.st>p.q*3&&p.q>0)rowSig='<span class="an-badge an-bo">Surplus</span>';
          else if(p.st>0&&p.q===0)rowSig='<span class="an-badge an-bk">Stock mort</span>';
          return'<tr>'+
            '<td class="pcell" title="'+anEscQ(p.n)+'"><a class="an-plink" href="'+url+'" target="_blank">'+nom+'</a></td>'+
            '<td style="font-size:11px;color:var(--text3)">'+anFmtZone(p.z)+'</td>'+
            '<td class="r" style="color:var(--o);font-weight:600">'+p.q+'</td>'+
            '<td class="r">'+p.st+'</td>'+
            '<td><span class="an-badge '+dc+'">'+p.dsp+'</span></td>'+
            '<td>'+rowSig+'</td>'+
            '<td style="text-align:center"><button class="an-sel-btn'+(isSel?' selected':'')+'" onclick="anToggleMsg(\''+p.id+'\',\''+anEscQ(p.n)+'\',\''+anFmtZone(p.z)+'\',\''+url+'\',\'Doublons\')">✓</button></td>'+
          '</tr>';
        }).join('')+'</tbody></table></div>';
  }).join('');
}

/* ── SUR-COMMANDE ── */
function anRenderSurCmd(){
  var q=((document.getElementById('an-sc-search')||{}).value||'').toLowerCase();
  var data=P.filter(function(p){return p.q>0&&p.c>0&&p.q>2*p.c;});
  if(q)data=data.filter(function(p){return p.n.toLowerCase().includes(q);});
  data=data.map(function(p){return Object.assign({},p,{ratio:Math.round(p.q/p.c*10)/10});});
  document.getElementById('an-ksc-nb').textContent=data.length;
  document.getElementById('an-nb-surCmd').textContent=data.length||'';
  data=anSortArr(data,anScSort.col,anScSort.dir);
  document.getElementById('an-scc').textContent=data.length+' produit'+(data.length!==1?'s':'');
  document.getElementById('an-sc-body').innerHTML=data.map(function(p){
    var url='https://products.app.deleev.com/products/'+p.id+'?tab=stockpilling';
    var nom=p.n.length>50?p.n.slice(0,50)+'…':p.n;
    var isSel=AN_MSG.some(function(m){return m.id===p.id;});
    var rc=p.ratio>5?'an-br':p.ratio>3?'an-bo':'an-bb';
    return'<tr>'+
      '<td class="pcell" title="'+anEscQ(p.n)+'"><a class="an-plink" href="'+url+'" target="_blank">'+nom+'</a></td>'+
      '<td style="font-size:11px;color:var(--text3)">'+anFmtZone(p.z)+'</td>'+
      '<td class="r" style="color:var(--b);font-weight:600">'+p.q+'</td>'+
      '<td class="r">'+p.c+'</td>'+
      '<td class="r"><span class="an-badge '+rc+'">×'+p.ratio+'</span></td>'+
      '<td class="r">'+p.st+'</td>'+
      '<td style="text-align:center"><button class="an-sel-btn'+(isSel?' selected':'')+'" onclick="anToggleMsg(\''+p.id+'\',\''+anEscQ(p.n)+'\',\''+anFmtZone(p.z)+'\',\''+url+'\',\'Sur-commande\')">✓</button></td>'+
      '</tr>';
  }).join('')||'<tr><td colspan="7" class="an-empty">Aucune sur-commande</td></tr>';
}
function anSrtSc(col){if(anScSort.col===col)anScSort.dir*=-1;else{anScSort.col=col;anScSort.dir=-1;}anRenderSurCmd();}

/* ── GROUPES ── */
function anSetGrFilter(f,el){
  anGrFilter=f;
  document.querySelectorAll('#an-tp-groupes .an-frow .an-pill').forEach(function(p){p.className='an-pill';});
  el.classList.add('on');
  anRenderGroupes();
}
function anSrtGr(col){if(anGrSort.col===col)anGrSort.dir*=-1;else{anGrSort.col=col;anGrSort.dir=-1;}anRenderGroupes();}

function anComputeGroupes(){
  var map={};
  P.forEach(function(p){
    var u=anExtractUnit(p.n);
    var base=anBaseName(p.n);
    var mn=anNorm(p.mk||'').replace(/\s+/g,'');
    if(!u.val||base.length<8)return;
    var key=mn+'||'+base+'||'+u.val;
    if(!map[key])map[key]=[];
    p._mult=u.mult;
    map[key].push(p);
  });

  var groups=[];
  Object.values(map).forEach(function(arr){
    if(arr.length<2)return;
    if(arr.every(function(p){return p.q===0&&p.st===0;}))return;
    var hasUnit=arr.some(function(p){return p._mult===1;});
    if(!hasUnit)return;

    var sorted_arr=[].concat(arr).sort(function(a,b){
      if(a._mult!==b._mult)return a._mult-b._mult;
      return b.q-a.q;
    });
    var main=sorted_arr[0];
    var secondary=sorted_arr.slice(1);

    var has_rupture_main=main.st===0&&main.q>0;
    var has_surplus_secondary=secondary.some(function(p){return p.st>0&&p.q===0;});
    var multi_qi=arr.filter(function(p){return p.q>0;}).length>=2;

    if(!has_rupture_main&&!has_surplus_secondary&&!multi_qi)return;

    var score=(has_rupture_main&&has_surplus_secondary?300:0)+(multi_qi?100:0)+(has_surplus_secondary?80:0)+(has_rupture_main?60:0);
    var ecart=main.st-main.q;

    groups.push({
      nom:main.nom||main.n,zone:main.z,id:main.id,
      qi_main:main.q,stk_main:main.st,ecart:ecart,
      n:arr.length,score:score,
      has_rupture_main:has_rupture_main,
      has_surplus_secondary:has_surplus_secondary,
      multi_qi:multi_qi,
      main:main,secondary:secondary,all:arr
    });
  });
  groups.sort(function(a,b){return b.score-a.score;});
  return groups;
}

function anRenderGroupes(){
  var groups=anComputeGroupes();
  var q=((document.getElementById('an-gr-search')||{}).value||'').toLowerCase();

  var filtered=groups.filter(function(g){
    if(anGrFilter==='surplus'&&!g.has_surplus_secondary)return false;
    if(anGrFilter==='rupture'&&!g.has_rupture_main)return false;
    if(anGrFilter==='multiqi'&&!g.multi_qi)return false;
    if(q&&!(g.nom||'').toLowerCase().includes(q)&&!g.all.some(function(p){return p.n.toLowerCase().includes(q);}))return false;
    return true;
  });

  var sCol=anGrSort.col,sDir=anGrSort.dir;
  filtered=filtered.slice().sort(function(a,b){
    var va=a[sCol],vb=b[sCol];
    if(va==null)va=sDir===1?Infinity:-Infinity;
    if(vb==null)vb=sDir===1?Infinity:-Infinity;
    if(typeof va==='string')return sDir*va.localeCompare(vb,'fr',{sensitivity:'base'});
    return sDir*(va-vb);
  });

  var nbRupture=groups.filter(function(g){return g.has_rupture_main&&g.has_surplus_secondary;}).length;
  var nbMulti=groups.filter(function(g){return g.multi_qi;}).length;
  document.getElementById('an-gr-kpis').innerHTML=
    '<div class="an-kpi co"><div class="an-klbl">Groupes</div><div class="an-kval o">'+groups.length+'</div><div class="an-ksub">fiches unité + lots</div></div>'+
    '<div class="an-kpi cr"><div class="an-klbl">Rupture unité + stock lot</div><div class="an-kval r">'+nbRupture+'</div><div class="an-ksub">urgence maximale</div></div>'+
    '<div class="an-kpi cb"><div class="an-klbl">Multi-QI</div><div class="an-kval b">'+nbMulti+'</div><div class="an-ksub">commandes dupliquées</div></div>';

  document.getElementById('an-nb-groupes').textContent=groups.length||'';
  document.getElementById('an-gr-count').textContent=filtered.length+' groupe'+(filtered.length!==1?'s':'');
  var titles2={all:'Tous les groupes',surplus:'Stock dans les lots',rupture:'Rupture sur la fiche unité',multiqi:'Multi-QI'};
  document.getElementById('an-gr-title').textContent=titles2[anGrFilter]||'Groupes';

  document.getElementById('an-gr-body').innerHTML=filtered.map(function(g,i){
    var url='https://products.app.deleev.com/products/'+g.id+'?tab=stockpilling';
    var nomShort=(g.nom||'').length>50?(g.nom||'').slice(0,50)+'…':(g.nom||'');
    var flags='';
    if(g.has_rupture_main&&g.has_surplus_secondary)flags+='<span class="an-badge an-br" style="font-size:9px">Rupture unité + lot</span> ';
    else if(g.has_rupture_main)flags+='<span class="an-badge an-br" style="font-size:9px">Rupture unité</span> ';
    else if(g.has_surplus_secondary)flags+='<span class="an-badge an-bo" style="font-size:9px">Stock dans lot</span> ';
    if(g.multi_qi)flags+='<span class="an-badge an-bb" style="font-size:9px">Multi-QI</span>';
    var xid='an-gr-x-'+i;
    var isSel=AN_MSG.some(function(m){return m.id===g.id;});
    var stkC=g.stk_main===0?'color:var(--r);font-weight:600':'';

    var detailRows=g.secondary.map(function(p){
      var purl='https://products.app.deleev.com/products/'+p.id+'?tab=stockpilling';
      var pnom=p.n.length>52?p.n.slice(0,52)+'…':p.n;
      var psig='';
      if(p.st===0&&p.q>0)psig='<span class="an-badge an-br" style="font-size:9px">Rupture</span>';
      else if(p.st>0&&p.q===0)psig='<span class="an-badge an-bo" style="font-size:9px">Stock mort</span>';
      else if(p.st>p.q*3&&p.q>0)psig='<span class="an-badge an-bo" style="font-size:9px">Surplus</span>';
      return'<tr style="background:var(--bg2);font-size:11px">'+
        '<td style="padding:5px 10px 5px 28px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+
          '<a class="an-plink" href="'+purl+'" target="_blank">'+pnom+'</a>'+
        '</td>'+
        '<td style="padding:5px 10px;font-size:10px;color:var(--text3)">'+anFmtZone(p.z)+'</td>'+
        '<td class="r" style="padding:5px 10px;color:var(--o);font-weight:500">'+p.q+'</td>'+
        '<td class="r" style="padding:5px 10px">'+p.st+'</td>'+
        '<td style="padding:5px 10px">'+psig+'</td>'+
        '<td colspan="2"></td>'+
        '</tr>';
    }).join('');

    return'<tr style="cursor:pointer" onclick="anToggleGrRow(\''+xid+'\')">'+
      '<td class="pcell" title="'+anEscQ(g.nom||'')+'">'+
        '<a class="an-plink" href="'+url+'" target="_blank" onclick="event.stopPropagation()">'+nomShort+'</a> '+flags+
      '</td>'+
      '<td style="font-size:11px;color:var(--text3)">'+anFmtZone(g.zone)+'</td>'+
      '<td class="r" style="color:var(--o);font-weight:600">'+g.qi_main+'</td>'+
      '<td class="r" style="'+stkC+'">'+g.stk_main+'</td>'+
      (function(){var d=g.stk_main-g.qi_main;return'<td class="r" style="color:'+(d<0?'var(--r)':d>0?'var(--g)':'var(--text3)')+'">'+( d>0?'+':'')+d+'</td>';})()+
      '<td style="font-size:11px;color:var(--text3)">'+g.n+' fiches</td>'+
      '<td style="text-align:center"><button class="an-sel-btn'+(isSel?' selected':'')+'" onclick="anToggleMsg(\''+g.id+'\',\''+anEscQ(g.nom||'')+'\',\''+anFmtZone(g.zone)+'\',\''+url+'\',\'Groupes\');event.stopPropagation()">✓</button></td>'+
      '</tr>'+
      '<tr id="'+xid+'" style="display:none"><td colspan="7" style="padding:0">'+
        '<table style="width:100%;border-collapse:collapse">'+detailRows+'</table>'+
      '</td></tr>';
  }).join('')||'<tr><td colspan="7" class="an-empty">Aucun groupe pour ce filtre</td></tr>';
}

function anToggleGrRow(id){
  var el=document.getElementById(id);
  if(el)el.style.display=el.style.display==='none'?'table-row':'none';
}

/* ── MESSAGERIE ── */
function anToggleMsg(id,nom,zone,url,cat){
  var idx=AN_MSG.findIndex(function(m){return m.id===id;});
  if(idx>=0)AN_MSG.splice(idx,1);
  else AN_MSG.push({id:id,nom:nom,zone:zone,url:url,cat:cat});
  document.getElementById('an-nb-msg').textContent=AN_MSG.length;
  if(anCurTab==='stock')anRenderStock();
  else if(anCurTab==='doublons')anRenderDoublons();
  else if(anCurTab==='surCmd')anRenderSurCmd();
  else if(anCurTab==='groupes')anRenderGroupes();
  else anRenderMsgTab();
}

function anRenderMsgTab(){
  if(!AN_MSG.length){
    document.getElementById('an-msg-preview').textContent='Aucun produit sélectionné.';
    document.getElementById('an-msg-list').innerHTML='';
    return;
  }
  var cats={};
  AN_MSG.forEach(function(m){if(!cats[m.cat])cats[m.cat]=[];cats[m.cat].push(m);});
  var txt='';
  Object.entries(cats).forEach(function(e){
    txt+=e[0]+' :\n';
    e[1].forEach(function(m){txt+=m.nom+'   '+m.zone+'\n'+m.url+'\n';});
    txt+='\n';
  });
  document.getElementById('an-msg-preview').textContent=txt.trim();
  document.getElementById('an-msg-list').innerHTML=Object.entries(cats).map(function(e){
    return'<div style="margin-bottom:12px">'+
      '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:5px">'+e[0]+'</div>'+
      '<div class="an-tcard">'+
        e[1].map(function(m){
          return'<div class="an-msg-item">'+
            '<div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">'+
              '<button class="an-msg-remove" onclick="anToggleMsg(\''+m.id+'\',\''+anEscQ(m.nom)+'\',\''+m.zone+'\',\''+m.url+'\',\''+m.cat+'\')">×</button>'+
              '<div style="min-width:0"><div style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">'+m.nom+'</div><a href="'+m.url+'" target="_blank" style="font-size:10px;color:var(--b);text-decoration:none">'+m.url+'</a></div>'+
            '</div>'+
            '<span class="an-msg-zone">'+m.zone+'</span>'+
          '</div>';
        }).join('')+
      '</div></div>';
  }).join('');
}

function anCopyMsg(){
  var cats={};
  AN_MSG.forEach(function(m){if(!cats[m.cat])cats[m.cat]=[];cats[m.cat].push(m);});
  var txt='';
  Object.entries(cats).forEach(function(e){
    txt+=e[0]+' :\n';
    e[1].forEach(function(m){txt+=m.nom+'   '+m.zone+'\n'+m.url+'\n';});
    txt+='\n';
  });
  navigator.clipboard.writeText(txt.trim()).then(function(){
    var btn=document.querySelector('[onclick="anCopyMsg()"]');
    if(btn){var orig=btn.textContent;btn.textContent='✅ Copié!';setTimeout(function(){btn.textContent=orig;},2000);}
  });
}
function anClearMsg(){AN_MSG=[];document.getElementById('an-nb-msg').textContent='0';anRenderMsgTab();}