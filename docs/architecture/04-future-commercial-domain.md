# Preserved Commercial, Warranty and Profitability Intent
Status: domain requirements record for later modules; **not an instruction to implement financial accounting now**. Source: OneShop Invoice Design Review (Oct 21) and later service-cost discussions.

## Principle
Future OneShop commercial features must reflect customer permission, technician execution, service economics, third-party responsibility and payment as separate facts. The user intends a shop-form customer experience paired with unusually precise operational records and managerial cost/profit visibility.

## Customer-facing flow
Finding -> recommendation -> estimate service/variant -> presented snapshot -> decision (ACCEPT / DEFER / DECLINE / unanswered) -> exact-scope authorization -> work order job -> performed/verified work -> writer invoice review -> posted invoice -> payer/payment allocation -> follow-up.
Digital tapping and paper circling must record the same three header-level choices and distinct authorization evidence. Paper responses are recorded by the service writer with actual customer decision time, staff-entry time, full scanned artifact, revision and source, not a fabricated digital signature. Old approval links must be invalidated on superseded revisions.
Replacement upgrade = one selected variant (not an extra job with full double charge); additive recommendation = outside amount until chosen. Accepted but unpriced/expired item becomes a draft requiring estimate/authorization; accepted invoice recommendation routes to one compatible next-visit RO, not a new charge on a posted invoice. Repeated submissions must not create duplicate jobs.
Customer invoice is restrained, square, gray, familiar to service businesses. Internal gross profit, employee compensation, supplier cost and unfiltered technician notes do not appear on customer output. Final invoice includes performed/authorized scope, not merely recommended or approved-unfinished work.
Store immutable published document snapshots with prices, scope, tax/terms/profile, versions, evidence/content hash, and authorized actor/method/timestamp.

## Independent money and cost dimensions
For every service job preserve at least:
- Retail customer labor selling rate and billed labor charge; flat-rate/billed hours are not necessarily stopwatch hours.
- Warranty allowed/book time, approved labor rate and expected payer contribution, distinct from retail price.
- Technician estimated/book/actual elapsed/clocked time, and productivity/efficiency calculation basis.
- Technician hourly pay, flat-rate piece earnings or hybrid pay **including benefits and burden**, with effective-dated employee compensation; sensitive staff fields restricted.
- Fixed and variable overhead cost allocation method, separately from job-direct parts/materials/consumables and external subcontract costs.
- Part sale price, actual acquisition cost, returns/cores and consumed quantities.
- Internal dealership job ledger code and internal transfer pricing for sales/inventory and balancing charges (e.g., damage done before customer delivery). An internal job cannot be represented as customer income.
- Discounts, fees, explicit write-downs, taxes and authorized credits/adjustments independently categorized.
- Payer responsibility and settled payments: customer, manufacturer/OEM, service contract, insurer, dealership internal account and optionally multiple payer split.
- Open receivables separately from invoices and deposits; pending or failed payments are not settled funds.

Derived managerial metrics are only trustworthy with explicit definitions:
labor_efficiency = standard hours earned / technician actual hours (when actual hours > 0);
labor_productivity = billed/earned hours / scheduled/paid hours (define source);
job_direct_margin = recognized service revenue - attributable direct labor - consumed parts/materials - outside costs;
shop_contribution_margin = revenue - variable direct costs - configured variable overhead;
fully_allocated_margin = revenue - direct costs - explicitly documented allocated fixed overhead.
These are *candidate reporting definitions*, not regulatory accounting rules. Warranty book hours vs paid technician hours, flat rate and overhead allocation require branch-specific treatment and review.

## Invoice and authorization data model (future)
service_job + priced_service_variant + priced_line_snapshot + estimate_revision + customer_decision + authorization_event + finding/recommendation + posted_invoice + invoice_line + payer_allocation + payment_transaction + payment_application + credit_or_adjustment + warranty_claim + internal_charge + labor_time_entry + compensation_rate_snapshot + parts_cost_event + overhead_allocation_basis.
Pricing units must be exact: integer minor currency units or numeric decimal, explicit currency and rounding rules. Never rely on floating-point JS arithmetic for posted invoice money. Currency amounts may need allocation and tax rounding per line/profile with immutable calculation version.
Support addenda/supplement approvals and customer authorization before changed scope. Never silently adjust a signed quote or invoice to match a new price book.

## Financial permissions
Technician records observed conditions/actual work; advisor prices and presents; customer grants scope authorization; warranty role seeks OEM permission; manager has scoped discount overrides; accounting posts, credits and reconciles payments. These actions carry actor, effective time, revision and reason. Restricted pay rates and employer burden never appear in generic RO conversations.

## Warranty and insurance
Pre-repair approval != claim submitted != claim accepted != warranty reimbursement paid. Insurance claim work and supplements need their own allowed scope, payer status and approval. Partial warranty approval releases only matching job blockers. Unpaid warranty receivable should not automatically block physical unit pickup unless explicit dealer policy requires it.

## Risks and gating
Regulatory invoice and tax requirements vary by jurisdiction, RV class and service category. Do not ship universal parts-tax/labor-tax logic or generic supplies percentages without review. Sales/internal charge rates and profitability accounting require documented chart-of-accounts mapping and manager acceptance. Begin with manually priced jobs and immutable snapshots; price book and full financials wait until the core operational pilot is proven.
