# Linear Issues — Conversion Breakdown Feature

**Create in Linear:** [linear.new](https://linear.new) → Team **HER** → Backlog

---

## Parent: HER-XXX — Conversion breakdown with grouping attributes

**Type:** Feature | **Priority:** Normal | **Effort:** Large

**TL;DR:** BMs and GMs can break down conversion rate by status (Rented/Unused/Cancelled), insurance company, and body shop. Multi-level grouping + optional zone benchmarks. Helps identify "opportunity left" (high Unused) vs "lost" (high Cancelled).

**Current state:** Conversion rate is a single % (Rented/Total). No breakdown by status or grouping attributes.

**Expected outcome:** User selects primary/secondary group-by (status, insurance_company, body_shop). Table shows conversion %, Unused %, Cancelled % per group. Optional checkbox for zone benchmarks. Optional toggle to include/exclude Reviewed status.

**Relevant files:** `src/selectors/demoSelectors.js`, `src/components/interactive/InteractiveMeetingPrep.jsx`, `src/components/MetricDrilldownModal.jsx`

---

## Sub-issue 1: Add body_shop column (HLES column 23)

**Type:** Feature | **Priority:** Normal | **Effort:** Small

**TL;DR:** Add `body_shop` to leads table; map from HLES column 23 'BODY SHOP'; update supabaseData.js and seed migrations.

**Tasks:**
- Migration: `alter table leads add column body_shop text`
- Index: `idx_leads_body_shop`, `idx_leads_insurance_company`
- Update `leadFromRow` in supabaseData.js
- Seed body_shop values in existing leads (sample body shop names)

**Relevant files:** `supabase/migrations/`, `src/data/supabaseData.js`

---

## Sub-issue 2: getConversionBreakdown selector (multi-level grouping)

**Type:** Feature | **Priority:** Normal | **Effort:** Medium

**TL;DR:** New selector `getConversionBreakdown(leads, { dateRange, branch, groupByPrimary, groupBySecondary, includeReviewed, gmZone })` returning rows with groupKey, total, rented, unused, cancelled, conversionRate, unusedPct, cancelledPct. Supports hierarchical grouping.

**Tasks:**
- Implement grouping logic for status, insurance_company, body_shop
- Primary + secondary group-by (nested rows)
- Exclude Reviewed by default; optional include
- Handle null/empty group keys as "(Unknown)"

**Relevant files:** `src/selectors/demoSelectors.js`

---

## Sub-issue 3: ConversionBreakdownTable + GroupBySelector UI

**Type:** Feature | **Priority:** Normal | **Effort:** Medium

**TL;DR:** Reusable ConversionBreakdownTable component and GroupBySelector (primary + secondary dropdowns). Shows Group | Total | Rented | Unused | Cancelled | Conv % | Unused % | Cancelled %. "Opportunity" insight (high Unused = opportunity left).

**Tasks:**
- ConversionBreakdownTable component
- GroupBySelector (primary, secondary) — options: None, Status, Insurance Company, Body Shop
- Use Hertz brand tokens (no hardcoded colours)

**Relevant files:** `src/components/ConversionBreakdownTable.jsx`, `src/components/GroupBySelector.jsx`

---

## Sub-issue 4: Integrate into Meeting Prep + MetricDrilldownModal

**Type:** Feature | **Priority:** Normal | **Effort:** Medium

**TL;DR:** Add group-by selector and breakdown table to Meeting Prep summary section. Enhance MetricDrilldownModal for conversion_rate with group-by and breakdown table.

**Tasks:**
- Meeting Prep: Add GroupBySelector + ConversionBreakdownTable below conversion metric card
- MetricDrilldownModal: Add group-by controls and breakdown table when metricKey === 'conversion_rate'

**Relevant files:** `src/components/interactive/InteractiveMeetingPrep.jsx`, `src/components/MetricDrilldownModal.jsx`

---

## Sub-issue 5: Optional benchmarks checkbox + Reviewed toggle

**Type:** Feature | **Priority:** Low | **Effort:** Small

**TL;DR:** Checkbox "Show zone benchmarks" — when checked, display zone/region average next to each group. Toggle "Include Reviewed" — when checked, include Reviewed leads in funnel.

**Tasks:**
- Benchmarks: Use getZoneConversionRate / getBranchTrailing4WeekConversionRate for zone benchmark
- Reviewed toggle: Pass includeReviewed to getConversionBreakdown

**Relevant files:** `src/components/ConversionBreakdownTable.jsx`, `src/components/interactive/InteractiveMeetingPrep.jsx`

---

## Sub-issue 6: GM view with zone-level breakdown

**Type:** Feature | **Priority:** Normal | **Effort:** Medium

**TL;DR:** GM sees breakdown for all branches in zone. Optional branch filter. Same GroupBySelector + ConversionBreakdownTable.

**Tasks:**
- GM Meeting Prep or Dashboard: Pass gmZone, no branch filter (or optional branch dropdown)
- getConversionBreakdown accepts gmZone to scope leads

**Relevant files:** `src/selectors/demoSelectors.js`, GM view component
