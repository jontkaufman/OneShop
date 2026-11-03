import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read = (file) => readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('authenticated foundation shell imports shared styling and record adapter',()=>{
 const html=read('app/index.html'),main=read('app/main.mjs');
 assert.ok(html.includes('../styles/tokens.css'));
 assert.ok(html.includes('../styles/oneshop.css'));
 assert.ok(main.includes("from '../src/data/records-api.mjs'"));
 assert.ok(html.includes('Find a unit'));
 assert.ok(html.includes('Register new unit'));
});
test('app only accepts publishable configuration placeholders, not privileged service keys',()=>{
 const config=read('app/config.mjs'),main=read('app/main.mjs');
 assert.ok(config.includes('SUPABASE_PUBLISHABLE_KEY'));
 assert.equal(/service_role\s*[:=]\s*['"]/.test(config),false);
 assert.ok(main.includes('/auth/v1/token?grant_type=password'));
 assert.ok(main.includes('session=null'));
});
test('application module and config parse with Node',()=>{
 for(const path of ['app/main.mjs','app/config.mjs']){
  const r=spawnSync(process.execPath,['--check',new URL('../'+path,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
 }
});
