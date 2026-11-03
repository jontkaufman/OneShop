-- OneShop Module 01 core record schema: REVIEW CANDIDATE, NOT YET APPLIED.
-- No real customer data, unit movements, or role assignments are seeded.
-- Auth users and organization/branch memberships must be provisioned by trusted administrative code.
-- Membership writes are deliberately unavailable via authenticated/anon Data API.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  unique (id)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  code text not null check (btrim(code) <> ''),
  time_zone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, code)
);

create table public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_key text not null check (role_key in (
    'org_admin','manager','service_writer','foreman','service_dispatch',
    'porter','technician','parts','warranty','sales','pdi','wash','detail'
  )),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (organization_id,branch_id)
    references public.branches(organization_id,id) on delete cascade,
  unique (organization_id,branch_id,user_id,role_key)
);
create index staff_memberships_user_active_idx
  on public.staff_memberships (user_id,organization_id,branch_id,role_key)
  where active;

-- These invoker functions are evaluated through the user's own membership RLS.
-- No application permissions originate from user-editable JWT metadata.
create function private.has_org_access(p_org uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null
    and exists (select 1 from public.staff_memberships m
                where m.organization_id = p_org and m.user_id = (select auth.uid()) and m.active)
$$;
create function private.has_branch_access(p_org uuid,p_branch uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null
    and exists (select 1 from public.staff_memberships m
                where m.organization_id = p_org and m.branch_id = p_branch
                and m.user_id = (select auth.uid()) and m.active)
$$;
create function private.has_org_role(p_org uuid, p_roles text[]) returns boolean
language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null
    and exists (select 1 from public.staff_memberships m
                where m.organization_id = p_org and m.user_id = (select auth.uid())
                  and m.active and m.role_key = any(p_roles))
$$;
create function private.has_branch_role(p_org uuid,p_branch uuid,p_roles text[]) returns boolean
language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null
    and exists (select 1 from public.staff_memberships m
                where m.organization_id = p_org and m.branch_id = p_branch
                  and m.user_id = (select auth.uid()) and m.active and m.role_key = any(p_roles))
$$;
revoke all on function private.has_org_access(uuid) from public,anon;
revoke all on function private.has_branch_access(uuid,uuid) from public,anon;
revoke all on function private.has_org_role(uuid,text[]) from public,anon;
revoke all on function private.has_branch_role(uuid,uuid,text[]) from public,anon;
grant execute on function private.has_org_access(uuid) to authenticated;
grant execute on function private.has_branch_access(uuid,uuid) to authenticated;
grant execute on function private.has_org_role(uuid,text[]) to authenticated;
grant execute on function private.has_branch_role(uuid,uuid,text[]) to authenticated;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  display_name text not null check (btrim(display_name) <> ''),
  account_type text not null default 'person' check (account_type in ('person','business','internal')),
  notes_private text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id,id)
);
create index customers_org_name_idx on public.customers(organization_id,display_name);

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  contact_type text not null check (contact_type in ('phone','email')),
  label text,
  value text not null check (btrim(value) <> ''),
  is_primary boolean not null default false,
  consent_status text check (consent_status in ('unknown','opted_in','opted_out')),
  created_at timestamptz not null default now(),
  foreign key(organization_id,customer_id) references public.customers(organization_id,id) on delete cascade
);
create index customer_contacts_lookup_idx on public.customer_contacts(organization_id,contact_type,value);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_kind text not null default 'rv' check (unit_kind in ('rv','vehicle')),
  vin text,
  stock_number text,
  year integer check (year is null or (year between 1880 and 2200)),
  make text,
  model text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  -- Business integrity: no blank-identifier units. Duplicate VIN/stock values are
  -- allowed as candidates until the service writer explicitly resolves the match.
  check (nullif(btrim(coalesce(vin,'')),'') is not null
      or nullif(btrim(coalesce(stock_number,'')),'') is not null),
  unique (organization_id,id)
);
create index units_org_vin_idx on public.units(organization_id,vin);
create index units_org_stock_idx on public.units(organization_id,stock_number);

create table public.unit_customer_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  unit_id uuid not null,
  customer_id uuid not null,
  relationship_type text not null check (relationship_type in ('owner','operator','authorized_contact','bill_to')),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  foreign key (organization_id,unit_id) references public.units(organization_id,id) on delete restrict,
  foreign key (organization_id,customer_id) references public.customers(organization_id,id) on delete restrict
);
create index unit_customers_unit_idx on public.unit_customer_relationships(organization_id,unit_id,valid_from desc);
create index unit_customers_customer_idx on public.unit_customer_relationships(organization_id,customer_id,valid_from desc);

create table public.onsite_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  unit_id uuid not null,
  receiving_customer_id uuid,
  intake_type text not null check (intake_type in ('customer_service','new_inventory')),
  checked_in_by uuid references auth.users(id),
  coordinating_writer_id uuid references auth.users(id),
  arrived_at timestamptz not null default now(),
  promised_pickup_at timestamptz,
  departed_at timestamptz,
  status text not null default 'checked_in' check (status in ('checked_in','on_site','release_ready','departed','canceled')),
  created_at timestamptz not null default now(),
  foreign key (organization_id,branch_id) references public.branches(organization_id,id) on delete restrict,
  foreign key (organization_id,unit_id) references public.units(organization_id,id) on delete restrict,
  foreign key (organization_id,receiving_customer_id) references public.customers(organization_id,id) on delete restrict,
  unique (organization_id,branch_id,id),
  unique (organization_id,branch_id,id,unit_id),
  check ((status = 'departed' and departed_at is not null)
      or (status <> 'departed' and departed_at is null))
);
-- One physically present unit, regardless of number of active repair orders.
create unique index onsite_visits_one_active_unit_idx
  on public.onsite_visits(organization_id,unit_id)
  where status in ('checked_in','on_site','release_ready');
create index onsite_visits_branch_status_idx on public.onsite_visits(organization_id,branch_id,status,arrived_at desc);

create table public.repair_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  unit_id uuid not null,
  visit_id uuid,
  customer_id uuid,
  advisor_user_id uuid references auth.users(id),
  ro_number text,
  source_system text not null default 'oneshop',
  external_ro_id text,
  status text not null default 'draft' check (status in ('draft','open','blocked','complete','cancelled')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(organization_id,branch_id) references public.branches(organization_id,id) on delete restrict,
  foreign key(organization_id,unit_id) references public.units(organization_id,id) on delete restrict,
  foreign key(organization_id,customer_id) references public.customers(organization_id,id) on delete restrict,
  foreign key(organization_id,branch_id,visit_id,unit_id)
    references public.onsite_visits(organization_id,branch_id,id,unit_id) on delete restrict,
  unique (organization_id,branch_id,id),
  unique (organization_id,branch_id,id,unit_id),
  check (btrim(source_system) <> '')
);
create unique index repair_orders_scoped_number_idx
  on public.repair_orders(organization_id,branch_id,source_system,ro_number)
  where ro_number is not null;
create unique index repair_orders_scoped_external_idx
  on public.repair_orders(organization_id,branch_id,source_system,external_ro_id)
  where external_ro_id is not null;
create index repair_orders_unit_idx on public.repair_orders(organization_id,unit_id,opened_at desc);
create index repair_orders_visit_idx on public.repair_orders(organization_id,branch_id,visit_id);

create table public.ro_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  repair_order_id uuid not null,
  line_number integer not null check (line_number > 0),
  title text,
  description text,
  state text not null default 'pending'
    check (state in ('pending','authorized','in_progress','blocked','done','deferred','declined')),
  created_at timestamptz not null default now(),
  foreign key (organization_id,branch_id,repair_order_id)
    references public.repair_orders(organization_id,branch_id,id) on delete restrict,
  unique (organization_id,branch_id,repair_order_id,line_number),
  unique (organization_id,branch_id,repair_order_id,id)
);
create index ro_line_items_parent_state_idx on public.ro_line_items(organization_id,branch_id,repair_order_id,state);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  unit_id uuid not null,
  visit_id uuid,
  ro_id uuid,
  line_item_id uuid,
  actor_user_id uuid references auth.users(id),
  event_type text not null check (btrim(event_type) <> ''),
  occurred_at timestamptz not null default now(),
  source_key text not null,
  public_summary text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (line_item_id is null or ro_id is not null),
  foreign key(organization_id,branch_id,visit_id,unit_id)
    references public.onsite_visits(organization_id,branch_id,id,unit_id) on delete restrict,
  foreign key(organization_id,branch_id,ro_id,unit_id)
    references public.repair_orders(organization_id,branch_id,id,unit_id) on delete restrict,
  foreign key(organization_id,branch_id,ro_id,line_item_id)
    references public.ro_line_items(organization_id,branch_id,repair_order_id,id) on delete restrict,
  unique (organization_id,source_key)
);
create index activity_events_visit_timeline_idx on public.activity_events(organization_id,branch_id,visit_id,occurred_at);
create index activity_events_unit_idx on public.activity_events(organization_id,unit_id,occurred_at);

create table public.role_identifier_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid,
  role_key text not null check (role_key in (
    'org_admin','manager','service_writer','foreman','service_dispatch','porter',
    'technician','parts','warranty','sales','pdi','wash','detail'
  )),
  primary_field text not null check (primary_field in (
    'customer_name','ro_number','stock_number','vin_last6','vin_full',
    'year_make_model','unit_id'
  )),
  secondary_field text not null default 'none' check (secondary_field in (
    'none','customer_name','ro_number','stock_number','vin_last6','vin_full',
    'year_make_model','unit_id'
  )),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  check(primary_field <> secondary_field),
  foreign key(organization_id,branch_id) references public.branches(organization_id,id) on delete cascade
);
create unique index role_identifier_profiles_org_idx
 on public.role_identifier_profiles(organization_id,role_key) where branch_id is null;
create unique index role_identifier_profiles_branch_idx
 on public.role_identifier_profiles(organization_id,branch_id,role_key) where branch_id is not null;

-- Secure all exposed tables before granting client access.
alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.units enable row level security;
alter table public.unit_customer_relationships enable row level security;
alter table public.onsite_visits enable row level security;
alter table public.repair_orders enable row level security;
alter table public.ro_line_items enable row level security;
alter table public.activity_events enable row level security;
alter table public.role_identifier_profiles enable row level security;

-- RLS on staff memberships must be standalone; the helpers above query it.
create policy membership_self_read on public.staff_memberships
  for select to authenticated using (user_id = (select auth.uid()));

create policy org_read on public.organizations
  for select to authenticated using (private.has_org_access(id));
create policy branch_read on public.branches
  for select to authenticated using (private.has_branch_access(organization_id,id));

create policy customers_read on public.customers
  for select to authenticated using (private.has_org_access(organization_id));
create policy customers_insert on public.customers
  for insert to authenticated with check (
    private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]));
create policy customers_update on public.customers
  for update to authenticated
  using (private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]))
  with check (private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]));

create policy contact_read on public.customer_contacts
  for select to authenticated using (private.has_org_access(organization_id));
create policy contact_insert on public.customer_contacts
  for insert to authenticated with check (
    private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]));
create policy contact_update on public.customer_contacts
  for update to authenticated
  using (private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]))
  with check (private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]));

create policy units_read on public.units
  for select to authenticated using (private.has_org_access(organization_id));
-- Every *authorized* active branch staff member may register a unit.
create policy units_register on public.units
  for insert to authenticated with check (private.has_org_access(organization_id));
create policy units_update on public.units
  for update to authenticated
  using (private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]))
  with check (private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]));

create policy unit_customer_read on public.unit_customer_relationships
  for select to authenticated using (private.has_org_access(organization_id));
create policy unit_customer_insert on public.unit_customer_relationships
  for insert to authenticated with check (
    private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]));
create policy unit_customer_update on public.unit_customer_relationships
  for update to authenticated
  using (private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]))
  with check (private.has_org_role(organization_id,array['service_writer','manager','org_admin']::text[]));

create policy visits_read on public.onsite_visits
  for select to authenticated using (private.has_branch_access(organization_id,branch_id));
create policy visits_insert on public.onsite_visits
  for insert to authenticated with check (
    private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]));
create policy visits_update on public.onsite_visits
  for update to authenticated
  using (private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]))
  with check (private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]));

create policy ro_read on public.repair_orders
  for select to authenticated using (private.has_branch_access(organization_id,branch_id));
create policy ro_insert on public.repair_orders
  for insert to authenticated with check (
    private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]));
create policy ro_update on public.repair_orders
  for update to authenticated
  using (private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]))
  with check (private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]));

create policy ro_line_read on public.ro_line_items
  for select to authenticated using (private.has_branch_access(organization_id,branch_id));
create policy ro_line_insert on public.ro_line_items
  for insert to authenticated with check (
    private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]));
create policy ro_line_update on public.ro_line_items
  for update to authenticated
  using (private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]))
  with check (private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[]));

-- Audit/timeline writes must later be done by trusted transactional commands,
-- not client-generated "completion" or "delivery" events.
create policy activity_events_read on public.activity_events
  for select to authenticated using (private.has_branch_access(organization_id,branch_id));

create policy identifier_profile_read on public.role_identifier_profiles
  for select to authenticated using (
    (branch_id is null and private.has_org_access(organization_id))
    or (branch_id is not null and private.has_branch_access(organization_id,branch_id)));
create policy identifier_profile_insert on public.role_identifier_profiles
  for insert to authenticated with check (
    (branch_id is null and private.has_org_role(organization_id,array['org_admin']::text[]))
    or (branch_id is not null and private.has_branch_role(organization_id,branch_id,array['org_admin','manager']::text[])));
create policy identifier_profile_update on public.role_identifier_profiles
  for update to authenticated
  using (
    (branch_id is null and private.has_org_role(organization_id,array['org_admin']::text[]))
    or (branch_id is not null and private.has_branch_role(organization_id,branch_id,array['org_admin','manager']::text[])))
  with check (
    (branch_id is null and private.has_org_role(organization_id,array['org_admin']::text[]))
    or (branch_id is not null and private.has_branch_role(organization_id,branch_id,array['org_admin','manager']::text[])));

-- Supabase SQL-created tables are only exposed to the logged-in employee role.
-- No anon grants, no delete grants, and no client membership/event creation.
revoke all on all tables in schema public from anon;
revoke all on public.organizations,public.branches,public.staff_memberships,
  public.customers,public.customer_contacts,public.units,public.unit_customer_relationships,
  public.onsite_visits,public.repair_orders,public.ro_line_items,public.activity_events,
  public.role_identifier_profiles from public,authenticated;
grant select on public.organizations,public.branches,public.staff_memberships,
  public.customers,public.customer_contacts,public.units,public.unit_customer_relationships,
  public.onsite_visits,public.repair_orders,public.ro_line_items,public.activity_events,
  public.role_identifier_profiles to authenticated;
grant insert,update on public.customers,public.customer_contacts,public.units,
  public.unit_customer_relationships,public.onsite_visits,public.repair_orders,
  public.ro_line_items,public.role_identifier_profiles to authenticated;
