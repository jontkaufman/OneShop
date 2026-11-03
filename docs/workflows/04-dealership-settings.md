# WF-04 — Global Appearance and Dealership Check-In Requirements

**Status:** implemented in the **offline v0.3 prototype**, not yet connected to Supabase. This is the backend contract for the production module, not an applied migration.

**Enterprise settings UX directive:** All new or changed settings and permissions must comply with the [OneShop Settings & Permissions UX Standard](../design/settings-experience-standard.md). Adding an option triggers a review of the whole affected settings section for grouping, density, clarity, responsive behavior and permissions. Do not append controls without re-evaluating their surrounding component.

**Role-specific unit identification:** See [WF-06 Role-Based Unit Identification](06-role-based-unit-identifiers.md). It extends the compact Settings information architecture without changing check-in required-field policies. Role identifier order is a **display preference**, not a data-access permission or a different Unit/RO identity.

## Design goals

1. Shop administrators configure required, optional or hidden fields **per intake workflow**, not through separate hard-coded page forms.
2. The Service Writer searches for an existing customer, unit or RO before creating duplicates. Where an existing record is selected, keep its stable IDs and prefill allowed fields.
3. Shared style variables control the entire application. A theme change should not require editing individual page components.
4. Every submitted check-in remains traceable to a unique Unit even if customer identity or external RO number is not yet known.
5. Separate inventory receiving from customer service without branching into incompatible customer/unit/RO schemas.

## Prototype settings

Navigation: Configuration > Settings > Check-In Fields, Appearance.

### Check-In Fields

Two independently configurable profiles:
- **Customer Service:** default required Customer/account name, VIN, RO number, initial line-item description and responsible writer. Phone, email, stock number, year, make/model, pickup commitment and notes default optional.
- **New Inventory:** default required stock number and responsible writer. Customer/account name, VIN, RO number and initial line-item description default optional. Phone, email and customer pickup commitment can be hidden.

For each supported input, the administrator chooses:
- `required`: show the field and refuse to advance if blank.
- `optional`: show the field but do not block progression if blank.
- `hidden`: omit it from that workflow's intake form. Hiding a field must not erase existing durable data on a matched customer/unit.

**Non-configurable integrity rules:**
- An actual Unit record must have at least one usable identity key: VIN/serial **or** stock number (the production model can add further stable identifiers).
- The two identifier fields may both be optional, but a check-in still requires one nonblank value. Both may **not** be hidden.
- Branch, receiving actor and verified actual arrival location are mandatory operational facts, regardless of field profile.
- A check-in with no customer is an **unassigned account** state, not a fictitious person, and must be reconciled before customer-specific authorization or communication.
- An RO without an external number remains an internal draft with a stable UUID; the number can be linked/imported later. Missing line-item detail remains pending, not falsely completed work.
- Key custody, safety/operability and movement eligibility have **independent operational gates**; hiding a data-entry field cannot waive porter safety or dispatch verification.
- A local change to requirements must not alter historic check-in snapshots or erase existing field values.

### Avoiding repeated entry

1. At check-in, search by customer name/phone/email, VIN/serial, stock number or RO number.
2. Return **candidate matches**, not implicit automatic merges. Allow the Service Writer to choose an existing customer/unit and reuse stable IDs. Do not create another unit simply because the customer changed.
3. Only capture missing or changed fields; distinguish an update to current contact data from a historical RO snapshot.
4. For a new customer, allow provisional unassigned contact when permitted, but maintain a clear follow-up/reconciliation queue.
5. The prototype has only two fictional lookup fixtures. This is **not** a live query or deduplication implementation.

### Appearance

Shared source files:
- `styles/tokens.css`: semantic color tokens and the Classic Blue, Graphite and Forest palettes.
- `styles/oneshop.css`: reusable components and responsive behavior.
- `prototypes/service-writer-intake.source.html`: design-neutral interface source.
- `scripts/build-prototype.py`: compiles standalone HTML with embedded copies of the shared styles for offline review.

Future production React app imports `tokens.css` and `oneshop.css` **once at its app shell**. Screens use the tokenized components; the same appearance configuration applies to the entire branch or organization. Theme colors must remain contrast-tested. Avoid custom CSS written to database by nontechnical users; expose approved palette variables/settings.

## Proposed Supabase model (NOT executed)

```sql
-- Illustrative only; adapt table names to the final tenant model.
create table organization_settings (
  organization_id uuid primary key,
  default_theme text not null default 'classic',
  checkin_profiles jsonb not null,
  config_version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table branch_settings (
  organization_id uuid not null,
  branch_id uuid not null,
  theme_override text,
  checkin_profile_overrides jsonb,
  config_version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (organization_id, branch_id)
);
```

Do **not** use the above snippet directly as migration; it omits tenant-safe foreign keys, RLS, validation and audit. Build after Module 01 organization/branch membership schema exists. Config resolution = branch override if present -> organization default -> system safe fallback.

Required implementation contracts:
- `GET /config/checkin?branchId=...&workflow=customer|inventory`: returns effective rules and version scoped to authorized branch.
- `PUT /config/checkin`: management-only, validates a typed field registry, recognized modes, identifier group policy, stable version; writes audit diff.
- `POST /visits/checkin`: validates active profile **server-side**, records chosen config version, actor, arrival, customer/unit/RO links and idempotency key in one transaction; does not trust client validation.
- `GET /records/search`: scoped, permission-filtered candidate search with stable customer/unit/RO IDs, PII redaction and disambiguation.
- `POST /movements/request`: independently validates current location, routing type and movement restrictions; no implicit space allocation or physical movement.

Access:
- Organization admin and authorized shop managers configure field rules and theme.
- Service Writers can read active profile and complete check-ins but cannot change policy.
- Tenant and branch isolation covers profiles, cached queries, RLS, API, search and notifications.
- Policy change must be audited and versioned. Concurrent check-in uses a known config version and receives actionable validation if the configuration changed mid-flow.
- Seeded demo/fixture profiles are never production customer information.

## Tests added to local prototype verification (not CI)

Browser exercised at 1440px and 390px, plus end-to-end flow at tablet 768px:
- Rule changes affect check-in immediately.
- Customer name can be optional, VIN optional, stock required.
- Hiding both identity fields is rejected.
- Existing fictional customer/unit lookup reuses saved data.
- Stock-only intake advances with missing customer data as permitted.
- Theme switches change global components on every screen.
- A check-in proceeds to type-based porter request, delivery and timeline on desktop/tablet/mobile.
- Browser JS did not report page exceptions in exercised flows.

Outstanding: live persistent settings, proper organization/branch account roles, true record search and deduplication, safe migration, mobile assistive-technology checks, RLS tests, concurrent check-in, and a published application deployment.
