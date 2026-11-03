# WF-02 — Customer Overview and Timeline
Status: proposed UX/data contract v0.1. Timeline design is integral to check-in event modeling, but full UI is a separate delivery slice.

## Purpose
The **timeline is the primary content on Customer detail**, with identity/communication summary at the top, a compact unit selector, and navigation to each unit's history. Staff need to understand past activity, current service state, upcoming recommendations and owned reminders without navigating dozens of tabs.

## Layout
Header: customer name / account type, main phone, additional phone (optional), email(s), preferred contact method, short notes, quick actions. Avoid placing sensitive finance or raw internal notes in the default overview.
Below header: prominent full-width timeline (default last 90 days, selectable 30/90/365/custom/all, future window and all/selected unit). Show units selector with recognizable ID/stock no/year/make/model.
Main **Service Visit** is exactly one primary timeline item per onsite visit, with arrival date, branch, associated RV, count of ROs, current stage and next action. Hover can preview on desktop; click/tap/keyboard expands a nested chronological sequence beneath that item. Hover must not be the only way to access.
Nested visit sequence may show check-in, check-in condition, moved to storage, bay dispatch, technician start/completion, part delay, wash/detail, QC, pickup ready, departure, each linked to responsible record with date/time/actor. ROs and their line items appear as drilldowns, not a disconnected top-level event every time one changes status.
Future reminders, follow-up commitments and recommendations show **future/scheduled** styling and due date as separate primary markers where relevant; proposed recommendations are not actual events until action occurs.
Filters: timeframe, unit, event category, open/overdue, current vs history. Sort by event timestamp; group by local branch time zone for visit details.

## Data source
Do not store a second editable timeline that conflicts with real operational states. Source events from durable `activity_events` written **in same transaction** as check-in, movement completion, key custody, RO/job change, QC, customer contact and release.
Recommend fields: id, organization_id, branch_id, customer_context_id, unit_id, visit_id nullable, ro_id nullable, line_item_id nullable, event_type, occurred_at, actor, source_entity/id, correlation/idempotency key, summary snapshot and internal/customer-safe visibility.
Top-level visit is built from `onsite_visit`; nested events from activity log. Scheduled reminders/recommendations originate from their own tables with status+due_at, not fabricated future activity events.
Read projection can be paginated and preaggregated for performance; customer timeline access must honor customer relationship at event time, not simply all unit history.

## Privacy/permissions
Current owner may see their own current visit and allowed unit history, but must not automatically inherit the previous owner's addresses, approvals, prices, invoices, messages or payments. Internal employees get role-scoped views; publication to a customer portal requires separate approved projections.
An event may have a public-safe label while its raw attributes remain staff-only. Audit log is not itself a public activity feed.

## Acceptance
- Open a customer with 2 units and 3 historical visits; top-level timeline has 3 service-visit markers, not 18 moves.
- Expand visit: ordered nested events show exact physical movement and service milestones.
- Filter to selected unit and last 90 days; results match both scopes, still show relevant future reminders separately.
- Customer with no visit has a useful empty state and actionable check-in shortcut.
- Two ROs under one visit still create one top-level visit entry, both discoverable inside.
- Event about a prior owner is not exposed to later owner merely by sharing unit ID.
- A future recommendation is labeled `Recommended` or `Due`, not `Performed` or `Completed`.
