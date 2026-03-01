# Interactive Chart Overlay — Architecture Analysis

## Executive Summary

The overlay feature is broken due to **data shape mismatch** between the two chart data sources. Overlay values resolve to `0` for stacked view because the selector returns different field names than the component expects. Additional issues exist around data source consistency and overlay rendering.

---

## 1. Root Cause: Overlay Value Extraction

### Current Logic
```javascript
overlayValues = overlayConfig ? trendsChartData.map((d) => d[overlayConfig.key] ?? 0) : [];
```

### Data Shape by View

| View | Data Source | Row Shape | overlayConfig.key → Actual Field |
|------|-------------|-----------|----------------------------------|
| **Period** (groupBy=period) | `getChartData()` | `label`, `totalLeads`, `conversionRate`, `commentRate`, `openTasks`, `taskCompletionRate`, `avgTimeToContact` | ✅ Direct match |
| **Stacked** (groupBy≠period) | `getTrendsChartDataStacked()` | `period`, `segments`, `total`, `raw`, `rented`, `enriched` | ❌ No `totalLeads`, `conversionRate`, `commentRate` |

### Result
- **Period view**: Overlay works (fields exist).
- **Stacked view**: `d[overlayConfig.key]` is always `undefined` → `overlayValues = [0, 0, 0, ...]` → flat line at bottom, or no visible overlay.

### Fix
Normalize overlay value extraction with a helper that maps config keys to the correct field per data shape:

```javascript
function getOverlayValue(row, configKey, isStacked) {
  if (isStacked) {
    const total = row.total ?? 0;
    if (configKey === "totalLeads") return total;
    if (configKey === "conversionRate") return total > 0 ? Math.round((row.rented / total) * 100) : 0;
    if (configKey === "commentRate") return total > 0 ? Math.round((row.enriched / total) * 100) : 0;
    return row[configKey] ?? 0;
  }
  return row[configKey] ?? 0;
}
```

---

## 2. Data Source Inconsistency

| Group By | Selector | Data Source | Branch Filter |
|----------|----------|-------------|---------------|
| Period | `getChartData(presetKey, dateRange)` | `dailyTrends` (mock) | ❌ No branch |
| Body Shop / Insurance / Status | `getTrendsChartDataStacked(leads, dateRange, branch, groupBy, presetKey)` | Real `leads` | ✅ Branch-specific |

### Implications
- Switching from "Period" to "Body Shop" changes from **global mock data** to **branch-specific real leads**.
- Period view does not reflect the selected branch.

### Clarifying Question
Should the Period view use **branch-specific leads** (aggregated by period) instead of `dailyTrends`? That would require a new selector (e.g. `getTrendsChartDataByPeriod(leads, dateRange, branch, presetKey)`) and dropping `getChartData` for the Summary chart.

---

## 3. Stacked View Overlay Rendering

- Overlay is implemented for **period bar** and **period line** charts only.
- **Stacked bar** and **stacked line** charts do not render the overlay.
- After fixing overlay values, we should add overlay rendering for stacked views (line overlay on top of stacked bars, with secondary axis).

---

## 4. Secondary Axis Labels

- Bar chart overlay: no right-axis labels (removed in a prior edit).
- Line chart overlay: right-axis labels use `overlayConfig.suffix` (e.g. `%`, `m`).
- For count overlays (`totalLeads`), `overlayMax` can be large; tick labels should use `niceCountTicks` or similar for readability.

---

## 5. Edge Cases

| Case | Current Behavior | Recommendation |
|------|------------------|----------------|
| Single data point (n=1) | Bar overlay hidden (`n > 1` guard) | Show single dot if desired |
| All overlay values zero | `overlayMax = 1` → line at top | Keep; or hide overlay when all zeros |
| Stacked + overlay openTasks/taskCompletion/avgTimeToContact | Not in overlay options (filtered) | Correct; stacked data has no task/time fields |

---

## 6. Implementation Plan

### Phase 1: Fix Overlay Data (Required)
1. Add `getOverlayValue(row, configKey, isStacked)` (or equivalent) in the component.
2. Replace `overlayValues = trendsChartData.map((d) => d[overlayConfig.key] ?? 0)` with the normalized helper.
3. Ensure `overlayMax` uses the same values.

### Phase 2: Stacked View Overlay (If Desired)
1. Add overlay line + secondary axis to stacked bar chart.
2. Add overlay line + secondary axis to stacked line chart.

### Phase 3: Data Consistency (Clarify First)
1. If Period view should be branch-specific: add `getTrendsChartDataByPeriod(leads, dateRange, branch, presetKey)` and switch Period view to use it.
2. If Period view stays global: document the behavior and leave as-is.

---

## 7. Clarifying Questions Before Implementation

1. **Period view data source**: Should the Period view use branch-specific leads (aggregated by period), or is global `dailyTrends` acceptable?

2. **Stacked overlay**: Should the overlay line appear on stacked bar/line charts when an overlay metric is selected?

3. **Empty periods**: `getTrendsChartDataStacked` filters out periods with `total === 0`. Should Period view do the same, or show zeros for empty periods?

4. **Comment rate definition**: Stacked view uses `enriched / total` (all leads). `getTrendsChartDataByDimension` uses `withComments / actionable` (Cancelled + Unused only). Which definition should the Summary chart use?
