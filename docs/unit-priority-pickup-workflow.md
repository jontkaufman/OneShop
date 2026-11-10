# OneShop — Unit Priority, Pickup Commitments & Calendar Handoffs

Status: **implementation specification, not deployed**  
Product area: Service intake → repair order → parts → dispatch → QC → release → pickup  
Last updated: 2026-11-10

## Objective

Make the unit's customer pickup target a first-class operating constraint, while keeping customer commitments, internal repair forecasts, appointments, and physical departure distinct. Every meaningful cross-role handoff must produce a tracked assignment, a notification, and an auditable event. Scheduling changes should update the *same* task/appointment rather than create duplicates.

This is multi-tenant functionality for organizations with multiple branches, configurable roles, business hours, and calendars.

## Current baseline / integration constraints (verified 2026-11-10)

- Connected Supabase project has `public.onsite_visits` with `promised_pickup_at`, `arrived_at`, `departed_at`, `coordinating_writer_id`, and operational `status`.
- `public.repair_orders` references a unit, visit, customer, advisor, and RO number; `public.ro_line_items` contains line states.
- `public.activity_events` already has org/branch/unit/visit/RO/line scopes and `details` JSONB.
- `public.staff_memberships`, `public.organization_roles`, permission and role-identifier catalogs exist.
- **Missing from the currently listed public schema:** calendar tasks, pickup commitment categories, pickup change history, actionable notifications, explicit flags, parts ETAs, QC handoffs, and historical technician/bay assignments. These must be introduced or mapped to future modules after source review.
- Repository currently has README and specifications only; **no verified application source or deployment pipeline**. Do not claim UI/API functionality exists until imported/rebuilt and tested.

## 1. Definitions: do not conflate these dates

| Attribute | Meaning | Default / mutation |
|---|---|---|
| `requested_pickup_date` | Date the customer initially requested at intake; historical baseline | Capture once, retain history |
| `target_pickup_date` | Current operating target shown throughout the shop | Service writer editable, with reason |
| `pickup_commitment` | `hard` = firm confirmed commitment; `soft` = tentative target | Default `soft`; branch configurable |
| `pickup_commitment_confirmed_at` | When a firm date was agreed with the customer | Must not be synthesized by moving the date |
| `projected_repair_ready_at` | Internal forecast when repairs and QC can finish | Recomputed/updated by authorized shop personnel |
| `actual_repair_ready_at` | Actual QC-approved ready status | On QC approval; separate from pickup |
| `pickup_appointment_start_at` / `end_at` | Confirmed customer arrival window | Null until booked; can move independently of ready date |
| `actual_departed_at` | Unit physically released from property | Departure closes the onsite workflow |

Pickup dates entered without times are **branch-local calendar dates**, not arbitrary UTC midnight timestamps. Store appointment times as timestamp-with-time-zone; use branch time zone for calendar rendering and alerts.

**Hard** is a customer commitment, **not** an uneditable date. A service writer may reschedule it after logging why, who confirmed the change, and when. A missed hard deadline must not be erased from the historical record by changing its current value. Soft dates may change but must remain auditable. Neither type implies a pickup appointment has been confirmed.

## 2. Priority model

Priority is derived from a computed deadline risk and optional manual escalation; it is not merely a free-text label.

| Computed risk | Conditions (initial proposal; branch-configurable) | Board behavior |
|---|---|---|
| Overdue | Current pickup target elapsed and unit not departed | First in priority queue, overdue counter |
| Critical | Hard commitment within 24 hours with unresolved required work, or forecasted ready after deadline | Strong visible escalation |
| At risk | Hard commitment within 3 days with unresolved work/parts/QC or a forecast slip; or soft target at risk | Highlight and surface cause |
| On track | Forecast is feasible relative to target | Normal queue |
| No target | Missing target on pre-existing/imported record | Intake exception queue, do not silently prioritize last |

**Blockers are an independent axis** (awaiting customer approval, backordered part, bay unavailable, waiting on technician, pending QC, etc.). A critical unit can also be blocked; never replace one indicator with the other. Support manual `expedite` marker requiring a reason/expiry; it never changes the customer commitment or hides computed risk.

Longer term, calculate slack using remaining labor, available bays, lead times, non-working hours, QC time, wash/detail needs, and customer pickup windows. In v1, use dates + blocker states + available projected-ready estimate, and show `forecast unknown` rather than false precision.

Recommended sorting: overdue → critical → at-risk → other hard dates → soft dates, then target date ascending. An explicitly expedited soft job can move upward within configurable limits; priority must never silently drop hard commitments.

## 3. Intake and service-writer controls

New unit or onsite visit intake (any role with creation permission; service writer is primary operating owner):

1. Identify unit by configurable role display (stock #, VIN, RO #, customer, year/make/model).
2. Link customer, active visit, service writer, and RO if applicable.
3. Schedule and assign a drop-off intake task (date/time window, responsible person or queue).
4. Enter requested and current target pickup date; choose **Soft** or **Hard**; if Hard record customer confirmation and context.
5. Optionally schedule confirmed pickup appointment, but leave empty by default.
6. Save atomically, create activity event, update branch calendar, and deliver assigned-task notification.

Service writer may adjust target or hard/soft classification at any time with permission. Update dialog requires a reason, customer-contact outcome, and confirmation of whether customer accepted the new commitment. A date change may be saved with **customer confirmation pending**, but the previous hard commitment stays visible as an unresolved exception until confirmation or management override. Do not silently convert Hard to Soft.

## 4. End-to-end scenario: user-described lifecycle

1. **Drop-off:** Customer asks for Nov 27 pickup. SW records requested and target date as Nov 27, soft unless customer makes it a firm promise; assigns drop-off task. Staff receive intake task notification. RO is opened.
2. **Diagnosis five days later:** Tech enters findings, creates a line-item review flag, and records required part and estimated lead time. RO/line shows `blocked: authorization/parts`. SW receives an *actionable* inbox item tied to the line item.
3. **Customer authorization:** SW calls owner, records approval and communication outcome, updates current pickup target with reason `parts backorder`, and initiates parts-order task for configured owner (parts team by default; SW when dealership policy allows). The initial requested Nov 27 date remains in history. A hard-date shift stays pending until customer agreement is recorded.
4. **Two weeks later, part receipt:** Parts team marks item received; parts and RO unblock accordingly; foreman receives ready-to-reschedule task. Foreman sees **last assigned technician, last actual bay, and recent service history**. Prefill those values but validate current staff availability and bay occupancy.
5. **Bay dispatch:** Foreman assigns technician/bay and creates a porter move task. Porter receives new-work notification, claims task, moves unit, and records completion/physical location. Assigned tech receives work-ready notice.
6. **Repair completion:** Each required line is `done`, or deferred/declined with documented authorization. Tech submits RO for QC. QC task goes to responsible service writer or configured QC role.
7. **QC approval:** Reviewer verifies required work and release criteria. Mark `ready_for_pickup`, record reviewer/time, and generate a customer-notification task. If QC fails, create rework and return to technician/foreman with notifications.
8. **Ready notice:** SW sends recorded SMS/email (respect consent and configured provider). Message asks customer to call to **confirm pickup date**. Sending it does NOT set a confirmed appointment.
9. **Customer requests +3 days:** SW updates current pickup target *or* pickup appointment, as appropriate, and records reason/customer agreement. Existing pickup calendar event is moved; assignment and history are retained. Unit stays `ready_for_pickup`, `pickup_pending`, and onsite until departure.
10. **Pickup:** Assigned personnel complete readiness/release checklist, customer arrival, keys, paperwork/payment, and actual departure. Close corresponding tasks and record departure, removing unit from active onsite boards and calendars (retain historical records).

## 5. Explicit workflow states

Keep independent dimensions to avoid mutually exclusive labels masking reality.

- **RO:** `draft` → `open` → `blocked` / `in_progress` → `work_complete` → `qc_pending` → `qc_passed` (or `qc_failed` → rework) → `release_ready` → `closed`. Existing `repair_orders.status` currently only allows `draft/open/blocked/complete/cancelled`; use separate extended workflow state or a carefully migrated constraint. Do not overload `complete`.
- **Line item:** `pending` → `authorized` → `in_progress` → `done`; `blocked` with explicit reason; `deferred/declined` only with decision record.
- **Parts:** `not_required`, `awaiting_approval`, `to_order`, `ordered`, `backordered`, `received`, `installed`, `cancelled`.
- **Pickup:** `not_ready` → `ready_unnotified` → `ready_notified` → `awaiting_pickup_confirmation` → `pickup_scheduled` → `departed`. Exception: `pickup_cancelled` / `no_show`.
- **Physical presence / location:** location and onsite visit status remain separate from RO lifecycle.

When final RO lines are complete, allow QC request; only configured QC approval may mark unit ready. Changing a pickup appointment must not regress completed work or reopen an RO.

## 6. Tasks and calendar are one system

Calendar events are *views of operational tasks and appointments*, not separate unlinked copies.

Task requirements:
- Stable `task_id`, org and branch scope, unit/visit/RO/line references, `task_type`, owning role/department, user assignee or claimable queue, due window, priority/risk snapshot, status, instructions, created-by, completed-by, timestamps.
- `task_type`: `dropoff_intake`, `pickup_release`, `customer_approval_call`, `parts_order`, `parts_followup`, `bay_dispatch`, `unit_move`, `qc_review`, `customer_ready_notification`, `pickup_confirmation`, `pickup_prep`.
- Lifecycle: `queued` → `assigned` → `claimed` → `in_progress` → `completed`; `blocked`, `cancelled`, `rescheduled` supported. Claim atomic to prevent double portering.
- Every assigned or claimable task appears on proper staff/department calendar with unit identifier based on existing `role_identifier_profiles`. All future tasks appear on manager/foreman views as permissions allow.
- Updating target date or appointment reschedules **existing** affected future tasks by stable ID, preserving prior windows as history. Completed historical tasks do not move.
- Drop-offs and pickups must be assigned to actual personnel or a role-based queue before considered scheduled. Pickup reminders cannot be mistaken for confirmed customer appointments.
- Suggested views: My Tasks, Service Writer Board, Foreman Board, Porter Queue, Parts Queue, Today/Tomorrow/Week calendar, all-branch due-date planner.

## 7. Notifications, acknowledgement and escalation

Use a durable notification inbox event for every new workload assignment or meaningful handoff. Push/email/SMS to staff are optional delivery channels; the inbox is the durable source of truth.

| Trigger | Recipient / action |
|---|---|
| New drop-off assigned | Intake worker / SW gets scheduled task |
| Technician flags line | Assigned SW gets `Review needed` with direct RO-line deep link |
| Parts approval recorded | Parts owner gets order task |
| Part ETA slips past target | SW gets `Pickup at risk` with customer follow-up |
| Part received | Foreman/dispatcher gets reschedule task |
| Foreman creates unit move | Porter queue sees claimable task; claimed porter is assigned |
| Move completed | Assigned technician and foreman informed |
| RO requests QC | SW or designated QC reviewer receives task |
| QC rejected | Foreman and responsible technician get rework task |
| QC passed | SW gets customer-notification and pickup-confirmation tasks |
| Pickup confirmed/rescheduled | Assigned pickup worker and affected teams get updated calendar/task notification |
| Pickup day / no-show | Assigned pickup worker and SW receive appropriate reminders |

**Distinguish** notification created, delivered, read, acknowledged, and task completed. A notification being read is not proof the job was done. Deduplicate event retries using idempotency keys. Workload notifications should be emitted on committed transactions, not optimistic UI writes; create outbox and process delivery reliably. Enforce branch working hours; urgent acknowledgements and escalation times are organization settings (default under discussion: 1-hour urgent acknowledgement during business hours, then escalate to supervisor). Reassignment removes stale workload from previous assignee but preserves history.

Customer SMS/email is a **separate communication log** with channel, consent, template, text, delivery status, external provider IDs, and recipient; never assume that a sent message means a customer confirmed.

## 8. Previous technician and bay affinity

Each unit/RO needs time-stamped dispatch and actual work assignments:
- Assigned technician, date range, assignment status.
- Assigned bay, physical location, occupancy, move completion.
- Last technician who actually worked on relevant line/RO, and last actual bay (not merely last suggested assignment).
- Suggested return to previous tech/bay; foreman can override if unavailable.
- Never auto-dispatch to an occupied bay or an absent technician solely because of affinity.

## 9. Data-model proposal, to validate before migration

Proposed new relational concepts (names provisional):
- `visit_pickup_plans` (unique `visit_id`; `requested_pickup_date`, `target_pickup_date`, `pickup_commitment`, confirmation state and metadata, projected/actual ready, appointment window, version).
- `pickup_plan_changes` (append-only original/new values, reason, actor, customer confirmation and correlation ID).
- `shop_tasks` and `shop_task_history` (assignment/calendar source of truth).
- `inbox_notifications`, `notification_deliveries`, `event_outbox` (reliable internal event fanout).
- `line_item_flags` / `line_item_decisions` (review and authorization records).
- `part_requirements` or existing parts module integration, with order and ETA lineage.
- `dispatch_assignments` and `unit_move_requests` if not supplied by property module.
- `customer_communications` and explicit `qc_reviews`.
- `branch_workflow_settings` or scoped org/branch settings (defaults, thresholds, escalation, required intake fields, QC authority, task routing).

Every mutable table must have tenant/branch relationships, verified membership-based RLS, role-scoped mutation authorization, appropriate unique constraints, foreign keys, and audit history. Reuse existing `activity_events` for cross-module immutable operational timeline and include stable event IDs so a transaction can be observed across tasks, notifications, and communication.

**Compatibility:** `onsite_visits.promised_pickup_at` already exists. Plan a one-time backfill/mapping into the new pickup plan; designate one canonical field and deprecate legacy writes. Do **not** maintain two independently editable pickup dates. Existing imported visits with no target should be flagged for intake review rather than assigned an invented commitment.

Transactional expectations: when SW changes pickup target, update pickup plan, append change record, reschedule affected tasks, and enqueue alerts atomically. Notification delivery is eventually consistent via outbox. Concurrency: optimistic version checks on pickup plan and task assignments to prevent stale writes.

## 10. Role permissions and configurable settings

Service writer: create/modify target and commitment; record customer agreement; request/order parts subject to policy; send notifications; approve QC only if configured.  
Technician: flag and update own RO lines; request QC; read target and blockers.  
Parts: track order, ETA and received status; no unilateral change to customer commitment.  
Foreman: schedule bay/technician/moves; see remaining slack and occupancy; optionally set internal ready forecast, but not customer promises by default.  
Porter: claim/complete moves, see assigned drop-off/pickup logistics where permitted.  
Manager: configure thresholds, escalation, assignments, exceptions and override rights; see audit.

Branch settings: default soft/hard, require pickup date at intake (recommended true), per-role task owners, QC authority, risk thresholds, business-hour calendar and holidays, customer messages, escalation SLA, customer confirmation before hard-date replacement, overtime/hold policy, late pickup/storage policies.

## 11. Minimum acceptance tests

1. New onsite visit with Nov 27 **Soft** target appears on SW board; drop-off task assigned/visible; original and target dates stored distinctly.
2. Creating Nov 27 **Hard** target requires confirmed customer commitment per branch settings and produces hard-date risk alert if forecast spills past it.
3. Changing target logs old/new, reason, actor, confirmation state and affects all relevant future tasks *once*; no duplicate calendar entry.
4. Tech flags RO line → assigned SW receives one actionable inbox item with correct unit/RO/line and must resolve it.
5. Approval then order task routes to configured Parts owner; ETA delay changes blocker and risk without silently moving hard date.
6. Parts received → foreman sees previous actual tech/bay; assigning available bay creates one porter claim task; two simultaneous porters cannot claim same job.
7. Completing movement updates actual location/history and alerts tech.
8. All repair lines resolved → tech requests QC; QC failure generates rework; QC pass records ready time and generates SW task.
9. Sending ready SMS/email logs delivery request and does not automatically create a confirmed pickup appointment.
10. Customer postpones pickup three days → appointment/task moves without regressing QC or closing onsite visit; previous date remains in history.
11. On departure, task is completed, actual departure stored, and unit removed from active onsite queue but retained in history.
12. Overdue hard target with blocked parts shows **Overdue + Parts blocked**, not one in place of the other.
13. Staff with no membership in a different tenant/branch cannot read/change that branch's plans/tasks/notifications.
14. Concurrent SW edits yield version conflict rather than last-write-wins silently overwriting a customer commitment.
15. Every cross-role workload handoff yields a durable recipient notification and a traceable task assignment.

## 12. Delivery sequence

1. Import/rebuild application source, establish tests and deployment baseline.
2. Add pickup plan and change history; migrate existing `promised_pickup_at` carefully.
3. Implement task/calendar model + role inbox + outbox and permission rules.
4. Connect service writer intake/target editor and board; priority projection.
5. Add line flags, approvals, parts ETA and SW task flow.
6. Wire foreman, porter, technician assignment and actual location history.
7. Add QC/release readiness, customer notifications, appointment confirmation and actual departure.
8. Add branch configuration, escalation, dashboards, mobile QA and multi-tenant tests.

## Open product decisions (defaults recommended; not blockers)

- Default target at intake: **required** for service intake; **soft** unless explicitly confirmed hard.
- QC reviewer: **service writer** by default, with organization option for independent QC role.
- Part order owner: **parts department**, with optional SW placement.
- Hard-date change: SW can enter pending revision immediately but must record customer agreement (or explicit authorized management override) before treating old commitment as superseded.
- Automatic priority thresholds: hard within 24 h = critical if unresolved; within three days = at risk, with configurable offsets.
- Missed pickup when ready: keep unit onsite and create pickup reschedule/no-show task; avoid reopening work.
