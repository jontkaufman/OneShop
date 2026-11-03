# OneShop Product Design Principles
Status: **user-confirmed, project-wide guiding principles** | Established November 3, 2026

These principles are acceptance criteria for **every** OneShop module, workflow, settings screen, permission system, map interaction, and future integration. They are not limited to administrative settings or the current prototype.

## Core principle

**Enterprise-grade capability without enterprise-grade clutter.** The platform should be highly configurable and operationally sophisticated while remaining visually disciplined, crisp, immediately understandable, and fast for each role to use.

## Non-negotiable principles

1. **One product, one visual language.** Use a common design-token system and reusable controls for color, typography, spacing, borders, status, states, tables, cards, and forms. Avoid per-page styling exceptions that create inconsistency. Central theme changes must work across modules.
2. **Compact, not cramped.** Keep settings and operational surfaces dense enough to scan efficiently, without illegible text, poor contrast, excessive nesting, or undersized interaction targets. Prioritize purposeful white space and strong alignment.
3. **Progressive disclosure.** Expose what the current employee needs for the immediate task; group related choices; reveal advanced options only when appropriate. Do not force a writer, porter, technician, or manager to sift through irrelevant information.
4. **Configuration with coherent defaults.** Support extensive organizational, branch, workflow, and permission customization while providing sensible, safe defaults. Show effective configuration and inheritance clearly. Shop-specific policies must not cause custom page forks.
5. **No redundant data entry.** Search and reuse stable Customer → Unit (RV/vehicle) → RO → Line Item records. Prefill only authoritative existing information, distinguish new/changed facts, and never manufacture missing data to satisfy a form.
6. **Operational truth over visual shortcuts.** Requested action is not completed action; expected location is not confirmed physical location; a check-in is not an invoice; acknowledgment is not resolution; an authorization is not payment. Preserve explicit states and actors.
7. **End-to-end task continuity.** Each workflow should guide the user to its natural next action (e.g., Finish Check-In → Move Unit), without unnecessary detours or assigning duties to the wrong role.
8. **Consistency grows through refactoring.** Whenever a new setting, permission, action, or state is introduced, review the **whole affected component and neighboring workflow**, including hierarchy, grouping, labels, controls, spacing, mobile behavior, accessibility, and consistency. Never simply append another row or toggle by default.
9. **Role-specific simplicity, shared underlying data.** Service writers, foremen, porters, technicians, parts, warranty, sales, and management see focused interfaces over linked records. Permission changes must be enforced server-side, not through hidden buttons.
10. **Secure and auditable by design.** Multi-tenant separation, least privilege, safe editable configurations, clear destructive-action confirmations, versioning, audit history, and server validation are architectural requirements, not finishing touches.
11. **Responsive and accessible by default.** Readable contrast, visible focus, keyboard access, touch-sized targets, meaningful status labels, usable mobile/tablet layouts, and resilient error/empty/loading states are part of the first implementation.
12. **Build vertically and verify.** Implement one practical stage of the dealership journey at a time, anchored to real use cases and measurable acceptance tests. Screens, API logic, schema, RLS and events must agree. A prototype is not a deployed capability.

## Design review required when a module evolves

Any pull request adding or materially modifying an interface, setting, permission, state, or workflow must answer:

- **Who and why?** Which role, job, and actual operating problem does the change serve?
- **Does it fit?** Could an existing component or setting group be improved instead of adding another surface?
- **Whole-component impact:** Have surrounding layout, terminology, density, action priority, defaults, and downstream steps been re-evaluated?
- **Consistency:** Does it use common tokens/components and match other modules across desktop, tablet, and mobile?
- **Configurability and safety:** Is the setting appropriately scoped, validated, discoverable, reversible, and permission-controlled?
- **Proof:** Are relevant real workflow scenarios, accessibility, error states, security boundaries, and regression tests verified?

**Review outcome:** redesign before merge if the added functionality makes the full interface cluttered, harder to scan, inconsistent, or misleading, even if the individual setting technically works.

## Relationship to specialized guidance

This project-wide charter governs every module. More detailed specifications—including the service-writer workflow, property map, customer timeline, financial controls, and the evolving Settings & Permissions UX Standard—must satisfy it. Specific module requirements may add detail but must not silently contradict these principles.

## Implementation status

These are approved design principles documented in GitHub. They do **not** imply that the existing offline prototype or any production application currently satisfies them. Compliance must be checked and demonstrated during each module review.
