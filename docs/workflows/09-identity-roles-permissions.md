# WF-09 — Identity, Roles, Positions & Permissions

**Approved direction:** User-confirmed November 3, 2026.
**Current implementation:** Live Supabase capability schema + trusted internal database operations; working offline administrative prototype; **no authenticated administrative HTTP service, real employee invitation, or production deployment yet**.

## Foundational rule

**All OneShop features must consult one central effective-permission service.** Permission decisions govern data retrieval, field visibility, navigation, page access, record mutation, task dispatch/acknowledgment, exports and reporting. The browser may hide irrelevant actions for clarity, but server checks and RLS are authoritative.

### Four separate configuration layers

1. **Position:** human organization concept: Porter, Service Writer, Shop Foreman, Service Manager, payroll structure, manager and department. A position does **not** by itself grant database access.
2. **Role/template:** reusable named collection of capabilities, e.g. Porter, Service Writer, Technician, Administrator, custom Lot Supervisor. A user may eventually hold several roles per branch.
3. **Per-user exceptions:** `inherit | allow | deny` decisions for a specified employee in a branch. These are auditable and take precedence over assigned-role grants; owner access is protected and not user-overridable.
4. **Module availability:** organization-enabled feature flag (`basic` or `advanced`), with future subscription entitlement as an additional gate. Module-disabled prevents operational use even by the owner. The owner can still administer modules.

**Effective permission calculation:**

`active branch membership ∧ existing permission key ∧ (module enabled OR administration-only permission) ∧ (owner OR user override OR assigned-role grants)`

Within the role/override calculation, `deny` wins; `inherit` uses the role(s); `allow` may be assigned only by an authorized administrator who holds that capability. All data privileges are tenant- and branch-scoped, and an employee cannot grant elevated access to themselves.

## Owner bootstrap and account creation

There are TWO different account types:

- **Dealership founding-owner account:** created through a trusted platform onboarding transaction, automatically granted protected Owner status and every administrative permission. Owner account is linked to its organization/initial branch. Basic modules enabled by default; advanced modules disabled. Never grant this ownership through public signup or a user-selected role.
- **Employee account:** invited by the owner or another authorized administrator. Receives explicitly selected role template, branch membership, position and optional user exceptions. Employees do **not** inherit Owner privileges.

The applied `private.bootstrap_dealership(owner_id, name, branch_name)` function creates the organization, first branch, Owner membership/record, core module configuration, role templates and owner profile in one transaction. It is callable by the **trusted database service role only**, not `authenticated` or `anon`. The platform onboarding service and verified Auth invitations still need implementation.

Never deactivate or delete the last Owner. Owner transfer requires a deliberate verified owner-transfer process and elevated authentication.

## Default module catalogue

| Module | Tier | Default |
| --- | --- | --- |
| Schedule & Check-In | Basic | On |
| Inspections | Basic | On |
| Unit Management / Porter Operations | Basic | On |
| RO Management | Basic | On |
| Follow-Ups | Basic | On |
| Financials | Basic | On |
| Customers | Basic | On |
| Reporting | Basic | On |
| Mobile Operations | Advanced | Off |
| Insurance & Warranty | Advanced | Off |
| Marketing Automation | Advanced | Off |
| Advanced Analytics | Advanced | Off |
| Integrations & API | Advanced | Off |

**Financials is basic; payroll information is still separately confidential.** Do not equate module enabled with universal permission to see employee compensation.

The catalog is extensible. Advanced features must be hidden/disabled until enabled. Dependencies (e.g. turning off Unit Management when ROs rely on it) require an impact warning and safe fallback. Commercial plan entitlements are not implemented by these switches.

## UX information architecture

### Users (admin navigation)
- Compact employee directory with status, name, job position, assigned template and branch. Global OneShop search remains the entry point; do not add a disconnected employee-search category selector.
- Profile tabs: **Contact, Position, Payroll, Permissions, Activity**.
- Contact: work contact information and account status.
- Position: title, department, supervisor and branch assignment.
- Payroll: wage basis/rate, effective date, employment costs. Only users explicitly granted `payroll.read` can open; only `payroll.manage` can modify; require MFA and audited backend on real data.
- Permissions: assigned role templates plus individual `Inherit / Allow / Deny` selectors, effective Allow/Deny state and provenance, and module-disabled explanation. Owner record is protected.
- Activity: immutable permission/role/account change history.
- Invite employee / suspend / deactivate via trusted identity provisioning, not raw client table edits.

### Roles & Permissions
- Standard starter roles and custom roles; compact left list, right editor of grouped permissions by operation.
- Create, clone, rename, modify permission grants, archive. Protect built-in starter templates from accidental mutation; clone to customize.
- A role cannot be archived while active employees still use it. Archive/soft delete preserves historic audit, attribution, assignments, and reporting integrity.
- Versioned editing prevents silent lost updates.

### Positions
- Create, rename, update department/reporting, archive if no active assigned employees. Position changes do not silently change permissions.

### Modules
- Two clearly separated groups: basic (on), advanced (off).
- Capability-aware switches, dependency review and change history. Owner has authority to enable advanced modules but no operational access while disabled.

### Audit
- Actor, target, old/new values or redacted classified changes, time, source/request ID, and reason where needed. Changing role template should record affected users and invalidate effective-permission caches.

## Permission registry

Source of truth: `src/domain/permissions.mjs`, `public.permission_catalog` and `public.module_catalog`.

- `users.*`: directory, invitations, update, deactivate.
- `roles.*`, `positions.manage`, `permissions.assign`, `modules.manage`, `audit.read`.
- `customer.read` vs `customer.contact.read`, `customer.manage`.
- `unit.read`, `unit.vin.read`, `unit.stock.read`, move/registration/location.
- `ro.read`, `ro.work.read`, create/update/assign/number override.
- Inspection, schedule/check-in, follow-up, reports, finance/payroll and each advanced module.

Sensitive delegation requires corresponding administration: payroll grants need `payroll.manage`, financial grants need `finance.manage`, customer-contact grants need `customer.manage`, unless granted by the protected owner. No user may edit their own grants.

## Data model applied to Supabase

In the connected OneShop project, migrations `003`–`007` add:

- `module_catalog`, `permission_catalog`, `organization_module_settings`
- `organization_owners`, `organization_roles`, `role_capabilities`
- `member_role_assignments`, `member_permission_overrides`
- `job_positions`, `employee_directory_profiles`, `employee_position_assignments`
- `private.employee_compensation`, `permissions_audit_events`
- `private.has_capability` / `private.has_org_capability` for live database RLS enforcement.
- Internal service-only operations: `admin_create_role`, `admin_update_role`, `admin_archive_role`, `admin_assign_role`, `admin_set_user_override`, `admin_set_module`, `admin_save_position`, `admin_archive_position`. All modify in transactions and write audit events. These functions require a **server-verified actor ID**; callers must not supply an arbitrary actor ID from client state.

Existing Customer/Unit/RO/Visit policies now call the central capability engine rather than coarse `staff_memberships.role_key`.

**No data operations through a browser are permitted for role/override/module/payroll changes.** Database command functions are in the private schema and granted only to `service_role`. The authenticated HTTP management service must validate the user's Supabase session, derive the actor from the verified token (not request body), check trusted permissions, call the private commands over a protected connection, and handle error/audit/fallback states.

## Important security limitations and unresolved advisor review

1. All **public** application tables have RLS, and new role/module configuration tables have only authorized read grants. No direct client CREATE/UPDATE/DELETE grants on policy configuration. Payroll is in a non-exposed private schema, with no `authenticated` or `anon` SELECT.
2. The private `system_role_templates` table has no client SELECT/WRITE grants and is not in the public Data API. Supabase's table inventory nevertheless flags RLS disabled on that private table. Further defense-in-depth option (review before applying): `ALTER TABLE private.system_role_templates ENABLE ROW LEVEL SECURITY;`. It has **not** been applied automatically; applying RLS without a service access policy could affect bootstrap paths depending on execution role. Review deployment policy and test owner bootstrap first.
3. Security advisor's `rls_enabled_no_policy` informational finding on `private.employee_compensation` is **intentional deny-by-default**; service role bypasses RLS. Do not grant payroll access to authenticated simply to silence the lint.
4. **Field-level exposure still needs hardening:** RLS is row-level. Existing `units` REST SELECT can include VIN/Stock for an employee with `unit.read`, even if a future user-specific field grant restricts it. Production must shift to server-filtered projections / trusted search RPCs and revoke inappropriate raw table/column access before onboarding real staff. Likewise for sensitive customer contacts and RO work. UI-only masking is not sufficient.
5. Service-role APIs must never be exposed directly in client code. Real admin controls require verified JWT, branch scope, anti-CSRF/rate limits and sensitive-action re-authentication/MFA.
6. Tested SQL migration execution, permission catalog/operation grants and pure evaluator; **not yet tested with two actual authenticated tenants and real sessions**. Complete adversarial RLS, concurrency, last-owner, payroll and module-state tests in an isolated development environment before pilot.

## Cross-module enforcement and handoff requirements

- Page access and navigation derive from backend effective-permission response; hidden controls are only presentational.
- Universal search consults central `searchFieldGrants` before matching or returning customer/VIN/stock/RO/work results. No forbidden match counts, highlights or existence disclosures. Offline demo reuses same role templates; production requires server-side filtering.
- Every assigned task requires a capable user or capable role queue. If an employee loses access, open tasks are reassigned/escalated; no silent orphaning. Notifications do not grant permission to open restricted records.
- Logging, exports, financial reports, attachments and background automations use the same server-side grants.
- On access/template/module changes: audit, invalidate client cache, recompute assigned queues, and require explicit acknowledgment for elevated roles.

## Rollout gates (next implementation step)

1. Isolated development Supabase branch/project, working trusted backend, and owner Auth onboarding/invite.
2. Verified two-tenant accounts, several roles and per-user overrides with positive/negative permission tests.
3. One Users CRUD page wired to live authorized backend, not mock data.
4. Secure contact and compensation projections, MFA for payroll and critical permissions, and full audit retrieval.
5. Cross-module search, Move, Check-In and RO service activation using the same permission resolver.
6. Production readiness review and module dependencies, then merge stacked PRs and deploy.

## Prototype status

`prototypes/users-permissions.html` is a **fictional offline admin review**. You can test user tabs, roles (clone/customize/archive), positions, overrides, module switches and role-simulated access. It has no real authentication, does not invite anyone, does not write to Supabase and does not expose real payroll.
