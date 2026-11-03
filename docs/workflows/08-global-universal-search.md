# WF-08 — Universal Search Across OneShop

**Product decision:** approved November 3, 2026. A single always-available universal search in the top navigation replaces separate per-page search inputs and “search by” selectors for everyday records and work. The offline review implements a functional sample; production search is **not yet connected to Supabase**.

## User-facing contract

1. **One field, no search type selection.** A user types a customer name, VIN (complete or suffix), stock number, RO number, OneShop Unit ID, vehicle description, location or work term and immediately gets relevant results across their *authorized* data.
2. **Global entry point.** Present on every module through the shared application shell. Desktop Ctrl/⌘+K focuses it; on mobile it takes the available topbar width. Click, type or keyboard shortcut opens the same results surface.
3. **Whole-system list, grouped by result type.** Give matching Customers, Units, Repair Orders and eventually Visits, Tasks, Spaces, Parts, Warranties, Appointments and Files as modules become available. Group by entity (not a category picker) while ranking exact identifier matches ahead of incidental text matches. Support many results via paginated/virtualized loading; never silently claim to have shown every result when server pagination remains.
4. **Meaningful previews.** Every hit includes an entity type, role-appropriate primary title/identifiers, a short grounded summary, the matching field and a direct navigation action. No generic list of IDs without operating context. Selecting a customer navigates to their linked units/customer record; selecting an RO goes to its RO and linked Unit.
5. **Same experience inside workflows.** Create RO uses the global search to find and *explicitly select* a Unit. Its selector can search by all accessible information (including make/model for discovery), but the actual RO attaches by stable Unit UUID after disambiguation; no make/model-based automatic binding.
6. **No redundant boxes.** Replace the previous VIN/Stock dropdown on the Units page and the RO creation modal's Search-by dropdown/input. Main module surfaces can provide a “Search OneShop” shortcut to the single global input, but not an independent competing search engine.
7. **Keyboard and accessibility.** Enter to open, arrows to navigate, Escape to close, visible focus/active result, outside-click close, understandable empty/no-access states, readable mobile layout and appropriate screen reader labels.

## Search matching and ranking

- Strong exact match: complete stock, VIN, Unit ID and RO, including normalized punctuation/spacing when safe.
- Strong contextual match: customer name, VIN suffix, known location, unit year/make/model; prefix and substring matches supported.
- Broader discovery: brief RO work description, authorized line-item descriptions, notes, tags or other approved linked data.
- Multi-token queries can match related authorized fields on the *same Unit*, e.g. customer + RO.
- Unit cards may appear alongside the exact matching RO/customer, but deduplicate one logical Unit across multiple ROs. When multiple units are plausible, present candidates; never auto-select a unit from make/model alone.
- Minimum input length two characters for broad discovery; specific identifier matching may permit different rules in production. Use capped input length, bounded result count, batched/paginated requests and server query limits.

## Security and tenancy — mandatory

Search-result presence is itself sensitive. **Filter both which records are searchable and which fields can be matched before ranking, counting, previewing or highlighting.** Hiding unauthorized text after a global search is insecure.

- Backend receives authenticated user, current organization and branch context; verifies active memberships and capability grants **server-side**, using RLS/secured views/RPCs and trusted role/field checks.
- Scope each source to its permitted organization/branch. A user may not infer another tenant's customers, VINs, RO numbers, work descriptions, locations or even whether a restricted match exists.
- `customer.read`, `customer.contact.read`, `ro.read`, `ro.description.read`, `unit.vin.read`, `unit.stock.read`, `location.read` are **separate** permissions. Role-based *display identifier* preferences do not confer search access.
- Maintain least-privilege per-module provider projections: Porters search unit identity/location, not private customer contact/RO contents; technicians search work/RO and unit fields according to their actual grants; service writers can find customers/contacts as authorized.
- Do not send an unrestricted organization-wide index to every browser and filter locally. Demo data is a fictional role simulation; production security requires an authorized server-side search endpoint.
- On branch or active-role change, invalidate old results and abort pending requests; no stale unauthorized previews remain visible.
- Auditing: record access to sensitive customer searches as policy requires; avoid logging raw query strings containing sensitive personal information unnecessarily.

## Implementation architecture

A shared `GlobalSearch` shell component invokes one authenticated service, with extensible **entity search providers** for Customer, Unit, RO, Visit, Work Task, Space, etc. Results return `kind, entityId, unitId?, label, secondaryLabel, matchedField, route, score` and a continuation token. Module registration adds a provider and permission projection, not another search field.

- Use debounced requests (approximately 150–250 ms), cancellation of stale requests, server-side ranking and field-filtered summaries. Target low latency under typical loads; validate actual performance with representative tenant data.
- Operational source tables remain authoritative. Maintain search documents/projections or indexed materialized data transactionally as the platform grows. Never allow an untrusted client to create cross-tenant search documents.
- Initial schema supports Customer/Unit/RO relationships, but **no production global-search API/migration has been applied** in this change. Plan indexed search across VIN/Stock/RO, owner relationship effective dates, and approved work text; run adversarial RLS/inference tests before connecting live.
- The offline demo uses `src/domain/universal-search.mjs` for deterministic field-granted indexing and ranking. Its `prototypes/universal-search-controller.js` uses fictional role profiles and local sample records. It is not a substitute for RLS.

## Cross-module experience and growth

Global search belongs to the **application shell**, not Module 01. Every future module must register searchable entity types/fields and access rules, including navigation into the correct role workspace. Work assignments and notification cards reuse its unit/RO context rather than creating new search boxes.

## Acceptance requirements

1. Query `STK-0259`, a VIN suffix, `RO-10482`, `Jordan`, and `freshwater`; verify appropriate unit/customer/RO hits appear without choosing a type.
2. Service Writer sees authorized customer and RO hits. Porter searching the same customer name/RO/work description gets **no hits**, not a redacted hit or a different count that leaks its existence.
3. Porter's stock/VIN search opens only role-authorized unit context; no forbidden customer contact details in preview or clicked view.
4. Create RO opens the *same* global search in a Unit-selection mode and preserves unit ID and existing-owner context subject to grants.
5. A common make/model yields multiple Unit candidates and requires user selection before RO creation.
6. Changing role/branch removes previously visible unauthorized results immediately. Test two tenants, branch scope, mixed-grant users and stale responses.
7. Keyboard navigation, focus, Escape, mobile no-overflow and empty/error states verified.
8. Real backend benchmarks with hundreds of units per dealership and many tenants, including pagination, debouncing, cancellation and query injection safety.

**Status:** Offline prototype and pure search model on draft feature branch; main Supabase project unchanged by WF-08. Real universal search requires an authenticated server index/API and cross-tenant negative tests before production use.
