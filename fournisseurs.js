// ── fournisseurs.js — Gestion des fournisseurs API ───────────────────────────

// Dictionnaire complet id→nom (source Dashboard Frais)
const SUPPLIERS_DICT = {"4":"Le Comptoir & Co","5":"Prestimpex","10":"CNER","12":"Desailly","14":"Eric Bur","19":"Les Biolonistes","22":"Terre Exotique","28":"Metro","30":"Club Mate","39":"Pronatura","43":"Anthès découpe","50":"Interne","52":"Tang Frères","54":"Marlette","58":"Carré Suisse","59":"Le Chocolat des Français","60":"Tout Autour du Pain","62":"Segurel","63":"Appie","67":"Palais des Thés","80":"Mammafiore","82":"UBA / De sutter","83":"Jeff Carrel","94":"Norocean","95":"Alterfood","98":"Hardouin","102":"St Jean","104":"Umami","105":"Panache des Landes","106":"Yumi","107":"Beillevaire crèmerie","108":"Kalios","111":"Gallia","113":"GoodGoût","127":"Naturenvie","130":"Fallot","133":"Anthes everyday","135":"Sol Semilla","141":"Maison conquet","144":"Ferme Montchervet","147":"Mammafiore SEC","148":"Funky Veggie","153":"Beillevaire fromage","154":"Avril cosmétique","161":"Fooding Company","162":"Alain Milliat","163":"My Holy","167":"Hardouin TRAITEUR","168":"Sedisal","170":"La maison du biscuit","172":"Vitafrais","174":"Jay & Joy","186":"VITAFRAIS SURGELE","191":"Système U","192":"Système U Frais","193":"Celnat","194":"Biodis","195":"Yarden","196":"Desailly précommande","199":"Boucherie BE","201":"Beillevaire traiteur","204":"Maison Conquet précommande","205":"Ivry LABO","207":"Prestimpex précommande","217":"Joone","222":"SALMA","224":"HOANAM","225":"Picvert","226":"KUSMI","232":"Bellota-Bellota","239":"Monin","240":"Weiss","241":"Albert Menes","251":"Ostrenn","255":"Juliet's & Co","257":"Biodis Frais","260":"Goulibeur","261":"Comptoir du Caviar","266":"ET ALORS","269":"Happyvore","270":"Guyader","280":"Valrhona","282":"Maxim's","283":"Super Nature","284":"Les Miraculeux","292":"Le bonbon français","297":"Galliance","298":"Sodastream","305":"Padouen","306":"La Grande Epicerie - frais","309":"La Main dans le bol","312":"Lalos","315":"Comptoir du Cacao","316":"Chocolaterie Galler","320":"Le Fondant Baulois","329":"Kook's","332":"Daniel Mercier","336":"Quinola","338":"Tonton Pierrot","339":"Marie Severac","340":"Maison Guinguet","341":"Evootrade","342":"Plantin","343":"Maritsa","344":"Maison Gramm's","348":"A l'Olivier","350":"Kys Marine","351":"Foodex","352":"Sophie M","355":"Arcadys","356":"Dynamique Provençale","357":"Maison Sauge","358":"EPC Champagne","359":"Lïv Happy Food","360":"Maison Marc","363":"Heura","364":"Mavrommatis","365":"L'Atelier V","366":"Laiterie de Saint Malo","367":"Biodis Préco SEC","368":"Base Organic Food","369":"Sauce Bistrot","374":"Ely","375":"Biscuiterie de Provence","376":"Elivia","377":"Shaki shaki","379":"Ovalis","381":"Sassy X L.B.F","382":"Go Nuts","383":"Paos","385":"Maison Poilâne","386":"Kerzon","388":"Monbento","390":"Tangent GC","393":"Jaym","395":"Bodum","396":"Rice","398":"Anotherway","401":"Feed","404":"Cookut","407":"Montreuil KITS","409":"Beroli","412":"Lao Care","413":"Henri Raffin","415":"Alterfoodie","416":"Monsieur Barbier","419":"Behave Bio","421":"Last Object","422":"Labogie","424":"Comme Avant","425":"La maison du whisky","427":"New Flag France","431":"Papier d'Arménie","435":"Système U Surgelés","436":"Graam","439":"Nick's","443":"Montreuil VRAC","446":"Mr Suzu","450":"Maison Carrousel","451":"Fous de l'Ile","452":"Polaar","453":"Artisans du Monde","454":"Comptoir des Huiles","455":"Ô Cérès","457":"La Petite Centrale","458":"Pw Distribution","460":"Juste Pressé","461":"Fruits rouges","462":"Japhy","464":"Le Petit Duc","466":"Maison Matine","468":"Shaeri","471":"Charal","472":"Clémence & Vivien","473":"Maison Martin","474":"Pandacraft","475":"Mimitika","478":"My Mira","479":"Manucurist","480":"ATM Organics","481":"Biodis Primeur","482":"JHO","486":"Eolys Beauté","488":"France Maia","490":"Oden","491":"Labessentiel","492":"La Canopée","494":"Kanthé","495":"Indemne","497":"Ecolive","499":"Madara","500":"What Matters","501":"Biosme","505":"Uny","506":"DIECE (WAAM)","508":"Système U LGV","509":"Epycure","512":"Panier des sens","517":"Korres","519":"Ouate Paris","520":"Laboratoires Embryolisse","521":"La Grande Epicerie - dérivés","522":"Maia","525":"Planted","526":"FLORAME","528":"Bachca","531":"Radis et Capucine","533":"Charlotte Bio","537":"Cosmic Dealer","538":"Le Baigneur","540":"D-Lab","542":"Kiki Health","549":"Compagnie fruitière","550":"Enfance Paris","552":"Confiture Parisienne","554":"MELVITA","556":"L'épicurien","558":"Les Deux Siciles","564":"Gimber","570":"Day +","571":"Glower","573":"Clairefontaine","574":"Nomie","579":"MICHEL ET AUGUSTIN EPICERIE","580":"MICHEL ET AUGUSTIN FRAIS","581":"Novandie","583":"Durance","584":"Vitagermine","589":"Carambelle","591":"Marabout","592":"Opinel","594":"Perigot","596":"Beligné & fils","602":"La parisienne de baguette","603":"Exotica","605":"Paysan Urbain","607":"Ekobo","609":"Jean Dubost","611":"Hachette Pratique","612":"Joseph Joseph","614":"F&H EU","615":"Silikomart","618":"Findis ADC","619":"Mastrad","621":"Sill","625":"Gefu","626":"Dr Hauschka","627":"Smoon","628":"Philibert","629":"Ludifolie","630":"Viva Scandinavia","632":"Plint","634":"Andrée Jardin","635":"Umbra","638":"Microplane","643":"Alessi","648":"Asa","649":"Bastide Diffusion","650":"Lion d'Or","655":"Marius Fabre","658":"Amefa","660":"Campaneus","1662":"Guzzini","1663":"Ousia Drinks","1666":"Montalet","1669":"La Molisana","1671":"Archipel kombucha","1674":"Les Abeilles de Malescot","1675":"AYAM (EAST WEST)","1676":"SIAM / BLEUZE","1677":"Fruits at home","1678":"Révolution de Palais","1679":"Hédène","1680":"Amaltup So Chèvre","1682":"Finca La Rosala","1684":"Seniatna","1685":"Atelier Sarrasin","1686":"Biotamra","1687":"Giusti","1688":"Au Bec Fin","1690":"Culture Miel","1691":"JNPR","1692":"Biscuiterie Astruc","1693":"BAM & Co","1695":"Ronsard cacher","1697":"Terroirs du Liban","1698":"Fer A Cheval","1699":"La Franco Argentine","1700":"Grano Ladies","1703":"Donna Antonia","1704":"Conserverie Saint Christophe","1705":"Laboratoires Super Diet","1706":"Smart Organic - Bett'r","1707":"La Maison de l'Ail Noir","1708":"Spring","1709":"Christophe Robin","1710":"La Trinquelinette","1711":"Jolly Mama","1712":"Tang Frères Ivry Magasin","1714":"Domaine de l'Idylle","1715":"Domaine de Méjane","1718":"Nemrod","1719":"Tempé","1721":"Les Bienheureux","1723":"Vignerons de Nature","1725":"Maison Boulanger","1729":"Les Délices de Noémie","1730":"Maison Ginestet","1731":"Le Petit Bérêt","1732":"MOET HENNESSY FRANCE","1734":"Elixy","1740":"Distillerie de la Seine","1741":"Tame Spirits","1742":"Maison Hamelle","1744":"Maison M","1745":"Cluizel","1747":"Le Petit Ballon","1753":"Frichti","1757":"Golfera","1759":"Yann Couvreur","1760":"TerreAzur","1762":"Supersec / Superstories","1764":"Supernuts","1777":"Pastavino Prep Food","1778":"Pastavino Pasta","1780":"My Brazil Factory","1781":"Mandorla Mistica","1784":"Cupkie","1794":"Distral","1795":"Fabrique à Cookie","1809":"Dvegetables","1811":"Butet","1815":"Monoprix","1830":"Ôbe","1845":"Symples","1854":"Maison Beya","2154":"Bollinger Diffusion","2188":"Koko kombucha","2194":"Les filles de l'ouest","2228":"Eric Bur - Rodel","2229":"Nona Drinks","2230":"Jardins Drinks","2231":"Vivant","2232":"Bacanha","2234":"La Brasserie Parallèle","2235":"DBI Distributeurs","2236":"Pop Maté","2237":"Jomo","2238":"Guru Beer","2240":"Vins des As","2241":"Pierre Chavin","2242":"BBC Spirits","2243":"Sober Spirits","2244":"Château La Coste","2245":"Cave de Ribeauvillé","2246":"L'atelier du ferment","2259":"Foodyssey (Omie)","2261":"Tielles Dassé","2264":"UMA","2269":"LES BONNES POUSSES","2275":"Ferme Ty Coz","2279":"Elsy Food","2282":"Bio Pays Landais","2285":"ET ALORS FRAIS","2286":"Système U Jardin BIO","2287":"Solarenn","2293":"Cherico","2299":"Waysia sec","2301":"Yacon & Co","2302":"Chevet","2303":"Fresh & Good","2304":"Waysia frais","2307":"Goxoa","2310":"Watershop","2312":"Le Casse Noisette","2313":"Twin Pop","2314":"Popote","2315":"Mutyne","2317":"Les délices du chef","2318":"Furifuri","2323":"Flowi","2324":"Atelier du sel","2325":"Accent BIO","2329":"Pol & Léon","2330":"East Gourmet"};

// ── Tokens API ───────────────────────────────────────────────────────────────
function getApiTokens() {
  return S.get('api_tokens') || { bypass: '' };
}
function saveApiTokens(t) { S.set('api_tokens', t); }
function getBypassToken() { return (getApiTokens().bypass || '').trim(); }

// ── Persistance ───────────────────────────────────────────────────────────────
function getFournisseurs() {
  var saved = S.get('fourn_list');
  if (saved && saved.length) return saved;
  // Valeurs par défaut Système U
  return [
    {id:'191',  name:'Système U',           active:false},
    {id:'192',  name:'Système U Frais',      active:false},
    {id:'435',  name:'Système U Surgelés',   active:false},
    {id:'508',  name:'Système U LGV',        active:false},
    {id:'2286', name:'Système U Jardin BIO', active:false},
  ];
}
function saveFournisseurs(list) { S.set('fourn_list', list); }

// Renvoie les IDs actifs (utilisés par le fetch API)
function getActiveFournIds() {
  return getFournisseurs().filter(function(f){ return f.active; }).map(function(f){ return f.id; });
}

// ── Rendu de l'onglet ─────────────────────────────────────────────────────────
function rFournisseurs() {
  var el = document.getElementById('fournisseurs-page');
  if (!el) return;

  var list = getFournisseurs();
  var activeIds = list.filter(function(f){return f.active;}).map(function(f){return f.id;});

  var tokens = getApiTokens();
  var html = '<div style="padding:20px;max-width:680px">';

  // ── Section Tokens ───────────────────────────────────────────────────────────
  html += '<div style="margin-bottom:20px;padding:14px;background:var(--bg2);border:1px solid var(--border);border-radius:10px">';
  html += '<div style="font-size:13px;font-weight:700;margin-bottom:12px">🔑 Tokens API</div>';
  html += '<div style="margin-bottom:10px">';
  html += '<div style="font-size:11px;color:var(--text3);font-family:\'Geist Mono\',monospace;margin-bottom:5px">X-Api-Bypass-Token <span style="color:var(--text3)">(pour api.labellevie.com)</span></div>';
  html += '<div style="display:flex;gap:8px;align-items:center">';
  html += '<input id="fBypassToken" type="password" value="'+fEsc(tokens.bypass||'')+'" placeholder="Coller le token ici…" style="flex:1;font-family:\'Geist Mono\',monospace;font-size:11px;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:7px 10px;border-radius:7px;outline:none">';
  html += '<button onclick="fToggleTokenVis(\'fBypassToken\',this)" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface);cursor:pointer;font-size:12px">👁</button>';
  html += '<button onclick="fSaveTokens()" class="btn pri" style="font-size:12px;padding:6px 14px">Enregistrer</button>';
  html += '</div>';
  html += '</div>';
  html += '<div id="fTokenStatus" style="font-size:11px;color:var(--text3);margin-top:4px;font-family:\'Geist Mono\',monospace">';
  if (tokens.bypass) html += '✅ Token enregistré';
  else html += '⚠️ Token manquant — synchronisation QI/QD impossible';
  html += '</div>';
  html += '</div>';

  // ── Section Fournisseurs ─────────────────────────────────────────────────────
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  html += '<div style="font-size:16px;font-weight:700">Fournisseurs API</div>';
  html += '<button onclick="fAddOpen()" class="btn pri" style="font-size:12px;padding:6px 14px">+ Ajouter</button>';
  html += '</div>';

  // ── Barre d'ajout (masquée par défaut) ──────────────────────────────────────
  html += '<div id="fAddBar" style="display:none;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px">';
  html += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--text2)">Ajouter un fournisseur</div>';
  html += '<div style="display:flex;gap:8px;margin-bottom:8px">';
  html += '<input id="fAddId" type="text" placeholder="ID fournisseur (ex: 379)" oninput="fAutoFill()" style="width:140px;font-family:\'Geist Mono\',monospace;font-size:12px;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:7px;outline:none">';
  html += '<input id="fAddName" type="text" placeholder="Nom (auto-complété si connu)" style="flex:1;font-family:\'Geist Mono\',monospace;font-size:12px;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:7px;outline:none">';
  html += '</div>';
  html += '<div style="display:flex;gap:8px">';
  html += '<button onclick="fAddConfirm()" class="btn pri" style="font-size:12px">Confirmer</button>';
  html += '<button onclick="fAddClose()" class="btn" style="font-size:12px">Annuler</button>';
  html += '</div>';
  html += '</div>';

  // ── Liste ────────────────────────────────────────────────────────────────────
  if (!list.length) {
    html += '<div style="padding:30px;text-align:center;color:var(--text3);font-size:13px">Aucun fournisseur enregistré</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:6px" id="fournList">';
    list.forEach(function(f, i) {
      var col = f.active ? 'var(--accent,#1976d2)' : 'var(--border)';
      var bg  = f.active ? 'color-mix(in srgb,var(--accent,#1976d2) 8%,transparent)' : 'var(--bg2)';
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:'+bg+';border:1px solid '+col+';border-radius:9px;transition:all .15s">';
      // Toggle actif
      html += '<input type="checkbox" '+(f.active?'checked':'')+' onchange="fToggle('+i+',this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent,#1976d2)">';
      // Nom + ID
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+fEsc(f.name||'#'+f.id)+'</div>';
      html += '<div style="font-size:10px;color:var(--text3);font-family:\'Geist Mono\',monospace">ID '+f.id+'</div>';
      html += '</div>';
      // Editer nom
      html += '<button onclick="fRename('+i+')" title="Renommer" style="background:none;border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--text3)">✏️</button>';
      // Supprimer
      html += '<button onclick="fDelete('+i+')" title="Supprimer" style="background:none;border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--text3)">🗑️</button>';
      html += '</div>';
    });
    html += '</div>';
  }

  // ── Bouton Sync ──────────────────────────────────────────────────────────────
  html += '<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">';
  if (activeIds.length) {
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">'+activeIds.length+' fournisseur'+(activeIds.length>1?'s':'')+' actif'+(activeIds.length>1?'s':'')+' sélectionné'+(activeIds.length>1?'s':'')+' pour la synchronisation API</div>';
  } else {
    html += '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Cochez les fournisseurs à synchroniser via l\'API</div>';
  }
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
  html += '<button onclick="fSyncNow()" class="btn pri" '+(activeIds.length?'':'disabled')+' style="font-size:13px;padding:8px 20px">🔌 Stock + QI (API Deleev)</button>';
  html += '<button onclick="fSyncQIQD()" class="btn" '+(activeIds.length?'':'disabled')+' style="font-size:13px;padding:8px 20px" title="Récupère stock, QI et jours de rupture depuis api.labellevie.com">📊 Stock + Rupture (QI/QD)</button>';
  html += '</div>';
  html += '<div id="fSyncStatus" style="display:none;font-size:12px;margin-top:8px;font-family:\'Geist Mono\',monospace"></div>';
  html += '<div id="fSyncProgress" style="display:none;margin-top:8px">';
  html += '<div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden"><div id="fSyncFill" style="height:100%;background:var(--accent,#1976d2);width:0%;transition:width .3s;border-radius:4px"></div></div>';
  html += '<div id="fSyncText" style="font-size:10px;color:var(--text3);margin-top:3px;text-align:center;font-family:\'Geist Mono\',monospace"></div>';
  html += '</div>';
  html += '</div>';

  html += '</div>';
  el.innerHTML = html;
}

// ── Actions ───────────────────────────────────────────────────────────────────
function fEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fSaveTokens() {
  var bypass = (document.getElementById('fBypassToken')||{}).value||'';
  saveApiTokens({ bypass: bypass.trim() });
  var st = document.getElementById('fTokenStatus');
  if (st) { st.textContent = bypass.trim() ? '✅ Token enregistré' : '⚠️ Token vide'; st.style.color = bypass.trim() ? 'var(--g,#388e3c)' : 'var(--o,#f57c00)'; }
  if (typeof showToast === 'function') showToast('Token enregistré');
}

function fToggleTokenVis(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function fAddOpen()  { var b=document.getElementById('fAddBar'); if(b) b.style.display='block'; }
function fAddClose() { var b=document.getElementById('fAddBar'); if(b) b.style.display='none'; }

function fAutoFill() {
  var idEl=document.getElementById('fAddId');
  var nameEl=document.getElementById('fAddName');
  if(!idEl||!nameEl) return;
  var id=idEl.value.trim();
  var known=SUPPLIERS_DICT[id];
  if(known && !nameEl.value) nameEl.value=known;
}

function fAddConfirm() {
  var id=(document.getElementById('fAddId')||{}).value;
  var name=(document.getElementById('fAddName')||{}).value;
  id=(id||'').trim();
  name=(name||'').trim();
  if(!id){ alert('L\'ID fournisseur est obligatoire'); return; }
  if(!name) name=SUPPLIERS_DICT[id]||('#'+id);
  var list=getFournisseurs();
  if(list.find(function(f){return f.id===id;})){ alert('Ce fournisseur est déjà dans la liste'); return; }
  list.push({id:id, name:name, active:false});
  saveFournisseurs(list);
  rFournisseurs();
}

function fDelete(i) {
  var list=getFournisseurs();
  var f=list[i];
  if(!confirm('Supprimer "'+fEsc(f.name||f.id)+'" ?')) return;
  list.splice(i,1);
  saveFournisseurs(list);
  syncNavSuppliers();
  rFournisseurs();
}

function fToggle(i, active) {
  var list=getFournisseurs();
  if(!list[i]) return;
  list[i].active=active;
  saveFournisseurs(list);
  syncNavSuppliers();
  // Rerender juste le footer sans rebuilder toute la liste
  rFournisseurs();
}

function fRename(i) {
  var list=getFournisseurs();
  var f=list[i];
  var newName=prompt('Nouveau nom pour '+f.id+':', f.name||'');
  if(newName===null) return;
  newName=newName.trim();
  if(!newName) return;
  list[i].name=newName;
  saveFournisseurs(list);
  rFournisseurs();
}

function fSyncNow() {
  var ids=getActiveFournIds();
  if(!ids.length) return;
  uFetchProducts({
    supplierIds: ids,
    statusEl:    document.getElementById('fSyncStatus'),
    progressEl:  document.getElementById('fSyncProgress'),
    fillEl:      document.getElementById('fSyncFill'),
    textEl:      document.getElementById('fSyncText'),
    btnEl:       null,
  });
}

function fSyncQIQD() {
  var ids=getActiveFournIds();
  if(!ids.length) return;
  uFetchQIQD({
    supplierIds: ids,
    statusEl:    document.getElementById('fSyncStatus'),
    btnEl:       null,
  });
}

// ── Synchronise navSelSuppliers (panel 🔌) avec la liste persistée ─────────
function syncNavSuppliers() {
  if(typeof navSelSuppliers === 'undefined') return;
  navSelSuppliers.clear();
  getActiveFournIds().forEach(function(id){ navSelSuppliers.add(id); });
}
