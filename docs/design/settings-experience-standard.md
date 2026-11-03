# OneShop Settings & Permissions UX Standard
Status: **approved product design directive** (November 3, 2026).
Scope: every new or changed settings page, field-rule editor, permission editor, organization/branch configuration, role preset and related administrator workflow.
This document defines presentation and review requirements, not evidence of a deployed feature.

## Product bar

OneShop must have a polished enterprise-level administrative experience: **dense enough for efficient work, clean enough to understand immediately, expandable without becoming cluttered.** Administrative depth is a capability, not permission to display every option at once.

A setting must be discoverable, comprehensible, appropriately scoped, reversible where practical, and visibly connected to its operational effect. A new option must not simply be appended to the end of a growing list.

## Interaction and layout requirements

1. **Review the entire affected component** when any setting, role or permission is added or materially changed. Reassess its grouping, labels, alignment, density, hierarchy, help, defaults, and responsive layout. Refactor the block when necessary rather than just adding another row.
2. **Progressive disclosure:** show common choices first. Place advanced, rare, integration-specific and potentially dangerous controls behind clear subsection headings, expandable details or a dedicated advanced panel. Important safety settings are never obscured just to save space.
3. **Compact, not cramped:** consistent section heights, sensible whitespace, aligned labels and controls, predictable vertical rhythm, readable 14px+ operating text as a default design target, adequate touch targets and keyboard focus. Avoid oversized decorative cards and nested boxes.
4. **Grouped by user intent:** configure by business outcome or workflow (e.g., Check-In, Movement, Notifications, Permissions), not by raw database field or arbitrary implementation layer.
5. **Clear control semantics:** required/optional/hidden, enabled/disabled, inherit/override and allowed/denied must be distinguishable without color alone. Explanatory text should be concise and contextual; use examples for non-obvious options.
6. **Stable navigation:** a small number of clear categories with search/filter for large settings inventories. Avoid a new top-level tab for every option. Maintain consistent position, terminology and component patterns across all admin screens.
7. **Scope clarity:** always show whether an option applies globally, to an organization, branch/site, role, department or particular workflow. Indicate inherited values and local overrides; make reset-to-default understandable.
8. **Safe editing:** show unsaved changes, save/cancel/revert behavior, validation and cross-setting dependencies. Highlight material consequences before save; do not silently override other settings or historical records.
9. **Permissions are sensitive:** separate role presets, capability detail and user exceptions. Display effective permission, provenance (preset/inherited/override), impact, who can change it and audit history. Do not replace permission review with an unstructured wall of checkboxes; provide grouping, search and capability descriptions.
10. **Central styling:** colors, typography, radius, spacing, borders and focus/hover states come from shared semantic design tokens/components; no per-page styling forks to accommodate new settings.
11. **Accessibility:** contrast and keyboard focus, screen-reader descriptions, responsive/mobile layouts, validation messages connected to inputs, no hover-only content. Dense layout must still be operable on phones and tablets.
12. **Performance and scale:** even if future settings reach hundreds of fields, the page remains scannable and responsive. Prefer subsections, filters and reusable field rows over dumping all controls in one form.

## Recommended block composition

- Section heading with clear business purpose, at most one short explanatory sentence.
- Controls presented as a compact, consistently aligned row/table/grid where it aids comparison.
- Scope indicator and inheritance/override control only when relevant.
- Short inline validation/help near ambiguous or dependent options; optional advanced details hidden until needed.
- Save/revert and change status positioned consistently; preview or impact summary for changes affecting staff workflows.
- A short audit/change-history link for sensitive controls rather than flooding the primary form.

## Change-management gate — required for every PR adding settings or permissions

A proposed change must include:
1. **Use case:** which user needs the control, why it is configurable, and what the safe default is.
2. **Information architecture review:** does the option belong in the existing group, a reorganized section, or genuinely warrant a new category? Compare alternative grouping before introducing another block.
3. **Full-component review:** show the entire affected settings block with the new control integrated. Assess density, hierarchy, copy, related settings, discoverability, permissions, states and future expansion.
4. **Desktop and mobile screenshots/tests**, including long labels, empty/default, inherited/overridden, disabled and validation-error states as applicable.
5. **Accessibility checks:** contrast, keyboard, visible focus, touch target and accessible labels; color is never the sole status indicator.
6. **Functional and security verification:** authorization for reading/changing, validation/dependencies, save/cancel, persistence, concurrency/version conflict, audit and backward compatibility.
7. **Regression check:** ensure changes did not make other workflows, appearance themes or permission reviews less legible or more cumbersome.

Reject or redesign a setting when it increases visual clutter disproportionately, has no clear owner/use case, creates a duplicate control, introduces unexplained jargon, hides a safety prerequisite, or encourages an incoherent branch/role override model.

## Extensibility and data architecture

Configuration may be extensive behind the scenes, but it needs a typed, versioned registry with stable setting IDs, logical categories, default/inherited values, validation, permission gates, descriptions and optional advanced visibility. Do not let arbitrary JSON keys automatically surface raw, unlabeled controls to end users.

Default precedence (proposed until the tenancy specification is approved): system -> organization -> branch/site -> workflow; per-user preferences only where appropriate. Permission evaluation is separate from aesthetic preferences and never granted by selecting a UI option. Changes must be audit logged and checked server-side. A setting should not affect historical documents or completed workflows retroactively without an explicit migration/reprocessing policy.

## Review status

The present v0.3 offline prototype is a starting point, **not** proof it already satisfies this enterprise standard. Reassess current Check-In Fields and Appearance screens against the gate above in subsequent iterations; revise their layout as the settings registry grows. No Supabase schema changes are made by adopting this directive.
