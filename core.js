
// → data.js

let P=[];

const DRIVE_FILE_ID='19fxex1glSbhNf-wxzRADYUAkI6FeA6Sk';
// Proxies tentés dans l'ordre — le premier qui répond avec 200 est utilisé
const DRIVE_PROXIES=[
  'https://api.allorigins.win/raw?url='+encodeURIComponent('https://drive.google.com/uc?export=download&id='+DRIVE_FILE_ID),
  'https://drive.usercontent.google.com/download?id='+DRIVE_FILE_ID+'&export=download&confirm=t',
  'https://corsproxy.io/?https://drive.google.com/uc?export=download&id='+DRIVE_FILE_ID,
];

async function loadData(){
  // 1. Try localStorage cache first (instant)
  try{
    var _s=localStorage.getItem('wh4_products');
    if(_s){
      P=JSON.parse(decodeURIComponent(escape(atob(_s))));
      applyFamOv();
      document.getElementById('dinfo').textContent=P.length+' produits (cache)';
      ilog('📦 '+P.length+' produits restaurés depuis le cache');
      computeAlerts();updateBadge();T('kpi-dashboard');
      // Refresh from Drive in background
      loadFromDrive(true);
      return;
    }
  }catch(e){console.warn('Cache:',e);}
  // 2. No cache — load from Drive
  document.getElementById('dinfo').textContent='Chargement Drive...';
  ilog('⏳ Chargement depuis Google Drive...');
  loadFromDrive(false);
}

async function loadFromDrive(background){
  // Essaie chaque proxy dans l'ordre jusqu'au premier succès
  for(var i=0;i<DRIVE_PROXIES.length;i++){
    var url=DRIVE_PROXIES[i];
    try{
      var resp=await fetch(url,{redirect:'follow'});
      if(!resp.ok)throw new Error('HTTP '+resp.status);
      var text=await resp.text();
      if(!text||text.length<100)throw new Error('Fichier vide');
      parseC(text);
      if(!background)T('kpi-dashboard');
      else{
        // Rafraîchissement silencieux en arrière-plan
        if(P.length>0){
          document.getElementById('dinfo').textContent=P.length+' produits';
          ilog('🔄 Données mises à jour depuis Drive');
        }
      }
      return; // Succès — on sort
    }catch(e){
      console.warn('Drive proxy ['+i+']: '+e.message);
      // Proxy suivant…
    }
  }
  // Tous les proxies ont échoué
  if(!background){
    try{
      const bin=atob(B64);const b=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);
      const ds=new DecompressionStream('gzip');
      const w=ds.writable.getWriter();w.write(b);w.close();
      const r=ds.readable.getReader();const ch=[];
      while(true){const{done,value}=await r.read();if(done)break;ch.push(value);}
      const all=new Uint8Array(ch.reduce((a,c)=>a+c.length,0));
      let off=0;ch.forEach(c=>{all.set(c,off);off+=c.length;});
      P=JSON.parse(new TextDecoder().decode(all));
      document.getElementById('dinfo').textContent=P.length+' produits';
      applyFamOv();computeAlerts();updateBadge();T('kpi-dashboard');
    }catch(e2){
      document.getElementById('dinfo').textContent='Importer un CSV';
      ilog('⚠️ Drive inaccessible — importer un CSV manuellement');
      computeAlerts();updateBadge();T('kpi-dashboard');
    }
  }
}

async function _loadData_unused(){
  try{
    var _s=localStorage.getItem('wh4_products');
    if(_s){
      P=JSON.parse(decodeURIComponent(escape(atob(_s))));
      applyFamOv();document.getElementById('dinfo').textContent=P.length+' produits';
      ilog('📦 '+P.length+' produits restaurés');
      computeAlerts();updateBadge();T('kpi-dashboard');return;
    }
  }catch(e){console.warn('Cache:',e);}
  try{
    const bin=atob(B64);const b=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);
    const ds=new DecompressionStream('gzip');
    const w=ds.writable.getWriter();w.write(b);w.close();
    const r=ds.readable.getReader();const ch=[];
    while(true){const{done,value}=await r.read();if(done)break;ch.push(value);}
    const all=new Uint8Array(ch.reduce((a,c)=>a+c.length,0));
    let off=0;ch.forEach(c=>{all.set(c,off);off+=c.length;});
    P=JSON.parse(new TextDecoder().decode(all));
    document.getElementById('dinfo').textContent=P.length+' produits';
    applyFamOv();
  }catch(e){document.getElementById('dinfo').textContent='Importer un CSV';}
  computeAlerts();updateBadge();T('kpi-dashboard');
}


const S={get(k){try{return JSON.parse(localStorage.getItem('wh4_'+k));}catch{return null;}},set(k,v){localStorage.setItem('wh4_'+k,JSON.stringify(v));}};
let PARAMS=S.get('p4')||{};
let VALID=S.get('v4')||{};
let SORTIR=S.get('s4')||{};
let PLAN=S.get('pl4')||{items:[],zoom:1,ox:60,oy:60};
let CUR=S.get('cur4')||null;
let ALLEE_FILTERS=S.get('af')||[];
let PLAN_LOCKED=S.get('pl_lock')||false;
let DASH_FILTER='';
let DASH_ZONE='';
let P_ABC={};
let DASH_ABC='';
let DASH_QI='';
let DASH_SEARCH='';
let DASH_SEARCH_OPEN=false;
let DASH_STOCK='';
let FAM_OVERRIDE=S.get('fam_ov')||{};
let ALLEE_SIDE=S.get('allee_side')||{};
let ALLEE_SETTINGS=S.get('allee_cfg')||{};
let SEL_IDS=new Set();
let TVMV=S.get('tvmv')||{};
let ABC_POS=S.get('abc_pos')||{};
let ALERTS={};
function sp(){S.set('p4',PARAMS);}function sv(){S.set('v4',VALID);}
function ss(){S.set('s4',SORTIR);}function spl(){S.set('pl4',PLAN);}
function saf(){S.set('af',ALLEE_FILTERS);}function stvmv(){S.set('tvmv',TVMV);}
function sabcpos(){S.set('abc_pos',ABC_POS);}

function zone(a){
  var cfg=(ALLEE_SETTINGS||{})[a]||{};
  if(cfg.zone)return cfg.zone;
  if(a>=0&&a<=30)return'LGV';if(a>=31&&a<=157)return'PF';
  if(a>=158&&a<=218&&![209,211,217].includes(a))return'Rota';
  if([217,333].includes(a))return'Prio';
  if([320,332,336,350,356,360,370,380,388].includes(a))return'Salée';
  if([671,681,683,685,209,211,341,351,357].includes(a))return'Sucrée';
  if((a>=390&&a<=640)||[361,371,381].includes(a))return'Liquide';
  if([660,680].includes(a)||(a>=682&&a%2===0&&a<=698))return'DPH';
  if((a>=682&&a%2===1)||[686,689,691].includes(a))return'Frais sec';
  return'Autre';
}
const ZC={Rota:'#5c6bc0',PF:'#388e3c',LGV:'#1976d2',Salée:'#e64a19',Sucrée:'#8e24aa',Liquide:'#0097a7',DPH:'#c2185b','Frais sec':'#f57f17',Prio:'#f9a825',Autre:'#757575'};
function zc(a){return ZC[zone(a)]||'#757575';}
function getNvFams(a,nv){return(PARAMS[a]&&PARAMS[a][nv])||[];}
function setNvFams(a,nv,fams){if(!PARAMS[a])PARAMS[a]={};PARAMS[a][nv]=fams;sp();}
const FC={N:'#2e7d32',H:'#e65100',L:'#1565c0',U:'#6a1b9a',E:'#bf360c',K:'#880e4f',C:'#00695c',B:'#f06292',A:'#5d4037',P:'#1976d2',V:'#388e3c',Z:'#9e9e9e'};
const FB={N:'#e8f5e9',H:'#fff3e0',L:'#e3f2fd',U:'#f3e5f5',E:'#fbe9e7',K:'#fce4ec',C:'#e0f2f1',B:'#fce4ec',A:'#efebe9',P:'#e3f2fd',V:'#e8f5e9',Z:'#f5f5f5'};
function fc(f){return FC[f]||'#aaa';}function fb(f){return FB[f]||'#f5f5f5';}


function applyFamOv(){
  Object.keys(FAM_OVERRIDE).forEach(function(id){
    var p=P.find(function(x){return x.id===+id;});
    if(p)p.f=FAM_OVERRIDE[id];
  });
}
function setFamOverride(id,f){
  FAM_OVERRIDE[id]=f;S.set('fam_ov',FAM_OVERRIDE);
  var p=P.find(function(x){return x.id===id;});
  if(p){p.f=f;computeAlerts();updateBadge();}
}
function clearFamOverride(id){
  delete FAM_OVERRIDE[id];S.set('fam_ov',FAM_OVERRIDE);
  var p=P.find(function(x){return x.id===id;});
  if(p){p.f=clf(p.n,p.mk||'',p.ds||'',p.tv||'5.5',p.ap||'',p.un||'');computeAlerts();updateBadge();}
}

function toggleLock(){PLAN_LOCKED=!PLAN_LOCKED;S.set('pl_lock',PLAN_LOCKED);rPlan();}

function getTVMV(z){
  if(!TVMV[z])TVMV[z]={enabled:true,abcA:80,abcB:95,etA:2,etC:7,etAl:3,etCl:6,dQI:6,dColis:6};
  if(TVMV[z].dQI===undefined)TVMV[z].dQI=6;
  if(TVMV[z].dColis===undefined)TVMV[z].dColis=6;
  return TVMV[z];
}
// → abc.js
// → fiche.js


// → settings.js

// → import.js

