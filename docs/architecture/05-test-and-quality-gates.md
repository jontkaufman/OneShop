# OneShop Quality and Verification Contract
Status: proposed test strategy. A feature is not 'done' until demonstrable from source, database and UI.

**Immediate test-first handoff requirement:** Execute the scenarios in [WF-05 Operational Handoffs and Notifications](../workflows/05-operational-handoffs-and-notifications.md). Required checks include: any authorized staff unit registration with later writer reuse; porter role queue notification; exclusive claim; requester completion notification; named technician or foreman fallback receiving notification; acknowledgement separate from read/completion; idempotency, blocked location and tenant/branch negative tests. The new pure policy tests in `tests/handoff.test.mjs` cover only deterministic routing and are **not** a substitute for DB, realtime or multiuser tests.

## Test layers
- SQL schema integrity and migrations: fresh DB setup; scope-safe FK; uniqueness and idempotency; upgrade compatibility and preserved history.
- Security/RLS: two organizations, two branches, staff roles, cross-tenant joins, direct RPC attempts, stored assets, search/export, client impersonation and privilege escalation. Include negative assertions.
- Domain state machines: legal/illegal transitions, retries, cancellation/supersession, version conflict and event ordering.
- Concurrent integration: simultaneous porter claims, location admissions, map edits, multiple QC approvals, duplicate authorization/payment webhooks.
- Unit UI: search collision/disambiguation, form validation, role-specific actions, errors/empty states, undo/redo and map transforms.
- End-to-end journey: arrival -> assign -> move -> perform -> part blockage -> wash/detail -> QC -> key return -> advisor release -> departure; second RO active on same unit.
- Multi-device: desktop office monitor, shop tablet, personal smartphone, shared terminal attribution, poor/unstable network, resume from saved state.
- Observability/recovery: duplicate events, notification failure, import replay, stale browser data, backup restore and release after partial failure.

## Critical scenario fixtures
| Code | Scenario | Required result |
| --- | --- | --- |
| E2E-01 | 1 unit, 2 concurrent ROs, 2 advisors | 1 confirmed location/visit; all relevant ROs reviewed by coordinating advisor |
| E2E-02 | 2 porters claim same move at once | exactly 1 successful claim, loser sees conflict; no ghost assignment |
| E2E-03 | canceled move later reports delivered | stale event rejected; confirmed location unchanged |
| E2E-04 | occupied single bay vs 4-capacity shaded area | no duplicate single-bay occupancy; area records individual unit IDs and correct count |
| E2E-05 | map space appears in two map views | identity and occupancy identical; editing placement not physical movement |
| E2E-06 | zoom/pan/resize on map including tiny marker | geometry stable, labels/borders readable, no accidental move; touch controls usable |
| E2E-07 | technician finishes repair, missing part on other job | only impacted work remains blocked; work outcome and ownership explicit |
| E2E-08 | warranty partially approves work | approved jobs unblocked; other work and claim/payment state separate |
| E2E-09 | alert after closing time | persists immediately, delivery/escalation starts at next open period |
| E2E-10 | repairs done, wash/detail and writer QC pending | pickup blocked until checks/exception; release not inferred from completion |
| E2E-11 | advisor approves unfinished service with documented deferral | explicit reason/owner/customer communication/follow-up retained; departure separate |
| E2E-12 | keys left in bag after failed packet handoff | move may be delivered, custody blocker remains open |
| E2E-13 | tenant/branch unauthorized caller guesses IDs | no data leakage, no mutation even via direct RPC/storage/search |
| E2E-14 | RV ownership changes | historical repair remains; new owner does not inherit previous owner's private payments or communications |
| E2E-15 | customer accepted next-visit recommendation twice (future) | one draft service job; original posted invoice unchanged |
| E2E-16 | past estimate revised (future) | previous signed scope/price intact; stale approval rejected |
| E2E-17 | failed card charge or pending warranty (future) | no false paid status, no incorrect customer balance |
| E2E-18 | internal damage/balancing charge (future) | correct direct cost/internal ledger classification, not retail revenue |

## Engineering quality rubric
No undocumented breaking schema change. CI must have type/lint/test and database setup. Every permission boundary has a reproducible negative test. Every stateful command has validated preconditions, idempotency and audit. Every module includes real role workflows plus error recovery; mock UI never represented as saved real data.
Before pilot: performance testing at 300 on-site units and representative concurrent staff; mobile behavior; restore drill; escalation settings verified against branch time zone; privacy/security review; real-user walkthrough. SaaS-wide sizing (thousands of tenants) is an architectural scalability target, not a measured capacity claim.
Review from both ends: trace an RO/visit from intake through departure, and trace an eventual invoice from posted balance back to actual job, customer authorization and any originating finding.
