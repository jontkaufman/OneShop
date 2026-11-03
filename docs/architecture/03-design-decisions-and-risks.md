# OneShop Architecture Decision and Risk Register
Date: 2026-11-02 | Status: decision proposals, not approvals or implementations.

## Decisions already established (preserve)
- Operational coordination is the current product wedge, not full replacement of CDK.
- A unit may have multiple simultaneous repair orders and only one confirmed physical position on an active visit.
- Porters claim shared queue moves; foreman/management decides competing movement priority and bay placement.
- Writers handle guest intake/pickup and final QC; advisor authorizes release; wash/detail follows repairs and precedes final QC when applicable.
- Keys begin in writer-controlled cabinet, travel with repair dispatch packet/bag, return to cabinet after final QC; custody is not inferred from digital assignment.
- All shop staff may read internal RO conversation, but not all can change assignments, moves or release state.
- Acknowledgment escalation follows lead -> advisor -> management at one business-hour interval per distinct recipient, adjustable and paused after hours.
- One physical space may appear on multiple map views; configuration does not change real physical location.
- Required property setup includes numbered positions, shared multi-unit areas, configuration draft/review/publish, scale-correct map editing.
- Estimate header decisions are ACCEPT, DEFER, DECLINE; no response remains unanswered. Customer choice is separate from enforceable authorization and invoice/payment.
- Invoice only bills completed authorized work; future accepted invoice recommendation routes to next compatible draft work order, deduplicated.
- Intertrak inspections remain separate; no assumed shared auth/database; live CDK integration not established.

## Critical unresolved design choices
| ID | Decision / tension | Recommendation | Blocks |
| --- | --- | --- | --- |
| ADR-001 | OneShop source code: recover hosted prototype vs rebuild? | Audit source/export availability; if inaccessible, rebuild against documented behavior with explicit parity inventory | Gate 0 |
| ADR-002 | Org/branch/site hierarchy; dealer groups and staff across branches | organization security boundary, branches contain physical properties; role grants scoped to branch | Module 01 |
| ADR-003 | What is authoritative for master RO/customer/unit fields once CDK arrives? | external source ownership matrix with local override policy; until verified, OneShop-owned demo/native records | Integration |
| ADR-004 | Service job vs task/work item cardinality | Stable service_job for billable/repair scope, separately assignable department tasks/jobs; avoid equating RO to one technician task | Module 01/04/09 |
| ADR-005 | One physical unit, two open ROs, different advisors: who controls visit release? | explicit visit coordinating advisor, escalation to manager when conflicting commitments | Module 01/07 |
| ADR-006 | Unit inside one shared parking area: capacity and position precision | named shared area with occupancy list/count; optional freeform subposition/notes, never fake unique numbered slot | Module 02/03 |
| ADR-007 | Map editing and published/live map ownership | draft immutable snapshots and publication, stable location identity, optimistic version checks | Module 02 |
| ADR-008 | Movement race and capacity semantics | transactional claim, active-version check on delivery, one-capacity unique occupancy, bounded area capacity | Module 03 |
| ADR-009 | Shared terminal individual attribution | separate employee login/PIN re-auth for sensitive actions; no generic kiosk actor for custody or release | Module 01/03/07 |
| ADR-010 | Whether OneShop becomes a financial system of record | keep first pilot coordination-first; separate estimates/financials as later product decision, with ledger/tax/legal workstream | Module 09/10 |
| ADR-011 | Site operating hours for escalation across overnight shifts | branch calendar/timezone with pause/resume elapsed time and staffed override | Module 06 |
| ADR-012 | Data retention, privacy and prior-owner visibility | separate owner/customer relationships with effective dates and controlled attachment access | Module 01/09 |
| ADR-013 | Onsite visit while a unit is moved between branches, offsite, or in long-term storage | explicit transfer/checkout event and one active occupancy per unit, policy for branch-level active visits | Module 03/07 |
| ADR-014 | Which roles may initiate non-RO operational work (wash, sales, storage) | queue task tied to unit+visit, RO optional and source/context mandatory | Module 04 |
| ADR-015 | Customer authorization and local repair regulation across vehicle classes | jurisdiction- and service-class-specific profiles, legal review before production financial launch | Module 09/10 |

## High-severity technical risks
**R1: Fabricated integration success.** Supabase management connection is healthy but no app schema/client deployment exists. GitHub has only docs. Mitigation: Gate 0 verifies build, runtime environment, DB read/write and repo deployment in preview.
**R2: Tenant isolation failure.** Unscoped FK, RLS holes, storage URLs, RPC bypass or global searches expose dealer/customer data. Mitigation: composite tenant keys, least-privilege RLS, private storage and adversarial multitenant tests before pilot.
**R3: Physical move race.** Two porters claim same move or stale completion rewrites location. Mitigation: versioned transactional state machine and idempotency; conflict UI and audit.
**R4: Map capacity corruption.** One logical bay duplicated between maps, drag interpreted as confirmed movement, overlapping shared zones. Mitigation: separate location entities and placements/occupancies with cross-view invariants.
**R5: Record/owner confusion.** Unit linked to multiple ROs or customer ownership changes causes wrong person to see notes or approve work. Mitigation: visit-level coordinating advisor; explicit payer/contact/authority relationships; immutable history, strict publication.
**R6: Premature DMS replacement.** Huge financial scope blocks useful pilot and creates legal/accounting exposure. Mitigation: core coordination wedge, commercial services behind explicit phase gates.
**R7: Alert overload/notification delivery.** Excessive notifications without next action or unreliable device push causes users to ignore alerts. Mitigation: owner-specific actionables, persistent inbox, business-hours logic, mobile tests.
**R8: Inaccurate invoice / payroll / profit.** Combining labor charge, paid hours, warranty allowance and cost creates false profitability. Mitigation: isolated financial ledger, exact money math, approved rates/time policy and reconciliation in later modules.
**R9: Prototype parity drift.** Design history describes behavior not in repo. Mitigation: screen-by-screen capability matrix and recorded acceptance tests; never label a mockup as shipped.
**R10: Irreversible changes.** Direct schema edits without migration/version chain. Mitigation: reviewable migrations in GitHub, non-production test database, backups and rollback plan.

## Architectural approval record
Current status: the recommendations above are not accepted architecture decisions simply because written here. Convert each ADR to an explicit ACCEPTED / REJECTED / SUPERSEDED record during module design review, document rationale, author and date, then enforce through tests.
Immediate blocking priority: ADR-001, ADR-002, ADR-004, ADR-005 and data privacy/RLS patterns for Module 01. A reasonable provisional approach is documented in the Module 01 spec.
