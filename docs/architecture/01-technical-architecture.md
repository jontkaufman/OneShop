# OneShop Technical Architecture (Proposed)
Status: design proposal; no schema or application code has been deployed. Changes require module-by-module review and tests.

## Architectural style
Use a **modular monolith** initially: React + TypeScript frontend, typed data/command boundary, Supabase Auth/Postgres/Storage/Realtime backend. Domains share a deployment but have explicit owners and interfaces. Avoid premature microservices. Keep the hosted prototype as a separate, unverified artifact until editable source is recovered or rebuilt.
Domains: identity/tenancy, customer/unit master, visits/ROs/RO-line-items, property setup, occupancy/moves/key custody, dispatch/handoffs/blockers, parts/warranty, communications/alerts, pickup/QC, scheduling, document/authorization, finances/reporting, integrations.
Command handlers (transactional SQL functions or server endpoints) implement high-integrity writes. Simple authorized reads may use client data queries under RLS. Do not place move-claim, release, approval, posting, or tenant-admin integrity entirely in browser state.

## Tenant, branch and authorization model
organizations -> branches -> memberships/role grants; users are Supabase Auth principals, not inherently tenants. Membership can be multi-organization and multi-branch. Permission checks must be enforced on every command and read server-side.
Every tenant-owned row carries organization_id. Branch-scoped operational rows also carry branch_id. Where possible, use compound foreign keys or explicit scoped validation to forbid linking an RO in tenant A to a unit in tenant B. Never rely solely on hidden frontend filters.
Use role permissions for actions, not UI visibility. Example capabilities: site.configure, ro.read, ro.manage, job.assign, move.request, move.claim, location.confirm, qc.record, release.approve, financial.post. Branch and tenant membership gates still apply. Customer external links must use short-lived explicit scoped capabilities.
RLS enabled on **all** exposed tables; default deny. Resolve tenant membership with trusted server-owned membership tables and auth.uid(), not raw_user_meta_data. Never expose privileged service-role or secret keys to browser bundles; publishable key is fine with correct RLS. Treat stored file object keys, Realtime channels, search, RPC, export and signed URLs as authorization boundaries too.
Recommended security tests: impersonate two organizations and two branches; deny read, joins, storage download, RPC, realtime delivery, and ID-enumeration for other tenant. Audit admin impersonation, membership changes and role escalation. Ensure security-invoker views or otherwise restrict privileged views.

## Canonical hierarchy contract (CONFIRMED)

`Customer -> Unit (RV/vehicle) -> RO -> RO Line Item` is the business browsing, grouping and service-scope contract. One customer can display many units, a unit many ROs (including concurrent ROs), and each RO many line items. A line item is a single actionable RO service operation, not a loose part/price entry. Line-item components and assigned department tasks may be modeled beneath or attached to it.

In physical storage, the Unit retains an independent durable identity and an **effective-dated** customer relationship; ROs retain a historical customer/bill-to snapshot and belong to exactly one unit. This permits resales, multiple responsible people, fleet ownership and history retention. The hierarchy must not be implemented as destructive ownership-based cascading deletion. Onsite visits are a separate unit-linked operational grouping across ROs, not a mandatory level between Unit and RO.

## Record ownership and relational outline
organization(id,slug)
branch(id,organization_id,time_zone,operating_calendar)
membership(id,organization_id,user_id,status)
role_grant(id,membership_id,branch_id?,capability/role)
customer(id,organization_id)
customer_contact / unit_ownership(organization_id,...)
unit(id,organization_id,vin,stock_number,coach/chassis identifiers...)
onsite_visit(id,organization_id,branch_id,unit_id,arrival_at,departure_at,release_state,advisor_id)
repair_order(id,organization_id,branch_id,unit_id,visit_id,customer_id,advisor_id,ro_number,external_source,external_id)
ro_line_item(id,organization_id,branch_id,repair_order_id,line_number,description,execution_state)
finding / recommendation (later, tied to stable unit+RO-line-item lineage)
physical_location(id,organization_id,branch_id,type,code,capacity,retired_at)
property_map(id,organization_id,branch_id,revision,background_file_key,status)
map_placement(id,organization_id,branch_id,map_id,location_id?,geometry,revision)
occupancy(id,organization_id,branch_id,visit_id,unit_id,location_id,confirmed_at,confirmed_by,move_id)
movement_request(id,organization_id,branch_id,visit_id,origin_location_id,destination_location_id,claimed_by,status,version,idempotency_key)
key_custody_event(id,organization_id,branch_id,unit_id,custodian/location,event_type)
handoff / blocker / task / notification / message / audit_event (scoped and linked to stable records)
document_snapshot / authorization / invoice / payer_allocation / payment_application (future modules)
The above is a conceptual model, **not** an approved migration. Normalize authoritative relationships; JSONB may hold map geometry and document snapshots but not replace tenant-safe FK links.
Use internal UUID primary keys and separate human-readable numbers. Scoped uniqueness: (organization_id,branch_id,ro_number,external_source) where rules permit; (branch_id,physical_location.code) active code uniqueness. Do not assume VIN or customer phone is globally unique. History retains IDs and timestamps through archive/soft retirement.

## State machines and transactional commands
For every stateful entity define legal transitions, required capability, precondition, resulting events, version behavior and compensating action. Begin with:
- Move: requested -> available -> claimed -> picked_up -> delivered; alternatives blocked, canceled, superseded. Physical location updates only in transaction that confirms delivered; capture actor and packet confirmation separately.
- Work: queued -> assigned -> in_progress -> technician_completed -> qc_pending -> qc_passed, with blockers and rework as independent dimensions.
- Visit: expected -> arrived -> onsite -> release_pending -> released -> departed. Release requires a cross-RO checklist or an explicit authorized exception. Departure requires actual handover.
- Map configuration: draft -> validated -> published -> archived with immutable published revision history. Config version conflicts return an explicit conflict; never overwrite other editors silently.
- Commercial future: proposed/presented, decision, authorization, completion, posting and settlement are distinct states, revisions immutable.

Use Postgres transactions, constraints and atomic update preconditions. For move claims use compare-and-set on status/version or SELECT ... FOR UPDATE. Guard source location and active visit at completion; handle concurrent requests via queuing/supersession without silently deleting history. For one-capacity physical spaces, prevent double confirmed occupancy; shared areas use capacity policy with actual occupancy counts and transactional admission.
Implement idempotency keys on external/webhook and user commands (claim retries, approval submit, release, invoice post). Event log/outbox written in same transaction as state change, then notifications can retry safely. Avoid treating Realtime notifications as an authoritative event store.

## Property map design
Separate persistent logical location from visual placement. A location is an addressable bay, single-unit parking space, storage spot or named shared area. One logical location may appear in multiple maps; publishing a new map does not move a unit.
Property image and coordinate system are immutable assets per revision or explicitly versioned. Store normalized geometry or defined source-image coordinates with reference width/height, not viewport pixels. For scale-dependent editing use an explicit coordinate transform (image -> world -> viewport). Pan/zoom viewport state must never persist as new physical geometry. SVG labels/borders constrained by actual on-screen marker footprint; hide unfit labels, preserve accessible identifiers and adequate hit targets.
Multi-unit areas have capacity and list/count of units, plus occupancy policy. Overlap detection applies to individual spaces and configurable exclusion zones; a zone may intentionally overlay spaces without duplicating physical capacity. Draft validation checks duplicate labels, accidental overlaps, boundary, orphan placements and occupied-space retirement.

## Integrations and data authority
CDK: **not integrated**. Build source-adapter interface with ingestion records (tenant, source, external key, observed_at, checksum/version) and explicit field ownership. Imported RO numbers may update external-facing fields, never overwrite local handoff/location history. Idempotent upserts and reconciliation report required. A field-by-field synchronization contract must be approved before live sync or writeback.
Intertrak: **separate**. Define future event/API contracts only, no shared tables by assumption.
Files/storage: private buckets, storage policies scoped to tenant+branch+linked record; short-lived URLs for authorized view. Customer documents published from approved snapshots, not unfiltered staff notes.
Scheduling/alerts: time_zone per branch; store instants in timestamptz and business-hour calendars separately; pause escalations outside business hours as agreed. Queue delivery and persist attempted sends/acknowledgments.

## Performance, resilience, and observability
Baseline workload: 100-300 units present at a dealership; eventual thousands of tenants. Define measurable performance budgets from pilot observation, not arbitrary SLA promises. Query indexed scoped datasets with pagination and server filters; spatial placements/occupancy should be projected efficiently. Index tenant/branch plus status/updated_at, active visit+unit, RO number, location, open queue owner and due_at. Test with many moves/alerts at shift transitions.
Record actor, correlation_id, request_id/idempotency key, command outcome, previous/new state and tenant for operational audit. Separate append-only audit from discussion messages. Establish backups/PITR and restore drills according to actual plan entitlement; log retention and export policies per tenant. Put irreversible financial actions behind stronger permission and reconciliation controls.
Pipeline: tracked SQL migrations, generated DB types, lint/typecheck/unit+integration/E2E tests, RLS negative tests, preview environment and staged promotion. A change is not done until repo code, schema, tests and production-readiness evidence reconcile.

## Non-negotiable technical prohibitions
- No front-end direct edits to privileged state bypassing server checks.
- No static global tenant variable or user-editable JWT claims as authorization.
- No secret/service-role in public repo or browser bundle.
- No automatic occupancy update on merely requesting/dragging a move.
- No single generic status field for RO, job, movement, warranty, release and billing.
- No financial posting based on merely accepted or unfinished work.
- No unverified claims of CDK/Intertrak integration, prototype parity or deployed functionality.
