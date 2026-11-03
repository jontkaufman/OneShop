# OneShop Module 01 — Authenticated Unit Records Shell

**Implementation:** Static, dependency-free ES module application shell. **Not deployed or connected yet.** Uses OneShop's shared CSS tokens, authenticated Supabase REST API and role/branch membership records. This is separate from the offline Service Writer/Porter prototype.

## To run against an isolated development environment

1. Create a **separate development Supabase project/branch** before onboarding dealership users; apply the two committed Module 01 migrations and inspect security advisors.
2. Set **ONLY** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `app/config.mjs`. A publishable/legacy anon key is intended for a browser; never put a service-role or secret key in app configuration.
3. Provision an organization, branch, invited authenticated staff user, and `staff_memberships` using a **trusted administrative backend**; ordinary users cannot create their own membership. Auth sign-in must be enabled for the test user.
4. From repository root, run `python3 -m http.server 8000`; open `http://localhost:8000/app/`.
5. Sign in, select the authorized branch/role workspace, search an exact VIN or stock number, and register a unit if no candidate exists.

## Features

- Supabase Auth password sign-in for an *existing employee*, token held only in memory (reload requires sign-in). Future production should use the supported Supabase Auth client with managed token refresh/MFA and policy configuration.
- Fetch authorized branch memberships from RLS-protected `staff_memberships`. The user chooses among **only their own role/branch memberships**.
- Exact VIN/stock search with unit record reuse before registration. The browser shows candidate matches without auto-merging or rewriting.
- Minimal Unit registration (VIN or stock required) via RLS-scoped Supabase Data API, no visit/RO/movement created.
- Uses shared OneShop design tokens and compact forms on desktop and mobile.
- The separate `src/data/records-api.mjs` adapter contains allowed REST methods and scoped filters; tests mock the network.

## Not yet implemented / must not be claimed working

- No publicly deployed URL, environment config, invited users, staff onboarding or sign-in test against a real account.
- No transactional check-in, audited activity events, real customer timeline, movement commands, porter notifications or advanced map.
- No token refresh or production sign-in hardening. Avoid using real customer data until tenant/branch authorization and field-level projections are tested with multiple users.
- Existing unit lookup is advisory and **not atomic deduplication**; two employees submitting the same VIN simultaneously could still create duplicate records. Implement server-side conflict handling/identity resolution before pilot.
- Organization-wide Unit records are visible to any active organization staff under current policy. Sensitive customer contacts/RO and visit details use narrower policies, but full VIN may still be returned to roles with Unit read. Production should use role-scoped projections where necessary.
- A branch/role selection in the UI does not grant privileges. Actual database access is always subject to authenticated staff RLS.

## Automated checks

`npm test` runs the domain, record API, HTML build and basic app source tests in GitHub Actions. These are **source/unit tests**, not browser E2E, API integration, tenant isolation or schema migration test suites.

The next end-to-end release gate is to establish a dedicated development environment, verify sign-in with real member accounts and build the trusted Service Writer check-in transaction (visit, RO links, activity event, idempotency).
