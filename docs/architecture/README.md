# OneShop Architecture Review Index
Baseline date: 2026-11-02. This is the proposed target architecture, **not** an implemented or production-verified system.

## Review order
1. [Product charter and confirmed requirements](00-product-charter.md): mission, users, boundaries, role responsibilities, workflows, invariants, actual project status.
2. [Technical architecture](01-technical-architecture.md): tenancy, RLS, domain model, concurrency, map design, integrations and operations.
3. [Module delivery plan](02-module-delivery-plan.md): Gate 0 and Modules 01-10 with dependency/acceptance criteria.
4. [Decisions and risk register](03-design-decisions-and-risks.md): distinctions between confirmed and proposed decisions and current blockers.
5. [Future commercial domain](04-future-commercial-domain.md): preserve scope/authorization, warranty, costs, financial reporting without turning the initial pilot into a DMS rewrite.
6. [Quality gates and test matrix](05-test-and-quality-gates.md): must-pass test scenarios for each module.
7. [Module 01 Foundation and Records](../modules/01-foundation-and-records.md): first vertical slice, proposed data contract, permissions, RLS strategy and acceptance tests.
8. [Existing map-editor behavior contract](../property-map-editor.md): viewport and marker scaling, editing and persistence.

## Baseline findings
- The separate hosted demo is not currently a buildable checkout of this repository; actual code parity is not established.
- Supabase link 'zimtykes - OneShop' reaches one healthy project ref igofopipuuqtsxjhjymq. At audit, public tables=0, migrations=0. App wiring is not established.
- Do not modify live Supabase schema or claim project completion as part of documentation review. Before the first application module, satisfy Gate 0 and review the first planned SQL migration against the actual database.
- Confirmed dealership operations requirements are distinguishable from proposed technical mechanisms and postponed financial scope. Every ADR must be explicitly adopted during the relevant module review.

## Development control
Create one feature branch and PR per module. Keep SQL migrations and app code together and test against a separate environment. Demo each workflow with fictional data, validate tenant security/concurrent state changes, record user acceptance, then merge and deploy in stages.
