import test from 'node:test';
import assert from 'node:assert/strict';
import {matchUnitsByExactIdentifier,normalizeRODraft} from '../src/domain/ro-quick-add.mjs';
const records=[
 {id:'U-001',vin:'ABC123456',stock_number:'STK-100',make:'Airstream',model:'Flying Cloud'},
 {id:'U-002',vin:'DEF234567',stock_number:'STK-200',make:'Airstream',model:'Flying Cloud'},
 {id:'U-003',vin:'ABC123456',stock_number:'STK-300',make:'Winnebago',model:'View'}
];
test('stock search returns one exact Unit candidate',()=>{
 assert.deepEqual(matchUnitsByExactIdentifier(records,'stock_number',' stk-200 ').map(x=>x.id),['U-002']);
});
test('VIN matches duplicates without choosing a random unit',()=>{
 assert.deepEqual(matchUnitsByExactIdentifier(records,'vin','abc123456').map(x=>x.id),['U-001','U-003']);
});
test('stable internal Unit ID supports RO attachment',()=>{
 assert.deepEqual(matchUnitsByExactIdentifier(records,'unit_id','u-003').map(x=>x.id),['U-003']);
});
test('make and model are explicitly not unique lookup identifiers',()=>{
 assert.throws(()=>matchUnitsByExactIdentifier(records,'make','Airstream'),/not unique/);
 assert.throws(()=>matchUnitsByExactIdentifier(records,'model','Flying Cloud'),/not unique/);
});
test('identifier searches do not fuzzy-match partial values',()=>{
 assert.deepEqual(matchUnitsByExactIdentifier(records,'vin','234567'),[]);
});
test('draft RO requires work description, permits zero line items',()=>{
 const draft=normalizeRODraft({unitId:'U-001',number:null,description:' Diagnose water pump '});
 assert.equal(draft.workDescription,'Diagnose water pump');
 assert.deepEqual(draft.lines,[]);
 assert.equal(draft.proposedRoNumber,null);
 assert.equal(draft.status,'draft');
});
test('user-entered RO number is preserved for server-side uniqueness verification',()=>{
 const draft=normalizeRODraft({unitId:'U-002',number:' INV-PDI-123 ',description:'Check new inventory',lineItems:['Inspect furnace','','Check seals']});
 assert.equal(draft.proposedRoNumber,'INV-PDI-123');
 assert.deepEqual(draft.lines,['Inspect furnace','Check seals']);
});
test('missing Unit or empty description is rejected',()=>{
 assert.throws(()=>normalizeRODraft({unitId:'',description:'Prep'}),/Unit ID/);
 assert.throws(()=>normalizeRODraft({unitId:'U-001',description:' '}),/description is required/);
});
test('overlong manual number, description or line rejected',()=>{
 assert.throws(()=>normalizeRODraft({unitId:'U-001',number:'X'.repeat(61),description:'Prep'}),/1–60/);
 assert.throws(()=>normalizeRODraft({unitId:'U-001',description:'X'.repeat(2001)}),/max 2000/);
 assert.throws(()=>normalizeRODraft({unitId:'U-001',description:'Prep',lineItems:['X'.repeat(301)]}),/300/);
});
