import { leads, branchManagers, weeklyTrends, orgMapping } from "../data/mockData";

// BM selectors
export function getLeadsForBranch(branch) {
  return leads.filter((l) => l.branch === branch);
}

export function getUnresolvedLeads() {
  return leads.filter((l) => !l.enrichmentComplete && !l.archived);
}

export function getAllLeads() {
  return leads;
}

// GM selectors
export function getCancelledLeads() {
  return leads.filter((l) => l.status === "Cancelled" && !l.archived);
}

export function getUnusedLeads() {
  return leads.filter((l) => l.status === "Unused");
}

export function getUntouchedLeads() {
  return leads.filter((l) => l.status === "Unused" && !l.enrichmentComplete);
}

export function getUntouchedLeadsForBranch(branch) {
  return leads.filter((l) => l.status === "Unused" && !l.enrichmentComplete && l.branch === branch);
}

export function getMismatchLeads() {
  return leads.filter((l) => l.mismatch);
}

export function getLeadById(id) {
  return leads.find((l) => l.id === id);
}

// Branch selectors
export function getBranches() {
  return [...new Set(leads.map((l) => l.branch))];
}

export function getBranchManagers() {
  return branchManagers;
}

// Summary stats
export function getBMStats() {
  const total = leads.length;
  const enriched = leads.filter((l) => l.enrichmentComplete).length;
  const cancelled = leads.filter((l) => l.status === "Cancelled").length;
  const unused = leads.filter((l) => l.status === "Unused").length;
  const rented = leads.filter((l) => l.status === "Rented").length;
  return { total, enriched, cancelled, unused, rented, enrichmentRate: Math.round((enriched / total) * 100) };
}

export function getGMStats() {
  const cancelledUnreviewed = leads.filter((l) => l.status === "Cancelled" && !l.archived && !l.gmDirective).length;
  const unusedOverdue = leads.filter((l) => l.status === "Unused" && l.daysOpen > 5).length;
  const enriched = leads.filter((l) => l.enrichmentComplete).length;
  const total = leads.length;
  return {
    cancelledUnreviewed,
    unusedOverdue,
    enrichmentCompliance: Math.round((enriched / total) * 100),
  };
}

// Trend selectors
export function getBMTrends() {
  const weeks = weeklyTrends.bm;
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

// Time to Contact stats (GM)
export function getTimeToContactStats() {
  const latest = weeklyTrends.gm[weeklyTrends.gm.length - 1];
  return latest.timeToContact;
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

// Insurance companies for filter
export function getInsuranceCompanies() {
  return [...new Set(leads.map((l) => l.insuranceCompany).filter(Boolean))].sort();
}
