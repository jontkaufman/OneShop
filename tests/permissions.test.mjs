import test from 'node:test';
import assert from 'node:assert/strict';
import {MODULES,PERMISSIONS,ROLE_TEMPLATES,effectivePermissions,defaultModuleSettings,hasPermission,createRoleTemplate,updateRoleTemplate,archiveRoleTemplate,mayAssignPermission,visibleModules,searchFieldGrants} from '../src/domain/permissions.mjs';
const roles = (key)=>[{id:key,...ROLE_TEMPLATES[key]}];
test('new dealership has core enabled, advanced disabled',()=>{
 const state=defaultModuleSettings();
 for(const [id,m] of Object.entries(MODULES))assert.equal(state[id],m.tier==='basic');
});
test('owner full administrative permissions but disabled advanced features remain off',()=>{
 const owner=effectivePermissions({isOwner:true});
 assert.equal(hasPermission(owner,'roles.manage'),true);
 assert.equal(hasPermission(owner,'payroll.manage'),true);
 assert.equal(hasPermission(owner,'warranty.manage'),false);
 assert.equal(owner.sources['warranty.manage'],'Module disabled');
});
test('porter has restricted unit access, no customer or RO or payroll',()=>{
 const result=effectivePermissions({roles:roles('porter')});
 assert.equal(hasPermission(result,'unit.read'),true);
 assert.equal(hasPermission(result,'unit.move.claim'),true);
 for(const p of ['ro.read','customer.read','customer.contact.read','payroll.read','permissions.assign'])assert.equal(hasPermission(result,p),false);
});
test('finance manager has confidential payroll but cannot manage user permissions',()=>{
 const a=effectivePermissions({roles:roles('finance_manager')});
 assert.equal(hasPermission(a,'payroll.read'),true);
 assert.equal(hasPermission(a,'permissions.assign'),false);
});
test('user allow/deny/inherit overrides correctly alter template grants',()=>{
 const role=roles('service_writer');
 const overrides={'ro.create':'deny','unit.move.deliver':'allow'};
 const a=effectivePermissions({roles:role,overrides});
 assert.equal(hasPermission(a,'ro.create'),false);
 assert.equal(hasPermission(a,'unit.move.deliver'),true);
 assert.equal(a.sources['ro.create'],'User deny');
 assert.equal(hasPermission(effectivePermissions({roles:role,overrides:{'ro.create':'inherit'}}),'ro.create'),true);
});
test('disabled module supersedes explicit per-user allow',()=>{
 const a=effectivePermissions({roles:roles('porter'),overrides:{'warranty.manage':'allow'},modules:defaultModuleSettings()});
 assert.equal(hasPermission(a,'warranty.manage'),false);
});
test('inactive account has no permissions even if owner',()=>{
 const a=effectivePermissions({isOwner:true,active:false});
 assert.equal(a.allowed.length,0);
});
test('roles can be created and edited but cannot include unknown capability',()=>{
 const r=createRoleTemplate({id:'lot_lead',label:'Lot Lead',permissions:['unit.read','unit.move.request']});
 assert.equal(r.system,false);
 const u=updateRoleTemplate(r,{label:'Lot Supervisor',permissions:['unit.read','unit.move.request','unit.move.claim']});
 assert.equal(u.label,'Lot Supervisor');
 assert.throws(()=>createRoleTemplate({id:'bad',label:'Invalid',permissions:['postgres.superuser']}),/Unrecognized/);
 assert.throws(()=>createRoleTemplate({id:'owner',label:'Owner',permissions:[]}),/Owner authority/);
});
test('system roles cannot be edited or archived; assigned roles cannot be deleted',()=>{
 assert.throws(()=>updateRoleTemplate({id:'porter',system:true}, {label:'xyz'}),/cannot/);
 assert.throws(()=>archiveRoleTemplate({id:'owner',system:true}),/Protected/);
 assert.throws(()=>archiveRoleTemplate({id:'porter',system:false},{assignedUsers:1}),/Reassign/);
 assert.equal(archiveRoleTemplate({id:'custom',label:'Custom',system:false},{assignedUsers:0}).archived,true);
});
test('users cannot grant themselves access or delegate privileges they lack',()=>{
 const admin=effectivePermissions({roles:roles('administrator')});
 assert.equal(mayAssignPermission({actorAccess:admin,permission:'ro.create',mode:'allow',targetIsSelf:true}),false);
 assert.equal(mayAssignPermission({actorAccess:admin,permission:'warranty.manage',mode:'allow'}),false);
 assert.equal(mayAssignPermission({actorAccess:admin,permission:'payroll.read',mode:'allow'}),false);
 assert.equal(mayAssignPermission({actorAccess:admin,permission:'finance.read',mode:'allow'}),true);
 assert.equal(mayAssignPermission({actorAccess:admin,permission:'customer.contact.read',mode:'allow'}),true);
 assert.equal(mayAssignPermission({actorAccess:admin,permission:'ro.create',mode:'allow'}),true);
});
test('owner may override sensitive grants to others, not change own grants',()=>{
 const a=effectivePermissions({isOwner:true,modules:{...defaultModuleSettings(),insurance_warranty:true}});
 assert.equal(mayAssignPermission({actorAccess:a,actorIsOwner:true,permission:'payroll.read',mode:'allow'}),true);
 assert.equal(mayAssignPermission({actorAccess:a,actorIsOwner:true,permission:'payroll.read',mode:'deny',targetIsSelf:true}),false);
});
test('visible module list omits advanced by default',()=>{
 const mods=visibleModules(effectivePermissions({isOwner:true}));
 assert.ok(mods.every(m=>m.tier==='basic'));
 assert.ok(mods.some(m=>m.key==='financials'));
});
test('registered permission registry has stable module references',()=>{
 for(const p of Object.values(PERMISSIONS))assert.ok(p.module===null || Object.hasOwn(MODULES,p.module));
});

test('universal search derives from the same permission template and overrides',()=>{
 const porter=effectivePermissions({roles:roles('porter')});
 const fields=searchFieldGrants(porter);
 assert.equal(fields.unitRead,true);
 assert.equal(fields.vinRead,true);
 assert.equal(fields.stockRead,true);
 assert.equal(fields.roRead,false);
 assert.equal(fields.customerRead,false);
 const writer=effectivePermissions({roles:roles('service_writer'),overrides:{'unit.vin.read':'deny','ro.work.read':'deny'}});
 const writerFields=searchFieldGrants(writer);
 assert.equal(writerFields.customerRead,true);
 assert.equal(writerFields.roRead,true);
 assert.equal(writerFields.vinRead,false);
 assert.equal(writerFields.workRead,false);
});
