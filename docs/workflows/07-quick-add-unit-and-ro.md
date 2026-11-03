# WF-07 — Global Quick Add: Unit and Repair Order
**Status:** Offline interface prototype implemented; persistence and transactional RO creation not yet wired to the authenticated app.

## User-confirmed requirements

OneShop must provide a global **+ Add** action in the top navigation. It is an entry point to the same canonical records regardless of the employee's current screen. Its initial actions are:

1. **Add Unit** — minimal unique unit identity, plus optional year/make/model. Offer **Save Unit** and **Save & Create RO**.
2. **Create RO** — identify the existing unit by an **exact unique identifier** (stock number, VIN/serial, or stable Unit reference); resolve and select it, display its current owner and available contact information, then enter an auto-suggested **editable** RO number and a brief work description. Work line items are optional.

The intent is to reduce repeated entry, retain continuity between screens, and support the operating conventions of different dealerships.

## Canonical data contract

- `Unit` belongs to `Organization` and retains a stable UUID regardless of VIN, stock number, account owner, location, or number of ROs.
- Stock and VIN can be empty individually, but **not both** on registration. Unit reference is a valid locator for an existing Unit.
- Year, make, model and customer name are **never sufficient** as an exact identity key. They can be disambiguating metadata after the unit has been found by an identifier.
- An identifier may be duplicated in legacy/imported datasets; return **candidate records for explicit disambiguation**, never silently choose the first result.
- `Create RO` adds an RO to the selected **existing Unit ID**. It must never create a second unit or automatically create an onsite visit.
- Unit may have zero or more ROs. An RO belongs to one Unit and may optionally be linked to a current onsite visit.
- Current owner (if known) derives from the valid-dated `unit_customer_relationships` for type `owner`. Show the customer/contact summary permitted by the role; do not copy or overwrite the master data automatically. Display `Unassigned` if no current owner exists, and require user disambiguation if multiple active owners are present.
- Historical RO customer/bill-to context must be independent of current ownership.

## Interface contract

**Top bar:** a single prominent Add button with a small dropdown. Menu closes on Escape, outside click, or selection. No redundant full registration form occupies the Units screen.

**Add Unit:**
- Unit type, year, make, model; VIN and/or stock number.
- `Save Unit` registers the unit and returns to its context, without creating an RO or visit.
- `Save & Create RO` saves the unit **once**, then opens the same RO creation form preselected to that Unit ID. No retyping VIN/stock/customer.
- If duplicate candidate exists, block duplicate creation and offer to reuse the existing record.
- If unit save succeeds and RO save fails, preserve the unit as saved and retry only the RO. Never recreate the unit automatically.

**Create RO:**
- Search by Stock (default), VIN, or stable Unit ID. No free-form make/model matching.
- Explicitly show the selected Unit, year/make/model, VIN and stock, current owner/account name, phone and email when authorized, and its existing RO references.
- Auto-suggest a new RO number with a visible editable field. A user may replace it with a shop-specific/manual RO number, subject to duplicate and format checks.
- **Brief work description required** to explain why the RO was created. Fine-grained line items are **optional** and may be added later.
- Save produces a **draft** RO. Description does not authorize billable repair, labor or parts work. Authorization remains an independent workflow gate.

## Permission model

- **Unit registration:** any active, authorized branch employee with `unit.create` (existing default).
- **RO creation:** only roles granted `ro.create` (initial suggested defaults: Service Writer and authorized Manager/Admin; Foreman/PDI can be enabled by branch policy).
- **Owner contact view:** separate `customer.contact.read` capability. Porters and other roles must not gain sensitive contact data by entering Create RO or changing identifier display preferences.
- **RO number override:** use an explicit configurable `ro.number.override` capability if branch policy restricts manual numbering. The UI should show whether override is allowed; backend must validate it.
- The **global Add** menu advertises available actions; disabling/hiding a menu item is not authorization. Server must enforce the same roles and field-level projections.

## Production number assignment

The offline prototype demonstrates the idea with `RO-10483`, using existing mock numbers. This is **not** a safe production allocator.

Production must generate the next number **atomically on the server**, scoped by organization, branch and numbering source/prefix. Suggested form: versioned `ro_numbering_policies` plus a transactional branch/source counter, checked in the same transaction as RO insertion. Must handle concurrent requests, manual overrides, externally imported RO numbers and retry idempotency.

The existing `repair_orders` table has `ro_number` and a branch/source uniqueness index but **does not yet have a dedicated work_description column**. Add it in a reviewed migration, preserving imported and legacy ROs; this user flow should require it for newly created draft ROs.

## Data-flow commands (future server implementation)

- `find_unit_by_exact_identifier(branch_context, field, value)` — returns authorized, properly disambiguated candidates with stable IDs, without exposing unrelated customers.
- `get_unit_ro_context(unit_id)` — returns selected Unit and authorized current-owner/contact summary and existing RO references. Current-owner resolution must respect effective dates and not expose historical private ownership indiscriminately.
- `register_unit(input, idempotency_key)` — validates identifiers, organization membership, allowed role, duplicate candidates, then creates one Unit.
- `create_draft_ro(unit_id, brief_work_description, optional_lines[], proposed_ro_number?, idempotency_key)` — authorized transaction checks unit/branch, allocates or validates number, creates RO and any optional lines, appends a corresponding audit event and returns generated RO id/number.
- `register_unit_then_start_ro` — can be two explicit steps, with durable Unit result and idempotent continuation; never roll back/duplicate the Unit because optional RO creation failed.
- The requester always sees clear success/error states, including which entity was saved.

## Review/testing

Offline browser sample demonstrates two menu actions; Save vs Save & Create; stock/VIN/internal-ID exact lookup; owner/contact auto-population; proposed number editing; optional line item addition/removal; RO description requirement; duplicate VIN and RO number checks; responsive desktop/mobile layout.

**No claim of backend completeness:** the standalone prototype stores fictional records only in browser memory. The server RPCs, unique number allocator, data-access security, actual visit/RO persistence and true multi-user concurrency remain unimplemented.

### Acceptance gates before live deployment

- Two users create ROs concurrently: unique auto numbers, no duplicate allocations.
- User with only Unit.Create can register a Unit but cannot create an RO.
- RO-enabled user may reuse the correct unit while restricted customer contact data remains inaccessible.
- Existing Unit lookup returns candidates for conflicting stock/VIN; no mistaken auto-merge.
- Save-and-create failure after unit persistence does not create another Unit on retry.
- An RO may have a description and zero line items; adding lines later references the same RO.
- All numbering/RO scope rules are branch configurable and backed by server enforcement.
- UI passes same global compact design standard, keyboard accessibility, mobile overflow, and form validation.
