(function(){
'use strict';
/*__PERMISSIONS_DOMAIN__*/
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const html=escapeHtml;
const now=()=>new Date().toLocaleString();
const demoUsers=[
 {id:'usr-owner',name:'Alex Morgan',email:'alex@example.test',phone:'(707) 555-0100',extension:'100',position:'pos-owner',manager:null,role:'owner',status:'active',owner:true,payBasis:'salary',payRate:'125000',overrides:{}},
 {id:'usr-admin',name:'Mia Thompson',email:'mia@example.test',phone:'(707) 555-0111',extension:'112',position:'pos-manager',manager:'usr-owner',role:'administrator',status:'active',owner:false,payBasis:'salary',payRate:'92000',overrides:{}},
 {id:'usr-writer',name:'Casey Rivera',email:'casey@example.test',phone:'(707) 555-0122',extension:'115',position:'pos-writer',manager:'usr-admin',role:'service_writer',status:'active',owner:false,payBasis:'hourly',payRate:'33.00',overrides:{}},
 {id:'usr-porter',name:'Jordan Ellis',email:'jordan@example.test',phone:'(707) 555-0133',extension:'210',position:'pos-porter',manager:'usr-admin',role:'porter',status:'active',owner:false,payBasis:'hourly',payRate:'23.00',overrides:{}},
 {id:'usr-tech',name:'Morgan Lee',email:'morgan@example.test',phone:'(707) 555-0144',extension:'228',position:'pos-technician',manager:'usr-admin',role:'technician',status:'active',owner:false,payBasis:'flat_rate',payRate:'38.50',overrides:{}},
 {id:'usr-finance',name:'Taylor Brooks',email:'taylor@example.test',phone:'(707) 555-0155',extension:'134',position:'pos-finance',manager:'usr-owner',role:'finance_manager',status:'active',owner:false,payBasis:'salary',payRate:'84000',overrides:{}}
];
const positions=[
 {id:'pos-owner',title:'Dealer Principal',department:'Administration',active:true},
 {id:'pos-manager',title:'Service Manager',department:'Service',active:true},
 {id:'pos-writer',title:'Service Writer',department:'Service',active:true},
 {id:'pos-porter',title:'Porter',department:'Lot Operations',active:true},
 {id:'pos-technician',title:'Service Technician',department:'Shop',active:true},
 {id:'pos-finance',title:'Finance Manager',department:'Accounting',active:true}
];
const roles=Object.entries(ROLE_TEMPLATES).map(([id,template])=>({id,label:template.label,permissions:[...template.permissions],system:true,archived:false}));
const logs=[{time:now(),actor:'System',text:'Example dealership initialized with core modules enabled and advanced modules disabled.'}];
const state={
 page:'users',selectedUserId:'usr-writer',profileTab:'contact',viewerId:'usr-owner',
 selectedRoleId:'service_writer',selectedPositionId:'pos-writer',
 users:demoUsers,roles,positions,modules:defaultModuleSettings(),logs
};
let dialogAction=null,lastFocused=null;
function viewer(){return state.users.find(u=>u.id===state.viewerId);}
function selectedUser(){return state.users.find(u=>u.id===state.selectedUserId)??state.users[0];}
function selectedRole(){return state.roles.find(r=>r.id===state.selectedRoleId)??state.roles[0];}
function selectedPosition(){return state.positions.find(p=>p.id===state.selectedPositionId)??state.positions[0];}
function positionName(id){return state.positions.find(p=>p.id===id)?.title??'Unassigned';}
function roleName(id){return id==='owner'?'Dealership Owner':state.roles.find(r=>r.id===id)?.label??'Unassigned';}
function accessFor(user){
 if(!user)return effectivePermissions({active:false});
 return effectivePermissions({active:user.status==='active',isOwner:user.owner,
  roles:user.owner?[]:state.roles.filter(r=>r.id===user.role),
  overrides:user.overrides,modules:state.modules});
}
function actorAccess(){return accessFor(viewer());}
function allowed(p){return hasPermission(actorAccess(),p);}
function actorOwner(){return viewer()?.owner===true;}
function canViewPage(page){
 if(page==='users')return allowed('users.read');
 if(page==='roles')return allowed('roles.read');
 if(page==='positions')return allowed('users.read');
 if(page==='modules')return allowed('modules.manage');
 if(page==='audit')return allowed('audit.read');
 return false;
}
function audit(text,target=''){
 state.logs.unshift({time:now(),actor:viewer()?.name??'System',text,target});
}
let toastTimer=null;
function inform(text){
 const el=$('toast');el.textContent=text;el.hidden=false;
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>el.hidden=true,3600);
}
function initials(name){return String(name??'').split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();}
function button(label,action,{variant='',disabled=false}={}){
 return '<button type="button" class="ui-button '+variant+'" data-action="'+html(action)+'"'+(disabled?' disabled':'')+'>'+html(label)+'</button>';
}
function heading(kicker,title,subtitle,actions=''){
 return '<div class="page-heading"><div><p class="overline">'+html(kicker)+'</p><h1>'+html(title)+'</h1><p>'+html(subtitle)+'</p></div>'+
  '<div class="heading-actions">'+actions+'</div></div>';
}
function field(label,id,value='',disabled=false,type='text'){
 return '<div class="field"><label for="'+id+'">'+html(label)+'</label><input type="'+type+'" id="'+id+'" value="'+html(value)+'"'+(disabled?' disabled':'')+'></div>';
}
function selectField(label,id,value,options,disabled=false){
 return '<div class="field"><label for="'+id+'">'+html(label)+'</label><select id="'+id+'"'+(disabled?' disabled':'')+'>'+
  options.map(([id,label])=>'<option value="'+html(id)+'"'+(String(id)===String(value)?' selected':'')+'>'+html(label)+'</option>').join('')+'</select></div>';
}
function roleOptions(){return state.roles.filter(r=>!r.archived).map(r=>[r.id,r.label]);}
function positionOptions(){return [['','Unassigned'],...state.positions.filter(p=>p.active).map(p=>[p.id,p.title])];}
function employeeOptions(current){return [['','No supervisor'],...state.users.filter(u=>u.id!==current.id).map(u=>[u.id,u.name])];}
function navState(){
 document.querySelectorAll('[data-page]').forEach(b=>{
  const page=b.dataset.page;b.classList.toggle('active',state.page===page);
  b.hidden=!canViewPage(page);
 });
 const m=$('top-add');m.disabled=!(allowed('users.create')||allowed('roles.manage')||allowed('positions.manage'));
 const vs=$('viewer-select');
 const prev=vs.value;
 vs.innerHTML=state.users.map(u=>'<option value="'+html(u.id)+'"'+(u.id===state.viewerId?' selected':'')+'>'+html(u.name)+'</option>').join('');
 if(prev && state.users.some(u=>u.id===prev)&&prev===state.viewerId)vs.value=prev;
}
function renderUsers(){
 const users=state.users;
 const stats=[
  ['Employees',users.length,'All branch members'],
  ['Active',users.filter(u=>u.status==='active').length,'Current access'],
  ['Invited',users.filter(u=>u.status==='invited').length,'Awaiting activation'],
  ['Role templates',state.roles.filter(r=>!r.archived).length,'Reusable policies']
 ];
 const summary='<div class="summary-strip">'+stats.map(([label,val,desc])=>'<section class="admin-card metric"><label>'+html(label)+'</label><strong>'+val+'</strong><small>'+html(desc)+'</small></section>').join('')+'</div>';
 const left='<div class="admin-card"><div class="card-top"><h2>Employee directory</h2><span class="role-chip">'+users.length+' people</span></div>'+
  '<div class="employee-list">'+users.map(u=>'<button type="button" class="employee-row'+(u.id===state.selectedUserId?' active':'')+'" data-user="'+html(u.id)+'">'+
   '<span class="avatar">'+html(initials(u.name))+'</span><span class="employee-details"><strong>'+html(u.name)+'</strong>'+
   '<span>'+html(positionName(u.position))+' · '+html(roleName(u.role))+'</span></span>'+
   '<span class="status '+html(u.status)+'">'+html(u.status)+'</span></button>').join('')+'</div></div>';
 const u=selectedUser(),isSelectedSelf=u.id===state.viewerId;
 const canEdit=allowed('users.update')||isSelectedSelf;
 const tabs=['contact','position','payroll','permissions','activity'];
 const activeTabs=tabs.filter(t=>t!=='payroll'||allowed('payroll.read'));
 if(!activeTabs.includes(state.profileTab))state.profileTab='contact';
 const detail='<div class="admin-card"><div class="profile-header"><span class="avatar">'+html(initials(u.name))+'</span>'+
  '<div><h2>'+html(u.name)+'</h2><p>'+html(positionName(u.position))+' · '+html(roleName(u.role))+'</p></div>'+
  '<div class="profile-actions"><span class="status '+html(u.status)+'">'+html(u.status)+'</span>'+
  (u.owner?'<span class="role-chip">Protected Owner</span>':button('Deactivate','deactivate',{variant:'danger',disabled:!allowed('users.deactivate')||u.status==='inactive'}))+'</div></div>'+
  '<div class="tabbar" role="tablist">'+activeTabs.map(tab=>'<button type="button" role="tab" aria-selected="'+(state.profileTab===tab)+'" class="'+(state.profileTab===tab?'active':'')+'" data-tab="'+tab+'">'+html(tab[0].toUpperCase()+tab.slice(1))+'</button>').join('')+'</div>'+
  '<div class="profile-body">'+(
   state.profileTab==='contact'?contactPanel(u,canEdit):
   state.profileTab==='position'?positionPanel(u):
   state.profileTab==='payroll'?payrollPanel(u):
   state.profileTab==='permissions'?permissionsPanel(u):
   activityPanel(u)
  )+'</div></div>';
 $('admin-content').innerHTML=heading('Administration / Staff','Users & Employees',
  'One employee record, with separate contact, position, payroll and effective permissions.',
  button('+ Invite employee','invite-user',{variant:'primary',disabled:!allowed('users.create')}))+summary+
  '<div class="two-panel">'+left+detail+'</div>';
}
function contactPanel(u,canEdit){
 return '<div class="field-grid">'+field('Display name','contact-name',u.name,!canEdit)+
  field('Work email','contact-email',u.email,!canEdit,'email')+
  field('Work phone','contact-phone',u.phone,!canEdit,'tel')+
  field('Extension','contact-ext',u.extension,!canEdit)+'</div>'+
  '<p class="field-hint">Contact fields are part of the employee directory. Payroll and permission records are stored and protected separately.</p>'+
  '<div class="field-actions">'+button('Save contact details','save-contact',{variant:'primary',disabled:!canEdit})+'</div>';
}
function positionPanel(u){
 const editable=allowed('positions.manage')||allowed('users.update');
 return '<div class="field-grid">'+
  selectField('Position','employee-position',u.position,positionOptions(),!editable||u.owner)+
  selectField('Reports to','employee-manager',u.manager||'',employeeOptions(u),!editable||u.owner)+
  field('Department','employee-dept',state.positions.find(p=>p.id===u.position)?.department||'',true)+
  field('Employment status','employee-status',u.status,true)+'</div>'+
  '<p class="field-hint">Positions describe organizational responsibilities, not database access. A title change does not grant permissions.</p>'+
  '<div class="field-actions">'+button('Manage positions','manage-positions',{disabled:!allowed('positions.manage')})+
    button('Save position assignment','save-position',{variant:'primary',disabled:!editable||u.owner})+'</div>';
}
function payrollPanel(u){
 if(!allowed('payroll.read'))return '<div class="inline-callout">Payroll information is restricted to employees explicitly granted access.</div>';
 const edit=allowed('payroll.manage'),basis=[['hourly','Hourly'],['salary','Salary'],['flat_rate','Flat rate'],['mixed','Hourly + flat rate']];
 return '<div class="inline-callout"><strong>Confidential compensation record.</strong> Payroll information is not included in general employee search results, the Unit record, or RO notifications.</div>'+
  '<div class="field-grid" style="margin-top:17px">'+selectField('Pay method','pay-basis',u.payBasis,basis,!edit)+
    field('Base pay rate (USD)','pay-rate',u.payRate,!edit,'number')+'</div>'+
  '<p class="field-hint">Illustrative pay data only. The production schema stores compensation in a private table, not in the public employee directory. Historical changes require versioned effective dates and audit.</p>'+
  '<div class="field-actions">'+button('Save compensation','save-payroll',{variant:'primary',disabled:!edit})+'</div>';
}
const CATEGORIES=[
  {title:'Administration',module:null,keys:Object.keys(PERMISSIONS).filter(p=>PERMISSIONS[p].module===null)},
  ...Object.keys(MODULES).map(key=>({title:MODULES[key].label,module:key,keys:Object.keys(PERMISSIONS).filter(p=>PERMISSIONS[p].module===key)}))
];
function permissionGroups(access,u,mode){
 const isOwner=u?.owner===true,canEdit=mode==='role'?allowed('roles.manage')&&!selectedRole()?.system:
  allowed('permissions.assign')&&!isOwner&&u?.id!==state.viewerId;
 return CATEGORIES.map((group,idx)=>{
  const disabled=group.module && state.modules[group.module]!==true;
  const rows=group.keys.map(key=>{
   const p=PERMISSIONS[key],allowedNow=hasPermission(access,key);
   const source=access.sources[key]??'Not granted';
   const stateOverride=mode==='user'?(u.overrides[key]??'inherit'):(selectedRole()?.permissions.includes(key)?'allow':'deny');
   const right=mode==='user'?
    '<select aria-label="Override '+html(p.label)+'" data-permission-override="'+html(key)+'"'+(canEdit?'':' disabled')+'>'+
    [['inherit','Inherit'],['allow','Allow'],['deny','Deny']].map(([value,label])=>
      '<option value="'+value+'"'+(value===stateOverride?' selected':'')+'>'+label+'</option>').join('')+'</select>':
    '<input class="inline-switch" aria-label="Grant '+html(p.label)+'" type="checkbox" data-role-permission="'+html(key)+'"'+
    (stateOverride==='allow'?' checked':'')+(canEdit?'':' disabled')+'>';
   return '<div class="permission-row"><div><strong>'+html(p.label)+'</strong>'+
    '<small>'+html(source)+(p.sensitive?' · Sensitive data':'')+'</small></div>'+
    '<span class="effective '+(allowedNow?'yes':'no')+'">'+(allowedNow?'Allowed':'Denied')+'</span>'+right+'</div>';
  }).join('');
  return '<details class="perm-group"'+(idx===0||idx===3?' open':'')+'><summary>'+html(group.title)+
   '<span class="muted">'+group.keys.length+' permissions'+(disabled?' · Module off':'')+'</span></summary>'+rows+'</details>';
 }).join('');
}
function permissionsPanel(u){
 const access=accessFor(u),canAssign=allowed('permissions.assign')&&!u.owner&&u.id!==state.viewerId;
 return '<div class="permission-intro"><div><strong>Assigned permissions</strong><p class="field-hint" style="margin:3px 0 0">Role baseline + individual exceptions + enabled modules</p></div>'+
  '<span class="role-chip">'+access.allowed.length+' effective permissions</span></div>'+
  (u.owner?'<div class="inline-callout"><strong>Founding Owner.</strong> Full administrative authority is protected. Advanced modules remain unavailable until enabled in Module Settings.</div>':
  '<div class="field-grid">'+selectField('Permission template','user-role',u.role,roleOptions(),!canAssign)+
  '<div class="field"><label>Individual exceptions</label><div class="inline-callout">Inherit uses the template. Allow or Deny applies only to this employee.</div></div></div>')+
  '<p class="field-hint">The effective result is calculated per organization and branch. This demonstration changes only fictional browser records.</p>'+
  permissionGroups(access,u,'user');
}
function activityPanel(u){
 const entries=state.logs.filter(x=>x.target===u.id||!x.target).slice(0,20);
 return '<p class="field-hint">Permission, position, account and pay changes require an immutable audit record in production.</p>'+
  (entries.length?entries.map(x=>'<div class="audit-row"><time>'+html(x.time)+'</time><span>'+html(x.text)+'</span><strong>'+html(x.actor)+'</strong></div>').join(''):'<div class="inline-callout">No recorded changes yet.</div>');
}
function renderRoles(){
 const r=selectedRole(),isOwner=actorOwner(),canManage=allowed('roles.manage'),canEdit=canManage&&!r.system;
 const roleAccess=effectivePermissions({roles:[r],modules:state.modules});
 const left='<div class="admin-card"><div class="card-top"><h2>Permission templates</h2><span class="role-chip">'+state.roles.filter(r=>!r.archived).length+' active</span></div>'+
  '<div class="role-list">'+state.roles.filter(x=>!x.archived).map(x=>
   '<button type="button" class="role-item'+(x.id===r.id?' active':'')+'" data-role="'+html(x.id)+'"><span>'+
   '<strong>'+html(x.label)+'</strong><small>'+html(x.system?'Protected starter template':'Custom role')+'</small></span>'+
   '<span class="role-chip">'+x.permissions.length+'</span></button>').join('')+'</div></div>';
 const right='<div class="admin-card"><div class="role-panel"><div class="permission-intro"><div><h2>'+html(r.label)+'</h2>'+
   '<p class="field-hint">'+html(r.system?'Starter template is protected. Clone it to customize.':'Custom template · versioned changes in production.')+'</p></div>'+
   '<div class="heading-actions">'+button('Clone template','clone-role',{disabled:!canManage})+
   button('Rename','rename-role',{disabled:!canEdit})+
   button('Archive','archive-role',{variant:'danger',disabled:!canEdit})+'</div></div>'+
   '<div class="inline-callout"><strong>Reusable template.</strong> Changes to a role affect every employee assigned to it, except where an individual override applies. Roles do not replace job positions.</div>'+
   permissionGroups(roleAccess,null,'role')+'</div></div>';
 $('admin-content').innerHTML=heading('Administration / Access','Roles & Permissions',
  'Create role templates once, assign them to staff, and maintain controlled per-user exceptions.',
  button('+ Create role','create-role',{variant:'primary',disabled:!canManage}))+
  '<div class="two-panel">'+left+right+'</div>';
}
function renderPositions(){
 const p=selectedPosition(),assigned=state.users.filter(u=>u.position===p.id).length;
 const canEdit=allowed('positions.manage');
 const left='<div class="admin-card"><div class="card-top"><h2>Job positions</h2><span class="role-chip">'+state.positions.filter(p=>p.active).length+' active</span></div>'+
 '<div class="role-list">'+state.positions.filter(p=>p.active).map(x=>
 '<button type="button" class="role-item'+(p.id===x.id?' active':'')+'" data-position="'+html(x.id)+'"><span>'+
 '<strong>'+html(x.title)+'</strong><small>'+html(x.department||'No department')+'</small></span>'+
 '<span class="role-chip">'+state.users.filter(u=>u.position===x.id).length+'</span></button>').join('')+'</div></div>';
 const right='<div class="admin-card"><div class="card-top"><h2>Position details</h2></div><div class="card-body">'+
  '<div class="field-grid">'+field('Job title','position-title',p.title,!canEdit)+
  field('Department','position-dept',p.department||'',!canEdit)+'</div>'+
  '<p class="field-hint">'+assigned+' active employee(s) assigned. Positions control directory organization and reporting, not access rights.</p>'+
  '<div class="field-actions">'+button('Archive position','archive-position',{variant:'danger',disabled:!canEdit||assigned>0})+
  button('Save position','save-position-definition',{variant:'primary',disabled:!canEdit})+'</div></div></div>';
 $('admin-content').innerHTML=heading('Administration / Organization','Positions',
  'Maintain job titles, departments and reporting structures independently from permissions.',
  button('+ Create position','create-position',{variant:'primary',disabled:!canEdit}))+
  '<div class="two-panel">'+left+right+'</div>';
}
function renderModules(){
 const basic=Object.entries(MODULES).filter(([,v])=>v.tier==='basic');
 const advanced=Object.entries(MODULES).filter(([,v])=>v.tier==='advanced');
 const canEdit=allowed('modules.manage');
 const cards=list=>'<div class="module-grid">'+list.map(([key,m])=>
  '<div class="module-card'+(state.modules[key]?'':' disabled')+'"><div>'+
  '<strong>'+html(m.label)+'</strong><p>'+html(state.modules[key]?'Available to authorized staff':'Disabled for this dealership')+'</p></div>'+
  '<input type="checkbox" class="inline-switch" aria-label="Enable '+html(m.label)+'" data-toggle-module="'+html(key)+'"'+
   (state.modules[key]?' checked':'')+(canEdit?'':' disabled')+'></div>').join('')+'</div>';
 $('admin-content').innerHTML=heading('Administration / Configuration','Modules',
  'Basic modules start enabled. Advanced modules start disabled. A module switch never grants employee permissions.')+
 '<div class="inline-callout"><strong>Two gates are required:</strong> The dealership must enable the module, and an employee must hold the relevant permission. Owner authority can enable modules but cannot use a disabled module.</div>'+
 '<h2 class="module-section-title">Basic Modules · Enabled by default</h2>'+cards(basic)+
 '<h2 class="module-section-title">Advanced Modules · Disabled by default</h2>'+cards(advanced)+
 '<p class="field-hint">Future commercial plan entitlements are an additional gate. Disabling core modules may affect dependent workflows and will require an impact review in production.</p>';
}
function renderAudit(){
 const logs=state.logs;
 $('admin-content').innerHTML=heading('Administration / Security','Audit History',
  'Track changes to roles, overrides, job positions, module configuration and sensitive employee records.')+
  '<div class="admin-card"><div class="card-top"><h2>Recent changes</h2><span class="role-chip">'+logs.length+' events</span></div>'+
  logs.map(x=>'<div class="audit-row"><time>'+html(x.time)+'</time><span>'+html(x.text)+'</span><strong>'+html(x.actor)+'</strong></div>').join('')+'</div>';
}
function render(){
 navState();
 if(!canViewPage(state.page)){
  $('admin-content').innerHTML='<div class="admin-card blocked-state"><h2>Access restricted</h2><p>Your current role cannot open this administrative module. Permission changes must be approved by an authorized owner or administrator.</p></div>';
  return;
 }
 if(state.page==='users')renderUsers();
 else if(state.page==='roles')renderRoles();
 else if(state.page==='positions')renderPositions();
 else if(state.page==='modules')renderModules();
 else renderAudit();
}
function formValue(id){return $(id)?.value?.trim()??'';}
function saveProfile(){
 const u=selectedUser(),self=u.id===state.viewerId;
 if(!allowed('users.update')&&!self)return inform('This role cannot edit employee profiles.');
 const name=formValue('contact-name'),email=formValue('contact-email');
 if(!name||!email.includes('@'))return inform('Enter a valid name and work email.');
 u.name=name;u.email=email;u.phone=formValue('contact-phone');u.extension=formValue('contact-ext');
 audit('Updated contact information',u.id);inform('Contact details saved in the demo.');render();
}
function savePositionAssignment(){
 const u=selectedUser();if(u.owner||(!allowed('positions.manage')&&!allowed('users.update')))return;
 u.position=formValue('employee-position');u.manager=formValue('employee-manager')||null;
 audit('Updated position assignment for '+u.name,u.id);inform('Position updated in the demo.');render();
}
function savePayroll(){
 if(!allowed('payroll.manage'))return inform('Payroll management access required.');
 const u=selectedUser(),basis=formValue('pay-basis'),rate=Number(formValue('pay-rate'));
 if(!['hourly','salary','flat_rate','mixed'].includes(basis)||!Number.isFinite(rate)||rate<0)return inform('Enter a valid compensation rate.');
 u.payBasis=basis;u.payRate=rate.toFixed(2);
 audit('Updated confidential compensation settings for '+u.name,u.id);inform('Example pay record updated.');render();
}
function savePositionDefinition(){
 if(!allowed('positions.manage'))return;
 const p=selectedPosition(),title=formValue('position-title');if(!title)return inform('Position title required.');
 p.title=title;p.department=formValue('position-dept');
 audit('Edited position '+title);inform('Position saved.');render();
}
function setRolePermission(permission,enabled){
 if(!allowed('roles.manage'))return;
 const role=selectedRole();if(role.system)return inform('Clone a protected starter role to customize it.');
 if(!Object.hasOwn(PERMISSIONS,permission))return;
 const set=new Set(role.permissions);enabled?set.add(permission):set.delete(permission);
 role.permissions=[...set];audit('Changed '+permission+' for role '+role.label);
 inform('Role template updated.');render();
}
function setOverride(permission,decision){
 const u=selectedUser(),actor=viewer();
 if(!mayAssignPermission({actorAccess:actorAccess(),actorIsOwner:actor.owner,targetIsSelf:actor.id===u.id,permission,mode:decision})||u.owner){
  inform('Not authorized to change this permission.');render();return;
 }
 if(decision==='inherit')delete u.overrides[permission];else u.overrides[permission]=decision;
 audit('Set '+permission+' to '+decision+' for '+u.name,u.id);
 inform('Individual exception saved in demo.');render();
}
function setRoleAssignment(roleId){
 const u=selectedUser();
 if(u.owner||u.id===state.viewerId||!allowed('permissions.assign'))return inform('Role changes are restricted.');
 const target=state.roles.find(r=>r.id===roleId&&!r.archived);if(!target)return;
 if(!actorOwner() && target.permissions.some(p=>!allowed(p)))
  return inform('Cannot assign permissions above your own access.');
 u.role=roleId;u.overrides={};
 audit('Applied '+target.label+' template to '+u.name,u.id);
 inform('Template applied to employee.');render();
}
function setModule(key,enabled){
 if(!allowed('modules.manage')||!Object.hasOwn(MODULES,key))return;
 state.modules[key]=enabled;
 audit((enabled?'Enabled':'Disabled')+' module '+MODULES[key].label);
 inform('Dealership module configuration updated in demo.');
 render();
}
function openDialog(kind,context={}){
 const owner=actorOwner();
 if(kind==='user'&&!allowed('users.create'))return;
 if((kind==='role'||kind==='clone-role'||kind==='rename-role')&&!allowed('roles.manage'))return;
 if(kind==='position'&&!allowed('positions.manage'))return;
 lastFocused=document.activeElement;
 $('dialog-kicker').textContent='Dealership administration';
 const labels={user:'Invite employee',role:'Create role',position:'Create position','clone-role':'Clone role template','rename-role':'Rename custom role','archive-role':'Archive role','deactivate-user':'Deactivate employee'};
 $('dialog-title').textContent=labels[kind]??'Confirm action';
 let form='';
 if(kind==='user')form='<div class="field-grid">'+field('Employee name','dialog-name')+field('Work email','dialog-email','','','email')+
 selectField('Permission template','dialog-role','service_writer',roleOptions())+
 selectField('Position','dialog-position','',positionOptions())+'</div><p class="field-hint">Demo invitation only. Production must use verified Auth invitations from a trusted server.</p>';
 if(kind==='position')form='<div class="field-grid">'+field('Job title','dialog-name')+field('Department','dialog-dept')+'</div>';
 if(kind==='role'||kind==='clone-role')form='<div class="field-grid">'+field('Role ID','dialog-id',kind==='clone-role'?selectedRole().id+'_custom':'')+
 field('Role name','dialog-name',kind==='clone-role'?selectedRole().label+' (Custom)':'')+'</div>'+
 '<p class="field-hint">New role starts with '+(kind==='clone-role'?'the selected template grants':'no permissions')+'. Edit grants in the role editor.</p>';
 if(kind==='rename-role')form=field('Role name','dialog-name',selectedRole().label);
 if(kind==='archive-role')form='<div class="inline-callout">Archive '+html(selectedRole().label)+'? All assigned employees must be moved to another role first. Historical audit records remain.</div>';
 if(kind==='deactivate-user')form='<div class="inline-callout">Deactivate '+html(selectedUser().name)+'? The employee will lose all permissions immediately in the proposed model. This demo does not revoke an actual login session.</div>';
 $('dialog-body').innerHTML=form;
 dialogAction={kind,...context};
 $('dialog-save').textContent=kind==='user'?'Create example employee':kind.startsWith('archive')?'Archive':kind==='deactivate-user'?'Deactivate':'Save';
 $('dialog-backdrop').hidden=false;
 $('dialog-body').querySelector('input,select')?.focus();
}
function closeDialog(){ $('dialog-backdrop').hidden=true;dialogAction=null;lastFocused?.focus?.(); }
function saveDialog(){
 const kind=dialogAction?.kind;if(!kind)return;
 try {
 if(kind==='user'){
  if(!allowed('users.create'))throw Error('Not authorized');
  const name=formValue('dialog-name'),email=formValue('dialog-email');
  if(!name||!email.includes('@'))throw Error('Name and valid email required');
  if(state.users.some(u=>u.email.toLowerCase()===email.toLowerCase()))throw Error('Employee email already exists');
  const roleId=formValue('dialog-role'),selected=state.roles.find(r=>r.id===roleId);
  if(!actorOwner()&&selected.permissions.some(p=>!allowed(p)))throw Error('Cannot invite with more access than your own');
  const user={id:'usr-'+Date.now(),name,email,phone:'',extension:'',position:formValue('dialog-position'),manager:state.viewerId,role:roleId,status:'invited',owner:false,payBasis:'hourly',payRate:'0',overrides:{}};
  state.users.push(user);state.selectedUserId=user.id;state.page='users';state.profileTab='contact';
  audit('Prepared invitation for '+name,user.id);
 } else if(kind==='position'){
  if(!allowed('positions.manage'))throw Error('Not authorized');
  const name=formValue('dialog-name');if(!name)throw Error('Job title required');
  const p={id:'pos-'+Date.now(),title:name,department:formValue('dialog-dept'),active:true};
  state.positions.push(p);state.selectedPositionId=p.id;state.page='positions';audit('Created job position '+name);
 } else if(kind==='role'||kind==='clone-role'){
  if(!allowed('roles.manage'))throw Error('Not authorized');
  const id=formValue('dialog-id').toLowerCase().replace(/[^a-z0-9_]/g,'_');
  const name=formValue('dialog-name');
  if(!/^[a-z][a-z0-9_]{1,63}$/.test(id))throw Error('Role ID must start with a letter and use 2-64 letters, digits or underscores');
  const grants=kind==='clone-role'?[...selectedRole().permissions]:[];
  if(!actorOwner()&&grants.some(p=>!allowed(p)))throw Error('Cannot clone a template with permissions beyond your own');
  const role=createRoleTemplate({id,label:name,permissions:grants},state.roles);
  state.roles.push(role);state.selectedRoleId=id;state.page='roles';audit('Created role template '+name);
 } else if(kind==='rename-role'){
  const role=selectedRole(),label=formValue('dialog-name');
  const result=updateRoleTemplate(role,{label});Object.assign(role,result);audit('Renamed role '+role.label);
 } else if(kind==='archive-role'){
  if(!allowed('roles.manage'))throw Error('Not authorized');
  const role=selectedRole();
  const archived=archiveRoleTemplate(role,{assignedUsers:state.users.filter(u=>u.role===role.id).length});
  Object.assign(role,archived);state.selectedRoleId='service_writer';audit('Archived role '+role.label);
 } else if(kind==='deactivate-user'){
  const u=selectedUser();
  if(!allowed('users.deactivate')||u.owner||u.id===state.viewerId)throw Error('Protected account');
  u.status='inactive';audit('Deactivated '+u.name,u.id);
 }
 closeDialog();inform('Demo change saved.');render();
 } catch(err){inform(err.message);}
}
function archivePosition(){
 if(!allowed('positions.manage'))return;
 const p=selectedPosition();
 if(state.users.some(u=>u.position===p.id&&u.status!=='inactive'))return inform('Reassign active employees before archiving.');
 p.active=false;state.selectedPositionId=state.positions.find(x=>x.active)?.id??p.id;audit('Archived job position '+p.title);
 inform('Position archived.');render();
}
function onAction(action){
 switch(action){
 case 'invite-user':openDialog('user');break;
 case 'create-role':openDialog('role');break;
 case 'create-position':openDialog('position');break;
 case 'clone-role':openDialog('clone-role');break;
 case 'rename-role':openDialog('rename-role');break;
 case 'archive-role':openDialog('archive-role');break;
 case 'archive-position':archivePosition();break;
 case 'deactivate':openDialog('deactivate-user');break;
 case 'save-contact':saveProfile();break;
 case 'save-position':savePositionAssignment();break;
 case 'save-payroll':savePayroll();break;
 case 'save-position-definition':savePositionDefinition();break;
 case 'manage-positions':state.page='positions';render();break;
 }
}
$('admin-content').addEventListener('click',e=>{
 const user=e.target.closest('[data-user]');if(user){state.selectedUserId=user.dataset.user;state.profileTab='contact';render();return;}
 const tab=e.target.closest('[data-tab]');if(tab){state.profileTab=tab.dataset.tab;render();return;}
 const role=e.target.closest('[data-role]');if(role){state.selectedRoleId=role.dataset.role;render();return;}
 const pos=e.target.closest('[data-position]');if(pos){state.selectedPositionId=pos.dataset.position;render();return;}
 const btn=e.target.closest('[data-action]');if(btn)onAction(btn.dataset.action);
});
$('admin-content').addEventListener('change',e=>{
 const target=e.target;
 if(target.dataset.permissionOverride){setOverride(target.dataset.permissionOverride,target.value);return;}
 if(target.dataset.rolePermission){setRolePermission(target.dataset.rolePermission,target.checked);return;}
 if(target.dataset.toggleModule){setModule(target.dataset.toggleModule,target.checked);return;}
 if(target.id==='user-role')setRoleAssignment(target.value);
});
document.querySelectorAll('[data-page]').forEach(btn=>btn.onclick=()=>{state.page=btn.dataset.page;render();});
$('viewer-select').addEventListener('change',e=>{
 state.viewerId=e.target.value;
 if(!canViewPage(state.page))state.page='users';
 if(!canViewPage('users'))state.selectedUserId=state.viewerId;
 render();inform('Viewing role switched. This does not authenticate another employee.');
});
$('top-add').onclick=e=>{
 const menu=$('add-menu'),rect=$('top-add').getBoundingClientRect();
 menu.style.top=(rect.bottom+5)+'px';menu.style.left=Math.max(8,rect.left-80)+'px';menu.style.right='auto';
 menu.hidden=!menu.hidden;
 menu.querySelector('[data-add-type=user]').disabled=!allowed('users.create');
 menu.querySelector('[data-add-type=role]').disabled=!allowed('roles.manage');
 menu.querySelector('[data-add-type=position]').disabled=!allowed('positions.manage');
};
$('add-menu').addEventListener('click',e=>{
 const b=e.target.closest('[data-add-type]');if(!b)return;
 $('add-menu').hidden=true;openDialog(b.dataset.addType);
});
document.addEventListener('pointerdown',e=>{
 if(!$('add-menu').hidden&&!$('add-menu').contains(e.target)&&!$('top-add').contains(e.target))$('add-menu').hidden=true;
 if(!$('global-results').hidden&&!$('global-results').contains(e.target)&&!$('global-query').contains(e.target))$('global-results').hidden=true;
});
$('dialog-close').onclick=closeDialog;
$('dialog-cancel').onclick=closeDialog;
$('dialog-save').onclick=saveDialog;
$('dialog-backdrop').addEventListener('mousedown',e=>{if(e.target===$('dialog-backdrop'))closeDialog();});
function renderGlobalResults(){
 const q=$('global-query').value.trim().toLowerCase(),host=$('global-results');
 if(q.length<2){host.hidden=true;return;}
 host.replaceChildren();
 const candidates=state.users.filter(u=>allowed('users.read')||u.id===state.viewerId)
  .filter(u=>[u.name,u.email,positionName(u.position),roleName(u.role)].some(s=>s.toLowerCase().includes(q))).slice(0,12);
 if(!candidates.length){host.innerHTML='<p class="field-hint" style="padding:9px">No accessible employee records match. Other modules will join this global search when connected to the application shell.</p>';}
 else for(const u of candidates){
  const btn=document.createElement('button');btn.type='button';
  btn.textContent=u.name+' · '+positionName(u.position)+' · '+roleName(u.role);
  btn.onclick=()=>{state.page='users';state.selectedUserId=u.id;state.profileTab='contact';$('global-query').value='';host.hidden=true;render();};
  host.append(btn);
 }
 host.hidden=false;
}
$('global-query').addEventListener('input',renderGlobalResults);
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('global-query').focus();$('global-query').select();return;}
 if(e.key==='Escape'){if(!$('dialog-backdrop').hidden){closeDialog();return;}if(!$('add-menu').hidden){$('add-menu').hidden=true;return;}$('global-results').hidden=true;}
});
render();
})();
