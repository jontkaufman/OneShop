# Module 01 Engineering Specification — Tenancy, Identity and Operating Records
Status: PROPOSED. Build after Gate 0 app source, CI and environment verification. This is not an executed migration.

## Objective and acceptance outcome
One authenticated employee of a dealership branch can locate or create a customer/unit, begin an onsite visit, associate multiple independent ROs and their jobs, identify the responsible advisor and switch to another authorized branch. No tenant can access or modify another tenant's data. This is the smallest useful authoritative record layer for future property maps, moves, QC, billing and integrations.

## Intended vertical slice
1. Tenant administrator creates/configures dealership org and branch (bootstrap via trusted server flow).
2. Authorized staff joins/uses org; branch membership and role capability resolve securely.
3. Advisor searches by full VIN, last six VIN, stock number, unit/customer name or RO number; disambiguation required on collisions.
4. Advisor creates/selects customer and unit; adds actual responsible/contact/ownership relationship with start/end and consent rules.
5. Advisor creates visit; records scheduled dropoff vs actual arrival independently; can attach two simultaneous ROs on the same physical unit.
6. Each RO contains own number, advisor, customer/bill-to, work classification, list of stable service jobs and independent progress.
7. Search/overview surfaces unit-level context, all active ROs, visit coordinating advisor, commitments, next owner and an honest 'location not yet configured' placeholder.
8. Every write captures actor and audit record. Users can safely sign out/switch branch, with cache cleared/refiltered.

## Schema proposal (names/columns subject to migration review)
All application IDs are UUIDs; time points timestamptz; external IDs stored separately. Every operational row carries organization_id; branch-dependent rows carry branch_id.
- organizations: id, slug, legal/display_name, status, created_at, updated_at
- branches: id, organization_id, code, name, timezone (IANA), location/address fields, status
- org_memberships: id, organization_id, user_id (auth.users), status, invited_by, created_at
- branch_memberships: id, organization_id, branch_id, org_membership_id, status
- role_assignments: id, organization_id, branch_id?, org_membership_id, role_key, grant_source; authority to assign separate and audited
- customers: id, organization_id, display_name, nonpublic contact fields, created_at, archived_at
- customer_contacts: id, organization_id, customer_id, contact_name, channel/preferences, authority_type, valid_from/to
- units: id, organization_id, vin nullable, stock_number nullable, year/make/model, coach/chassis/serial refs, archived_at
- unit_customer_relationships: id, organization_id, unit_id, customer_id, relation_type, valid_from/to (history)
- onsite_visits: id, organization_id, branch_id, unit_id, coordinating_advisor_membership_id, scheduled_dropoff_at, arrived_at, promised_pickup_at, promise_type, departed_at, status
- repair_orders: id, organization_id, branch_id, visit_id, unit_id, customer_id, advisor_membership_id, source_system, external_ro_id, ro_number, work_type, status, created_at
- service_jobs: id, organization_id, branch_id, repair_order_id, job_number, title, work_state, owner_user_id?; job numbering stable and scoped
- audit_events: id, organization_id, branch_id?, actor_user_id, action, entity_type, entity_id, from_state/to_state, occurred_at, correlation_id, limited structured metadata
- external_references (future adapter compatibility): id, organization_id, source_system, external_kind, external_id, internal_kind, internal_id; unique scoped source-key relationship.

### Referential integrity
- Use composite scoped constraints / FK patterns so branch and org of child row must match parent; branch belongs to same org as membership, visit, RO and job.
- RO unit must match the visit's unit, unless an explicit future exception is modeled; no update should silently reassign it.
- Permit multiple simultaneously open ROs per unit/visit; do not create a unique constraint on RO.unit_id.
- A unit's external identifier might be absent/duplicated or inaccurate. Treat VIN equality as a search/match candidate, not an unchecked tenant-wide merge.
- Service job has one RO; department tasks later reference this job as needed.
- Separate active and historical ownership relationships. Customer display at time of older RO does not dynamically become the new owner's private information.

## Security and permission design
Core roles are presets; permissions are server-side capabilities. Suggested capability table:
| Capability | Admin | Advisor | Foreman | Technician | Porter |
| --- | --- | --- | --- | --- | --- |
| org/branch admin | yes | no | no | no | no |
| customer/unit read | yes | yes | yes | operational minimum | operational minimum |
| customer/unit write | yes | yes | configured | no | no |
| visit/RO create & amend | yes | yes | configured | no | no |
| job assignment | yes | no | yes | no | no |
| own assigned job progress | yes | limited | yes | yes | no |
| audit/export | restricted | assigned scopes | limited | no | no |
This matrix is a starting policy, not user-approved. Parts/warranty/sales/PDI/wash/detail capability presets will follow in later modules. Organization membership does not automatically imply access to all branches or all private contact details.
Supabase Auth authenticates user. Trusted backend handles invitations/role assignments; browser never inserts its own role grant. RLS default deny, with tenant and branch membership checks on every exposed table. Use per-operation RPC/server command for scope-sensitive changes; never trust organization_id supplied in the browser without checking membership.
Private storage and sensitive contact fields require separate policies. RLS SELECT alone cannot enforce field-level redaction for every use case; return safe projections or scoped APIs to floor staff.

## API/command and query contract
Read: list-authorized-branches, search-units, get-unit-overview, get-visit-context, get-ro-details, list-my-work (later), list-customer-history (permission filtered).
Writes: create-customer, create-unit, link-unit-customer, start-visit, attach-ro-to-visit, add-service-job, assign-advisor, update-promise. Each validates actor, tenant, branch, entity linkage, expected version and audit.
Import: native records first. A future CDK connector uses external_references to upsert without overwriting locally owned operational history.
Represent failure explicitly: not_authenticated, no_branch_access, permission_denied, version_conflict, duplicate_external_reference, invalid_transition, invalid_unit_reference.
Avoid promising GraphQL or bespoke REST before deployment platform decisions. Use typed command interface so implementation can be RPC/Edge/server handler as appropriate.

## Migration strategy / deployment plan
M01-A: schema + constraints + indexes + RLS/policies. M01-B: bootstrap memberships and branch admin, no open self-grant. M01-C: seed fictional org/site/units/RO fixture in preview only. M01-D: typed app query/command integration. Never insert actual dealership/customer data into fixtures.
Use migrations tracked in GitHub, verify with Supabase against explicit project ref and nonproduction branch/environment first. For this project, no production tables exist yet. Resolve production-vs-development environment before first mutation.
Index candidates: (organization_id,branch_id,ro_number); (organization_id,vin); (organization_id,stock_number); (organization_id,unit_id,status) for visits; (organization_id,branch_id,advisor_membership_id,status) for ROs; stable unique external source key as scoped.
Backfill is not needed initially but migrations must remain forward-compatible with branch hierarchy and eventual source integration.

## Test-driven acceptance matrix
- T01: user in tenant A cannot select/read/change tenant B customers, units, visits, ROs, storage or audit, including guessed IDs.
- T02: member of branch A without branch B membership cannot access branch B operational rows.
- T03: user cannot self-promote to manager or approve own invitation simply by altering frontend inputs or user metadata.
- T04: same unit and visit has two open ROs with independent advisor, status, jobs and promises; visit coordinating advisor is explicit.
- T05: two units may share last-six VIN substring; search shows disambiguation and never silently merges.
- T06: older owner and newer owner cannot view each other's private contacts, payments and attachments through unit history.
- T07: RO cannot link unit from different organization or visit with mismatched unit; database rejects it.
- T08: duplicated client retries create no duplicate RO when same idempotency key/source key used.
- T09: branch switch cannot leak cached record results or stale row mutation into another branch.
- T10: audit records correct actor/action before/after and failures are visible without disclosing secret/customer fields.
- T11: create/read/edit/search works from desktop and mobile; clear empty/loading/conflict states.
- T12: a fresh checkout of the repository deploys preview and runs a smoke test against explicitly intended Supabase environment.

## Definition of done
Approved ADR-001/002/004/005, reviewed SQL migrations, RLS negative tests, API types and UI, CI green, reproducible preview, runbook and seed fixture, read/write smoke evidence. Without these, Module 01 is not complete.
