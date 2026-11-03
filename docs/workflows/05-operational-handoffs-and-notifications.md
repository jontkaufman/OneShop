# OneShop — Operational Handoff & Notification Contract (WF-05)

**Status:** Proposed, implementation-ready engineering contract. No deployed application or Supabase schema is implied.
**Product principle:** one clear owner, one actionable next step, and a durable, relevant notification for every new assignment.

## 1. Objective

Create a continuous lifecycle: **unit registration → writer check-in → movement request → porter claim/pickup/delivery → notifying requester → receiving technician/department accepts its next task**.

All operational roles interact through one Customer > Unit (RV/vehicle) > RO > Line Item record hierarchy. Physical visits and movements are orthogonal to that hierarchy.

The UI must not silently transfer responsibility, infer acceptance from a message read, or move a unit because a location was selected in a form.

## 2. Entry permissions and capability boundaries

**Confirmed:** Any authorized dealership employee should be able to register a unit; the full check-in workflow is optimized for Service Writers.

| Action | Who may do it | Meaning |
|---|---|---|
| Register minimal unit | Any active branch employee with `unit.create` (default grant to staff, policy configurable) | Create/find stable unit identity, no service intake implied |
| Edit unit identity | Service Writer/authorized master-data manager | Correct VIN/stock information with duplicate review |
| Complete full arrival/check-in | Service Writer or delegated receiving role with `visit.checkin` | Bind branch, customer or unassigned account, unit, visit, RO(s), line items, receiving location, custody/restrictions |
| Request a move | Service Writer or roles authorized by move policy | Specify task, origin and destination *type/area*, optional numbered space |
| Prioritize/reroute work | Foreman/manager | Resolve conflicts and allocate service bays, according to site policy |
| Claim a move | Available/on-shift porter with `move.claim` | One named person becomes responsible for movement |
| Confirm physical drop-off | Claiming porter or properly delegated staff | Update actual occupancy, log custody and evidence |
| Accept receiving task | Named technician/other assigned employee; if unassigned, authorized department lead/dispatcher | Become accountable for next work; not equivalent to task completion |

"Anyone" means **any authorized employee within their branch**, not anonymous visitors or staff in unrelated tenants.

## 3. End-to-end event table (required audit + notifications)

| Command/event | Data changes in same transaction | Notification target | Recipient's next action |
|---|---|---|---|
| `unit.registered` | Unit identity and actor | Optional owning writer/records review queue when incomplete | Verify identity if missing or colliding |
| `visit.checked_in` | Visit, intake classification, receipt information, RO links | Coordinating Service Writer if entered by another employee; not automatically all staff | Review and initiate move |
| `move.requested` | Movement request with origin, destination type, optional space, creator, due time, constraints; queue work item | **Porter shared role queue**; targeted alerts to eligible on-duty members | Open move card, claim or flag issue |
| `move.claimed` | Claimant, time, version; role-queue work becomes named assignment | Requesting person (informational) and claiming porter (assigned work) | Requester sees owner; porter collects unit/keys |
| `move.picked_up` | Confirmed pickup/start, key/packet custody event | Requester sees progress if subscribed/configured | No duplicate assignment; move in flight |
| `move.delivered` | Atomic actual location update + completion + movement history and key/packet state | **Requester**: delivery complete (informational). **Receiving role/user**: new work or required handoff (actionable). | Requester verifies delivery; receiver accepts/starts task |
| `handoff.accepted` | Receiving task owner/accepted time | Sender/requester may see acknowledgment | Sender knows responsibility was accepted |
| `task.blocked` | Owner/reason/deadline/blocker | Assigned owner and escalation chain | Identify next responsible person |
| `task.completed` | Task completed, actor/evidence | Requester/next dependent team where relevant | Continue workflow; do not automatically mark entire RO complete |

If the destination is **Service Bay** and a technician is already assigned, send an actionable notification to **that technician**. If not yet assigned, send it to the **foreman/dispatch queue**; do **not** pretend an arbitrary technician owns it.

If the destination is **Service Storage**, the next assigned role is configured by workflow/area (typically service dispatch or the writer). Do not generate a technician assignment merely because the RV was parked.

If the receiving team has nobody on shift, keep the task **persistently in the team inbox**, mark it unclaimed, and escalate according to branch rules. Never silently discard it.

## 4. Notification is not task state

Separate:
- **Work item:** authoritative task with id, source entity, branch/tenant, owning role or person, status, priority, due time, action, acceptance and completion history.
- **Notification:** durable, recipient-specific invitation to view an event or act on a work item, with read/unread status.
- **Acknowledgment:** explicit "Acknowledge" or "Accept" event where required; reading/opening does not acknowledge.
- **Assignment:** setting the receiving role/user; when a role receives an assignment, the shared queue is the owner until claimed/assigned.
- **Movement state:** requested, claimed, picked up, delivered, canceled, blocked, superseded.
- **Confirmed location:** physical location updated ONLY by valid physical delivery transaction, not by assignment.

**No newly created workload may have no owner.** Where a named person is unknown, assign the task to the correct role queue and make the responsible lead visible. No same-person duplication: merge informational and actionable content in one inbox card when their recipient is the same, without losing linked events in the audit trail.

Notification channels:
1. **Persistent inbox/role queue:** source of truth. Reload/offline clients recover missed notifications by querying unread and outstanding work.
2. **Supabase Realtime update:** best-effort live update of authorized inbox views, never authoritative persistence.
3. **Browser/mobile push/SMS later:** optional transport, respects on-duty, notification settings and business-hour rules. Do not rely on a push being received before a task exists.

## 5. Minimum data flow and screen projection

### Unit & check-in
`organization_id, branch_id, unit_id, vin/stock, customer_id? (with explicit relationship), visit_id, source/customer vs inventory classification, entered_by, checked_in_by, checked_in_at, current_location_id?, ro_ids[], line_item_ids[], restrictions, key_custody`.

Missing customer details may be allowed per configured branch rule; one valid unit identifier must be present. A minimal unit registration does not automatically create an onsite visit or RO.

### Movement request
`move_id, visit_id, unit_id, requester_id, pickup_location_id, destination_type_id, destination_location_id?, task_code, priority, due_at?, instructions?, mobility_restrictions, packet/keys_instructions, status, version, idempotency_key`.

Specific numbered space is optional at request time. Location type required and must be defined by the site configuration. Final space allocation is performed by configured role (porter/foreman), with a transactional vacancy/fit check.

### Porter notification and card
**Primary compact card:** last-six VIN + abbreviated year/make/model, assigned task, pickup location, destination type/space if set, priority/due time, status, **Claim Move**. Open for restrictions, map highlights, keys/packet pickup point, unit details needed for safe handling. Customer contact, payment and complete RO financials are omitted by default.
An on-duty porter sees queue items they may claim; when claimed, their My Moves view shows the named assignment, and remaining porters see the item as unavailable.

### Receiver notification and card
**Primary compact card:** unit identity, where physically delivered, work/RO line(s), prerequisites, assigned bay, expected action, priority, **Accept/Start**. If receiving assignment is unavailable, show to foreman/department queue.
The receiving technician is never instructed to start unauthorized repair work; "unit delivered" and "work authorized/ready" are separately evaluated prerequisites.

### Requester completion notification
"Unit [ID] delivered to [location] by [porter] at [local timestamp]. Receiver: [technician/department/awaiting assignment]." Click opens the visit movement history and current next owner. No need to search again.

## 6. Planned relational schema boundaries

Initial *shared foundation* tables:
- `organizations`, `branches`, `memberships`, `membership_roles`, `users` (Auth), `customers`, `units`, `unit_customer_relationships`, `onsite_visits`, `repair_orders`, `ro_line_items`.
- `audit_events` and `domain_events`: append-only, organization/branch scoped, actor, timestamps, correlation and idempotency keys.
- `role_work_queues` (logical recipient keys) / `work_tasks` (actual actionable work item), `work_assignments` (optional assignment/acceptance changes), `notifications` (recipient delivery/read state), `outbox_events` (retryable background delivery).
- `location_types`, `physical_locations`, `occupancy_events`, `unit_current_locations`, `movement_requests`, `key_custody_events` for first move vertical slice.
- `routing_rules` maps site/task/destination type to receiving role and optional escalation lead. Store rule ID/version on assignments to explain why somebody was notified.

All operational rows must be tenant/branch scoped. Type-specific constraints and cross-table FKs must prevent wrong-branch assignments. Use RLS and server-side capability validation. Do not treat a frontend role label or user-controlled JWT user metadata as authorization.

Data integrity:
- On `request_move`, create work task, domain event, recipient inbox notification/outbox in **one transaction**.
- On `confirm_move_delivery`, lock and re-check active move, visit, assigned porter, current location and destination capacity; then update occupancy and write domain events, requester notification and receiving task/notification in **one transaction**.
- Unique `(organization_id, command_type, idempotency_key)` prevents retries from creating duplicate tasks.
- Delivery after cancellation or supersession cannot move a unit.
- Unique active claim and correct role/branch membership; no push before committed state; outbox worker retries delivery safely.
- History and customer timeline are derived from durable events; an RO and a physical location cannot be duplicated because another RO exists.

## 7. Implementation order — focused vertical slices

**Slice A: identity, records, and actor capabilities.** Fresh application bootstrap, verified environment, role membership and reusable Customer/Unit/RO/Line Item records. All staff get minimal `unit.create`; only approved staff receive `visit.checkin`, `move.request`, `move.claim` etc. Verify RLS.

**Slice B: Service Writer check-in and durable event.** Reuse the v0.3 prototype/field policy from source, connect it to authenticated records and transactional check-in; timeline receives first persisted visit event.

**Slice C: Porter move request + notification.** Start with location **types** and a small configured fixture set, not a throwaway visual map builder; destination type required, optional space. Persist move queue and targeted notification. Verify porters can claim exclusively.

**Slice D: Delivery and receiver handoff.** Confirm location atomically, notify requester, create actionable receiving task and notify assigned tech or foreman, with explicit acknowledgment/ownership. Demonstrate end-to-end.

**Slice E: Advanced map-builder module.** Multiple maps, imported images, stable physical spaces/types, bulk numbering and shared multi-unit areas; use the already-established location type/ID contract. Do not replace this with a limited grid just to demo movements.

**Slice F: Branch policy management, escalations and analytics.** Role routing, business-hour acknowledgment timers, shift/on-duty targeting and permission-visible configuration; metrics for open/unclaimed workload.

For a pilot, slices A-D must be **fully connected and tested**; an offline UI demonstration is not a production proof.

## 8. Acceptance scenarios

1. Any authenticated authorized staff member creates a new RV; SW later finds that same unit and completes check-in without duplicate IDs.
2. Writer requests Move to Service Storage with no spot; on-duty porter queue receives one actionable entry with unit context.
3. Two porters attempt to claim the same move: one wins; the other sees already claimed; requester sees claim status.
4. Porter confirms arrival in a permitted space; actual location updates once, even if request repeats/reconnects.
5. Requester receives one delivery confirmation with the actual location/actor/time.
6. A tech already assigned to RO line item in a Service Bay receives one actionable receiving task with line references; foreman receives the task if no tech assigned.
7. Parking to shared storage does not create a technician repair task unless an explicit routing rule requires it.
8. Porter notification opens role-specific card, not customer contact/payment pages.
9. Opening notification changes read state only; claiming/accepting and completion remain distinct.
10. Off-duty or offline staff find pending work in their persistent queue when they return.
11. Cross-tenant, cross-branch and unauthorized role writes fail under RLS / transactional command checks.
12. Missing/blocked location type or unsafe move cannot be silently dispatched; receiving fallback queue remains visible.
13. Activity timeline groups the events under **one service visit**, including multiple ROs, with time, actor and source.
14. Changing receiving role or location policy creates a versioned audit record and never retroactively reassigns completed work.

## 9. Immediate blockers & decisions

- **Verified current state:** repo includes v0.3 standalone prototype, not the production React build. Connected zimtykes Supabase project has no public application tables/migrations. Need Gate 0 app bootstrap and a separated development environment before schema deployment.
- **Confirmed by latest user:** a unit can be registered by any dealership employee; SW check-in is the primary intake workflow; new workloads produce targeted actionable notifications; on delivery the requester and receiving user/role must be notified.
- **Proposed for approval:** team queues own work until claimed; receiver role comes from site routing rules; Service Bay without assigned technician routes to foreman; parked storage does not itself create repair authorization; notif reading is distinct from acknowledgment.
- **Next production write:** create typed multitenant schema with permissions, then durable transactional work/notification commands and automated two-porter and two-tenant tests. Do not rely on the prototype's localStorage rules.
