-- OneShop trusted administrative operations.
-- Only service_role can invoke. The server MUST verify the caller's user JWT,
-- then supply that verified user ID as p_actor. Never trust a client-supplied actor ID.
-- No direct authenticated/anon DML on permissions, roles, positions or modules.

alter table public.job_positions add column if not exists version bigint not null default 1 check(version>0);

create function private.subject_is_owner(p_actor uuid,p_org uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.organization_owners
 where organization_id=p_org and user_id=p_actor);
$$;

create function private.subject_has_capability(p_actor uuid,p_org uuid,p_branch uuid,p_permission text)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare v_module text;v_default boolean;v_enabled boolean;v_decision text;
begin
 if p_actor is null or p_org is null or p_branch is null or p_permission is null then return false; end if;
 if not exists(select 1 from public.staff_memberships
  where user_id=p_actor and organization_id=p_org and branch_id=p_branch and active) then return false; end if;
 select module_key into v_module from public.permission_catalog where permission_key=p_permission;
 if not found then return false; end if;
 if v_module is not null then
  select default_enabled into v_default from public.module_catalog where module_key=v_module;
  select enabled into v_enabled from public.organization_module_settings
   where organization_id=p_org and module_key=v_module;
  if not coalesce(v_enabled,v_default,false) then return false; end if;
 end if;
 if private.subject_is_owner(p_actor,p_org) then return true; end if;
 select decision into v_decision from public.member_permission_overrides
  where organization_id=p_org and branch_id=p_branch and user_id=p_actor and permission_key=p_permission;
 if found then return v_decision='allow'; end if;
 return exists(
  select 1 from public.staff_memberships m
  join public.member_role_assignments a on a.organization_id=m.organization_id
   and a.branch_id=m.branch_id and a.membership_id=m.id
  join public.organization_roles r on r.organization_id=a.organization_id
   and r.id=a.role_id and r.archived_at is null
  join public.role_capabilities g on g.organization_id=r.organization_id
   and g.role_id=r.id and g.permission_key=p_permission and g.granted
  where m.user_id=p_actor and m.organization_id=p_org and m.branch_id=p_branch and m.active
 );
end $$;

create function private.require_admin_permission(p_actor uuid,p_org uuid,p_branch uuid,p_permission text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not private.subject_has_capability(p_actor,p_org,p_branch,p_permission)
  then raise exception 'Not authorized to perform this action' using errcode='42501'; end if;
end $$;

create function private.validate_grant_list(
 p_actor uuid,p_org uuid,p_branch uuid,p_permissions text[]
) returns void language plpgsql security invoker set search_path='' as $$
declare perm text;
begin
 if p_permissions is null then raise exception 'Permissions array required'; end if;
 if array_length(p_permissions,1)>200 then raise exception 'Too many permissions'; end if;
 if (select count(*) from unnest(p_permissions) p) <>
    (select count(distinct p) from unnest(p_permissions) p) then
  raise exception 'Duplicate permissions';end if;
 for perm in select unnest(p_permissions) loop
  if not exists(select 1 from public.permission_catalog where permission_key=perm)
   then raise exception 'Unknown permission %',perm; end if;
  if not private.subject_is_owner(p_actor,p_org)
    and not private.subject_has_capability(p_actor,p_org,p_branch,perm)
   then raise exception 'Cannot grant a capability you do not hold' using errcode='42501'; end if;
  if exists(select 1 from public.permission_catalog where permission_key=perm and sensitive)
   and not private.subject_is_owner(p_actor,p_org)
   and not private.subject_has_capability(p_actor,p_org,p_branch,'payroll.manage')
   then raise exception 'Sensitive permission requires payroll administration' using errcode='42501';end if;
 end loop;
end $$;

create function private.admin_create_role(
 p_actor uuid,p_org uuid,p_branch uuid,p_slug text,p_label text,p_permissions text[]
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_role uuid;
begin
 perform private.require_admin_permission(p_actor,p_org,p_branch,'roles.manage');
 if p_slug is null or p_slug !~ '^[a-z][a-z0-9_]{1,63}$'
  or p_slug='owner' or btrim(coalesce(p_label,''))=''
  then raise exception 'Invalid role identifier or name';end if;
 perform private.validate_grant_list(p_actor,p_org,p_branch,p_permissions);
 insert into public.organization_roles(organization_id,slug,label,is_system,updated_by)
 values(p_org,p_slug,p_label,false,p_actor) returning id into v_role;
 insert into public.role_capabilities(organization_id,role_id,permission_key)
 select p_org,v_role,un.perm from unnest(p_permissions) un(perm);
 insert into public.permissions_audit_events(organization_id,actor_user_id,event_type,after_state)
 values(p_org,p_actor,'role.created',jsonb_build_object('role_id',v_role,'slug',p_slug,'grants',p_permissions));
 return v_role;
end $$;

create function private.admin_update_role(
 p_actor uuid,p_org uuid,p_branch uuid,p_role uuid,p_expected_version bigint,p_label text,p_permissions text[]
) returns bigint language plpgsql security invoker set search_path='' as $$
declare v_role public.organization_roles%rowtype;v_version bigint;
begin
 perform private.require_admin_permission(p_actor,p_org,p_branch,'roles.manage');
 perform private.validate_grant_list(p_actor,p_org,p_branch,p_permissions);
 if btrim(coalesce(p_label,''))='' then raise exception 'Role name required';end if;
 select * into v_role from public.organization_roles
 where id=p_role and organization_id=p_org for update;
 if not found or v_role.archived_at is not null then raise exception 'Role not found';end if;
 if v_role.is_system then raise exception 'Protected starter role; clone before customizing';end if;
 if v_role.version<>p_expected_version then raise exception 'Role changed by another administrator';end if;
 update public.organization_roles set label=p_label,version=version+1,updated_by=p_actor
 where id=p_role and organization_id=p_org returning version into v_version;
 delete from public.role_capabilities where organization_id=p_org and role_id=p_role;
 insert into public.role_capabilities(organization_id,role_id,permission_key)
 select p_org,p_role,un.perm from unnest(p_permissions) un(perm);
 insert into public.permissions_audit_events(organization_id,actor_user_id,event_type,before_state,after_state)
 values(p_org,p_actor,'role.updated',jsonb_build_object('role_id',p_role,'label',v_role.label,'version',v_role.version),
 jsonb_build_object('role_id',p_role,'label',p_label,'version',v_version,'grants',p_permissions));
 return v_version;
end $$;

create function private.admin_archive_role(
 p_actor uuid,p_org uuid,p_branch uuid,p_role uuid,p_expected_version bigint
) returns void language plpgsql security invoker set search_path='' as $$
declare v_role public.organization_roles%rowtype;
begin
 perform private.require_admin_permission(p_actor,p_org,p_branch,'roles.manage');
 select * into v_role from public.organization_roles
  where organization_id=p_org and id=p_role for update;
 if not found or v_role.archived_at is not null then raise exception 'Role not active';end if;
 if v_role.is_system then raise exception 'Protected role cannot be archived';end if;
 if v_role.version<>p_expected_version then raise exception 'Role changed by another administrator';end if;
 if exists(select 1 from public.member_role_assignments where organization_id=p_org and role_id=p_role)
  then raise exception 'Reassign employees before archiving this role';end if;
 update public.organization_roles set archived_at=now(),version=version+1,updated_by=p_actor
 where organization_id=p_org and id=p_role;
 insert into public.permissions_audit_events(organization_id,actor_user_id,event_type,after_state)
 values(p_org,p_actor,'role.archived',jsonb_build_object('role_id',p_role));
end $$;

create function private.admin_assign_role(
 p_actor uuid,p_org uuid,p_branch uuid,p_membership uuid,p_role uuid,p_assign boolean
) returns void language plpgsql security invoker set search_path='' as $$
declare v_target uuid;v_role public.organization_roles%rowtype;v_perm text;
begin
 perform private.require_admin_permission(p_actor,p_org,p_branch,'permissions.assign');
 select user_id into v_target from public.staff_memberships
 where organization_id=p_org and branch_id=p_branch and id=p_membership and active for update;
 if not found or v_target=p_actor or private.subject_is_owner(v_target,p_org)
  then raise exception 'Cannot change this account';end if;
 select * into v_role from public.organization_roles
 where organization_id=p_org and id=p_role and archived_at is null;
 if not found then raise exception 'Role not found';end if;
 if p_assign then
  for v_perm in select permission_key from public.role_capabilities
     where organization_id=p_org and role_id=p_role and granted
  loop
   perform private.validate_grant_list(p_actor,p_org,p_branch,array[v_perm]);
  end loop;
  insert into public.member_role_assignments(organization_id,branch_id,membership_id,role_id,assigned_by)
  values(p_org,p_branch,p_membership,p_role,p_actor)
  on conflict do nothing;
 else
  if (select count(*) from public.member_role_assignments
      where organization_id=p_org and branch_id=p_branch and membership_id=p_membership)<=1
   then raise exception 'Cannot remove the last role from an active member';end if;
  delete from public.member_role_assignments
   where organization_id=p_org and branch_id=p_branch and membership_id=p_membership and role_id=p_role;
 end if;
 insert into public.permissions_audit_events(organization_id,actor_user_id,target_user_id,event_type,after_state)
 values(p_org,p_actor,v_target,'member.role_assignment',jsonb_build_object('role_id',p_role,'assigned',p_assign,'branch_id',p_branch));
end $$;

create function private.admin_set_user_override(
 p_actor uuid,p_org uuid,p_branch uuid,p_target uuid,p_permission text,p_decision text
) returns void language plpgsql security invoker set search_path='' as $$
declare v_sensitive boolean;
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
  if v_sensitive and not private.subject_is_owner(p_actor,p_org)
   and not private.subject_has_capability(p_actor,p_org,p_branch,'payroll.manage')
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

create function private.admin_set_module(
 p_actor uuid,p_org uuid,p_branch uuid,p_module text,p_enabled boolean,p_expected_version bigint
) returns bigint language plpgsql security invoker set search_path='' as $$
declare v_version bigint;v_previous boolean;
begin
 perform private.require_admin_permission(p_actor,p_org,p_branch,'modules.manage');
 if not exists(select 1 from public.module_catalog where module_key=p_module) then
  raise exception 'Unknown module';end if;
 select enabled,version into v_previous,v_version from public.organization_module_settings
 where organization_id=p_org and module_key=p_module for update;
 if not found then raise exception 'Module configuration missing';end if;
 if v_version<>p_expected_version then raise exception 'Module modified by another administrator';end if;
 update public.organization_module_settings set enabled=p_enabled,version=version+1,
 updated_at=now(),changed_by=p_actor where organization_id=p_org and module_key=p_module
 returning version into v_version;
 insert into public.permissions_audit_events(organization_id,actor_user_id,event_type,before_state,after_state)
 values(p_org,p_actor,'module.changed',jsonb_build_object('module',p_module,'enabled',v_previous),
 jsonb_build_object('module',p_module,'enabled',p_enabled,'version',v_version));
 return v_version;
end $$;

create function private.admin_save_position(
 p_actor uuid,p_org uuid,p_branch uuid,p_position uuid,p_expected_version bigint,p_title text,p_department text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_position uuid;v_old public.job_positions%rowtype;
begin
 perform private.require_admin_permission(p_actor,p_org,p_branch,'positions.manage');
 if btrim(coalesce(p_title,''))='' then raise exception 'Position title required';end if;
 if p_position is null then
  insert into public.job_positions(organization_id,title,department)
   values(p_org,p_title,nullif(p_department,'')) returning id into v_position;
 else
  select * into v_old from public.job_positions where organization_id=p_org and id=p_position for update;
  if not found or not v_old.active then raise exception 'Position not active';end if;
  if v_old.version<>p_expected_version then raise exception 'Position modified by another administrator';end if;
  update public.job_positions set title=p_title,department=nullif(p_department,''),version=version+1,updated_at=now()
   where organization_id=p_org and id=p_position;
  v_position:=p_position;
 end if;
 insert into public.permissions_audit_events(organization_id,actor_user_id,event_type,after_state)
 values(p_org,p_actor,'position.saved',jsonb_build_object('position_id',v_position,'title',p_title));
 return v_position;
end $$;

create function private.admin_archive_position(
 p_actor uuid,p_org uuid,p_branch uuid,p_position uuid,p_expected_version bigint
) returns void language plpgsql security invoker set search_path='' as $$
declare v_old public.job_positions%rowtype;
begin
 perform private.require_admin_permission(p_actor,p_org,p_branch,'positions.manage');
 select * into v_old from public.job_positions where organization_id=p_org and id=p_position for update;
 if not found or not v_old.active then raise exception 'Position not active';end if;
 if v_old.version<>p_expected_version then raise exception 'Position modified by another administrator';end if;
 if exists(select 1 from public.employee_position_assignments
  where organization_id=p_org and position_id=p_position and active) then
  raise exception 'Reassign employees before archiving this position';end if;
 update public.job_positions set active=false,version=version+1,updated_at=now()
  where organization_id=p_org and id=p_position;
 insert into public.permissions_audit_events(organization_id,actor_user_id,event_type,after_state)
 values(p_org,p_actor,'position.archived',jsonb_build_object('position_id',p_position,'title',v_old.title));
end $$;

-- These functions are administrative internal APIs; no browser user can call them.
revoke all on function private.subject_is_owner(uuid,uuid) from public,anon,authenticated;
revoke all on function private.subject_has_capability(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.require_admin_permission(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.validate_grant_list(uuid,uuid,uuid,text[]) from public,anon,authenticated;
revoke all on function private.admin_create_role(uuid,uuid,uuid,text,text,text[]) from public,anon,authenticated;
revoke all on function private.admin_update_role(uuid,uuid,uuid,uuid,bigint,text,text[]) from public,anon,authenticated;
revoke all on function private.admin_archive_role(uuid,uuid,uuid,uuid,bigint) from public,anon,authenticated;
revoke all on function private.admin_assign_role(uuid,uuid,uuid,uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function private.admin_set_user_override(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function private.admin_set_module(uuid,uuid,uuid,text,boolean,bigint) from public,anon,authenticated;
revoke all on function private.admin_save_position(uuid,uuid,uuid,uuid,bigint,text,text) from public,anon,authenticated;
revoke all on function private.admin_archive_position(uuid,uuid,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function private.subject_is_owner(uuid,uuid) to service_role;
grant execute on function private.subject_has_capability(uuid,uuid,uuid,text) to service_role;
grant execute on function private.require_admin_permission(uuid,uuid,uuid,text) to service_role;
grant execute on function private.validate_grant_list(uuid,uuid,uuid,text[]) to service_role;
grant execute on function private.admin_create_role(uuid,uuid,uuid,text,text,text[]) to service_role;
grant execute on function private.admin_update_role(uuid,uuid,uuid,uuid,bigint,text,text[]) to service_role;
grant execute on function private.admin_archive_role(uuid,uuid,uuid,uuid,bigint) to service_role;
grant execute on function private.admin_assign_role(uuid,uuid,uuid,uuid,uuid,boolean) to service_role;
grant execute on function private.admin_set_user_override(uuid,uuid,uuid,uuid,text,text) to service_role;
grant execute on function private.admin_set_module(uuid,uuid,uuid,text,boolean,bigint) to service_role;
grant execute on function private.admin_save_position(uuid,uuid,uuid,uuid,bigint,text,text) to service_role;
grant execute on function private.admin_archive_position(uuid,uuid,uuid,uuid,bigint) to service_role;
