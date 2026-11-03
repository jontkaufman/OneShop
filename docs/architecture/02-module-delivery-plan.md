# OneShop Module-by-Module Engineering Plan
Status: architecture sequencing proposal for review, not deployed functionality.
Strategy: vertical slices, one module per reviewable PR/migration set, with role-focused UI and realistic end-to-end fixtures. Preserve the October operating requirements without implementing the entire product simultaneously.

**Display identification across modules (confirmed November 3, 2026):** employee roles select primary/secondary unit identifiers globally (examples SW customer/RO, technician RO/VIN, porter stock/VIN, sales stock/model). Build a reusable UnitIdentity presentation component over authorized record projections, not per-page formatting rules. Specification: [WF-06 Role-Based Unit Identification](../workflows/06-role-based-unit-identifiers.md). Display preference must never grant customer/VIN/RO read permission, and ambiguous multiple ROs must be resolved by assignment context.

**Global, permission-filtered discovery (confirmed November 3, 2026):** Search is a shared application-shell service spanning all modules. Unit registration and Create RO reuse it rather than creating separate identifier search forms. Exact VIN/stock/RO matching ranks highly; related customer, work and future-module results require field-level access. Filter server-side *before* returning results or match counts. Contract: [WF-08 Universal Search](../workflows/08-global-universal-search.md). The current demo is offline only.

## Platform prerequisite: Identity, Roles & Permissions

**Confirmed as a core architectural requirement (November 3, 2026).** Every app module must use central effective permissions for navigation, reads/search, writes, task handoffs, exports and background processes. Account owner = full administrative authority, basic modules on, advanced modules off. Employee roles/templates, per-user overrides, job positions, module toggles and payroll security must remain separate. The database capability resolver and internal commands are applied; the browser admin interface is still an offline review. Do not roll out real accounts until trusted invite/admin endpoints, field-level authorized projections, two-tenant RLS tests, and independent development environment exist.

See [WF-09](../workflows/09-identity-roles-permissions.md).

## Current highest-priority cross-module slice: Unit Intake → Porter → Receiving Team

**User-confirmed November 3, 2026:** any authorized branch employee may register a unit; Service Writer owns the rich check-in workflow; each new workload requires a targeted actionable notification; a porter receives a complete unit/move card, and confirmed delivery notifies both requester and receiving person or role. The durable work-task + notification infrastructure is **cross-cutting** and must be implemented with the first move flow, not postponed until the old standalone communication module.

Build smallest connected stages: (A) identity/tenant/canonical records, (B) SW check-in/visit event, (C) location type registry + porter role queue and move request/claim, (D) confirmed physical delivery + requester/receiver notification. The **advanced** map editor remains its dedicated module; its stable logical location/type contract is specified now so temporary routing fixtures cannot corrupt its future model.

Current contract: [WF-05 Operational Handoffs and Notifications](../workflows/05-operational-handoffs-and-notifications.md). Workload ownership, notification persistence, team inbox, role/user permissions, routing fallbacks and idempotency are acceptance criteria for the first end-to-end pilot.

## Gate 0: repository and deployable application baseline (prerequisite)
**Observed:** GitHub is documentation-only; the hosted OneShop prototype source, deployment pipeline and Supabase application wiring are not in this repository. Do not write production schema assuming that the hosted app is the repository's code.
Deliver: recover legally usable editable prototype source **or explicitly rebuild** it; inventory routes/screens/state/code, identify reusable UX, document parity gaps; establish React+TypeScript build/test workflow, preview, environment separation and secure client setup; create one health/readiness page with verified Supabase access through publishable credentials.
Acceptance: git checkout builds from source; CI runs typecheck/lint/test; preview deploy is reproducible; environment points to explicitly named database project; no secrets in git; two browser sessions can sign in and sign out. Any demo or mock pages labeled as such.
No production database mutation is justified by this architecture-doc PR.

**Canonical business hierarchy locked:** Customer -> Unit (RV/vehicle) -> RO -> RO Line Item. The physical onsite visit is a related unit-linked record, not an extra display level. Historical ownership is effective-dated; RO records preserve their original customer context.

## Module 01 — SaaS foundation and shared operating records
Dependencies: Gate 0.
Backend: organizations, branches, memberships/branch roles, permissions, customer, unit, unit/customer relationship, onsite_visit, repair_order, ro_line_item and audit events. Use tenant-safe FKs, constraints and RLS.
Frontend: org/branch switch, invite/login shell, customer/unit search and create, visit start and multiple RO association, advisor ownership, RO overview with relevant unit + visit context.
Tests: cross-tenant denied, branch permissions denied, same RV with two open ROs, owner changes preserve unit history, idempotent RO upserts, stable unit IDs.
Outcome: **one authenticated dealer can find a unit, its visit, its separate ROs, their line items, and the next responsible person**.
Do not ship invoice posting, a map editor, or live CDK as part of Module 01.
Detailed build contract: docs/modules/01-foundation-and-records.md.

## Module 02 — Site configuration and physical map editor
Dependencies: Module 01 branch/site.
Backend: physical_location, location_type, property_map, map_placement, configuration draft/revision/publication, background asset references, immutable revision history.
Frontend: configure branch/map image, multiple map views, numbered single spaces, line/grid generation, grouped editing, shared shaded areas, save/draft/review/publish, zoom/pan/label/border scaling, undo/redo, touch.
Validation: duplicate codes, occupied-space retirement, accidental overlaps, shape bounding, same physical space on multiple maps. Draft publication must not change live occupancy.
Tests: supplied property-map-editor.md acceptance, draft concurrency, save/reload, mobile gesture boundary, and one published overview map with service/detail/wash/Waiter Way/storage positions.
Outcome: branch manager can import a site plan and create a correct property layout without engineering assistance.

## Module 03 — Live occupancy, movements and keys
Dependencies: Modules 01-02.
Backend: live occupancy and occupancy events, movement_request and lifecycle, key/packet custody; atomic exclusive move claim and completion with version/locking, one-space capacity checks, idempotency, stale-request rejection.
Frontend: map search/filter, requested destination (not actual), move queue/card, claim/pickup/delivery/problem and dotted visual route, manager priority, packet/key handoff indicators.
Tests: competing porters; repeated delivery; two ROs one unit; duplicate location; multi-unit zone capacity; missing packet after correct unit placement; superseding request cannot be completed late.
Outcome: location known with confirmed source and actor; every live move auditable; two staff cannot both claim one move.

## Module 04 — Dispatch, work progress and departmental handoffs
Dependencies: Modules 01 and 03 for map-dependent dispatch.
Backend: assignment, handoff, work-state transitions, blockers, task owners and due dates.
Frontend: advisor intake queue, foreman left-center-right workspace, technician job cards, scoped department queues; handoff acknowledgment distinct from completion; blocked work remains visible.
Tests: send to service with real recipient; foreman assigns tech and destination bay; blocked line does not freeze unrelated job; handoff reassignment/return with cause.
Outcome: actual foreman/service/porter chain, with no lost unowned work.

## Module 05 — Parts and warranty coordination
Dependencies: Module 04.
Backend: part_requirement, receipt and allocation quantities; unit-vs-job blockers; warranty authorization/claim/follow-up with separate states.
Frontend: parts table (RO, line, qty, ETA, reason) and warranty table (auth, claim, evidence, next action). Reimbursement is optional.
Tests: partial receipts, allocation across jobs, customer commitment risk, partial warranty approval, delayed claim after repair completion.
Outcome: parts and warranty holds have authoritative owners and actionable queues. Full purchasing and accounting remain excluded.

## Module 06 — Messaging, notifications and escalation
Dependencies: prior task/owner models.
Backend: conversations/messages (dealer/department/RO scopes); notification recipient state, acknowledgment and business-hour escalation configuration, delivery attempts/outbox.
Frontend: linked RO conversations and aggregated inbox, targeted acknowledgments, escalations, clear explanation of next responsible team.
Tests: after-hours message waits, remaining business-time resumes, 1h lead / 2h advisor / 3h management when distinct, duplicate-role avoidance, ack halts ack escalation but does not close a blocker.
Outcome: required operational communication no longer relies exclusively on radio or a physical board.

## Module 07 — QC, pickup readiness and departure
Dependencies: Modules 01, 03, 04, 05 and relevant notifications.
Backend: QC evidence/results/rework, visit-level release checklist, explicit deferrals, cabinet return event, advisor release approval, physical departure.
Frontend: technician QC request, wash/detail card, writer QC, advisor release gate with all open ROs, departure action.
Tests: work complete != QC; wash/detail before final QC where required; failed QC reopens work; multiple ROs; explicit unfinished-work override; no automatic removal from map on approval; return of keys separate from QC.
Outcome: controlled end-to-end service-to-customer pilot can be operated safely.

## Module 08 — Scheduling, operational metrics and pilot hardening
Dependencies: 01-07.
Backend: appointments, arrival, estimates of time (wait/storage/bay), statuses; read models for late pickups, overdue handoffs, stale locations and unit dwell; observability.
Frontend: advisor calendar/current commitments, foreman backlog, measured operational bottlenecks. External customer scheduling links are an extension, not first-pass core.
Tests: time zones, overbooking rules (after explicit capacity policy), query load at 300 units/site, shared tablets, connection loss and sync recovery.
Outcome: field pilot with reproducible workflow tests, correction loop and metrics.

## Module 09 — Customer scope, proposals and approvals
Dependencies: RO line items and master records; informed by approved invoice-design baseline.
Backend: findings/recommendations, variants, priced lines, presented document snapshots, customer decision (ACCEPT / DEFER / DECLINE / unanswered), paper-entry evidence, immutable authorizations, deduplicated routing to same/new draft RO.
Frontend: concise gray-square shop documents, writer response transcription, mobile customer approval, next-visit follow-up.
Tests: mutually exclusive variants, no charges for unselected recommendations, stale signature invalid, paper scan attached, accepted recommendation creates exactly one draft job, no auto-execution from request alone.
Outcome: commercial scope and future work flow without a full accounting replacement.

## Module 10 — Financials, profitability and advanced integration (separate incremental releases)
Dependencies: 09, executed work, approved jurisdiction/tax/payment models.
Potential releases: immutable invoices and payer allocations; hosted payment and reconciled applications; warranty/insurance and internal sales charge accounts; price book and quoted vs actual labor; technician hourly/flat/combination pay; shop overhead, direct job profitability, balancing/internal jobs; CDK import adapter, later writeback only with verified contract.
**Constraint:** warranty-paid hours, retail labor charge, technician payroll cost, fixed and variable overhead, customer vs sales internal rates and balancing charges are distinct values. Do not collapse into one 'labor rate' or 'profit'.
Tests: exact decimal calculations, settlement/reversal, audit-proof posting, tenant-specific rules, regulatory review, prior-owner privacy.
Outcome: optional advanced finance capabilities, not a prerequisite to the initial dealership coordination pilot.

## Common completion gate for EVERY module
1. Acceptance criteria written and approved before implementation.
2. Database migration up/down or forward correction strategy committed and reproducible.
3. Tenant isolation, branch authorization, server invariants and audit for every write.
4. Generated types, frontend UI, responsive/mobile behavior, errors and empty/loading states.
5. Automated unit, DB integration, state transition, concurrency, RLS negative, and E2E tests as relevant.
6. Observability: correlated errors and sufficient audit without logging secrets or unnecessary customer data.
7. Demo data marked fictional; manual scenario exercised in preview; no inaccessible hidden data paths.
8. Documentation and ADR updated; CI green; reviewer approval before merge; no claim of production parity without verified deployment.
9. Rollout/backfill/rollback strategy when modifying existing data; verify post-deploy read/write with safe test records.
10. Module may be accepted only when a real role can complete its intended workflow, not merely when database tables exist.

## Pilot measurement recommendations
- Confirmed vs unknown/stale unit locations and median time to locate.
- Move queue claim time, move completion time, canceled/stale requests.
- Handoff acknowledgment latency and department queue aging.
- Work delay by parts, warranty, assignment and movement.
- On-time pickup commitments vs late and reason.
- Percentage of visits with full release/packet/keys checklist.
Measure against a documented baseline; goals and SLAs require pilot data.
