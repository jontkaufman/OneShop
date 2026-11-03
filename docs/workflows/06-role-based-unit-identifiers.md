# WF-06 — Role-Based Unit and Work Identification
**Status:** user-confirmed design requirement (November 3, 2026). Domain formatter and interactive offline Settings prototype are review artifacts, not production enforcement or deployed settings.

## Purpose

Dealership employees identify the same physical RV/vehicle using different conventions:
- Sales works mainly from **stock number**.
- Service writers rely on **customer name + RO number**.
- Technicians use **RO number + VIN**.
- Porters/lot operations use **stock number + VIN**, especially in storage.

Keep one canonical **Customer → Unit (RV or vehicle) → RO → Line Item** hierarchy and one stable Unit identity. The selected identifier order affects presentation, not identity resolution, parent links, customer ownership, search permission, or physical occupancy.

## Where it belongs

**Settings → Roles & Permissions → Display Identifiers** is the intended production information architecture. In the offline prototype this appears as **Settings → Unit Identification**, with the roles shown in a compact selector/list and a two-field editor.

An organization administrator defines defaults. Authorized branch/site managers can apply branch overrides where enabled. Editing which fields are shown first is a configuration capability distinct from the permission that lets a role read a VIN, customer name, or RO.

Use the OneShop [Product Design Principles](../design/product-design-principles.md) and [Enterprise Settings UX Standard](../design/settings-experience-standard.md): update the whole affected settings component, preserve compactness and legibility, show immediate preview, and avoid filling the interface with a large matrix of controls.

## Default role profiles

| Role | Primary | Secondary |
| --- | --- | --- |
| Service Writer | Customer name | RO number |
| Technician | RO number | VIN (last six by default) |
| Porter / Lot Operations | Stock number | VIN (last six) |
| Sales | Stock number | Year / Make / Model |
| Foreman | RO number | VIN (last six) |
| Service Dispatch | RO number | VIN (last six) |
| Parts | RO number | Stock number |
| Warranty | RO number | VIN (last six) |
| PDI / Inventory | Stock number | VIN (last six) |
| Wash | Stock number | VIN (last six) |
| Detail | Stock number | VIN (last six) |

Supported selectable fields (initial): customer name; RO number; stock number; VIN last six; full VIN where authorized; year/make/model; stable unit reference; secondary can be None. Both cannot be the same field.

**Default VIN format is last six digits/characters for compact operational cards; optionally choose full VIN when the role is authorized.** A receiving or search/detail view can reveal fuller data when authorized; do not grant full VIN visibility via display settings.

## Application-wide presentation contract

The effective active-role profile controls consistent, identifiable primary and secondary labels for:
1. Unit headers and list rows.
2. Service Writer and foreman queues.
3. Porter movement cards and role-targeted notifications.
4. Technician work/receiving cards.
5. Map selected-unit overlays and search results where information is role authorized.
6. Departmental handoffs and relevant audit summaries (while audit stores immutable original identities).

**Notification detail is role-specific:** show the chosen identifiers immediately, and below them location, task, due/priority, handling instructions and the relevant RO lines. A porter does not need a customer invoice or full account profile. A technician receiving a bay assignment sees the relevant RO and line-item context.

## Missing fields, ambiguity and data scope

1. Never invent or silently overwrite a missing VIN/stock number/RO to make a card look complete.
2. When a selected field is blank, use the next authorized available fallback: VIN suffix, stock number, stable Unit reference. A fallback must come from an allowed, server-filtered data projection.
3. If several ROs are open, the card uses the RO associated with the specific **task/work/assignment**. If it is not known, show an explicitly ambiguous state or prompt selection. Never pick the newest or first RO at random.
4. Customer ownership may change. Current display name does not rewrite historical RO customer/bill-to snapshots, nor does it grant new owners private access to past customers' data.
5. Different roles can see different presentations of the same Unit. They must still share stable Unit ID and authoritative movement state.
6. If a user holds multiple roles, use the role appropriate to the **active workspace/task**; do not concatenate all identifiers from every granted role into a card. A role switch changes display preference, not grant of permissions.
7. Exact match/uniqueness cannot be assumed from customer name, VIN suffix, stock number or RO number alone. Search results display supporting context and require explicit disambiguation.
8. The display profile is not an authorization policy. A role's ability to read customer name/full VIN/RO detail remains controlled by tenant/branch memberships, RLS and server projections.

## Proposed durable Supabase contract (NOT a migration)

Store **versioned display profiles scoped by organization/branch/role**, e.g.:
- `role_identifier_profiles`: `organization_id`, `branch_id` nullable (organization default or branch override), `role_key`, `primary_field`, `secondary_field`, `config_version`, `updated_by`, `updated_at`.
- Uniqueness must handle nullable branch explicitly (partial indexes or an equivalent normalized key).
- Role keys and field names are validated against an approved registry, not arbitrary client-provided text.
- Enforce that primary is known, secondary is known or None, and they differ.
- Allow inherited organization profile when branch override absent; system default otherwise.
- Only principals with `settings.role_display.manage` can update; managers without `permissions.manage` cannot grant themselves read rights.
- Audit before/after and actor, compare-and-swap versions, cache invalidation and organization/branch isolation.

**Do not create this as a new generic permission role.** It is a display preference **attached to** an existing authorized role, while permissions remain separate. Prefer organization defaults with optional branch overrides and a context-specific active role.

## Demonstration acceptance

- Service Writer preview displays Customer + RO; Technician preview RO + VIN; Porter preview Stock + VIN; Sales preview Stock + year/make/model.
- Admin selects a role and changes primary/secondary. All role-aware demo queue and notification cards respond immediately.
- Global theme is unaffected; original check-in field requirements are preserved in another Settings section.
- Missing stock number falls back to VIN; no existing value is overwritten.
- Multi-RO unit without a selected work context does not display an arbitrary RO.
- A role not permitted to view customer names or full VIN cannot reveal them through identifier preference changes.
- Mobile: section remains compact and controls remain usable at a narrow viewport.
- User changes affect *display* only; no new Unit, RO, Line Item, movement, or notification is created.
- Settings are stored in browser localStorage in the offline prototype only. Production requires server-backed versioning and RLS.

## Next implementation gate

Implement role_identifier_profiles after core org/branch/role membership tables exist. Build one reusable authorized UnitIdentity component used everywhere rather than per-module string templates. Add tests for tenant/branch scope, grants, fallback, multiple roles, missing fields, and screen reader labels before production launch.
