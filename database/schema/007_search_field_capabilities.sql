-- Align global search field permissions with the central permission catalogue.
insert into public.permission_catalog(permission_key,module_key,label,sensitive) values
 ('unit.vin.read','unit_management','Search and view VIN',false),
 ('unit.stock.read','unit_management','Search and view stock number',false),
 ('ro.work.read','ro_management','Search RO work descriptions',false)
on conflict(permission_key) do nothing;

update private.system_role_templates
set permissions=array(select distinct value from unnest(permissions||array['unit.vin.read','unit.stock.read','ro.work.read']::text[]) as p(value))
where slug='administrator';
update private.system_role_templates
set permissions=array(select distinct value from unnest(permissions||array['unit.vin.read','unit.stock.read','ro.work.read']::text[]) as p(value))
where slug='service_writer';
update private.system_role_templates
set permissions=array(select distinct value from unnest(permissions||array['unit.vin.read','unit.stock.read']::text[]) as p(value))
where slug='porter';
update private.system_role_templates
set permissions=array(select distinct value from unnest(permissions||array['unit.vin.read','unit.stock.read','ro.work.read']::text[]) as p(value))
where slug='technician';
update private.system_role_templates
set permissions=array(select distinct value from unnest(permissions||array['unit.vin.read','unit.stock.read','ro.work.read']::text[]) as p(value))
where slug='foreman';
update private.system_role_templates
set permissions=array(select distinct value from unnest(permissions||array['unit.vin.read','unit.stock.read']::text[]) as p(value))
where slug='sales';
update private.system_role_templates
set permissions=array(select distinct value from unnest(permissions||array['unit.vin.read','unit.stock.read','ro.work.read']::text[]) as p(value))
where slug='parts';
update private.system_role_templates
set permissions=array(select distinct value from unnest(permissions||array['unit.vin.read','unit.stock.read','ro.work.read']::text[]) as p(value))
where slug='pdi';

-- Grant the new search fields to existing system roles only; never alter custom
-- roles or user-specific overrides. Owner already has full catalog authority.
insert into public.role_capabilities(organization_id,role_id,permission_key,granted)
select r.organization_id,r.id,p.value,true
from public.organization_roles r
join private.system_role_templates t on t.slug=r.slug
cross join lateral unnest(t.permissions) as p(value)
where r.is_system and p.value in ('unit.vin.read','unit.stock.read','ro.work.read')
on conflict(organization_id,role_id,permission_key) do nothing;
