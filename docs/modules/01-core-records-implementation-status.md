# Module 01 — Core Records: Applied Foundation

**Status (November 3, 2026): database applied and inspected, client data adapter and minimal authenticated application shell committed. The application is not yet configured/deployed or bootstrapped with users.**

## Current real state

- Supabase connection: `zimtykes - OneShop`, project ref `igofopipuuqtsxjhjymq` (the only confirmed existing OneShop project).
- **Two migrations APPLIED to the project's main database:**
  - `20261103190742_oneshop_module01_core_records`
  - `20261103190927_oneshop_module01_core_records_hardening`
- Applied migration SQL is tracked in `database/schema/001_core_records_review.sql` and `database/schema/002_core_records_security_review.sql`. Review SQL files are the GitHub source snapshot; migration history lives in Supabase.
- Twelve public tables, 28 RLS policies, all 12 public tables have RLS enabled. No application rows were inserted and no users were provisioned.
- Supabase security advisor reported **no security lints**. Performance advisor's initial 12 missing foreign-key indexes were addressed by the second migration; remaining unused-index notices are expected while tables have zero rows.
- A **project-independent dev/test Supabase branch has NOT been created.** The first migrations were applied to the connected primary project; do not use real customer data or treat the project as a verified production app. Establish proper dev and staging isolation before further migration cycles.
- No deployed frontend or authentication integration has been verified. The prior check-in/porter interface remains an offline prototype.

## Implemented model

```text
Organization
  └─ Branch
      ├─ Staff Membership (role assignment, admin-provisioned)
      └─ Onsite Visit (one physically active visit per unit)
Customer ── Unit-Customer Relationship (effective dated) ── Unit
                                                          └─ Repair Order
                                                               └─ RO Line Item
Activity Event → Unit, optional Visit / RO / Line Item
Role Identifier Profile → Organization, optional Branch, Role
```

Customer name/contact fields are separate; Unit is a durable organization-scoped identity requiring VIN or stock number. New inventory with stock number only is supported. Customer relationship may change over time; an RO may have a different bill-to customer. A visit represents a single physical presence across multiple ROs, not a duplicated unit. Events are append-only to clients and are reserved for trusted commands.

## Permissions currently enforced

- Authenticated staff may **register** a unit in their organization; cannot fabricate a Customer, Visit or RO simply by registering the unit.
- Service Writer, manager and org admin may create core customer and visit/RO records under their scoped RLS policies. Sales also has a constrained customer role, as documented in the initial schema.
- Only authorized branch employees may view ROs/visits and line items; detailed customer contacts are more restricted than unit identity.
- Porters cannot read RO details merely because they can see the unit. Future porter notifications must come from a server-approved minimal projection.
- Clients cannot create staff memberships or activity events.
- Until transaction-safe state transitions exist, clients cannot update visit state, overwrite historical unit-customer relationships or write role-display profiles.
- Staff membership roles are stored in database tables; **not** in user-controlled `user_metadata` claims.
- Organization/branch membership RLS is intentionally separate from view ordering. Changing visible identity does not grant access.

## Code committed

- `src/data/records-api.mjs` is a native fetch adapter for Supabase REST with **authenticated user token**, publishable key, explicit organization/branch filters, and strict allowed input fields.
- `tests/records-api.test.mjs` verifies branch/organization request scoping, VIN and stock-only lookup, minimal registration, missing identifiers, absent authentication and error handling.
- The adapter deliberately does not expose client methods for membership creation, visit completion, physical move delivery or other unaudited state transitions.
- `app/index.html`, `app/main.mjs`, `app/config.mjs` and `app/shell.css` provide a minimal authenticated records UI with signed-in membership selection, exact VIN/stock lookup and unit registration. All external credentials are blank placeholders. The UI is **not yet deployed, authenticated against a real user, or verified in a browser with live data**. See [App runbook](../../app/README.md).
- `tests/app-shell.test.mjs` statically verifies safe configuration references, shared styling and ES module parsing.
- `src/domain/identity-display.mjs` and `src/domain/handoff.mjs` from earlier draft branches remain reusable pure contract code.

## Deployment and next slice

1. Establish a separate development project or Supabase branch, deploy the migration history to it, and verify RLS with multiple authenticated test users and two isolated organizations.
2. Create the actual application shell with Supabase Auth session handling; use only a publishable key in the browser. Provide organization/branch selection, selected workflow role and loading/error/empty states.
3. Provision an initial organization, branch and admin membership **only from a trusted administrative path**. No user can grant themselves organization or admin membership by sign-up.
4. Integrate Customer and Unit search/reuse, stock/VIN registration, and related RO list with the authenticated adapter. Match duplicates by candidate selection; never automatically merge.
5. Implement the **transactional Service Writer check-in command**: same transaction creates visit, associates ROs/lines, validates required-field profile/version, writes activity event and idempotency result. A direct client visit insert is provisional and should be replaced by this command before live rollout.
6. Implement physical-location types, movement queue, notifications and transactional porter claim/delivery in subsequent slices. The advanced map editor remains a later separately reviewed module.
7. Test missing customer/VIN, two simultaneous ROs, two users claiming one move, stale location, historical ownership and cross-tenant attacks.

## Security gates before real customers

- Do not connect the browser to privileged Supabase service-role/secret keys.
- No public registration may create a staff membership. Memberships must be invited/provisioned by trusted staff/admin.
- Check whether role-appropriate views or RPCs are needed to avoid exposing full VINs or customer information to operational roles; field-level presentation filtering alone is not security.
- Do not allow direct client updates that falsely claim repair completion, physical movement, departure or approval.
- Review/delete/correct historic relationships through audited operations only.
- Confirm API exposure/grants, RLS, indexes, audit triggers and migration reproducibility in development.
