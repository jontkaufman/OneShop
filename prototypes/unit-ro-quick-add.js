(function(){'use strict';
const $=id=>document.getElementById(id);
const initial=[
{id:'U-001',type:'RV',year:'2022',make:'Grand Design',model:'Reflection 311BHS',vin:'573FR3827N9924101',stock:'',customer:'Jordan Ellis',phone:'(707) 555-0169',email:'jordan@example.com',ro:'RO-10482',visit:'Checked in',location:'DO-01'},
{id:'U-002',type:'RV',year:'2025',make:'Airstream',model:'Flying Cloud',vin:'5ZT2SRVB4SB087215',stock:'INV-0472',customer:'Dealer inventory',phone:'',email:'',ro:'',visit:'On site',location:'PDI-01'},
{id:'U-003',type:'RV',year:'2023',make:'Forest River',model:'Salem',vin:'4X4TSMX27PK015608',stock:'STK-0259',customer:'Morgan Lee',phone:'(707) 555-0145',email:'morgan@example.com',ro:'RO-10473',visit:'Checked in',location:'SS-02'},
{id:'U-004',type:'RV',year:'2020',make:'Winnebago',model:'View 24D',vin:'W1X8E33Y1LN135493',stock:'STK-0117',customer:'Casey Baker',phone:'(707) 555-0197',email:'casey@example.com',ro:'RO-10394',visit:'Not currently onsite',location:'—'}
];
let units=initial.slice(), selected=units[0].id, search=null;
let ros=[
 {number:'RO-10482',unitId:'U-001',description:'Freshwater pump noise and intermittent low pressure',lines:[],created:'2026-11-03'},
 {number:'RO-10473',unitId:'U-003',description:'Diagnose furnace ignition and inspect propane supply',lines:[],created:'2026-11-02'},
 {number:'RO-10394',unitId:'U-004',description:'Review sealant and roof inspection recommendations',lines:[],created:'2026-10-30'}
];
let modalMode='',roUnitId=null,lastFocus=null,roSearchResults=[];

const roleLabels={service_writer:['Customer','RO'],porter:['Stock','VIN'],technician:['RO','VIN'],sales:['Stock','Unit'],foreman:['RO','VIN'],pdi:['Stock','VIN']};
function identity(u){const role=$('role').value;const options={Customer:u.customer&&u.customer!=='Dealer inventory'?u.customer:'',RO:u.ro,Stock:u.stock,VIN:u.vin?u.vin.slice(-6):'',Unit:[u.year,u.make,u.model].filter(Boolean).join(' ')};
 const keys=[...roleLabels[role],'VIN','Stock','Unit'].filter((k,i,a)=>a.indexOf(k)===i);
 return keys.filter(k=>options[k]).slice(0,2).map(k=>options[k]).join(' · ')||u.id;
}
function mk(tag,cls,text){let n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function badge(u){return u.visit==='Not currently onsite'?'Not on site':u.visit;}
function render(){const list=$('units-list');list.replaceChildren();const matches=search?units.filter(u=>String(u[search.kind]||'').toLowerCase()===search.value.toLowerCase()):units;
 $('units-count').textContent=units.length;$('onsite-count').textContent=units.filter(u=>u.visit!=='Not currently onsite').length;$('ro-count').textContent=ros.length;
 if(!matches.length)list.append(mk('p','empty-info','No exact matches in this demonstration. Confirm the identifier before registering a new unit.'));
 for(const u of matches){const row=mk('div','unit-row'+(u.id===selected?' active':''));const main=mk('div','unit-main');main.append(mk('div','unit-title',identity(u)),mk('div','unit-sub',[u.year,u.make,u.model].filter(Boolean).join(' ')+' · '+u.id),mk('div','record-line',u.location+' · '+badge(u)));const b=mk('button','btn secondary','View unit');b.type='button';b.dataset.unit=u.id;b.addEventListener('click',()=>{selected=u.id;render();});row.append(main,b);list.append(row);}
 renderDetail();renderRecentROs();}
function renderDetail(){const el=$('detail-content');el.replaceChildren();const u=units.find(x=>x.id===selected);if(!u){el.append(mk('p','muted','Choose a unit to review.'));return;}
 const data=[['Role identification',identity(u)],['Unit reference',u.id],['VIN',u.vin||'Not recorded'],['Stock number',u.stock||'Not recorded'],['Current owner / account',u.customer||'Unassigned'],['Owner contact',[(u.phone||''),(u.email||'')].filter(Boolean).join(' · ')||'Not recorded'],['Associated ROs',ros.filter(r=>r.unitId===u.id).map(r=>r.number).join(', ')||'Not yet opened'],['Last known position',u.location||'Unknown'],['Visit status',u.visit]];
 for(const [label,value] of data){const row=mk('div','kv');row.append(mk('span','',label),mk('strong','',value));el.append(row);}}
function notice(id,txt,isError){const n=$(id);n.textContent=txt;n.dataset.type=isError?'error':'ok';}
$('role').addEventListener('change',()=>{syncAddPermissions();render();});
$('lookup-form').addEventListener('submit',e=>{e.preventDefault();const value=$('search-value').value.trim();if(!value){notice('lookup-feedback','Enter a VIN or stock number.',true);return;}
 search={kind:$('search-kind').value,value};const found=units.filter(u=>String(u[search.kind]||'').toLowerCase()===value.toLowerCase());if(found.length)selected=found[0].id;
 notice('lookup-feedback',found.length?found.length+' matching unit(s) found. Select the existing record.':'No matching unit found in these sample records.',!found.length);render();});
$('clear-search').addEventListener('click',()=>{search=null;$('search-value').value='';$('lookup-feedback').textContent='';render();});

function renderRecentROs(){
 const el=$('recent-ros');el.replaceChildren();
 for(const ro of ros.slice().reverse().slice(0,5)){
  const u=units.find(x=>x.id===ro.unitId),row=mk('div','recent-ro-row'),info=mk('div','');
  info.append(mk('b','',ro.number),mk('p','',ro.description),mk('span','record-badge',u?identity(u):'Unit missing'));
  const btn=mk('button','btn secondary','View unit');btn.type='button';btn.onclick=()=>{selected=ro.unitId;search=null;render();};
  row.append(info,btn);el.append(row);
 }
}
function resolveUnit(kind,value){
 const v=value.trim().toLowerCase();if(!v)return [];
 return units.filter(u=>String(u[kind]??'').trim().toLowerCase()===v);
}
function nextRO(){const nums=ros.map(r=>/^(?:RO-)(\d+)$/i.exec(r.number)).filter(Boolean).map(x=>Number(x[1]));
 const largest=Math.max(10482,...nums);let n=largest+1;
 while(ros.some(r=>r.number.toLowerCase()==='ro-'+n))n++;
 return 'RO-'+n;
}
function modalError(text){$('modal-error').textContent=text||'';}
function canCreateRO(){return ['service_writer','foreman'].includes($('role').value);}
function syncAddPermissions(){const allowed=canCreateRO(),button=$('top-create-ro');button.disabled=!allowed;button.title=allowed?'Create a repair order':'RO creation requires an authorized role (demo policy).';}
function toggleAddMenu(force){const menu=$('add-menu');const open=force??menu.hidden;menu.hidden=!open;$('add-button').setAttribute('aria-expanded',String(open));}
$('add-button').onclick=()=>toggleAddMenu();
$('top-add-unit').onclick=()=>openModal('unit');
$('top-create-ro').onclick=()=>openModal('ro');
function openModal(mode,opts={}){
 toggleAddMenu(false);
 if(mode==='ro'&&!canCreateRO()){
  notice('lookup-feedback','This role cannot create ROs in the demo. Switch to Service Writer or Foreman.',true);return;
 }
 lastFocus=document.activeElement;modalMode=mode;modalError('');roSearchResults=[];
 $('modal-unit-form').hidden=mode!=='unit';$('modal-ro-form').hidden=mode!=='ro';
 for(const id of ['unit-save','unit-save-ro'])$(id).hidden=mode!=='unit';$('ro-save').hidden=mode!=='ro';
 $('modal-title').textContent=mode==='unit'?'Add Unit':'Create Repair Order';
 $('modal-kicker').textContent=mode==='unit'?'Unit records / New':'Repair orders / New';
 $('modal-description').textContent=mode==='unit'?'Register the vehicle once. Add an RO now or later.':'Select an existing unit using a unique identifier, then document the work.';
 $('action-modal').hidden=false;document.body.style.overflow='hidden';
 if(mode==='unit'){
  $('modal-unit-form').reset();$('m-duplicate-results').replaceChildren();$('m-unit-vin').focus();
 }else{
  $('modal-ro-form').reset();$('ro-line-items').replaceChildren();$('ro-match-results').replaceChildren();
  $('ro-number').value=nextRO();roUnitId=null;$('ro-connected-unit').hidden=true;
  if(opts.unitId){const u=units.find(x=>x.id===opts.unitId);if(u){selectROUnit(u);$('ro-id-kind').value=u.stock?'stock':u.vin?'vin':'id';$('ro-id-value').value=u[$('ro-id-kind').value]||u.id;}}
  $('ro-id-value').focus();
 }
}
function closeModal(){
 $('action-modal').hidden=true;document.body.style.overflow='';modalMode='';modalError('');
 if(lastFocus?.focus)lastFocus.focus();
}
$('modal-close').onclick=closeModal;$('modal-cancel').onclick=closeModal;
$('action-modal').addEventListener('mousedown',e=>{if(e.target===$('action-modal'))closeModal()});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  if(!$('action-modal').hidden){closeModal();return;}
  toggleAddMenu(false);
 }
 if(e.key==='Tab'&&!$('action-modal').hidden){
  const focusable=[...$('action-modal').querySelectorAll('button:not([hidden]):not(:disabled),input:not([hidden]),select:not([hidden]),textarea:not([hidden])')]
    .filter(x=>x.getClientRects().length);
  if(focusable.length){const first=focusable[0],last=focusable.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 }
});
document.addEventListener('click',e=>{
 if(!$('add-menu').hidden&&!$('add-menu').contains(e.target)&&!$('add-button').contains(e.target))toggleAddMenu(false);
});
function inspectDuplicates(vin,stock){
 const matches=units.filter(u=>(vin&&u.vin&&u.vin.toLowerCase()===vin.toLowerCase())||(stock&&u.stock&&u.stock.toLowerCase()===stock.toLowerCase()));
 const target=$('m-duplicate-results');target.replaceChildren();
 if(matches.length){
  target.append(mk('p','modal-error','Matching unit identifier already exists. No duplicate was created. Select the existing unit instead.'));
  for(const u of matches){const row=mk('div','match-option'),body=mk('div','');
   body.append(mk('b','',identity(u)),mk('p','muted',[u.year,u.make,u.model,u.id].filter(Boolean).join(' · ')));
   const button=mk('button','btn secondary','Use existing');button.type='button';button.onclick=()=>{
    selected=u.id;render();openModal('ro',{unitId:u.id});
   };row.append(body,button);target.append(row);
  }
 }
 return matches;
}
function saveUnit(andRO){
 modalError('');const vin=$('m-unit-vin').value.trim(),stock=$('m-unit-stock').value.trim();
 if(!vin&&!stock){modalError('Enter a VIN or stock number to identify the unit.');return;}
 if(inspectDuplicates(vin,stock).length){modalError('An existing unit matches the identifier. Review it instead of adding another.');return;}
 const year=$('m-unit-year').value.trim();
 if(year&&(Number(year)<1880||Number(year)>2200)){modalError('Enter a valid year.');return;}
 const n=Math.max(0,...units.map(u=>Number(u.id.replace(/^U-/,''))||0))+1;
 const u={id:'U-'+String(n).padStart(3,'0'),type:$('m-unit-type').value,year:year||'',make:$('m-unit-make').value.trim(),model:$('m-unit-model').value.trim(),vin,stock,customer:'Unassigned',phone:'',email:'',ro:'',visit:'Not currently onsite',location:'—'};
 units.unshift(u);selected=u.id;search=null;render();
 if(andRO){openModal('ro',{unitId:u.id});modalError('');}
 else{closeModal();notice('lookup-feedback',u.id+' was saved. No RO or visit was created.',false);}
}
$('unit-save').onclick=()=>saveUnit(false);
$('unit-save-ro').onclick=()=>saveUnit(true);
function selectROUnit(u){
 roUnitId=u.id;selected=u.id;
 const target=$('ro-connected-unit');target.hidden=false;target.replaceChildren();
 const badge=mk('span','record-badge','LINKED UNIT');target.append(badge);
 target.append(mk('strong','',[u.year,u.make,u.model].filter(Boolean).join(' ')||u.id));
 target.append(mk('p','muted','Stock '+(u.stock||'Not recorded')+' · VIN '+(u.vin||'Not recorded')+' · '+u.id));
 const owner=mk('div','connected-owner');
 for(const [label,value] of [['Current owner / account',u.customer||'Unassigned'],['Phone',u.phone||'Not recorded'],['Email',u.email||'Not recorded'],['Existing ROs',ros.filter(r=>r.unitId===u.id).map(r=>r.number).join(', ')||'None']]){
  const item=mk('div','owner-kv');item.append(mk('small','',label),mk('b','',value));owner.append(item);
 }
 target.append(owner);$('ro-match-results').replaceChildren();
}
function findROUnit(){
 modalError('');roUnitId=null;$('ro-connected-unit').hidden=true;
 const kind=$('ro-id-kind').value,value=$('ro-id-value').value.trim();
 if(!value){modalError('Enter a stock number, VIN, or OneShop unit reference.');return;}
 roSearchResults=resolveUnit(kind,value);const target=$('ro-match-results');target.replaceChildren();
 if(!roSearchResults.length){target.append(mk('p','muted','No exact unit match. Confirm the identifier or add the unit first.'));return;}
 if(roSearchResults.length===1){selectROUnit(roSearchResults[0]);return;}
 target.append(mk('p','muted','More than one unit has this identifier. Select the correct record before continuing.'));
 for(const u of roSearchResults){const row=mk('div','match-option'),body=mk('div','');
  body.append(mk('b','',identity(u)),mk('p','muted',[u.year,u.make,u.model,u.id].filter(Boolean).join(' · ')));
  const button=mk('button','btn secondary','Select unit');button.type='button';button.onclick=()=>selectROUnit(u);row.append(body,button);target.append(row);
 }
}
$('ro-find-unit').onclick=findROUnit;
$('ro-id-value').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();findROUnit();}};
$('ro-reset-number').onclick=()=>{$('ro-number').value=nextRO();modalError('');};
$('add-ro-line').onclick=()=>{
 const container=$('ro-line-items'),row=mk('div','optional-line');
 const input=mk('input','');input.placeholder='Describe this optional work item';input.maxLength=300;input.setAttribute('aria-label','Optional line item description');
 const del=mk('button','btn','Remove');del.type='button';del.onclick=()=>row.remove();
 row.append(input,del);container.append(row);input.focus();
};
function saveRO(){
 modalError('');if(!roUnitId){modalError('Select an existing unit by an exact vehicle identifier before saving an RO.');return;}
 const number=$('ro-number').value.trim(),description=$('ro-description').value.trim();
 if(!number){modalError('RO number cannot be blank. Use the next assigned number or enter a custom one.');return;}
 if(ros.some(r=>r.number.toLowerCase()===number.toLowerCase())){modalError('RO '+number+' already exists. Choose a unique number for this dealership.');return;}
 if(!description){modalError('A brief work description is required. Detailed line items are optional.');return;}
 const lines=[...$('ro-line-items').querySelectorAll('input')].map(x=>x.value.trim()).filter(Boolean);
 const u=units.find(x=>x.id===roUnitId);
 const ro={number,unitId:u.id,description,lines,ownerSnapshot:u.customer||'Unassigned',created:new Date().toISOString()};
 ros.push(ro);u.ro=number;selected=u.id;search=null;render();closeModal();
 notice('lookup-feedback','RO '+number+' created and linked to '+u.id+'. '+lines.length+' optional line item(s).',false);
}
$('ro-save').onclick=saveRO;
$('modal-ro-form').onsubmit=e=>{e.preventDefault();saveRO()};
$('modal-unit-form').onsubmit=e=>{e.preventDefault();saveUnit(false)};

syncAddPermissions();
render();
})();
