import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=file('prototypes/unit-ro-quick-add.js');
const source=file('prototypes/unit-ro-quick-add.source.html');
const built=file('prototypes/unit-ro-quick-add.html');

test('top Add menu contains Add Unit and Create RO',()=>{
 assert.ok(source.includes('id="add-button"'));
 assert.ok(source.includes('id="top-add-unit"'));
 assert.ok(source.includes('id="top-create-ro"'));
 assert.ok(source.includes('id="unit-save-ro"'));
});
test('RO form reuses the global unit finder and supports optional lines',()=>{
 assert.ok(source.includes('id="ro-open-global-search"'));
 assert.ok(!source.includes('id="ro-id-kind"'));
 assert.ok(!source.includes('id="search-kind"'));
 assert.ok(source.includes('id="ro-description"'));
 assert.ok(source.includes('id="add-ro-line"'));
 assert.ok(js.includes("function selectROUnit(u)"));
 assert.ok(js.includes("function saveRO()"));
 assert.ok(js.includes('if(!description)'));
});
test('existing unit owner and contact are supplied from selected demo unit',()=>{
 assert.ok(js.includes('function selectROUnit(u)'));
 assert.ok(js.includes('Current owner / account'));
 assert.ok(js.includes('u.phone'));
 assert.ok(js.includes('u.email'));
});
test('create RO preserves unit linkage and checks for duplicate RO number',()=>{
 assert.ok(js.includes('unitId:u.id'));
 assert.ok(js.includes('ros.some(r=>r.number.toLowerCase()===number.toLowerCase())'));
 assert.ok(js.includes("if(andRO){openModal('ro',{unitId:u.id})"));
});
test('prototype builds valid standalone HTML using shared tokens',()=>{
 assert.ok(source.includes('../styles/tokens.css'));
 assert.ok(source.includes('../styles/oneshop.css'));
 assert.ok(source.includes('../styles/unit-ro-quick-add.css'));
 assert.ok(built.includes('function saveRO()'));
 assert.doesNotThrow(()=>new Function(js));
 const check=spawnSync(process.execPath,['--check',new URL('../prototypes/unit-ro-quick-add.js',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});

test('demo permissions allow any staff unit creation but restrict RO action',()=>{
 assert.ok(js.includes("function canCreateRO()"));
 assert.ok(js.includes("['service_writer','foreman']"));
 assert.ok(js.includes("button.disabled=!allowed"));
 assert.ok(js.includes("if(mode==='ro'&&!canCreateRO())"));
 assert.ok(js.includes("$('unit-save').onclick=()=>saveUnit(false)"));
});
