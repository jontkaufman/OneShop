# WF-01 — Unit Arrival, Service-Writer Check-In and Next Move
Status: design contract v0.1; implementation not yet deployed. Reviewed alongside the OneShop architecture baseline.
Canonical hierarchy: **Customer > Unit (RV or vehicle) > RO > Line Item**. An onsite visit is a linked physical visit record, not a hierarchy level.

## Purpose and user outcome
Service writer (SW) must receive a unit, identify its customer and unit, record why it is onsite, associate all active repair orders and their line items, take responsibility for the check-in, and initiate the unit's next operational task **without having to allocate a precise parking space**.
After check-in, the RV should be visibly in a known pickup/drop-off area; any requested move must have a destination **location type/area**, and optionally a specific space. Physical arrival is confirmed only by the porter completing the move.

## Intake classifications
- **CUSTOMER_SERVICE**: customer-owned unit arriving for service, diagnosis, warranty, check-in or pickup coordination. Default next route: service staging/storage (site-configurable); express/waiter route if indicated.
- **NEW_INVENTORY**: dealership stock/received/sold-incoming unit headed into receiving/PDI/inspection/prep. Default next route: incoming inventory/PDI staging (site-configurable).
- Classification selects routing rules and recommended checklists, **not** a separate customer/unit/RO schema. For inventory, an internal dealership/fleet customer account may own the unit's RO; this needs deliberate product policy before production.
- 'New unit' is provisionally interpreted as **new dealership inventory**, not 'unit never recorded previously'. A first-time customer-owned RV still uses CUSTOMER_SERVICE; later validation can add more statuses without changing the hierarchy.

## Journey and screen contract
### 0. Find or create Customer and Unit
Search by phone, customer name, email, RO, stock number, VIN or VIN last six. Disambiguate duplicate names/partial VIN matches; do not silently merge customers/units.
Top entity summary: Customer name, preferred phone, multiple emails, connected units; clicking a unit opens its service history. If customer and unit already exist, prefill only verified fields and allow updates within role permissions.
Account/ownership relationship is effective dated. Old customer information on historic ROs and private communication must remain preserved but protected.

### 1. Arrived / Check-In (service writer)
Use a progressive workflow rather than one overwhelming form:
1) **Routing context:** choose Customer Service or New Inventory; branch/site automatically selected with confirmation; optional priority Express/Waiter Way, routine, no-drive/tow.
2) **Customer:** existing/customer details; required name or internal account for inventory, verified preferred phone or an explicit 'not provided' reason; email(s) optional with communication preferences; authorized contact and billing party may differ.
3) **Unit:** find existing/create. Required vehicle type (RV or other vehicle), identifying VIN/serial/stock (one viable identifier plus disambiguation), make/model where known. Optional year, chassis/coach IDs, unit length/height/drive-tow restrictions, plate, photo and condition.
4) **Work:** associate existing RO(s) or create draft RO(s), each with at least one descriptive line item or an explicit 'work scope pending' flag; capture advisor, service type, customer concerns, warranty/customer/internal classification, scheduled vs actual arrival, promised pickup if actually communicated (never invent a promise).
5) **Physical receipt:** receiving/drop-off zone, key status/cabinet or bag identity, existing damage photos, operability, hazards/special handling, RO packet status and staff initials as needed.
6) **Finish Check-In:** one durable atomic action that commits visit arrival and links customer, unit, ROs. Emits a canonical `visit_checked_in` event; displays success and *recommended next action* rather than silently dispatching movement.

Validation: a blocked safety condition (keys missing, cannot tow, unsafe to move) must be recorded and route to a supervisor/blocked move state, not erased to finish the form. A customer with no email must still be checked in. Do not force a writer to invent exact parking space or estimated completion date.

### 2. After Finish Check-In — action panel
Primary suggested action: **Move Unit**. Preselect:
- Pickup: current confirmed location (e.g. Drop-off Area). SW can correct the pickup location **only with recorded provenance/authorization**.
- Destination: site-configured recommended location type/operational area derived from intake class, urgency, unit restrictions and work readiness. E.g. Customer Service -> Service Storage; New Inventory -> PDI Staging; urgent waiter -> Waiter Way.
- Destination **space type (required)**, not space number. Secondary optional 'Specific space' dropdown appears only when override desired, filtered by selected type, branch, fit/availability, capacity and authorization.
- Reason/task: from predefined business tasks (Move to Service Storage, Stage for PDI, Wash, Detail, Repair Bay, Waiter Way, Customer Pickup etc.).
- Priority, desired-by deadline and porter instructions.
- If no valid space/type exists, create actionable 'Location configuration required' or management task; never present a fake available space.
- Controls: **Request Move**, **Skip for Now (reason)**, or return to visit; skip remains a pending next action and does not mark move done.
- If no specific space: porter selects a permitted available space at claim/delivery; for service-bay destination management/foreman may be the designated allocator. This is a policy on the location type, not a SW responsibility.

### 3. Porter queue and physical execution (later module)
Porter sees unit display (VIN suffix + abbreviated year/make/model + customer), actual pickup position, requested task and destination type, optional specific space, due priority, safety notes, keys/packet handling.
`requested -> claimed -> picked_up -> delivered`, with blocked/canceled/superseded alternatives. Claim is exclusive. At pickup, confirm location + keys/packet custody. At drop-off choose final permitted specific space if not provided; physical location updates **only** on delivery confirmation.
A completed move writes timeline activity under the visit with actor/time/from/to. If keys/packet do not reach the RV, unit arrival can be accurately recorded but the custody blocker must stay open.
Changing/canceling the request invalidates old completion attempts; staff sees an actionable conflict rather than stale location updates.

## Data and behavior contract
- `customer` -> related `unit` (current/historical relationship), `unit` -> multiple ROs -> multiple line items.
- `onsite_visit` linked to unit, receiving customer, coordinating advisor, branch, intake class, timestamps, receipt facts, processing route and live physical presence.
- `checkin_record` optional detailed checklist version; one successful finish action and immutable receipt snapshots.
- `location_type`: branch-scoped required type identity, label, abbreviation e.g. `Service Bay` + `SB`, numbered-space format `SB-01`, default capacity and allowed moves/allocator.
- `physical_location`: branch-scoped stable ID; `space` (capacity 1 typical) or `shared_area` (capacity >=1), required type, assigned number for numbered spaces, map appearances; code unique within branch. Numbering display from type prefix + zero-padded number; maintain aliases when renamed.
- `location_assignment`: current confirmed unit location (per active onsite visit); no inferred change on request.
- `movement_request`: visit, requested source, destination type, **nullable** specific destination ID, task/reason, priority, status, due time, requester/claimer and version. Constraints guarantee specific destination belongs to same branch/type and a valid capacity/fit policy.
- `timeline_event`: immutable visitor-level event emitted from accepted commands; old state/provenance, actor, linked RO/line when relevant; customer-visible projection excludes private data across prior owners.

## Required engineering guarantees
1. Explicit organization and branch scope and membership authorization; SW can create a visit and movement request but cannot impersonate porter confirmation or change site schema.
2. No double check-in on retries: idempotency key and active visit conflict policy.
3. A unit has exactly one authoritative confirmed location at a time; movement request does not move it.
4. No double claim or stale arrival update; maintain full history on cancellation/supersession.
5. Location type required; optional specific space chosen from permitted current available candidates. Empty inventory never returns stale choices as valid.
6. Numbered-space codes unique and formatted consistently (`SB-01`); physical space IDs stable through renumbering.
7. Customer timeline groups all operational visit events while keeping the service visit as one primary customer-facing marker.

## Acceptance examples
- Customer RV / two ROs / multiple line items: one visit and unit position; writer finishes check-in; next action Move Unit -> Service Storage with no exact parking assignment.
- New dealership unit: internal receiving account -> unit/RO -> PDI staging recommendation, not service storage.
- User requests `Service Bay` without choosing `SB-01`: request stored with type only, porter/foreman allocates exact bay later.
- User chooses `SB-01`: only if active/available and compatible; duplicate confirmation to occupied space is rejected.
- Check-in recorded at Drop-off Area; porter moves to storage; timeline shows one Service Visit group with Check-In and Moved to Storage in its expandable details.
- No configured map/location type: writer receives explicit configuration blocker; check-in remains recorded, never fake a location.
- Prior owner looking up sold RV does not see new owner's RO, private messages or payment information.
