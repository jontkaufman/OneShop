-- OneShop permission schema grant hardening.
-- Starter templates are private and are not browser-accessible. No automatic
-- RLS policy is added here: sensitive employment and system tables remain service-only.
revoke all on private.system_role_templates from public,anon,authenticated;
revoke all on private.employee_compensation from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.system_role_templates to service_role;
revoke all on function private.bootstrap_dealership(uuid,text,text) from public,anon,authenticated;
grant execute on function private.bootstrap_dealership(uuid,text,text) to service_role;
-- Search/RLS helper calls for authenticated are unchanged.
create index employee_compensation_user_lookup_idx on private.employee_compensation(user_id,effective_from desc);
create index employee_compensation_changed_by_idx on private.employee_compensation(updated_by);
create index employee_profile_user_lookup_idx on public.employee_directory_profiles(user_id,organization_id);
create index employee_position_manager_idx on public.employee_position_assignments(manager_user_id);
create index organization_module_changed_by_idx on public.organization_module_settings(changed_by);
create index org_roles_changed_by_idx on public.organization_roles(updated_by);
create index owner_role_assignments_changed_by_idx on public.member_role_assignments(assigned_by);
create index overrides_changed_by_idx on public.member_permission_overrides(changed_by);
create index audits_actor_idx on public.permissions_audit_events(actor_user_id);
create index audits_target_idx on public.permissions_audit_events(target_user_id);
