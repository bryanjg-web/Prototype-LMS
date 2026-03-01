import { branchManagers, weeklyTrends, orgMapping, tasks } from "../data/mockData";

// Demo "now" — set so "this week" aligns with mock data (Feb 17–23)
const NOW = new Date("2026-02-22T09:00:00");

const TREND_TIMEFRAME_WEEKS = { this_week: 1, trailing_4_weeks: 4, this_month: 5, this_year: 13 };

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Weekly compliance meeting is on Thursdays. Returns next meeting date and days left. */
export function getNextComplianceMeetingDate() {
  const now = new Date(NOW);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0=Sun, 4=Thu
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  // If today is Thursday, next meeting is today (0 days); otherwise advance to next Thu
  const nextThursday = new Date(today);
  nextThursday.setDate(today.getDate() + (daysUntilThursday === 0 ? 0 : daysUntilThursday));
  const daysLeft = Math.ceil((nextThursday.getTime() - today.getTime()) / 86400000);
  const dateStr = nextThursday.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return { date: nextThursday, dateStr, daysLeft };
}

export function getDateRangePresets() {
  const thisMonday = getMonday(NOW);
  const thisMonthStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
  const thisYearStart = new Date(NOW.getFullYear(), 0, 1);
  const trailing4WeeksEnd = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 23, 59, 59);
  const trailing4WeeksStart = new Date(trailing4WeeksEnd.getTime() - 27 * 86400000); // 28 days = 4 weeks (0-indexed: 27 days back + today)

  return [
    { key: "this_week", label: "This week", start: thisMonday, end: new Date(thisMonday.getTime() + 6 * 86400000 + 86399999) },
    { key: "trailing_4_weeks", label: "Trailing 4 weeks", start: trailing4WeeksStart, end: trailing4WeeksEnd },
    { key: "this_month", label: "This month", start: thisMonthStart, end: new Date(NOW) },
    { key: "this_year", label: "This Year", start: thisYearStart, end: new Date(NOW) },
  ];
}

/** Returns the comparison (previous) period for relative change: this_week→last_week, this_month→prev month, this_year→prev year, custom→same-length prior period */
export function getComparisonDateRange(selectedPresetKey, customStart, customEnd) {
  const presets = getDateRangePresets();
  const preset = presets.find((p) => p.key === selectedPresetKey);

  if (selectedPresetKey === "this_week") {
    const thisMonday = preset?.start;
    if (!thisMonday) return null;
    const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
    return { start: lastMonday, end: new Date(lastMonday.getTime() + 6 * 86400000 + 86399999) };
  }
  if (selectedPresetKey === "trailing_4_weeks") {
    const end = preset?.end;
    if (!end) return null;
    const spanMs = 28 * 86400000;
    const priorEnd = new Date(end.getTime() - 86400000);
    const priorStart = new Date(priorEnd.getTime() - spanMs);
    return { start: priorStart, end: priorEnd };
  }
  if (selectedPresetKey === "this_month") {
    const thisMonthStart = preset?.start;
    if (!thisMonthStart) return null;
    const prevMonthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1);
    const prevMonthEnd = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth(), 0, 23, 59, 59);
    return { start: prevMonthStart, end: prevMonthEnd };
  }
  if (selectedPresetKey === "this_year") {
    const thisYearStart = preset?.start;
    const thisYearEnd = preset?.end;
    if (!thisYearStart || !thisYearEnd) return null;
    const spanMs = thisYearEnd.getTime() - thisYearStart.getTime();
    const prevYearEnd = new Date(thisYearStart.getTime() - 86400000);
    const prevYearStart = new Date(prevYearEnd.getTime() - spanMs);
    return { start: prevYearStart, end: prevYearEnd };
  }
  if (selectedPresetKey === "custom" && customStart && customEnd) {
    const start = new Date(customStart + "T00:00:00");
    const end = new Date(customEnd + "T23:59:59");
    const spanMs = end.getTime() - start.getTime();
    const priorEnd = new Date(start.getTime() - 1);
    const priorStart = new Date(priorEnd.getTime() - spanMs);
    return { start: priorStart, end: priorEnd };
  }
  return null;
}

/** Compute relative change (percentage) for period-over-period comparison. Used consistently across all metric tiles with time filters. */
export function relChange(current, previous) {
  if (previous == null || previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Check if a lead falls within a date range. Uses week_of or init_dt_final (lead received date) to align with Leads table semantics — not lastActivity. */
function leadInDateRange(lead, start, end) {
  const weekOf = lead.weekOf ?? lead.week_of;
  const initDt = lead.initDtFinal ?? lead.init_dt_final;
  let t = null;
  if (weekOf) {
    t = new Date(weekOf + "T00:00:00");
  } else if (initDt) {
    t = new Date(initDt + "T00:00:00");
  } else {
    t = lead.lastActivity ? new Date(lead.lastActivity) : (lead.translog?.[0] ? new Date(`${lead.translog[0].time}, 2026`) : null);
  }
  if (!t || isNaN(t.getTime())) return false;
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (s) {
    const sDay = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const tDay = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    if (tDay < sDay) return false;
  }
  if (e) {
    const eDay = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    const tDay = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    if (tDay > eDay) return false;
  }
  return true;
}

// BM selectors — accept leads as first param (from useData().leads)
export function getLeadsForBranch(leads, branch) {
  return (leads ?? []).filter((l) => l.branch === branch);
}

export function getLeadsForBranchInRange(leads, dateRange, branch) {
  let filtered = leads ?? [];
  if (branch) filtered = filtered.filter((l) => l.branch === branch);
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  return filtered;
}

/** Leads with any outstanding compliance item (cancelled unreviewed, unused overdue, missing comments, mismatch). Used for GM auto-create tasks. */
export function getLeadsWithOutstandingItemsForBranch(leads, dateRange, branch) {
  const branchLeads = getLeadsForBranchInRange(leads ?? [], dateRange, branch);
  const hasOutstanding = (l) => {
    if (l.status === "Cancelled" && !l.archived && !l.gmDirective) return true;
    if (l.status === "Unused" && (l.daysOpen ?? 0) > 5) return true;
    const actionable = l.status === "Cancelled" || l.status === "Unused";
    if (actionable && !(l.enrichment?.reason || l.enrichment?.notes)) return true;
    if (l.mismatch) return true;
    return false;
  };
  return branchLeads.filter(hasOutstanding);
}

export function getUnresolvedLeads(leads) {
  return (leads ?? []).filter((l) => !l.enrichmentComplete && !l.archived);
}

export function getAllLeads(leads) {
  return leads ?? [];
}

// GM selectors
export function getCancelledLeads(leads) {
  return (leads ?? []).filter((l) => l.status === "Cancelled" && !l.archived);
}

export function getUnusedLeads(leads) {
  return (leads ?? []).filter((l) => l.status === "Unused");
}

export function getUntouchedLeads(leads) {
  return (leads ?? []).filter((l) => l.status === "Unused" && !l.enrichmentComplete);
}

export function getUntouchedLeadsForBranch(leads, branch) {
  return (leads ?? []).filter((l) => l.status === "Unused" && !l.enrichmentComplete && l.branch === branch);
}

export function getMismatchLeads(leads) {
  return (leads ?? []).filter((l) => l.mismatch);
}

/** Returns a human-readable reason why a lead was flagged for data mismatch. Uses stored reason if present, otherwise derives from lead data. */
export function getMismatchReason(lead) {
  if (!lead?.mismatch) return null;
  if (lead.mismatchReason) return lead.mismatchReason;
  const hasContactEvents = (lead.translog?.length ?? 0) > 0;
  const hlesReason = lead.hlesReason || "Unknown";
  if (!hasContactEvents) {
    return `HLES states "${hlesReason}" but no contact attempts were recorded in the activity trail. Was this lead ever actually worked?`;
  }
  return `The stated reason ("${hlesReason}") doesn't match the recorded activity. Review the activity trail and BM comments for details.`;
}

export function getLeadById(leads, id) {
  return (leads ?? []).find((l) => l.id === id);
}

// Branch selectors
export function getBranches(leads) {
  return [...new Set((leads ?? []).map((l) => l.branch))];
}

/** Unique zones from org mapping (for GM filters). */
export function getZones() {
  return [...new Set(orgMapping.map((r) => r.zone).filter(Boolean))].sort();
}

export function getBranchManagers() {
  return branchManagers;
}

// Summary stats (optional date range: { start, end })
// Uses getFilteredLeads so tile and chart share the exact same lead set.
export function getBMStats(leads, dateRange = null, branch = null) {
  const filtered = getFilteredLeads(leads, dateRange, branch);
  const total = filtered.length;
  const enriched = filtered.filter((l) => l.enrichmentComplete).length;
  const cancelled = filtered.filter((l) => l.status === "Cancelled").length;
  const unused = filtered.filter((l) => l.status === "Unused").length;
  const rented = filtered.filter((l) => l.status === "Rented").length;
  return { total, enriched, cancelled, unused, rented, enrichmentRate: total ? Math.round((enriched / total) * 100) : 0 };
}

export function getGMStats(leads) {
  const list = leads ?? [];
  const cancelledUnreviewed = list.filter((l) => l.status === "Cancelled" && !l.archived && !l.gmDirective).length;
  const unusedOverdue = list.filter((l) => l.status === "Unused" && l.daysOpen > 5).length;
  const enriched = list.filter((l) => l.enrichmentComplete).length;
  const total = list.length;
  return {
    cancelledUnreviewed,
    unusedOverdue,
    enrichmentCompliance: total ? Math.round((enriched / total) * 100) : 0,
  };
}

// Trend selectors — always returns last 4 weeks for "4-Week Trend" charts
export function getBMTrends(dateRange = null) {
  const allWeeks = weeklyTrends.bm;
  // Always show last 4 weeks for the trend visualizations
  const weeks = allWeeks.slice(-4);
  const labels = weeks.map((w) => w.weekLabel);
  return {
    labels,
    leadVolume: weeks.map((w) => w.totalLeads),
    conversionRate: weeks.map((w) => w.conversionRate),
    commentRate: weeks.map((w) => w.commentRate),
  };
}

export function getGMTrends() {
  const weeks = weeklyTrends.gm;
  const labels = weeks.map((w) => w.weekLabel);
  return {
    labels,
    cancelledUnreviewed: weeks.map((w) => w.cancelledUnreviewed),
    commentCompliance: weeks.map((w) => w.commentCompliance),
    zoneConversionRate: weeks.map((w) => w.zoneConversionRate),
  };
}

// Time to Contact stats (GM) — maps under24h/under48h/over48h to 30m/1h/3h buckets for display
export function getTimeToContactStats() {
  const latest = weeklyTrends.gm[weeklyTrends.gm.length - 1];
  const t = latest.timeToContact || {};
  return {
    within30m: t.within30m ?? 50,
    within1h: t.within1h ?? 25,
    within3h: t.within3h ?? 15,
    over3h: t.over3h ?? 10,
  };
}

// Contact source stats (GM)
export function getContactSourceStats() {
  const latest = weeklyTrends.gm[weeklyTrends.gm.length - 1];
  return { branchContactRate: latest.branchContactRate, hrdContactRate: latest.hrdContactRate };
}

// Org hierarchy lookup by branch
export function getHierarchyForBranch(branch) {
  return orgMapping.find((r) => r.branch === branch) || null;
}

/** Get zone for a branch via org_mapping */
export function getZoneForBranch(branch) {
  const row = orgMapping.find((r) => r.branch === branch);
  return row?.zone ?? null;
}

/** Get week_of (Monday date string) for a lead. Falls back to initDtFinal-derived Monday when weekOf missing. */
export function getWeekOfForLead(lead) {
  const w = lead?.weekOf ?? lead?.week_of;
  if (w) return w;
  const dt = lead?.initDtFinal ?? lead?.init_dt_final;
  if (!dt) return null;
  const d = new Date(dt + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

/** Zone-level conversion rate: rented / total for leads in the same zone as branch. Uses org_mapping for zone. */
export function getZoneConversionRate(leads, branch) {
  const zone = getZoneForBranch(branch);
  if (!zone) return null;
  const zoneBranches = orgMapping.filter((r) => r.zone === zone).map((r) => r.branch);
  const zoneLeads = (leads ?? []).filter((l) => zoneBranches.includes(l.branch));
  const total = zoneLeads.length;
  if (total === 0) return null;
  const rented = zoneLeads.filter((l) => l.status === "Rented").length;
  return Math.round((rented / total) * 100);
}

/** Branch trailing 4-week conversion rate average. Uses week_of (or initDtFinal fallback) to group by week. */
export function getBranchTrailing4WeekConversionRate(leads, branch) {
  const branchLeads = (leads ?? []).filter((l) => l.branch === branch);
  if (branchLeads.length === 0) return null;
  const weekRates = new Map();
  for (const l of branchLeads) {
    const w = getWeekOfForLead(l);
    if (!w) continue;
    if (!weekRates.has(w)) weekRates.set(w, { total: 0, rented: 0 });
    const entry = weekRates.get(w);
    entry.total += 1;
    if (l.status === "Rented") entry.rented += 1;
  }
  const weeks = [...weekRates.entries()]
    .map(([week, { total, rented }]) => ({ week, rate: total ? (rented / total) * 100 : 0 }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-4);
  if (weeks.length === 0) return null;
  const avg = weeks.reduce((s, w) => s + w.rate, 0) / weeks.length;
  return Math.round(avg);
}

// ——— Meeting Prep selectors ———

/** Unique week_of values (Monday dates) from leads, sorted descending (most recent first) */
export function getAvailableWeeks(leads) {
  const weeks = new Set();
  for (const l of leads ?? []) {
    const w = getWeekOfForLead(l);
    if (w) weeks.add(w);
  }
  return [...weeks].sort((a, b) => b.localeCompare(a));
}

/** Current week Monday (demo "now" = Feb 22 2026 → week of Feb 17) */
export function getCurrentWeekMonday() {
  return getMonday(NOW).toISOString().split("T")[0];
}

/** Leads for branch in a given week (weekOf = YYYY-MM-DD Monday) */
export function getLeadsForBranchAndWeek(leads, branch, weekOf) {
  return (leads ?? []).filter((l) => {
    if (l.branch !== branch) return false;
    const w = getWeekOfForLead(l);
    return w === weekOf;
  });
}

/** % contacted within 30 min (contact_range = (a)<30min) */
export function getPctContactedWithin30Min(leads) {
  const list = leads ?? [];
  if (list.length === 0) return null;
  const within30 = list.filter((l) => (l.contactRange ?? l.contact_range) === "(a)<30min").length;
  return Math.round((within30 / list.length) * 100);
}

/** Branch vs HRD split for first_contact_by. Returns { branch: n, hrd: n } */
export function getBranchVsHrdSplit(leads) {
  const list = leads ?? [];
  let branch = 0;
  let hrd = 0;
  for (const l of list) {
    const by = l.firstContactBy ?? l.first_contact_by;
    if (by === "branch") branch += 1;
    else if (by === "hrd") hrd += 1;
  }
  return { branch, hrd };
}

/** Overdue count: follow-up date passed, lead still open (not Rented, not archived) */
export function getOverdueFollowUpCount(leads) {
  const list = leads ?? [];
  let count = 0;
  for (const l of list) {
    if (l.status === "Rented" || l.archived) continue;
    const fd = l.enrichment?.followUpDate;
    if (!fd) continue;
    // Support "Feb 22, 2026" or "2026-02-22"
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(fd) ? new Date(fd + "T00:00:00") : new Date(fd);
    if (isNaN(parsed.getTime())) continue;
    if (parsed < NOW) count += 1;
  }
  return count;
}

/** Priority sort: Overdue > Cancelled no comment > Unused no comment > Unused has comment > Cancelled has comment > Rented */
const PRIORITY_ORDER = { overdue: 0, cancelled_no_comment: 1, unused_no_comment: 2, unused_has_comment: 3, cancelled_has_comment: 4, rented: 5 };
function getLeadPriority(lead) {
  if (lead.status === "Rented") return PRIORITY_ORDER.rented;
  const hasComment = !!(lead.enrichment?.reason || lead.enrichment?.notes);
  const isOverdue = (() => {
    const fd = lead.enrichment?.followUpDate;
    if (!fd) return false;
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(fd) ? new Date(fd + "T00:00:00") : new Date(fd);
    return !isNaN(parsed.getTime()) && parsed < NOW;
  })();
  if (isOverdue && lead.status !== "Rented") return PRIORITY_ORDER.overdue;
  if (lead.status === "Cancelled" && !hasComment) return PRIORITY_ORDER.cancelled_no_comment;
  if (lead.status === "Unused" && !hasComment) return PRIORITY_ORDER.unused_no_comment;
  if (lead.status === "Unused" && hasComment) return PRIORITY_ORDER.unused_has_comment;
  if (lead.status === "Cancelled" && hasComment) return PRIORITY_ORDER.cancelled_has_comment;
  return PRIORITY_ORDER.rented;
}

/** Meeting Prep queue leads: filtered by status (Cancelled+Unused default, optionally include Rented), sorted by priority */
export function getMeetingPrepQueueLeads(leads, { includeRented = false } = {}) {
  let filtered = leads ?? [];
  if (!includeRented) {
    filtered = filtered.filter((l) => l.status === "Cancelled" || l.status === "Unused");
  }
  return [...filtered].sort((a, b) => getLeadPriority(a) - getLeadPriority(b));
}

/** Needs Comments: count of Cancelled + Unused leads with no explanation (reason or notes). The to-do list. */
export function getNeedsCommentsCount(leads) {
  const list = leads ?? [];
  return list.filter(
    (l) =>
      (l.status === "Cancelled" || l.status === "Unused") &&
      !(l.enrichment?.reason || l.enrichment?.notes)
  ).length;
}

/** Mismatch leads in period: leads flagged for data inconsistency (HLES vs TRANSLOG vs BM comments). BM must address before meeting. */
export function getMismatchLeadsInRange(leads, dateRange, branch) {
  const filtered = getLeadsForBranchInRange(leads ?? [], dateRange, branch);
  return filtered.filter((l) => l.mismatch);
}

/** Outstanding Meeting Prep count: unique leads needing comments OR with data mismatches. Avoids double-counting. */
export function getMeetingPrepOutstandingCount(leads, dateRange, branch) {
  const periodLeads = getLeadsForBranchInRange(leads ?? [], dateRange, branch);
  const needsComments = periodLeads.filter(
    (l) =>
      (l.status === "Cancelled" || l.status === "Unused") &&
      !(l.enrichment?.reason || l.enrichment?.notes)
  );
  const hasMismatch = periodLeads.filter((l) => l.mismatch);
  const uniqueIds = new Set([...needsComments, ...hasMismatch].map((l) => l.id));
  return uniqueIds.size;
}

/** Branch conversion rate for a specific week */
export function getBranchConversionRateForWeek(leads, branch, weekOf) {
  const weekLeads = getLeadsForBranchAndWeek(leads, branch, weekOf);
  const total = weekLeads.length;
  if (total === 0) return null;
  const rented = weekLeads.filter((l) => l.status === "Rented").length;
  return Math.round((rented / total) * 100);
}

/** Format week date for display (e.g. "Feb 17–23") */
export function formatWeekLabel(weekOf) {
  if (!weekOf) return "—";
  const d = new Date(weekOf + "T00:00:00");
  const mon = d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  const sun = new Date(d.getTime() + 6 * 86400000);
  const sunStr = sun.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  return `${mon}–${sunStr}`;
}

// Default branch for BM demo when user profile has no branch (e.g. before seed).
// Santa Monica has the most mock leads for the demo "current week" (Feb 17–23).
export function getDefaultBranchForDemo() {
  return "Santa Monica";
}

// Insurance companies for filter
export function getInsuranceCompanies(leads) {
  return [...new Set((leads ?? []).map((l) => l.insuranceCompany).filter(Boolean))].sort();
}

// Tasks for branch (BM view)
export function getTasksForBranch(branch) {
  return tasks.filter((t) => t.assignedBranch === branch);
}

/** Count of open tasks (status !== Done) for a branch */
export function getOpenTasksCount(tasksList) {
  return (tasksList ?? []).filter((t) => t.status !== "Done").length;
}

/** Task completion rate: (Done tasks / total tasks) * 100 for a branch */
export function getTaskCompletionRate(tasksList) {
  const list = tasksList ?? [];
  if (list.length === 0) return null;
  const done = list.filter((t) => t.status === "Done").length;
  return Math.round((done / list.length) * 100);
}

/** Filter tasks by createdAt within date range */
export function tasksInDateRange(tasksList, dateRange) {
  if (!tasksList?.length || !dateRange?.start || !dateRange?.end) return [];
  const startMs = dateRange.start.getTime();
  const endMs = dateRange.end.getTime() + 86400000 - 1; // end of day
  return tasksList.filter((t) => {
    const created = t.createdAt ? new Date(t.createdAt).getTime() : 0;
    return created >= startMs && created <= endMs;
  });
}

/** Return filtered leads array (by branch + dateRange) — same filter as getBMStats but returns the array instead of counts. Excludes Reviewed. */
export function getFilteredLeads(leads, dateRange = null, branch = null) {
  let filtered = leads ?? [];
  if (branch) filtered = filtered.filter((l) => l.branch === branch);
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  filtered = filtered.filter((l) => l.status !== "Reviewed");
  return filtered;
}

/**
 * Single source of truth for Summary: returns stats and chart data from the SAME filtered lead set.
 * Use this so tile and chart always match.
 */
export function getSummaryDataWithChart(leads, branchTasks, dateRange, branch, presetKey, trendsGroupBy) {
  const filtered = getFilteredLeads(leads, dateRange, branch);
  const total = filtered.length;
  const rented = filtered.filter((l) => l.status === "Rented").length;
  const enriched = filtered.filter((l) => l.enrichmentComplete).length;
  const cancelled = filtered.filter((l) => l.status === "Cancelled").length;
  const unused = filtered.filter((l) => l.status === "Unused").length;
  const stats = {
    total,
    rented,
    enriched,
    cancelled,
    unused,
    enrichmentRate: total ? Math.round((enriched / total) * 100) : 0,
  };
  const chartData =
    trendsGroupBy === "period"
      ? buildChartDataByPeriodFromFiltered(filtered, branchTasks, dateRange, branch, presetKey, leads)
      : buildChartDataStackedFromFiltered(filtered, dateRange, branch, trendsGroupBy, presetKey);
  return { stats, chartData };
}

/** Get leads for a zone (GM view). Filters by branches in that zone via org_mapping. */
export function getLeadsForZoneInRange(leads, dateRange, zone) {
  if (!zone) return [];
  const zoneBranches = orgMapping.filter((r) => r.zone === zone).map((r) => r.branch);
  let filtered = (leads ?? []).filter((l) => zoneBranches.includes(l.branch));
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  return filtered;
}

const GROUP_ATTRS = ["status", "insurance_company", "body_shop", "branch"];

function getLeadGroupKey(lead, attr) {
  if (attr === "status") return lead.status || "—";
  if (attr === "insurance_company") return lead.insuranceCompany ?? lead.insurance_company ?? "—";
  if (attr === "body_shop") return lead.bodyShop ?? lead.body_shop ?? "—";
  if (attr === "branch") return lead.branch ?? "—";
  return "—";
}

/**
 * Conversion breakdown with optional multi-level grouping.
 * @param {Array} leads - All leads
 * @param {Object} opts - { dateRange, branch, gmZone, groupByPrimary, groupBySecondary, includeReviewed }
 * @returns {Object} { rows, zoneBenchmark } — rows have groupKey, groupKeySecondary?, total, rented, unused, cancelled, conversionRate, unusedPct, cancelledPct, isSecondary?
 */
export function getConversionBreakdown(leads, opts = {}) {
  const { dateRange, branch, gmZone, groupByPrimary, groupBySecondary, includeReviewed = false } = opts;

  let filtered =
    gmZone != null
      ? getLeadsForZoneInRange(leads ?? [], dateRange, gmZone)
      : getFilteredLeads(leads, dateRange, branch);

  if (!includeReviewed) {
    filtered = filtered.filter((l) => l.status !== "Reviewed");
  }

  if (filtered.length === 0) {
    return { rows: [], zoneBenchmark: null };
  }

  const zone = gmZone ?? (branch ? getZoneForBranch(branch) : null);
  const zoneLeads =
    zone && !gmZone
      ? getLeadsForZoneInRange(leads ?? [], dateRange, zone)
      : gmZone
        ? filtered
        : [];
  const zoneTotal = zoneLeads.length;
  const zoneRented = zoneLeads.filter((l) => l.status === "Rented").length;
  const zoneBenchmark =
    zoneTotal > 0
      ? {
          conversionRate: Math.round((zoneRented / zoneTotal) * 100),
          total: zoneTotal,
          rented: zoneRented,
        }
      : null;

  if (!groupByPrimary || !GROUP_ATTRS.includes(groupByPrimary)) {
    const total = filtered.length;
    const rented = filtered.filter((l) => l.status === "Rented").length;
    const unused = filtered.filter((l) => l.status === "Unused").length;
    const cancelled = filtered.filter((l) => l.status === "Cancelled").length;
    return {
      rows: [
        {
          groupKey: "All",
          groupKeySecondary: null,
          total,
          rented,
          unused,
          cancelled,
          conversionRate: total ? Math.round((rented / total) * 100) : 0,
          unusedPct: total ? Math.round((unused / total) * 100) : 0,
          cancelledPct: total ? Math.round((cancelled / total) * 100) : 0,
          isSecondary: false,
        },
      ],
      zoneBenchmark,
    };
  }

  const primaryMap = new Map();
  for (const l of filtered) {
    const pk = getLeadGroupKey(l, groupByPrimary);
    if (!primaryMap.has(pk)) {
      primaryMap.set(pk, []);
    }
    primaryMap.get(pk).push(l);
  }

  const rows = [];
  const primaryKeys = [...primaryMap.keys()].sort((a, b) => {
    if (groupByPrimary === "status") {
      const order = { Rented: 0, Unused: 1, Cancelled: 2, Reviewed: 3 };
      return (order[a] ?? 4) - (order[b] ?? 4);
    }
    return String(a).localeCompare(String(b));
  });

  for (const pk of primaryKeys) {
    const groupLeads = primaryMap.get(pk);
    const total = groupLeads.length;
    const rented = groupLeads.filter((l) => l.status === "Rented").length;
    const unused = groupLeads.filter((l) => l.status === "Unused").length;
    const cancelled = groupLeads.filter((l) => l.status === "Cancelled").length;

    rows.push({
      groupKey: pk,
      groupKeySecondary: null,
      total,
      rented,
      unused,
      cancelled,
      conversionRate: total ? Math.round((rented / total) * 100) : 0,
      unusedPct: total ? Math.round((unused / total) * 100) : 0,
      cancelledPct: total ? Math.round((cancelled / total) * 100) : 0,
      isSecondary: false,
    });

    if (groupBySecondary && GROUP_ATTRS.includes(groupBySecondary) && groupBySecondary !== groupByPrimary) {
      const secondaryMap = new Map();
      for (const l of groupLeads) {
        const sk = getLeadGroupKey(l, groupBySecondary);
        if (!secondaryMap.has(sk)) secondaryMap.set(sk, []);
        secondaryMap.get(sk).push(l);
      }
      const secondaryKeys = [...secondaryMap.keys()].sort((a, b) => {
        if (groupBySecondary === "status") {
          const order = { Rented: 0, Unused: 1, Cancelled: 2, Reviewed: 3 };
          return (order[a] ?? 4) - (order[b] ?? 4);
        }
        return String(a).localeCompare(String(b));
      });
      for (const sk of secondaryKeys) {
        const subLeads = secondaryMap.get(sk);
        const subTotal = subLeads.length;
        const subRented = subLeads.filter((l) => l.status === "Rented").length;
        const subUnused = subLeads.filter((l) => l.status === "Unused").length;
        const subCancelled = subLeads.filter((l) => l.status === "Cancelled").length;
        rows.push({
          groupKey: pk,
          groupKeySecondary: sk,
          total: subTotal,
          rented: subRented,
          unused: subUnused,
          cancelled: subCancelled,
          conversionRate: subTotal ? Math.round((subRented / subTotal) * 100) : 0,
          unusedPct: subTotal ? Math.round((subUnused / subTotal) * 100) : 0,
          cancelledPct: subTotal ? Math.round((subCancelled / subTotal) * 100) : 0,
          isSecondary: true,
        });
      }
    }
  }

  return { rows, zoneBenchmark };
}

/** Parse time string like "2h 15m", "45m", "5d 2h" to minutes. Returns null if unparseable. */
export function parseTimeToMinutes(str) {
  if (!str || typeof str !== "string") return null;
  const s = str.trim();
  if (!s || s === "—") return null;
  let total = 0;
  const d = s.match(/(\d+)\s*d/);
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*m/);
  if (d) total += Number(d[1]) * 24 * 60;
  if (h) total += Number(h[1]) * 60;
  if (m) total += Number(m[1]);
  return total > 0 ? total : null;
}

/** Format minutes to display string (e.g. "1h 45m", "2.3d") */
export function formatMinutesToDisplay(min) {
  if (min == null || min < 0) return "—";
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 24 * 60) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(min / (24 * 60));
  const remainder = min % (24 * 60);
  const h = Math.round(remainder / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/** Average days open for leads (filtered by date range and branch) */
export function getAverageDaysOpen(leads, dateRange = null, branch = null) {
  let filtered = leads ?? [];
  if (branch) filtered = filtered.filter((l) => l.branch === branch);
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  const withDays = filtered.filter((l) => (l.daysOpen ?? 0) >= 0);
  if (withDays.length === 0) return null;
  const sum = withDays.reduce((s, l) => s + (l.daysOpen ?? 0), 0);
  return Math.round((sum / withDays.length) * 10) / 10;
}

/** Average time to first contact for leads (filtered by date range and branch). Returns formatted string. */
export function getAverageTimeToContact(leads, dateRange = null, branch = null) {
  const avgMin = getAverageTimeToContactMinutes(leads, dateRange, branch);
  return avgMin != null ? formatMinutesToDisplay(avgMin) : null;
}

/** Average time to first contact in minutes (for relChange calculation) */
export function getAverageTimeToContactMinutes(leads, dateRange = null, branch = null) {
  let filtered = leads ?? [];
  if (branch) filtered = filtered.filter((l) => l.branch === branch);
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  const minutes = filtered
    .map((l) => parseTimeToMinutes(l.timeToFirstContact))
    .filter((m) => m != null);
  if (minutes.length === 0) return null;
  return minutes.reduce((s, m) => s + m, 0) / minutes.length;
}

// Task by id (for task detail view)
export function getTaskById(taskId) {
  return tasks.find((t) => t.id === taskId) ?? null;
}

// Tasks for a specific lead (pass tasksList for override, else uses mock tasks)
export function getTasksForLead(leadId, tasksList) {
  const list = tasksList ?? tasks;
  return list.filter((t) => t.leadId === leadId);
}

/** Open tasks across GM's branches — for meeting prep "chase up" view. Sorted by urgency: overdue first, then due soon, then by priority. */
export function getTasksForGMBranches(tasksList, gmName = "D. Williams") {
  const list = tasksList ?? tasks;
  const myBranches = orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch);
  const open = list.filter((t) => t.status !== "Done" && myBranches.includes(t.assignedBranch));
  const now = new Date(NOW);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const tomorrowEnd = new Date(todayEnd.getTime() + 86400000);

  return [...open].sort((a, b) => {
    const aDue = a.dueDate ? new Date(a.dueDate + "T23:59:59").getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate + "T23:59:59").getTime() : Infinity;
    const aOverdue = aDue < now.getTime() ? 1 : 0;
    const bOverdue = bDue < now.getTime() ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue; // overdue first
    if (aDue !== bDue) return aDue - bDue; // sooner due first
    const pri = { High: 0, Medium: 1, Low: 2 };
    return (pri[a.priority] ?? 1) - (pri[b.priority] ?? 1);
  });
}

/** GM tasks progress: total, completed, open, and progress % for meeting prep modules. */
export function getGMTasksProgress(tasksList, gmName = "D. Williams") {
  const list = tasksList ?? tasks;
  const myBranches = orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch);
  const gmTasks = list.filter((t) => myBranches.includes(t.assignedBranch));
  const total = gmTasks.length;
  const completed = gmTasks.filter((t) => t.status === "Done").length;
  const open = total - completed;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 100;
  return { total, completed, open, progressPct };
}

function chartGranularity(presetKey, dateRange) {
  if (presetKey === "this_week") return "day";
  if (presetKey === "trailing_4_weeks") return "week";
  if (presetKey === "this_month") return "month";
  if (presetKey === "this_year") return "year";
  if (dateRange?.start && dateRange?.end) {
    const span = (dateRange.end - dateRange.start) / 86400000;
    if (span <= 14) return "day";
    if (span <= 90) return "week";
    return "month";
  }
  return "day";
}

// ——— BM Leaderboard (GM cohort) ———

/** Get branches under the same GM as the given branch. Falls back to zone if branch has no GM. */
export function getBranchesUnderSameGM(branch) {
  const row = orgMapping.find((r) => r.branch === branch);
  if (!row) return [];
  if (row.gm) return orgMapping.filter((r) => r.gm === row.gm).map((r) => r.branch);
  if (row.zone) return orgMapping.filter((r) => r.zone === row.zone).map((r) => r.branch);
  return [branch];
}

/** Compute all leaderboard metrics for a branch's leads in a date range. */
function computeBranchMetrics(leads, branch, dateRange) {
  const filtered = getLeadsForBranchInRange(leads ?? [], dateRange, branch);
  const total = filtered.length;
  const rented = filtered.filter((l) => l.status === "Rented").length;
  const conversionRate = total ? Math.round((rented / total) * 100) : null;

  const pctWithin30 = getPctContactedWithin30Min(filtered);
  const { branch: branchContact, hrd: hrdContact } = getBranchVsHrdSplit(filtered);
  const branchHrdTotal = branchContact + hrdContact;
  const branchHrdPct = branchHrdTotal ? Math.round((branchContact / branchHrdTotal) * 100) : null;

  const enriched = filtered.filter((l) => l.enrichmentComplete).length;
  const commentRate = total > 0 ? Math.round((enriched / total) * 100) : null;

  return {
    branch,
    total,
    conversionRate,
    pctWithin30,
    branchHrdPct,
    commentRate,
  };
}

/** BM Leaderboard data: my branch, peers (same GM), region benchmark. Sorted by selected metric. */
export function getBMLeaderboardData(leads, branch, dateRange, metricKey = "conversionRate") {
  const branches = getBranchesUnderSameGM(branch);
  if (branches.length === 0) return { myBranch: null, peers: [], regionBenchmark: null, gmName: null };

  const row = orgMapping.find((r) => r.branch === branch);
  const gmName = row?.gm ?? null;
  const cohortLabel = row?.gm ? `GM: ${row.gm}` : row?.zone ? `Zone: ${row.zone}` : "Your branch";

  const allBranchData = branches.map((b) => ({
    ...computeBranchMetrics(leads, b, dateRange),
    isCurrentBranch: b === branch,
  }));

  const sortKeys = {
    conversionRate: "conversionRate",
    pctWithin30: "pctWithin30",
    commentRate: "commentRate",
    branchHrdPct: "branchHrdPct",
  };
  const key = sortKeys[metricKey] ?? "conversionRate";
  const getVal = (d) => d[key] ?? -1;
  const sorted = [...allBranchData].sort((a, b) => getVal(b) - getVal(a));

  const myBranch = allBranchData.find((d) => d.isCurrentBranch) ?? null;
  const peers = sorted.filter((d) => !d.isCurrentBranch);
  const myRank = sorted.findIndex((d) => d.isCurrentBranch) + 1;

  const regionLeads = (leads ?? []).filter(
    (l) => branches.includes(l.branch) && leadInDateRange(l, dateRange?.start, dateRange?.end)
  );
  const regionTotal = regionLeads.length;
  const regionRented = regionLeads.filter((l) => l.status === "Rented").length;
  const regionConversionRate = regionTotal ? Math.round((regionRented / regionTotal) * 100) : null;
  const regionPctWithin30 = getPctContactedWithin30Min(regionLeads);
  const { branch: rBranch, hrd: rHrd } = getBranchVsHrdSplit(regionLeads);
  const regionBranchHrdPct = rBranch + rHrd > 0 ? Math.round((rBranch / (rBranch + rHrd)) * 100) : null;
  const regionActionable = regionLeads.filter((l) => l.status === "Cancelled" || l.status === "Unused");
  const regionWithComments = regionActionable.filter((l) => l.enrichment?.reason || l.enrichment?.notes);
  const regionCommentRate =
    regionActionable.length > 0 ? Math.round((regionWithComments.length / regionActionable.length) * 100) : null;

  const regionBenchmark = {
    conversionRate: regionConversionRate,
    pctWithin30: regionPctWithin30,
    commentRate: regionCommentRate,
    branchHrdPct: regionBranchHrdPct,
  };

  return {
    myBranch: myBranch ? { ...myBranch, rank: myRank } : null,
    peers,
    regionBenchmark,
    gmName,
    cohortLabel,
    sorted,
  };
}

/** Chart data grouped by dimension (body_shop, insurance_company, status) for View Trends. */
export function getTrendsChartDataByDimension(leads, branchTasks, dateRange, branch, groupBy) {
  const filtered = getLeadsForBranchInRange(leads ?? [], dateRange, branch);
  if (filtered.length === 0) return [];

  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));
  const groups = new Map();

  for (const lead of filtered) {
    const key = getLeadGroupKey(lead, groupBy);
    if (!groups.has(key)) {
      groups.set(key, { leads: [], taskIds: new Set() });
    }
    groups.get(key).leads.push(lead);
  }

  const tasksForBranch = branchTasks ?? [];
  const tasksInRange = dateRange
    ? tasksInDateRange(tasksForBranch, dateRange)
    : tasksForBranch;

  for (const task of tasksInRange) {
    const lead = task.leadId ? leadById.get(task.leadId) : null;
    if (!lead || lead.branch !== branch) continue;
    if (dateRange && !leadInDateRange(lead, dateRange.start, dateRange.end)) continue;
    const key = getLeadGroupKey(lead, groupBy);
    if (groups.has(key)) {
      groups.get(key).taskIds.add(task.id);
    }
  }

  const taskById = new Map(tasksForBranch.map((t) => [t.id, t]));

  return [...groups.entries()]
    .map(([label, { leads: groupLeads, taskIds }]) => {
      const total = groupLeads.length;
      const rented = groupLeads.filter((l) => l.status === "Rented").length;
      const enriched = groupLeads.filter((l) => l.enrichmentComplete).length;
      const commentRate = total > 0 ? Math.round((enriched / total) * 100) : 0;

      const groupTasks = [...taskIds].map((id) => taskById.get(id)).filter(Boolean);
      const openTasks = getOpenTasksCount(groupTasks);
      const taskCompletionRate = getTaskCompletionRate(groupTasks);

      const minutes = groupLeads
        .map((l) => parseTimeToMinutes(l.timeToFirstContact))
        .filter((m) => m != null);
      const avgTimeToContact = minutes.length > 0
        ? Math.round(minutes.reduce((s, m) => s + m, 0) / minutes.length)
        : 45;

      return {
        label,
        totalLeads: total,
        conversionRate: total ? Math.round((rented / total) * 100) : 0,
        commentRate,
        openTasks: openTasks || 0,
        taskCompletionRate: taskCompletionRate ?? 0,
        avgTimeToContact,
      };
    })
    .sort((a, b) => (b.totalLeads || 0) - (a.totalLeads || 0));
}

/** Get lead date for period assignment. Must match leadInDateRange fallbacks so chart and tiles use the same lead set. */
function getLeadDateForPeriod(lead) {
  const weekOf = lead.weekOf ?? lead.week_of;
  const initDt = lead.initDtFinal ?? lead.init_dt_final;
  if (weekOf) return new Date(weekOf + "T00:00:00");
  if (initDt) return new Date(initDt + "T00:00:00");
  if (lead.lastActivity) return new Date(lead.lastActivity);
  if (lead.translog?.[0]?.time) return new Date(`${lead.translog[0].time}, 2026`);
  return null;
}

/** Generate ordered period keys and labels for a date range. */
function getPeriodsForRange(dateRange, presetKey) {
  const gran = chartGranularity(presetKey, dateRange);
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const periods = [];
  const seen = new Set();

  if (gran === "day") {
    const isWeekPreset = presetKey === "this_week";
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      const label = isWeekPreset
        ? d.toLocaleDateString("en-AU", { weekday: "short" })
        : d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
      periods.push({ key, label });
    }
  } else if (gran === "week") {
    let cur = getMonday(start);
    const endMonday = getMonday(end);
    while (cur <= endMonday) {
      const key = cur.toISOString().split("T")[0];
      if (!seen.has(key)) {
        seen.add(key);
        periods.push({ key, label: cur.toLocaleDateString("en-AU", { month: "short", day: "numeric" }) });
      }
      cur.setDate(cur.getDate() + 7);
    }
  } else if (gran === "year") {
    const yr = start.getFullYear();
    const key = String(yr);
    if (!seen.has(key)) {
      seen.add(key);
      periods.push({ key, label: String(yr) });
    }
  } else {
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= endMonth) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      if (!seen.has(key)) {
        seen.add(key);
        periods.push({ key, label: cur.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }) });
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return periods;
}

/** Assign a lead's date to a period key based on granularity. */
function leadToPeriodKey(leadDate, gran) {
  if (!leadDate || isNaN(leadDate.getTime())) return null;
  if (gran === "day") return leadDate.toISOString().split("T")[0];
  if (gran === "week") return getMonday(leadDate).toISOString().split("T")[0];
  if (gran === "year") return String(leadDate.getFullYear());
  return `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, "0")}`;
}

/** Build period chart from pre-filtered leads. Used by getSummaryDataWithChart for single source of truth. */
function buildChartDataByPeriodFromFiltered(filtered, branchTasks, dateRange, branch, presetKey, leads) {
  if (!dateRange?.start || !dateRange?.end) return [];

  const gran = chartGranularity(presetKey, dateRange);
  const periods = getPeriodsForRange(dateRange, presetKey);
  const periodMap = new Map();

  for (const p of periods) {
    periodMap.set(p.key, { label: p.label, total: 0, rented: 0, enriched: 0, leadIds: new Set() });
  }
  periodMap.set("__unassigned__", { label: "Unassigned", total: 0, rented: 0, enriched: 0, leadIds: new Set() });

  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));
  const tasksForBranch = branchTasks ?? [];
  const tasksInRange = dateRange ? tasksInDateRange(tasksForBranch, dateRange) : tasksForBranch;

  for (const lead of filtered) {
    const leadDate = getLeadDateForPeriod(lead);
    const pk = leadDate ? leadToPeriodKey(leadDate, gran) : null;
    const periodKey = (pk && periodMap.has(pk)) ? pk : "__unassigned__";

    const row = periodMap.get(periodKey);
    row.leadIds.add(lead.id);
    row.total += 1;
    if (lead.status === "Rented") row.rented += 1;
    if (lead.enrichmentComplete) row.enriched += 1;
  }

  for (const task of tasksInRange) {
    const lead = task.leadId ? leadById.get(task.leadId) : null;
    if (!lead || lead.branch !== branch) continue;
    if (dateRange && !leadInDateRange(lead, dateRange.start, dateRange.end)) continue;
    const leadDate = getLeadDateForPeriod(lead);
    const pk = leadDate ? leadToPeriodKey(leadDate, gran) : null;
    const periodKey = (pk && periodMap.has(pk)) ? pk : "__unassigned__";
    const row = periodMap.get(periodKey);
    if (!row.taskIds) row.taskIds = new Set();
    row.taskIds.add(task.id);
  }

  const taskById = new Map(tasksForBranch.map((t) => [t.id, t]));

  const allPeriods = [...periods, { key: "__unassigned__", label: "Unassigned" }];
  return allPeriods
    .map((p) => {
      const row = periodMap.get(p.key);
      const total = row?.total ?? 0;
      const rented = row?.rented ?? 0;
      const enriched = row?.enriched ?? 0;
      const conversionRate = total > 0 ? Math.round((rented / total) * 100) : 0;
      const commentRate = total > 0 ? Math.round((enriched / total) * 100) : 0;

      const groupTasks = [...(row?.taskIds ?? [])].map((id) => taskById.get(id)).filter(Boolean);
      const openTasks = getOpenTasksCount(groupTasks);
      const taskCompletionRate = getTaskCompletionRate(groupTasks);

      const periodLeads = [...(row?.leadIds ?? [])].map((id) => leadById.get(id)).filter(Boolean);
      const minutes = periodLeads
        .map((l) => parseTimeToMinutes(l.timeToFirstContact))
        .filter((m) => m != null);
      const avgTimeToContact = minutes.length > 0
        ? Math.round(minutes.reduce((s, m) => s + m, 0) / minutes.length)
        : 0;

      return {
        label: p.label,
        totalLeads: total,
        rented,
        conversionRate,
        commentRate,
        openTasks: openTasks || 0,
        taskCompletionRate: taskCompletionRate ?? 0,
        avgTimeToContact,
      };
    })
    .filter((r) => r.totalLeads > 0);
}

/** Build stacked chart from pre-filtered leads. Used by getSummaryDataWithChart for single source of truth. */
function buildChartDataStackedFromFiltered(filtered, dateRange, branch, groupBy, presetKey) {
  if (!dateRange?.start || !dateRange?.end) return [];

  const gran = chartGranularity(presetKey, dateRange);
  const periods = getPeriodsForRange(dateRange, presetKey);
  const periodMap = new Map();

  for (const p of periods) {
    periodMap.set(p.key, { label: p.label, segments: {}, total: 0, rented: 0, enriched: 0 });
  }
  periodMap.set("__unassigned__", { label: "Unassigned", segments: {}, total: 0, rented: 0, enriched: 0 });

  for (const lead of filtered) {
    const leadDate = getLeadDateForPeriod(lead);
    const pk = leadDate ? leadToPeriodKey(leadDate, gran) : null;
    const periodKey = (pk && periodMap.has(pk)) ? pk : "__unassigned__";

    const groupKey = getLeadGroupKey(lead, groupBy);
    const row = periodMap.get(periodKey);
    row.segments[groupKey] = (row.segments[groupKey] ?? 0) + 1;
    row.total += 1;
    if (lead.status === "Rented") row.rented += 1;
    if (lead.enrichmentComplete) row.enriched += 1;
  }

  const allPeriods = [...periods, { key: "__unassigned__", label: "Unassigned" }];
  return allPeriods
    .map((p) => {
      const row = periodMap.get(p.key);
      const total = row?.total ?? 0;
      const segments = row?.segments ?? {};
      const segmentsPct = {};
      for (const [k, v] of Object.entries(segments)) {
        segmentsPct[k] = total > 0 ? Math.round((v / total) * 100) : 0;
      }
      const rented = row?.rented ?? 0;
      const enriched = row?.enriched ?? 0;
      const conversionRate = total > 0 ? Math.round((rented / total) * 100) : 0;
      const commentRate = total > 0 ? Math.round((enriched / total) * 100) : 0;
      return {
        period: p.label,
        segments: segmentsPct,
        total,
        raw: segments,
        rented,
        totalLeads: total,
        conversionRate,
        commentRate,
      };
    })
    .filter((r) => r.total > 0);
}

/** Public API: period chart. Delegates to buildChartDataByPeriodFromFiltered. */
export function getTrendsChartDataByPeriod(leads, branchTasks, dateRange, branch, presetKey) {
  const filtered = getFilteredLeads(leads, dateRange, branch);
  return buildChartDataByPeriodFromFiltered(filtered, branchTasks, dateRange, branch, presetKey, leads);
}

/** Public API: stacked chart. Delegates to buildChartDataStackedFromFiltered. */
export function getTrendsChartDataStacked(leads, dateRange, branch, groupBy, presetKey) {
  const filtered = getFilteredLeads(leads, dateRange, branch);
  return buildChartDataStackedFromFiltered(filtered, dateRange, branch, groupBy, presetKey);
}

// ——— GM Dashboard selectors (HER-39 through HER-42) ———

/** GM dashboard stats from real leads. No branch filter — GM sees all branches. Excludes Reviewed. */
export function getGMDashboardStats(leads, dateRange = null) {
  let filtered = leads ?? [];
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  filtered = filtered.filter((l) => l.status !== "Reviewed");

  const total = filtered.length;
  const rented = filtered.filter((l) => l.status === "Rented").length;
  const conversionRate = total ? Math.round((rented / total) * 100) : 0;

  const within30 = filtered.filter((l) => (l.contactRange ?? l.contact_range) === "(a)<30min").length;
  const pctWithin30 = total ? Math.round((within30 / total) * 100) : 0;

  const branchContact = filtered.filter((l) => (l.firstContactBy ?? l.first_contact_by) === "branch").length;
  const hrdContact = filtered.filter((l) => (l.firstContactBy ?? l.first_contact_by) === "hrd").length;
  const contactTotal = branchContact + hrdContact;
  const branchPct = contactTotal ? Math.round((branchContact / contactTotal) * 100) : 0;

  const actionable = filtered.filter((l) => l.status === "Cancelled" || l.status === "Unused");
  const withComments = actionable.filter((l) => l.enrichment?.reason || l.enrichment?.notes);
  const commentCompliance = actionable.length ? Math.round((withComments.length / actionable.length) * 100) : (total > 0 ? 100 : 0);

  const cancelledUnreviewed = filtered.filter((l) => l.status === "Cancelled" && !l.archived && !l.gmDirective).length;
  const unusedOverdue = filtered.filter((l) => l.status === "Unused" && (l.daysOpen ?? 0) > 5).length;

  return {
    total,
    rented,
    conversionRate,
    pctWithin30,
    branchPct,
    hrdPct: contactTotal ? 100 - branchPct : 0,
    branchContact,
    hrdContact,
    commentCompliance,
    cancelledUnreviewed,
    unusedOverdue,
  };
}

/**
 * Unreachable leads: Cancelled or Unused leads in the date range where no contact was
 * ever attempted. The canonical signal is contactRange === "NO CONTACT" (the same bucket
 * already used in the time-to-contact distribution). This is David's "Bucket 3" — leads
 * that slipped through entirely without a single call, email, or SMS from branch or HRD.
 */
export function getUnreachableLeads(leads, dateRange = null) {
  let filtered = leads ?? [];
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  filtered = filtered.filter((l) => l.status === "Cancelled" || l.status === "Unused");
  return filtered.filter(
    (l) =>
      (l.contactRange ?? l.contact_range) === "NO CONTACT" ||
      ((l.firstContactBy ?? l.first_contact_by) === "none" &&
        !(l.timeToFirstContact ?? l.time_to_first_contact))
  );
}

/**
 * Aggregated stats for the Unreachable Leads tile in GM Meeting Prep.
 * Returns count, pct (of all Cancelled/Unused), and a per-branch breakdown for the
 * expandable leads table.
 */
export function getUnreachableLeadsStats(leads, dateRange = null) {
  let allFiltered = leads ?? [];
  if (dateRange?.start || dateRange?.end) {
    allFiltered = allFiltered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  allFiltered = allFiltered.filter((l) => l.status !== "Reviewed");
  const actionable = allFiltered.filter((l) => l.status === "Cancelled" || l.status === "Unused");

  const unreachable = getUnreachableLeads(leads, dateRange);
  const count = unreachable.length;
  const pct = actionable.length ? Math.round((count / actionable.length) * 100) : 0;

  const byBranch = {};
  for (const lead of unreachable) {
    if (!byBranch[lead.branch]) byBranch[lead.branch] = [];
    byBranch[lead.branch].push(lead);
  }
  const branchBreakdown = Object.entries(byBranch)
    .map(([branch, branchLeads]) => ({ branch, count: branchLeads.length, leads: branchLeads }))
    .sort((a, b) => b.count - a.count);

  return { count, pct, total: actionable.length, branchBreakdown, leads: unreachable };
}

/** Contact range distribution from real leads (for Time to First Contact bar chart). */
export function getContactRangeDistribution(leads, dateRange = null) {
  let filtered = leads ?? [];
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  filtered = filtered.filter((l) => l.status !== "Reviewed");
  const total = filtered.length || 1;

  const buckets = [
    { key: "(a)<30min", label: "< 30m" },
    { key: "(b)31min-1hr", label: "30m–1h" },
    { key: "(c)1-3 hrs", label: "1–3h" },
    { key: "(d)3-6 hrs", label: "3–6h" },
    { key: "(e)6-12 hrs", label: "6–12h" },
    { key: "(f)12-24 hrs", label: "12–24h" },
    { key: "(g)24-48 hrs", label: "24–48h" },
    { key: "NO CONTACT", label: "No Contact" },
  ];

  return buckets.map((b) => {
    const count = filtered.filter((l) => (l.contactRange ?? l.contact_range) === b.key).length;
    return { ...b, count, pct: Math.round((count / total) * 100) };
  });
}

/** GM metric trend by week — like getMetricTrendByWeek but across all branches (branch=null means no filter).
 * Uses the SAME date range and period logic as BM Summary (getPeriodsForRange + getLeadDateForPeriod + leadToPeriodKey)
 * so the chart reads from the same data and shows consistent results. */
export function getGMMetricTrendByWeek(leads, opts = {}) {
  const { metric = "conversion_rate", groupBy, timeframe = "trailing_4_weeks" } = opts;

  const presets = getDateRangePresets();
  const preset = presets.find((p) => p.key === timeframe);
  if (!preset) return { weeks: [], weekLabels: [], series: [{ name: "Value", values: [] }], counts: [], aggregateRate: [] };

  const dateRange = { start: preset.start, end: preset.end };
  const gran = chartGranularity(timeframe, dateRange);
  const periods = getPeriodsForRange(dateRange, timeframe);
  const weeks = periods.map((p) => p.key);
  const weekLabels = periods.map((p) => p.label);

  let filtered = (leads ?? []).filter((l) => l.status !== "Reviewed");

  const getValueForWeek = (weekLeads, metricKey) => {
    if (weekLeads.length === 0) return null;
    if (metricKey === "conversion_rate") {
      const r = weekLeads.filter((l) => l.status === "Rented").length;
      return Math.round((r / weekLeads.length) * 100);
    }
    if (metricKey === "comment_rate") {
      const actionable = weekLeads.filter((l) => l.status === "Cancelled" || l.status === "Unused");
      if (actionable.length === 0) return weekLeads.length > 0 ? 100 : null;
      const withComments = actionable.filter((l) => l.enrichment?.reason || l.enrichment?.notes);
      return Math.round((withComments.length / actionable.length) * 100);
    }
    if (metricKey === "contacted_within_30_min") {
      const w30 = weekLeads.filter((l) => (l.contactRange ?? l.contact_range) === "(a)<30min").length;
      return Math.round((w30 / weekLeads.length) * 100);
    }
    if (metricKey === "branch_vs_hrd_split") {
      const withContact = weekLeads.filter((l) => {
        const by = l.firstContactBy ?? l.first_contact_by;
        return by === "branch" || by === "hrd";
      });
      if (withContact.length === 0) return null;
      const bc = withContact.filter((l) => (l.firstContactBy ?? l.first_contact_by) === "branch").length;
      return Math.round((bc / withContact.length) * 100);
    }
    return null;
  };

  const getSeriesName = (m) => {
    if (m === "conversion_rate") return "Conversion rate";
    if (m === "comment_rate") return "Comment rate";
    if (m === "contacted_within_30_min") return "Contacted within 30 min";
    if (m === "branch_vs_hrd_split") return "Branch %";
    return "Value";
  };

  const leadPeriodKey = (l) => leadToPeriodKey(getLeadDateForPeriod(l), gran);

  const counts = weeks.map((weekOf) => filtered.filter((l) => leadPeriodKey(l) === weekOf).length);

  if (!groupBy || !GROUP_ATTRS.includes(groupBy)) {
    const values = weeks.map((weekOf) => {
      const weekLeads = filtered.filter((l) => leadPeriodKey(l) === weekOf);
      return getValueForWeek(weekLeads, metric);
    });
    return { weeks, weekLabels, series: [{ name: getSeriesName(metric), values }], counts, aggregateRate: values };
  }

  const groupKeys = new Set();
  for (const l of filtered) groupKeys.add(getLeadGroupKey(l, groupBy));
  const sortedKeys = [...groupKeys].sort((a, b) => {
    if (groupBy === "status") {
      const order = { Rented: 0, Unused: 1, Cancelled: 2 };
      return (order[a] ?? 4) - (order[b] ?? 4);
    }
    return String(a).localeCompare(String(b));
  });

  const series = sortedKeys.map((k) => ({
    name: k,
    values: weeks.map((weekOf) => {
      const weekLeads = filtered.filter((l) => leadPeriodKey(l) === weekOf && getLeadGroupKey(l, groupBy) === k);
      return getValueForWeek(weekLeads, metric);
    }),
  }));

  const aggregateRate = weeks.map((weekOf) => {
    const weekLeads = filtered.filter((l) => leadPeriodKey(l) === weekOf);
    return getValueForWeek(weekLeads, metric);
  });

  return { weeks, weekLabels, series, counts, aggregateRate };
}

/** GM branch leaderboard: per-branch metrics, ranked by sortMetric. scope = "my_branches" | "all". */
export function getGMBranchLeaderboard(leads, dateRange, sortMetric = "conversionRate", scope = "all", gmName = "D. Williams") {
  const allBranches = [...new Set(orgMapping.map((r) => r.branch))];
  const myBranches = orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch);
  const branches = scope === "my_branches" ? myBranches : allBranches;

  const branchData = branches.map((branch) => {
    const branchLeads = getLeadsForBranchInRange(leads ?? [], dateRange, branch);
    const total = branchLeads.length;
    const rented = branchLeads.filter((l) => l.status === "Rented").length;
    const cancelled = branchLeads.filter((l) => l.status === "Cancelled").length;
    const unused = branchLeads.filter((l) => l.status === "Unused").length;
    const conversionRate = total ? Math.round((rented / total) * 100) : null;

    const w30 = branchLeads.filter((l) => (l.contactRange ?? l.contact_range) === "(a)<30min").length;
    const pctWithin30 = total ? Math.round((w30 / total) * 100) : null;

    const bc = branchLeads.filter((l) => (l.firstContactBy ?? l.first_contact_by) === "branch").length;
    const hc = branchLeads.filter((l) => (l.firstContactBy ?? l.first_contact_by) === "hrd").length;
    const branchHrdPct = (bc + hc) > 0 ? Math.round((bc / (bc + hc)) * 100) : null;

    const actionable = branchLeads.filter((l) => l.status === "Cancelled" || l.status === "Unused");
    const withComments = actionable.filter((l) => l.enrichment?.reason || l.enrichment?.notes);
    const commentRate = actionable.length > 0 ? Math.round((withComments.length / actionable.length) * 100) : (total > 0 ? 100 : null);

    const row = orgMapping.find((r) => r.branch === branch);
    return {
      branch,
      bmName: row?.bm ?? "—",
      zone: row?.zone ?? "—",
      gm: row?.gm ?? "—",
      total,
      rented,
      cancelled,
      unused,
      conversionRate,
      pctWithin30,
      branchHrdPct,
      commentRate,
      isMyBranch: myBranches.includes(branch),
    };
  });

  const sortKey = sortMetric;
  const getVal = (d) => d[sortKey] ?? -1;
  const sorted = [...branchData].sort((a, b) => getVal(b) - getVal(a));
  sorted.forEach((d, i) => { d.rank = i + 1; });

  const allLeads = branches.flatMap((b) => getLeadsForBranchInRange(leads ?? [], dateRange, b));
  const benchTotal = allLeads.length;
  const benchRented = allLeads.filter((l) => l.status === "Rented").length;
  const benchW30 = allLeads.filter((l) => (l.contactRange ?? l.contact_range) === "(a)<30min").length;
  const benchBc = allLeads.filter((l) => (l.firstContactBy ?? l.first_contact_by) === "branch").length;
  const benchHc = allLeads.filter((l) => (l.firstContactBy ?? l.first_contact_by) === "hrd").length;
  const benchActionable = allLeads.filter((l) => l.status === "Cancelled" || l.status === "Unused");
  const benchWithComments = benchActionable.filter((l) => l.enrichment?.reason || l.enrichment?.notes);

  const benchmark = {
    conversionRate: benchTotal ? Math.round((benchRented / benchTotal) * 100) : null,
    pctWithin30: benchTotal ? Math.round((benchW30 / benchTotal) * 100) : null,
    branchHrdPct: (benchBc + benchHc) > 0 ? Math.round((benchBc / (benchBc + benchHc)) * 100) : null,
    commentRate: benchActionable.length > 0 ? Math.round((benchWithComments.length / benchActionable.length) * 100) : null,
    total: benchTotal,
  };

  return { sorted, benchmark, gmName, scope };
}

/** GM leads list: merged cancelled + unused, filterable, sorted by priority. */
export function getGMLeads(leads, dateRange = null, filters = {}) {
  const { statusFilter, bmFilter, branchFilter, insuranceFilter, searchQuery } = filters;

  let filtered = leads ?? [];
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  filtered = filtered.filter((l) => l.status === "Cancelled" || l.status === "Unused");

  if (statusFilter && statusFilter !== "All") {
    filtered = filtered.filter((l) => l.status === statusFilter);
  }
  if (bmFilter && bmFilter !== "All") {
    filtered = filtered.filter((l) => l.bmName === bmFilter);
  }
  if (branchFilter && branchFilter !== "All") {
    filtered = filtered.filter((l) => l.branch === branchFilter);
  }
  if (insuranceFilter && insuranceFilter !== "All") {
    filtered = filtered.filter((l) => l.insuranceCompany === insuranceFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (l) => (l.customer ?? "").toLowerCase().includes(q) || (l.reservationId ?? "").toLowerCase().includes(q)
    );
  }

  return [...filtered].sort((a, b) => getLeadPriority(a) - getLeadPriority(b));
}

/** GM meeting prep data: per-branch compliance checklist + zone-level outstanding items. */
export function getGMMeetingPrepData(leads, dateRange = null, gmName = "D. Williams") {
  const myBranches = orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch);

  const branchChecklist = myBranches.map((branch) => {
    const branchLeads = getLeadsForBranchInRange(leads ?? [], dateRange, branch);
    const total = branchLeads.length;

    const cancelledUnreviewed = branchLeads.filter((l) => l.status === "Cancelled" && !l.archived && !l.gmDirective).length;
    const unusedOverdue = branchLeads.filter((l) => l.status === "Unused" && (l.daysOpen ?? 0) > 5).length;

    const actionable = branchLeads.filter((l) => l.status === "Cancelled" || l.status === "Unused");
    const withComments = actionable.filter((l) => l.enrichment?.reason || l.enrichment?.notes);
    const missingComments = actionable.length - withComments.length;

    const mismatchLeads = branchLeads.filter((l) => l.mismatch);

    const outstanding = cancelledUnreviewed + unusedOverdue + missingComments + mismatchLeads.length;
    const row = orgMapping.find((r) => r.branch === branch);

    return {
      branch,
      bmName: row?.bm ?? "—",
      total,
      cancelledUnreviewed,
      unusedOverdue,
      missingComments,
      mismatchCount: mismatchLeads.length,
      outstanding,
      isComplete: outstanding === 0,
    };
  });

  branchChecklist.sort((a, b) => b.outstanding - a.outstanding);

  const totalOutstanding = branchChecklist.reduce((s, b) => s + b.outstanding, 0);
  const branchesComplete = branchChecklist.filter((b) => b.isComplete).length;

  return {
    branchChecklist,
    totalOutstanding,
    branchesComplete,
    totalBranches: myBranches.length,
  };
}

/** Count of outstanding GM items across all branches — for module badge. */
export function getGMOutstandingCount(leads, dateRange = null, gmName = "D. Williams") {
  const data = getGMMeetingPrepData(leads, dateRange, gmName);
  return data.totalOutstanding;
}

/** Count of leads pending GM review (cancelled unreviewed + unused overdue). */
export function getGMLeadsToReviewCount(leads, dateRange = null) {
  let filtered = leads ?? [];
  if (dateRange?.start || dateRange?.end) {
    filtered = filtered.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }
  const cancelled = filtered.filter((l) => l.status === "Cancelled" && !l.archived && !l.gmDirective).length;
  const unusedOverdue = filtered.filter((l) => l.status === "Unused" && (l.daysOpen ?? 0) > 5).length;
  return cancelled + unusedOverdue;
}

// ─── Presentation Selectors ───────────────────────────────────────────────────

/**
 * Conversion by branch for presentation Slide 1.
 * Returns branches sorted by conversion rate desc, with current/prev period stats and trend delta.
 */
export function getConversionByBranch(leads, dateRange, compRange = null, gmName = "D. Williams") {
  const myBranches = orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch);

  const data = myBranches.map((branch) => {
    const curr = getLeadsForBranchInRange(leads ?? [], dateRange, branch);
    const prev = compRange ? getLeadsForBranchInRange(leads ?? [], compRange, branch) : [];

    const total = curr.length;
    const rented = curr.filter((l) => l.status === "Rented").length;
    const cancelled = curr.filter((l) => l.status === "Cancelled").length;
    const unused = curr.filter((l) => l.status === "Unused").length;
    const conversionRate = total ? Math.round((rented / total) * 100) : null;

    const prevTotal = prev.length;
    const prevRented = prev.filter((l) => l.status === "Rented").length;
    const prevConversionRate = prevTotal ? Math.round((prevRented / prevTotal) * 100) : null;

    const delta = conversionRate !== null && prevConversionRate !== null ? conversionRate - prevConversionRate : null;
    const row = orgMapping.find((r) => r.branch === branch);

    return { branch, bmName: row?.bm ?? "—", total, rented, cancelled, unused, conversionRate, prevConversionRate, delta };
  });

  return data
    .sort((a, b) => (b.conversionRate ?? -1) - (a.conversionRate ?? -1))
    .map((d, i) => ({ ...d, rank: i + 1 }));
}

/**
 * Conversion by insurance company for presentation Slide 2.
 * Returns insurers sorted by total volume desc (State Farm typically first), with trend delta.
 */
export function getConversionByInsurer(leads, dateRange, compRange = null, gmName = "D. Williams") {
  const myBranches = orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch);

  let currLeads = (leads ?? []).filter((l) => myBranches.includes(l.branch));
  if (dateRange?.start || dateRange?.end) {
    currLeads = currLeads.filter((l) => leadInDateRange(l, dateRange.start, dateRange.end));
  }

  let prevLeads = (leads ?? []).filter((l) => myBranches.includes(l.branch));
  if (compRange?.start || compRange?.end) {
    prevLeads = prevLeads.filter((l) => leadInDateRange(l, compRange.start, compRange.end));
  } else {
    prevLeads = [];
  }

  const insurers = [...new Set(currLeads.map((l) => l.insuranceCompany).filter(Boolean))];

  const data = insurers.map((insurer) => {
    const curr = currLeads.filter((l) => l.insuranceCompany === insurer);
    const prev = prevLeads.filter((l) => l.insuranceCompany === insurer);

    const total = curr.length;
    const rented = curr.filter((l) => l.status === "Rented").length;
    const cancelled = curr.filter((l) => l.status === "Cancelled").length;
    const unused = curr.filter((l) => l.status === "Unused").length;
    const conversionRate = total ? Math.round((rented / total) * 100) : null;

    const prevTotal = prev.length;
    const prevRented = prev.filter((l) => l.status === "Rented").length;
    const prevConversionRate = prevTotal ? Math.round((prevRented / prevTotal) * 100) : null;
    const delta = conversionRate !== null && prevConversionRate !== null ? conversionRate - prevConversionRate : null;

    return { insurer, total, rented, cancelled, unused, conversionRate, prevConversionRate, delta };
  });

  return data
    .sort((a, b) => b.total - a.total)
    .map((d, i) => ({ ...d, rank: i + 1 }));
}

/**
 * Week-by-week stacked data for a branch (or zone-level if branch = null).
 * Always returns the last 4 calendar weeks. Used for presentation stacked bar charts.
 */
export function getStackedWeeklyByBranch(leads, branch = null, gmName = "D. Williams") {
  const myBranches = orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch);

  // Trailing 4 weeks from NOW
  const end = new Date(NOW);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - 27 * 86400000);

  let filtered = (leads ?? []).filter((l) => leadInDateRange(l, start, end));
  if (branch) {
    filtered = filtered.filter((l) => l.branch === branch);
  } else {
    filtered = filtered.filter((l) => myBranches.includes(l.branch));
  }

  const weekMap = new Map();
  for (const l of filtered) {
    const weekKey = l.weekOf ?? l.week_of;
    if (!weekKey) continue;
    const wkDate = getMonday(new Date(weekKey));
    const key = wkDate.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, { date: wkDate, rented: 0, cancelled: 0, unused: 0 });
    const entry = weekMap.get(key);
    if (l.status === "Rented") entry.rented++;
    else if (l.status === "Cancelled") entry.cancelled++;
    else if (l.status === "Unused") entry.unused++;
  }

  return [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-4)
    .map(([key, v]) => ({
      weekOf: key,
      label: v.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rented: v.rented,
      cancelled: v.cancelled,
      unused: v.unused,
      total: v.rented + v.cancelled + v.unused,
    }));
}

/**
 * Returns Wins & Learnings entries for a GM, sorted newest first.
 */
export function getWinsLearningsForGM(winsLearnings, gmName = "D. Williams") {
  return (winsLearnings ?? [])
    .filter((e) => e.gmName === gmName)
    .sort((a, b) => new Date(b.createdAt ?? b.weekOf) - new Date(a.createdAt ?? a.weekOf));
}
