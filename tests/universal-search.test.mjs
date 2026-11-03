import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAuthorizedSearchDocuments,searchAuthorizedDocuments,SEARCH_ENTITY_TITLES} from '../src/domain/universal-search.mjs';

const org='ORG-A',branch='B-1';
const data={
 units:[
  {id:'U-1',organization_id:org,year:'2022',make:'Grand Design',model:'Reflection',vin:'573FR3827N9924101',stock:'STK-001',customer:'Jordan Ellis',phone:'7075550169',email:'jordan@example.com',location:'SS-04'},
  {id:'U-2',organization_id:org,year:'2025',make:'Airstream',model:'Flying Cloud',vin:'5ZT2SRVB4SB087215',stock:'STK-0472',customer:'Morgan Lee',phone:'7075550182',email:'morgan@example.com',location:'PDI-02'},
  {id:'U-3',organization_id:'ORG-B',make:'Secret RV',vin:'SECRET-VIN',stock:'PRIVATE-123',customer:'Secret Person'}
 ],
 repairOrders:[
  {id:'R-1',organization_id:org,branch_id:branch,unitId:'U-1',number:'RO-10482',description:'Investigate freshwater pump noise',lines:['Pressure test']},
  {id:'R-2',organization_id:org,branch_id:'B-2',unitId:'U-2',number:'RO-OTHER',description:'Other branch warranty'},
  {id:'R-3',organization_id:'ORG-B',branch_id:branch,unitId:'U-3',number:'RO-PRIVATE',description:'secret'}
 ],
 customers:[
  {id:'Jordan Ellis',organization_id:org,name:'Jordan Ellis',phone:'7075550169',email:'jordan@example.com'},
  {id:'Morgan Lee',organization_id:org,name:'Morgan Lee',phone:'7075550182',email:'morgan@example.com'},
  {id:'Secret Person',organization_id:'ORG-B',name:'Secret Person',phone:'9999999999'}
 ]
};
const all={unitRead:true,stockRead:true,vinRead:true,locationRead:true,customerRead:true,contactRead:true,roRead:true,workRead:true};
const index=(grant=all)=>buildAuthorizedSearchDocuments(data,grant,{organizationId:org,branchId:branch});
const lookup=(q,grant=all)=>searchAuthorizedDocuments(index(grant),q);
test('one search discovers VIN, stock, RO, customer and work terms without type selector',()=>{
 for(const text of ['573FR3827N9924101','STK-001','RO-10482','Jordan','freshwater','24101']){
  assert.ok(lookup(text).length>0, 'No results for '+text);
 }
 assert.equal(lookup('RO-10482')[0].kind,'ro');
});
test('customer can match linked Unit and separate Customer result',()=>{
 const hits=lookup('Jordan');
 assert.ok(hits.some(x=>x.kind==='customer'));
 assert.ok(hits.some(x=>x.kind==='unit'&&x.unitId==='U-1'));
});
test('full stock/VIN exact match ranks higher than descriptive substring',()=>{
 assert.equal(lookup('STK-001')[0].kind,'unit');
 assert.equal(lookup('STK-001')[0].id,'U-1');
});
test('search supports multiple cross-record words and numeric VIN suffix',()=>{
 const hits=lookup('Jordan RO-10482');
 assert.ok(hits.some(x=>x.kind==='unit'&&x.id==='U-1'));
 assert.ok(lookup('24101').some(x=>x.id==='U-1'));
});
test('porter without customer or RO rights cannot discover their content',()=>{
 const porter={unitRead:true,stockRead:true,vinRead:true,locationRead:true,
  customerRead:false,contactRead:false,roRead:false,workRead:false};
 const docs=index(porter);
 assert.ok(!docs.some(x=>x.kind==='customer'||x.kind==='ro'));
 assert.equal(searchAuthorizedDocuments(docs,'Jordan').length,0);
 assert.equal(searchAuthorizedDocuments(docs,'RO-10482').length,0);
 assert.equal(searchAuthorizedDocuments(docs,'7075550169').length,0);
 assert.ok(searchAuthorizedDocuments(docs,'STK-001').some(x=>x.kind==='unit'));
});
test('without permission even unit VIN/stock do not match or appear in previews',()=>{
 const safe={unitRead:true,stockRead:false,vinRead:false,locationRead:false,
  customerRead:false,contactRead:false,roRead:false,workRead:false};
 const docs=index(safe);
 assert.equal(searchAuthorizedDocuments(docs,'573FR3827N9924101').length,0);
 assert.equal(searchAuthorizedDocuments(docs,'STK-001').length,0);
 assert.ok(!JSON.stringify(docs).includes('STK-001'));
 assert.ok(!JSON.stringify(docs).includes('573FR3827N9924101'));
 assert.ok(searchAuthorizedDocuments(docs,'Reflection').length>0);
});
test('no contact read means phone and email do not match even if customer name does',()=>{
 const g={...all,contactRead:false};
 const docs=index(g);
 assert.equal(searchAuthorizedDocuments(docs,'7075550169').length,0);
 assert.equal(searchAuthorizedDocuments(docs,'jordan@example.com').length,0);
 assert.ok(searchAuthorizedDocuments(docs,'Jordan').length>0);
});
test('work description is permission gated independently from RO visibility',()=>{
 const g={...all,workRead:false};
 assert.ok(lookup('RO-10482',g).length>0);
 assert.equal(lookup('freshwater',g).length,0);
});
test('cross-organization and other-branch ROs are omitted',()=>{
 const docs=index();
 assert.equal(searchAuthorizedDocuments(docs,'PRIVATE').length,0);
 assert.equal(searchAuthorizedDocuments(docs,'RO-OTHER').length,0);
 assert.ok(!JSON.stringify(docs).includes('Secret Person'));
});
test('partial text matches and case insensitive identifier normalization',()=>{
 assert.ok(lookup('stK001').some(x=>x.id==='U-1'));
 assert.ok(lookup('airstream').some(x=>x.id==='U-2'));
});
test('query requires at least two characters, supports long list limits',()=>{
 assert.equal(lookup('x').length,0);
 const result=searchAuthorizedDocuments(index(),'RO',{limit:1});
 assert.ok(result.length<=1);
 assert.deepEqual(Object.keys(SEARCH_ENTITY_TITLES).sort(),['customer','ro','unit']);
});
test('explicit grants are required before indexing',()=>{
 assert.throws(()=>buildAuthorizedSearchDocuments(data),/grants/);
 assert.deepEqual(searchAuthorizedDocuments([], 'Jordan'),[]);
});
