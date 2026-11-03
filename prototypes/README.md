# OneShop Intake-to-Storage Click-Through Prototype

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
