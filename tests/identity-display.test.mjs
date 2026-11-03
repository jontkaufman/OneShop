import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DEFAULT_IDENTIFIER_PROFILES, displayIdentifiers, resolveIdentifierProfile,
 validateIdentifierProfile, identifierValue, IDENTIFIER_FIELDS
} from '../src/domain/identity-display.mjs';
const record={
 customerName:'Taylor Jordan',
 roNumbers:['RO-100','RO-200'],
 roNumber:'RO-200',
 unit:{unitId:'U-42',vin:'1FDXE45S23HA123456',stockNumber:'STK-0442',year:'2025',make:'Airstream',model:'Flying Cloud'}
};
const all=Object.keys(IDENTIFIER_FIELDS);
const disp=(role,extra={})=>displayIdentifiers({role,record,allowedFields:all,...extra});

test('service writer sees customer then relevant RO',()=>{
 const p=disp('service_writer');
 assert.equal(p.primary.value,'Taylor Jordan');
 assert.equal(p.secondary.value,'RO-200');
});
test('technician sees RO and VIN suffix',()=>{
 const p=disp('technician');
 assert.equal(p.primary.value,'RO-200');
 assert.equal(p.secondary.value,'123456');
});
test('porter sees stock and VIN',()=>{
 const p=disp('porter');
 assert.equal(p.primary.value,'STK-0442');
 assert.equal(p.secondary.value,'123456');
});
test('sales sees stock then recognizable model',()=>{
 const p=disp('sales');
 assert.equal(p.primary.value,'STK-0442');
 assert.equal(p.secondary.value,'2025 Airstream Flying Cloud');
});
test('no stock number gracefully falls back to VIN and unit ID',()=>{
 const p=disp('porter',{record:{...record,unit:{...record.unit,stockNumber:''}}});
 assert.equal(p.primary.field,'vin_last6');
 assert.equal(p.secondary.field,'unit_id');
});
test('multiple ROs without active RO never picks a random RO',()=>{
 const p=disp('technician',{record:{...record,roNumber:''}});
 assert.equal(p.primary.field,'vin_last6');
 assert.equal(p.secondary.field,'stock_number');
});
test('without authorized customer or full VIN, neither appears',()=>{
 const p=disp('service_writer',{profile:{primary:'customer_name',secondary:'vin_full'},allowedFields:['stock_number','unit_id']});
 assert.equal(p.primary.field,'stock_number');
 assert.equal(p.secondary.field,'unit_id');
});
test('unit reference can show if no other authorized identifier available',()=>{
 const p=disp('porter',{record:{unit:{unitId:'U-42',vin:'',stockNumber:''}},allowedFields:['unit_id']});
 assert.equal(p.primary.value,'U-42');
 assert.equal(p.secondary,null);
});
test('empty record returns explicit needs-disambiguation, not invented data',()=>{
 const p=disp('porter',{record:{unit:{}},allowedFields:all});
 assert.equal(p.needsDisambiguation,true);
 assert.equal(p.primary,null);
});
test('custom branch profile overrides org and defaults, role remains selectable',()=>{
 const profile={primary:'vin_full',secondary:'stock_number'};
 const picked=resolveIdentifierProfile('sales',{sales:profile},{sales:{primary:'ro_number',secondary:'stock_number'}});
 assert.deepEqual(picked,profile);
});
test('organization override applies when branch has no override',()=>{
 const p=resolveIdentifierProfile('sales',{}, {sales:{primary:'vin_last6',secondary:'year_make_model'}});
 assert.equal(p.primary,'vin_last6');
});
test('invalid profile returns default and rejects duplicate primary secondary',()=>{
 assert.equal(validateIdentifierProfile({primary:'ro_number',secondary:'ro_number'}).ok,false);
 assert.equal(validateIdentifierProfile({primary:'made_up',secondary:'none'}).ok,false);
 assert.deepEqual(resolveIdentifierProfile('porter',{porter:{primary:'ro_number',secondary:'ro_number'}}),DEFAULT_IDENTIFIER_PROFILES.porter);
});
test('missing allow-list is not silently treated as unrestricted access',()=>{
 assert.throws(()=>displayIdentifiers({role:'porter',record}),/authorized identifier fields/);
});
test('nonexistent RO is not fabricated and may use other fields',()=>{
 assert.equal(identifierValue('ro_number',{roNumbers:[]}), '');
 const p=disp('service_writer',{record:{...record,roNumber:'',roNumbers:[]}});
 assert.equal(p.primary.value,'Taylor Jordan');
 assert.equal(p.secondary.field,'vin_last6');
});
test('secondary none is a valid configuration, with fallback used only when primary missing',()=>{
 assert.equal(validateIdentifierProfile({primary:'stock_number',secondary:'none'}).ok,true);
 const p=disp('sales',{profile:{primary:'stock_number',secondary:'none'},fallbackFields:[]});
 assert.equal(p.primary.value,'STK-0442');
 assert.equal(p.secondary,null);
});
