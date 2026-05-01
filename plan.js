// ── Plan module ─────────────────────────────────────────
// Dépendances : S, PLAN, showToast

/* ══ PLAN ══════════════════════════════════════════════════════════ */
var pz=PLAN.zoom||1,px=PLAN.ox||60,py=PLAN.oy||60;
var _pdrag=null,_pdox=0,_pdoy=0;
var _panning=false,_psx=0,_psy=0,_psox=0,_psoy=0;
var _rz=null,_rzid=null,_rzsx=0,_rzsy=0,_rzw=0,_rzh=0;

function rPlan(){
  var allees=[...new Set(P.map(p=>p.a))].sort((a,b)=>a-b);
  var placed=PLAN.items.filter(i=>i.type==='allee').map(i=>i.num);
  var zones={};allees.forEach(a=>{var z=zone(a);if(!zones[z])zones[z]=[];zones[z].push(a);});
  var sb='<div id="plan-sb"><div id="plan-sb-top">Éléments</div><div id="plan-sb-mid">';
  sb+='<input id="sb-q" placeholder="Rechercher..." oninput="filterSb(this.value)" style="width:calc(100% - 6px);margin:3px;padding:4px 6px;border:1px solid var(--border);border-radius:var(--r6);font-size:11px;background:var(--bg2)">';
  Object.entries(zones).forEach(function(ze){
    var z=ze[0],als=ze[1];
    sb+='<div class="sb-sec" style="color:'+(ZC[z]||'#999')+'">'+z+'</div>';
    als.forEach(function(a){
      var na=P.filter(function(p){return p.a===a&&ALERTS[p.id];}).length;
      sb+='<div class="sb-item '+(placed.includes(a)?'placed':'')+'" id="sbi-'+a+'" draggable="true" ondragstart="sbDS(event,\x27allee\x27,'+a+')" data-a="'+a+'" data-z="'+z+'">';
      sb+='<span class="sn" style="color:'+zc(a)+'">'+a+'</span>';
      sb+='<span class="sz">'+(a%2===0?'P':'I')+'</span>';
      if(na)sb+='<span class="bdg" style="margin-left:auto;font-size:9px">'+na+'</span>';
      sb+='</div>';
    });
  });
  sb+='</div><div id="plan-sb-foot">';
  sb+='<div class="sb-tool" draggable="true" ondragstart="sbDS(event,\x27chemin\x27,0)">🛤 Chemin principal</div>';
  sb+='<div class="sb-tool" draggable="true" ondragstart="sbDS(event,\x27palette\x27,0)">📦 Palette</div>';
  sb+='<div class="sb-tool" draggable="true" ondragstart="sbDS(event,\x27wall\x27,0)">🧱 Mur</div>';
  sb+='<div class="sb-tool" draggable="true" ondragstart="sbDS(event,\x27text\x27,0)">🔤 Texte</div>';
  sb+='</div></div>';

  var cvHtml='<div id="plan-main"><div id="plan-ctrl">';
  cvHtml+='<button class="btn sm" onclick="pZi()">＋</button>';
  cvHtml+='<span id="pzl" style="font-size:11px;padding:2px 4px;min-width:36px;text-align:center">'+Math.round(pz*100)+'%</span>';
  cvHtml+='<button class="btn sm" onclick="pZo()">－</button>';
  cvHtml+='<button class="btn sm" title="Centrer le plan" onclick="pCenter()">⌂</button>';
  cvHtml+='<div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>';
  cvHtml+='<button class="btn sm" onclick="toggleLock()">'+(PLAN_LOCKED?"🔒":"🔓 Libre")+"</button>";
  cvHtml+='<div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>';
  cvHtml+='<button class="btn sm pri" onclick="spl();alert(\'✓\')" >💾</button>';
  cvHtml+='<button class="btn sm bad" onclick="clearPlan()">🗑</button>';
  cvHtml+='</div>';
  cvHtml+='<div id="plan-vp" ondragover="event.preventDefault()" ondrop="pDrop(event)" onwheel="pWheel(event)" onmousedown="ppStart(event)" onmousemove="ppMove(event)" onmouseup="ppEnd(event)">';
  cvHtml+='<div id="plan-cv" style="transform:translate('+px+'px,'+py+'px) scale('+pz+')">';
  PLAN.items.forEach(function(it){
    if(it.type==='allee')cvHtml+=mkAllee(it);
    else if(it.type==='palette')cvHtml+=mkPal(it);
    else if(it.type==='chemin')cvHtml+=mkChem(it);
    else if(it.type==='wall')cvHtml+=mkWall(it);
    else if(it.type==='text')cvHtml+=mkTxt(it);
  });
  cvHtml+='</div></div></div>';
  document.getElementById('plan-page').innerHTML=sb+cvHtml;
}

function filterSb(q){
  document.querySelectorAll('.sb-item').forEach(function(el){
    el.style.display=(!q||el.dataset.a.includes(q)||el.dataset.z.toLowerCase().includes(q.toLowerCase()))?'flex':'none';
  });
}

var _sdt=null,_sdn=null;
function sbDS(e,t,n){_sdt=t;_sdn=n;}

function pDrop(e){
  e.preventDefault();
  var vp=document.getElementById('plan-vp').getBoundingClientRect();
  var x=Math.round((e.clientX-vp.left-px)/pz/20)*20;
  var y=Math.round((e.clientY-vp.top-py)/pz/20)*20;
  var id='i'+Date.now();
  var item=null;
  if(_sdt==='allee'){
    if(PLAN.items.find(function(i){return i.type==='allee'&&i.num===_sdn;}))return;
    item={type:'allee',id:id,num:_sdn,x:x,y:y,w:180,rotated:false,flipped:!!ALLEE_SIDE[_sdn]};
    var sbi=document.getElementById('sbi-'+_sdn);if(sbi)sbi.classList.add('placed');
  }else if(_sdt==='palette'){
    item={type:'palette',id:id,x:x,y:y,w:80,h:64,label:'PAL',qty:1};
  }else if(_sdt==='chemin'){
    item={type:'chemin',id:id,x:x,y:y,w:50,h:280,label:'Chemin principal'};
  }else if(_sdt==='wall'){
    item={type:'wall',id:id,x:x,y:y,w:120,h:20,rot:0};
  }else if(_sdt==='text'){
    item={type:'text',id:id,x:x,y:y,w:120,h:30,label:'Texte',rot:0};
  }
  if(!item)return;
  PLAN.items.push(item);spl();
  var cv=document.getElementById('plan-cv');
  var tmp=document.createElement('div');
  var html_item=_sdt==='allee'?mkAllee(item):_sdt==='palette'?mkPal(item):
      _sdt==='wall'?mkWall(item):_sdt==='text'?mkTxt(item):mkChem(item);
    tmp.innerHTML=html_item;
  cv.appendChild(tmp.firstChild);
}

function mkAllee(it){
  var a=it.num;var ps=P.filter(function(p){return p.a===a;});
  var na=ps.filter(function(p){return ALERTS[p.id];}).length;
  var col=zc(a);var z=zone(a);
  var etags=[...new Set(ps.map(function(p){return p.et;}))].sort(function(a,b){return a-b;});
  var imp=etags.filter(function(e){return e%2===1;});
  var par=etags.filter(function(e){return e%2===0;});
  if(ALLEE_SIDE[a]||it.flipped){imp=imp.slice().reverse();par=par.slice().reverse();}
  var w=it.w||180;
  var rotStyle=it.rotated?'transform:rotate(90deg);transform-origin:top left;':'';

  function etCol(et){
    var fam3=getNvFams(a,3);
    var hasColor=fam3.length>0;
    var col2=hasColor?fc(fam3[0]):'var(--border2)';
    var bg=hasColor?fb(fam3[0]):'var(--bg2)';
    var eal=ps.filter(function(p){return p.et===et&&ALERTS[p.id];}).length;
    var lbl=hasColor?fam3[0]:'';
    var etNivs=[...new Set(ps.filter(function(p){return p.et===et;}).map(function(p){return p.nv;}))].filter(function(n){return n>0;});
    var etDone=etNivs.filter(function(nv){return VALID[a+'_'+et+'_'+nv];}).length;
    var etPct=etNivs.length?Math.round(etDone/etNivs.length*100):0;
    var pClr=etPct===100?'var(--g)':etDone>0?'var(--o)':'var(--bg4)';
    return '<div class="cva-et-col"><div class="cva-et-num">'+et+'</div>'
      +'<div class="cva-et-blk" style="background:'+bg+';border-color:'+col2+'55" onclick="event.stopPropagation();goAllee('+a+')" title="Ét.'+et+'">'
      +(lbl?'<span style="font-size:8px;font-weight:700;color:'+col2+'">'+lbl+'</span>':'')
      +(eal?'<span class="et-dot" style="background:var(--o)"></span>':'')
      +'</div>'
      +'<div style="height:3px;width:28px;background:var(--bg4);border-radius:2px;margin-top:1px;overflow:hidden">'
      +'<div style="height:3px;width:'+etPct+'%;background:'+pClr+'"></div>'
      +'</div></div>';
  }

  var html='<div class="cva" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="allee" style="left:'+it.x+'px;top:'+it.y+'px;width:'+w+'px;'+rotStyle+'">';
  html+='<div class="cva-head" onmousedown="cvDS(event,\x27'+it.id+'\x27)">';
  html+='<span class="cva-num" style="color:'+col+'" onclick="event.stopPropagation();goAllee('+a+')">'+a+'</span>';
  html+='<span style="font-size:9px;color:'+col+';background:'+col+'18;padding:1px 4px;border-radius:3px">'+z+'</span>';
  if(na)html+='<span class="bdg" style="font-size:9px">'+na+'</span>';
  html+='<span class="rot-btn" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)" title="Pivoter">↻</span>';
  html+='<span class="cva-del" onclick="event.stopPropagation();rmItem(\x27'+it.id+'\x27,'+a+')">✕</span>';
  html+='</div><div class="cva-body">';
  if(imp.length){
    html+='<div class="cva-sect"><div class="cva-sect-lbl">Impaires ↑</div><div class="cva-et-cols">';
    imp.forEach(function(et){html+=etCol(et);});
    html+='</div></div>';
  }
  if(par.length){
    html+='<div class="cva-sect"><div class="cva-sect-lbl">Paires ↓</div><div class="cva-et-cols">';
    par.forEach(function(et){html+=etCol(et);});
    html+='</div></div>';
  }
  html+='</div><div class="cva-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
  return html;
}

function mkPal(it){
  var rot=it.rot?'transform:rotate('+it.rot+'deg);transform-origin:center;':'';
  return '<div class="cv-pal" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="palette"'
    +' style="left:'+it.x+'px;top:'+it.y+'px;width:'+(it.w||80)+'px;height:'+(it.h||50)+'px;'+rot+'"'
    +' onmousedown="cvDS(event,\x27'+it.id+'\x27)">'
    +'<div class="cp-head" style="cursor:move">'
    +'<span style="flex:1;font-size:11px">📦 Palette</span>'
    +'<button class="rot-btn" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)">↻</button>'
    +'<span class="cp-del" onclick="event.stopPropagation();rmItem(\x27'+it.id+'\x27)">✕</span>'
    +'</div>'
    +'<div class="cp-body" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:5px">'
    +'<input type="number" min="1" max="999" value="'+(it.qty||1)+'"'
    +' style="width:48px;border:1px solid #f9a825;border-radius:4px;padding:2px 5px;font-size:14px;font-weight:700;text-align:center;background:#fffde7;color:var(--o)"'
    +' onchange="updItem(\x27'+it.id+'\x27,\x27qty\x27,+this.value)" onclick="event.stopPropagation()">'
    +'<span style="font-size:10px;color:var(--text3)">pal.</span>'
    +'</div>'
    +'<div class="cp-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
}

function mkChem(it){
  var chemRot=it.rot?'transform:rotate('+it.rot+'deg);transform-origin:center;':'';
  return '<div class="cv-chem" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="chemin" style="left:'+it.x+'px;top:'+it.y+'px;width:'+(it.w||50)+'px;height:'+(it.h||280)+'px;'+chemRot+'" onmousedown="cvDS(event,\x27'+it.id+'\x27)">'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px">'
    +'<button class="rot-btn" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)" title="Pivoter">↻</button>'
    +'<input class="chem-edit" value="'+(it.label||'Chemin principal')+'" onclick="event.stopPropagation()" onchange="updItem(\x27'+it.id+'\x27,\x27label\x27,this.value)">'
    +'</div>'
    +'<div class="cv-chem-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
}

function mkWall(it){
  var rot=it.rot?'transform:rotate('+it.rot+'deg);transform-origin:center;':'';
  return '<div class="cv-wall" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="wall"'
    +' style="left:'+it.x+'px;top:'+it.y+'px;width:'+(it.w||120)+'px;height:'+(it.h||20)+'px;'+rot+'"'
    +' onmousedown="cvDS(event,\x27'+it.id+'\x27)">'
    +'<button class="rot-btn" style="position:absolute;top:2px;right:18px;font-size:10px" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)">↻</button>'
    +'<span class="cva-del" style="position:absolute;top:2px;right:2px" onclick="event.stopPropagation();rmItem(\x27'+it.id+'\x27)">✕</span>'
    +'<div class="wall-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
}

function mkTxt(it){
  var rot=it.rot?'transform:rotate('+it.rot+'deg);transform-origin:center;':'';
  return '<div class="cv-txt" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="text"'
    +' style="left:'+it.x+'px;top:'+it.y+'px;width:'+(it.w||120)+'px;min-height:'+(it.h||30)+'px;'+rot+'"'
    +' onmousedown="cvDS(event,\x27'+it.id+'\x27)">'
    +'<button class="rot-btn" style="position:absolute;top:1px;right:18px;font-size:10px" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)">↻</button>'
    +'<span class="cva-del" style="position:absolute;top:1px;right:2px" onclick="event.stopPropagation();rmItem(\x27'+it.id+'\x27)">✕</span>'
    +'<textarea class="txt-edit" onclick="event.stopPropagation()" onchange="updItem(\x27'+it.id+'\x27,\x27label\x27,this.value)">'+(it.label||'Texte')+'</textarea>'
    +'<div class="txt-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
}

function cvDS(e,id){
  if(PLAN_LOCKED)return;
  if(['INPUT','BUTTON','TEXTAREA'].includes(e.target.tagName)||['cva-del','cp-del','cva-rz','cp-rz','cv-chem-rz','rot-btn','wall-rz','txt-rz'].some(function(c){return e.target.classList.contains(c);}))return;
  e.stopPropagation();e.preventDefault();
  // Ctrl+click = toggle selection
  if(e.ctrlKey||e.metaKey){
    if(SEL_IDS.has(id))SEL_IDS.delete(id);else SEL_IDS.add(id);
    var el2=document.getElementById('cva-'+id);if(el2)el2.classList.toggle('sel',SEL_IDS.has(id));
    return;
  }
  // If not ctrl, clear selection and select this one
  if(!SEL_IDS.has(id)){
    SEL_IDS.forEach(function(sid){var se=document.getElementById('cva-'+sid);if(se)se.classList.remove('sel');});
    SEL_IDS.clear();
    SEL_IDS.add(id);
    var el3=document.getElementById('cva-'+id);if(el3)el3.classList.add('sel');
  }
  _pdrag=document.getElementById('cva-'+id);if(!_pdrag)return;
  var vp=document.getElementById('plan-vp').getBoundingClientRect();
  _pdox=(e.clientX-vp.left-px)/pz-parseInt(_pdrag.style.left||0);
  _pdoy=(e.clientY-vp.top-py)/pz-parseInt(_pdrag.style.top||0);
  document.onmousemove=cvDM;document.onmouseup=cvDE;
}
function cvDM(e){
  if(!_pdrag)return;
  var vp=document.getElementById('plan-vp').getBoundingClientRect();
  var x=Math.round(((e.clientX-vp.left-px)/pz-_pdox)/10)*10;
  var y=Math.round(((e.clientY-vp.top-py)/pz-_pdoy)/10)*10;
  var ox=x-parseInt(_pdrag.style.left||0);
  var oy=y-parseInt(_pdrag.style.top||0);
  _pdrag.style.left=Math.max(0,x)+'px';_pdrag.style.top=Math.max(0,y)+'px';
  // Move other selected elements by same delta
  if(SEL_IDS.size>1){
    var mainId=_pdrag.dataset.id;
    SEL_IDS.forEach(function(sid){
      if(sid===mainId)return;
      var se=document.getElementById('cva-'+sid);if(!se)return;
      var nx=Math.max(0,parseInt(se.style.left||0)+ox);
      var ny=Math.max(0,parseInt(se.style.top||0)+oy);
      se.style.left=nx+'px';se.style.top=ny+'px';
    });
  }
}
function cvDE(){
  if(!_pdrag)return;
  // Save all moved items
  SEL_IDS.forEach(function(sid){
    var se=document.getElementById('cva-'+sid);
    var it=PLAN.items.find(function(i){return i.id===sid;});
    if(se&&it){it.x=parseInt(se.style.left||0);it.y=parseInt(se.style.top||0);}
  });
  _pdrag=null;spl();document.onmousemove=null;document.onmouseup=null;
}

function rzStart(e,id){
  if(PLAN_LOCKED)return;
  e.stopPropagation();e.preventDefault();
  _rz=document.getElementById('cva-'+id);_rzid=id;
  _rzsx=e.clientX;_rzsy=e.clientY;_rzw=_rz.offsetWidth;_rzh=_rz.offsetHeight;
  document.onmousemove=rzMove;document.onmouseup=rzEnd;
}
function rzMove(e){
  if(!_rz)return;
  var nw=Math.max(80,Math.round((_rzw+(e.clientX-_rzsx)/pz)/10)*10);
  var nh=Math.max(40,Math.round((_rzh+(e.clientY-_rzsy)/pz)/10)*10);
  _rz.style.width=nw+'px';
  var it=PLAN.items.find(function(i){return i.id===_rzid;});
  if(it){it.w=nw;if(_rz.dataset.type!=='allee'){_rz.style.height=nh+'px';it.h=nh;}}
}
function rzEnd(){_rz=null;spl();document.onmousemove=null;document.onmouseup=null;}

function ppStart(e){
  if(_pdrag||_rz)return;
  // Pan when target is empty canvas area
  var tgt=e.target;
  var isCanvas=tgt.id==='plan-vp'||tgt.id==='plan-cv'||
    (tgt.closest&&!tgt.closest('.cva')&&!tgt.closest('.cv-pal')&&!tgt.closest('.cv-chem')&&!tgt.closest('.cv-wall')&&!tgt.closest('.cv-txt'));
  if(!isCanvas)return;
  SEL_IDS.forEach(function(sid){var se=document.getElementById('cva-'+sid);if(se)se.classList.remove('sel');});
  SEL_IDS.clear();
  _panning=true;_psx=e.clientX;_psy=e.clientY;_psox=px;_psoy=py;
  document.getElementById('plan-vp').style.cursor='grabbing';
}
function ppMove(e){if(!_panning)return;px=_psox+(e.clientX-_psx);py=_psoy+(e.clientY-_psy);applyT();}
function ppEnd(){if(!_panning)return;_panning=false;document.getElementById('plan-vp').style.cursor='default';PLAN.ox=px;PLAN.oy=py;spl();}
function pWheel(e){
  e.preventDefault();
  var vp=document.getElementById('plan-vp').getBoundingClientRect();
  var mx=e.clientX-vp.left,my=e.clientY-vp.top;
  var d=e.deltaY<0?1.12:0.89;
  var nz=Math.min(4,Math.max(0.15,pz*d));
  px=mx-(mx-px)*(nz/pz);py=my-(my-py)*(nz/pz);pz=nz;applyT();
}
function pZi(){pz=Math.min(4,pz*1.2);applyT();}
function pZo(){pz=Math.max(0.15,pz/1.2);applyT();}
function pZr(){pz=1;px=60;py=60;applyT();}
function pCenter(){
  var vp=document.getElementById('plan-vp');
  if(!vp)return;
  var vw=vp.offsetWidth,vh=vp.offsetHeight;
  // Center on middle of all placed items
  if(PLAN.items.length>0){
    var xs=PLAN.items.map(function(i){return i.x||0;});
    var ys=PLAN.items.map(function(i){return i.y||0;});
    var mx=(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2;
    var my=(Math.min.apply(null,ys)+Math.max.apply(null,ys))/2;
    px=vw/2-mx*pz; py=vh/2-my*pz;
  }else{
    px=vw/2; py=vh/2;
  }
  applyT();
}

function pWheel(e){
  e.preventDefault();
  // Two-finger trackpad: pan with deltaX/deltaY
  px-=e.deltaX;
  py-=e.deltaY;
  applyT();
}
function applyT(){
  var cv=document.getElementById('plan-cv');if(!cv)return;
  cv.style.transform='translate('+px+'px,'+py+'px) scale('+pz+')';
  var l=document.getElementById('pzl');if(l)l.textContent=Math.round(pz*100)+'%';
  PLAN.zoom=pz;PLAN.ox=px;PLAN.oy=py;spl();
}
function rotItem(id){
  if(PLAN_LOCKED)return;
  var el=document.getElementById('cva-'+id);if(!el)return;
  var it=PLAN.items.find(function(i){return i.id===id;});if(!it)return;
  if(it.type==='allee'){
    it.rotated=!it.rotated;
    el.style.transform=it.rotated?'rotate(90deg)':'';
    el.style.transformOrigin=it.rotated?'top left':'';
  }else{
    it.rot=(it.rot||0)+90;
    if(it.rot>=360)it.rot=0;
    el.style.transform=it.rot?'rotate('+it.rot+'deg)':'';
    el.style.transformOrigin='center';
  }
  spl();
}
function rmItem(id,an){
  if(PLAN_LOCKED)return;
  PLAN.items=PLAN.items.filter(function(i){return i.id!==id;});spl();
  var el=document.getElementById('cva-'+id);if(el)el.remove();
  if(an){var sbi=document.getElementById('sbi-'+an);if(sbi)sbi.classList.remove('placed');}
}
function updItem(id,k,v){var it=PLAN.items.find(function(i){return i.id===id;});if(it)it[k]=v;spl();}
function clearPlan(){if(!confirm('Vider le plan ?'))return;PLAN.items=[];spl();rPlan();}
function goAllee(a){CUR=a;S.set('cur4',a);T('allee');}

/* ══ ALLÉE ══════════════════════════════════════════════════════════ */
function toggleFilter(t){
  if(ALLEE_FILTERS.includes(t))ALLEE_FILTERS=ALLEE_FILTERS.filter(function(x){return x!==t;});
  else ALLEE_FILTERS.push(t);
  saf();rAllee();
}
function clearFilters(){ALLEE_FILTERS=[];saf();rAllee();}

function rAllee(){
  var el=document.getElementById('allee-page');
  var allees=[...new Set(P.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
  if(!CUR||!allees.includes(CUR))CUR=allees[0];
  var prods=P.filter(function(p){return p.a===CUR;});
  var na=prods.filter(function(p){return ALERTS[p.id];}).length;
  var etags=[...new Set(prods.map(function(p){return p.et;}))].sort(function(a,b){return a-b;});
  var imp=etags.filter(function(e){return e%2===1;}).sort(function(a,b){return a-b;});
  var par=etags.filter(function(e){return e%2===0;}).sort(function(a,b){return a-b;});
  var nivs=[...new Set(prods.map(function(p){return p.nv;}))].sort(function(a,b){return a-b;});
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};

  var top='<div id="allee-top">';
  top+='<select onchange="CUR=+this.value;S.set(\x27cur4\x27,CUR);rAllee()" style="border:1px solid var(--border);border-radius:var(--r6);padding:4px 8px;font-size:13px;background:#fff">';
  allees.forEach(function(a){top+='<option value="'+a+'"'+(a===CUR?' selected':'')+'>'+a+' — '+zone(a)+'</option>';});
  top+='</select>';
  top+='<span style="font-size:11px;color:var(--text3)">'+prods.length+' produits</span>';
  if(na)top+='<span class="bdg">'+na+' alertes</span>';
  top+='<select id="dsp-sel" onchange="rAllee()" style="border:1px solid var(--border);border-radius:var(--r6);padding:3px 7px;font-size:11px">';
  top+='<option value="">Tous statuts</option>';
  ['order','unavailable','standalone','archived'].forEach(function(v){top+='<option value="'+v+'">'+v+'</option>';});
  top+='</select>';
  top+='<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-left:4px">';
  top+='<span style="font-size:10px;color:var(--text3)">Filtres:</span>';
  ['M','D','S','R','A'].forEach(function(t){
    var on=ALLEE_FILTERS.includes(t);
    top+='<span class="flt-btn'+(on?' on':'')+'" onclick="toggleFilter(\x27'+t+'\x27)">'+AT[t]+'</span>';
  });
  top+='<span class="flt-btn'+(ALLEE_FILTERS.length===0?' on':'')+'" onclick="clearFilters()">TOUT</span>';
  top+='</div></div>';

  el.innerHTML=top+'<div id="allee-body">'+mkAlleeTable(CUR,prods,imp,par,nivs)+'</div>';
}

function mkAlleeTable(a,prods,imp,par,nivs){
  if(!imp.length&&!par.length)return'<div style="padding:20px;color:var(--text3)">Aucune étagère.</div>';
  var _allEtSet=[...new Set([...imp,...par,...prods.map(function(p){return p.et;})])].sort(function(a,b){return a-b;});
  var _imp2=_allEtSet.filter(function(e){return e%2===1;});
  var _par2=_allEtSet.filter(function(e){return e%2===0;});
  var allEt=_imp2.concat(_par2);
  // Global max position for ALL étagères - ensures alignment
  var _maxP=Math.max(3,...prods.map(function(p){return p.p;}));
  var h='<table class="at"><thead><tr><th class="corner" rowspan="2">Étage</th>';
  if(_imp2.length)h+='<th colspan="'+(_imp2.length*_maxP)+'" class="et-hd" style="background:#fffde7;color:#f57f17;border:1px solid #ffe082">Étagères impaires</th>';
  if(_par2.length)h+='<th colspan="'+(_par2.length*_maxP)+'" class="et-hd" style="background:#f1f8e9;color:#388e3c;border:1px solid #a5d6a7">Étagères paires</th>';
  h+='</tr><tr>';
  allEt.forEach(function(et){
    var bg=et%2===1?'#fffde7':'#f1f8e9';var bc=et%2===1?'#ffe082':'#a5d6a7';
    h+='<th colspan="'+_maxP+'" class="et-sep" style="background:'+bg+';color:'+(et%2===1?'#f57f17':'#388e3c')+';border:1px solid '+bc+'">'+a+'.'+et
      +'&nbsp;<button class="btn xs" style="font-size:9px;padding:0 3px" onclick="printEtiquettes('+a+','+et+')">🖨</button></th>';
  });
  h+='</tr></thead><tbody>';
  nivs.forEach(function(nv){
    var rowPs=prods.filter(function(p){return p.nv===nv;});
    var rowAl=rowPs.filter(function(p){return ALERTS[p.id];}).length;
    h+='<tr><td class="rhd"><div class="rhd-inner"><span class="rhd-lbl">'+(nv*10)+'x</span>';
    if(rowAl)h+='<span class="rhd-al">⚠'+rowAl+'</span>';
    h+='</div></td>';
    allEt.forEach(function(et){
      var bg=et%2===1?'#fffde7':'#f1f8e9';
      var fams=getNvFams(a,nv);
      var cellBg=fams.length?fb(fams[0]):bg;
      var cellBrd=fams.length?fc(fams[0])+'44':'transparent';
    var allPos=[];for(var _pi=1;_pi<=_maxP;_pi++)allPos.push(_pi);
    allPos.forEach(function(pos){
        var code=a+'.'+et+'.'+(nv*10+pos);
        var vkey=a+'_'+et+'_'+nv;
        var done=VALID[vkey];
        var cell=rowPs.filter(function(p){return p.et===et&&p.p===pos;});
        var etSepClass=pos===1?' class="et-sep"':'';
        h+='<td'+etSepClass+' style="background:'+cellBg+';border-left:'+(pos===1?'3px solid var(--border2)':'1px solid '+cellBrd)+'">';
        h+='<div class="ci" ondragover="ciDragOver(event)" ondragleave="ciDragLeave(event)" ondrop="ciDrop(event,'+a+','+et+','+nv+','+pos+')">';
        h+='<div style="display:flex;align-items:center;gap:2px;margin-bottom:1px">';
        h+='<span class="cc">'+code+'</span>';
        h+='<button class="vbtn'+(done?' done':'')+'" onclick="tValid(\x27'+vkey+'\x27)">'+(done?'✓ ':' ')+'OK</button>';
        h+='</div>';
        cell.forEach(function(p){h+=mkPE(p,done);});
        if(!cell.length)h+='<span style="font-size:8px;color:var(--text3)">—</span>';
        h+='</div></td>';
      });
    });
    h+='</tr>';
  });
  return h+'</tbody></table>';
}

function mkPE(p,parentDone){
  var al=ALERTS[p.id]||[];
  var _dspF=(document.getElementById('dsp-sel')||{}).value||'';
  if(_dspF&&(p.dsp||'order')!==_dspF)return'';
  if(ALLEE_FILTERS.length>0){
    var alTypes=al.map(function(a){return a.t;});
    if(!ALLEE_FILTERS.some(function(f){return alTypes.includes(f);}))return'';
  }
  var hasCrit=al.some(function(a){return a.t==='S';});
  var ideal=Math.max(1,Math.ceil(p.q/Math.max(p.c,1)));
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var dest=SORTIR[p.id]||'';
  var html='<div class="pe'+(hasCrit?' c':al.length?' w':'')+' '+(parentDone?'v':'')+'" id="pe-'+p.id+'" draggable="true" ondragstart="peDragStart(event,'+p.id+')" ondragend="peDragEnd(event)">';
  html+='<div class="pe-top"><span class="fam f'+p.f+'" style="cursor:pointer" onclick="openFiche('+p.id+')" title="Ouvrir la fiche">'+p.f+'</span>';
  html+='<a class="pe-nm" href="https://products.app.deleev.com/products/'+p.id+'?tab=stock" target="_blank">'+p.n+'</a></div>';
  html+='<div class="pe-mt"><span>Idéal: <b>'+ideal+' colis</b></span><span>·</span><span>QI '+p.q+'</span><span>·</span><span>Colis '+p.c+'</span>';
  if(p.st>0)html+='<span style="color:var(--g)">St '+p.st+'</span>';
  html+='</div>';
  if(al.length){
    html+='<div class="pe-al">';
    al.forEach(function(a){html+='<span class="al a'+a.t+'" title="'+a.m+'">'+AT[a.t]+'</span>';});
    html+='</div>';
  }
  html+='<div class="pe-ac"><button class="btn xs" onclick="tEAN('+p.id+',\x27'+String(p.bc).replace(/\.0$/,'').replace(/'/g,'')+'\x27)"  >EAN ▾</button>';
  if(al.some(function(a){return a.t==='S';}))html+='<button class="btn xs bad" onclick="tSortir('+p.id+')">📤'+(dest?' → '+dest:'')+'</button>';
  html+='<button class="btn xs" style="background:var(--abg);color:var(--accent)" onclick="openRezone('+p.id+')">📍 Rezonage</button>';
  html+='</div>';
  html+='<div class="ean-w" id="ean-'+p.id+'"></div>';
  if(al.some(function(a){return a.t==='S';})){
    html+='<div class="sr" id="sr-'+p.id+'"><input class="si" placeholder="Allée cible" value="'+dest+'" oninput="SORTIR['+p.id+']=this.value;ss()"><button class=\"btn xs pri\" onclick=\"closeSr('+p.id+')\" >✓</button></div>';
  }
  html+='</div>';
  return html;
}

function tValid(k){
  VALID[k]=!VALID[k];sv();
  computeAlerts();updateBadge();
  // Refresh allée if active
  var sb=document.getElementById('allee-body');
  if(sb){var sy=sb.scrollTop;var sx=sb.scrollLeft;rAllee();var sb2=document.getElementById('allee-body');if(sb2){sb2.scrollTop=sy;sb2.scrollLeft=sx;}}
  // Refresh dash if active - scroll-preserving
  var dp=document.getElementById('dash-page');
  if(dp&&dp.classList.contains('active')){var sy2=dp.scrollTop;rDash();dp.scrollTop=sy2;}
}
function tEAN(id,val){
  var w=document.getElementById('ean-'+id);if(!w)return;
  w.classList.toggle('open');
  if(w.classList.contains('open')&&!w.dataset.drawn){
    var code=String(val).replace(/\.0$/,'').trim();
    if(code&&code.length>=4){
      var url='https://barcode.tec-it.com/barcode.ashx?data='+encodeURIComponent(code)+'&code=EAN13&translate-esc=on&unit=fit&dpi=96&imagetype=png&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=mm&quiet=0';
      var img=document.createElement('img');img.src=url;img.style.cssText='max-width:100%;height:auto;border-radius:3px;display:block';img.onerror=function(){w.innerHTML='<span style="font-size:9px">EAN: '+code+'</span>';};w.innerHTML='';w.appendChild(img);
      w.dataset.drawn='1';
    }else{w.innerHTML='<span style="font-size:9px;color:var(--text3)">EAN non dispo</span>';}
  }
}

function printEtiquettes(a,et){
  var prods=P.filter(function(p){return p.a===a&&p.et===et;});
  if(!prods.length){showToast('Aucun produit sur cette etagere');return;}
  var zones=[...new Set(prods.map(function(p){return p.nv*10+p.p;}))].sort(function(a,b){return a-b;});
  function pad(n,l){return String(n).padStart(l,'0');}

  function code128svg(text){
    var enc=['11011001100','11001101100','11001100110','10010011000','10010001100','10001001100','10011001000','10011000100','10001100100','11001001000','11001000100','11000100100','10110011100','10011011100','10011001110','10111001100','10011101100','10011100110','11001110010','11001011100','11001001110','11011100100','11001110100','11101101110','11101001100','11100101100','11100100110','11101100100','11100110100','11100110010','11011011000','11011000110','11000110110','10100011000','10001011000','10001000110','10110001000','10000101100','10000100110','10110010000','10000010110','10000110100','11000010010','11001010000','11110111010','11000010100','10001111010','10100111100','10010111100','10010011110','10111100100','10011110100','10011110010','11110100100','11110010100','11110010010','11011110100','11011110010','11110110010','10101111000','10100011110','10001011110','10111101000','10111100010','11110101000','11110100010','10111011110','10111101110','11101011110','11110101110','11010000100','11010010000','11010011100','11000111010','11010111000','10000100100','10100010000','10010100000','10000101000','10000100010','10001010000','10001000010','10100000010','10010000010','11010000010','11000010110','10001011100','11010001100','11010001110','11010111110','11101111010','11010100110','10110111100','10110111110','10001101110','10111011000','10111011110','10011110110','10011101110','11110110100','11110110010','11001010110','11001010010','11010110110','11010110010','11001110110','11001110010','10111001110','11011011110'];
    var codes=[104],chk=104;
    for(var i=0;i<text.length;i++){var v=text.charCodeAt(i)-32;codes.push(v);chk+=(i+1)*v;}
    codes.push(chk%103);codes.push(106);
    var bars='';codes.forEach(function(c){bars+=enc[c]||'';});bars+='11';
    var W=bars.length;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block">';
    var x=0,i=0;
    while(i<bars.length){var ch=bars[i],w=0;while(i<bars.length&&bars[i]===ch){w++;i++;}if(ch==='1')svg+='<rect x="'+x+'" y="0" width="'+w+'" height="100" fill="#000"/>';x+=w;}
    return svg+'</svg>';
  }

  var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiquettes '+a+'.'+et+'</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial;padding:8mm;background:#fff}'
    +'@media print{.noprint{display:none}body{padding:4mm}}'
    +'.ctrl{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px}'
    +'.ctrl input[type=range]{width:140px}'
    +'.ctrl span{min-width:36px;font-weight:bold}'
    +'.row{display:flex;gap:8px;margin-bottom:6px;page-break-inside:avoid}'
    +'.lbl{flex:1;border:3px solid #000;border-radius:6px;padding:8px 12px;display:flex;align-items:center;gap:10px}'
    +'</style></head><body>'

    +'<div class="noprint" style="background:#f5f5f5;border-radius:8px;padding:14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">'
    +'<div>'
    +'<div class="ctrl"><label>Taille chiffres/flèches</label><input type="range" min="16" max="80" value="44" oninput="setTxt(+this.value)"><span id="vTxt">44px</span></div>'
    +'<div class="ctrl"><label>Hauteur code-barre</label><input type="range" min="30" max="200" value="90" oninput="setBc(+this.value)"><span id="vBc">90px</span></div>'
    +'<div class="ctrl"><label>Par ligne</label><input type="range" min="1" max="4" step="1" value="1" oninput="setCols(+this.value)"><span id="vCols">1</span></div>'
    +'</div>'
    +'<button onclick="window.print()" style="padding:8px 18px;font-size:14px;cursor:pointer;background:#1e3a5f;color:#fff;border:none;border-radius:6px">&#128424; Imprimer</button>'
    +'<span style="font-size:11px;color:#666">'+zones.length+' étiquettes — '+a+'.'+et+'</span>'
    +'</div>'

    +'<div id="etiq">'
    + (function(){
        var rows='';
        for(var i=0;i<zones.length;i+=1){
          var etg=zones[i];
          var code=pad(a,4)+'-'+pad(et,4)+'-'+pad(etg,4);
          var lbl=a+'.'+et+'.'+etg;
          rows+='<div class="row"><div class="lbl" style="height:110px">'
            +'<span class="arr" style="font-size:44px;font-weight:900;color:#cc0000;line-height:1;flex-shrink:0">&#8679;</span>'
            +'<span class="cod" style="font-size:44px;font-weight:900;color:#cc0000;letter-spacing:2px;white-space:nowrap;flex-shrink:0">'+lbl+'</span>'
            +'<div class="bcd" style="flex:1;height:90px">'+code128svg(code)+'</div>'
            +'<span class="arr" style="font-size:44px;font-weight:900;color:#cc0000;line-height:1;flex-shrink:0">&#8679;</span>'
            +'</div></div>';
        }
        return rows;
      })()
    +'</div>'

    +'<script>'
    +'function setTxt(v){'
    +'  document.getElementById("vTxt").textContent=v+"px";'
    +'  document.querySelectorAll(".arr,.cod").forEach(function(e){e.style.fontSize=v+"px";});'
    +'  document.querySelectorAll(".lbl").forEach(function(e){e.style.height=(v*2.5)+"px";});'
    +'  document.querySelectorAll(".bcd").forEach(function(e){e.style.height=(v*2)+"px";});'
    +'}'
    +'function setBc(v){'
    +'  document.getElementById("vBc").textContent=v+"px";'
    +'  document.querySelectorAll(".bcd").forEach(function(e){e.style.height=v+"px";});'
    +'  document.querySelectorAll(".lbl").forEach(function(e){e.style.height=(v+20)+"px";});'
    +'}'
    +'function setCols(v){'
    +'  document.getElementById("vCols").textContent=v;'
    +'  var rows=document.querySelectorAll(".row");'
    +'  var i=0;'
    +'  while(i<rows.length){rows[i].style.display="none";i++;}'
    +'  var lbls=document.querySelectorAll(".lbl");'
    +'  var chunks=[];'
    +'  for(var j=0;j<lbls.length;j+=v)chunks.push([].slice.call(lbls,j,j+v));'
    +'  var etiq=document.getElementById("etiq");'
    +'  etiq.innerHTML="";'
    +'  chunks.forEach(function(chunk){'
    +'    var row=document.createElement("div");row.className="row";'
    +'    chunk.forEach(function(l){row.appendChild(l);});'
    +'    etiq.appendChild(row);'
    +'  });'
    +'}'
    +'window.onload=function(){upd();};'+'<\/script>'
    +'</body></html>';

  var blob=new Blob([html],{type:'text/html'});
  var burl=URL.createObjectURL(blob);
  var a2=document.createElement('a');a2.href=burl;a2.target='_blank';a2.click();
  setTimeout(function(){URL.revokeObjectURL(burl);},10000);
}
function openRezone(id){
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var pts=p.z.split('.');var a0=pts[0]||'',et0=pts[1]||'',etg0=pts[2]||'';
  var old=p.z;
  var m=document.createElement('div');
  m.id='rz-modal';
  m.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  m.innerHTML='<div style="background:#fff;border-radius:12px;padding:20px 24px;width:340px;box-shadow:0 8px 32px rgba(0,0,0,.2)">'
    +'<div style="font-size:14px;font-weight:700;margin-bottom:4px">📍 Rezonage</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-bottom:3px">'+p.n.slice(0,55)+'</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-bottom:14px">Actuel: <b style="color:var(--accent)">'+old+'</b></div>'
    +'<div style="display:flex;gap:8px;margin-bottom:16px">'
    +'<div style="flex:1"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Allée</label>'
    +'<input id="rz-a" type="number" value="'+a0+'" style="width:100%;border:1px solid var(--border2);border-radius:6px;padding:6px 8px;font-size:14px;font-weight:700;text-align:center"></div>'
    +'<div style="flex:1"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Étagère</label>'
    +'<input id="rz-et" type="number" value="'+et0+'" style="width:100%;border:1px solid var(--border2);border-radius:6px;padding:6px 8px;font-size:14px;font-weight:700;text-align:center"></div>'
    +'<div style="flex:1"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Étage</label>'
    +'<input id="rz-etg" type="number" value="'+etg0+'" style="width:100%;border:1px solid var(--border2);border-radius:6px;padding:6px 8px;font-size:14px;font-weight:700;text-align:center"></div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end">'
    +'<button class="btn" onclick="document.getElementById(\x27rz-modal\x27).remove()">Annuler</button>'
    +'<button class="btn pri" onclick="confirmRezone('+id+')">✓ Valider</button>'
    +'</div></div>';
  document.body.appendChild(m);
  setTimeout(function(){var el=document.getElementById('rz-a');if(el)el.focus();},50);
}
function confirmRezone(id){
  var a=+document.getElementById('rz-a').value;
  var et=+document.getElementById('rz-et').value;
  var etg=+document.getElementById('rz-etg').value;
  if(!a||!et||!etg){showToast('Remplir tous les champs');return;}
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var oldZ=p.z;
  p.a=a;p.et=et;p.nv=Math.floor(etg/10);p.p=etg%10;p.z=a+'.'+et+'.'+etg;
  var m=document.getElementById('rz-modal');if(m)m.remove();
  showToast('Rezoné: '+oldZ+' → '+p.z);
  computeAlerts();updateBadge();
  var sb=document.getElementById('allee-body');
  var sy=sb?sb.scrollTop:0;var sx=sb?sb.scrollLeft:0;
  rAllee();
  var sb2=document.getElementById('allee-body');
  if(sb2){sb2.scrollTop=sy;sb2.scrollLeft=sx;}
}
function closeSr(id){var el=document.getElementById('sr-'+id);if(el)el.classList.remove('open');}
function tSortir(id){var el=document.getElementById('sr-'+id);if(el)el.classList.toggle('open');}

var _dragProdId=null;
function peDragStart(e,id){_dragProdId=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(id));setTimeout(function(){var el=document.getElementById('pe-'+id);if(el)el.style.opacity='.4';},0);}
function peDragEnd(e){_dragProdId=null;document.querySelectorAll('.ci').forEach(function(c){c.classList.remove('drag-over');});if(e.target&&e.target.style)e.target.style.opacity='';}
function ciDragOver(e){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('drag-over');}
function ciDragLeave(e){e.currentTarget.classList.remove('drag-over');}
function ciDrop(e,a,et,nv,pos){
  e.preventDefault();e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
  if(!_dragProdId)return;
  var id=_dragProdId;_dragProdId=null;
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var oldZ=p.z;
  p.a=a;p.et=et;p.nv=nv;p.p=pos;p.z=a+'.'+et+'.'+(nv*10+pos);
  showToast('Déplacé: '+oldZ+' → '+p.z);
  computeAlerts();updateBadge();rAllee();
}
function showToast(msg){
  var t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;bottom:20px;right:20px;background:#1a1d2e;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .3s';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';clearTimeout(t._to);t._to=setTimeout(function(){t.style.opacity='0';},2500);
}

/* ══ PARAMS ══════════════════════════════════════════════════════════ */
function rParams(){
  computeAlerts();
  var el=document.getElementById('params-page');
  var allees=[...new Set(P.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
  var maxNv=11;var nvs=Array.from({length:maxNv},function(_,i){return i+1;});
  var fams=['N','H','L','U','E','K','P','V','C','B','A','Z'];
  var zoneNames=[...new Set(P.map(function(p){return zone(p.a);}))].sort();

  var tvHtml='<div style="margin-bottom:20px"><div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--text2)">Classification ABC / Pareto par zone</div>';
  tvHtml+='<div style="font-size:11px;color:var(--text3);margin-bottom:12px">Produits triés par QI décroissant — somme cumulée détermine la classe A, B ou C.</div>';
  tvHtml+='<div style="display:flex;flex-direction:column;gap:24px">';
  zoneNames.forEach(function(z){
    var cfg=getTVMV(z);
    var zP=P.filter(function(p){return zone(p.a)===z;});
    var rk=[...zP].filter(function(p){return p.q>1;}).sort(function(a,b){return b.q-a.q;});
    var totalQI=rk.reduce(function(s,p){return s+p.q;},0);
    var cumul=0,nA=0,nB=0,qA=0,qB=0,qC=0;
    rk.forEach(function(p){cumul+=p.q;var pct=cumul/totalQI*100;if(pct<=cfg.abcA){nA++;qA+=p.q;}else if(pct<=cfg.abcB){nB++;qB+=p.q;}else qC+=p.q;});
    var nC=rk.length-nA-nB+zP.filter(function(p){return p.q<=1;}).length;
    var pA=totalQI?Math.round(qA/totalQI*100):0,pB=totalQI?Math.round(qB/totalQI*100):0,pC=100-pA-pB;
    var col=ZC[z]||'#999';
    tvHtml+='<div class="tvmv-card">';
    tvHtml+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
    tvHtml+='<span style="font-size:13px;font-weight:700;color:'+col+'">'+z+'</span>';
    tvHtml+='<span style="font-size:10px;color:var(--text3)">'+zP.length+' produits</span>';
    tvHtml+='<label style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:11px"><input type="checkbox" '+(cfg.enabled?'checked':'')+' onchange="updTVMV(\''+z+'\',\'enabled\',this.checked)"> Actif</label>';
    tvHtml+='</div>';
    tvHtml+='<div style="display:flex;height:18px;border-radius:4px;overflow:hidden;margin-bottom:5px">';
    tvHtml+='<div style="width:'+pA+'%;background:var(--g);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">A</div>';
    tvHtml+='<div style="width:'+pB+'%;background:var(--o);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">B</div>';
    tvHtml+='<div style="width:'+pC+'%;background:var(--r);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">C</div>';
    tvHtml+='</div>';
    tvHtml+='<div style="display:flex;gap:8px;font-size:10px;margin-bottom:10px">';
    tvHtml+='<span style="color:var(--g)"><b>A</b> '+nA+' ('+pA+'%)</span><span style="color:var(--o)"><b>B</b> '+nB+' ('+pB+'%)</span><span style="color:var(--r)"><b>C</b> '+nC+' ('+pC+'%)</span>';
    tvHtml+='</div>';
    tvHtml+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    tvHtml+='<div style="background:var(--gbg);border:1px solid var(--gbrd);border-radius:var(--r6);padding:8px">';
    tvHtml+='<div style="font-size:10px;font-weight:700;color:var(--g);margin-bottom:5px">A → proche chemin</div>';
    tvHtml+='<div style="display:flex;align-items:center;gap:4px;font-size:11px;margin-bottom:4px">Seuil: <input type="number" min="1" max="99" value="'+cfg.abcA+'" style="width:48px;border:1px solid var(--gbrd);border-radius:3px;padding:1px 4px;font-size:11px" onchange="updTVMV(\''+z+'\',\'abcA\',+this.value)"> %</div>';
    tvHtml+='<div style="font-size:9px;color:var(--g);margin-top:3px">QI ≥ '+(rk[nA-1]?rk[nA-1].q:0)+'</div></div>';
    tvHtml+='<div style="background:var(--rbg);border:1px solid var(--rbrd);border-radius:var(--r6);padding:8px">';
    tvHtml+='<div style="font-size:10px;font-weight:700;color:var(--r);margin-bottom:5px">C → fond d\'allée</div>';
    tvHtml+='<div style="display:flex;align-items:center;gap:4px;font-size:11px;margin-bottom:4px">Seuil: <input type="number" min="1" max="100" value="'+cfg.abcB+'" style="width:48px;border:1px solid var(--rbrd);border-radius:3px;padding:1px 4px;font-size:11px" onchange="updTVMV(\''+z+'\',\'abcB\',+this.value)"> %</div>';
    tvHtml+='<div style="font-size:9px;color:var(--r);margin-top:3px">QI ≤ '+(rk[nA+nB]?rk[nA+nB].q:0)+'</div></div>';
    // D seuils
    tvHtml+='<div style="background:#f3e8ff;border:1px solid #d8b4fe;border-radius:var(--r6);padding:8px;margin-top:8px">';
    tvHtml+='<div style="font-size:10px;font-weight:700;color:#6b3fa0;margin-bottom:6px">D — Faible rotation (sous-partie de C)</div>';
    tvHtml+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
    tvHtml+='<span style="font-size:11px;color:#6b3fa0">QI ≤ <input type="number" min="0" max="99" value="'+cfg.dQI+'" style="width:44px;border:1px solid #d8b4fe;border-radius:3px;padding:1px 4px;font-size:11px" onchange="updTVMV(\''+z+'\',\'dQI\',+this.value)"></span>';
    tvHtml+='<span style="font-size:11px;color:#6b3fa0">Colis ≤ <input type="number" min="0" max="99" value="'+cfg.dColis+'" style="width:44px;border:1px solid #d8b4fe;border-radius:3px;padding:1px 4px;font-size:11px" onchange="updTVMV(\''+z+'\',\'dColis\',+this.value)"></span>';
    var _nD=zP.filter(function(p){var ri=rk.findIndex(function(r){return r.id===p.id;});return p.q>0&&p.q<=cfg.dQI&&(p.c||1)<=cfg.dColis&&(ri>=nA+nB||p.q<=1);}).length;
    tvHtml+='<span style="font-size:11px;color:#6b3fa0;font-weight:600">'+_nD+' produits</span>';
    tvHtml+='</div></div>';
    tvHtml+='</div>';
    tvHtml+='<div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:5px">Composition par classe</div>';
    tvHtml+='<div style="display:flex;flex-direction:column;gap:3px">';
    [['A',rk.slice(0,nA),'var(--g)','var(--gbg)'],['B',rk.slice(nA,nA+nB),'var(--o)','var(--obg)'],['C',zP.filter(function(p){return P_ABC[p.id]==='C';}),'var(--r)','var(--rbg)'],['D',zP.filter(function(p){return P_ABC[p.id]==='D';}),'#6b3fa0','#f3e8ff']].forEach(function(cls){
      var fb={};cls[1].forEach(function(p){fb[p.f]=(fb[p.f]||0)+1;});var cnt=cls[1].length;
      tvHtml+='<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;background:'+cls[3]+';border-radius:5px">';
      tvHtml+='<span style="font-weight:800;color:'+cls[2]+';min-width:14px;font-size:12px">'+cls[0]+'</span>';
      tvHtml+='<span style="font-size:10px;color:var(--text3);min-width:55px">'+cnt+' prod.</span>';
      tvHtml+='<div style="display:flex;gap:2px;flex-wrap:wrap">';
      Object.entries(fb).sort(function(a,b){return b[1]-a[1];}).slice(0,8).forEach(function(fe){
        var fp=Math.round(fe[1]/cnt*100);
        tvHtml+='<span class="fam f'+fe[0]+'" style="font-size:8px;padding:0 3px;cursor:pointer" onclick="showAbcList(\''+z+'\',\''+cls[0]+'\',\''+fe[0]+'\')">'+fe[0]+' '+fp+'%</span>';
      });
      tvHtml+='</div></div>';
    });
    tvHtml+='</div>';
    // ── Tableau ABC allée × étagère pour cette zone ──────────────
    var zAllees2=[...new Set(zP.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
    var zEts=[...new Set(zP.map(function(p){return p.et;}))].sort(function(a,b){return a-b;});
    tvHtml+='<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">';
    tvHtml+='<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">ABC par allée × étagère <span style="font-size:10px;font-weight:400;color:var(--text3)">— cliquer pour assigner, cliquer sur le n° d\'allée pour détailler par étage</span></div>';
    tvHtml+='<div style="overflow-x:auto"><table class="pt"><thead><tr>';
    tvHtml+='<th class="corner">Allée</th>';
    zEts.forEach(function(et){tvHtml+='<th style="min-width:46px">Ét.'+et+'</th>';});
    tvHtml+='</tr></thead><tbody>';
    zAllees2.forEach(function(a){
      var col2=zc(a);
      tvHtml+='<tr><td class="rh" style="border-left:3px solid '+col2+';cursor:pointer;color:var(--accent);font-size:12px" onclick="openAbcDetail('+a+')" title="Config par étage">'+a+'</td>';
      zEts.forEach(function(et){
        var cur=(ABC_POS[a]&&ABC_POS[a][et]&&ABC_POS[a][et][0])||'';
        tvHtml+='<td><div class="fc">';
        ['A','B','C'].forEach(function(v){
          tvHtml+='<span class="ft'+(cur===v?' on-'+v:'')+'" style="font-size:9px;padding:1px 3px" onclick="tAbcPos('+a+','+et+',0,\''+v+'\',this)">'+v+'</span>';
        });
        tvHtml+='</div></td>';
      });
      tvHtml+='</tr>';
    });
    tvHtml+='</tbody></table></div></div></div>';
    var _dP2=zP.filter(function(p){var ri=rk.findIndex(function(r){return r.id===p.id;});return p.q>0&&p.q<=6&&(p.c||1)<=6&&(ri>=nA+nB||p.q<=1);});
    if(_dP2.length>0){
      tvHtml+='<div style="margin-top:8px;padding:0 4px 4px">';
      tvHtml+='<button class="btn" style="width:100%;background:#f3e8ff;color:#6b3fa0;border-color:#d8b4fe;font-size:11px" onclick="showDProds(\''+z+'\')">';
      tvHtml+='📋 Voir les '+_dP2.length+' produits D — '+z+'</button>';
      tvHtml+='</div>';
    }
  });
  tvHtml+='</div></div>';
  var h='';
  h+='<div style="padding:10px 14px;border-bottom:1px solid var(--border);background:#fff;flex-shrink:0">';
  h+='<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:8px">Légende des familles</div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
  var FAM_LABELS={N:'Nourriture',H:'Hygiène/Entretien',L:'Boissons/Alcool',U:'Ustensiles',E:'Épices/Condiments',K:'Consommables cuisine',C:'Couches',B:'Bébé',A:'Animaux',P:'Pâtes/Riz',V:'Conserves',Z:'Non classé'};
  Object.entries(FAM_LABELS).forEach(function(e){
    h+='<div style="display:flex;align-items:center;gap:4px">';
    h+='<span class="fam f'+e[0]+'" style="font-size:11px;padding:2px 7px;font-weight:700">'+e[0]+'</span>';
    h+='<span style="font-size:11px;color:var(--text3)">'+e[1]+'</span>';
    h+='</div>';
  });
  h+='</div></div>';
  h+='<div>'+tvHtml+'</div>';
  var FAM_LABELS={N:'Nourriture',H:'Hygiène/Entretien',L:'Boissons/Alcool',U:'Ustensiles',E:'Épices/Condiments',K:'Consommables cuisine',C:'Couches',B:'Bébé',A:'Animaux',P:'Pâtes/Riz',V:'Conserves',Z:'Non classé'};
  var legendH='<div style="padding:8px 14px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
  Object.entries(FAM_LABELS).forEach(function(e){legendH+='<span style="display:flex;align-items:center;gap:3px">';legendH+='<span class="fam f'+e[0]+'" style="font-size:10px;padding:1px 6px">'+e[0]+'</span>';legendH+='<span style="font-size:10px;color:var(--text3)">'+e[1]+'</span></span>';});
  legendH+='</div>';
  el.innerHTML=legendH+h;
}




function closeAbcModal(btn){var m=btn;while(m&&m.style&&m.style.position!=='fixed')m=m.parentNode;if(m)m.remove();}
function tAbcPos(a,et,nv,v,el){
  if(!ABC_POS[a])ABC_POS[a]={};
  if(!ABC_POS[a][et])ABC_POS[a][et]={};
  var cur=ABC_POS[a][et][nv]||'';
  var newVal=cur===v?'':v;
  ABC_POS[a][et][nv]=newVal;
  sabcpos();
  // Update button styles
  var fc=el.parentNode;
  fc.querySelectorAll('.ft').forEach(function(btn){
    ['A','B','C','D'].forEach(function(x){btn.classList.remove('on-'+x);});
  });
  if(newVal)el.classList.add('on-'+newVal);
  computeAlerts();updateBadge();refreshDashIfActive();
}

function openAbcDetail(a){
  var nvs=[...new Set(P.filter(function(p){return p.a===a;}).map(function(p){return p.nv;}))].sort(function(x,y){return x-y;});
  var ets=[...new Set(P.filter(function(p){return p.a===a;}).map(function(p){return p.et;}))].sort(function(x,y){return x-y;});
  var modal=document.createElement('div');
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto';
  var h='<div style="background:#fff;border-radius:12px;width:700px;max-width:96vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2)">';
  h+='<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0">';
  h+='<span style="font-size:14px;font-weight:700;color:'+zc(a)+'">Allée '+a+'</span>';
  h+='<span style="font-size:11px;color:var(--text3)">Config ABC par étage × étagère</span>';
  h+='<button onclick="closeAbcModal(this)" style="margin-left:auto;border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h+='</div><div style="overflow:auto;flex:1;padding:12px">';
  h+='<div style="font-size:10px;color:var(--text3);margin-bottom:8px">La config par étage est prioritaire sur la config étagère générale (colonne '*').</div>';
  h+='<table class="pt"><thead><tr><th class="corner">Étage</th>';
  ets.forEach(function(et){h+='<th>Ét.'+et+'</th>';});
  h+='</tr></thead><tbody>';
  nvs.forEach(function(nv){
    h+='<tr><td class="rh">'+(nv*10)+'x</td>';
    ets.forEach(function(et){
      var cur=(ABC_POS[a]&&ABC_POS[a][et]&&ABC_POS[a][et][nv])||'';
      var inh=(ABC_POS[a]&&ABC_POS[a][et]&&ABC_POS[a][et][0])||'';
      h+='<td><div class="fc">';
      ['A','B','C'].forEach(function(v){
        var on=cur===v;
        h+='<span class="ft'+(on?' on-'+v:'')+'" style="font-size:9px;padding:1px 4px;'+(inh&&!cur?'opacity:.4':'')+'" onclick="tAbcPos('+a+','+et+','+nv+',\''+v+'\',this)">'+v+'</span>';
      });
      h+='</div></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div></div>';
  modal.innerHTML=h;
  document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
}

/* ══ ÉTIQUETTES ══════════════════════════════════════════════════════ */
// → etiquettes.js


function rFamilles(){
  var el=document.getElementById('familles-page');if(!el)return;
  var allees=[...new Set(P.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
  var maxNv=11;var nvs=Array.from({length:maxNv},function(_,i){return i+1;});
  var fams=['N','H','L','U','E','K','P','V','C','B','A','Z'];
  var h='';
h+='<div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--text2)">Familles par étage</div>';
  h+='<table class="pt"><thead><tr><th class="corner">Allée</th>';
  nvs.forEach(function(n){h+='<th>Étage '+n+'x</th>';});
  h+='</tr></thead><tbody>';
  allees.forEach(function(a){
    var col=zc(a);
    h+='<tr><td class="rh" style="border-left:3px solid '+col+'">'+a+'<span style="font-size:9px;color:var(--text3);display:block">'+zone(a)+'</span></td>';
    nvs.forEach(function(nv){
      var cur=getNvFams(a,nv);
      h+='<td><div class="fc">';
      fams.forEach(function(f){
        h+='<span class="ft'+(cur.includes(f)?' on-'+f:'')+'" onclick="tFam('+a+','+nv+',\x27'+f+'\x27,this)">'+f+'</span>';
      });
      h+='</div></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  el.innerHTML=h;
}


// → dashboard.js

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
    var fams=getNvFams(p.a,p.nv);
    var etageOk=fams.length>0&&fams.includes(p.f);
    if(!etageOk){
      var nvs=Object.keys(PARAMS[p.a]||{}).map(Number);
      var famNvs=nvs.filter(nv=>(PARAMS[p.a][nv]||[]).includes(p.f));
      if(famNvs.length===0){
        if(fams.length>0)
          als.push({t:'S',m:'Famille '+p.f+' — etage '+p.nv*10+'x attend: '+fams.join(',')});
      }else{
        var minFamNv=Math.min(...famNvs);
        // PLEIN : tous les étages cibles validés OK
        var _allAlleEts=[...new Set(P.filter(function(x){return x.a===p.a;}).map(function(x){return x.et;}))];
        var allTargetOk=_allAlleEts.length>0&&famNvs.every(function(nv){
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
function updateBadge(){var n=Object.keys(ALERTS).length;var el=document.getElementById('ab');el.textContent=n;el.style.display=n?'inline-block':'none';}


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

/* ══ PLAN ══════════════════════════════════════════════════════════ */
var pz=PLAN.zoom||1,px=PLAN.ox||60,py=PLAN.oy||60;
var _pdrag=null,_pdox=0,_pdoy=0;
var _panning=false,_psx=0,_psy=0,_psox=0,_psoy=0;
var _rz=null,_rzid=null,_rzsx=0,_rzsy=0,_rzw=0,_rzh=0;

function rPlan(){
  var allees=[...new Set(P.map(p=>p.a))].sort((a,b)=>a-b);
  var placed=PLAN.items.filter(i=>i.type==='allee').map(i=>i.num);
  var zones={};allees.forEach(a=>{var z=zone(a);if(!zones[z])zones[z]=[];zones[z].push(a);});
  var sb='<div id="plan-sb"><div id="plan-sb-top">Éléments</div><div id="plan-sb-mid">';
  sb+='<input id="sb-q" placeholder="Rechercher..." oninput="filterSb(this.value)" style="width:calc(100% - 6px);margin:3px;padding:4px 6px;border:1px solid var(--border);border-radius:var(--r6);font-size:11px;background:var(--bg2)">';
  Object.entries(zones).forEach(function(ze){
    var z=ze[0],als=ze[1];
    sb+='<div class="sb-sec" style="color:'+(ZC[z]||'#999')+'">'+z+'</div>';
    als.forEach(function(a){
      var na=P.filter(function(p){return p.a===a&&ALERTS[p.id];}).length;
      sb+='<div class="sb-item '+(placed.includes(a)?'placed':'')+'" id="sbi-'+a+'" draggable="true" ondragstart="sbDS(event,\x27allee\x27,'+a+')" data-a="'+a+'" data-z="'+z+'">';
      sb+='<span class="sn" style="color:'+zc(a)+'">'+a+'</span>';
      sb+='<span class="sz">'+(a%2===0?'P':'I')+'</span>';
      if(na)sb+='<span class="bdg" style="margin-left:auto;font-size:9px">'+na+'</span>';
      sb+='</div>';
    });
  });
  sb+='</div><div id="plan-sb-foot">';
  sb+='<div class="sb-tool" draggable="true" ondragstart="sbDS(event,\x27chemin\x27,0)">🛤 Chemin principal</div>';
  sb+='<div class="sb-tool" draggable="true" ondragstart="sbDS(event,\x27palette\x27,0)">📦 Palette</div>';
  sb+='<div class="sb-tool" draggable="true" ondragstart="sbDS(event,\x27wall\x27,0)">🧱 Mur</div>';
  sb+='<div class="sb-tool" draggable="true" ondragstart="sbDS(event,\x27text\x27,0)">🔤 Texte</div>';
  sb+='</div></div>';

  var cvHtml='<div id="plan-main"><div id="plan-ctrl">';
  cvHtml+='<button class="btn sm" onclick="pZi()">＋</button>';
  cvHtml+='<span id="pzl" style="font-size:11px;padding:2px 4px;min-width:36px;text-align:center">'+Math.round(pz*100)+'%</span>';
  cvHtml+='<button class="btn sm" onclick="pZo()">－</button>';
  cvHtml+='<button class="btn sm" title="Centrer le plan" onclick="pCenter()">⌂</button>';
  cvHtml+='<div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>';
  cvHtml+='<button class="btn sm" onclick="toggleLock()">'+(PLAN_LOCKED?"🔒":"🔓 Libre")+"</button>";
  cvHtml+='<div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>';
  cvHtml+='<button class="btn sm pri" onclick="spl();alert(\'✓\')" >💾</button>';
  cvHtml+='<button class="btn sm bad" onclick="clearPlan()">🗑</button>';
  cvHtml+='</div>';
  cvHtml+='<div id="plan-vp" ondragover="event.preventDefault()" ondrop="pDrop(event)" onwheel="pWheel(event)" onmousedown="ppStart(event)" onmousemove="ppMove(event)" onmouseup="ppEnd(event)">';
  cvHtml+='<div id="plan-cv" style="transform:translate('+px+'px,'+py+'px) scale('+pz+')">';
  PLAN.items.forEach(function(it){
    if(it.type==='allee')cvHtml+=mkAllee(it);
    else if(it.type==='palette')cvHtml+=mkPal(it);
    else if(it.type==='chemin')cvHtml+=mkChem(it);
    else if(it.type==='wall')cvHtml+=mkWall(it);
    else if(it.type==='text')cvHtml+=mkTxt(it);
  });
  cvHtml+='</div></div></div>';
  document.getElementById('plan-page').innerHTML=sb+cvHtml;
}

function filterSb(q){
  document.querySelectorAll('.sb-item').forEach(function(el){
    el.style.display=(!q||el.dataset.a.includes(q)||el.dataset.z.toLowerCase().includes(q.toLowerCase()))?'flex':'none';
  });
}

var _sdt=null,_sdn=null;
function sbDS(e,t,n){_sdt=t;_sdn=n;}

function pDrop(e){
  e.preventDefault();
  var vp=document.getElementById('plan-vp').getBoundingClientRect();
  var x=Math.round((e.clientX-vp.left-px)/pz/20)*20;
  var y=Math.round((e.clientY-vp.top-py)/pz/20)*20;
  var id='i'+Date.now();
  var item=null;
  if(_sdt==='allee'){
    if(PLAN.items.find(function(i){return i.type==='allee'&&i.num===_sdn;}))return;
    item={type:'allee',id:id,num:_sdn,x:x,y:y,w:180,rotated:false,flipped:!!ALLEE_SIDE[_sdn]};
    var sbi=document.getElementById('sbi-'+_sdn);if(sbi)sbi.classList.add('placed');
  }else if(_sdt==='palette'){
    item={type:'palette',id:id,x:x,y:y,w:80,h:64,label:'PAL',qty:1};
  }else if(_sdt==='chemin'){
    item={type:'chemin',id:id,x:x,y:y,w:50,h:280,label:'Chemin principal'};
  }else if(_sdt==='wall'){
    item={type:'wall',id:id,x:x,y:y,w:120,h:20,rot:0};
  }else if(_sdt==='text'){
    item={type:'text',id:id,x:x,y:y,w:120,h:30,label:'Texte',rot:0};
  }
  if(!item)return;
  PLAN.items.push(item);spl();
  var cv=document.getElementById('plan-cv');
  var tmp=document.createElement('div');
  var html_item=_sdt==='allee'?mkAllee(item):_sdt==='palette'?mkPal(item):
      _sdt==='wall'?mkWall(item):_sdt==='text'?mkTxt(item):mkChem(item);
    tmp.innerHTML=html_item;
  cv.appendChild(tmp.firstChild);
}

function mkAllee(it){
  var a=it.num;var ps=P.filter(function(p){return p.a===a;});
  var na=ps.filter(function(p){return ALERTS[p.id];}).length;
  var col=zc(a);var z=zone(a);
  var etags=[...new Set(ps.map(function(p){return p.et;}))].sort(function(a,b){return a-b;});
  var imp=etags.filter(function(e){return e%2===1;});
  var par=etags.filter(function(e){return e%2===0;});
  if(ALLEE_SIDE[a]||it.flipped){imp=imp.slice().reverse();par=par.slice().reverse();}
  var w=it.w||180;
  var rotStyle=it.rotated?'transform:rotate(90deg);transform-origin:top left;':'';

  function etCol(et){
    var fam3=getNvFams(a,3);
    var hasColor=fam3.length>0;
    var col2=hasColor?fc(fam3[0]):'var(--border2)';
    var bg=hasColor?fb(fam3[0]):'var(--bg2)';
    var eal=ps.filter(function(p){return p.et===et&&ALERTS[p.id];}).length;
    var lbl=hasColor?fam3[0]:'';
    var etNivs=[...new Set(ps.filter(function(p){return p.et===et;}).map(function(p){return p.nv;}))].filter(function(n){return n>0;});
    var etDone=etNivs.filter(function(nv){return VALID[a+'_'+et+'_'+nv];}).length;
    var etPct=etNivs.length?Math.round(etDone/etNivs.length*100):0;
    var pClr=etPct===100?'var(--g)':etDone>0?'var(--o)':'var(--bg4)';
    return '<div class="cva-et-col"><div class="cva-et-num">'+et+'</div>'
      +'<div class="cva-et-blk" style="background:'+bg+';border-color:'+col2+'55" onclick="event.stopPropagation();goAllee('+a+')" title="Ét.'+et+'">'
      +(lbl?'<span style="font-size:8px;font-weight:700;color:'+col2+'">'+lbl+'</span>':'')
      +(eal?'<span class="et-dot" style="background:var(--o)"></span>':'')
      +'</div>'
      +'<div style="height:3px;width:28px;background:var(--bg4);border-radius:2px;margin-top:1px;overflow:hidden">'
      +'<div style="height:3px;width:'+etPct+'%;background:'+pClr+'"></div>'
      +'</div></div>';
  }

  var html='<div class="cva" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="allee" style="left:'+it.x+'px;top:'+it.y+'px;width:'+w+'px;'+rotStyle+'">';
  html+='<div class="cva-head" onmousedown="cvDS(event,\x27'+it.id+'\x27)">';
  html+='<span class="cva-num" style="color:'+col+'" onclick="event.stopPropagation();goAllee('+a+')">'+a+'</span>';
  html+='<span style="font-size:9px;color:'+col+';background:'+col+'18;padding:1px 4px;border-radius:3px">'+z+'</span>';
  if(na)html+='<span class="bdg" style="font-size:9px">'+na+'</span>';
  html+='<span class="rot-btn" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)" title="Pivoter">↻</span>';
  html+='<span class="cva-del" onclick="event.stopPropagation();rmItem(\x27'+it.id+'\x27,'+a+')">✕</span>';
  html+='</div><div class="cva-body">';
  if(imp.length){
    html+='<div class="cva-sect"><div class="cva-sect-lbl">Impaires ↑</div><div class="cva-et-cols">';
    imp.forEach(function(et){html+=etCol(et);});
    html+='</div></div>';
  }
  if(par.length){
    html+='<div class="cva-sect"><div class="cva-sect-lbl">Paires ↓</div><div class="cva-et-cols">';
    par.forEach(function(et){html+=etCol(et);});
    html+='</div></div>';
  }
  html+='</div><div class="cva-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
  return html;
}

function mkPal(it){
  var rot=it.rot?'transform:rotate('+it.rot+'deg);transform-origin:center;':'';
  return '<div class="cv-pal" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="palette"'
    +' style="left:'+it.x+'px;top:'+it.y+'px;width:'+(it.w||80)+'px;height:'+(it.h||50)+'px;'+rot+'"'
    +' onmousedown="cvDS(event,\x27'+it.id+'\x27)">'
    +'<div class="cp-head" style="cursor:move">'
    +'<span style="flex:1;font-size:11px">📦 Palette</span>'
    +'<button class="rot-btn" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)">↻</button>'
    +'<span class="cp-del" onclick="event.stopPropagation();rmItem(\x27'+it.id+'\x27)">✕</span>'
    +'</div>'
    +'<div class="cp-body" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:5px">'
    +'<input type="number" min="1" max="999" value="'+(it.qty||1)+'"'
    +' style="width:48px;border:1px solid #f9a825;border-radius:4px;padding:2px 5px;font-size:14px;font-weight:700;text-align:center;background:#fffde7;color:var(--o)"'
    +' onchange="updItem(\x27'+it.id+'\x27,\x27qty\x27,+this.value)" onclick="event.stopPropagation()">'
    +'<span style="font-size:10px;color:var(--text3)">pal.</span>'
    +'</div>'
    +'<div class="cp-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
}

function mkChem(it){
  var chemRot=it.rot?'transform:rotate('+it.rot+'deg);transform-origin:center;':'';
  return '<div class="cv-chem" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="chemin" style="left:'+it.x+'px;top:'+it.y+'px;width:'+(it.w||50)+'px;height:'+(it.h||280)+'px;'+chemRot+'" onmousedown="cvDS(event,\x27'+it.id+'\x27)">'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px">'
    +'<button class="rot-btn" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)" title="Pivoter">↻</button>'
    +'<input class="chem-edit" value="'+(it.label||'Chemin principal')+'" onclick="event.stopPropagation()" onchange="updItem(\x27'+it.id+'\x27,\x27label\x27,this.value)">'
    +'</div>'
    +'<div class="cv-chem-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
}

function mkWall(it){
  var rot=it.rot?'transform:rotate('+it.rot+'deg);transform-origin:center;':'';
  return '<div class="cv-wall" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="wall"'
    +' style="left:'+it.x+'px;top:'+it.y+'px;width:'+(it.w||120)+'px;height:'+(it.h||20)+'px;'+rot+'"'
    +' onmousedown="cvDS(event,\x27'+it.id+'\x27)">'
    +'<button class="rot-btn" style="position:absolute;top:2px;right:18px;font-size:10px" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)">↻</button>'
    +'<span class="cva-del" style="position:absolute;top:2px;right:2px" onclick="event.stopPropagation();rmItem(\x27'+it.id+'\x27)">✕</span>'
    +'<div class="wall-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
}

function mkTxt(it){
  var rot=it.rot?'transform:rotate('+it.rot+'deg);transform-origin:center;':'';
  return '<div class="cv-txt" id="cva-'+it.id+'" data-id="'+it.id+'" data-type="text"'
    +' style="left:'+it.x+'px;top:'+it.y+'px;width:'+(it.w||120)+'px;min-height:'+(it.h||30)+'px;'+rot+'"'
    +' onmousedown="cvDS(event,\x27'+it.id+'\x27)">'
    +'<button class="rot-btn" style="position:absolute;top:1px;right:18px;font-size:10px" onclick="event.stopPropagation();rotItem(\x27'+it.id+'\x27)">↻</button>'
    +'<span class="cva-del" style="position:absolute;top:1px;right:2px" onclick="event.stopPropagation();rmItem(\x27'+it.id+'\x27)">✕</span>'
    +'<textarea class="txt-edit" onclick="event.stopPropagation()" onchange="updItem(\x27'+it.id+'\x27,\x27label\x27,this.value)">'+(it.label||'Texte')+'</textarea>'
    +'<div class="txt-rz" onmousedown="rzStart(event,\x27'+it.id+'\x27)"></div></div>';
}

function cvDS(e,id){
  if(PLAN_LOCKED)return;
  if(['INPUT','BUTTON','TEXTAREA'].includes(e.target.tagName)||['cva-del','cp-del','cva-rz','cp-rz','cv-chem-rz','rot-btn','wall-rz','txt-rz'].some(function(c){return e.target.classList.contains(c);}))return;
  e.stopPropagation();e.preventDefault();
  // Ctrl+click = toggle selection
  if(e.ctrlKey||e.metaKey){
    if(SEL_IDS.has(id))SEL_IDS.delete(id);else SEL_IDS.add(id);
    var el2=document.getElementById('cva-'+id);if(el2)el2.classList.toggle('sel',SEL_IDS.has(id));
    return;
  }
  // If not ctrl, clear selection and select this one
  if(!SEL_IDS.has(id)){
    SEL_IDS.forEach(function(sid){var se=document.getElementById('cva-'+sid);if(se)se.classList.remove('sel');});
    SEL_IDS.clear();
    SEL_IDS.add(id);
    var el3=document.getElementById('cva-'+id);if(el3)el3.classList.add('sel');
  }
  _pdrag=document.getElementById('cva-'+id);if(!_pdrag)return;
  var vp=document.getElementById('plan-vp').getBoundingClientRect();
  _pdox=(e.clientX-vp.left-px)/pz-parseInt(_pdrag.style.left||0);
  _pdoy=(e.clientY-vp.top-py)/pz-parseInt(_pdrag.style.top||0);
  document.onmousemove=cvDM;document.onmouseup=cvDE;
}
function cvDM(e){
  if(!_pdrag)return;
  var vp=document.getElementById('plan-vp').getBoundingClientRect();
  var x=Math.round(((e.clientX-vp.left-px)/pz-_pdox)/10)*10;
  var y=Math.round(((e.clientY-vp.top-py)/pz-_pdoy)/10)*10;
  var ox=x-parseInt(_pdrag.style.left||0);
  var oy=y-parseInt(_pdrag.style.top||0);
  _pdrag.style.left=Math.max(0,x)+'px';_pdrag.style.top=Math.max(0,y)+'px';
  // Move other selected elements by same delta
  if(SEL_IDS.size>1){
    var mainId=_pdrag.dataset.id;
    SEL_IDS.forEach(function(sid){
      if(sid===mainId)return;
      var se=document.getElementById('cva-'+sid);if(!se)return;
      var nx=Math.max(0,parseInt(se.style.left||0)+ox);
      var ny=Math.max(0,parseInt(se.style.top||0)+oy);
      se.style.left=nx+'px';se.style.top=ny+'px';
    });
  }
}
function cvDE(){
  if(!_pdrag)return;
  // Save all moved items
  SEL_IDS.forEach(function(sid){
    var se=document.getElementById('cva-'+sid);
    var it=PLAN.items.find(function(i){return i.id===sid;});
    if(se&&it){it.x=parseInt(se.style.left||0);it.y=parseInt(se.style.top||0);}
  });
  _pdrag=null;spl();document.onmousemove=null;document.onmouseup=null;
}

function rzStart(e,id){
  if(PLAN_LOCKED)return;
  e.stopPropagation();e.preventDefault();
  _rz=document.getElementById('cva-'+id);_rzid=id;
  _rzsx=e.clientX;_rzsy=e.clientY;_rzw=_rz.offsetWidth;_rzh=_rz.offsetHeight;
  document.onmousemove=rzMove;document.onmouseup=rzEnd;
}
function rzMove(e){
  if(!_rz)return;
  var nw=Math.max(80,Math.round((_rzw+(e.clientX-_rzsx)/pz)/10)*10);
  var nh=Math.max(40,Math.round((_rzh+(e.clientY-_rzsy)/pz)/10)*10);
  _rz.style.width=nw+'px';
  var it=PLAN.items.find(function(i){return i.id===_rzid;});
  if(it){it.w=nw;if(_rz.dataset.type!=='allee'){_rz.style.height=nh+'px';it.h=nh;}}
}
function rzEnd(){_rz=null;spl();document.onmousemove=null;document.onmouseup=null;}

function ppStart(e){
  if(_pdrag||_rz)return;
  // Pan when target is empty canvas area
  var tgt=e.target;
  var isCanvas=tgt.id==='plan-vp'||tgt.id==='plan-cv'||
    (tgt.closest&&!tgt.closest('.cva')&&!tgt.closest('.cv-pal')&&!tgt.closest('.cv-chem')&&!tgt.closest('.cv-wall')&&!tgt.closest('.cv-txt'));
  if(!isCanvas)return;
  SEL_IDS.forEach(function(sid){var se=document.getElementById('cva-'+sid);if(se)se.classList.remove('sel');});
  SEL_IDS.clear();
  _panning=true;_psx=e.clientX;_psy=e.clientY;_psox=px;_psoy=py;
  document.getElementById('plan-vp').style.cursor='grabbing';
}
function ppMove(e){if(!_panning)return;px=_psox+(e.clientX-_psx);py=_psoy+(e.clientY-_psy);applyT();}
function ppEnd(){if(!_panning)return;_panning=false;document.getElementById('plan-vp').style.cursor='default';PLAN.ox=px;PLAN.oy=py;spl();}
function pWheel(e){
  e.preventDefault();
  var vp=document.getElementById('plan-vp').getBoundingClientRect();
  var mx=e.clientX-vp.left,my=e.clientY-vp.top;
  var d=e.deltaY<0?1.12:0.89;
  var nz=Math.min(4,Math.max(0.15,pz*d));
  px=mx-(mx-px)*(nz/pz);py=my-(my-py)*(nz/pz);pz=nz;applyT();
}
function pZi(){pz=Math.min(4,pz*1.2);applyT();}
function pZo(){pz=Math.max(0.15,pz/1.2);applyT();}
function pZr(){pz=1;px=60;py=60;applyT();}
function pCenter(){
  var vp=document.getElementById('plan-vp');
  if(!vp)return;
  var vw=vp.offsetWidth,vh=vp.offsetHeight;
  // Center on middle of all placed items
  if(PLAN.items.length>0){
    var xs=PLAN.items.map(function(i){return i.x||0;});
    var ys=PLAN.items.map(function(i){return i.y||0;});
    var mx=(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2;
    var my=(Math.min.apply(null,ys)+Math.max.apply(null,ys))/2;
    px=vw/2-mx*pz; py=vh/2-my*pz;
  }else{
    px=vw/2; py=vh/2;
  }
  applyT();
}

function pWheel(e){
  e.preventDefault();
  // Two-finger trackpad: pan with deltaX/deltaY
  px-=e.deltaX;
  py-=e.deltaY;
  applyT();
}
function applyT(){
  var cv=document.getElementById('plan-cv');if(!cv)return;
  cv.style.transform='translate('+px+'px,'+py+'px) scale('+pz+')';
  var l=document.getElementById('pzl');if(l)l.textContent=Math.round(pz*100)+'%';
  PLAN.zoom=pz;PLAN.ox=px;PLAN.oy=py;spl();
}
function rotItem(id){
  if(PLAN_LOCKED)return;
  var el=document.getElementById('cva-'+id);if(!el)return;
  var it=PLAN.items.find(function(i){return i.id===id;});if(!it)return;
  if(it.type==='allee'){
    it.rotated=!it.rotated;
    el.style.transform=it.rotated?'rotate(90deg)':'';
    el.style.transformOrigin=it.rotated?'top left':'';
  }else{
    it.rot=(it.rot||0)+90;
    if(it.rot>=360)it.rot=0;
    el.style.transform=it.rot?'rotate('+it.rot+'deg)':'';
    el.style.transformOrigin='center';
  }
  spl();
}
function rmItem(id,an){
  if(PLAN_LOCKED)return;
  PLAN.items=PLAN.items.filter(function(i){return i.id!==id;});spl();
  var el=document.getElementById('cva-'+id);if(el)el.remove();
  if(an){var sbi=document.getElementById('sbi-'+an);if(sbi)sbi.classList.remove('placed');}
}
function updItem(id,k,v){var it=PLAN.items.find(function(i){return i.id===id;});if(it)it[k]=v;spl();}
function clearPlan(){if(!confirm('Vider le plan ?'))return;PLAN.items=[];spl();rPlan();}
function goAllee(a){CUR=a;S.set('cur4',a);T('allee');}

/* ══ ALLÉE ══════════════════════════════════════════════════════════ */
function toggleFilter(t){
  if(ALLEE_FILTERS.includes(t))ALLEE_FILTERS=ALLEE_FILTERS.filter(function(x){return x!==t;});
  else ALLEE_FILTERS.push(t);
  saf();rAllee();
}
function clearFilters(){ALLEE_FILTERS=[];saf();rAllee();}

function rAllee(){
  var el=document.getElementById('allee-page');
  var allees=[...new Set(P.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
  if(!CUR||!allees.includes(CUR))CUR=allees[0];
  var prods=P.filter(function(p){return p.a===CUR;});
  var na=prods.filter(function(p){return ALERTS[p.id];}).length;
  var etags=[...new Set(prods.map(function(p){return p.et;}))].sort(function(a,b){return a-b;});
  var imp=etags.filter(function(e){return e%2===1;}).sort(function(a,b){return a-b;});
  var par=etags.filter(function(e){return e%2===0;}).sort(function(a,b){return a-b;});
  var nivs=[...new Set(prods.map(function(p){return p.nv;}))].sort(function(a,b){return a-b;});
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};

  var top='<div id="allee-top">';
  top+='<select onchange="CUR=+this.value;S.set(\x27cur4\x27,CUR);rAllee()" style="border:1px solid var(--border);border-radius:var(--r6);padding:4px 8px;font-size:13px;background:#fff">';
  allees.forEach(function(a){top+='<option value="'+a+'"'+(a===CUR?' selected':'')+'>'+a+' — '+zone(a)+'</option>';});
  top+='</select>';
  top+='<span style="font-size:11px;color:var(--text3)">'+prods.length+' produits</span>';
  if(na)top+='<span class="bdg">'+na+' alertes</span>';
  top+='<select id="dsp-sel" onchange="rAllee()" style="border:1px solid var(--border);border-radius:var(--r6);padding:3px 7px;font-size:11px">';
  top+='<option value="">Tous statuts</option>';
  ['order','unavailable','standalone','archived'].forEach(function(v){top+='<option value="'+v+'">'+v+'</option>';});
  top+='</select>';
  top+='<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-left:4px">';
  top+='<span style="font-size:10px;color:var(--text3)">Filtres:</span>';
  ['M','D','S','R','A'].forEach(function(t){
    var on=ALLEE_FILTERS.includes(t);
    top+='<span class="flt-btn'+(on?' on':'')+'" onclick="toggleFilter(\x27'+t+'\x27)">'+AT[t]+'</span>';
  });
  top+='<span class="flt-btn'+(ALLEE_FILTERS.length===0?' on':'')+'" onclick="clearFilters()">TOUT</span>';
  top+='</div></div>';

  el.innerHTML=top+'<div id="allee-body">'+mkAlleeTable(CUR,prods,imp,par,nivs)+'</div>';
}

function mkAlleeTable(a,prods,imp,par,nivs){
  if(!imp.length&&!par.length)return'<div style="padding:20px;color:var(--text3)">Aucune étagère.</div>';
  var _allEtSet=[...new Set([...imp,...par,...prods.map(function(p){return p.et;})])].sort(function(a,b){return a-b;});
  var _imp2=_allEtSet.filter(function(e){return e%2===1;});
  var _par2=_allEtSet.filter(function(e){return e%2===0;});
  var allEt=_imp2.concat(_par2);
  // Global max position for ALL étagères - ensures alignment
  var _maxP=Math.max(3,...prods.map(function(p){return p.p;}));
  var h='<table class="at"><thead><tr><th class="corner" rowspan="2">Étage</th>';
  if(_imp2.length)h+='<th colspan="'+(_imp2.length*_maxP)+'" class="et-hd" style="background:#fffde7;color:#f57f17;border:1px solid #ffe082">Étagères impaires</th>';
  if(_par2.length)h+='<th colspan="'+(_par2.length*_maxP)+'" class="et-hd" style="background:#f1f8e9;color:#388e3c;border:1px solid #a5d6a7">Étagères paires</th>';
  h+='</tr><tr>';
  allEt.forEach(function(et){
    var bg=et%2===1?'#fffde7':'#f1f8e9';var bc=et%2===1?'#ffe082':'#a5d6a7';
    h+='<th colspan="'+_maxP+'" class="et-sep" style="background:'+bg+';color:'+(et%2===1?'#f57f17':'#388e3c')+';border:1px solid '+bc+'">'+a+'.'+et
      +'&nbsp;<button class="btn xs" style="font-size:9px;padding:0 3px" onclick="printEtiquettes('+a+','+et+')">🖨</button></th>';
  });
  h+='</tr></thead><tbody>';
  nivs.forEach(function(nv){
    var rowPs=prods.filter(function(p){return p.nv===nv;});
    var rowAl=rowPs.filter(function(p){return ALERTS[p.id];}).length;
    h+='<tr><td class="rhd"><div class="rhd-inner"><span class="rhd-lbl">'+(nv*10)+'x</span>';
    if(rowAl)h+='<span class="rhd-al">⚠'+rowAl+'</span>';
    h+='</div></td>';
    allEt.forEach(function(et){
      var bg=et%2===1?'#fffde7':'#f1f8e9';
      var fams=getNvFams(a,nv);
      var cellBg=fams.length?fb(fams[0]):bg;
      var cellBrd=fams.length?fc(fams[0])+'44':'transparent';
    var allPos=[];for(var _pi=1;_pi<=_maxP;_pi++)allPos.push(_pi);
    allPos.forEach(function(pos){
        var code=a+'.'+et+'.'+(nv*10+pos);
        var vkey=a+'_'+et+'_'+nv;
        var done=VALID[vkey];
        var cell=rowPs.filter(function(p){return p.et===et&&p.p===pos;});
        var etSepClass=pos===1?' class="et-sep"':'';
        h+='<td'+etSepClass+' style="background:'+cellBg+';border-left:'+(pos===1?'3px solid var(--border2)':'1px solid '+cellBrd)+'">';
        h+='<div class="ci" ondragover="ciDragOver(event)" ondragleave="ciDragLeave(event)" ondrop="ciDrop(event,'+a+','+et+','+nv+','+pos+')">';
        h+='<div style="display:flex;align-items:center;gap:2px;margin-bottom:1px">';
        h+='<span class="cc">'+code+'</span>';
        h+='<button class="vbtn'+(done?' done':'')+'" onclick="tValid(\x27'+vkey+'\x27)">'+(done?'✓ ':' ')+'OK</button>';
        h+='</div>';
        cell.forEach(function(p){h+=mkPE(p,done);});
        if(!cell.length)h+='<span style="font-size:8px;color:var(--text3)">—</span>';
        h+='</div></td>';
      });
    });
    h+='</tr>';
  });
  return h+'</tbody></table>';
}

function mkPE(p,parentDone){
  var al=ALERTS[p.id]||[];
  var _dspF=(document.getElementById('dsp-sel')||{}).value||'';
  if(_dspF&&(p.dsp||'order')!==_dspF)return'';
  if(ALLEE_FILTERS.length>0){
    var alTypes=al.map(function(a){return a.t;});
    if(!ALLEE_FILTERS.some(function(f){return alTypes.includes(f);}))return'';
  }
  var hasCrit=al.some(function(a){return a.t==='S';});
  var ideal=Math.max(1,Math.ceil(p.q/Math.max(p.c,1)));
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var dest=SORTIR[p.id]||'';
  var html='<div class="pe'+(hasCrit?' c':al.length?' w':'')+' '+(parentDone?'v':'')+'" id="pe-'+p.id+'" draggable="true" ondragstart="peDragStart(event,'+p.id+')" ondragend="peDragEnd(event)">';
  html+='<div class="pe-top"><span class="fam f'+p.f+'" style="cursor:pointer" onclick="openFiche('+p.id+')" title="Ouvrir la fiche">'+p.f+'</span>';
  html+='<a class="pe-nm" href="https://products.app.deleev.com/products/'+p.id+'?tab=stock" target="_blank">'+p.n+'</a></div>';
  html+='<div class="pe-mt"><span>Idéal: <b>'+ideal+' colis</b></span><span>·</span><span>QI '+p.q+'</span><span>·</span><span>Colis '+p.c+'</span>';
  if(p.st>0)html+='<span style="color:var(--g)">St '+p.st+'</span>';
  html+='</div>';
  if(al.length){
    html+='<div class="pe-al">';
    al.forEach(function(a){html+='<span class="al a'+a.t+'" title="'+a.m+'">'+AT[a.t]+'</span>';});
    html+='</div>';
  }
  html+='<div class="pe-ac"><button class="btn xs" onclick="tEAN('+p.id+',\x27'+String(p.bc).replace(/\.0$/,'').replace(/'/g,'')+'\x27)"  >EAN ▾</button>';
  if(al.some(function(a){return a.t==='S';}))html+='<button class="btn xs bad" onclick="tSortir('+p.id+')">📤'+(dest?' → '+dest:'')+'</button>';
  html+='<button class="btn xs" style="background:var(--abg);color:var(--accent)" onclick="openRezone('+p.id+')">📍 Rezonage</button>';
  html+='</div>';
  html+='<div class="ean-w" id="ean-'+p.id+'"></div>';
  if(al.some(function(a){return a.t==='S';})){
    html+='<div class="sr" id="sr-'+p.id+'"><input class="si" placeholder="Allée cible" value="'+dest+'" oninput="SORTIR['+p.id+']=this.value;ss()"><button class=\"btn xs pri\" onclick=\"closeSr('+p.id+')\" >✓</button></div>';
  }
  html+='</div>';
  return html;
}

function tValid(k){
  VALID[k]=!VALID[k];sv();
  computeAlerts();updateBadge();
  // Refresh allée if active
  var sb=document.getElementById('allee-body');
  if(sb){var sy=sb.scrollTop;var sx=sb.scrollLeft;rAllee();var sb2=document.getElementById('allee-body');if(sb2){sb2.scrollTop=sy;sb2.scrollLeft=sx;}}
  // Refresh dash if active - scroll-preserving
  var dp=document.getElementById('dash-page');
  if(dp&&dp.classList.contains('active')){var sy2=dp.scrollTop;rDash();dp.scrollTop=sy2;}
}
function tEAN(id,val){
  var w=document.getElementById('ean-'+id);if(!w)return;
  w.classList.toggle('open');
  if(w.classList.contains('open')&&!w.dataset.drawn){
    var code=String(val).replace(/\.0$/,'').trim();
    if(code&&code.length>=4){
      var url='https://barcode.tec-it.com/barcode.ashx?data='+encodeURIComponent(code)+'&code=EAN13&translate-esc=on&unit=fit&dpi=96&imagetype=png&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=mm&quiet=0';
      var img=document.createElement('img');img.src=url;img.style.cssText='max-width:100%;height:auto;border-radius:3px;display:block';img.onerror=function(){w.innerHTML='<span style="font-size:9px">EAN: '+code+'</span>';};w.innerHTML='';w.appendChild(img);
      w.dataset.drawn='1';
    }else{w.innerHTML='<span style="font-size:9px;color:var(--text3)">EAN non dispo</span>';}
  }
}

function printEtiquettes(a,et){
  var prods=P.filter(function(p){return p.a===a&&p.et===et;});
  if(!prods.length){showToast('Aucun produit sur cette etagere');return;}
  var zones=[...new Set(prods.map(function(p){return p.nv*10+p.p;}))].sort(function(a,b){return a-b;});
  function pad(n,l){return String(n).padStart(l,'0');}

  function code128svg(text){
    var enc=['11011001100','11001101100','11001100110','10010011000','10010001100','10001001100','10011001000','10011000100','10001100100','11001001000','11001000100','11000100100','10110011100','10011011100','10011001110','10111001100','10011101100','10011100110','11001110010','11001011100','11001001110','11011100100','11001110100','11101101110','11101001100','11100101100','11100100110','11101100100','11100110100','11100110010','11011011000','11011000110','11000110110','10100011000','10001011000','10001000110','10110001000','10000101100','10000100110','10110010000','10000010110','10000110100','11000010010','11001010000','11110111010','11000010100','10001111010','10100111100','10010111100','10010011110','10111100100','10011110100','10011110010','11110100100','11110010100','11110010010','11011110100','11011110010','11110110010','10101111000','10100011110','10001011110','10111101000','10111100010','11110101000','11110100010','10111011110','10111101110','11101011110','11110101110','11010000100','11010010000','11010011100','11000111010','11010111000','10000100100','10100010000','10010100000','10000101000','10000100010','10001010000','10001000010','10100000010','10010000010','11010000010','11000010110','10001011100','11010001100','11010001110','11010111110','11101111010','11010100110','10110111100','10110111110','10001101110','10111011000','10111011110','10011110110','10011101110','11110110100','11110110010','11001010110','11001010010','11010110110','11010110010','11001110110','11001110010','10111001110','11011011110'];
    var codes=[104],chk=104;
    for(var i=0;i<text.length;i++){var v=text.charCodeAt(i)-32;codes.push(v);chk+=(i+1)*v;}
    codes.push(chk%103);codes.push(106);
    var bars='';codes.forEach(function(c){bars+=enc[c]||'';});bars+='11';
    var W=bars.length;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block">';
    var x=0,i=0;
    while(i<bars.length){var ch=bars[i],w=0;while(i<bars.length&&bars[i]===ch){w++;i++;}if(ch==='1')svg+='<rect x="'+x+'" y="0" width="'+w+'" height="100" fill="#000"/>';x+=w;}
    return svg+'</svg>';
  }

  var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiquettes '+a+'.'+et+'</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial;padding:8mm;background:#fff}'
    +'@media print{.noprint{display:none}body{padding:4mm}}'
    +'.ctrl{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px}'
    +'.ctrl input[type=range]{width:140px}'
    +'.ctrl span{min-width:36px;font-weight:bold}'
    +'.row{display:flex;gap:8px;margin-bottom:6px;page-break-inside:avoid}'
    +'.lbl{flex:1;border:3px solid #000;border-radius:6px;padding:8px 12px;display:flex;align-items:center;gap:10px}'
    +'</style></head><body>'

    +'<div class="noprint" style="background:#f5f5f5;border-radius:8px;padding:14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">'
    +'<div>'
    +'<div class="ctrl"><label>Taille chiffres/flèches</label><input type="range" min="16" max="80" value="44" oninput="setTxt(+this.value)"><span id="vTxt">44px</span></div>'
    +'<div class="ctrl"><label>Hauteur code-barre</label><input type="range" min="30" max="200" value="90" oninput="setBc(+this.value)"><span id="vBc">90px</span></div>'
    +'<div class="ctrl"><label>Par ligne</label><input type="range" min="1" max="4" step="1" value="1" oninput="setCols(+this.value)"><span id="vCols">1</span></div>'
    +'</div>'
    +'<button onclick="window.print()" style="padding:8px 18px;font-size:14px;cursor:pointer;background:#1e3a5f;color:#fff;border:none;border-radius:6px">&#128424; Imprimer</button>'
    +'<span style="font-size:11px;color:#666">'+zones.length+' étiquettes — '+a+'.'+et+'</span>'
    +'</div>'

    +'<div id="etiq">'
    + (function(){
        var rows='';
        for(var i=0;i<zones.length;i+=1){
          var etg=zones[i];
          var code=pad(a,4)+'-'+pad(et,4)+'-'+pad(etg,4);
          var lbl=a+'.'+et+'.'+etg;
          rows+='<div class="row"><div class="lbl" style="height:110px">'
            +'<span class="arr" style="font-size:44px;font-weight:900;color:#cc0000;line-height:1;flex-shrink:0">&#8679;</span>'
            +'<span class="cod" style="font-size:44px;font-weight:900;color:#cc0000;letter-spacing:2px;white-space:nowrap;flex-shrink:0">'+lbl+'</span>'
            +'<div class="bcd" style="flex:1;height:90px">'+code128svg(code)+'</div>'
            +'<span class="arr" style="font-size:44px;font-weight:900;color:#cc0000;line-height:1;flex-shrink:0">&#8679;</span>'
            +'</div></div>';
        }
        return rows;
      })()
    +'</div>'

    +'<script>'
    +'function setTxt(v){'
    +'  document.getElementById("vTxt").textContent=v+"px";'
    +'  document.querySelectorAll(".arr,.cod").forEach(function(e){e.style.fontSize=v+"px";});'
    +'  document.querySelectorAll(".lbl").forEach(function(e){e.style.height=(v*2.5)+"px";});'
    +'  document.querySelectorAll(".bcd").forEach(function(e){e.style.height=(v*2)+"px";});'
    +'}'
    +'function setBc(v){'
    +'  document.getElementById("vBc").textContent=v+"px";'
    +'  document.querySelectorAll(".bcd").forEach(function(e){e.style.height=v+"px";});'
    +'  document.querySelectorAll(".lbl").forEach(function(e){e.style.height=(v+20)+"px";});'
    +'}'
    +'function setCols(v){'
    +'  document.getElementById("vCols").textContent=v;'
    +'  var rows=document.querySelectorAll(".row");'
    +'  var i=0;'
    +'  while(i<rows.length){rows[i].style.display="none";i++;}'
    +'  var lbls=document.querySelectorAll(".lbl");'
    +'  var chunks=[];'
    +'  for(var j=0;j<lbls.length;j+=v)chunks.push([].slice.call(lbls,j,j+v));'
    +'  var etiq=document.getElementById("etiq");'
    +'  etiq.innerHTML="";'
    +'  chunks.forEach(function(chunk){'
    +'    var row=document.createElement("div");row.className="row";'
    +'    chunk.forEach(function(l){row.appendChild(l);});'
    +'    etiq.appendChild(row);'
    +'  });'
    +'}'
    +'window.onload=function(){upd();};'+'<\/script>'
    +'</body></html>';

  var blob=new Blob([html],{type:'text/html'});
  var burl=URL.createObjectURL(blob);
  var a2=document.createElement('a');a2.href=burl;a2.target='_blank';a2.click();
  setTimeout(function(){URL.revokeObjectURL(burl);},10000);
}
function openRezone(id){
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var pts=p.z.split('.');var a0=pts[0]||'',et0=pts[1]||'',etg0=pts[2]||'';
  var old=p.z;
  var m=document.createElement('div');
  m.id='rz-modal';
  m.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  m.innerHTML='<div style="background:#fff;border-radius:12px;padding:20px 24px;width:340px;box-shadow:0 8px 32px rgba(0,0,0,.2)">'
    +'<div style="font-size:14px;font-weight:700;margin-bottom:4px">📍 Rezonage</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-bottom:3px">'+p.n.slice(0,55)+'</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-bottom:14px">Actuel: <b style="color:var(--accent)">'+old+'</b></div>'
    +'<div style="display:flex;gap:8px;margin-bottom:16px">'
    +'<div style="flex:1"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Allée</label>'
    +'<input id="rz-a" type="number" value="'+a0+'" style="width:100%;border:1px solid var(--border2);border-radius:6px;padding:6px 8px;font-size:14px;font-weight:700;text-align:center"></div>'
    +'<div style="flex:1"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Étagère</label>'
    +'<input id="rz-et" type="number" value="'+et0+'" style="width:100%;border:1px solid var(--border2);border-radius:6px;padding:6px 8px;font-size:14px;font-weight:700;text-align:center"></div>'
    +'<div style="flex:1"><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Étage</label>'
    +'<input id="rz-etg" type="number" value="'+etg0+'" style="width:100%;border:1px solid var(--border2);border-radius:6px;padding:6px 8px;font-size:14px;font-weight:700;text-align:center"></div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end">'
    +'<button class="btn" onclick="document.getElementById(\x27rz-modal\x27).remove()">Annuler</button>'
    +'<button class="btn pri" onclick="confirmRezone('+id+')">✓ Valider</button>'
    +'</div></div>';
  document.body.appendChild(m);
  setTimeout(function(){var el=document.getElementById('rz-a');if(el)el.focus();},50);
}
function confirmRezone(id){
  var a=+document.getElementById('rz-a').value;
  var et=+document.getElementById('rz-et').value;
  var etg=+document.getElementById('rz-etg').value;
  if(!a||!et||!etg){showToast('Remplir tous les champs');return;}
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var oldZ=p.z;
  p.a=a;p.et=et;p.nv=Math.floor(etg/10);p.p=etg%10;p.z=a+'.'+et+'.'+etg;
  var m=document.getElementById('rz-modal');if(m)m.remove();
  showToast('Rezoné: '+oldZ+' → '+p.z);
  computeAlerts();updateBadge();
  var sb=document.getElementById('allee-body');
  var sy=sb?sb.scrollTop:0;var sx=sb?sb.scrollLeft:0;
  rAllee();
  var sb2=document.getElementById('allee-body');
  if(sb2){sb2.scrollTop=sy;sb2.scrollLeft=sx;}
}
function closeSr(id){var el=document.getElementById('sr-'+id);if(el)el.classList.remove('open');}
function tSortir(id){var el=document.getElementById('sr-'+id);if(el)el.classList.toggle('open');}

var _dragProdId=null;
function peDragStart(e,id){_dragProdId=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(id));setTimeout(function(){var el=document.getElementById('pe-'+id);if(el)el.style.opacity='.4';},0);}
function peDragEnd(e){_dragProdId=null;document.querySelectorAll('.ci').forEach(function(c){c.classList.remove('drag-over');});if(e.target&&e.target.style)e.target.style.opacity='';}
function ciDragOver(e){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('drag-over');}
function ciDragLeave(e){e.currentTarget.classList.remove('drag-over');}
function ciDrop(e,a,et,nv,pos){
  e.preventDefault();e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
  if(!_dragProdId)return;
  var id=_dragProdId;_dragProdId=null;
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var oldZ=p.z;
  p.a=a;p.et=et;p.nv=nv;p.p=pos;p.z=a+'.'+et+'.'+(nv*10+pos);
  showToast('Déplacé: '+oldZ+' → '+p.z);
  computeAlerts();updateBadge();rAllee();
}
function showToast(msg){
  var t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;bottom:20px;right:20px;background:#1a1d2e;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .3s';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';clearTimeout(t._to);t._to=setTimeout(function(){t.style.opacity='0';},2500);
}

/* ══ PARAMS ══════════════════════════════════════════════════════════ */
function rParams(){
  computeAlerts();
  var el=document.getElementById('params-page');
  var allees=[...new Set(P.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
  var maxNv=11;var nvs=Array.from({length:maxNv},function(_,i){return i+1;});
  var fams=['N','H','L','U','E','K','P','V','C','B','A','Z'];
  var zoneNames=[...new Set(P.map(function(p){return zone(p.a);}))].sort();

  var tvHtml='<div style="margin-bottom:20px"><div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--text2)">Classification ABC / Pareto par zone</div>';
  tvHtml+='<div style="font-size:11px;color:var(--text3);margin-bottom:12px">Produits triés par QI décroissant — somme cumulée détermine la classe A, B ou C.</div>';
  tvHtml+='<div style="display:flex;flex-direction:column;gap:24px">';
  zoneNames.forEach(function(z){
    var cfg=getTVMV(z);
    var zP=P.filter(function(p){return zone(p.a)===z;});
    var rk=[...zP].filter(function(p){return p.q>1;}).sort(function(a,b){return b.q-a.q;});
    var totalQI=rk.reduce(function(s,p){return s+p.q;},0);
    var cumul=0,nA=0,nB=0,qA=0,qB=0,qC=0;
    rk.forEach(function(p){cumul+=p.q;var pct=cumul/totalQI*100;if(pct<=cfg.abcA){nA++;qA+=p.q;}else if(pct<=cfg.abcB){nB++;qB+=p.q;}else qC+=p.q;});
    var nC=rk.length-nA-nB+zP.filter(function(p){return p.q<=1;}).length;
    var pA=totalQI?Math.round(qA/totalQI*100):0,pB=totalQI?Math.round(qB/totalQI*100):0,pC=100-pA-pB;
    var col=ZC[z]||'#999';
    tvHtml+='<div class="tvmv-card">';
    tvHtml+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
    tvHtml+='<span style="font-size:13px;font-weight:700;color:'+col+'">'+z+'</span>';
    tvHtml+='<span style="font-size:10px;color:var(--text3)">'+zP.length+' produits</span>';
    tvHtml+='<label style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:11px"><input type="checkbox" '+(cfg.enabled?'checked':'')+' onchange="updTVMV(\''+z+'\',\'enabled\',this.checked)"> Actif</label>';
    tvHtml+='</div>';
    tvHtml+='<div style="display:flex;height:18px;border-radius:4px;overflow:hidden;margin-bottom:5px">';
    tvHtml+='<div style="width:'+pA+'%;background:var(--g);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">A</div>';
    tvHtml+='<div style="width:'+pB+'%;background:var(--o);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">B</div>';
    tvHtml+='<div style="width:'+pC+'%;background:var(--r);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">C</div>';
    tvHtml+='</div>';
    tvHtml+='<div style="display:flex;gap:8px;font-size:10px;margin-bottom:10px">';
    tvHtml+='<span style="color:var(--g)"><b>A</b> '+nA+' ('+pA+'%)</span><span style="color:var(--o)"><b>B</b> '+nB+' ('+pB+'%)</span><span style="color:var(--r)"><b>C</b> '+nC+' ('+pC+'%)</span>';
    tvHtml+='</div>';
    tvHtml+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    tvHtml+='<div style="background:var(--gbg);border:1px solid var(--gbrd);border-radius:var(--r6);padding:8px">';
    tvHtml+='<div style="font-size:10px;font-weight:700;color:var(--g);margin-bottom:5px">A → proche chemin</div>';
    tvHtml+='<div style="display:flex;align-items:center;gap:4px;font-size:11px;margin-bottom:4px">Seuil: <input type="number" min="1" max="99" value="'+cfg.abcA+'" style="width:48px;border:1px solid var(--gbrd);border-radius:3px;padding:1px 4px;font-size:11px" onchange="updTVMV(\''+z+'\',\'abcA\',+this.value)"> %</div>';
    tvHtml+='<div style="font-size:9px;color:var(--g);margin-top:3px">QI ≥ '+(rk[nA-1]?rk[nA-1].q:0)+'</div></div>';
    tvHtml+='<div style="background:var(--rbg);border:1px solid var(--rbrd);border-radius:var(--r6);padding:8px">';
    tvHtml+='<div style="font-size:10px;font-weight:700;color:var(--r);margin-bottom:5px">C → fond d\'allée</div>';
    tvHtml+='<div style="display:flex;align-items:center;gap:4px;font-size:11px;margin-bottom:4px">Seuil: <input type="number" min="1" max="100" value="'+cfg.abcB+'" style="width:48px;border:1px solid var(--rbrd);border-radius:3px;padding:1px 4px;font-size:11px" onchange="updTVMV(\''+z+'\',\'abcB\',+this.value)"> %</div>';
    tvHtml+='<div style="font-size:9px;color:var(--r);margin-top:3px">QI ≤ '+(rk[nA+nB]?rk[nA+nB].q:0)+'</div></div>';
    // D seuils
    tvHtml+='<div style="background:#f3e8ff;border:1px solid #d8b4fe;border-radius:var(--r6);padding:8px;margin-top:8px">';
    tvHtml+='<div style="font-size:10px;font-weight:700;color:#6b3fa0;margin-bottom:6px">D — Faible rotation (sous-partie de C)</div>';
    tvHtml+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
    tvHtml+='<span style="font-size:11px;color:#6b3fa0">QI ≤ <input type="number" min="0" max="99" value="'+cfg.dQI+'" style="width:44px;border:1px solid #d8b4fe;border-radius:3px;padding:1px 4px;font-size:11px" onchange="updTVMV(\''+z+'\',\'dQI\',+this.value)"></span>';
    tvHtml+='<span style="font-size:11px;color:#6b3fa0">Colis ≤ <input type="number" min="0" max="99" value="'+cfg.dColis+'" style="width:44px;border:1px solid #d8b4fe;border-radius:3px;padding:1px 4px;font-size:11px" onchange="updTVMV(\''+z+'\',\'dColis\',+this.value)"></span>';
    var _nD=zP.filter(function(p){var ri=rk.findIndex(function(r){return r.id===p.id;});return p.q>0&&p.q<=cfg.dQI&&(p.c||1)<=cfg.dColis&&(ri>=nA+nB||p.q<=1);}).length;
    tvHtml+='<span style="font-size:11px;color:#6b3fa0;font-weight:600">'+_nD+' produits</span>';
    tvHtml+='</div></div>';
    tvHtml+='</div>';
    tvHtml+='<div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:5px">Composition par classe</div>';
    tvHtml+='<div style="display:flex;flex-direction:column;gap:3px">';
    [['A',rk.slice(0,nA),'var(--g)','var(--gbg)'],['B',rk.slice(nA,nA+nB),'var(--o)','var(--obg)'],['C',zP.filter(function(p){return P_ABC[p.id]==='C';}),'var(--r)','var(--rbg)'],['D',zP.filter(function(p){return P_ABC[p.id]==='D';}),'#6b3fa0','#f3e8ff']].forEach(function(cls){
      var fb={};cls[1].forEach(function(p){fb[p.f]=(fb[p.f]||0)+1;});var cnt=cls[1].length;
      tvHtml+='<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;background:'+cls[3]+';border-radius:5px">';
      tvHtml+='<span style="font-weight:800;color:'+cls[2]+';min-width:14px;font-size:12px">'+cls[0]+'</span>';
      tvHtml+='<span style="font-size:10px;color:var(--text3);min-width:55px">'+cnt+' prod.</span>';
      tvHtml+='<div style="display:flex;gap:2px;flex-wrap:wrap">';
      Object.entries(fb).sort(function(a,b){return b[1]-a[1];}).slice(0,8).forEach(function(fe){
        var fp=Math.round(fe[1]/cnt*100);
        tvHtml+='<span class="fam f'+fe[0]+'" style="font-size:8px;padding:0 3px;cursor:pointer" onclick="showAbcList(\''+z+'\',\''+cls[0]+'\',\''+fe[0]+'\')">'+fe[0]+' '+fp+'%</span>';
      });
      tvHtml+='</div></div>';
    });
    tvHtml+='</div>';
    // ── Tableau ABC allée × étagère pour cette zone ──────────────
    var zAllees2=[...new Set(zP.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
    var zEts=[...new Set(zP.map(function(p){return p.et;}))].sort(function(a,b){return a-b;});
    tvHtml+='<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">';
    tvHtml+='<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">ABC par allée × étagère <span style="font-size:10px;font-weight:400;color:var(--text3)">— cliquer pour assigner, cliquer sur le n° d\'allée pour détailler par étage</span></div>';
    tvHtml+='<div style="overflow-x:auto"><table class="pt"><thead><tr>';
    tvHtml+='<th class="corner">Allée</th>';
    zEts.forEach(function(et){tvHtml+='<th style="min-width:46px">Ét.'+et+'</th>';});
    tvHtml+='</tr></thead><tbody>';
    zAllees2.forEach(function(a){
      var col2=zc(a);
      tvHtml+='<tr><td class="rh" style="border-left:3px solid '+col2+';cursor:pointer;color:var(--accent);font-size:12px" onclick="openAbcDetail('+a+')" title="Config par étage">'+a+'</td>';
      zEts.forEach(function(et){
        var cur=(ABC_POS[a]&&ABC_POS[a][et]&&ABC_POS[a][et][0])||'';
        tvHtml+='<td><div class="fc">';
        ['A','B','C'].forEach(function(v){
          tvHtml+='<span class="ft'+(cur===v?' on-'+v:'')+'" style="font-size:9px;padding:1px 3px" onclick="tAbcPos('+a+','+et+',0,\''+v+'\',this)">'+v+'</span>';
        });
        tvHtml+='</div></td>';
      });
      tvHtml+='</tr>';
    });
    tvHtml+='</tbody></table></div></div></div>';
    var _dP2=zP.filter(function(p){var ri=rk.findIndex(function(r){return r.id===p.id;});return p.q>0&&p.q<=6&&(p.c||1)<=6&&(ri>=nA+nB||p.q<=1);});
    if(_dP2.length>0){
      tvHtml+='<div style="margin-top:8px;padding:0 4px 4px">';
      tvHtml+='<button class="btn" style="width:100%;background:#f3e8ff;color:#6b3fa0;border-color:#d8b4fe;font-size:11px" onclick="showDProds(\''+z+'\')">';
      tvHtml+='📋 Voir les '+_dP2.length+' produits D — '+z+'</button>';
      tvHtml+='</div>';
    }
  });
  tvHtml+='</div></div>';
  var h='';
  h+='<div style="padding:10px 14px;border-bottom:1px solid var(--border);background:#fff;flex-shrink:0">';
  h+='<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:8px">Légende des familles</div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
  var FAM_LABELS={N:'Nourriture',H:'Hygiène/Entretien',L:'Boissons/Alcool',U:'Ustensiles',E:'Épices/Condiments',K:'Consommables cuisine',C:'Couches',B:'Bébé',A:'Animaux',P:'Pâtes/Riz',V:'Conserves',Z:'Non classé'};
  Object.entries(FAM_LABELS).forEach(function(e){
    h+='<div style="display:flex;align-items:center;gap:4px">';
    h+='<span class="fam f'+e[0]+'" style="font-size:11px;padding:2px 7px;font-weight:700">'+e[0]+'</span>';
    h+='<span style="font-size:11px;color:var(--text3)">'+e[1]+'</span>';
    h+='</div>';
  });
  h+='</div></div>';
  h+='<div>'+tvHtml+'</div>';
  var FAM_LABELS={N:'Nourriture',H:'Hygiène/Entretien',L:'Boissons/Alcool',U:'Ustensiles',E:'Épices/Condiments',K:'Consommables cuisine',C:'Couches',B:'Bébé',A:'Animaux',P:'Pâtes/Riz',V:'Conserves',Z:'Non classé'};
  var legendH='<div style="padding:8px 14px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
  Object.entries(FAM_LABELS).forEach(function(e){legendH+='<span style="display:flex;align-items:center;gap:3px">';legendH+='<span class="fam f'+e[0]+'" style="font-size:10px;padding:1px 6px">'+e[0]+'</span>';legendH+='<span style="font-size:10px;color:var(--text3)">'+e[1]+'</span></span>';});
  legendH+='</div>';
  el.innerHTML=legendH+h;
}




function closeAbcModal(btn){var m=btn;while(m&&m.style&&m.style.position!=='fixed')m=m.parentNode;if(m)m.remove();}
function tAbcPos(a,et,nv,v,el){
  if(!ABC_POS[a])ABC_POS[a]={};
  if(!ABC_POS[a][et])ABC_POS[a][et]={};
  var cur=ABC_POS[a][et][nv]||'';
  var newVal=cur===v?'':v;
  ABC_POS[a][et][nv]=newVal;
  sabcpos();
  // Update button styles
  var fc=el.parentNode;
  fc.querySelectorAll('.ft').forEach(function(btn){
    ['A','B','C','D'].forEach(function(x){btn.classList.remove('on-'+x);});
  });
  if(newVal)el.classList.add('on-'+newVal);
  computeAlerts();updateBadge();refreshDashIfActive();
}

function openAbcDetail(a){
  var nvs=[...new Set(P.filter(function(p){return p.a===a;}).map(function(p){return p.nv;}))].sort(function(x,y){return x-y;});
  var ets=[...new Set(P.filter(function(p){return p.a===a;}).map(function(p){return p.et;}))].sort(function(x,y){return x-y;});
  var modal=document.createElement('div');
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto';
  var h='<div style="background:#fff;border-radius:12px;width:700px;max-width:96vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2)">';
  h+='<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0">';
  h+='<span style="font-size:14px;font-weight:700;color:'+zc(a)+'">Allée '+a+'</span>';
  h+='<span style="font-size:11px;color:var(--text3)">Config ABC par étage × étagère</span>';
  h+='<button onclick="closeAbcModal(this)" style="margin-left:auto;border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h+='</div><div style="overflow:auto;flex:1;padding:12px">';
  h+='<div style="font-size:10px;color:var(--text3);margin-bottom:8px">La config par étage est prioritaire sur la config étagère générale (colonne '*').</div>';
  h+='<table class="pt"><thead><tr><th class="corner">Étage</th>';
  ets.forEach(function(et){h+='<th>Ét.'+et+'</th>';});
  h+='</tr></thead><tbody>';
  nvs.forEach(function(nv){
    h+='<tr><td class="rh">'+(nv*10)+'x</td>';
    ets.forEach(function(et){
      var cur=(ABC_POS[a]&&ABC_POS[a][et]&&ABC_POS[a][et][nv])||'';
      var inh=(ABC_POS[a]&&ABC_POS[a][et]&&ABC_POS[a][et][0])||'';
      h+='<td><div class="fc">';
      ['A','B','C'].forEach(function(v){
        var on=cur===v;
        h+='<span class="ft'+(on?' on-'+v:'')+'" style="font-size:9px;padding:1px 4px;'+(inh&&!cur?'opacity:.4':'')+'" onclick="tAbcPos('+a+','+et+','+nv+',\''+v+'\',this)">'+v+'</span>';
      });
      h+='</div></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div></div>';
  modal.innerHTML=h;
  document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
}

/* ══ ÉTIQUETTES ══════════════════════════════════════════════════════ */
// → etiquettes.js


function rFamilles(){
  var el=document.getElementById('familles-page');if(!el)return;
  var allees=[...new Set(P.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
  var maxNv=11;var nvs=Array.from({length:maxNv},function(_,i){return i+1;});
  var fams=['N','H','L','U','E','K','P','V','C','B','A','Z'];
  var h='';
h+='<div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--text2)">Familles par étage</div>';
  h+='<table class="pt"><thead><tr><th class="corner">Allée</th>';
  nvs.forEach(function(n){h+='<th>Étage '+n+'x</th>';});
  h+='</tr></thead><tbody>';
  allees.forEach(function(a){
    var col=zc(a);
    h+='<tr><td class="rh" style="border-left:3px solid '+col+'">'+a+'<span style="font-size:9px;color:var(--text3);display:block">'+zone(a)+'</span></td>';
    nvs.forEach(function(nv){
      var cur=getNvFams(a,nv);
      h+='<td><div class="fc">';
      fams.forEach(function(f){
        h+='<span class="ft'+(cur.includes(f)?' on-'+f:'')+'" onclick="tFam('+a+','+nv+',\x27'+f+'\x27,this)">'+f+'</span>';
      });
      h+='</div></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  el.innerHTML=h;
}


function refreshDashIfActive(){
  var dp=document.getElementById('dash-page');
  if(dp&&dp.classList.contains('active')){var sy=dp.scrollTop;rDash();dp.scrollTop=sy;}
}
function tFam(a,nv,f,el){
  var fams=getNvFams(a,nv);
  if(fams.includes(f)){fams=fams.filter(function(x){return x!==f;});el.classList.remove('on-'+f);}
  else{fams.push(f);el.classList.add('on-'+f);}
  setNvFams(a,nv,fams);
  computeAlerts();updateBadge();refreshDashIfActive();
}

/* ══ DASHBOARD ══════════════════════════════════════════════════════ */

function setDashFilter(v){DASH_FILTER=DASH_FILTER===v?'':v;rDash();}
function setDashABC(v){DASH_ABC=DASH_ABC===v?'':v;rDash();}
function setDashQI(v){DASH_QI=DASH_QI===v?'':v;rDash();}
function setDashStock(v){DASH_STOCK=DASH_STOCK===v?'':v;rDash();}
function resetDashFilters(){DASH_FILTER='';DASH_ABC='';DASH_QI='';DASH_STOCK='';DASH_SEARCH='';DASH_SEARCH_OPEN=false;rDash();}
function toggleDashSearch(){DASH_SEARCH_OPEN=!DASH_SEARCH_OPEN;if(!DASH_SEARCH_OPEN)DASH_SEARCH='';rDash();setTimeout(function(){var el=document.getElementById('dash-search-input');if(el)el.focus();},50);}
function setDashSearch(v){DASH_SEARCH=v;rDash();}

function rDash(){
  var el=document.getElementById('dash-page');if(!el)return;
  if(!P.length){el.innerHTML='<div style="padding:20px;color:var(--text3)">Importer un CSV.</div>';return;}
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var ATC={M:'var(--b)',D:'var(--g)',S:'var(--r)',R:'var(--o)',A:'var(--accent)',P:'var(--pu)',F:'#6b3fa0'};
  var types=['M','D','S','R','A','P','F'];
  var globalCounts={M:0,D:0,S:0,R:0,A:0,P:0,F:0};
  Object.values(ALERTS).forEach(function(als){als.forEach(function(a){if(globalCounts[a.t]!==undefined)globalCounts[a.t]++;});});
  var allNivs=[...new Set(P.map(function(p){return p.a+'_'+p.et+'_'+p.nv;}))];
  var validCount=allNivs.filter(function(k){return VALID[k];}).length;

  // ABC pre-calc
  P_ABC={};
  var allZoneNames=[...new Set(P.map(function(p){return zone(p.a);}))].sort();
  allZoneNames.forEach(function(z){
    var cfg=getTVMV(z);
    var zP=P.filter(function(p){return zone(p.a)===z;});
    var rk=[...zP].filter(function(p){return p.q>1;}).sort(function(a,b){return b.q-a.q;});
    var tQI=rk.reduce(function(s,p){return s+p.q;},0),cum=0,nA=0,nB=0;
    rk.forEach(function(p){cum+=p.q;var pct=tQI?cum/tQI*100:0;if(pct<=cfg.abcA)nA++;else if(pct<=cfg.abcB)nB++;});
    rk.forEach(function(p,i){
      var cls=i<nA?'A':i<nA+nB?'B':'C';
      if(cls==='C'&&p.q>0&&p.q<=(cfg.dQI||6)&&(p.c||1)<=(cfg.dColis||6))cls='D';
      P_ABC[p.id]=cls;
    });
    zP.filter(function(p){return p.q<=1;}).forEach(function(p){
      P_ABC[p.id]=(p.c||1)<=(cfg.dColis||6)?'D':'C';
    });
  });

  function prodMatch(p){
    if(DASH_FILTER&&!(ALERTS[p.id]||[]).some(function(a){return a.t===DASH_FILTER;}))return false;
    if(DASH_ABC==='D'){if(P_ABC[p.id]!=='D')return false;}
    else if(DASH_ABC&&P_ABC[p.id]!==DASH_ABC)return false;
    if(DASH_QI){var q=p.q;
      if(DASH_QI==='0'&&q!==0)return false;
      if(DASH_QI==='1'&&q!==1)return false;
      if(DASH_QI==='2+'&&q<2)return false;
    }
    if(DASH_STOCK==='0'&&(p.st||0)!==0)return false;
    if(DASH_STOCK==='pos'&&(p.st||0)<=0)return false;
    if(DASH_SEARCH&&p.n.toLowerCase().indexOf(DASH_SEARCH.toLowerCase())<0)return false;
    return true;
  }
  var hasFilter=DASH_FILTER||DASH_ABC||DASH_QI||DASH_STOCK||DASH_SEARCH;

  // Set default zone if none selected
  if(!DASH_ZONE||!allZoneNames.includes(DASH_ZONE))DASH_ZONE=allZoneNames[0]||'';

  // ── Header sticky ──────────────────────────────────────────────
  var h='<div style="position:sticky;top:-14px;z-index:10;padding:8px 14px;border-bottom:1px solid var(--border);background:#fff;display:flex;flex-direction:column;gap:6px;margin:-14px -14px 0 -14px">';
  h+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
  h+='<span style="font-size:12px;color:var(--text3)"><b style="color:var(--text)">'+P.length+'</b> produits</span>';
  h+='<span style="font-size:12px;color:var(--text3)"><b style="color:var(--r)">'+Object.keys(ALERTS).length+'</b> alertes</span>';
  h+='<span style="font-size:12px;color:var(--text3)"><b style="color:var(--g)">'+Math.round(validCount/allNivs.length*100)+'%</b> validé</span>';
  h+='<div style="display:flex;gap:3px;align-items:center;margin-left:4px">';
  h+='<span style="font-size:10px;color:var(--text3);margin-right:2px">Alerte:</span>';
  types.forEach(function(ty){
    var on=DASH_FILTER===ty;
    var s=on?'background:'+ATC[ty]+';color:#fff;border-color:'+ATC[ty]+';':'';
    h+='<button class="btn xs" style="'+s+'" onclick="setDashFilter(\''+ty+'\')">'+AT[ty]+' '+globalCounts[ty]+'</button>';
  });
  h+='</div></div>';
  h+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
  h+='<div style="display:flex;gap:3px;align-items:center">';
  h+='<span style="font-size:10px;color:var(--text3);margin-right:2px">ABC:</span>';
  [['A','var(--g)'],['B','var(--o)'],['C','var(--r)'],['D','#6b3fa0']].forEach(function(x){
    var on=DASH_ABC===x[0];
    var s=on?'background:'+x[1]+';color:#fff;border-color:'+x[1]+';':'color:'+x[1]+';border-color:'+x[1]+'44;';
    h+='<button class="btn xs" style="'+s+'" onclick="setDashABC(\''+x[0]+'\')">'+x[0]+'</button>';
  });
  h+='</div>';
  h+='<div style="display:flex;gap:3px;align-items:center">';
  h+='<span style="font-size:10px;color:var(--text3);margin-right:2px">QI:</span>';
  var _zones2=[...new Set(P.map(function(p){return zone(p.a);}))];
  var _cfg0=_zones2.length?getTVMV(_zones2[0]):{};
  var _gDqi=_cfg0.dQI!==undefined?_cfg0.dQI:6;
  var _gDcol=_cfg0.dColis!==undefined?_cfg0.dColis:6;
  h+='<span style="font-size:11px;color:#6b3fa0;display:flex;align-items:center;gap:3px">';
  h+='<b>D</b>: QI≤<input type="number" value="'+_gDqi+'" min="0" max="99" style="width:36px;border:1px solid #d8b4fe;border-radius:3px;padding:0 3px;font-size:11px;color:#6b3fa0" onchange="updGlobalD(+this.value,null)">';
  h+=' colis≤<input type="number" value="'+_gDcol+'" min="0" max="99" style="width:36px;border:1px solid #d8b4fe;border-radius:3px;padding:0 3px;font-size:11px;color:#6b3fa0" onchange="updGlobalD(null,+this.value)">';
  h+='</span>';
  h+='<button class="btn xs" style="background:#f3e8ff;color:#6b3fa0;border-color:#d8b4fe" onclick="showAllDProds(DASH_ZONE)">📋 Produits D</button>';
  h+='<span style="font-size:11px;color:var(--text3);margin-right:2px">QI:</span>';
  ['0','1','2+'].forEach(function(q){
    var on=DASH_QI===q;
    var s=on?'background:var(--accent);color:#fff;border-color:var(--accent);':'';
    h+='<button class="btn xs" style="'+s+'" onclick="setDashQI(\''+q+'\')">'+q+'</button>';
  });
  h+='</div>';
  h+='<div style="display:flex;gap:3px;align-items:center">';
  h+='<span style="font-size:10px;color:var(--text3);margin-right:2px">Stock:</span>';
  [['0','Rupture','var(--r)'],['pos','En stock','var(--g)']].forEach(function(x){
    var on=DASH_STOCK===x[0];
    var s=on?'background:'+x[2]+';color:#fff;border-color:'+x[2]+';':'';
    h+='<button class="btn xs" style="'+s+'" onclick="setDashStock(\''+x[0]+'\')">'+x[1]+'</button>';
  });
  h+='</div>';
  var searchOn=DASH_SEARCH_OPEN||DASH_SEARCH;
  h+='<button class="btn xs" style="'+(searchOn?'background:var(--accent);color:#fff;border-color:var(--accent);':'')+'" onclick="toggleDashSearch()">🔍'+(DASH_SEARCH?' : '+DASH_SEARCH.slice(0,15):'')+'</button>';
  if(hasFilter)h+='<button class="btn xs bad" onclick="resetDashFilters()">✕ Reset</button>';
  h+='</div>';
  if(DASH_SEARCH_OPEN)h+='<div style="padding:2px 0"><input id="dash-search-input" type="text" value="'+DASH_SEARCH+'" placeholder="Nom, EAN, ID..." style="border:1px solid var(--border2);border-radius:var(--r6);padding:5px 10px;font-size:12px;width:280px;background:#fff" oninput="setDashSearch(this.value)"></div>';
  h+='</div>';

  // ── Zone sub-tabs ──────────────────────────────────────────────
  h+='<div id="dash-zone-tabs">';
  allZoneNames.forEach(function(z){
    h+='<button class="dzt'+(z===DASH_ZONE?' active':'')+'" onclick="DASH_ZONE=\''+z+'\';rDash()">'+z+'</button>';
  });
  h+='</div>';

  // ── Zone content ───────────────────────────────────────────────
  h+='<div style="padding:12px">';
  var z=DASH_ZONE;
  var zProds=P.filter(function(p){return zone(p.a)===z;});
  var zAllees=[...new Set(zProds.map(function(p){return p.a;}))].sort(function(a,b){return a-b;});
  var cfg=getTVMV(z);col=ZC[z]||'#999';

  // ─── 1. Tableau produits à déplacer ───────────────────────────
  h+='<div class="dash-section">';
  h+='<div class="dash-section-hd" style="color:'+col+'">'+z+' — Produits à déplacer</div>';
  h+='<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:11px">';
  h+='<thead><tr style="background:var(--bg2)">';
  h+='<th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border2)">Allée</th>';
  h+='<th style="padding:5px 8px;border-bottom:1px solid var(--border2)">Prod.</th>';
  types.forEach(function(ty){h+='<th style="padding:5px 8px;border-bottom:1px solid var(--border2);color:'+ATC[ty]+'">'+AT[ty]+'</th>';});
  h+='<th style="padding:5px 8px;border-bottom:1px solid var(--border2)">Validé</th>';
  h+='<th style="padding:5px 8px;border-bottom:1px solid var(--border2)">Familles</th>';
  h+='</tr></thead><tbody>';
  zAllees.forEach(function(a){
    var ap=P.filter(function(p){return p.a===a;});
    var apF=ap.filter(prodMatch);
    var aCounts={M:0,D:0,S:0,R:0,A:0,P:0,F:0};
    apF.forEach(function(p){(ALERTS[p.id]||[]).forEach(function(al){if(aCounts[al.t]!==undefined)aCounts[al.t]++;});});
    if(hasFilter&&apF.length===0)return;
    var aNivs=[...new Set(ap.map(function(p){return p.a+'_'+p.et+'_'+p.nv;}))];
    var aValid=aNivs.filter(function(k){return VALID[k];}).length;
    var aOk=Object.values(aCounts).every(function(v){return v===0;});
    var aFams=[...new Set(ap.map(function(p){return p.f;}))].sort();
    var col2=zc(a);
    h+='<tr style="border-bottom:1px solid var(--border);cursor:pointer'+(aOk?';background:#f9fffe':'')+'" onclick="goAllee('+a+')">';
    h+='<td style="padding:4px 8px;font-weight:700;color:'+col2+'">'+a+(aOk?' <span style="color:var(--g);font-size:10px">✓</span>':'')+'</td>';
    h+='<td style="padding:4px 8px;text-align:center;color:var(--text3)">'+apF.length+'<span style="font-size:9px">/'+ap.length+'</span></td>';
    types.forEach(function(ty){var v=aCounts[ty];h+='<td style="padding:4px 8px;text-align:center;font-weight:'+(v>0?700:400)+';color:'+(v>0?ATC[ty]:'var(--border2)')+(DASH_FILTER===ty?';background:'+ATC[ty]+'18':'')+'">'+(v>0?'<span style="cursor:pointer" onclick="event.stopPropagation();showDashList('+a+',\''+ty+'\')">'+v+'</span>':'—')+'</td>';});
    h+='<td style="padding:4px 8px;text-align:center;color:var(--g)">'+aValid+'/'+aNivs.length+'</td>';
    h+='<td style="padding:4px 8px"><div style="display:flex;gap:2px;flex-wrap:wrap">';
    aFams.forEach(function(f){h+='<span class="fam f'+f+'" style="font-size:8px;padding:1px 3px">'+f+'</span>';});
    h+='</div></td></tr>';
  });
  h+='</tbody></table></div></div>';

  // ─── 2. Validation des étages ─────────────────────────────────
  var zEts=[...new Set(zProds.map(function(p){return p.et;}))].sort(function(a,b){return a-b;});
  var zNvs=[...new Set(zProds.map(function(p){return p.nv;}))].sort(function(a,b){return a-b;});
  var zMaxNv=zNvs.length?Math.max.apply(null,zNvs):9;
  h+='<div class="dash-section">';
  h+='<div class="dash-section-hd">Validation des étages</div>';
  h+='<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:11px;width:100%">';
  h+='<thead><tr style="background:var(--bg2)">';
  h+='<th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border2);position:sticky;left:0;background:var(--bg2)">Allée</th>';
  zEts.forEach(function(et){h+='<th style="padding:5px 8px;border-bottom:1px solid var(--border2);text-align:center;min-width:90px">Ét.'+et+'</th>';});
  h+='</tr></thead><tbody>';
  zAllees.forEach(function(a){
    var ap=P.filter(function(p){return p.a===a;});
    var aEts=[...new Set(ap.map(function(p){return p.et;}))].sort(function(x,y){return x-y;});
    var col2=zc(a);
    h+='<tr style="border-bottom:1px solid var(--border)">';
    h+='<td style="padding:4px 8px;font-weight:700;color:'+col2+';position:sticky;left:0;background:#fff;cursor:pointer" onclick="goAllee('+a+')">'+a+'</td>';
    zEts.forEach(function(et){
      if(!aEts.includes(et)){h+='<td style="border-left:1px solid var(--border)"></td>';return;}
      // Show all nv from 1 to zMaxNv, mark empty ones differently
      h+='<td style="padding:3px 4px;border-left:1px solid var(--border)"><div class="vg-cell">';
      var hasEt=aEts.includes(et);
      if(hasEt){
        for(var nv2=1;nv2<=zMaxNv;nv2++){
          var vkey2=a+'_'+et+'_'+nv2;
          var ok2=VALID[vkey2];
          h+='<span class="vg-nv'+(ok2?' ok':'')+'" onclick="tValid(\''+vkey2+'\')" title="'+a+'.'+et+'.'+nv2+'x">'+(nv2*10)+'</span>';
        }
      }
      h+='</div></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div></div>';

  // ─── 3. ABC / Pareto ──────────────────────────────────────────
  var rk=[...zProds].filter(function(p){return p.q>1;}).sort(function(a,b){return b.q-a.q;});
  var tQI=rk.reduce(function(s,p){return s+p.q;},0);
  var cumul2=0,nA=0,nB=0,qA=0,qB=0;
  rk.forEach(function(p){cumul2+=p.q;var pct=tQI?cumul2/tQI*100:0;if(pct<=cfg.abcA){nA++;qA+=p.q;}else if(pct<=cfg.abcB){nB++;qB+=p.q;}});
  var nC=rk.length-nA-nB+zProds.filter(function(p){return p.q<=1;}).length;
  var pA=tQI?Math.round(qA/tQI*100):0;
  h+='<div class="dash-section">';
  h+='<div class="dash-section-hd">Classification ABC</div>';
  h+='<div style="padding:10px 12px">';
  h+='<div style="display:flex;height:16px;border-radius:4px;overflow:hidden;margin-bottom:6px">';
  h+='<div style="width:'+pA+'%;background:var(--g)"></div>';
  h+='<div style="width:'+(tQI?Math.round(qB/tQI*100):0)+'%;background:var(--o)"></div>';
  h+='<div style="flex:1;background:var(--r)"></div>';
  h+='</div>';
  h+='<div style="display:flex;gap:10px;font-size:11px;margin-bottom:10px">';
  h+='<span style="color:var(--g)">A: '+nA+' prod. — Seuil <input type="number" min="1" max="99" value="'+cfg.abcA+'" style="width:42px;border:1px solid var(--gbrd);border-radius:3px;padding:1px 4px;font-size:10px" onchange="updTVMV(\''+z+'\',\'abcA\',+this.value)"> % <span style="font-size:10px;color:var(--g)">(QI ≥ '+(rk[nA-1]?rk[nA-1].q:0)+')</span></span>';
  h+='<span style="color:var(--o)">B: '+nB+' prod. — Seuil <input type="number" min="1" max="100" value="'+cfg.abcB+'" style="width:42px;border:1px solid #ffcc80;border-radius:3px;padding:1px 4px;font-size:10px" onchange="updTVMV(\''+z+'\',\'abcB\',+this.value)"> % <span style="font-size:10px;color:var(--o)">(QI '+(rk[nA+nB-1]?rk[nA+nB-1].q:0)+' – '+(rk[nA]?rk[nA].q:0)+')</span></span>';
  h+='<span style="color:var(--r)">C: '+nC+' prod. <span style="font-size:10px;color:var(--r)">(QI ≤ '+(rk[nA+nB]?rk[nA+nB].q:0)+')</span></span>';
  h+='</div>';
  // Composition par classe
  var clsData=[
    ['A',rk.slice(0,nA),'var(--g)','var(--gbg)'],
    ['B',rk.slice(nA,nA+nB),'var(--o)','var(--obg)'],
    ['C',zProds.filter(function(p){return P_ABC[p.id]==='C';}),'var(--r)','var(--rbg)']
  ];
  h+='<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:12px">';
  clsData.forEach(function(cls){
    var fb={};cls[1].forEach(function(p){fb[p.f]=(fb[p.f]||0)+1;});var cnt=cls[1].length||1;
    h+='<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;background:'+cls[3]+';border-radius:5px">';
    h+='<span style="font-weight:800;color:'+cls[2]+';min-width:14px;font-size:12px">'+cls[0]+'</span>';
    h+='<span style="font-size:10px;color:var(--text3);min-width:55px">'+cls[1].length+' prod.</span>';
    h+='<div style="display:flex;gap:2px;flex-wrap:wrap">';
    Object.entries(fb).sort(function(a,b){return b[1]-a[1];}).slice(0,8).forEach(function(fe){
      var fp=Math.round(fe[1]/cnt*100);
      h+='<span class="fam f'+fe[0]+'" style="font-size:8px;padding:0 3px;cursor:pointer" onclick="showAbcList(\''+z+'\',\''+cls[0]+'\',\''+fe[0]+'\')">'+fe[0]+' '+fp+'%</span>';
    });
    h+='</div></div>';
  });
  h+='</div>';
  // ABC table allée × étagère
  h+='<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">ABC par allée × étagère <span style="font-size:10px;font-weight:400;color:var(--text3)">— cliquer sur le n° d\'allée pour détailler par étage</span></div>';
  h+='<div style="overflow-x:auto"><table class="pt"><thead><tr><th class="corner">Allée</th>';
  zEts.forEach(function(et){h+='<th style="min-width:46px">Ét.'+et+'</th>';});
  h+='</tr></thead><tbody>';
  zAllees.forEach(function(a){
    var col2=zc(a);
    h+='<tr><td class="rh" style="border-left:3px solid '+col2+';cursor:pointer;color:var(--accent);font-size:12px" onclick="openAbcDetail('+a+')" title="Config par étage">'+a+'</td>';
    zEts.forEach(function(et){
      var cur=(ABC_POS[a]&&ABC_POS[a][et]&&ABC_POS[a][et][0])||'';
      h+='<td><div class="fc">';
      ['A','B','C'].forEach(function(v){
        h+='<span class="ft'+(cur===v?' on-'+v:'')+'" style="font-size:9px;padding:1px 3px" onclick="tAbcPos('+a+','+et+',0,\''+v+'\',this)">'+v+'</span>';
      });
      h+='</div></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div></div></div>';

  // ─── 4. Familles ──────────────────────────────────────────────
  var fams=['N','H','L','U','E','K','P','V','C','B','A','Z'];
  var maxNv=11;var nvs=Array.from({length:maxNv},function(_,i){return i+1;});
  h+='<div class="dash-section">';
  h+='<div class="dash-section-hd">Familles par étage</div>';
  h+='<div style="overflow-x:auto"><table class="pt"><thead><tr><th class="corner">Allée</th>';
  nvs.forEach(function(n){h+='<th>Étage '+n+'x</th>';});
  h+='</tr></thead><tbody>';
  zAllees.forEach(function(a){
    var col2=zc(a);
    h+='<tr><td class="rh" style="border-left:3px solid '+col2+'">'+a+'</td>';
    nvs.forEach(function(nv){
      var cur=getNvFams(a,nv);
      h+='<td><div class="fc">';
      fams.forEach(function(f){
        h+='<span class="ft'+(cur.includes(f)?' on-'+f:'')+'" onclick="tFam('+a+','+nv+',\''+f+'\',this)">'+f+'</span>';
      });
      h+='</div></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div></div>';

  h+='</div>';
  el.innerHTML=h;
}


function loadModalBarcode(code,btn){
  var zone=document.getElementById('modal-barcode-img');if(!zone)return;
  var real=String(code).replace(/\.0$/,'').trim();
  var modal=document.getElementById('dash-list-modal')||document.getElementById('all-d-modal');
  if(modal)modal.querySelectorAll('.ean-check-btn.active').forEach(function(b){b.classList.remove('active');b.style.background='';b.style.color='';});
  btn.classList.add('active');btn.style.background='var(--accent)';btn.style.color='#fff';
  zone.innerHTML='';
  try{
    var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.style.cssText='height:50px;display:block';
    zone.appendChild(svg);
    JsBarcode(svg,real,{format:'EAN13',height:40,fontSize:12,margin:4,displayValue:true});
  }catch(e){
    zone.innerHTML='<span style="font-size:11px;font-weight:600;color:var(--text2)">'+real+'</span>';
  }
}


function buildUniversalModal(opts){
  // opts: {id, title, badge, badgeColor, prods, AT, ATC}
  var modalId=opts.id||'u-modal';
  var ex=document.getElementById(modalId);if(ex)ex.remove();
  var AT=opts.AT||{M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var ATC=opts.ATC||{M:'var(--b)',D:'var(--g)',S:'var(--r)',R:'var(--o)',A:'var(--accent)',P:'var(--pu)',F:'#6b3fa0'};
  var prods=opts.prods||[];
  window['_uProds_'+modalId]=prods;
  window['_uFamSel_'+modalId]='';
  window['_uLastCb_'+modalId]=null;

  function buildRows(list){
    var rows='';
    list.forEach(function(p){
      var al=ALERTS[p.id]||[];
      var pts=p.z.split('.');
      var _ean=String(p.bc||'').replace(/\.0$/,'').trim();
      var abc=P_ABC[p.id]||'?';
      var abcC=abc==='A'?'var(--g)':abc==='B'?'var(--o)':abc==='D'?'#6b3fa0':'var(--r)';
      rows+='<tr style="border-bottom:1px solid var(--border)">';
      rows+='<td style="padding:4px 6px;text-align:center"><input type="checkbox" class="share-cb" data-id="'+p.id+'" style="width:15px;height:15px;cursor:pointer"></td>';
      rows+='<td style="padding:4px 6px"><button class="btn xs" onclick="copyProdName('+p.id+')" title="Copier">📋</button></td>';
      rows+='<td style="padding:7px 10px;max-width:240px;font-size:12px"><a href="https://products.app.deleev.com/products/'+p.id+'?tab=stock" target="_blank" style="color:var(--text);text-decoration:none;font-weight:500" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text)\'">'+p.n+'</a></td>';
      rows+='<td style="padding:4px 6px;text-align:center"><button class="btn xs ean-check-btn" onclick="loadModalBarcode(\''+_ean+'\',this)">✓</button></td>';
      rows+='<td style="padding:7px 10px;color:var(--accent);font-weight:600;white-space:nowrap">'+p.z+'</td>';
      rows+='<td style="padding:7px 10px;font-weight:700">'+p.q+'</td>';
      rows+='<td style="padding:7px 10px;font-weight:600;color:'+(p.st>0?'var(--g)':'var(--r)')+'">'+p.st+'</td>';
      rows+='<td style="padding:7px 10px;font-weight:700;color:'+abcC+'">'+abc+'</td>';
      rows+='<td style="padding:7px 10px;font-weight:600;color:var(--text3)">'+(p.c||'—')+'</td>';
      rows+='<td style="padding:4px 6px"><span class="fam f'+p.f+'" id="fam-badge-'+p.id+'" style="font-size:10px;padding:1px 4px">'+p.f+'</span>'+
        '<select onchange="setFamInModal('+p.id+',this.value)" style="border:1px solid var(--border);border-radius:4px;padding:1px 3px;font-size:10px;margin-left:2px"><option>N</option><option>H</option><option>L</option><option>U</option><option>E</option><option>K</option><option>C</option><option>B</option><option>A</option><option>P</option><option>V</option><option>Z</option></select></td>';
      rows+='<td style="padding:7px 10px">'+al.map(function(a){return'<span class="al a'+a.t+'" style="font-size:10px">'+AT[a.t]+'</span>';}).join(' ')+'</td>';
      rows+='<td style="padding:7px 10px;white-space:nowrap"><div style="display:flex;gap:2px;align-items:center">';
      rows+='<input type="number" value="'+pts[0]+'" id="dz-a-'+p.id+'" style="width:42px;border:1px solid var(--border2);border-radius:4px;padding:2px 3px;font-size:11px;text-align:center">';
      rows+='.<input type="number" value="'+pts[1]+'" id="dz-et-'+p.id+'" style="width:36px;border:1px solid var(--border2);border-radius:4px;padding:2px 3px;font-size:11px;text-align:center">';
      rows+='.<input type="number" value="'+pts[2]+'" id="dz-etg-'+p.id+'" style="width:36px;border:1px solid var(--border2);border-radius:4px;padding:2px 3px;font-size:11px;text-align:center">';
      rows+='<button class="btn xs" onclick="dashRezone('+p.id+')">✓</button>';
      _copyMap[p.id]=p.n;
      rows+='</td></tr>';
    });
    return rows;
  }

  var fams=[...new Set(prods.map(function(p){return p.f;}))].sort();
  var modal=document.createElement('div');
  modal.id=modalId;
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto';

  var h='<div style="background:#fff;border-radius:12px;width:1100px;max-width:98vw;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.2)">';
  // Header
  h+='<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap">';
  h+='<span style="font-weight:800;font-size:14px;color:'+(opts.badgeColor||'var(--text)')+';background:var(--bg2);padding:3px 10px;border-radius:6px">'+(opts.badge||'')+'</span>';
  h+='<span style="font-size:14px;font-weight:700">'+(opts.title||'')+'</span>';
  h+='<span style="font-size:12px;color:var(--text3)">'+prods.length+' produits</span>';
  // Barcode zone
  h+='<div id="modal-barcode-zone" style="display:flex;flex-direction:column;align-items:center;min-width:160px;padding:4px 8px;background:var(--bg2);border-radius:var(--r6);border:1px solid var(--border)">';
  h+='<span style="font-size:9px;color:var(--text3);margin-bottom:2px">Code-barre</span>';
  h+='<div id="modal-barcode-img" style="min-height:40px;display:flex;align-items:center;justify-content:center"><span style="font-size:10px;color:var(--text3)">— cliquer sur ✓ —</span></div></div>';
  // Famille filter
  h+='<div id="'+modalId+'-fam" style="display:flex;gap:3px;flex-wrap:wrap;align-items:center">';
  h+='<span style="font-size:10px;color:var(--text3)">Famille:</span>';
  fams.forEach(function(f){
    h+='<span class="fam f'+f+'" style="cursor:pointer;font-size:10px;padding:1px 5px" onclick="uFamFilt(\''+modalId+'\',\''+f+'\')">'+f+'</span>';
  });
  h+='</div>';
  // Buttons
  h+='<button onclick="uExportCSV(\''+modalId+'\')" style="padding:2px 10px;border:1px solid var(--border2);border-radius:20px;background:#fff;color:var(--text2);cursor:pointer;font-size:11px">📥 CSV</button>';
  h+='<button onclick="uShare(\''+modalId+'\',\''+((opts.title||'').replace(/'/g,''))+'\')" style="padding:2px 10px;border:1px solid #93c5fd;border-radius:20px;background:#eff6ff;color:#1d4ed8;cursor:pointer;font-size:11px">🔗 Partager</button>';
  h+='<button onclick="document.getElementById(\''+modalId+'\').remove()" style="margin-left:auto;border:none;background:none;font-size:18px;cursor:pointer;color:var(--text3)">✕</button>';
  h+='</div>';
  // Table
  h+='<div style="overflow-y:auto;flex:1"><table style="border-collapse:collapse;width:100%;font-size:11px">';
  h+='<thead><tr style="background:var(--bg2);position:sticky;top:0">';
  ['☐','','Nom','✓','Zonage','QI','Stock','ABC','Colis','Famille','Alertes','Rezonage'].forEach(function(c){
    h+='<th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--border2);white-space:nowrap">'+c+'</th>';
  });
  h+='</tr></thead><tbody id="'+modalId+'-tbody">'+buildRows(prods)+'</tbody></table></div></div>';

  modal.innerHTML=h;
  document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  window['_uLastCb_'+modalId]=null;
  initShiftClick(modal);

  // Famille filter
  window.uFamFilt=function(mid,f){
    var key='_uFamSel_'+mid;
    window[key]=window[key]===f?'':f;
    document.querySelectorAll('#'+mid+'-fam .fam').forEach(function(b){
      b.style.opacity=(!window[key]||b.textContent===window[key])?'1':'0.3';
      b.style.fontWeight=b.textContent===window[key]?'800':'400';
    });
    var list=window[key]?window['_uProds_'+mid].filter(function(p){return p.f===window[key];}):window['_uProds_'+mid];
    document.getElementById(mid+'-tbody').innerHTML=buildRows(list);
    window['_uLastCb_'+mid]=null;initShiftClick(document.getElementById(mid));
  };
  window.uExportCSV=function(mid){
    var ps=window['_uProds_'+mid]||[];
    var csv='ID,Nom,Zonage,QI,Stock,Colis,Famille\n';
    ps.forEach(function(p){csv+=p.id+',"'+p.n.replace(/"/g,'""')+'",'+p.z+','+p.q+','+(p.st||0)+','+(p.c||0)+','+p.f+'\n';});
    var blob=new Blob([csv],{type:'text/csv'});
    var a2=document.createElement('a');a2.href=URL.createObjectURL(blob);a2.download='produits.csv';a2.click();
  };
  window.uShare=function(mid,titre){
    var all=window['_uProds_'+mid]||[];
    var sel=getCheckedProds(all);
    var AT2={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
    var rows=sel.map(function(p){
      var al=ALERTS[p.id]||[];
      return {nom:p.n.slice(0,50),ean:String(p.bc||'').replace(/\.0$/,'').trim(),zonage:p.z,qi:p.q,stock:p.st||0,colis:p.c||0,alertes:al.map(function(a){return AT2[a.t];}).join(', ')};
    });
    shareView(titre+' ('+sel.length+')',rows);
  };
}

function showDashList(alleNum,alertType){
  function localProdMatch(p){
    if(DASH_ABC==='D'){if(P_ABC[p.id]!=='D')return false;}
    else if(DASH_ABC&&P_ABC[p.id]!==DASH_ABC)return false;
    if(DASH_QI){var q=p.q;if(DASH_QI==='0'&&q!==0)return false;if(DASH_QI==='1'&&q!==1)return false;if(DASH_QI==='2+'&&q<2)return false;}
    if(DASH_STOCK==='0'&&(p.st||0)!==0)return false;
    if(DASH_STOCK==='pos'&&(p.st||0)<=0)return false;
    if(DASH_SEARCH&&p.n.toLowerCase().indexOf(DASH_SEARCH.toLowerCase())<0)return false;
    return true;
  }
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var ATC={M:'var(--b)',D:'var(--g)',S:'var(--r)',R:'var(--o)',A:'var(--accent)',P:'var(--pu)',F:'#6b3fa0'};
  var prods=P.filter(function(p){
    return p.a===alleNum&&(ALERTS[p.id]||[]).some(function(a){return a.t===alertType;})&&localProdMatch(p);
  }).sort(function(a,b){return b.q-a.q;});
  buildUniversalModal({
    id:'dash-list-modal',
    badge:AT[alertType],badgeColor:ATC[alertType],
    title:'Allée '+alleNum,
    prods:prods,AT:AT,ATC:ATC
  });
}

function setFamInModal(id,f){
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  p.f=f;if(!FAM_OVERRIDE)window.FAM_OVERRIDE={};
  FAM_OVERRIDE[id]=f;S.set('fam_ov',FAM_OVERRIDE);
  computeAlerts();updateBadge();
  var b=document.getElementById('fam-badge-'+id);
  if(b){b.className='fam f'+f;b.textContent=f;}
  showToast('Famille: '+f);
}

var _dlProds=[];
var _dlFamSel='';
function dlFamFilt(f,el){
  _dlFamSel=_dlFamSel===f?'':f;
  document.querySelectorAll('#dl-fam-filters .fam').forEach(function(b){
    b.style.opacity=(!_dlFamSel||b.textContent===_dlFamSel)?'1':'0.3';
    b.style.fontWeight=b.textContent===_dlFamSel?'800':'400';
  });
  var filtered=_dlFamSel?_dlProds.filter(function(p){return p.f===_dlFamSel;}):_dlProds;
  dlRebuildRows(filtered);
}
function dlRebuildRows(list){
  var AT={M:'MONTER',D:'DESCENDRE',S:'SORTIR',R:'RECULER',A:'AVANCER',P:'PLEIN',F:'FOND'};
  var tbody=document.querySelector('#dash-list-modal tbody');
  if(!tbody)return;
  var rows='';
  list.forEach(function(p){
    var al=ALERTS[p.id]||[];var pts=p.z.split('.');
    var _eanCode=String(p.bc).replace(/\.0$/,'').trim();
    var abc=P_ABC?P_ABC[p.id]||'?':'?';
    var abcC=abc==='A'?'var(--g)':abc==='B'?'var(--o)':abc==='D'?'#6b3fa0':'var(--r)';
    rows+='<tr style="border-bottom:1px solid var(--border)">';
    rows+='<td style="padding:4px 8px;text-align:center"><input type="checkbox" class="share-cb" data-id="'+p.id+'" style="width:16px;height:16px;cursor:pointer"></td>';
    rows+='<td style="padding:4px 8px"><button class="btn xs" onclick="copyProdName('+p.id+')" title="Copier le nom">📋</button></td>';
    rows+='<td style="padding:8px 12px;max-width:260px;font-size:12px"><a href="https://products.app.deleev.com/products/'+p.id+'?tab=stock" target="_blank" style="color:var(--text);text-decoration:none;font-weight:500">'+p.n+'</a></td>';
    rows+='<td style="padding:4px 8px;text-align:center"><button class="btn xs ean-check-btn" onclick="loadModalBarcode(\''+_eanCode+'\',this)">✓</button></td>';
    rows+='<td style="padding:8px 12px;color:var(--accent);font-weight:600;white-space:nowrap">'+p.z+'</td>';
    rows+='<td style="padding:8px 12px;font-weight:700">'+p.q+'</td>';
    rows+='<td style="padding:8px 12px;font-weight:600;color:'+(p.st>0?'var(--g)':'var(--r)')+'">'+p.st+'</td>';
    rows+='<td style="padding:8px 12px;font-weight:700;color:'+abcC+'">'+abc+'</td>';
    rows+='<td style="padding:4px 8px"><span class="fam f'+p.f+'" id="fam-badge-'+p.id+'" style="font-size:10px;padding:1px 5px">'+p.f+'</span>'
      +'<select onchange="setFamInModal('+p.id+',this.value)" style="border:1px solid var(--border);border-radius:4px;padding:1px 3px;font-size:10px;margin-left:3px"><option value="N">N</option><option value="H">H</option><option value="L">L</option><option value="U">U</option><option value="E">E</option><option value="K">K</option><option value="C">C</option><option value="B">B</option><option value="A">A</option><option value="P">P</option><option value="V">V</option><option value="Z">Z</option></select></td>';
    rows+='<td style="padding:8px 12px">'+al.map(function(a){return'<span class="al a'+a.t+'" style="font-size:10px">'+AT[a.t]+'</span>';}).join(' ')+'</td>';
    rows+='<td style="padding:8px 12px;white-space:nowrap"><div style="display:flex;gap:3px;align-items:center">';
    rows+='<input type="number" value="'+pts[0]+'" id="dz-a-'+p.id+'" style="width:44px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
    rows+='<span>.</span><input type="number" value="'+pts[1]+'" id="dz-et-'+p.id+'" style="width:38px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
    rows+='<span>.</span><input type="number" value="'+pts[2]+'" id="dz-etg-'+p.id+'" style="width:38px;border:1px solid var(--border2);border-radius:4px;padding:2px 4px;font-size:11px;text-align:center">';
    rows+='<button class="btn xs" onclick="dashRezone('+p.id+')">✓</button>';
    _copyMap[p.id]=p.n;
    rows+='</td></tr>';
  });
  tbody.innerHTML=rows;
}
function dlShareView(prods,AT){
  prods=getCheckedProds(prods);
  var rows=prods.map(function(p){
    var al=ALERTS[p.id]||[];
    return {nom:p.n,ean:String(p.bc||'').replace(/\.0$/,'').trim(),zonage:p.z,qi:p.q,stock:p.st||0,colis:p.c||0,alertes:al.map(function(a){return AT[a.t];}).join(', ')};
  });
  shareView('Allée '+prods[0].a+' — '+(rows.length)+' produits',rows);
}
function dashRezone(id){
  var a=+document.getElementById('dz-a-'+id).value,et=+document.getElementById('dz-et-'+id).value,etg=+document.getElementById('dz-etg-'+id).value;
  if(!a||!et||!etg){showToast('Remplir tous les champs');return;}
  var p=P.find(function(x){return x.id===id;});if(!p)return;
  var old=p.z;p.a=a;p.et=et;p.nv=Math.floor(etg/10);p.p=etg%10;p.z=a+'.'+et+'.'+etg;
  showToast('Rezoné: '+old+' → '+p.z);computeAlerts();updateBadge();rDash();
  document.getElementById('dash-list-modal').remove();
}