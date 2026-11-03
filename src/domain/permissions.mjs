/**
 * OneShop cross-platform permissions contract (pure functions).
 * The DB must enforce these decisions independently: no frontend permission
 * checker is an authorization boundary.
 */
export const MODULES = Object.freeze({
  schedule_checkin:{label:'Schedule & Check-In',tier:'basic',defaultEnabled:true},
  inspections:{label:'Inspections',tier:'basic',defaultEnabled:true},
  unit_management:{label:'Unit Management',tier:'basic',defaultEnabled:true},
  ro_management:{label:'Repair Orders',tier:'basic',defaultEnabled:true},
  followups:{label:'Follow-Ups',tier:'basic',defaultEnabled:true},
  financials:{label:'Financials',tier:'basic',defaultEnabled:true},
  customers:{label:'Customers',tier:'basic',defaultEnabled:true},
  reporting:{label:'Reporting',tier:'basic',defaultEnabled:true},
  mobile_operations:{label:'Mobile Operations',tier:'advanced',defaultEnabled:false},
  insurance_warranty:{label:'Insurance & Warranty',tier:'advanced',defaultEnabled:false},
  marketing_automation:{label:'Marketing Automation',tier:'advanced',defaultEnabled:false},
  advanced_analytics:{label:'Advanced Analytics',tier:'advanced',defaultEnabled:false},
  integrations:{label:'Integrations & API',tier:'advanced',defaultEnabled:false},
});
export const PERMISSIONS = Object.freeze({
  'users.read':{module:null,label:'View employee directory'},
  'users.create':{module:null,label:'Invite employees'},
  'users.update':{module:null,label:'Edit employee profiles'},
  'users.deactivate':{module:null,label:'Deactivate accounts'},
  'roles.read':{module:null,label:'View role templates'},
  'roles.manage':{module:null,label:'Create and edit role templates'},
  'positions.manage':{module:null,label:'Manage job positions'},
  'permissions.assign':{module:null,label:'Assign roles and overrides'},
  'modules.manage':{module:null,label:'Enable and configure modules'},
  'audit.read':{module:null,label:'View security audit history'},
  'payroll.read':{module:'financials',label:'View payroll data',sensitive:true},
  'payroll.manage':{module:'financials',label:'Edit pay and employment costs',sensitive:true},
  'finance.read':{module:'financials',label:'View financial information',sensitive:true},
  'finance.manage':{module:'financials',label:'Manage financial records',sensitive:true},
  'schedule.read':{module:'schedule_checkin',label:'View schedule'},
  'schedule.manage':{module:'schedule_checkin',label:'Edit schedule'},
  'checkin.create':{module:'schedule_checkin',label:'Perform check-in'},
  'inspection.read':{module:'inspections',label:'View inspections'},
  'inspection.create':{module:'inspections',label:'Create inspections'},
  'inspection.update':{module:'inspections',label:'Edit inspections'},
  'unit.read':{module:'unit_management',label:'View units'},
  'unit.vin.read':{module:'unit_management',label:'Search and view VIN'},
  'unit.stock.read':{module:'unit_management',label:'Search and view stock number'},
  'unit.create':{module:'unit_management',label:'Register units'},
  'unit.update':{module:'unit_management',label:'Edit unit records'},
  'unit.move.request':{module:'unit_management',label:'Request moves'},
  'unit.move.claim':{module:'unit_management',label:'Claim moves'},
  'unit.move.deliver':{module:'unit_management',label:'Confirm delivery'},
  'unit.location.read':{module:'unit_management',label:'View unit locations'},
  'ro.read':{module:'ro_management',label:'View repair orders'},
  'ro.work.read':{module:'ro_management',label:'Search RO work descriptions'},
  'ro.create':{module:'ro_management',label:'Create repair orders'},
  'ro.update':{module:'ro_management',label:'Edit repair orders'},
  'ro.assign':{module:'ro_management',label:'Assign RO work'},
  'ro.number.override':{module:'ro_management',label:'Override assigned RO number'},
  'followup.read':{module:'followups',label:'View follow-ups'},
  'followup.manage':{module:'followups',label:'Manage follow-ups'},
  'customer.read':{module:'customers',label:'View customers'},
  'customer.contact.read':{module:'customers',label:'View customer contact details',sensitive:true},
  'customer.manage':{module:'customers',label:'Edit customers'},
  'reports.read':{module:'reporting',label:'View reports'},
  'mobile.use':{module:'mobile_operations',label:'Use mobile operations'},
  'warranty.read':{module:'insurance_warranty',label:'View warranty and insurance'},
  'warranty.manage':{module:'insurance_warranty',label:'Manage claims'},
  'marketing.manage':{module:'marketing_automation',label:'Manage campaigns'},
  'analytics.advanced.read':{module:'advanced_analytics',label:'View advanced analytics'},
  'integrations.manage':{module:'integrations',label:'Manage integrations'},
});
const keys = (...items)=>items;
export const ROLE_TEMPLATES = Object.freeze({
  administrator:{label:'Administrator',permissions:keys(
    'users.read','users.create','users.update','users.deactivate','roles.read','roles.manage',
    'positions.manage','permissions.assign','modules.manage','audit.read',
    'schedule.read','schedule.manage','checkin.create','inspection.read','inspection.create','inspection.update',
    'unit.read','unit.vin.read','unit.stock.read','unit.create','unit.update','unit.move.request','unit.move.claim','unit.move.deliver','unit.location.read',
    'ro.read','ro.work.read','ro.create','ro.update','ro.assign','ro.number.override',
    'followup.read','followup.manage','customer.read','customer.contact.read','customer.manage','reports.read',
    'finance.read','finance.manage')},
  service_writer:{label:'Service Writer',permissions:keys('schedule.read','schedule.manage','checkin.create','unit.read','unit.vin.read','unit.stock.read','unit.create','unit.update','unit.move.request','unit.location.read','ro.read','ro.work.read','ro.create','ro.update','ro.number.override','inspection.read','customer.read','customer.contact.read','customer.manage','followup.read','followup.manage')},
  porter:{label:'Porter',permissions:keys('schedule.read','unit.read','unit.vin.read','unit.stock.read','unit.create','unit.move.claim','unit.move.deliver','unit.location.read')},
  technician:{label:'Technician',permissions:keys('schedule.read','unit.read','unit.vin.read','unit.stock.read','unit.create','unit.location.read','ro.read','ro.work.read','inspection.read','inspection.create','inspection.update')},
  foreman:{label:'Foreman',permissions:keys('schedule.read','checkin.create','unit.read','unit.vin.read','unit.stock.read','unit.create','unit.move.request','unit.location.read','ro.read','ro.work.read','ro.create','ro.update','ro.assign','inspection.read','reports.read')},
  sales:{label:'Sales',permissions:keys('unit.read','unit.vin.read','unit.stock.read','unit.create','customer.read','customer.contact.read','ro.read')},
  parts:{label:'Parts',permissions:keys('unit.read','unit.vin.read','unit.stock.read','unit.create','unit.location.read','ro.read','ro.work.read')},
  pdi:{label:'PDI',permissions:keys('unit.read','unit.vin.read','unit.stock.read','unit.create','unit.move.request','unit.location.read','ro.read','ro.work.read','inspection.read','inspection.create')},
  finance_manager:{label:'Finance Manager',permissions:keys('finance.read','finance.manage','payroll.read','payroll.manage','reports.read','ro.read','users.read')},
});
const isText=(x)=>typeof x==='string'&&x.trim().length>0;
export function validateRoleTemplate(role){
 if(!role||!isText(role.id)||!isText(role.label))throw new Error('Role ID and label required');
 if(!Array.isArray(role.permissions)||new Set(role.permissions).size!==role.permissions.length)throw new Error('Unique permissions required');
 for(const p of role.permissions)if(!Object.hasOwn(PERMISSIONS,p))throw new Error('Unrecognized permission: '+p);
 return {id:role.id,label:role.label.trim(),permissions:[...role.permissions],archived:Boolean(role.archived),system:Boolean(role.system)};
}
export function createRoleTemplate(input,existing=[]){
 const role=validateRoleTemplate({...input,archived:false,system:false});
 if(existing.some(r=>r.id===role.id))throw new Error('Role ID already exists');
 if(role.id==='owner')throw new Error('Owner authority is not a custom role');
 return role;
}
export function updateRoleTemplate(current,patch){
 if(current?.system)throw new Error('System role cannot be directly edited');
 if(!current||current.archived)throw new Error('Role missing or archived');
 return validateRoleTemplate({...current,...patch,id:current.id});
}
export function archiveRoleTemplate(role,{assignedUsers=0}={}){
 if(!role||role.system||role.id==='owner')throw new Error('Protected system role');
 if(assignedUsers>0)throw new Error('Reassign employees before archiving this role');
 return {...role,archived:true};
}
export function defaultModuleSettings(){
 return Object.fromEntries(Object.entries(MODULES).map(([key,value])=>[key,value.defaultEnabled]));
}
export function effectivePermissions({active=true,isOwner=false,roles=[],overrides={},modules=defaultModuleSettings()}={}){
 if(!active)return {allowed:[],denied:Object.keys(PERMISSIONS),sources:{},modules:{...modules}};
 const base=new Set();
 for(const role of roles){
  if(!role||role.archived)continue;
  for(const p of role.permissions||[])if(Object.hasOwn(PERMISSIONS,p))base.add(p);
 }
 const granted=[],denied=[],sources={};
 for(const [key,metadata] of Object.entries(PERMISSIONS)){
  const moduleActive=!metadata.module||modules[metadata.module]===true;
  let permitted=isOwner||base.has(key);
  let source=isOwner?'Owner':base.has(key)?'Role template':'Not granted';
  // A per-user override has three states: inherit, allow, deny.
  // Owner is not downgraded by user overrides; manage owner through protected ownership workflow.
  if(!isOwner && (overrides[key]==='allow'||overrides[key]==='deny')){
   permitted=overrides[key]==='allow';source='User '+overrides[key];
  }
  if(!moduleActive){permitted=false;source='Module disabled';}
  (permitted?granted:denied).push(key);sources[key]=source;
 }
 return {allowed:granted,denied,sources,modules:{...modules}};
}
export function hasPermission(access,key){return !!access&&access.allowed?.includes(key)===true;}
export function mayAssignPermission({actorAccess,actorIsOwner=false,targetIsSelf=false,permission,mode}){
 if(!Object.hasOwn(PERMISSIONS,permission))return false;
 if(!['allow','deny','inherit'].includes(mode))return false;
 if(!hasPermission(actorAccess,'permissions.assign'))return false;
 if(targetIsSelf)return false;
 // No delegated admin may grant permissions the admin does not possess.
 if(mode==='allow'&&!actorIsOwner&&!hasPermission(actorAccess,permission))return false;
 const sensitiveManager=permission.startsWith('payroll.')?'payroll.manage'
  :permission.startsWith('finance.')?'finance.manage'
  :permission==='customer.contact.read'?'customer.manage':null;
 if(PERMISSIONS[permission].sensitive&&mode==='allow'&&!actorIsOwner
    &&sensitiveManager&&!hasPermission(actorAccess,sensitiveManager))return false;
 return true;
}
/** Use the same effective access for universal search and module page gating. */
export function searchFieldGrants(access){
 return {
  unitRead:hasPermission(access,'unit.read'),
  vinRead:hasPermission(access,'unit.vin.read'),
  stockRead:hasPermission(access,'unit.stock.read'),
  locationRead:hasPermission(access,'unit.location.read'),
  customerRead:hasPermission(access,'customer.read'),
  contactRead:hasPermission(access,'customer.contact.read'),
  roRead:hasPermission(access,'ro.read'),
  workRead:hasPermission(access,'ro.work.read')
 };
}
export function visibleModules(access){
 return Object.entries(MODULES).filter(([key])=>access?.modules?.[key]===true)
   .map(([key,meta])=>({key,...meta}));
}
