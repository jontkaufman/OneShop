-- A sensitive capability must be delegated by the relevant domain manager.
-- Payroll is stricter than general financial or customer-contact management.
create function private.delegation_manager_key(p_permission text)
returns text language sql immutable security invoker set search_path='' as $$
 select case when p_permission like 'payroll.%' then 'payroll.manage'
 when p_permission like 'finance.%' then 'finance.manage'
 when p_permission='customer.contact.read' then 'customer.manage'
 else null end;
$$;
revoke all on function private.delegation_manager_key(text) from public,anon,authenticated;
grant execute on function private.delegation_manager_key(text) to service_role;

create or replace function private.validate_grant_list(
 p_actor uuid,p_org uuid,p_branch uuid,p_permissions text[]
) returns void language plpgsql security invoker set search_path='' as $$
declare perm text; v_sensitive boolean; v_manager text;
begin
 if p_permissions is null then raise exception 'Permissions array required'; end if;
 if array_length(p_permissions,1)>200 then raise exception 'Too many permissions'; end if;
 if (select count(*) from unnest(p_permissions) as candidate(permission_key)) <>
    (select count(distinct permission_key) from unnest(p_permissions) as candidate(permission_key)) then
  raise exception 'Duplicate permissions';end if;
 for perm in select unnest(p_permissions) loop
  select sensitive into v_sensitive from public.permission_catalog where permission_key=perm;
  if not found then raise exception 'Unknown permission %',perm;end if;
  if not private.subject_is_owner(p_actor,p_org)
    and not private.subject_has_capability(p_actor,p_org,p_branch,perm)
    then raise exception 'Cannot grant a capability you do not hold' using errcode='42501'; end if;
  v_manager := private.delegation_manager_key(perm);
  if v_sensitive and v_manager is not null
   and not private.subject_is_owner(p_actor,p_org)
   and not private.subject_has_capability(p_actor,p_org,p_branch,v_manager)
    then raise exception 'Sensitive grant requires corresponding management authority' using errcode='42501';end if;
 end loop;
end $$;

create or replace function private.admin_set_user_override(
 p_actor uuid,p_org uuid,p_branch uuid,p_target uuid,p_permission text,p_decision text
) returns void language plpgsql security invoker set search_path='' as $$
declare v_sensitive boolean;v_manager text;
begin
 perform private.require_admin_permission(p_actor,p_org,p_branch,'permissions.assign');
 if p_actor=p_target or private.subject_is_owner(p_target,p_org) then
  raise exception 'Cannot override self or owner permissions';end if;
 if not exists(select 1 from public.staff_memberships where organization_id=p_org
 and branch_id=p_branch and user_id=p_target and active) then raise exception 'Target member not found';end if;
 select sensitive into v_sensitive from public.permission_catalog where permission_key=p_permission;
 if not found then raise exception 'Unknown permission';end if;
 if p_decision not in ('inherit','allow','deny') or p_decision is null then raise exception 'Invalid override';end if;
 if p_decision='allow' then
  if not private.subject_is_owner(p_actor,p_org)
   and not private.subject_has_capability(p_actor,p_org,p_branch,p_permission)
    then raise exception 'Cannot grant capability not held' using errcode='42501';end if;
  v_manager:=private.delegation_manager_key(p_permission);
  if v_sensitive and v_manager is not null and not private.subject_is_owner(p_actor,p_org)
   and not private.subject_has_capability(p_actor,p_org,p_branch,v_manager)
    then raise exception 'Sensitive grant restricted' using errcode='42501';end if;
 end if;
 if p_decision='inherit' then
  delete from public.member_permission_overrides where organization_id=p_org and branch_id=p_branch
   and user_id=p_target and permission_key=p_permission;
 else
  insert into public.member_permission_overrides(organization_id,branch_id,user_id,permission_key,decision,changed_by)
  values(p_org,p_branch,p_target,p_permission,p_decision,p_actor)
  on conflict(organization_id,branch_id,user_id,permission_key)
  do update set decision=excluded.decision,changed_by=excluded.changed_by,updated_at=now();
 end if;
 insert into public.permissions_audit_events(organization_id,actor_user_id,target_user_id,event_type,after_state)
 values(p_org,p_actor,p_target,'member.override',jsonb_build_object('permission',p_permission,'decision',p_decision,'branch_id',p_branch));
end $$;

revoke all on function private.validate_grant_list(uuid,uuid,uuid,text[]) from public,anon,authenticated;
revoke all on function private.admin_set_user_override(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function private.validate_grant_list(uuid,uuid,uuid,text[]) to service_role;
grant execute on function private.admin_set_user_override(uuid,uuid,uuid,uuid,text,text) to service_role;
