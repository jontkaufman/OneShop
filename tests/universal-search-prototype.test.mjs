import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('prototypes/unit-ro-quick-add.source.html');
const demo=read('prototypes/unit-ro-quick-add.js');
const controller=read('prototypes/universal-search-controller.js');
const built=read('prototypes/unit-ro-quick-add.html');

test('one global search in top navigation, without record type selectors',()=>{
 assert.ok(source.includes('id="global-search-input"'));
 assert.equal((source.match(/id="global-search-input"/g)||[]).length,1);
 assert.ok(!source.includes('id="lookup-form"'));
 assert.ok(!source.includes('id="search-kind"'));
 assert.ok(!source.includes('id="ro-id-kind"'));
 assert.ok(!source.includes('id="ro-id-value"'));
 assert.ok(source.includes('id="ro-open-global-search"'));
 assert.ok(source.includes('id="global-search-results"'));
});
test('search supports keyboard and global reuse for RO unit selection',()=>{
 assert.ok(controller.includes("e.key.toLowerCase()==='k'"));
 assert.ok(controller.includes("e.key==='ArrowDown'"));
 assert.ok(controller.includes("e.key==='Enter'"));
 assert.ok(controller.includes("openGlobalSearch('select_unit')"));
 assert.ok(controller.includes("selectROUnit(u)"));
 assert.ok(controller.includes('const typed='));
});
test('permissions must alter searchable documents, not only displayed labels',()=>{
 assert.ok(controller.includes('searchFieldGrants(effectivePermissions('));
 assert.ok(controller.includes("ROLE_TEMPLATES[role]"));
 assert.ok(demo.includes('/*__ONE_PERMISSION_DOMAIN__*/'));
 assert.ok(controller.includes('buildAuthorizedSearchDocuments('));
 assert.ok(controller.includes('searchAuthorizedDocuments('));
 assert.ok(demo.includes('searchRoles'));
 assert.ok(demo.includes("'recent-ro-section').hidden=!allowed"));
});
test('compiled standalone prototype inlines the real search policy and shared styling',()=>{
 assert.ok(source.includes('../styles/universal-search.css'));
 assert.ok(built.includes('function buildAuthorizedSearchDocuments('));
 assert.ok(built.includes('function searchAuthorizedDocuments('));
 assert.ok(built.includes('function renderGlobalSearch('));
 assert.ok(built.includes('.global-search-panel'));
 assert.ok(!built.includes('/*__ONE_SEARCH_DOMAIN__*/'));
 assert.ok(!built.includes('/*__ONE_PERMISSION_DOMAIN__*/'));
 assert.ok(built.includes('function searchFieldGrants('));
 assert.ok(!built.includes('/*__ONE_SEARCH_CONTROLLER__*/'));
 const script=built.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script));
});
