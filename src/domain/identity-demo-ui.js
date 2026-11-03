/* Offline OneShop prototype-only presentation adapter.
 * Identity selection is delegated to src/domain/identity-display.mjs at build.
 * This adapter does not grant permissions or authorize access to customer data.
 */
const ROLE_DISPLAY_NAMES=[
 ['service_writer','Service Writer'],['technician','Technician'],['porter','Porter / Lot'],
 ['sales','Sales'],['foreman','Foreman'],['service_dispatch','Service Dispatch'],
 ['parts','Parts'],['warranty','Warranty'],['pdi','PDI / Inventory'],
 ['wash','Wash'],['detail','Detail']
];
function demoIdentityRecord(){
 return {customerName:state.customer.name,roNumber:state.ro,
   roNumbers:[state.ro,...state.extraROs.map(r=>r.number)].filter(Boolean),
   unit:{unitId:state.matchedRecord||'U-DEMO-001',vin:state.unit.vin,
     stockNumber:state.unit.stock,year:state.unit.year,make:state.unit.make,model:state.unit.model}};
}
function demoRoleIdentity(role){
 return displayIdentifiers({role,profile:state.config.identifierProfiles[role],
   record:demoIdentityRecord(),allowedFields:Object.keys(IDENTIFIER_FIELDS)});
}
function demoRoleIdentityText(role){
 const p=demoRoleIdentity(role);const items=[p.primary,p.secondary].filter(Boolean);
 return items.length?items.map(x=>x.value).join(' · '):'Unit identifier pending';
}
function roleIdentifierSettingsView(){
 const role=state.identifierRole,profile=state.config.identifierProfiles[role],
       current=demoRoleIdentity(role);
 const options=(selected,canNone)=>Object.entries(IDENTIFIER_FIELDS)
   .map(([key,label])=>'<option value="'+esc(key)+'" '+(selected===key?'selected':'')+'>'+esc(label)+'</option>').join('');
 const secondary='<option value="none" '+(profile.secondary==='none'?'selected':'')+'>None</option>'+options(profile.secondary,true);
 const roles=ROLE_DISPLAY_NAMES.map(([key,label])=>'<option value="'+esc(key)+'" '+(role===key?'selected':'')+'>'+esc(label)+'</option>').join('');
 const shown=[current.primary,current.secondary].filter(Boolean);
 const preview=shown.length?shown.map(item=>
   '<div class="identifier-chip"><small>'+esc(item.label)+'</small><strong>'+esc(item.value)+'</strong></div>'
 ).join(''):'<span class="muted">No authorized identifier available</span>';
 const summary=ROLE_DISPLAY_NAMES.map(([key,label])=>{
   const v=state.config.identifierProfiles[key];
   return '<div class="identifier-summary"><b>'+esc(label)+'</b><span>'+
      esc(IDENTIFIER_FIELDS[v.primary])+' / '+esc(v.secondary==='none'?'None':IDENTIFIER_FIELDS[v.secondary])+'</span></div>';
 }).join('');
 return '<section class="card"><div class="card-head"><div><h2>Role display identifiers</h2>'+
   '<p class="muted">Select the identifiers employees see first in unit, assignment and notification cards.</p></div>'+
   '<span class="pill">Browser demo</span></div>'+
   '<div class="identifier-config-grid"><div><div class="field"><label for="identifier-role">Employee role</label>'+
   '<select id="identifier-role">'+roles+'</select></div>'+
   '<div class="grid2"><div class="field"><label for="identifier-primary">Primary identifier</label>'+
   '<select id="identifier-primary" data-identifier-slot="primary">'+options(profile.primary,false)+'</select></div>'+
   '<div class="field"><label for="identifier-secondary">Secondary identifier</label>'+
   '<select id="identifier-secondary" data-identifier-slot="secondary">'+secondary+'</select></div></div>'+
   '<p class="hint">Unavailable identifiers fall back to other authorized values. This setting does not grant data access.</p>'+
   '<div class="actions"><button class="btn" id="reset-identifier-role">Restore role defaults</button></div></div>'+
   '<div class="identifier-live-preview"><div class="eyebrow">Live preview · Current unit</div>'+
   '<div class="identifier-values">'+preview+'</div>'+
   '<p class="muted">'+esc([state.unit.year,state.unit.make,state.unit.model].filter(Boolean).join(' '))+'</p>'+
   '<div class="divider"></div><p class="muted">Displayed consistently in role-specific work and move notifications.</p></div></div>'+
   '<details class="identifier-all-roles"><summary>View all role profiles</summary><div class="identifier-summary-grid">'+summary+'</div></details></section>'+
   '<div class="card"><h3>Display preferences and permissions</h3>'+
   '<p class="muted">Role permissions separately determine who may read customer identity, VIN or RO data. Production changes require management permission and server-side validation. These values persist only in this browser.</p></div>';
}
function wireRoleIdentifierSettings(){
 const chooser=root.querySelector('#identifier-role');
 if(chooser)chooser.onchange=()=>{state.identifierRole=chooser.value;state.error='';state.notice='';render()};
 root.querySelectorAll('[data-identifier-slot]').forEach(el=>el.onchange=()=>{
   const profile=state.config.identifierProfiles[state.identifierRole];
   const key=el.dataset.identifierSlot,previous=profile[key];
   profile[key]=el.value;const checked=validateIdentifierProfile(profile);
   if(!checked.ok){profile[key]=previous;state.error=checked.error;render();return}
   persistSettings();state.error='';
   state.notice='Identifier order updated for '+ROLE_DISPLAY_NAMES.find(x=>x[0]===state.identifierRole)[1]+'.';render();
 });
 const reset=root.querySelector('#reset-identifier-role');
 if(reset)reset.onclick=()=>{state.config.identifierProfiles[state.identifierRole]=copy(DEFAULT_IDENTIFIER_PROFILES[state.identifierRole]);persistSettings();state.notice='Role identifiers restored to defaults.';render()};
}
