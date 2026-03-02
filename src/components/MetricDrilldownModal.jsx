import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getFilteredLeads,
  tasksInDateRange,
  getOpenTasksCount,
  getTaskCompletionRate,
  getAverageTimeToContactMinutes,
  formatMinutesToDisplay,
  parseTimeToMinutes,
  getLeadById,
  getBranchVsHrdSplit,
  getConversionBreakdown,
} from "../selectors/demoSelectors";
import StatusBadge from "./StatusBadge";
import GroupBySelector from "./GroupBySelector";
import ConversionBreakdownTable from "./ConversionBreakdownTable";
import { formatDateRange } from "../utils/dateTime";

function formatRange(range) {
  return formatDateRange(range?.start, range?.end) || "—";
}

const METRIC_CONFIG = {
  total_leads: {
    label: "Total Leads",
    type: "leads",
    description: "All leads received during this period",
    getValue: (leads) => leads.length,
    format: (v) => `${v}`,
    getRelevant: (leads) => leads,
  },
  conversion_rate: {
    label: "Conversion Rate",
    type: "leads",
    description: "Percentage of leads that converted to a rental",
    getValue: (leads) => {
      const total = leads.length;
      const rented = leads.filter((l) => l.status === "Rented").length;
      return total ? Math.round((rented / total) * 100) : 0;
    },
    format: (v) => `${v}%`,
    getRelevant: (leads) => leads,
    numeratorLabel: "Rented",
    numeratorFilter: (l) => l.status === "Rented",
    denominatorLabel: "Total",
  },
  comment_rate: {
    label: "Comment Rate",
    type: "leads",
    description: "Percentage of leads with enrichment/comments completed",
    getValue: (leads) => {
      const total = leads.length;
      const enriched = leads.filter((l) => l.enrichmentComplete).length;
      return total ? Math.round((enriched / total) * 100) : 0;
    },
    format: (v) => `${v}%`,
    getRelevant: (leads) => leads,
    numeratorLabel: "Commented",
    numeratorFilter: (l) => l.enrichmentComplete,
    denominatorLabel: "Total",
  },
  open_tasks: {
    label: "Open Tasks",
    type: "tasks",
    description: "Tasks that are not yet completed",
    getValue: (_, tasks) => getOpenTasksCount(tasks),
    format: (v) => `${v}`,
    getRelevantTasks: (tasks) => tasks.filter((t) => t.status !== "Done"),
  },
  task_completion_rate: {
    label: "Task Completion Rate",
    type: "tasks",
    description: "Percentage of tasks marked as Done",
    getValue: (_, tasks) => getTaskCompletionRate(tasks),
    format: (v) => (v != null ? `${v}%` : "—"),
    getRelevantTasks: (tasks) => tasks,
    numeratorLabel: "Done",
    numeratorFilter: (t) => t.status === "Done",
    denominatorLabel: "Total",
  },
  avg_time_to_contact: {
    label: "Average Time for First Contact",
    type: "leads",
    description: "Average time from lead receipt to first customer contact",
    getValue: (leads) => {
      const minutes = leads
        .map((l) => parseTimeToMinutes(l.timeToFirstContact))
        .filter((m) => m != null);
      if (minutes.length === 0) return null;
      return minutes.reduce((s, m) => s + m, 0) / minutes.length;
    },
    format: (v) => (v != null ? formatMinutesToDisplay(v) : "—"),
    getRelevant: (leads) => leads.filter((l) => parseTimeToMinutes(l.timeToFirstContact) != null),
    lowerIsBetter: true,
  },
  contacted_within_30_min: {
    label: "Contacted within 30 min",
    type: "leads",
    description: "Percentage of leads with first contact within 30 minutes of lead creation",
    getValue: (leads) => {
      const list = leads ?? [];
      if (list.length === 0) return null;
      const within30 = list.filter((l) => (l.contactRange ?? l.contact_range) === "(a)<30min").length;
      return Math.round((within30 / list.length) * 100);
    },
    format: (v) => (v != null ? `${v}%` : "—"),
    getRelevant: (leads) => leads,
    numeratorLabel: "Within 30 min",
    numeratorFilter: (l) => (l.contactRange ?? l.contact_range) === "(a)<30min",
    denominatorLabel: "Total",
    extraColumn: { label: "Contact Range", getValue: (l) => l.contactRange ?? l.contact_range ?? "—" },
  },
  branch_vs_hrd_split: {
    label: "Branch vs. HRD split",
    type: "leads",
    description: "Percentage of first contacts made by Branch (vs. HRD)",
    getValue: (leads) => {
      const { branch: branchCount, hrd } = getBranchVsHrdSplit(leads);
      const total = branchCount + hrd;
      return total ? Math.round((branchCount / total) * 100) : null;
    },
    format: (v) => (v != null ? `${v}% Branch` : "—"),
    getRelevant: (leads) =>
      leads.filter((l) => {
        const by = l.firstContactBy ?? l.first_contact_by;
        return by === "branch" || by === "hrd";
      }),
    numeratorLabel: "Branch",
    numeratorFilter: (l) => (l.firstContactBy ?? l.first_contact_by) === "branch",
    denominatorLabel: "With contact",
    extraColumn: { label: "First Contact By", getValue: (l) => l.firstContactBy ?? l.first_contact_by ?? "—" },
  },
  meeting_prep_comment_rate: {
    label: "Comment rate",
    type: "leads",
    description: "Percentage of Cancelled/Unused leads with reason or notes",
    getValue: (leads) => {
      const actionable = (leads ?? []).filter((l) => l.status === "Cancelled" || l.status === "Unused");
      if (actionable.length === 0) return null;
      const withComments = actionable.filter((l) => l.enrichment?.reason || l.enrichment?.notes);
      return Math.round((withComments.length / actionable.length) * 100);
    },
    format: (v) => (v != null ? `${v}%` : "—"),
    getRelevant: (leads) => (leads ?? []).filter((l) => l.status === "Cancelled" || l.status === "Unused"),
    numeratorLabel: "With comments",
    numeratorFilter: (l) => !!(l.enrichment?.reason || l.enrichment?.notes),
    denominatorLabel: "Cancelled/Unused",
  },
  cancelled_unreviewed: {
    label: "Cancelled Unreviewed",
    type: "leads",
    description: "Cancelled leads not yet archived or with GM directive",
    getValue: (leads) =>
      (leads ?? []).filter((l) => l.status === "Cancelled" && !l.archived && !l.gmDirective).length,
    format: (v) => `${v ?? 0}`,
    getRelevant: (leads) =>
      (leads ?? []).filter((l) => l.status === "Cancelled" && !l.archived && !l.gmDirective),
  },
  unused_overdue: {
    label: "Unused Overdue",
    type: "leads",
    description: "Unused leads open more than 5 days",
    getValue: (leads) =>
      (leads ?? []).filter((l) => l.status === "Unused" && (l.daysOpen ?? 0) > 5).length,
    format: (v) => `${v ?? 0}`,
    getRelevant: (leads) =>
      (leads ?? []).filter((l) => l.status === "Unused" && (l.daysOpen ?? 0) > 5),
    lowerIsBetter: true,
  },
};

function ComparisonCards({ config, currentValue, previousValue, currentRange, previousRange, currentCount, previousCount }) {
  const fmtCurrent = config.format(currentValue);
  const fmtPrevious = config.format(previousValue);

  let relChange = null;
  if (previousValue != null && previousValue !== 0 && currentValue != null) {
    relChange = Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 100);
  }

  const isPositive = config.lowerIsBetter ? relChange < 0 : relChange > 0;
  const isNegative = config.lowerIsBetter ? relChange > 0 : relChange < 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <div className="border-2 border-[var(--hertz-primary)] rounded-lg p-4 bg-[var(--hertz-primary)]/5">
        <p className="text-[10px] font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-1">Current Period</p>
        <p className="text-xs text-[var(--neutral-600)] mb-2">{formatRange(currentRange)}</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-extrabold text-[var(--hertz-black)]">{fmtCurrent}</p>
          {relChange != null && relChange !== 0 && (
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                isPositive ? "bg-[#2E7D32]/15 text-[#2E7D32]" : isNegative ? "bg-[#C62828]/15 text-[#C62828]" : "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
              }`}
            >
              {config.lowerIsBetter
                ? (relChange < 0 ? "↓" : "↑")
                : (relChange > 0 ? "↑" : "↓")}
              {Math.abs(relChange)}%
            </span>
          )}
        </div>
        {config.numeratorLabel && (
          <p className="text-xs text-[var(--neutral-600)] mt-1">
            {config.numeratorLabel}: {currentCount.numerator} / {config.denominatorLabel}: {currentCount.denominator}
          </p>
        )}
      </div>
      <div className="border border-[var(--neutral-200)] rounded-lg p-4 bg-[var(--neutral-50)]">
        <p className="text-[10px] font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-1">Previous Period</p>
        <p className="text-xs text-[var(--neutral-600)] mb-2">{formatRange(previousRange)}</p>
        <p className="text-2xl font-extrabold text-[var(--neutral-500)]">{fmtPrevious}</p>
        {config.numeratorLabel && (
          <p className="text-xs text-[var(--neutral-600)] mt-1">
            {config.numeratorLabel}: {previousCount.numerator} / {config.denominatorLabel}: {previousCount.denominator}
          </p>
        )}
      </div>
    </div>
  );
}

function LeadTable({ leads, config, allLeads }) {
  const showHighlight = !!config.numeratorFilter;
  const extraCol = config.extraColumn;
  const colCount = 7 + (showHighlight ? 1 : 0) + (extraCol ? 1 : 0);
  return (
    <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-[45vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#272425] text-xs text-white font-semibold uppercase tracking-wider">
              {showHighlight && <th className="px-3 py-3 text-center w-[60px]">{config.numeratorLabel}</th>}
              <th className="px-3 py-3 text-left">Customer</th>
              <th className="px-3 py-3 text-center">Confirmation #</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-3 py-3 text-center">Days Open</th>
              <th className="px-3 py-3 text-center">Time to Contact</th>
              {extraCol && <th className="px-3 py-3 text-center">{extraCol.label}</th>}
              <th className="px-3 py-3 text-left">Cancel Reason</th>
              <th className="px-3 py-3 text-left">Comments</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3 py-12 text-center text-[var(--neutral-600)]">
                  No leads in this period
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const isNumerator = showHighlight && config.numeratorFilter(lead);
                return (
                  <tr
                    key={lead.id}
                    className={`border-t border-[var(--neutral-200)] transition-colors ${
                      isNumerator ? "bg-[#2E7D32]/5" : ""
                    }`}
                  >
                    {showHighlight && (
                      <td className="px-3 py-3 text-center">
                        {isNumerator ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2E7D32]/15 text-[#2E7D32]">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--neutral-100)] text-[var(--neutral-400)]">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-3 font-semibold text-[var(--hertz-black)]">{lead.customer ?? "—"}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-[var(--neutral-600)]">{lead.reservationId ?? "—"}</td>
                    <td className="px-3 py-3 text-center"><StatusBadge status={lead.status} /></td>
                    <td className="px-3 py-3 text-center text-[var(--neutral-600)]">{lead.daysOpen ?? "—"}</td>
                    <td className="px-3 py-3 text-center text-[var(--neutral-600)]">{lead.timeToFirstContact ?? "—"}</td>
                    {extraCol && (
                      <td className="px-3 py-3 text-center text-[var(--neutral-600)]">{extraCol.getValue(lead)}</td>
                    )}
                    <td className="px-3 py-3 text-[var(--neutral-600)] max-w-[150px] truncate">{lead.hlesReason ?? "—"}</td>
                    <td className="px-3 py-3 text-[var(--neutral-600)] max-w-[180px] truncate" title={lead.enrichment?.reason ?? lead.enrichment?.notes ?? ""}>
                      {lead.enrichment?.reason ?? lead.enrichment?.notes ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskTable({ tasks, config, allLeads }) {
  const showHighlight = !!config.numeratorFilter;
  return (
    <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-[45vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#272425] text-xs text-white font-semibold uppercase tracking-wider">
              {showHighlight && <th className="px-3 py-3 text-center w-[60px]">{config.numeratorLabel}</th>}
              <th className="px-3 py-3 text-left">Title</th>
              <th className="px-3 py-3 text-left">Lead</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-3 py-3 text-center">Priority</th>
              <th className="px-3 py-3 text-center">Due Date</th>
              <th className="px-3 py-3 text-center">Created By</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={showHighlight ? 7 : 6} className="px-3 py-12 text-center text-[var(--neutral-600)]">
                  No tasks in this period
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isNumerator = showHighlight && config.numeratorFilter(task);
                const leadCustomer = task.lead?.customer ?? getLeadById(allLeads, task.leadId)?.customer ?? "—";
                return (
                  <tr
                    key={task.id}
                    className={`border-t border-[var(--neutral-200)] transition-colors ${
                      isNumerator ? "bg-[#2E7D32]/5" : ""
                    }`}
                  >
                    {showHighlight && (
                      <td className="px-3 py-3 text-center">
                        {isNumerator ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2E7D32]/15 text-[#2E7D32]">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--neutral-100)] text-[var(--neutral-400)]">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-3 font-semibold text-[var(--hertz-black)] max-w-[200px]">
                      <span className="block truncate" title={task.title}>{task.title}</span>
                    </td>
                    <td className="px-3 py-3 text-[var(--neutral-600)] max-w-[150px]">
                      <span className="block truncate" title={leadCustomer}>{leadCustomer}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        task.status === "Done" ? "bg-[#2E7D32]/15 text-[#2E7D32]" :
                        task.status === "In Progress" ? "bg-[var(--hertz-primary)]/25 text-[var(--hertz-black)]" :
                        "bg-[#C62828]/15 text-[#C62828]"
                      }`}>{task.status}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        task.priority === "High" ? "bg-amber-100 text-amber-800" :
                        "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
                      }`}>{task.priority ?? "Medium"}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-[var(--neutral-600)] whitespace-nowrap">{task.dueDate ?? "—"}</td>
                    <td className="px-3 py-3 text-center text-[var(--neutral-600)]">{task.createdBy ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MetricDrilldownModal({ metricKey, onClose, leads, branchTasks, dateRange, comparisonRange, branch }) {
  const [activeTab, setActiveTab] = useState("current");
  const [groupByPrimary, setGroupByPrimary] = useState(null);
  const [groupBySecondary, setGroupBySecondary] = useState(null);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [includeReviewed, setIncludeReviewed] = useState(false);

  const config = METRIC_CONFIG[metricKey];
  if (!config) return null;

  const isLeadMetric = config.type === "leads";

  const currentLeads = useMemo(() => getFilteredLeads(leads, dateRange, branch), [leads, dateRange, branch]);
  const previousLeads = useMemo(() => getFilteredLeads(leads, comparisonRange, branch), [leads, comparisonRange, branch]);

  const currentTasks = useMemo(() => tasksInDateRange(branchTasks, dateRange), [branchTasks, dateRange]);
  const previousTasks = useMemo(() => (comparisonRange ? tasksInDateRange(branchTasks, comparisonRange) : []), [branchTasks, comparisonRange]);

  const currentValue = isLeadMetric ? config.getValue(currentLeads) : config.getValue(null, currentTasks);
  const previousValue = isLeadMetric ? config.getValue(previousLeads) : config.getValue(null, previousTasks);

  const currentDisplayData = isLeadMetric
    ? (config.getRelevant ? config.getRelevant(currentLeads) : currentLeads)
    : (config.getRelevantTasks ? config.getRelevantTasks(currentTasks) : currentTasks);

  const previousDisplayData = isLeadMetric
    ? (config.getRelevant ? config.getRelevant(previousLeads) : previousLeads)
    : (config.getRelevantTasks ? config.getRelevantTasks(previousTasks) : previousTasks);

  const activeData = activeTab === "current" ? currentDisplayData : previousDisplayData;

  const currentCount = config.numeratorFilter
    ? {
        numerator: isLeadMetric
          ? currentLeads.filter(config.numeratorFilter).length
          : currentTasks.filter(config.numeratorFilter).length,
        denominator: isLeadMetric ? currentLeads.length : currentTasks.length,
      }
    : { numerator: 0, denominator: 0 };

  const previousCount = config.numeratorFilter
    ? {
        numerator: isLeadMetric
          ? previousLeads.filter(config.numeratorFilter).length
          : previousTasks.filter(config.numeratorFilter).length,
        denominator: isLeadMetric ? previousLeads.length : previousTasks.length,
      }
    : { numerator: 0, denominator: 0 };

  const showConversionBreakdown = metricKey === "conversion_rate" && isLeadMetric;
  const conversionBreakdown = useMemo(
    () =>
      showConversionBreakdown
        ? getConversionBreakdown(leads ?? [], {
            dateRange: activeTab === "current" ? dateRange : comparisonRange,
            branch,
            groupByPrimary: groupByPrimary || undefined,
            groupBySecondary: groupBySecondary || undefined,
            includeReviewed,
          })
        : { rows: [], zoneBenchmark: null },
    [
      showConversionBreakdown,
      leads,
      activeTab,
      dateRange,
      comparisonRange,
      branch,
      groupByPrimary,
      groupBySecondary,
      includeReviewed,
    ],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--neutral-200)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-[var(--hertz-black)]">{config.label}</h3>
            <p className="text-xs text-[var(--neutral-600)] mt-0.5">{config.description}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--neutral-100)] text-[var(--neutral-600)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-auto flex-1">
          {/* Comparison summary */}
          <ComparisonCards
            config={config}
            currentValue={currentValue}
            previousValue={previousValue}
            currentRange={dateRange}
            previousRange={comparisonRange}
            currentCount={currentCount}
            previousCount={previousCount}
          />

          {/* Conversion breakdown (conversion_rate only) */}
          {showConversionBreakdown && (
            <div className="mb-5">
              <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-3">
                Breakdown by group
              </p>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <GroupBySelector
                  primary={groupByPrimary}
                  secondary={groupBySecondary}
                  onPrimaryChange={(v) => {
                    setGroupByPrimary(v);
                    if (!v) setGroupBySecondary(null);
                  }}
                  onSecondaryChange={setGroupBySecondary}
                />
                <label className="flex items-center gap-2 text-sm text-[var(--neutral-600)]">
                  <input
                    type="checkbox"
                    checked={showBenchmarks}
                    onChange={(e) => setShowBenchmarks(e.target.checked)}
                    className="rounded border-[var(--neutral-300)]"
                  />
                  Show zone benchmarks
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--neutral-600)]">
                  <input
                    type="checkbox"
                    checked={includeReviewed}
                    onChange={(e) => setIncludeReviewed(e.target.checked)}
                    className="rounded border-[var(--neutral-300)]"
                  />
                  Include Reviewed
                </label>
              </div>
              <ConversionBreakdownTable
                rows={conversionBreakdown.rows}
                zoneBenchmark={conversionBreakdown.zoneBenchmark}
                showBenchmarks={showBenchmarks}
                groupByPrimary={groupByPrimary}
              />
            </div>
          )}

          {/* Tab selector */}
          <div className="flex items-center gap-1 mb-4">
            <button
              onClick={() => setActiveTab("current")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "current"
                  ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]"
                  : "bg-[var(--neutral-50)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"
              }`}
            >
              Current Period ({isLeadMetric ? currentDisplayData.length : currentDisplayData.length} {isLeadMetric ? "leads" : "tasks"})
            </button>
            <button
              onClick={() => setActiveTab("previous")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "previous"
                  ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]"
                  : "bg-[var(--neutral-50)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"
              }`}
            >
              Previous Period ({isLeadMetric ? previousDisplayData.length : previousDisplayData.length} {isLeadMetric ? "leads" : "tasks"})
            </button>
          </div>

          {/* Data table */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {isLeadMetric ? (
                <LeadTable leads={activeData} config={config} allLeads={leads} />
              ) : (
                <TaskTable tasks={activeData} config={config} allLeads={leads} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
