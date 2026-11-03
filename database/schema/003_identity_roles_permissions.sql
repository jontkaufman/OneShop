-- OneShop v0.1: additive Identity, Roles, Positions, Module Configuration
-- This migration is for the empty connected OneShop foundational database.
-- All writes to policy/role/owner/payroll data require a trusted server path.
-- A user-editable JWT claim and a client-only permission calculation never grant access.

create table public.module_catalog (
 module_key text primary key,
 label text not null,
 tier text not null check(tier in ('basic','advanced')),
 default_enabled boolean not null,
 created_at timestamptz not null default now()
);
insert into public.module_catalog(module_key,label,tier,default_enabled) values
('schedule_checkin','Schedule & Check-In','basic',true),
('inspections','Inspections','basic',true),
('unit_management','Unit Management','basic',true),
('ro_management','Repair Orders','basic',true),
('followups','Follow-Ups','basic',true),
('financials','Financials','basic',true),
('customers','Customers','basic',true),
('reporting','Reporting','basic',true),
('mobile_operations','Mobile Operations','advanced',false),
('insurance_warranty','Insurance & Warranty','advanced',false),
('marketing_automation','Marketing Automation','advanced',false),
('advanced_analytics','Advanced Analytics','advanced',false),
('integrations','Integrations & API','advanced',false);

create table public.permission_catalog (
 permission_key text primary key,
 module_key text references public.module_catalog(module_key) on delete restrict,
 label text not null,
 sensitive boolean not null default false
);
insert into public.permission_catalog(permission_key,module_key,label,sensitive) values
('users.read',null,'View employee directory',false),
('users.create',null,'Invite employees',false),
('users.update',null,'Edit employee profiles',false),
('users.deactivate',null,'Deactivate accounts',false),
('roles.read',null,'View role templates',false),
('roles.manage',null,'Create and edit role templates',false),
('positions.manage',null,'Manage job positions',false),
('permissions.assign',null,'Assign roles and overrides',false),
('modules.manage',null,'Enable and configure modules',false),
('audit.read',null,'View security audit history',false),
('payroll.read','financials','View payroll data',true),
('payroll.manage','financials','Edit pay and employment costs',true),
('finance.read','financials','View financial information',true),
('finance.manage','financials','Manage financial records',true),
('schedule.read','schedule_checkin','View schedule',false),
('schedule.manage','schedule_checkin','Edit schedule',false),
('checkin.create','schedule_checkin','Perform check-in',false),
('inspection.read','inspections','View inspections',false),
('inspection.create','inspections','Create inspections',false),
('inspection.update','inspections','Edit inspections',false),
('unit.read','unit_management','View units',false),
('unit.create','unit_management','Register units',false),
('unit.update','unit_management','Edit unit records',false),
('unit.move.request','unit_management','Request moves',false),
('unit.move.claim','unit_management','Claim moves',false),
('unit.move.deliver','unit_management','Confirm delivery',false),
('unit.location.read','unit_management','View unit locations',false),
('ro.read','ro_management','View repair orders',false),
('ro.create','ro_management','Create repair orders',false),
('ro.update','ro_management','Edit repair orders',false),
('ro.assign','ro_management','Assign RO work',false),
('ro.number.override','ro_management','Override assigned RO number',false),
('followup.read','followups','View follow-ups',false),
('followup.manage','followups','Manage follow-ups',false),
('customer.read','customers','View customers',false),
('customer.contact.read','customers','View customer contact details',true),
('customer.manage','customers','Edit customers',false),
('reports.read','reporting','View reports',false),
('mobile.use','mobile_operations','Use mobile operations',false),
('warranty.read','insurance_warranty','View warranty and insurance',false),
('warranty.manage','insurance_warranty','Manage claims',false),
('marketing.manage','marketing_automation','Manage campaigns',false),
('analytics.advanced.read','advanced_analytics','View advanced analytics',false),
('integrations.manage','integrations','Manage integrations',false);

create table private.system_role_templates (
 slug text primary key,
 label text not null,
 permissions text[] not null
);
insert into private.system_role_templates(slug,label,permissions) values
('administrator','Administrator',array['users.read','users.create','users.update','users.deactivate','roles.read','roles.manage','positions.manage','permissions.assign','modules.manage','audit.read','schedule.read','schedule.manage','checkin.create','inspection.read','inspection.create','inspection.update','unit.read','unit.create','unit.update','unit.move.request','unit.move.claim','unit.move.deliver','unit.location.read','ro.read','ro.create','ro.update','ro.assign','ro.number.override','followup.read','followup.manage','customer.read','customer.contact.read','customer.manage','reports.read','finance.read','finance.manage']::text[]),
('service_writer','Service Writer',array['schedule.read','schedule.manage','checkin.create','unit.read','unit.create','unit.update','unit.move.request','unit.location.read','ro.read','ro.create','ro.update','ro.number.override','inspection.read','customer.read','customer.contact.read','customer.manage','followup.read','followup.manage']::text[]),
('porter','Porter',array['schedule.read','unit.read','unit.create','unit.move.claim','unit.move.deliver','unit.location.read']::text[]),
('technician','Technician',array['schedule.read','unit.read','unit.create','unit.location.read','ro.read','inspection.read','inspection.create','inspection.update']::text[]),
('foreman','Foreman',array['schedule.read','checkin.create','unit.read','unit.create','unit.move.request','unit.location.read','ro.read','ro.create','ro.update','ro.assign','inspection.read','reports.read']::text[]),
('sales','Sales',array['unit.read','unit.create','customer.read','customer.contact.read','ro.read']::text[]),
('parts','Parts',array['unit.read','unit.create','unit.location.read','ro.read']::text[]),
('pdi','PDI',array['unit.read','unit.create','unit.move.request','unit.location.read','ro.read','inspection.read','inspection.create']::text[]),
('finance_manager','Finance Manager',array['finance.read','finance.manage','payroll.read','payroll.manage','reports.read','ro.read','users.read']::text[]);

create table public.organization_owners (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 primary key(organization_id,user_id)
);
create index organization_owners_user_idx on public.organization_owners(user_id,organization_id);

create table public.organization_module_settings (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 module_key text not null references public.module_catalog(module_key),
 enabled boolean not null,
 changed_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 version bigint not null default 1 check(version>0),
 primary key(organization_id,module_key)
);

create table public.organization_roles (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 slug text not null check(slug ~ '^[a-z][a-z0-9_]{1,63}$'),
 label text not null check(btrim(label)<>''),
 description text,
 is_system boolean not null default false,
 archived_at timestamptz,
 version bigint not null default 1 check(version>0),
 updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique(organization_id,id),
 unique(organization_id,slug)
);
create index organization_roles_active_idx on public.organization_roles(organization_id,archived_at);

create table public.role_capabilities (
 organization_id uuid not null,
 role_id uuid not null,
 permission_key text not null references public.permission_catalog(permission_key),
 granted boolean not null default true,
 updated_at timestamptz not null default now(),
 primary key(organization_id,role_id,permission_key),
 foreign key(organization_id,role_id) references public.organization_roles(organization_id,id) on delete cascade
);
create index role_capabilities_perm_idx on public.role_capabilities(organization_id,permission_key);

alter table public.staff_memberships
 add constraint staff_memberships_org_branch_id_unique unique(organization_id,branch_id,id);

create table public.member_role_assignments (
 organization_id uuid not null,
 branch_id uuid not null,
 membership_id uuid not null,
 role_id uuid not null,
 assigned_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,branch_id,membership_id,role_id),
 foreign key(organization_id,branch_id,membership_id)
   references public.staff_memberships(organization_id,branch_id,id) on delete cascade,
 foreign key(organization_id,role_id)
   references public.organization_roles(organization_id,id) on delete restrict
);
create index member_role_assignments_role_idx on public.member_role_assignments(organization_id,role_id);

create table public.member_permission_overrides (
 organization_id uuid not null,
 branch_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 permission_key text not null references public.permission_catalog(permission_key),
 decision text not null check(decision in ('allow','deny')),
 reason text,
 changed_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(organization_id,branch_id,user_id,permission_key),
 foreign key(organization_id,branch_id) references public.branches(organization_id,id) on delete cascade
);
create index member_permission_overrides_user_idx on public.member_permission_overrides(user_id,organization_id,branch_id);

create table public.job_positions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null check(btrim(title)<>''),
 department text,
 reports_to_position_id uuid,
 active boolean not null default true,
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
 foreign key(organization_id,reports_to_position_id)
    references public.job_positions(organization_id,id) on delete restrict
);

create table public.employee_directory_profiles (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(btrim(display_name)<>''),
 work_email text,
 work_phone text,
 extension text,
 emergency_contact_private_note text,
 status text not null default 'active' check(status in ('active','invited','suspended','inactive')),
 updated_at timestamptz not null default now(),
 primary key(organization_id,user_id)
);
-- Emergency contacts are confidential and belong in a separate secure employment record.
alter table public.employee_directory_profiles drop column emergency_contact_private_note;

create table public.employee_position_assignments (
 organization_id uuid not null,
 branch_id uuid not null,
 user_id uuid not null,
 position_id uuid not null,
 manager_user_id uuid,
 active boolean not null default true,
 effective_from date not null default current_date,
 effective_to date,
 primary key(organization_id,branch_id,user_id,position_id,effective_from),
 foreign key(organization_id,branch_id) references public.branches(organization_id,id) on delete cascade,
 foreign key(organization_id,user_id) references public.employee_directory_profiles(organization_id,user_id) on delete cascade,
 foreign key(organization_id,position_id) references public.job_positions(organization_id,id) on delete restrict,
 foreign key(manager_user_id) references auth.users(id) on delete set null,
 check(effective_to is null or effective_to>=effective_from)
);
create index employee_position_active_idx on public.employee_position_assignments(organization_id,branch_id,position_id) where active;

create table private.employee_compensation (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete restrict,
 effective_from date not null,
 pay_basis text not null check(pay_basis in ('hourly','salary','flat_rate','mixed')),
 pay_rate numeric(13,4) not null check(pay_rate>=0),
 currency text not null default 'USD' check(length(currency)=3),
 employment_status text not null default 'active',
 notes text,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(organization_id,user_id,effective_from)
);
-- Not exposed via public Data API. Future payroll endpoints require separate MFA and audit checks.
revoke all on private.employee_compensation from public,anon,authenticated;
grant select,insert,update,delete on private.employee_compensation to service_role;

create table public.permissions_audit_events (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 actor_user_id uuid references auth.users(id),
 target_user_id uuid references auth.users(id),
 event_type text not null,
 changed_at timestamptz not null default now(),
 before_state jsonb,
 after_state jsonb,
 context jsonb not null default '{}'::jsonb,
 request_key text,
 unique(organization_id,request_key)
);
create index permissions_audit_events_org_time_idx on public.permissions_audit_events(organization_id,changed_at desc);

-- Resolve permissions on the server: membership AND role grants/user overrides AND module activation.
-- Owner bypasses role-level grants but cannot use an operational feature in a disabled module.
create function private.has_capability(p_org uuid,p_branch uuid,p_permission text)
returns boolean language plpgsql stable security definer set search_path=''
as $$
declare
 v_user uuid := auth.uid();
 v_module text;
 v_default boolean;
 v_enabled boolean;
 v_decision text;
begin
 if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then return false; end if;
 if not exists(select 1 from public.staff_memberships m
   where m.organization_id=p_org and m.branch_id=p_branch
     and m.user_id=v_user and m.active) then return false; end if;
 select pc.module_key into v_module from public.permission_catalog pc where pc.permission_key=p_permission;
 if not found then return false; end if;
 if v_module is not null then
   select mc.default_enabled into v_default from public.module_catalog mc where mc.module_key=v_module;
   select ms.enabled into v_enabled from public.organization_module_settings ms
     where ms.organization_id=p_org and ms.module_key=v_module;
   if not coalesce(v_enabled,v_default,false) then return false; end if;
 end if;
 if exists(select 1 from public.organization_owners o where o.organization_id=p_org and o.user_id=v_user) then return true; end if;
 select o.decision into v_decision from public.member_permission_overrides o
 where o.organization_id=p_org and o.branch_id=p_branch and o.user_id=v_user and o.permission_key=p_permission;
 if found then return v_decision='allow'; end if;
 return exists(
   select 1 from public.staff_memberships m
   join public.member_role_assignments a on a.organization_id=m.organization_id
    and a.branch_id=m.branch_id and a.membership_id=m.id
   join public.organization_roles r on r.organization_id=a.organization_id and r.id=a.role_id
    and r.archived_at is null
   join public.role_capabilities g on g.organization_id=r.organization_id and g.role_id=r.id
    and g.granted and g.permission_key=p_permission
   where m.organization_id=p_org and m.branch_id=p_branch and m.user_id=v_user and m.active
 );
end $$;
revoke all on function private.has_capability(uuid,uuid,text) from public,anon;
grant execute on function private.has_capability(uuid,uuid,text) to authenticated;

create function private.has_org_capability(p_org uuid,p_permission text)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
   select 1 from public.staff_memberships m
   where m.organization_id=p_org and m.user_id=auth.uid() and m.active
    and private.has_capability(p_org,m.branch_id,p_permission)
 );
$$;
revoke all on function private.has_org_capability(uuid,text) from public,anon;
grant execute on function private.has_org_capability(uuid,text) to authenticated;

-- Only a trusted platform service may initialize a dealership.
-- No owner account or default permissions granted through public signup.
create function private.bootstrap_dealership(p_owner uuid,p_name text,p_branch_name text)
returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_org uuid;v_branch uuid;v_member uuid;
begin
 if p_owner is null or btrim(coalesce(p_name,''))='' or btrim(coalesce(p_branch_name,''))='' then
   raise exception 'Owner, organization name and branch name required';
 end if;
 insert into public.organizations(name) values(p_name) returning id into v_org;
 insert into public.branches(organization_id,name,code) values(v_org,p_branch_name,'MAIN') returning id into v_branch;
 insert into public.staff_memberships(organization_id,branch_id,user_id,role_key,active)
  values(v_org,v_branch,p_owner,'org_admin',true) returning id into v_member;
 insert into public.organization_owners(organization_id,user_id) values(v_org,p_owner);
 insert into public.organization_module_settings(organization_id,module_key,enabled)
  select v_org,module_key,default_enabled from public.module_catalog;
 insert into public.organization_roles(organization_id,slug,label,is_system)
  select v_org,slug,label,true from private.system_role_templates;
 insert into public.role_capabilities(organization_id,role_id,permission_key,granted)
  select v_org,r.id,un.grant_key,true
  from public.organization_roles r
  join private.system_role_templates t on t.slug=r.slug
  cross join lateral unnest(t.permissions) un(grant_key)
  join public.permission_catalog p on p.permission_key=un.grant_key
  where r.organization_id=v_org;
 insert into public.member_role_assignments(organization_id,branch_id,membership_id,role_id)
  select v_org,v_branch,v_member,r.id from public.organization_roles r
   where r.organization_id=v_org and r.slug='administrator';
 insert into public.employee_directory_profiles(organization_id,user_id,display_name,status)
  values(v_org,p_owner,'Account Owner','active');
 insert into public.permissions_audit_events(organization_id,actor_user_id,event_type,after_state)
  values(v_org,p_owner,'organization.bootstrapped',jsonb_build_object('owner_id',p_owner,'basic_modules',true));
 return v_org;
end $$;
revoke all on function private.bootstrap_dealership(uuid,text,text) from public,anon,authenticated;
grant execute on function private.bootstrap_dealership(uuid,text,text) to service_role;

-- Prevent deletion of the final owner even by future trusted administrative code.
create function private.prevent_last_owner_removal()
returns trigger language plpgsql set search_path='' as $$
begin
 if (select count(*) from public.organization_owners
     where organization_id=old.organization_id) <=1 then
   raise exception 'Cannot remove the last organization owner';
 end if;
 return old;
end $$;
create trigger protect_last_organization_owner before delete on public.organization_owners
for each row execute function private.prevent_last_owner_removal();

-- All newly exposed public relations use explicit RLS and read-only grants for staff.
alter table public.module_catalog enable row level security;
alter table public.permission_catalog enable row level security;
alter table public.organization_owners enable row level security;
alter table public.organization_module_settings enable row level security;
alter table public.organization_roles enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.member_role_assignments enable row level security;
alter table public.member_permission_overrides enable row level security;
alter table public.job_positions enable row level security;
alter table public.employee_directory_profiles enable row level security;
alter table public.employee_position_assignments enable row level security;
alter table public.permissions_audit_events enable row level security;
alter table private.employee_compensation enable row level security;
-- A service-role backend bypasses RLS, while browser roles never read payroll.
revoke all on public.module_catalog,public.permission_catalog,public.organization_owners,
 public.organization_module_settings,public.organization_roles,public.role_capabilities,
 public.member_role_assignments,public.member_permission_overrides,public.job_positions,
 public.employee_directory_profiles,public.employee_position_assignments,public.permissions_audit_events
 from public,anon,authenticated;
grant select on public.module_catalog,public.permission_catalog,
 public.organization_owners,public.organization_module_settings,
 public.organization_roles,public.role_capabilities,public.member_role_assignments,
 public.member_permission_overrides,public.job_positions,public.employee_directory_profiles,
 public.employee_position_assignments,public.permissions_audit_events to authenticated;

create policy module_catalog_read on public.module_catalog for select to authenticated using(true);
create policy permission_catalog_read on public.permission_catalog for select to authenticated using(true);
create policy owner_self_or_admin on public.organization_owners for select to authenticated
 using(user_id=auth.uid() or private.has_org_capability(organization_id,'users.read'));
create policy org_module_read on public.organization_module_settings for select to authenticated
 using(private.has_org_capability(organization_id,'modules.manage') or private.has_org_capability(organization_id,'users.read'));
create policy org_roles_read on public.organization_roles for select to authenticated
 using(private.has_org_capability(organization_id,'roles.read'));
create policy role_capabilities_read on public.role_capabilities for select to authenticated
 using(private.has_org_capability(organization_id,'roles.read'));
create policy role_assignments_read on public.member_role_assignments for select to authenticated
 using(private.has_capability(organization_id,branch_id,'users.read'));
create policy user_overrides_read on public.member_permission_overrides for select to authenticated
 using(user_id=auth.uid() or private.has_capability(organization_id,branch_id,'permissions.assign'));
create policy positions_read on public.job_positions for select to authenticated
 using(private.has_org_capability(organization_id,'users.read'));
create policy directory_read on public.employee_directory_profiles for select to authenticated
 using(user_id=auth.uid() or private.has_org_capability(organization_id,'users.read'));
create policy position_assignments_read on public.employee_position_assignments for select to authenticated
 using(user_id=auth.uid() or private.has_capability(organization_id,branch_id,'users.read'));
create policy permission_audit_read on public.permissions_audit_events for select to authenticated
 using(private.has_org_capability(organization_id,'audit.read'));

-- Retire legacy role_key-based RLS gates. New permissions are authoritative.
drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select to authenticated using
 (private.has_org_capability(organization_id,'customer.read'));
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated with check
 (private.has_org_capability(organization_id,'customer.manage'));
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
 using(private.has_org_capability(organization_id,'customer.manage'))
 with check(private.has_org_capability(organization_id,'customer.manage'));

drop policy if exists contact_read on public.customer_contacts;
create policy contact_read on public.customer_contacts for select to authenticated using
 (private.has_org_capability(organization_id,'customer.contact.read'));
drop policy if exists contact_insert on public.customer_contacts;
create policy contact_insert on public.customer_contacts for insert to authenticated with check
 (private.has_org_capability(organization_id,'customer.manage'));
drop policy if exists contact_update on public.customer_contacts;
create policy contact_update on public.customer_contacts for update to authenticated
 using(private.has_org_capability(organization_id,'customer.manage'))
 with check(private.has_org_capability(organization_id,'customer.manage'));

drop policy if exists units_read on public.units;
create policy units_read on public.units for select to authenticated using
 (private.has_org_capability(organization_id,'unit.read'));
drop policy if exists units_register on public.units;
create policy units_register on public.units for insert to authenticated with check
 (private.has_org_capability(organization_id,'unit.create'));
drop policy if exists units_update on public.units;
create policy units_update on public.units for update to authenticated
 using(private.has_org_capability(organization_id,'unit.update'))
 with check(private.has_org_capability(organization_id,'unit.update'));

drop policy if exists unit_customer_read on public.unit_customer_relationships;
create policy unit_customer_read on public.unit_customer_relationships for select to authenticated using
 (private.has_org_capability(organization_id,'customer.read'));
drop policy if exists unit_customer_insert on public.unit_customer_relationships;
create policy unit_customer_insert on public.unit_customer_relationships for insert to authenticated with check
 (private.has_org_capability(organization_id,'customer.manage'));
drop policy if exists unit_customer_update on public.unit_customer_relationships;
create policy unit_customer_update on public.unit_customer_relationships for update to authenticated
 using(private.has_org_capability(organization_id,'customer.manage'))
 with check(private.has_org_capability(organization_id,'customer.manage'));

drop policy if exists visits_read on public.onsite_visits;
create policy visits_read on public.onsite_visits for select to authenticated using
 (private.has_capability(organization_id,branch_id,'schedule.read'));
drop policy if exists visits_insert on public.onsite_visits;
create policy visits_insert on public.onsite_visits for insert to authenticated with check
 (private.has_capability(organization_id,branch_id,'checkin.create') and checked_in_by=auth.uid()
 and status='checked_in' and departed_at is null);
drop policy if exists visits_update on public.onsite_visits;
create policy visits_update on public.onsite_visits for update to authenticated
 using(private.has_capability(organization_id,branch_id,'checkin.create'))
 with check(private.has_capability(organization_id,branch_id,'checkin.create'));
-- Existing authenticated UPDATE grant on onsite_visits remains revoked until audited commands exist.

drop policy if exists ro_read on public.repair_orders;
create policy ro_read on public.repair_orders for select to authenticated using
 (private.has_capability(organization_id,branch_id,'ro.read'));
drop policy if exists ro_insert on public.repair_orders;
create policy ro_insert on public.repair_orders for insert to authenticated with check
 (private.has_capability(organization_id,branch_id,'ro.create'));
drop policy if exists ro_update on public.repair_orders;
create policy ro_update on public.repair_orders for update to authenticated
 using(private.has_capability(organization_id,branch_id,'ro.update'))
 with check(private.has_capability(organization_id,branch_id,'ro.update'));
drop policy if exists ro_line_read on public.ro_line_items;
create policy ro_line_read on public.ro_line_items for select to authenticated using
 (private.has_capability(organization_id,branch_id,'ro.read'));
drop policy if exists ro_line_insert on public.ro_line_items;
create policy ro_line_insert on public.ro_line_items for insert to authenticated with check
 (private.has_capability(organization_id,branch_id,'ro.create'));
drop policy if exists ro_line_update on public.ro_line_items;
create policy ro_line_update on public.ro_line_items for update to authenticated
 using(private.has_capability(organization_id,branch_id,'ro.update'))
 with check(private.has_capability(organization_id,branch_id,'ro.update'));

drop policy if exists activity_events_read on public.activity_events;
create policy activity_events_read on public.activity_events for select to authenticated using
 (private.has_capability(organization_id,branch_id,'audit.read'));

drop policy if exists identifier_profile_read on public.role_identifier_profiles;
create policy identifier_profile_read on public.role_identifier_profiles for select to authenticated using
 ((branch_id is null and private.has_org_capability(organization_id,'roles.read'))
  or (branch_id is not null and private.has_capability(organization_id,branch_id,'roles.read')));
-- Direct client edits to identifier profiles remain revoked; trusted settings commands only.
drop policy if exists identifier_profile_insert on public.role_identifier_profiles;
drop policy if exists identifier_profile_update on public.role_identifier_profiles;
-- Staff can read self membership or inspect branch membership with users.read.
create policy membership_admin_read on public.staff_memberships for select to authenticated
 using(private.has_capability(organization_id,branch_id,'users.read'));

-- All privileged role, employment and pay changes require trusted versioned commands.
