import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=load('prototypes/users-permissions.source.html');
const js=load('prototypes/users-permissions.js');
const compiled=load('prototypes/users-permissions.html');
test('Users page has profile sections contact, payroll, position, permissions',()=>{
 for(const label of ['contact','position','payroll','permissions','activity'])
  assert.ok(js.includes("'"+label+"'")||js.includes("profileTab:'"+label+"'"));
 assert.ok(source.includes('id="admin-content"'));
 assert.ok(source.includes('data-page="roles"'));
 assert.ok(source.includes('data-page="modules"'));
});
test('role CRUD uses templates, copy before edit, and safe archive semantics',()=>{
 for(const term of ['createRoleTemplate','updateRoleTemplate','archiveRoleTemplate','role.permissions','Assigned employees must be moved'])
  assert.ok(js.includes(term),'Missing '+term);
 assert.ok(js.includes('selectedRole()?.system'));
});
test('per-user exceptions distinguish allow, deny and inherit',()=>{
 assert.ok(js.includes("'inherit','Inherit'"));
 assert.ok(js.includes('mayAssignPermission'));
 assert.ok(js.includes('u.overrides[permission]'));
});
test('owner protection and confidential payroll tab are visible in source logic',()=>{
 assert.ok(js.includes('u.owner'));
 assert.ok(js.includes("allowed('payroll.read')"));
 assert.ok(js.includes("allowed('payroll.manage')"));
 assert.ok(js.includes('private table'));
});
test('basic/advanced module defaults come from shared domain registry',()=>{
 assert.ok(js.includes('defaultModuleSettings()'));
 assert.ok(js.includes('state.modules[key]'));
 assert.ok(compiled.includes('mobile_operations'));
 assert.ok(compiled.includes('insurance_warranty'));
});
test('standalone build includes shared theme and valid JS',()=>{
 assert.ok(source.includes('../styles/tokens.css'));
 assert.ok(source.includes('../styles/oneshop.css'));
 assert.ok(source.includes('../styles/users-permissions.css'));
 const script=compiled.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.ok(script.includes('function effectivePermissions('));
 assert.ok(!script.includes('/*__PERMISSIONS_DOMAIN__*/'));
 assert.doesNotThrow(()=>new Function(script));
 const node=spawnSync(process.execPath,['--check',new URL('../prototypes/users-permissions.js',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(node.status,0,node.stderr);
});
