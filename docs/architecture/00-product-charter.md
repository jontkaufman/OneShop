# OneShop Product Charter and Requirements Baseline
Status: proposed architecture baseline for review (2026-11-02). Not implementation evidence.
Sources: OneShop design sessions Oct 14-21, OneShop Dealership Communication Platform Plan v0.1, OneShop Invoice Design Review, existing property-map-editor.md.
Decision labels: CONFIRMED = explicitly agreed operating requirement; PROPOSED = technical recommendation to validate; DEFERRED = explicitly beyond initial vertical slice; OPEN = decision not yet established.

## Mission and product boundary
**CONFIRMED:** OneShop is the coordination layer between the front desk, service shop, physical lot, parts, warranty, wash/detail, PDI, and sales. Repair orders (ROs) are the operational anchor; a stable RV/unit record is the physical anchor. Coordinate work and communications, not duplicate a complete CDK/DMS. CDK is a future external data source, with fields, rights, and writeback unverified. Intertrak inspection execution remains a separate product now; future integration is deferred.
**PROPOSED:** Design OneShop as multi-tenant SaaS from first migration, with organization -> branch/site -> user memberships. Preserve branch and tenant boundaries in every persisted domain record.

## Jobs OneShop must do
- At intake, associate a customer, one physical unit, one onsite visit, and one or more ROs; multiple simultaneous open ROs may belong to the same unit.
- Make current confirmed location visible and distinct from requested destination and in-flight move.
- Replace informal handoffs with assignable and acknowledgeable departmental work queues.
- Dispatch technicians and target bays by shop management, with porters claiming physical moves from a common queue.
- Identify why work is blocked, who owns the next action, and which customer commitment is at risk.
- Coordinate service completion -> wash/detail when required -> writer QC -> keys/packet return -> advisor release -> physical departure.
- Give users role-specific, simple interfaces while maintaining one shared history and linked conversation.
- Preserve customer decisions, authorization, price revisions, payments and follow-up as separate states once the commercial module is built.

## Roles and operational responsibilities (CONFIRMED)
| Actor | Primary responsibility |
| --- | --- |
| Service advisor / writer | Intake, customer commitments, RO coordination, QC review, customer communication, approved deferrals, final release |
| Foreman / dispatcher / shop management | Assign work and technicians, select bay, dispatch packets, set move priority, resolve conflicts |
| Technician | Perform work, record evidence and blockers, confirm work completion, request writer QC |
| Porter / forklift driver | Claim move, collect required packet/keys, physically move unit, confirm delivery and physical handoff |
| Parts | Track part requirements, ordered/received/allocated quantities, delays and affected service lines |
| Warranty administrator | Track authorization, claim submission, missing evidence and follow-ups; reimbursement tracking optional |
| Wash / detail | Execute preparation work and raise movement requests/blockers |
| PDI / inventory preparation | Prepare inventory units and identify needed corrections |
| Sales | See inventory readiness, request preparation/movement, coordinate handoffs |
| Manager / authorized accounting role | Cross-department visibility, overrides and financial review when commercial features launch |

No separate Delivery department is assumed. Individuals may have multiple roles. On shared devices, every action must identify the actual employee.

## Canonical business identities (CONFIRMED or PROPOSED as annotated)
- **Organization/tenant** (PROPOSED): SaaS security and billing boundary. A dealership group can own multiple branches.
- **Branch/site/property** (CONFIRMED site; PROPOSED hierarchy): physical location and time zone, business hours, operating settings, map collection.
- **Unit** (CONFIRMED): stable RV identity with VIN, stock number, make/model, identifying photo; last six VIN + abbreviated year/make/model + customer for operating display. Ownership/customer links can change without losing asset history.
- **Onsite visit** (CONFIRMED): physical arrival/departure, pickup promise, release authority spanning ROs. Must not equal one RO.
- **Repair order** (CONFIRMED): customer, unit, advisor, dates, work items, external source/number, communication. One unit can have multiple concurrent ROs.
- **Service job** (CONFIRMED across invoice design): stable work identity linking proposed scope, performed work, evidence, authorizations, pricing and billing. Work item and service job may be one record or distinct types; decide during detailed schema design.
- **Finding -> recommendation** (commercial phase): a condition and proposed correction persist across visits; defer/decline are not completed jobs.
- **Location and map placement** (CONFIRMED): a physical space ID is stable even when renamed or shown on multiple map views.
- **Move / handoff / blocker / alert** (CONFIRMED): each independent record has its own actor, owner, lifecycle and audit trail.

## Interaction model
The preferred operating layout is **left-to-right flow**: incoming work/ROs on left, map/active assignment in center, next departments/outputs on right. The page is role-specific, not an all-purpose dashboard for every employee.
Property editor requires imported map image; multiple views; stable single spaces, lines/grids and multi-unit shaded areas; move/resize/rotate/group; draft/review/publish; pan/anchored zoom/touch; independent view state; label/border scaling with zoom; undo/redo; conflict-safe save. Operational map and editable configuration map must be different modes.
Porter cards show origin, destination, move instructions, due time, required key/packet pickup and dotted route intent. A drawing on the map must not be mistaken for a completed physical move.
The estimate/invoice visual reference is restrained industrial: white/gray, square corners, tabular prices, service-header ACCEPT/DEFER/DECLINE rather than scattered controls.

## Scope policy and phased commercial boundary
**Core product (first pilot):** organization/branch identity, master customer and unit records, visits/ROs/jobs, property editor/live occupancy, porter moves, work queues, blockers, handoffs, targeted alerts, QC and pickup release, basic operational metrics.
**Near-term extensions:** parts and warranty coordination, scheduling, internal chat, message/acknowledgment escalation, customer recommendations and documented authorization.
**Deferred until operational core validated:** comprehensive invoicing/posted receivables, quote variants/price book, tax profiles, insurance supplements, warranty payment reconciliation, payroll/flat-rate/overhead profitability, general ledger integration and CDK writeback. Preserve data boundaries now so they are compatible later; do not implement speculative finance in the foundational migration.
**Separate:** Intertrak inspection execution. Link through explicit future integration contracts only.

## Key independent states / invariants
1. A unit has one confirmed physical location per active visit, regardless of its number of ROs. A desired destination is never silently promoted to confirmed location.
2. Assignment, acknowledgement, execution, completion and verification are not synonyms.
3. A failed or retried move cannot overwrite a more recent physical location. Claims are exclusive; completion is idempotent.
4. Location identity and history survive renames, map re-layouts, archive, and multiple map images.
5. Pickup release evaluates **all participating ROs** and explicit advisor-approved exceptions; approval and physical departure are distinct.
6. Parts received are not necessarily allocated to a job. Warranty authorization is not reimbursement.
7. Customer's accepted selection is not equivalent to valid authorization; authorization is not payment; completed work is not automatically an invoice.
8. A tenant or former customer must not access another tenant's or a subsequent owner's private records.
9. Every cross-department command has an actor, timestamp, old/new state, and originating context; reminders and chat are derived from real work, not independent truth.

## End-to-end reference scenario
Guest drops RV; advisor creates visit and links two active ROs (customer-pay and warranty). Porter receives an arrival move to Service Lot and confirms location; foreman assigns bay and technician and marks dispatch packet ready; porter claims move and confirms packet/key placement. Technician identifies missing part; parts employee owns requirement and blocker. Once allocated, work completes, wash/detail occurs when required, advisor/writer performs QC and records key return. Advisor reviews all ROs including approved unfinished work and releases. Physical departure separately removes the unit from live occupancy. All actions must remain auditable across devices.

## Present state (verified on 2026-11-02)
Connected Supabase account: 'zimtykes - OneShop'. Accessible Supabase project ref: igofopipuuqtsxjhjymq; status ACTIVE_HEALTHY; SQL read succeeds; zero public tables and zero tracked migrations. This does **not** establish application connectivity.
GitHub repository: jontkaufman/OneShop. Repository contains README and a property-map-editor specification; existing hosted prototype source is not imported, with no verified production app, build pipeline or Supabase client wiring.
**Do not claim parity, deployment, database setup, integrations, or production readiness based on documentation.**
