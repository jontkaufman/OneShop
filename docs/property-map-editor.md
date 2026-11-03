# OneShop property map editor: navigation and marker scaling

Status: implementation specification; **not yet merged into a production application**.

## Navigation

- Zoom buttons (+/-), percentage slider, fit to view, reset.
- Mouse wheel zoom anchors to cursor instead of the viewport center.
- Hand/pan mode lets users drag the image without moving spaces.
- Edit mode manipulates selected spaces. Holding Space temporarily pans.
- Tablet/mobile: one finger pans in navigation mode; two fingers pinch to zoom; editing never accidentally pans or moves a site.
- Changing viewport zoom must not change the persisted space geometry.

## Spaces and markers

- Map spaces have stable IDs, coordinates, width, height, orientation and type. Coordinates are map/image-relative rather than viewport-relative.
- Compute the visible narrowest side in screen pixels: `min(width, height) * zoom`.
- Scale border thickness and label font to the visible marker dimensions, capped to avoid giant fonts/borders. Suggested screen-space borders: 0.5–2.5 px; fonts: 7–18 px.
- For SVG transformed by zoom, divide desired pixel widths/font sizes by zoom before applying them to the marker shape.
- Hide the interior label when it will not fit inside the space, without removing the underlying space ID or accessible detail.
- Keep the selection outline / resize handles visually distinct from the space's border; account for pointer/touch hit-target sizes.
- Recalculate styles on zoom, resizing and fit-to-view.
- Labels must not overlap neighboring markers as a result of scaling or resizing.

## Save / persistence

- Pan and zoom are viewport state, independent from saved property geometry.
- Space edits should participate in undo/redo, save/draft states and multi-user conflict handling.
- Multiple maps may depict the same physical space by stable ID.

## Acceptance checks

1. Zoom into a 6 × 12 map-unit space: its border is visibly thin and label hides if it cannot fit.
2. Zoom back out: all markers keep their original physical placement and dimensions.
3. Pan with Hand mode: no markers move.
4. Edit-mode drag/resize changes only the selected marker; Space+drag pans instead.
5. Mouse, touch and trackpad gestures remain predictable at viewport limits.
6. Fit, reset and repeated zooming do not shift saved geometry.
7. On desktop and mobile the selection controls remain usable without obscuring neighboring spaces.

## Current prototype

A standalone HTML map interaction demo was produced separately during planning. It is **not** sourced from this GitHub repository and is **not** wired to the hosted OneShop prototype or Supabase. Before merging feature code, acquire/import the actual editable application source.
