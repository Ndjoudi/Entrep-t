// ── Import CSV module ───────────────────────────────────
// Dépendances : S, P, parseC, showToast, FAM_OVERRIDE

function rImport(){
  var el=document.getElementById('import-page');
  var driveHtml='<div style="margin-bottom:16px;padding:14px;background:var(--bg2);border-radius:var(--r10);border:1px solid var(--border)">';
  driveHtml+='<div style="font-size:13px;font-weight:700;margin-bottom:6px">☁️ Google Drive</div>';
  driveHtml+='<div style="font-size:12px;color:var(--text3);margin-bottom:10px">Les données sont chargées automatiquement depuis Google Drive au démarrage.</div>';
  driveHtml+='<button class="btn pri" onclick="document.getElementById(\'dinfo\').textContent=\'Rechargement...\';loadFromDrive(\'https://corsproxy.io/?https://drive.google.com/uc?export=download&id=19fxex1glSbhNf-wxzRADYUAkI6FeA6Sk\',false)">🔄 Recharger depuis Drive</button>';
  driveHtml+='</div>';

  // ── Bloc API Deleev ──────────────────────────────────────
  driveHtml+='<div style="margin-bottom:16px;padding:14px;background:var(--bg2);border-radius:var(--r10);border:1px solid var(--border)">';
  driveHtml+='<div style="font-size:13px;font-weight:700;margin-bottom:4px">🔌 API Deleev</div>';
  driveHtml+='<div style="font-size:12px;color:var(--text3);margin-bottom:10px">';
  driveHtml+='Si P est chargé : <b>met à jour QI + stock</b> par ID. Sinon : <b>chargement complet</b> (zonage et famille non disponibles via API).';
  driveHtml+='</div>';
  driveHtml+='<button id="uProdBtn" class="btn pri" onclick="uFetchProducts()">📦 Charger / Rafraîchir depuis l\'API</button>';
  driveHtml+='<div id="uProdStatus" style="display:none;font-size:11px;margin-top:6px"></div>';
  driveHtml+='<div id="uProdProgress" style="display:none;margin-top:6px">';
  driveHtml+='<div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden">';
  driveHtml+='<div id="uProdProgressFill" style="height:100%;background:var(--accent);border-radius:4px;width:0%;transition:width .3s"></div>';
  driveHtml+='</div>';
  driveHtml+='<div id="uProdProgressText" style="font-size:10px;color:var(--text3);margin-top:3px;text-align:center"></div>';
  driveHtml+='</div>';
  driveHtml+='</div>';
  var famHtml='<div style="margin-top:16px;padding:14px;background:var(--bg2);border-radius:var(--r10);border:1px solid var(--border)">';
  famHtml+='<div style="font-size:13px;font-weight:700;margin-bottom:6px">🏷️ Corrections familles</div>';
  famHtml+='<div style="font-size:12px;color:var(--text3);margin-bottom:10px">Importer un CSV (colonnes ID,Famille) pour corriger les lettres en masse. Ou exporter les corrections actuelles.</div>';
  famHtml+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
  famHtml+='<label class="btn" style="cursor:pointer">📥 Importer corrections<input type="file" accept=".csv" onchange="parseFamCSV(this)" style="display:none"></label>';
  famHtml+='<button class="btn" onclick="exportFamCSV()">📤 Exporter corrections</button>';
  var nb=Object.keys(FAM_OVERRIDE).length;
  famHtml+='<span style="font-size:11px;color:var(--text3)">'+nb+' correction'+(nb>1?'s':'')+' en mémoire</span>';
  famHtml+='</div><div id="fam-import-log" style="font-size:11px;color:var(--text3);margin-top:8px"></div>';
  famHtml+='</div>';
  el.innerHTML=driveHtml+famHtml+'<div style="font-size:15px;font-weight:700;margin-bottom:12px">Import CSV</div>'
    +'<div class="dz" id="dz" onclick="document.getElementById(\x27fi\x27).click()">'
    +'<div style="font-size:32px;margin-bottom:8px">📂</div>'
    +'<p style="font-size:13px;color:var(--text2)">Glisser-déposer le fichier CSV</p>'
    +'<small style="color:var(--text3)">ou cliquer pour sélectionner</small></div>'
    +'<input type="file" id="fi" accept=".csv" style="display:none" onchange="handleF(this.files[0])">'
    +'<div id="ilog" class="ilog"></div>';
  var dz=document.getElementById('dz');
  dz.addEventListener('dragover',function(e){e.preventDefault();dz.classList.add('ov');});
  dz.addEventListener('dragleave',function(){dz.classList.remove('ov');});
  dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('ov');handleF(e.dataTransfer.files[0]);});
}
function ilog(m){var e=document.getElementById('ilog');if(e){e.style.display='block';e.textContent+=m+'\n';e.scrollTop=e.scrollHeight;}}
function handleF(file){
  if(!file||!file.name.endsWith('.csv')){ilog('❌ CSV requis');return;}
  ilog('📂 '+file.name);
  var r=new FileReader();r.onload=function(e){parseC(e.target.result);};r.readAsText(file,'UTF-8');
}
function parseCSVRecords(text){
  var rec=[],row=[],f='',inQ=false,i=0;
  while(i<text.length){var c=text[i];
    if(inQ){if(c==='"'){if(text[i+1]==='"'){f+='"';i+=2;continue;}inQ=false;i++;continue;}f+=c;i++;}
    else{if(c==='"'){inQ=true;i++;continue;}
      if(c===','){row.push(f.trim());f='';i++;continue;}
      if(c==='\n'||(c==='\r'&&text[i+1]==='\n')){
        row.push(f.trim());if(row.length>1||(row.length===1&&row[0]!==''))rec.push(row);
        row=[];f='';if(c==='\r')i++;i++;continue;}
      f+=c;i++;}}
  if(f.trim()||row.length>0){row.push(f.trim());if(row.length>1)rec.push(row);}
  return rec;
}

function parseC(text){
  ilog('⚙️ Parsing...');
  var records=parseCSVRecords(text);
  if(records.length<2){ilog('Fichier vide');return;}
  var hdrs=records[0].map(function(h){return h.trim();});
  var idx={};
  ['ID','Nom','Code barre','QI','Packaging','Zonage','Stock'].forEach(function(k){
    var i=hdrs.findIndex(function(h){return h===k||h.includes(k);});if(i>=0)idx[k]=i;
  });
  function get(row,k){return idx[k]!==undefined?(row[idx[k]]||'').replace(/^"|"$/g,'').trim():'';}
  var np=[];
  for(var i=1;i<records.length;i++){
    var row=records[i];if(!row||!row.length)continue;
    var z=get(row,'Zonage');var pts=z.split('.');
    if(pts.length!==3)continue;
    var a=+pts[0],ec=+pts[1],et=+pts[2];
    if(isNaN(a)||isNaN(ec)||isNaN(et))continue;
    var qi=+get(row,'QI')||0,st=+get(row,'Stock')||0;
    if(!(qi>1||(st>0&&qi!==1)))continue;
    var nom=get(row,'Nom');
    var _marque=get(row,'Marque')||'';
    var _desc=(get(row,'Description')||'').slice(0,200);
    var _tva=get(row,'TVA')||'5.5';
    var _app=get(row,'Appellation')||'';
    var _unite=get(row,'Unité')||'';
    np.push({id:+get(row,'ID')||0,n:nom.slice(0,80),f:clf(nom,_marque,_desc,_tva,_app,_unite),mk:_marque.slice(0,30),ds:_desc.slice(0,80),tv:_tva,ap:_app,un:_unite,dsp:(get(row,'Disponibilité')||get(row,'Disponibilite')||'order'),z:a+'.'+et+'.'+ec,a:a,et:et,nv:Math.floor(ec/10),p:ec%10,q:qi,c:+get(row,'Packaging')||1,st:st,bc:get(row,'Code barre').replace('.0','')});
  }
  P=np;
  try{var _j=JSON.stringify(P);localStorage.setItem('wh4_products',btoa(unescape(encodeURIComponent(_j))));ilog('✅ '+P.length+' produits — 💾 sauvegardé');}catch(e){ilog('✅ '+P.length+' produits');}
  document.getElementById('dinfo').textContent=P.length+' produits';
  applyFamOv();
computeAlerts();updateBadge();
}
function csvR(line){
  var res=[],cur='',inQ=false;
  for(var i=0;i<line.length;i++){var ch=line[i];if(ch==='"')inQ=!inQ;else if(ch===','&&!inQ){res.push(cur);cur='';}else cur+=ch;}
  res.push(cur);return res;
}

function clf(nom, marque, desc, tva, appellation, unite){
  var n=(nom||'').toLowerCase();
  var full=((nom||'')+' '+(marque||'')+' '+(desc||'')).toLowerCase();
  var t=String(tva||'5.5').trim();
  var app=(appellation||'').toLowerCase();
  var u=(unite||'').toLowerCase();

  // 1. C — couches
  if(/\b(couche[s]?\b|couche[- ]culotte|culotte[s]?\sd.apprentissage|pampers\b|dodot\b|little\s(swim|swimmer)|drynite|love\s*&\s*green\scouche)\b/.test(n))return'C';

  // 2. B — bébé
  if(/\b(blédina|bledina|guigoz\b|gallia\b|nidal\b|nutrilon|aptamil|hipp\b|modilac|maternisé|infantile|1er\sâge|2(e|ème)\sâge|3(e|ème)\sâge|bledichef|blédinette|petit\spot\b|petits\spots\b|lait\s(1\b|2\b|3\b)\sâge|lait\sde\ssuite|lait\smaternisé|purée\sbébé|dès\s\d\smois|dès\s\d\/\d\smois|tout\spetits?\b)\b/.test(n))return'B';

  // 3. A — animaux
  if(/\b(pour\s(chien[s]?|chat[s]?|lapin[s]?|oiseau[x]?|poisson[s]?|rongeur[s]?|hamster[s]?|furet[s]?)|croquette[s]?\b|litière\b|aquarium\b|pedigree\b|whiskas\b|purina\b|felix\b|gourmet\b|sheba\b|friskies\b|royal\scanin\b|cesar\b|eukanuba\b|friandise[s]?\s(chat|chien)|snack[s]?\s(chat|chien)|pâtée?\s(chat|chien))\b/.test(n))return'A';

  // 4. L — alcool + boissons
  if(/\b(bière\b|ale\b|lager\b|stout\b|ipa\b|cidre\b|champagne\b|crémant\b|prosecco\b|cava\b|whisky\b|whiskey\b|rhum\b|vodka\b|gin\b|cognac\b|armagnac\b|liqueur\b|pastis\b|calvados\b|porto\b|pineau\b|ricard\b|desperados\b|leffe\b|corona\b|heineken\b|kronenbourg\b|pelforth\b|tripel\b|trappiste\b|bordeaux\b|bourgogne\b|merlot\b|chardonnay\b|sauvignon\b|chablis\b|muscadet\b|beaujolais\b|rosé\b|mousseux\b|pétillant\b|sancerre\b|riesling\b|gewurztraminer\b|amaretto\b|baileys\b|malibu\b|cointreau\b|grand\smarnier\b|chartreuse\b|génépi\b|eau\sde\svie\b|côtes\sdu\srhône|chimay\b|chouffe\b|guinness\b|hoegaarden\b|duvel\b|paulaner\b|erdinger\b|affligem\b|kwak\b|rochefort\b|orval\b|westmalle\b|delirium\b)\b/.test(n))return'L';
  if(/\b(jus\b|nectar\b|smoothie\b|limonade\b|soda\b|cola\b|schweppes\b|orangina\b|oasis\b|fanta\b|sprite\b|perrier\b|évian\b|volvic\b|badoit\b|hépar\b|contrex\b|san\spellegrino|vittel\b|cristaline\b|eau\sminérale|eau\sde\ssource|eau\sgazeuse|kombucha\b|kéfir\b)\b/.test(n))return'L';
  if(/\blait\s(uht|demi[- ]écrémé|écrémé|entier|végétal|d.avoine|de\ssoja|d.amande|de\scoco|de\sriz)\b/.test(n))return'L';
  if(/\bboisson\s(végétale|au\ssoja|d.avoine|amande|riz|coco|soja)\b/.test(n))return'L';
  if(/\b(oatly\b|alpro\b|lactel\b|candia\b|tropicana\b|innocent\b|capri[- ]sun\b|redbull\b|red\sbull\b|monster\b|ice\stea\b|nestea\b)\b/.test(n))return'L';
  if(['bouteille','brique','canette'].indexOf(app)>=0&&['cl','l'].indexOf(u)>=0)return'L';

  // 5. P — pâtes, riz, céréales
  if(/\b(pâtes?\b|spaghetti\b|tagliatelle[s]?\b|fusilli\b|penne\b|macaroni\b|rigatoni\b|farfalle\b|linguine\b|fettuccine\b|vermicelle[s]?\b|coquillette[s]?\b|torsade[s]?\b|gnocchi\b|lasagne[s]?\b|cannelloni\b|riz\b|basmati\b|riz\s(long|rond|complet|thaï|parfumé|sauvage|jasmin)\b|risotto\b|quinoa\b|boulgour\b|épeautre\b|polenta\b|semoule\b|couscous\b|sarrasin\b)\b/.test(n)&&!/\b(riz\sau\slait|dessert|soufflé|boisson)\b/.test(n))return'P';

  // 6. V — conserves
  if(/\b(thon\s(en\sboîte|à\sl.huile|au\snaturel|émietté|filet[s]?|miette[s]?|mariné)\b|sardine[s]?\s*(en\sboîte|à\sl.huile|au\snaturel|mariné[e]?[s]?)?\b|maquereau\s(en\sboîte|au\svin|à\sla\stomate)\b|lentille[s]?\s(cuisinée[s]?|en\sboîte)\b|pois\schiches?\s(en\sboîte|cuisinés?)\b|haricot[s]?\s(blanc[s]?|rouge[s]?)\s(en\sboîte|cuisinés?)\b|tomate[s]?\s(concassée[s]?|pelée[s]?|en\sdés)\b|coulis\sde\stomate[s]?\b|cassoulet\b|petit[s]?\spois\s(en\sboîte|à\sl.étuvée)\b|maïs\sdoux\b|flageolet[s]?\b)\b/.test(n))return'V';

  // 7. E — épices, condiments
  if(/\b(curcuma\b|cumin\b|paprika\b|safran\b|cardamome\b|cannelle\b|muscade\b|coriandre\b|piment\b|ras\sel\shanout\b|curry\b|massalé\b|colombo\b|zaatar\b|sumac\b|fenugrec\b|anis\sétoilé\b|gingembre\b|clou\sde\sgirofle\b|herbes?\sde\sprovence\b|fines\sherbes\b|bouquet\sgarni\b|thym\b|romarin\b|laurier\b|origan\b|basilic\b|persil\b|ciboulette\b|estragon\b|sarriette\b)\b/.test(n)&&!/\b(shampo|crème|gel\sdouche|savon|lait\scorps|huile\scorps|mariné|spray)\b/.test(n))return'E';
  if(/\b(moutarde\b|vinaigre\b|ketchup\b|mayonnaise\b|sauce\ssoja\b|tabasco\b|sriracha\b|wasabi\b|raifort\b|cornichon[s]?\b|câpre[s]?\b)\b/.test(n))return'E';
  if(/\b(sel\s(fin|gros|de\sguérande|marin|iodé|de\scamargue)|fleur\sde\ssel\b|gros\ssel\b|sel\sen\smoulin\b|poivre\s(noir|blanc|en\sgrain|moulu|de\ssichuan|du\smoulin|rose|vert)\b)\b/.test(n)&&!/\b(régénérant|lave[- ]vaisselle|piscine)\b/.test(n))return'E';

  // 8. K — consommables cuisine
  if(/\b(sac[s]?\s(poubelle|à\sordures?|pour\spoubelle|de\scongélation|congélation|zip|multi[- ]usage[s]?|zipper)\b|film\s(alimentaire|fraîcheur|étirable)\b|papier\s(cuisson|sulfurisé)\b|feuille[s]?\s(aluminium|cuisson)\b|aluminium\s*(ménager|cuisine)?\b|filtre[s]?\s(à\scafé|café)\b)\b/.test(n))return'K';

  // 9. H — hygiène et entretien (TVA 20%)
  if(t==='20'){
    if(/\b(shampo+ing\b|après[- ]shampo+ing\b|gel\sdouche\b|savon\b|pain\sde\ssavon\b|déodorant\b|anti[- ]transpirant\b|dentifrice\b|bain\sde\sbouche\b|fil\sdentaire\b|brosse\sà\sdents\b|brossette[s]?\b|rasoir\b|mousse\s(à\sraser|rasage|coiffante)\b|gel\s(coiffant|fixant|styling)\b|après[- ]rasage\b|crème\s*(hydratante|visage|corps|mains|solaire|anti|bb\b|cc\b|pour\sle\schange)?\b|sérum\s(visage|peau)\b|lait\scorps\b|eau\smicellaire\b|démaquillant\b|lingette[s]?\s*(démaquillante|toilette|intime|corps|désinfectante|wc)?\b|coton[- ]tiges?\b|disque[s]?\s*démaquillant\b|protège[- ]slip\b|serviette[s]?\shygiénique[s]?\b|tampon\s*(hygiénique|intime)?\b|cup\smenstruelle\b|culotte\s(menstruelle|de\srègles)\b|préservatif\b|parfum\b|eau\s(de\stoilette|de\sparfum)\b|dissolvant\b|vernis\sà\songles\b|oral[- ]b\b|aquafresh\b|sensodyne\b|colgate\b|signal\b|elmex\b|lacalut\b|nuk\b|sanex\b|dove\b|nivea\b|vichy\b|neutrogena\b|garnier\b|l.oréal\b|loreal\b|elseve\b|elvive\b|franck\sprovost\b|le\spetit\smarseillais\b|monsavon\b)\b/.test(full))return'H';
    if(/\b(lessive\b|adoucissant\b|détachant\b|nettoyant\b|dégraissant\b|désinfectant\b|javel\b|eau\sde\sjavel\b|détartrant\b|liquide\svaisselle\b|tablette[s]?\s*(lave[- ]vaisselle|vaisselle)\b|gel\s(pour\s)?lave[- ]vaisselle\b|pastille[s]?\s*lave[- ]vaisselle\b|désodorisant\b|anti[- ]calcaire\b|éponge[s]?\b|gratte[s]?\b|tampon\srécurant\b|microfibre\b|torchon\b|serpillière\b|spray\s*(nettoyant|désinfectant|anti[- ]bactérien|antibactérien|multi[- ]usages?|wc|cuisine)\b|gel\swc\b|bloc\swc\b|lingettes?\s*désinfectantes?\b|sel\srégénérant\b|lavette\b|gant[s]?\sde\sménage\b|swiffer\b|plumeau\b|raclette\b|serpillère\b|cire\s(meuble|bois|plancher)\b|entretien\s(meuble|bois|cuir)\b)\b/.test(full))return'H';
    if(/\b(papier\stoilette\b|papier\swc\b|essuie[- ]tout\b|sopalin\b|papier\sabsorbant\b|mouchoir[s]?\b|kleenex\b|lotus\b)\b/.test(full))return'H';
    if(/\b(pansement[s]?\b|compresse[s]?\b|sparadrap\b|antiseptique\b|mercurochrome\b|betadine\b|thermomètre\b|vitamine[s]?\b|complément\salimentaire\b|insecticide\b|anti[- ]moustique\b|répulsif\b|tue[- ]mouche\b|demak.up\b|ganier\b|bol\sà\sraser\b)\b/.test(full))return'H';
  }

  // 10. U — ustensiles (TVA 20%)
  if(t==='20'){
    if(/\b(assiette[s]?\b|gobelet[s]?\b|verre[s]?\s(carton|plastique|jetable)\b|couvert[s]?\s(jetable|plastique|bambou)\b|fourchette[s]?\sjetable\b|plateau\srepas\b|nappe[s]?\s*(jetable|papier)\b|serviette[s]?\s(de\stable|en\spapier)\b|set\sde\scouverts\b)\b/.test(n))return'U';
    if(/\b(bougie[s]?\b|chauffe[- ]plat[s]?\b|pile[s]?\b|batterie\s(aa|aaa|9v|lr)\b|ampoule[s]?\b|casserole[s]?\b|poêle[s]?\b|wok\b|sauteuse\b|cocotte\b|marmite\b|moule\s[àa]\b|plat\sà\sfour\b|spatule\b|louche\b|fouet\b|économe\b|éplucheur\b|passoire\b|saladier\b|bocal\b|le\sparfait\b|boîte\s(hermétique|conservation)\b|thermos\b|gourde\b)\b/.test(n))return'U';
    if(/\b(ruban\sadhésif\b|scotch\b|super\sglue\b|colle\sforte\b|cutter\b|ciseaux\b|sac\s(cadeau|réutilisable)\b)\b/.test(n))return'U';
  }

  // 11. N — nourriture + confiserie/choco/huile à 20%
  if(t==='5.5'||t==='10')return'N';
  if(t==='20'){
    if(/\b(haribo\b|bonbon[s]?\b|confiserie\b|chewing[- ]gum\b|dragée[s]?\b|réglisse\b|carambar[s]?\b|maltesers\b|skittles\b|chupa\schups\b|maoam\b|snickers\b|mars\b|bounty\b|twix\b|kit[- ]?kat\b|lion\b|nuts\b|balisto\b|kinder\b|ferrero\b|rocher\b|raffaello\b)\b/.test(n))return'N';
    if(/\b(chocolat\s*(noir|au\slait|blanc|praliné|noisette|dessert|pâtissier|fourré|à\spâtisser)?\b|tablette\sde\schocolat\b|pralinés?\b|côte\sd.or\b|lindt\b|milka\b|toblerone\b|nestlé\sdessert\b)\b/.test(n))return'N';
    if(/\bhuile\s(d.olive|de\stournesol|de\scolza|végétale|de\snoix|de\scoco|de\spalme|de\spépin|de\ssésame|de\snoisette)\b/.test(n))return'N';
  }

  // 12. Z — non classé
  return'Z';
}

/* ══════════════════════════════════════════════════════════════
   ANALYSE — Stock · Doublons · Sur-commande · Groupes · Messagerie
   Utilise le tableau P[] d'Entrepôt Reuilly
   p.id, p.n (nom), p.f (famille), p.q (QI), p.st (stock),
   p.z (zonage), p.a (allée), p.c (colis/packaging),
   p.dsp (disponibilité), p.mk (marque), p.bc (code barre)
══════════════════════════════════════════════════════════════ */
var AN_MSG=[];
// → analyse.js

