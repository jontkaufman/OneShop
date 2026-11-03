# OneShop Intake-to-Storage Click-Through Prototype

## v0.5 — Per-role unit identification settings

**Settings → Unit Identification** provides a compact role selector, primary and secondary identifiers, live unit preview, restore defaults, and collapsed summary of all role profiles. Example defaults: writer = customer + RO; technician = RO + VIN suffix; porter/lot = stock number + VIN suffix; sales = stock + year/make/model.

The same browser-level profile affects the Service Writer confirmation card, porter movement cards, and role-specific notifications. The formatter is shared with Node tests through `src/domain/identity-display.mjs`, inlined into the standalone build through `scripts/build-prototype.py`; the prototype-only adapter is `src/domain/identity-demo-ui.js`.

**Security boundary:** identifier display settings never grant access; the demo uses mock data and has no real permissions. Production must use authorized server projections, org/branch versioned overrides, and active-workflow role selection.

See [WF-06 Role-Based Unit Identification](../docs/workflows/06-role-based-unit-identifiers.md).

## v0.4 — Role-based notification handoff demonstration

The offline walkthrough now includes a **Notifications** screen. Select the demo role (Service Writer, Porter, Technician, Foreman, Dispatch, PDI, Wash, Detail) to inspect that role's inbox.

- Request a move: Porter inbox gets a new actionable notification. Opening it shows unit, pickup/destination information and a link to the porter queue.
- Claim a move: Writer inbox gets a claim-status update.
- Confirm delivery: Writer receives a completion update; the receiving role gets an actionable unit-ready notification. If destination is a Service Bay, the UI lets you specify whether a demo technician was already assigned; otherwise the foreman gets the task.
- Opening a notification marks it **read**, not accepted. Acknowledge receiving work separately; completion/repair approval is not simulated.
- This is a **single-browser role switch**, not two authenticated users. Notifications and move states are memory-only. No real permissions, push transport, Supabase persistence, concurrency or location capacity guarantees exist in this demo.

The initial pure domain routing policy and automated tests are in `src/domain/handoff.mjs` and `tests/handoff.test.mjs`. Run `npm test` to exercise the stand-alone policy model. Full service responsibility and persistence requirements: [WF-05 Handoffs and Notifications](../docs/workflows/05-operational-handoffs-and-notifications.md).


**Design governance:** [Enterprise Settings & Permissions UX Standard](../docs/design/settings-experience-standard.md) applies to every new/modified setting or permission. Review and polish the entire affected settings block, not just the new control.

## v0.3 — Shared styling and dealership settings

**Interactive Settings page** (Configuration > Settings):
- Check-In Fields: independent Customer Service and New Inventory profiles, with Required / Optional / Hidden per field.
- Customer name may be optional; VIN and stock number can be independently required or optional. At least one usable unit identifier is always required; both identifier fields cannot be hidden.
- RO number may be optional for a draft RO; profile-specific line-item and writer requirements are also configurable.
- Appearance: Classic Blue (approved), Graphite and Forest themes apply to the entire prototype.
- Demo-directory search can reuse existing customer/unit/RO values instead of duplicating them.
- Settings are stored only in this browser's localStorage; **not yet in Supabase**.

**Shared CSS architecture**: edit `styles/tokens.css` for global palettes and `styles/oneshop.css` for reusable UI components. The tracked `prototypes/service-writer-intake.source.html` imports both once. Build the standalone demonstration file using `python scripts/build-prototype.py`. Do **not** individually edit page colors or hand-edit the generated `prototypes/service-writer-intake.html`.

Detailed field-policy and production configuration contract: [WF-04 Dealership Settings](../docs/workflows/04-dealership-settings.md).


**Status:** interaction model, not an integrated production module. All values are fictional and held in browser memory. No Supabase authentication, SQL persistence, deployment or location-capacity service is connected.

## Test the journey
Open [service-writer-intake.html](service-writer-intake.html) in a browser; no build step or external dependencies.
1. Choose Customer Unit / Service or New Unit / Inventory.
2. Enter customer + unit fields. The sample is fictional, editable.
3. Enter at least one RO and line item; use Add line item or Add another RO.
4. Confirm physical receipt and click Finish Check-In.
5. In Move Unit, confirm pickup, choose a destination type (specific numbered space optional), then Request Move.
6. Open Porter Queue; claim, confirm pickup, choose a final physical space and confirm delivery.
7. Open Customer Timeline; expand the Service Visit and view the visit's check-in and move events.
8. Open Space Types / Map to see the placeholder type registry and understand why the full visual map editor is a separate development phase.

## Important production distinctions
- One Customer -> Unit -> many ROs -> many line items. One unit's confirmed physical position is not duplicated by RO.
- Intake classification decides recommended routing, not the relationship schema.
- "New Unit" is provisionally new dealership inventory/PDI rather than a first-time customer-owned vehicle.
- Requesting a move to a space type is enough. Specific space is optional; role policy determines later allocator.
- The service writer does not silently reserve a numbered storage position.
- Check-in, move request, porter claim, pickup and delivery are distinct events. Only delivery confirms the new current location.
- Service Visit is one primary customer-timeline marker with expandable child events; future reminders/recommendations remain distinct from events that occurred.
- A missing-key or non-drivable flag disables the request button in this UI simulation; production requires a documented supervisor exception and a real server-side validation.
- Location types and numbered codes in this prototype are static fixtures. There is no real map image import, availability, space capacity, map editor, SQL state, authentication, concurrency or tenancy. **Never use this prototype to coordinate real physical vehicle movements.**

## Engineering source-of-truth
The design contracts live in:
- [Service Writer Check-In](../docs/workflows/01-service-writer-check-in.md)
- [Customer Timeline](../docs/workflows/02-customer-timeline.md)
- [Map/Space Type Contract](../docs/workflows/03-location-type-and-map-builder-contract.md)

Before making this a production app: complete Gate 0 source/deployment setup, approve org/branch permissions, create Supabase tenant-safe migrations/RLS, implement typed transactional check-in and move commands, connect map editor state, test claim races and stale location updates, and pass mobile/desktop and cross-tenant E2E tests.
