import test from 'node:test';
import assert from 'node:assert/strict';
import {OneShopRecordsAPI,RecordsAPIError} from '../src/data/records-api.mjs';

const org='11111111-1111-4111-8111-111111111111';
const branch='22222222-2222-4222-8222-222222222222';
const unit='33333333-3333-4333-8333-333333333333';
function harness({accessToken='staff-session',body=[],status=200}={}) {
 const calls=[];
 const api=new OneShopRecordsAPI({
  url:'https://example.supabase.co',publishableKey:'publishable-test',
  getAccessToken:async()=>accessToken,
  fetchImpl:async (url,config)=> {
   calls.push({url:new URL(url),config});
   return {ok:status<400,status,json:async()=>body};
  }
 });
 return {api,calls};
}
test('authenticated VIN search stays organization-scoped and exact',async()=>{
 const {api,calls}=harness();
 await api.searchUnits(org,{vin:'1FDXE45S12HA123456'});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url.pathname,'/rest/v1/units');
 assert.equal(calls[0].url.searchParams.get('organization_id'),'eq.'+org);
 assert.equal(calls[0].url.searchParams.get('vin'),'eq.1FDXE45S12HA123456');
 assert.equal(calls[0].config.headers.Authorization,'Bearer staff-session');
 assert.equal(calls[0].config.headers.apikey,'publishable-test');
});
test('stock-only identity search is supported',async()=>{
 const {api,calls}=harness();
 await api.searchUnits(org,{stockNumber:'STK-0041'});
 assert.equal(calls[0].url.searchParams.get('stock_number'),'eq.STK-0041');
 assert.equal(calls[0].url.searchParams.has('vin'),false);
});
test('new unit registration allows stock number without VIN, drops unapproved fields',async()=>{
 const {api,calls}=harness();
 await api.createUnit(org,{unit_kind:'rv',stock_number:' INV-100 ',customer_id:'injected',organization_id:'evil',status:'delivered'});
 const payload=JSON.parse(calls[0].config.body);
 assert.deepEqual(payload,{organization_id:org,unit_kind:'rv',stock_number:'INV-100'});
 assert.equal(calls[0].config.method,'POST');
});
test('unit creation requires an identifying VIN or stock number',async()=>{
 const {api,calls}=harness();
 await assert.rejects(api.createUnit(org,{vin:' ',stock_number:''}),/requires VIN or stock/);
 assert.equal(calls.length,0);
});
test('unauthenticated session cannot query',async()=>{
 const {api,calls}=harness({accessToken:''});
 await assert.rejects(api.searchUnits(org,{vin:'123456'}),x=>x instanceof RecordsAPIError&&x.status===401);
 assert.equal(calls.length,0);
});
test('rejects unsafe/non-UUID tenant filters before fetch',async()=>{
 const {api,calls}=harness();
 await assert.rejects(api.listBranches('bad-tenant'),/UUID/);
 assert.equal(calls.length,0);
});
test('list customer unit references without inventing current ownership',async()=>{
 const {api,calls}=harness();
 await api.listCustomerUnits(org,unit);
 assert.equal(calls[0].url.searchParams.get('customer_id'),'eq.'+unit);
 assert.ok(calls[0].url.searchParams.get('select').includes('valid_to'));
});
test('read ROs and lines in the branch plus unit scope',async()=>{
 const {api,calls}=harness();
 await api.listRepairOrders(org,branch,unit);
 await api.getLineItems(org,branch,unit);
 assert.equal(calls[0].url.searchParams.get('branch_id'),'eq.'+branch);
 assert.equal(calls[0].url.searchParams.get('unit_id'),'eq.'+unit);
 assert.equal(calls[1].url.searchParams.get('repair_order_id'),'eq.'+unit);
});
test('denied request surfaces DB access failure',async()=>{
 const {api}=harness({status:403,body:{message:'RLS policy denied'}});
 await assert.rejects(api.searchUnits(org,{stockNumber:'STK-04'}),x=>x.status===403);
});
test('API never exposes privileged member writes or fabricated movement commands',()=>{
 const {api}=harness();
 assert.equal('createMembership' in api,false);
 assert.equal('checkin' in api,false);
 assert.equal('confirmDelivery' in api,false);
});
