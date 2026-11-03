import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../prototypes/service-writer-intake.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test('offline prototype contains compiled shared role policy and UI',()=>{
 assert.ok(script,'expected inline JS in standalone prototype');
 assert.ok(script.includes('function roleIdentifierSettingsView()'));
 assert.ok(script.includes('function displayIdentifiers('));
 assert.ok(html.includes('Unit Identification</button>'));
 assert.ok(html.includes('.identifier-config-grid'));
 assert.ok(!html.includes('/*__IDENTITY_POLICY__*/'));
 assert.ok(!html.includes('/*__IDENTITY_UI__*/'));
});

test('standalone prototype script parses as JavaScript',()=>{
 assert.doesNotThrow(()=>new Function(script));
});
