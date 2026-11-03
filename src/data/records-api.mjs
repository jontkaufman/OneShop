/**
 * OneShop authenticated Supabase Data API adapter for the Module 01 records slice.
 * No browser/service-role secret is stored here. A caller supplies an authenticated
 * user's access token and a publishable key from trusted environment configuration.
 * RLS and tenant-scoped foreign keys are the authorization boundary.
 *
 * IMPORTANT: This adapter does not create visits, events, movements or change
 * RO/line status. Those require trusted transactional commands in Module 02+.
 */

const identifierKeys = Object.freeze(['vin','stock_number']);
const isUUID = value => typeof value === 'string'
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const assertUUID = (value,label) => {
  if (!isUUID(value)) throw new Error(label+' must be a UUID');
};
const trimmed = value => typeof value === 'string' ? value.trim() : '';
function ensureIdentifier(unit) {
  if (!trimmed(unit.vin) && !trimmed(unit.stock_number)) {
    throw new Error('Unit requires VIN or stock number');
  }
}
function pagination(count) {
  return Math.max(1,Math.min(50,Number.isInteger(count)?count:20));
}

export class RecordsAPIError extends Error {
  constructor(status, message) { super(message); this.name='RecordsAPIError'; this.status=status; }
}
export class OneShopRecordsAPI {
  constructor({url,publishableKey,getAccessToken,fetchImpl=fetch}) {
    if (!/^https:\/\/[^/]+$/i.test(url??'')) throw new Error('Provide an HTTPS Supabase project URL');
    if (!trimmed(publishableKey)) throw new Error('Missing publishable key');
    if (typeof getAccessToken !== 'function') throw new Error('Missing session token provider');
    if (typeof fetchImpl !== 'function') throw new Error('Missing fetch implementation');
    this.base=url+'/rest/v1';
    this.publishableKey=publishableKey;
    this.getAccessToken=getAccessToken;
    this.fetchImpl=fetchImpl;
  }
  async request(table,{method='GET',filters={},fields='*',body=null,limit=20,single=false}={}) {
    if (!/^[a-z_]+$/.test(table)) throw new Error('Invalid table');
    const token=await this.getAccessToken();
    if (!trimmed(token)) throw new RecordsAPIError(401,'Sign in required');
    const u=new URL(this.base+'/'+table);
    if (method==='GET') {
      u.searchParams.set('select',fields);
      for (const [k,v] of Object.entries(filters)) {
        if (!/^[a-z_]+$/.test(k)) throw new Error('Invalid filter');
        u.searchParams.set(k,'eq.'+String(v));
      }
      u.searchParams.set('limit',String(pagination(limit)));
    }
    const headers={apikey:this.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'};
    if (method!=='GET') {headers['Content-Type']='application/json';headers.Prefer='return=representation';}
    if(single)headers.Accept='application/vnd.pgrst.object+json';
    const response=await this.fetchImpl(u.href,{method,headers,body:body==null?undefined:JSON.stringify(body)});
    if(!response.ok) {
      let detail='';
      try{const data=await response.json();detail=typeof data.message==='string'?data.message:'';}catch{}
      throw new RecordsAPIError(response.status,detail||'Unable to retrieve OneShop record');
    }
    return response.status===204?null:response.json();
  }
  async listBranches(organizationId) {
    assertUUID(organizationId,'Organization');
    return this.request('branches',{filters:{organization_id:organizationId},fields:'id,organization_id,name,code,time_zone'});
  }
  async searchUnits(organizationId,{vin='',stockNumber=''}={}) {
    assertUUID(organizationId,'Organization');
    const key=trimmed(vin)?'vin':trimmed(stockNumber)?'stock_number':null;
    if(!key)throw new Error('Enter VIN or stock number to find a unit');
    return this.request('units',{filters:{organization_id:organizationId,[key]:key==='vin'?trimmed(vin):trimmed(stockNumber)},
      fields:'id,organization_id,unit_kind,vin,stock_number,year,make,model',limit:20});
  }
  async createUnit(organizationId,unit) {
    assertUUID(organizationId,'Organization');ensureIdentifier(unit);
    // Do not include requester-controlled privilege/state columns.
    const allowed={organization_id:organizationId,unit_kind:unit.unit_kind==='vehicle'?'vehicle':'rv'};
    for(const k of [...identifierKeys,'make','model'])if(trimmed(unit[k]))allowed[k]=trimmed(unit[k]);
    if(Number.isInteger(unit.year))allowed.year=unit.year;
    return this.request('units',{method:'POST',body:allowed});
  }
  async createCustomer(organizationId,{displayName,accountType='person'}={}) {
    assertUUID(organizationId,'Organization');
    if(!trimmed(displayName))throw new Error('Customer name required');
    if(!['person','business','internal'].includes(accountType))throw new Error('Unsupported account type');
    return this.request('customers',{method:'POST',body:{organization_id:organizationId,display_name:trimmed(displayName),account_type:accountType}});
  }
  async listCustomerUnits(organizationId,customerId) {
    assertUUID(organizationId,'Organization');assertUUID(customerId,'Customer');
    return this.request('unit_customer_relationships',{filters:{organization_id:organizationId,customer_id:customerId},
      fields:'id,organization_id,unit_id,relationship_type,valid_from,valid_to',limit:50});
  }
  async listUnitVisits(organizationId,branchId,unitId) {
    assertUUID(organizationId,'Organization');assertUUID(branchId,'Branch');assertUUID(unitId,'Unit');
    return this.request('onsite_visits',{filters:{organization_id:organizationId,branch_id:branchId,unit_id:unitId},
      fields:'id,unit_id,intake_type,arrived_at,departed_at,status,coordinating_writer_id',limit:50});
  }
  async listRepairOrders(organizationId,branchId,unitId) {
    assertUUID(organizationId,'Organization');assertUUID(branchId,'Branch');assertUUID(unitId,'Unit');
    return this.request('repair_orders',{filters:{organization_id:organizationId,branch_id:branchId,unit_id:unitId},
      fields:'id,ro_number,unit_id,visit_id,status,opened_at,closed_at',limit:50});
  }
  async getLineItems(organizationId,branchId,roId) {
    assertUUID(organizationId,'Organization');assertUUID(branchId,'Branch');assertUUID(roId,'RO');
    return this.request('ro_line_items',{filters:{organization_id:organizationId,branch_id:branchId,repair_order_id:roId},
      fields:'id,repair_order_id,line_number,title,description,state',limit:50});
  }
  async listRoleDisplayProfiles(organizationId) {
    assertUUID(organizationId,'Organization');
    return this.request('role_identifier_profiles',{filters:{organization_id:organizationId},
      fields:'id,branch_id,role_key,primary_field,secondary_field,version',limit:50});
  }
}
