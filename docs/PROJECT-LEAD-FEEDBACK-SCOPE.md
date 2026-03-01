# Project Lead Feedback — Technical Implementation Scope

**Date:** March 1, 2026  
**Context:** Feedback from project lead review of Hertz LMS prototype

---

## 1. Last Upload Timestamp — "Data last updated on X"

### Implemented (Mar 2026)
- **"Data last updated on [date]"** blurb added underneath the Summary header (BM dashboard)
- Uses `dataAsOfDate` from `upload_summary` (Supabase) or `mockData` (demo)
- Styled as subtle secondary text (`text-[var(--neutral-600)]`) — visible but not error-like
- `SectionHeader` now accepts optional `subtitle` prop
- `DataContext` fetches and exposes `dataAsOfDate`

### Future: Full "MM/DD/YYYY hh:mm by [Admin]"
- **Clarified (Mar 2026):** Admin manually uploads CSV through the admin view. The timestamp when the admin uploads is the persistent record — not the file's internal date.
- `upload_summary` table stores `data_as_of_date` (text, e.g. "2026-02-26"), `hles`/`translog` JSONB, and `created_at` (timestamptz)
- No `uploaded_by` (admin name) column exists
- `fetchDataAsOfDate()` returns only the date string
- **The "Data as of" date is not currently displayed anywhere in the UI** (design doc specifies top bar; implementation appears incomplete)

### Technical Scope

| Component | Change |
|-----------|--------|
| **Schema** | Add `uploaded_by` (text, nullable) to `upload_summary` — stores display name of admin who performed the upload |
| **Ingestion** | When Admin uploads HLES/TransLog via admin view, record `created_at` (or explicit `uploaded_at`) as the upload timestamp; pass `auth.uid()` or `user_profiles.display_name` into the insert; update `data_as_of_date` to reflect the data period (from file or current date) |
| **API** | Extend `fetchUploadSummary` / `fetchDataAsOfDate` to return `{ dataAsOfDate, uploadedAt, uploadedBy }` — `uploadedAt` from `created_at` (admin upload time), `uploadedBy` from new column |
| **UI** | Add persistent footer or top-bar chip: **"Last upload: MM/DD/YYYY hh:mm by [Admin Name]"** — visible to all roles (BM, GM, Admin) so users know data freshness |

### Placement Options
- **Option A:** Top bar (DemoTopBar), right of "LEO: Your Lead Management System" — compact, always visible
- **Option B:** Sidebar footer, above user profile — less prominent but always in view
- **Option C:** Subtle footer bar below main content — persistent but unobtrusive

**Recommendation:** Option A — aligns with design doc ("Data as of date in top bar") and project lead request for "somewhere persistent."

---

## 2. SMS/Call Sender Identity — "Hertz" vs Random Number / Potential Spam

### Current State
- **SMS:** `send-sms` Edge Function uses `TWILIO_PHONE_NUMBER` as `From` — recipient sees this number
- **Calls:** `initiate-call` uses same Twilio number; BM receives call from it, then Twilio bridges to customer
- Sender identity depends entirely on Twilio configuration:
  - **Generic Twilio number:** Often shows as numeric only; may be flagged "potential spam" by carriers
  - **Toll-free (e.g. 1-800):** Can register CNAM (Caller ID Name) as "Hertz" via Twilio
  - **SMS:** US does not support alphanumeric sender IDs; international can use "Hertz" in some regions

### Technical Scope

| Item | Implementation |
|------|----------------|
| **Caller ID (calls)** | Register CNAM for the Twilio number: Twilio Console → Phone Numbers → Configure → Caller ID. Set "Friendly Name" to "Hertz" or "Hertz Rental Car." Requires verified business identity. |
| **SMS sender** | US: No alphanumeric; recipient sees number. Consider a **Toll-Free number** (e.g. 1-800) — better deliverability, less spam flagging. Twilio Toll-Free Verification required. |
| **Documentation** | Add `docs/TWILIO_SETUP.md` with steps: (1) Obtain/verify Toll-Free or local number, (2) Register CNAM, (3) Set `TWILIO_PHONE_NUMBER` in Supabase secrets |
| **In-app note** | Optional: Tooltip or help text on Contact section: "Calls/SMS will show as [Hertz] from [number]" so BMs can inform customers |

### Clarifying Questions
- Does Hertz already have a dedicated number for lead outreach, or will a new Twilio number be provisioned?
- Is Toll-Free (1-800) acceptable for SMS, or does the business prefer a local number for branch-specific identity?

---

## 3. Enrichment Preserved on Re-Upload — "Portal comments not overwritten"

### Current State (Design Intent)
- Design doc explicitly states: *"Comments and directives persist. Everything the BM and GM record in the LMS is stored permanently. It doesn't get overwritten by the next data upload."*
- `leads` table has separate columns: `enrichment` (JSONB), `enrichment_log` (JSONB), `translog` (JSONB)
- HLES ingestion upserts on `CONFIRM_NUM` (reservation_id); TransLog appends events to `translog`

### Technical Scope

| Layer | Requirement |
|-------|-------------|
| **HLES ingestion** | Upsert logic must **merge** HLES fields (status, branch, bm_name, days_open, etc.) while **never overwriting** `enrichment`, `enrichment_log`, `gm_directive`, `archived`, `email`, `phone` (manual contact fields). Use `ON CONFLICT (reservation_id) DO UPDATE SET ...` with explicit column list excluding LMS-only fields. |
| **TransLog ingestion** | **Append** new events to `translog` JSONB array; do not replace. Match by KNUM/reservation_id; merge new events with existing, deduplicate by event id/timestamp if needed. |
| **Verification** | Add integration test or manual checklist: (1) Enrich a lead, (2) Re-upload HLES with updated status for same reservation, (3) Assert enrichment and enrichment_log unchanged |
| **Documentation** | Document merge rules in `docs/DATA_INGESTION.md` — "LMS-owned fields preserved" table |

### Note
The prototype's upload flow (`InteractiveUploads`, `AdminUpload`) is currently UI-only with mock data. The **real ingestion pipeline** (Supabase Edge Function or external script) must implement these merge rules when built.

---

## 4. Push Enrichment Back to TransLog — TransLog CSV Format Export

### Requirements
1. **Protection:** TransLog CSV uploads must **never overwrite** manual enrichments (`enrichment`, `enrichment_log`). Ingestion appends to `translog` only.
2. **Export:** Export enrichment data in **TransLog CSV format** (`translog_sample_5000.csv`) so it can be consumed by TransLog/ETL.

### TransLog CSV Schema (from `docs/translog_sample_5000.csv`)

| Column | Type | Enrichment Export Mapping |
|--------|------|---------------------------|
| ID | int | Unique ID (e.g. `LMS{timestamp}{leadId}` or sequential) |
| Knum | text | `lead.reservation_id` (or KNUM if available) |
| CSPLIT_REC | int | 0 |
| TSD_NUM | int | 0 |
| INVOICE | text | "" |
| LocCode | text | Branch location code from `org_mapping` |
| SystemDate | text | `YYYYMMDDHHMMSS` (enrichment `updated_at`) |
| ApplicationDate | float | Same as SystemDate in float format |
| EventType | int | 4 (Location/Contact) or custom LMS code |
| BGN01 | text | "LMS" or "99" for LMS-origin |
| SF_TRANS | text | "" |
| STAT_FLAG | text | "" |
| EXT | text | "LMS Enrichment" |
| MSG1 | text | "LMS Comment" |
| MSG2 | text | `enrichment.reason` |
| MSG3 | text | `enrichment.notes` |
| MSG4 | text | `enrichment.nextAction` |
| MSG5 | text | `enrichment.followUpDate` |
| MSG6–MSG10 | text | "" or additional metadata |
| REQUESTED_DAYS | int | 0 |
| OFOUR_FROM | text | "" |
| OFOUR_TO | text | "" |
| CONFIRM_NUM | text | `lead.reservation_id` |
| TIMEZONE | int | 1 |
| EMP_CODE | text | Author from `enrichment_log` or user profile |
| EMP_LNAME | text | Author last name |
| EMP_FNAME | text | Author first name |
| FIELD_CHANGED | text | "" |
| REZ_NUM | text | "" |
| csplitid | int | 0 |

### Implementation
- Add `exportEnrichmentToTransLogCSV(leads, orgMapping)` in `utils/exportUtils.js`
- Admin or BM export action: "Export enrichment (TransLog format)" — generates CSV with one row per enriched lead (or per enrichment_log entry for history)
- Ingestion pipeline: ensure TransLog append **never** touches `enrichment` / `enrichment_log`

---

## 5. BM Weekly Reporting Preview — "See how material will look before GM meeting"

### Current State
- GM has: Compliance Dashboard, Cancelled Leads, Unused Leads, Lead Review, Spot Check
- BM has: Summary, My Leads, Open Tasks
- BM does not have a view that mirrors what the GM will see for their branch in the weekly meeting

### Build Plan (BM Meeting Prep)

**What we'll build:**

1. **New sidebar item** — "Meeting Prep" (BM only), placed after "Open Tasks"

2. **Single-page view** with three sections (all filtered to `userProfile.branch`):
   - **Summary cards** — Same metrics the GM sees for this branch: Cancelled Unreviewed count, Unused Overdue count, Comment Compliance %. Reuse `InteractiveComplianceDashboard` with branch filter (single-branch mode).
   - **Cancelled leads queue** — Table/list of cancelled leads for this branch that haven't been archived. Reuse `InteractiveCancelledLeads` filtered by branch. Click row → navigate to lead detail for last-minute edits.
   - **Unused leads queue** — Same for unused leads. Reuse `InteractiveUnusedLeads` filtered by branch.

3. **Header copy** — "How your branch will appear in this week's GM meeting" — sets context

4. **Editable** — Rows are clickable; BM can open lead detail and add/edit comments before the meeting (same flow as My Leads)

5. **Optional later** — "Print" or "Export PDF" button for a static snapshot to bring to the call

**Implementation steps:**
- Add `bm-meeting-prep` to `roleNav.bm` in `navigation.js`
- Add route in `InteractiveShell` → new component `InteractiveMeetingPrep.jsx`
- `InteractiveMeetingPrep` composes `InteractiveComplianceDashboard` (branch-scoped) + `InteractiveCancelledLeads` (branch filter) + `InteractiveUnusedLeads` (branch filter)
- Wire `navigateTo("bm-lead-detail", leadId)` on row click

---

## 6. Interface Simplification (Designer Recommendation)

### Current State
- **GM:** 6 nav items — Dashboard, Compliance, Cancelled Leads, Unused Leads, Lead Review, Spot Check
- **BM:** 3 nav items — Summary, My Leads, Open Tasks
- **Admin:** 4 nav items — Dashboard, Data Uploads, Org Mapping, Legend

### Simplification Proposals

#### GM (6 → 4 items)
| Before | After | Rationale |
|--------|-------|------------|
| Dashboard | **Overview** | Single entry point |
| Compliance | **Compliance** | Keep — core GM job |
| Cancelled Leads | **Leads to Review** | Merge Cancelled + Unused + Lead Review into one tabbed/filtered view |
| Unused Leads | ↑ | |
| Lead Review | ↑ | |
| Spot Check | **Spot Check** | Keep — distinct "drill into branch" action |

**Proposed GM nav:** Overview | Compliance | Leads to Review (with filters: Cancelled / Unused / All) | Spot Check

#### BM (3 → 3, refine labels)
- **Summary** → "Dashboard" (align with GM language)
- **My Leads** → "My Leads" (keep)
- **Open Tasks** → "Tasks" (shorter)

#### Admin (4 → 3)
- **Dashboard** → Keep or remove if Admin only does config
- **Data Uploads** → Keep
- **Org Mapping** → Keep
- **Legend** → Move to help/tooltip or Settings — not primary nav

**Proposed Admin nav:** Dashboard | Data Uploads | Org Mapping

#### Cross-cutting
- **Collapsible sidebar** — Already exists; ensure collapsed state is default for returning users (optional)
- **Section headers** — If nav grows again, group: "Work" vs "Configure" (Admin)
- **Reduce dashboard density** — Fewer cards above the fold; "View trends" as secondary action

---

## Summary — Implementation Order

| Priority | Item | Effort | Dependencies |
|----------|------|--------|--------------|
| P0 | Last upload timestamp + admin name (schema, API, UI) | Small | None |
| P0 | Enrichment preservation guarantee (ingestion spec + tests) | Medium | Real ingestion pipeline |
| P1 | BM Meeting Prep view | Medium | None |
| P1 | Twilio sender identity (CNAM, docs) | Small | Twilio account access |
| P2 | Interface simplification (GM nav merge) | Medium | Design sign-off |
| P3 | Enrichment export for TransLog (CSV spec) | Small | TransLog team input |

---

## Meeting Prep v2 — Clarifications (Mar 2026)

### 1. Last upload timestamp
Admin manually uploads the CSV through the admin view. The timestamp when the admin uploads is the persistent record.

### 2. HLES CONTACT RANGE — Sub-30-minute buckets
**Answer:** HLES has **exactly one** sub-30-minute bucket: **(a)<30min**. No other sub-30-minute buckets exist (e.g. no sub-15, sub-5).

Full CONTACT RANGE values in HLES:
- (a)<30min — **only sub-30-min bucket**
- (b)31min - 1hr
- (c)1-3 hrs
- (d)3-6 hrs
- (e)6-12 hrs
- (f)12-24 hrs
- (g)24-48 hrs
- NO CONTACT

### 3. Lead detail UX
**Answer:** Slide-in panel from right (not full-page navigation). Three-column layout: HLES | TRANSLOG | BM comments + GM directives.

### 4. Mismatch detection
**Answer:** Surface data mismatches that don't make sense when considering each data field together — e.g. HLES says "CUSTOMER CANCELLED", TRANSLOG shows zero contact attempts, BM comments say "customer went with competitor" (Robert Hayes scenario). Warning banner (bg-warning-light, border-warning/30).

### 5. Zone average
**Answer:** Compute from leads + org_mapping (branch → zone via org_mapping, then aggregate leads by zone).

### 6. Week selector
**Answer:** Use leads + org_mapping for zone/branch context. Add `week_of` to leads during HLES ingestion (from "Week Of" column).

---

## Clarifying Questions for Project Lead

1. **Last upload placement:** Top bar, sidebar footer, or dedicated "Data status" section?
2. **Twilio:** Does Hertz have an existing number for lead outreach, or new provisioning?
3. **BM Meeting Prep:** Read-only preview only, or allow edits from that view?
4. **Interface simplification:** Approve GM nav merge (6→4) before implementation?
5. **TransLog export:** When is this likely to be needed? (Informs export format design)
