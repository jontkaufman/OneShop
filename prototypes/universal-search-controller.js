/* OneShop global search controller. Injected into the Module 01 preview's
 * existing IIFE, sharing the same Unit/RO demo state. Search logic comes from
 * src/domain/universal-search.mjs and is not duplicated here.
 * Production: never use this in-memory demo as an authorization boundary.
 */
let globalSearchOpen=false,globalSearchMode='all',globalSearchResults=[];
let globalSearchActiveIndex=-1,globalSearchPreviousFocus=null;
const searchRoles=Object.freeze(Object.fromEntries(
 ['service_writer','porter','technician','sales','foreman','pdi'].map(role=>[
  role,searchFieldGrants(effectivePermissions({
   roles:[{id:role,...ROLE_TEMPLATES[role]}],modules:defaultModuleSettings()
  }))
 ])
));
const searchFieldLabels=Object.freeze({
 vin:'VIN',vin_last6:'VIN',stock_number:'Stock',unit_id:'Unit ID',
 customer_name:'Customer',phone:'Phone',email:'Email',ro_number:'RO',
 unit_description:'Unit description',location:'Location',work_description:'Work description',line_item:'Work line'
});
function currentSearchPermissions(){
 return searchRoles[$('role').value]??searchRoles.porter;
}
function searchRecords(){
 const grant=currentSearchPermissions();
 return buildAuthorizedSearchDocuments({units,repairOrders:ros,customers:[]},grant);
}
function showSearchHelp(container){
 const body=mk('div','global-search-state');
 body.append(mk('strong','',globalSearchMode==='select_unit'?'Find a unit to attach to the RO':'Search everything you can access'));
 body.append(mk('span','',globalSearchMode==='select_unit'
   ?'Search stock, VIN, unit reference, owner or RO. Then select the exact unit.'
   :'No search-type dropdowns. Enter any known identifier, name or work description.'));
 const tips=mk('div','global-search-quicktips');
 const samples=currentSearchPermissions().customerRead?['Jordan','RO-10482','STK-0259','freshwater pump']:
   currentSearchPermissions().roRead?['RO-10482','24101','STK-0259','freshwater pump']:['24101','STK-0259','Airstream'];
 for(const sample of samples){
   const button=mk('button','global-search-tip',sample);button.type='button';
   button.onclick=()=>{$('global-search-input').value=sample;renderGlobalSearch();$('global-search-input').focus();};
   tips.append(button);
 }
 body.append(tips);container.append(body);
}
function renderGlobalSearch(){
 const container=$('global-search-results');container.replaceChildren();
 const term=$('global-search-input').value.trim();
 const all=searchAuthorizedDocuments(searchRecords(),term,{limit:100});
 const results=globalSearchMode==='select_unit'?all.filter(x=>x.kind==='unit'):all;
 globalSearchResults=results;globalSearchActiveIndex=results.length?0:-1;
 if(term.length<2){
   $('global-search-count').textContent='Type at least 2 characters';
   showSearchHelp(container);return;
 }
 $('global-search-count').textContent=results.length+' matching '+(results.length===1?'record':'records')+
   (globalSearchMode==='select_unit'?' · selecting a Unit':' · across visible modules');
 if(!results.length){
   const empty=mk('div','global-search-state');
   empty.append(mk('strong','','No accessible records match “'+term+'”'));
   empty.append(mk('span','','Check spelling or a different identifier. Results are limited by your current permissions.'));
   container.append(empty);return;
 }
 const grouped=new Map();
 for(const item of results){
   if(!grouped.has(item.kind))grouped.set(item.kind,[]);
   grouped.get(item.kind).push(item);
 }
 // Sort groups by their best matching record; exact identifiers surface first.
 const order=[...grouped.keys()].sort((a,b)=>grouped.get(b)[0].score-grouped.get(a)[0].score);
 let displayIndex=0;
 for(const kind of order){
   const rows=grouped.get(kind),group=mk('div','global-search-group'),heading=mk('div','global-search-group-heading');
   heading.append(mk('span','',SEARCH_ENTITY_TITLES[kind]),mk('span','',String(rows.length)));
   group.append(heading);
   for(const item of rows){
     const index=displayIndex++;
     const button=mk('button','global-search-hit');button.type='button';
     button.dataset.searchIndex=String(index);
     /* Preserve native button semantics for keyboard and assistive tech. */
     const letter=kind==='ro'?'RO':kind==='customer'?'C':'U';
     button.append(mk('span','global-search-kind',letter));
     const copy=mk('span','global-search-main');
     copy.append(mk('span','global-search-title',item.title));
     copy.append(mk('span','global-search-meta',item.summary||item.id));
     button.append(copy, mk('span','global-search-match',searchFieldLabels[item.matchedField]||'Record'));
     button.onclick=()=>selectGlobalSearchResult(item);
     group.append(button);
   }
   container.append(group);
 }
 // Keyboard order follows visible group order, not the global ranked array.
 const buttons=[...container.querySelectorAll('[data-search-index]')];
 globalSearchResults=order.flatMap(kind=>grouped.get(kind));
 setGlobalSearchActive(0);
}
function setGlobalSearchActive(index){
 const buttons=[...$('global-search-results').querySelectorAll('[data-search-index]')];
 if(!buttons.length){globalSearchActiveIndex=-1;return;}
 globalSearchActiveIndex=(index+buttons.length)%buttons.length;
 buttons.forEach((b,i)=>b.classList.toggle('is-active',i===globalSearchActiveIndex));
 buttons[globalSearchActiveIndex].scrollIntoView({block:'nearest'});
}
function openGlobalSearch(mode='all'){
 toggleAddMenu(false);
 globalSearchMode=mode==='select_unit'?'select_unit':'all';
 if(!globalSearchOpen)globalSearchPreviousFocus=document.activeElement;
 globalSearchOpen=true;
 $('global-search-backdrop').hidden=false;
 $('global-search-panel').hidden=false;
 $('global-search-input').setAttribute('aria-expanded','true');
 document.body.classList.add('global-search-open');
 $('global-search-input').value='';
 $('global-search-heading').textContent=globalSearchMode==='select_unit'?'Select a unit for this repair order':'Universal search';
 renderGlobalSearch();
 $('global-search-input').focus();
}
function closeGlobalSearch(restoreFocus=true){
 if(!globalSearchOpen)return;
 globalSearchOpen=false;globalSearchMode='all';globalSearchResults=[];
 $('global-search-panel').hidden=true;$('global-search-backdrop').hidden=true;
 $('global-search-input').setAttribute('aria-expanded','false');
 document.body.classList.remove('global-search-open');
 $('global-search-input').value='';
 if(restoreFocus && globalSearchPreviousFocus?.focus && globalSearchPreviousFocus.isConnected)
  globalSearchPreviousFocus.focus();
}
function selectGlobalSearchResult(item){
 if(globalSearchMode==='select_unit'){
   const u=units.find(u=>u.id===item.unitId);
   if(!u)return;
   selectROUnit(u);
   closeGlobalSearch(false);
   $('ro-description').focus();
   return;
 }
 const unitIds=item.kind==='customer'?(item.unitIds?.length?item.unitIds:[item.unitId]):[item.unitId];
 const id=(unitIds??[]).find(uid=>units.some(u=>u.id===uid));
 if(id){selected=id;search=null;render();}
 closeGlobalSearch(false);
 if(item.kind==='ro')notice('lookup-feedback','Opened '+item.title+' and its linked unit.',false);
 else if(item.kind==='customer')notice('lookup-feedback','Opened '+item.title+' and its linked unit.',false);
 else notice('lookup-feedback','Opened '+item.title+'.',false);
 $('unit-detail').scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('global-search-input').addEventListener('focus',()=>{if(!globalSearchOpen)openGlobalSearch()});
$('global-search-input').addEventListener('input',()=>{if(!globalSearchOpen){const typed=$('global-search-input').value;openGlobalSearch();$('global-search-input').value=typed;}renderGlobalSearch();});
$('open-global-search').onclick=()=>openGlobalSearch('all');
$('ro-open-global-search').onclick=()=>openGlobalSearch('select_unit');
$('global-search-close').onclick=()=>closeGlobalSearch();
$('global-search-backdrop').onclick=()=>closeGlobalSearch();
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
   e.preventDefault();openGlobalSearch('all');return;
 }
 if(!globalSearchOpen)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeGlobalSearch();return;}
 if(e.key==='ArrowDown'){e.preventDefault();setGlobalSearchActive(globalSearchActiveIndex+1);return;}
 if(e.key==='ArrowUp'){e.preventDefault();setGlobalSearchActive(globalSearchActiveIndex-1);return;}
 if(e.key==='Enter'){
   const item=globalSearchResults[globalSearchActiveIndex];
   if(item){e.preventDefault();selectGlobalSearchResult(item);}
 }
});
