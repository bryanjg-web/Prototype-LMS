# GM View — Implementation Plan

**Date:** March 1, 2026
**Context:** Full build of GM-specific views for Hertz LMS prototype
**Demo User:** D. Williams (Eastern Zone)
**Scope:** GM can see all branches across all zones

---

## Final Navigation Structure

| Nav Item | View ID | Shell Key | Type | PRD Job |
|----------|---------|-----------|------|---------|
| Overview | `gm-dashboard` | `gm-main` (shared scroll) | Summary section | Job 5 |
| Compliance | `gm-compliance` | `gm-main` (shared scroll) | Metrics section | Job 5/7 |
| Leads | `gm-leads` | `gm-leads` (separate page) | Lead table + slide-in | Job 7/8 |
| Leaderboard | `gm-leaderboard` | `gm-leaderboard` (separate page) | Performance rankings | Job 6 |
| *Lead Profile* | `gm-lead-detail` | `gm-lead-detail` (drill-down) | Slide-in panel | Job 7/8 |

**Removed:** `gm-cancelled`, `gm-unused`, `gm-review`, `gm-spot-check` (merged/replaced)
**Added:** `gm-leads`, `gm-leaderboard`, `gm-lead-detail`

`GM_MAIN_VIEWS = ["gm-dashboard", "gm-compliance"]` (shared scrollable page)

---

## Ticket Breakdown

### Phase 1: Navigation Foundation

#### HER-GM-01: Restructure GM navigation config
**Type:** Feature | **Priority:** Urgent | **Effort:** Small

Update `src/config/navigation.js`:
- Change `roleNav.gm` to 4 items: Overview, Compliance, Leads, Leaderboard
- Remove: `gm-cancelled`, `gm-unused`, `gm-review`, `gm-spot-check`
- Add: `gm-leads`, `gm-leaderboard`
- Update `drillDownViews` to include `gm-lead-detail` (replaces `gm-review-detail`)
- Keep `roleDefaults.gm = "gm-dashboard"`

**Files:** `src/config/navigation.js`

---

#### HER-GM-02: Update InteractiveShell for GM view routing
**Type:** Feature | **Priority:** Urgent | **Effort:** Small

Update `src/components/interactive/InteractiveShell.jsx`:
- Update `viewComponents` map: remove old GM views, add new ones
- Change `GM_MAIN_VIEWS` to `["gm-dashboard", "gm-compliance"]`
- Map `gm-leads` → new `InteractiveGMLeadsPage` component
- Map `gm-leaderboard` → new `InteractiveGMLeaderboardPage` component
- Map `gm-lead-detail` → slide-in handled within `InteractiveGMLeadsPage`

**Files:** `src/components/interactive/InteractiveShell.jsx`
**Depends on:** HER-GM-01

---

#### HER-GM-03: Update Sidebar for GM nav items
**Type:** Feature | **Priority:** Urgent | **Effort:** Small

Update `src/components/layout/Sidebar.jsx`:
- Update `SECTION_VIEW_IDS.gm` to match new view IDs
- GM nav doesn't need chevron groups (all top-level items)
- Ensure sidebar active highlighting works for new GM view IDs

**Files:** `src/components/layout/Sidebar.jsx`
**Depends on:** HER-GM-01

---

#### HER-GM-04: Update InteractiveDashboard GM section map + scroll
**Type:** Feature | **Priority:** Urgent | **Effort:** Small

Update `src/components/interactive/InteractiveDashboard.jsx`:
- Update `GM_SECTION_MAP` to `{ "gm-dashboard": "dashboard", "gm-compliance": "compliance" }`
- Update `GM_SECTION_TO_VIEW` accordingly
- Replace `GMDashboard` inline function with new `InteractiveGMDashboard` component import
- Remove old GM sections (cancelled-leads, unused-leads, lead-review, spot-check) from GM scroll page

**Files:** `src/components/interactive/InteractiveDashboard.jsx`
**Depends on:** HER-GM-02

---

### Phase 2: Data Layer — Real-Data GM Selectors

#### HER-GM-05: Replace hardcoded GM stats with real-data selectors
**Type:** Improvement | **Priority:** High | **Effort:** Medium

Current `getGMStats()` uses hardcoded data. Build new selectors in `src/selectors/demoSelectors.js`:

- `getGMDashboardStats(leads, dateRange)` — Compute from real leads (no zone filter since GM sees all):
  - Total leads
  - Conversion rate (rented / total, excluding Reviewed)
  - % contacted within 30 min (from `contactRange`)
  - Branch vs HRD split % (from `firstContactBy`)
  - Comment compliance rate (actionable leads with comments / total actionable)
  - Cancelled unreviewed count
  - Unused overdue count (daysOpen > 5)
  - With period-over-period change calculation (reuse `getComparisonDateRange` pattern)

- Keep `getGMStats()` for backward compat but deprecate

**Data source note:** `contactRange` and `firstContactBy` fields exist in mockData leads. In Supabase, these map to `contact_range` and `first_contact_by` columns. Verify `supabaseData.js` `leadFromRow()` maps these correctly.

**Files:** `src/selectors/demoSelectors.js`

---

#### HER-GM-06: Build GM trend selectors from real leads
**Type:** Feature | **Priority:** High | **Effort:** Medium

Replace `getGMTrends()` (hardcoded `weeklyTrends.gm`) with real-data selectors:

- `getGMMetricTrendByWeek(leads, opts)` — Like `getMetricTrendByWeek` but across all branches (no branch filter). Supports:
  - `metric`: conversion_rate, comment_rate, contacted_within_30_min, branch_vs_hrd_split
  - `timeframe`: trailing_4_weeks, last_13_weeks, year, month, week
  - `groupBy`: status, insurance_company, body_shop, branch
  - Returns `{ weeks, weekLabels, series, counts, aggregateRate }`

- Can likely extend existing `getMetricTrendByWeek` to accept `branch = null` for all-branch mode

**Data source note:** Weekly trends currently derived from `weeklyTrends.gm` in mockData (synthetic). All fields needed (`contactRange`, `firstContactBy`, `weekOf`, `status`) exist on real lead records in both mockData and Supabase.

**Files:** `src/selectors/demoSelectors.js`
**Depends on:** HER-GM-05

---

#### HER-GM-07: Build GM branch leaderboard selector
**Type:** Feature | **Priority:** High | **Effort:** Medium

- `getGMBranchLeaderboard(leads, dateRange, sortMetric, scope)`:
  - `scope`: "my_branches" (D. Williams' branches) or "all" (all branches)
  - Computes per-branch: conversion rate, % within 30 min, comment rate, branch vs HRD %, total leads
  - Sorted by `sortMetric`
  - Includes zone benchmark (aggregate across scope)
  - Includes trailing 4-week trend per branch per metric (for sparkline/arrows)

- Can extend existing `getBMLeaderboardData` or build fresh. The BM version filters to branches under the same GM — the GM version should support broader scope.

**Files:** `src/selectors/demoSelectors.js`
**Depends on:** HER-GM-05

---

#### HER-GM-08: Build GM leads selector (merged cancelled + unused)
**Type:** Feature | **Priority:** High | **Effort:** Small

- `getGMLeads(leads, dateRange, filters)`:
  - Returns cancelled + unused leads (excludes Rented, Reviewed)
  - Supports filters: { statusFilter, bmFilter, branchFilter, insuranceFilter }
  - Sorted by priority (reuse `getLeadPriority`)
  - Date range filtering via `leadInDateRange`

**Files:** `src/selectors/demoSelectors.js`

---

### Phase 3: GM Dashboard (Overview)

#### HER-GM-09: Build InteractiveGMDashboard component
**Type:** Feature | **Priority:** High | **Effort:** Large

New component: `src/components/interactive/InteractiveGMDashboard.jsx`

**Metric tiles (black background, white text — brand standard):**
1. Total Leads (count)
2. Conversion Rate (%)
3. % Contacted Within 30 Min (%) — #1 GM metric per David
4. Branch vs HRD Split (% branch-originated)
5. Comment Compliance (%)
6. Cancelled Unreviewed (count, red accent)

Each tile shows: value, period-over-period change (arrow + %), clickable for MetricDrilldownModal.

**Date range selector:** Same presets as BM (This Week, Trailing 4 Weeks, This Month, This Year, Custom).

**GM context header:** "D. Williams — Eastern Zone" with data-as-of date.

**Below tiles:** Time-to-Contact horizontal bar breakdown + Contact Source (Branch vs HRD) card — computed from real data.

**Files:** `src/components/interactive/InteractiveGMDashboard.jsx`
**Depends on:** HER-GM-05, HER-GM-04

---

#### HER-GM-10: Add conversion trend chart to GM dashboard
**Type:** Feature | **Priority:** High | **Effort:** Medium

Add trend chart section below metric tiles in `InteractiveGMDashboard`:
- Reuse `ConversionTrendChart` pattern from BM Meeting Prep
- Zone-level conversion rate over time (configurable timeframe)
- Support GroupBy selector (by branch, insurance company, body shop, status)
- When grouped: stacked bar chart showing composition
- Overlay line for aggregate rate

**Data source note:** Uses `getGMMetricTrendByWeek` selector (HER-GM-06). All data from real leads.

**Files:** `src/components/interactive/InteractiveGMDashboard.jsx`
**Depends on:** HER-GM-06, HER-GM-09

---

### Phase 4: GM Compliance (Enhance Existing)

#### HER-GM-11: Enhance InteractiveComplianceDashboard with real data
**Type:** Improvement | **Priority:** Normal | **Effort:** Medium

Current state: Uses `getGMStats()` (hardcoded) and `getBranchManagers()`.

Updates:
- Switch to `getGMDashboardStats()` for real-data metrics
- Add date range filter (same presets as dashboard)
- Show per-branch compliance breakdown table: branch name, BM, total leads, commented %, conversion rate
- Add branch-level progress bars for compliance
- Filterable by insurance company (already has filter UI)
- Remove hardcoded "D. Williams — Eastern Zone" — derive from demo user context
- Since this is a section in the shared scroll page with Dashboard, ensure it flows naturally below the overview

**Files:** `src/components/interactive/InteractiveComplianceDashboard.jsx`, `src/components/ComplianceDashboard.jsx`
**Depends on:** HER-GM-05

---

### Phase 5: GM Leads View (Merged Cancelled + Unused + Slide-in)

#### HER-GM-12: Build InteractiveGMLeadsPage — merged leads table
**Type:** Feature | **Priority:** High | **Effort:** Large

New component: `src/components/interactive/InteractiveGMLeadsPage.jsx`

**Layout:** Full-page table view with filters, badge counts, and slide-in panel.

**Filter bar:**
- Status: All | Cancelled | Unused (tab/pill toggle)
- Branch Manager dropdown
- Branch dropdown
- Insurance Company dropdown
- Date range (same presets)
- Search by customer name/reservation ID

**Table columns:** Customer, Reservation ID, Status, Branch, BM, Days Open, Contact Range, Mismatch flag, Has Comments indicator

**Badge:** Total count of unreviewed leads

**Sorting:** Default by priority (overdue > cancelled no comment > unused no comment > etc.)

**Row click:** Opens slide-in lead profile panel (HER-GM-13)

**Files:** `src/components/interactive/InteractiveGMLeadsPage.jsx`
**Depends on:** HER-GM-08, HER-GM-02

---

#### HER-GM-13: Build slide-in lead profile panel for GM
**Type:** Feature | **Priority:** High | **Effort:** Large

Slide-in panel from right side (not full page navigation). Triggered on lead row click in GM Leads view.

**Panel content — Three-column review layout (adapted for slide-in):**
1. **HLES Data:** Status, reason, reservation details, insurance company, body shop, dates
2. **TRANSLOG Activity Trail:** `TranslogTimeline` component — call/SMS/email events
3. **BM Comments + GM Directives:** Enrichment reason, notes, next action, follow-up date; GM directive textarea

**Mismatch warning:** If `lead.mismatch === true`, show warning banner at top of panel with `getMismatchReason()` explanation.

**Actions:**
- Add GM Directive (textarea + save)
- Archive — Reviewed (button)
- Navigate to next/previous lead in queue (arrows)

**Animation:** Slide from right with Framer Motion. Dim/overlay the table behind it.

**Reuse:** `ThreeColumnReview` component, `TranslogTimeline`, `StatusBadge`, `getMismatchReason()`

**Files:** New component in `src/components/interactive/` or inline within `InteractiveGMLeadsPage.jsx`
**Depends on:** HER-GM-12

---

### Phase 6: GM Leaderboard

#### HER-GM-14: Build InteractiveGMLeaderboardPage
**Type:** Feature | **Priority:** High | **Effort:** Large

New component: `src/components/interactive/InteractiveGMLeaderboardPage.jsx`

**Scope toggle:** "My Branches" (branches under D. Williams) | "All Branches"

**Sort-by metric selector:** Conversion Rate | % Within 30 Min | Comment Rate | Branch vs HRD %

**Date range:** Same presets as BM.

**Leaderboard table:**
- Rank # (by selected metric)
- Branch name
- BM name
- Stacked horizontal bar (Rented green / Cancelled black / Unused gray)
- Selected metric value (bold)
- All other metrics (secondary columns)
- Trailing 4-week trend arrow (up/down/flat) per metric
- Highlight row for "My branches" in "All" scope

**Zone/Region benchmark row:** Pinned at bottom showing aggregate.

**"Most Improved" toggle:** Re-sort by biggest week-over-week improvement.

**Reuse:** `LeaderboardModule` patterns from BM leaderboard, `ConversionBreakdownTable` for breakdown view.

**Files:** `src/components/interactive/InteractiveGMLeaderboardPage.jsx`
**Depends on:** HER-GM-07, HER-GM-02

---

### Phase 7: Polish & Data Integrity

#### HER-GM-15: Ensure consistent Hertz branding across GM views
**Type:** Improvement | **Priority:** Normal | **Effort:** Small

- Metric tiles: `bg-[var(--hertz-black)]` with white text
- Tables: Black header with white text, hover states
- Gold accent for active states, badges
- Consistent spacing, typography scale
- Framer Motion entrance animations matching BM views

**Files:** All new GM components

---

#### HER-GM-16: Test and fix scroll navigation for GM shared page
**Type:** Bug prevention | **Priority:** Normal | **Effort:** Small

- Verify IntersectionObserver works with 2 GM sections (dashboard + compliance)
- Verify bottom-of-page detection highlights "compliance" when scrolled to end
- Verify sidebar active state updates correctly on scroll
- Verify refresh lands on `gm-dashboard` with correct highlight
- Verify separate pages (Leads, Leaderboard) get full AnimatePresence transitions

**Files:** `InteractiveDashboard.jsx`, `Sidebar.jsx`, `InteractiveShell.jsx`
**Depends on:** HER-GM-04

---

#### HER-GM-17: Document Supabase data gaps for GM views
**Type:** Documentation | **Priority:** Normal | **Effort:** Small

Audit and document which GM data paths use mockData vs Supabase:

**Known gaps to verify:**
1. `orgMapping` — currently imported directly from `mockData.js`. Is there a Supabase `org_mapping` table? If yes, is it fetched in `DataContext`?
2. `weeklyTrends.gm` — hardcoded in mockData. Being replaced by real selectors (HER-GM-06), but verify the underlying lead fields exist in Supabase schema
3. `branchManagers` — from mockData. Check if `user_profiles` or `org_mapping` in Supabase provides this
4. `tasks` — imported from mockData in selectors. Check if `DataContext` fetches tasks from Supabase
5. `dailyTrends` — synthetic data generated in mockData. Being replaced (HER-GM-06) but verify
6. `contact_range`, `first_contact_by`, `week_of`, `body_shop` columns — added in migrations 017, 020. Verify `leadFromRow()` in `supabaseData.js` maps them

**Output:** Section in this doc or separate `docs/GM-SUPABASE-DATA-GAPS.md`

**Files:** `src/data/supabaseData.js`, `src/data/mockData.js`, `src/context/DataContext.jsx`

---

## Implementation Order

```
Phase 1: Navigation Foundation (do first, wire with placeholders)
┌─────────────┐
│ HER-GM-01   │ Navigation config
│ HER-GM-02   │ Shell routing
│ HER-GM-03   │ Sidebar
│ HER-GM-04   │ Section map + scroll
└──────┬──────┘
       │
Phase 2: Data Layer (must precede components)
┌──────┴──────┐
│ HER-GM-05   │ Real GM stats selectors
│ HER-GM-06   │ GM trend selectors
│ HER-GM-07   │ Leaderboard selector
│ HER-GM-08   │ GM leads selector
└──────┬──────┘
       │
Phase 3: GM Dashboard (landing page — build first)
┌──────┴──────┐
│ HER-GM-09   │ Dashboard component
│ HER-GM-10   │ Trend chart
└──────┬──────┘
       │
Phase 4: Compliance (enhance existing)
┌──────┴──────┐
│ HER-GM-11   │ Compliance enhancement
└──────┬──────┘
       │
Phase 5: GM Leads (core functionality)
┌──────┴──────┐
│ HER-GM-12   │ Leads page
│ HER-GM-13   │ Slide-in lead profile
└──────┬──────┘
       │
Phase 6: Leaderboard (new feature)
┌──────┴──────┐
│ HER-GM-14   │ Leaderboard page
└──────┬──────┘
       │
Phase 7: Polish
┌──────┴──────┐
│ HER-GM-15   │ Branding consistency
│ HER-GM-16   │ Scroll navigation QA
│ HER-GM-17   │ Supabase data gap doc
└─────────────┘
```

### Effort Estimates

| Phase | Tickets | Combined Effort |
|-------|---------|-----------------|
| Phase 1: Navigation | 4 tickets | Small (1-2 hrs) |
| Phase 2: Data Layer | 4 tickets | Medium (3-4 hrs) |
| Phase 3: Dashboard | 2 tickets | Large (3-4 hrs) |
| Phase 4: Compliance | 1 ticket | Medium (1-2 hrs) |
| Phase 5: Leads | 2 tickets | Large (4-5 hrs) |
| Phase 6: Leaderboard | 1 ticket | Large (3-4 hrs) |
| Phase 7: Polish | 3 tickets | Small (2-3 hrs) |
| **Total** | **17 tickets** | **~17-24 hrs** |

---

## Key Architecture Decisions

1. **`GM_MAIN_VIEWS = ["gm-dashboard", "gm-compliance"]`** — Only these two share a scroll page. Leads and Leaderboard are separate pages.
2. **GM sees all branches** — No zone filter on default. Leaderboard has toggle for "My Branches" vs "All."
3. **Slide-in panel for lead profile** — Not full-page navigation. Uses Framer Motion slide from right. Content reuses `ThreeColumnReview`.
4. **Real data everywhere** — Replace all `weeklyTrends.gm` usage with selectors computed from actual lead records.
5. **Same date presets as BM** — This Week, Trailing 4 Weeks, This Month, This Year, Custom.
6. **Demo user: D. Williams** — `roleUsers.gm` already set to "Mike Torres" in navigation.js but orgMapping has "D. Williams." Need to reconcile or just use orgMapping for data, roleUsers for display.

## Supabase Data Source Flags

Items that need verification for Supabase compatibility (HER-GM-17):

| Data | Current Source | Supabase Status | Action Needed |
|------|---------------|-----------------|---------------|
| `orgMapping` | `mockData.js` import | Unknown — check for `org_mapping` table | Verify table exists; add to DataContext fetch |
| `branchManagers` | `mockData.js` import | Unknown — may derive from `user_profiles` | Check if equivalent exists |
| `weeklyTrends.gm` | `mockData.js` hardcoded | N/A — being replaced by real selectors | No Supabase table needed |
| `dailyTrends` | `mockData.js` synthetic | N/A — being replaced | No Supabase table needed |
| `tasks` | `mockData.js` import | Check `tasks` table in Supabase | Verify DataContext fetches |
| `leads.contactRange` | mockData field | Migration 017 adds `contact_range` | Verify `leadFromRow()` mapping |
| `leads.firstContactBy` | mockData field | Should exist | Verify `leadFromRow()` mapping |
| `leads.bodyShop` | mockData field | Migration 020 adds `body_shop` | Verify `leadFromRow()` mapping |
| `leads.weekOf` | mockData field | Migration 017 adds `week_of` | Verify `leadFromRow()` mapping |
| `leads.mismatch` | mockData field | Check column exists | Verify mapping |
| `leads.gmDirective` | mockData field | Check column exists | Verify mapping |
