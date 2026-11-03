import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.mjs';
import { OneShopRecordsAPI } from '../src/data/records-api.mjs';

const $ = id => document.getElementById(id);
let session = null, memberships = [], activeMembership = null, api = null;
const msg = (message,error=false) => { $('system-message').textContent = message; $('system-message').dataset.error=String(error); };
const show = (panel) => { for(const p of ['setup-panel','sign-in','work-panel'])$(p).hidden = p!==panel; };
const fullName = row => [row.year,row.make,row.model].filter(Boolean).join(' ') || 'Unit details pending';
const textNode = (tag,text,className='') => {
 const node=document.createElement(tag);node.textContent=String(text??'');
 if(className)node.className=className;return node;
};
function renderMatches(rows) {
 const target=$('search-results');target.replaceChildren();
 if(!rows?.length){target.append(textNode('p','No matching units. Review identifiers before creating a new record.','muted'));return;}
 target.append(textNode('p',rows.length+' matching record(s). Select the correct unit before adding another.','muted'));
 for(const u of rows){
  const row=textNode('div','','record-row'),item=document.createElement('div');
  item.append(textNode('strong',fullName(u)));
  item.append(textNode('small','VIN '+(u.vin||'not recorded')+' · Stock '+(u.stock_number||'not recorded')));
  item.append(textNode('small','Stable unit ID: '+u.id));
  row.append(item);target.append(row);
 }
}
async function signIn(email,password) {
 const url=SUPABASE_URL+'/auth/v1/token?grant_type=password';
 const response=await fetch(url,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({email,password})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.access_token)throw new Error(data.msg||data.error_description||'Sign-in failed');
 session={access_token:data.access_token,user:data.user};
 api=new OneShopRecordsAPI({url:SUPABASE_URL,publishableKey:SUPABASE_PUBLISHABLE_KEY,
  getAccessToken:async()=>session?.access_token||''});
 // Supabase membership RLS shows only the current staff member's assignments.
 memberships=await api.request('staff_memberships',{filters:{user_id:data.user.id,active:true},
  fields:'id,organization_id,branch_id,role_key,active',limit:50});
 if(!memberships.length){session=null;api=null;throw new Error('This account has no active OneShop branch membership. Contact an organization administrator.');}
 activeMembership=memberships[0];
 const picker=$('membership-select');picker.replaceChildren();
 for (const m of memberships){
   const option=document.createElement('option');option.value=m.id;
   option.textContent=m.role_key+' · Org '+m.organization_id.slice(0,8)+' · Branch '+m.branch_id.slice(0,8);
   picker.append(option);
 }
 picker.value=activeMembership.id;
 updateActiveContext();
 $('password').value='';
 show('work-panel');msg('Signed in. Search for an existing unit before registering a new one.');
}
function updateActiveContext(){
 if(!activeMembership)return;
 $('staff-info').textContent='Organization '+activeMembership.organization_id.slice(0,8)+
 ' · Branch '+activeMembership.branch_id.slice(0,8)+' · Role '+activeMembership.role_key;
 $('search-results').replaceChildren();
}
$('membership-select').addEventListener('change',e=>{
 activeMembership=memberships.find(m=>m.id===e.target.value)??memberships[0];
 updateActiveContext();
 msg('Active workspace updated. Unit searches will use this organization.');
});
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();msg('Signing in...');
 try{await signIn($('email').value,$('password').value);}catch(error){msg(error.message,true);}
});
$('logout').addEventListener('click',()=>{session=null;memberships=[];activeMembership=null;api=null;show('sign-in');msg('Signed out. Session was held in memory only.');});
$('lookup-form').addEventListener('submit',async e=>{
 e.preventDefault();
 try {
  const value=$('identifier-value').value.trim();
  if(!value)throw new Error('Enter an identifier.');
  msg('Searching...');
  const options=$('identifier-kind').value==='vin'?{vin:value}:{stockNumber:value};
  const rows=await api.searchUnits(activeMembership.organization_id,options);
  renderMatches(rows);msg('Search complete.');
 } catch(error){msg(error.message,true);}
});
$('new-unit-form').addEventListener('submit',async e=>{
 e.preventDefault();
 try {
  const vin=$('vin').value.trim(),stock_number=$('stock').value.trim();
  if(!vin&&!stock_number)throw new Error('VIN or stock number is required.');
  const year=$('year').value.trim();
  const payload={vin,stock_number,unit_kind:$('unit-kind').value,
   year:year?Number(year):undefined,make:$('make').value.trim(),model:$('model').value.trim()};
  msg('Checking for an existing record...');
  const results=await Promise.all([vin&&api.searchUnits(activeMembership.organization_id,{vin}),
    stock_number&&api.searchUnits(activeMembership.organization_id,{stockNumber:stock_number})].filter(Boolean));
  const duplicates=[...new Map(results.flat().map(row=>[row.id,row])).values()];
  if(duplicates.length){renderMatches(duplicates);throw new Error('Matching unit(s) already exist. Review the matches instead of creating a duplicate.');}
  msg('Registering unit...');
  const created=await api.createUnit(activeMembership.organization_id,payload);
  renderMatches(created);msg('Unit registered. A Service Writer can now associate customers, ROs and an onsite visit.');
  $('new-unit-form').reset();
 } catch(error){msg(error.message,true);}
});
if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY) {show('setup-panel');msg('Configuration is required before this application can connect to Supabase.');}
else {show('sign-in');msg('Use an authorized dealership account to sign in.');}
