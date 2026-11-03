/**
 * OneShop universal search model.
 * Server must authorize documents + individual searchable fields BEFORE index
 * construction. No role may discover a restricted field by result existence,
 * match reason, count, preview, highlighting, navigation target or query timing.
 *
 * This module builds an ephemeral offline/test index from already-authorized
 * records. Production search is performed in a trusted, tenant-scoped endpoint.
 */
const norm = v => String(v ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
const compact = v => norm(v).replace(/[\s\-()./#]+/g,'');
const value = v => typeof v === 'string' ? v.trim() : String(v ?? '').trim();
const clean = v => value(v).replace(/\s+/g,' ');
const ID_FIELDS = new Set(['vin','stock_number','unit_id','ro_number','phone']);
const TITLES = Object.freeze({unit:'Units',ro:'Repair orders',customer:'Customers'});
export const SEARCH_ENTITY_TITLES = TITLES;

function field(key,text,weight) {
 const v=clean(text);
 return v ? {key,value:v,weight} : null;
}
function allowed(policy,grant){return policy?.[grant]===true;}
function row(document) {
 return {...document,fields:document.fields.filter(Boolean)};
}
const unique = arr=>[...new Set(arr.filter(Boolean))];
const scoped = (items,organizationId,branchId,type) =>
 (Array.isArray(items)?items:[]).filter(x=>{
  if (organizationId && x.organization_id && x.organization_id !== organizationId) return false;
  if (branchId && type === 'ro' && x.branch_id && x.branch_id !== branchId) return false;
  return true;
 });

/**
 * Build only from an authorized, server-filtered projection.
 * grants represent *field read permission*, not user's appearance preferences.
 * For a minimal UI, unit read can exist without customer or RO visibility.
 */
export function buildAuthorizedSearchDocuments(
 {units=[],repairOrders=[],customers=[]},
 grants,
 {organizationId=null,branchId=null}={}
){
 if(!grants||typeof grants!=='object')throw new Error('Explicit authorized field grants required');
 const safeUnits=scoped(units,organizationId,branchId,'unit');
 const safeRos=scoped(repairOrders,organizationId,branchId,'ro');
 const safeCustomers=scoped(customers,organizationId,branchId,'customer');
 const documents=[];
 const roByUnit=new Map();
 if(allowed(grants,'roRead')){
  for(const ro of safeRos){
   if(!ro?.id && !ro?.number)continue;
   const unitId=ro.unitId??ro.unit_id;
   if(!unitId)continue;
   const lines=Array.isArray(ro.lines)?ro.lines:[];
   const item = row({
     kind:'ro',id:String(ro.id??ro.number),unitId:String(unitId),
     title:clean(ro.number??ro.ro_number) || 'Unnumbered RO',
     summary:allowed(grants,'workRead')?clean(ro.description??ro.work_description):'Repair order',
     fields:[
       field('ro_number',ro.number??ro.ro_number,125),
       field('unit_id',unitId,100),
       allowed(grants,'workRead')&&field('work_description',ro.description??ro.work_description,24),
       allowed(grants,'workRead')&&field('line_item',lines.join(' '),16)
     ],
     matchContext: 'repair_order'
   });
   documents.push(item);
   const related=roByUnit.get(String(unitId))??[];related.push(item);roByUnit.set(String(unitId),related);
  }
 }
 const customersByUnit=new Map();
 if(allowed(grants,'customerRead')){
  // Customer records already authorized by server; no searching phone/email
  // unless the caller has the separate contactRead capability.
  const customersById=new Map(safeCustomers.map(c=>[String(c.id??c.name),c]));
  for(const unit of safeUnits) {
   const customer=safeCustomers.find(c=>String(c.id??c.name)===String(unit.customer_id??unit.customerId)) ??
     (unit.customer && {id:unit.customer, name:unit.customer,phone:unit.phone,email:unit.email});
   if(customer){customersByUnit.set(String(unit.id),customer);customersById.set(String(customer.id??customer.name),customer);}
  }
  for(const [id,c] of customersById){
   const name=clean(c.display_name??c.name);
   if(!name||name.toLocaleLowerCase()==='dealer inventory')continue;
   const unitIds=unique(safeUnits.filter(u=>String(u.customer_id??u.customerId??u.customer)===id)
     .map(u=>String(u.id)));
   documents.push(row({
     kind:'customer',id,unitId:unitIds.length===1?unitIds[0]:null,unitIds,
     title:name,summary:unitIds.length===1?'1 linked unit':unitIds.length+' linked units',
     fields:[
       field('customer_name',name,64),
       allowed(grants,'contactRead')&&field('phone',c.phone,45),
       allowed(grants,'contactRead')&&field('email',c.email,45)
     ],
     matchContext:'customer'
   }));
  }
 }
 if(allowed(grants,'unitRead')){
  for(const unit of safeUnits){
   if(!unit?.id)continue;
   const id=String(unit.id);
   const linkedROs=roByUnit.get(id)??[];
   const customer=customersByUnit.get(id);
   const title=clean([unit.year,unit.make,unit.model].filter(Boolean).join(' '))||'Unit '+id;
   const stock=clean(unit.stock_number??unit.stock);
   const vin=clean(unit.vin);
   documents.push(row({
     kind:'unit',id,unitId:id,title,
     summary:[stock&&'Stock '+stock,vin&&'VIN ···'+vin.slice(-6),unit.location].filter(Boolean).join('  ·  '),
     fields:[
       field('unit_id',id,120),
       field('stock_number',stock,140),
       field('vin',vin,140),
       field('vin_last6',vin.slice(-6),100),
       field('unit_description',title,36),
       field('location',unit.location,20),
       customer&&field('customer_name',customer.display_name??customer.name,42),
       ...linkedROs.flatMap(ro=>[
         ...ro.fields.filter(f=>f&&f.key==='ro_number').map(f=>field('ro_number',f.value,85)),
         ...ro.fields.filter(f=>f&&f.key==='work_description').map(f=>field('work_description',f.value,12))
       ])
     ],
     matchContext:'unit'
   }));
  }
 }
 return documents;
}

function matchToken(f,token){
 const a=norm(f.value),b=norm(token);
 if(!a||!b)return 0;
 const identifier=ID_FIELDS.has(f.key);
 if(a===b)return 1000+f.weight;
 if(identifier&&compact(a)===compact(b))return 980+f.weight;
 if(a.startsWith(b))return 520+f.weight;
 if(identifier&&compact(a).startsWith(compact(b)))return 510+f.weight;
 if(a.includes(b))return 170+f.weight;
 if(identifier&&compact(a).includes(compact(b)))return 150+f.weight;
 return 0;
}
export function searchAuthorizedDocuments(documents,query,{limit=60}={}){
 if(!Array.isArray(documents))throw new Error('Search documents must be a list');
 const term=clean(query);
 if(term.length<2)return [];
 const tokens=term.toLocaleLowerCase('en-US').split(/\s+/).slice(0,12);
 const found=[];
 for(const doc of documents){
  if(!doc||!Array.isArray(doc.fields)||!Object.hasOwn(TITLES,doc.kind))continue;
  let score=0,top=null,valid=true;
  for(const token of tokens){
   let bestScore=0,bestField=null;
   for(const f of doc.fields){
    if(!f||typeof f.value!=='string')continue;
    const x=matchToken(f,token);
    if(x>bestScore){bestScore=x;bestField=f;}
   }
   if(!bestScore){valid=false;break}
   score+=bestScore;
   if(!top||bestScore>top.score)top={key:bestField.key,value:bestField.value,score:bestScore};
  }
  if(valid)found.push({kind:doc.kind,id:doc.id,unitId:doc.unitId??null,
   unitIds:doc.unitIds??[],title:doc.title,summary:doc.summary,
   score,matchedField:top.key,matchedValue:top.value});
 }
 found.sort((a,b)=>b.score-a.score||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title));
 return found.slice(0,Math.max(1,Math.min(Number.isInteger(limit)?limit:60,200)));
}
