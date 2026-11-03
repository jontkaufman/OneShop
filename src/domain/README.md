# Unit identification domain

`identity-display.mjs` exposes default identifier profiles by employee role, validates primary/secondary selections, formats authorized unit/RO context and handles absent stock/VIN/RO values. It does **not** authorize access. The backend must supply a permission-filtered record and explicit allowed field list; never infer grants from the selected display profile. `identity-demo-ui.js` is a browser-only adapter inlined by the prototype builder.

# Operational handoff domain

This is the first **executable** OneShop domain contract, intentionally independent of React, Supabase and any notification transport.

- `handoff.mjs` calculates targeted work-task and inbox-notification intents from validated movement events.
- `tests/handoff.test.mjs` verifies role-queue handling, technical receiving assignment, requester notification, idempotent event keys, role targeting, and invalid data rejection.
- Run `npm test` with Node 22+; no third-party dependencies or credentials.

**Important:** These pure functions do *not* authenticate users, prove delivery, write database records, authorize RO work, reserve a bay or send push messages. A trusted transactional service must enforce RLS/capabilities, active move versions and capacity; persist `work_tasks`, `domain_events`, `notifications` and `outbox_events` atomically; and use these calculated recipient intents only after authorization. Role names in this file are logical queue identifiers, not a substitute for tenant/branch membership checks.

Workflows and data ownership: [operational handoff contract](../../docs/workflows/05-operational-handoffs-and-notifications.md).
