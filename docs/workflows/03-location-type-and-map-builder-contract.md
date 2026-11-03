# WF-03 — Location Type, Map Builder and Routing Contract
Status: architecture requirements for the later dedicated property module. **Do not replace this with a trivial static parking-grid editor.**

## Why it matters now
The check-in routing step needs a stable API returning available destination *types*, candidate locations and operational areas. This interface must exist before the advanced graphical editor, but its identifiers and constraints must be editor-compatible. Location type (required) and specific space (optional) are separate fields.

## Conceptual hierarchy
Dealer organization -> branch/property -> map views / types / logical physical locations / visual placements.
- A **location type** defines function: Service Bay (SB), Service Storage (SS), Wash Bay (WB), Detail Bay (DB), PDI Staging (PDI), Waiter Way (WW), Sales Storage (SAL), Customer Drop-off (DO), etc. These are examples, not a rigid global enum.
- **Physical location** has permanent ID, required type, number/code, optional dimension/length/clearance/weight criteria, occupancy capacity, active/blocked/retired states; either single space or shared operational area. Numbering follows type abbreviation + padded sequence, e.g. `SB-01`, `SB-02`, `WB-01`.
- **Map view** is uploaded image/floor plan (overview, building, storage), display configuration, version.
- **Visual placement** is the shape linking a physical location to one or more map views, not a second instance of space capacity.
- **Shared area** has a drawn polygon/shaded region and can contain multiple units; live map shows list/count. Its stable logical ID is independent of annotation labels.
- A branch may configure a site-specific default destination type for each check-in classification/task and a role policy for specific-space assignment (e.g. porter chooses storage; foreman chooses service bay).

## Advanced editor experience (later module)
1) Import real property image; maintain source image scale, reference dimensions and background version. Support multiple named map views, image opacity/brightness/contrast, default/archive/restore.
2) Configure type library with name, unique abbreviation/prefix, numbering width/start/increment, allowed usages and capacity/dimensions, colors and optional routing policies.
3) Create a single space, line/row, grid/array, duplicate, place existing unplaced space, regroup/ungroup, move/resize/rotate and bulk renumber. Detect collisions and intentional shared-area overlay vs illegal duplicate capacity.
4) Draw and label shared areas and operating zones, with selectable area boundaries, opacity, color and labels. Accessible unit list shown over or alongside area.
5) Zoom-to-cursor, pan/hand mode, pinch/touch, fit, focus selection, keyboard changes, undo/redo; borders and labels scale to visible marker dimensions and never consume whole tiny space.
6) Draft edits/versioning, save/cancel with dirty warning, publish validation; distinct live operational map. Two editors must not silently overwrite changes.
7) Validate codes (unique per branch), required types, layout boundaries, capacity, blocked positions, no orphan placement and safe retirement of currently occupied locations.
8) Physical move updates authoritative occupancy, not map drag or configuration publish. Multi-map placements use the same physical location ID.

## Destination selection API (contract)
`listDestinationTypes(siteId, task, unitCapabilities)` returns allowed site types with active/candidate counts, policy reason and optional recommended flag.
`listAvailableLocations(siteId, typeId, unitCapabilities, requestedAt)` returns only compatible, active, currently unblocked locations and capacity metadata; requires revalidation on command commit.
`requestMove(visitId, pickupLocationId, destinationTypeId, optionalLocationId, task, instructions)` stores type even if precise space is omitted and records requester and due/priority.
`chooseDestinationOnClaimOrDelivery(moveId, locationId)` requires appropriate allocator permission and current capacity; no auto-selected last known bay.
`confirmDelivery(moveId, locationId, actor)` atomically validates claimed move, visit and location occupancy and emits movement/location history.

## Non-negotiable checks
- No branch can accidentally view or select another dealership's location.
- Change `SB-01` display to `SVC-001` by explicit renumbering while preserving the same physical space ID and movement history.
- One location on overview and detailed maps consumes capacity once, not twice.
- Type-only move request is valid; exact space number remains optional and capacity enforced when finally allocated.
- A space of wrong type or disallowed unit size cannot be selected even if a stale browser shows it.
- A service writer has no implicit authority to allocate a specific service bay.
- Replacing a background map does not alter current unit occupancy.
