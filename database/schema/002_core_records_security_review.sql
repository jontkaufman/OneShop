-- OneShop Module 01 review hardening (second applied migration).
-- Preserve the link between activity events and their real Unit even if no RO/Visit is attached.
alter table public.activity_events
  add constraint activity_events_org_unit_fk
  foreign key (organization_id, unit_id)
  references public.units(organization_id,id) on delete restrict;

-- DDL foundation initially allowed direct updates on stateful records.
-- Until transactional, audited commands exist, block these client mutations.
revoke update on public.onsite_visits from authenticated;
revoke update on public.unit_customer_relationships from authenticated;
revoke insert,update on public.role_identifier_profiles from authenticated;

-- A direct check-in cannot claim another actor or create a pre-departed visit.
drop policy visits_insert on public.onsite_visits;
create policy visits_insert on public.onsite_visits
 for insert to authenticated with check (
    private.has_branch_role(organization_id,branch_id,array['service_writer','manager','org_admin']::text[])
    and checked_in_by = (select auth.uid())
    and status = 'checked_in'
    and departed_at is null
 );

-- Detailed RO data should not be exposed to porter/lot operations solely
-- because they are authorized to move a physical Unit.
drop policy ro_read on public.repair_orders;
create policy ro_read on public.repair_orders
 for select to authenticated using (
   private.has_branch_role(organization_id,branch_id,array[
    'service_writer','manager','org_admin','foreman','service_dispatch',
    'technician','parts','warranty','pdi','sales'
   ]::text[])
 );

-- Read performance and referential checks on common foreign-key paths.
create index activity_events_actor_idx on public.activity_events(actor_user_id);
create index activity_events_ro_unit_idx on public.activity_events(organization_id,branch_id,ro_id,unit_id);
create index activity_events_ro_line_idx on public.activity_events(organization_id,branch_id,ro_id,line_item_id);
create index activity_events_visit_unit_idx on public.activity_events(organization_id,branch_id,visit_id,unit_id);
create index customer_contacts_parent_idx on public.customer_contacts(organization_id,customer_id);
create index onsite_visits_checked_in_by_idx on public.onsite_visits(checked_in_by);
create index onsite_visits_writer_idx on public.onsite_visits(coordinating_writer_id);
create index onsite_visits_customer_idx on public.onsite_visits(organization_id,receiving_customer_id);
create index repair_orders_advisor_idx on public.repair_orders(advisor_user_id);
create index repair_orders_visit_unit_idx on public.repair_orders(organization_id,branch_id,visit_id,unit_id);
create index repair_orders_customer_idx on public.repair_orders(organization_id,customer_id);
create index role_identifier_profiles_updated_by_idx on public.role_identifier_profiles(updated_by);
