/**
 * BM Meeting Prep — Redesigned.
 * Output metrics first (unified cards), then input metrics below.
 * Completion bar = missing lead updates; click to expand and show outstanding leads.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import {
  getDefaultBranchForDemo,
  getLeadsForBranchInRange,
  getDateRangePresets,
  getComparisonDateRange,
  getMeetingPrepQueueLeads,
  getZoneConversionRate,
  getBranchTrailing4WeekConversionRate,
  getPctContactedWithin30Min,
  getBranchVsHrdSplit,
  getMismatchLeadsInRange,
  getMismatchReason,
  getTasksForBranch,
} from "../../selectors/demoSelectors";
import MeetingPrepLeadQueue from "../MeetingPrepLeadQueue";
import MeetingPrepLeadPanel from "./MeetingPrepLeadPanel";
import MetricDrilldownModal from "../MetricDrilldownModal";

const easeOut = [0.4, 0, 0.2, 1];

/** Unified metric card — same structure for output and input metrics. Optional onClick for drilldown. */
function MetricCard({ label, value, subtext, children, className = "", variant = "default", onClick }) {
  const isHighlight = variant === "highlight";
  const isAlert = variant === "alert";
  const isClickable = !!onClick;
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(e)
          : undefined
      }
      className={`border rounded-lg p-5 bg-white shadow-[var(--shadow-sm)] ${
        isAlert
          ? "border-[var(--color-error)]/40 bg-[var(--color-error-light)]"
          : "border-[var(--neutral-200)]"
      } ${isClickable ? "cursor-pointer group transition-[border-color] duration-200 hover:border-[var(--hertz-primary)]/40" : ""} ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p
          className={`text-xs font-bold uppercase tracking-wide ${
            isAlert ? "text-[var(--color-error)]" : "text-[var(--neutral-600)]"
          }`}
        >
          {label}
        </p>
        {isClickable && (
          <svg
            className="w-3.5 h-3.5 text-[var(--neutral-400)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      {children || (
        <>
          <p
            className={`text-2xl font-bold ${
              isHighlight ? "text-[var(--hertz-primary)]" : "text-[var(--hertz-black)]"
            } ${isAlert ? "text-[var(--color-error)]" : ""}`}
          >
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-[var(--neutral-600)] mt-1">{subtext}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function InteractiveMeetingPrep() {
  const { userProfile } = useAuth();
  const { leads, refetchLeads } = useData();
  const branch = userProfile?.branch ?? getDefaultBranchForDemo();

  const [includeRented, setIncludeRented] = useState(false);
  const [panelLead, setPanelLead] = useState(null);
  const [completionExpanded, setCompletionExpanded] = useState(false);
  const [mismatchExpanded, setMismatchExpanded] = useState(false);
  const [drilldownMetric, setDrilldownMetric] = useState(null);
  const [leadsExpanded, setLeadsExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const branchTasks = useMemo(() => getTasksForBranch(branch), [branch]);

  const presets = getDateRangePresets();
  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const dateRange = useMemo(() => {
    const preset = presets.find((p) => p.key === selectedPresetKey);
    return preset ? { start: preset.start, end: preset.end } : null;
  }, [selectedPresetKey, presets]);

  const periodLeads = useMemo(
    () => getLeadsForBranchInRange(leads ?? [], dateRange, branch),
    [leads, dateRange, branch],
  );
  const comparisonRange = useMemo(
    () => getComparisonDateRange(selectedPresetKey, null, null),
    [selectedPresetKey],
  );
  const comparisonLeads = useMemo(
    () => (comparisonRange ? getLeadsForBranchInRange(leads ?? [], comparisonRange, branch) : []),
    [leads, comparisonRange, branch],
  );
  const isReadOnly = selectedPresetKey !== "this_week";

  const queueLeads = useMemo(
    () => getMeetingPrepQueueLeads(periodLeads, { includeRented }),
    [periodLeads, includeRented],
  );

  const DISPLAY_LIMIT = 5;
  const displayLeads = useMemo(
    () => (leadsExpanded ? queueLeads : queueLeads.slice(0, DISPLAY_LIMIT)),
    [queueLeads, leadsExpanded],
  );
  const hasMoreLeads = queueLeads.length > DISPLAY_LIMIT;

  // Leads that need comments (Cancelled + Unused without reason/notes)
  const actionableLeads = useMemo(
    () =>
      (periodLeads ?? []).filter(
        (l) => l.status === "Cancelled" || l.status === "Unused",
      ),
    [periodLeads],
  );
  const leadsWithComments = useMemo(
    () =>
      actionableLeads.filter((l) => l.enrichment?.reason || l.enrichment?.notes),
    [actionableLeads],
  );
  const leadsNeedingUpdates = useMemo(
    () =>
      actionableLeads.filter(
        (l) => !(l.enrichment?.reason || l.enrichment?.notes),
      ),
    [actionableLeads],
  );
  const totalActionable = actionableLeads.length;
  const missingCount = leadsNeedingUpdates.length;
  const completionPct =
    totalActionable > 0
      ? Math.round((leadsWithComments.length / totalActionable) * 100)
      : 100;

  // Data mismatches — HLES/TRANSLOG/BM comments don't align; GM will ask about these
  const mismatchLeads = useMemo(
    () => getMismatchLeadsInRange(leads ?? [], dateRange, branch),
    [leads, dateRange, branch],
  );
  const mismatchCount = mismatchLeads.length;

  // Output metrics
  const totalLeads = periodLeads.length;
  const rentedCount = periodLeads.filter((l) => l.status === "Rented").length;
  const conversionThisPeriod = totalLeads
    ? Math.round((rentedCount / totalLeads) * 100)
    : null;
  const prevConversion = comparisonLeads.length
    ? Math.round(
        (comparisonLeads.filter((l) => l.status === "Rented").length /
          comparisonLeads.length) *
          100,
      )
    : null;
  const conversionTrend =
    prevConversion != null &&
    conversionThisPeriod != null &&
    prevConversion > 0
      ? Math.round(
          ((conversionThisPeriod - prevConversion) / prevConversion) * 100,
        )
      : null;
  const trailing4Week = getBranchTrailing4WeekConversionRate(leads ?? [], branch);
  const zoneRate = getZoneConversionRate(leads ?? [], branch);

  // Input metrics
  const pctWithin30 = getPctContactedWithin30Min(periodLeads);
  const { branch: branchContact, hrd: hrdContact } =
    getBranchVsHrdSplit(periodLeads);
  const branchHrdTotal = branchContact + hrdContact;
  const branchHrdPct = branchHrdTotal
    ? Math.round((branchContact / branchHrdTotal) * 100)
    : null;
  const commentRate =
    totalActionable > 0
      ? Math.round((leadsWithComments.length / totalActionable) * 100)
      : null;

  const handleLeadClick = (lead) => {
    setPanelLead(lead);
    setCompletionExpanded(false);
    setMismatchExpanded(false);
  };

  const closePanel = () => {
    setPanelLead(null);
    refetchLeads?.();
  };

  return (
    <div>
      <AnimatePresence>
        {drilldownMetric && (
          <MetricDrilldownModal
            metricKey={drilldownMetric}
            onClose={() => setDrilldownMetric(null)}
            leads={leads}
            branchTasks={branchTasks}
            dateRange={dateRange}
            comparisonRange={comparisonRange}
            branch={branch}
          />
        )}
      </AnimatePresence>
      <h2 className="text-xl font-semibold text-[var(--hertz-black)] mb-6">
        Meeting Prep
      </h2>

      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-medium text-[var(--hertz-black)]">
          Period
        </label>
        <select
          value={selectedPresetKey}
          onChange={(e) => setSelectedPresetKey(e.target.value)}
          className="border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white min-w-[180px]"
        >
          {presets.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        {isReadOnly && (
          <span className="px-2 py-1 bg-[var(--neutral-100)] text-[var(--neutral-600)] rounded text-xs font-medium">
            Read-only (past period)
          </span>
        )}
      </div>

      {/* Section 1: Summary metrics — output metrics first */}
      <div className="mb-6">
        <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-3">
          Summary
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: easeOut } } : {}}
          >
            <MetricCard
              label="Conversion rate"
              value={conversionThisPeriod != null ? `${conversionThisPeriod}%` : "—"}
              onClick={() => setDrilldownMetric("conversion_rate")}
              subtext={
                <>
                  This period · 4‑wk avg {trailing4Week ?? "—"}% · Zone {zoneRate ?? "—"}%
                  {conversionTrend != null && conversionTrend !== 0 && (
                    <span
                      className={`ml-2 font-medium px-1.5 py-0.5 rounded ${
                        conversionTrend > 0
                          ? "bg-[#2E7D32]/15 text-[#2E7D32]"
                          : "bg-[#C62828]/15 text-[#C62828]"
                      }`}
                    >
                      {conversionTrend > 0 ? "↑" : "↓"}
                      {Math.abs(conversionTrend)}%
                    </span>
                  )}
                </>
              }
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3, ease: easeOut }}
            whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: easeOut } } : {}}
          >
            <MetricCard
              label="Total leads"
              value={totalLeads}
              subtext="Leads in this period"
              onClick={() => setDrilldownMetric("total_leads")}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: easeOut }}
            className="md:col-span-2 lg:col-span-1"
            whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: easeOut } } : {}}
          >
            <MetricCard
              label="Rented"
              value={rentedCount}
              subtext="Converted this period"
              onClick={() => setDrilldownMetric("conversion_rate")}
            />
          </motion.div>
        </div>

        {/* Input metrics — above chart */}
        <div className="mt-6 mb-6">
          <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-3">
            Input metrics
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.3, ease: easeOut }}
              whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: easeOut } } : {}}
            >
              <MetricCard
                label="Contacted within 30 min"
                value={pctWithin30 != null ? `${pctWithin30}%` : "—"}
                subtext="First contact within 30 minutes of lead creation"
                onClick={() => setDrilldownMetric("contacted_within_30_min")}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.3, ease: easeOut }}
              whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: easeOut } } : {}}
            >
              <MetricCard
                label="Comment rate"
                value={commentRate != null ? `${commentRate}%` : "—"}
                subtext={
                  totalActionable > 0
                    ? `${leadsWithComments.length} of ${totalActionable} Cancelled/Unused with comments`
                    : "No Cancelled or Unused leads"
                }
                onClick={() => setDrilldownMetric("meeting_prep_comment_rate")}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.3, ease: easeOut }}
              whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: easeOut } } : {}}
            >
              <MetricCard
                label="Branch vs. HRD split"
                value={branchHrdPct != null ? `${branchHrdPct}% Branch` : "—"}
                subtext={
                  branchHrdTotal > 0
                    ? `${branchContact} Branch · ${hrdContact} HRD`
                    : "No first-contact data"
                }
                onClick={() => setDrilldownMetric("branch_vs_hrd_split")}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Section 3: Outstanding tasks — Lead updates, Data mismatches (under tasks), Overdue */}
      <div className="mb-8">
        <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-3">
          Outstanding tasks
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lead updates completion — hero, clickable */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35, ease: easeOut }}
            className="md:col-span-2"
          >
            <div
              className={`border rounded-lg p-5 shadow-[var(--shadow-sm)] cursor-pointer transition-colors ${
                missingCount > 0
                  ? "border-[var(--hertz-primary)] bg-[var(--hertz-primary-subtle)] animate-hertz-pulse hover:bg-[var(--hertz-primary-subtle)]"
                  : totalActionable > 0
                    ? "border-[var(--neutral-200)] bg-white hover:border-[var(--hertz-primary)] hover:bg-[var(--hertz-primary-subtle)]"
                    : "border-[var(--neutral-200)] bg-white"
              }`}
              onClick={() =>
                totalActionable > 0 && setCompletionExpanded((e) => !e)
              }
              role={totalActionable > 0 ? "button" : undefined}
              tabIndex={totalActionable > 0 ? 0 : undefined}
              onKeyDown={(e) =>
                totalActionable > 0 &&
                (e.key === "Enter" || e.key === " ") &&
                setCompletionExpanded((x) => !x)
              }
              aria-expanded={completionExpanded}
              aria-label={
                missingCount === 0
                  ? "All leads updated"
                  : `Lead updates: ${missingCount} of ${totalActionable} need comments. Click to see list.`
              }
            >
              <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-2">
                Lead updates
              </p>
              <p className="text-sm text-[var(--neutral-600)] mb-3">
                <span className="font-medium text-[var(--hertz-black)]">Why:</span> The GM will ask about each Cancelled and Unused lead in the Weekly Compliance meeting.{" "}
                <span className="font-medium text-[var(--hertz-black)]">What to do:</span> Add a reason or notes for each lead so they know what happened and what&apos;s next.
              </p>
              {totalActionable === 0 ? (
                <div className="flex items-center gap-3">
                  <span
                    className="text-2xl text-[var(--color-success)]"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--color-success)]">
                      Nothing to update
                    </p>
                    <p className="text-sm text-[var(--neutral-600)]">
                      No Cancelled or Unused leads in this period.
                    </p>
                  </div>
                </div>
              ) : missingCount === 0 ? (
                <div className="flex items-center gap-3">
                  <span
                    className="text-2xl text-[var(--color-success)]"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--color-success)]">
                      All caught up
                    </p>
                    <p className="text-sm text-[var(--neutral-600)]">
                      All {totalActionable} leads have comments.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold text-[var(--hertz-black)]">
                      {missingCount} of {totalActionable} need updates
                    </p>
                    <span className="text-sm font-medium text-[var(--neutral-600)]">
                      {completionPct}% complete
                    </span>
                  </div>
                  <div className="h-3 bg-[var(--neutral-200)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 0.5, ease: easeOut }}
                      className="h-full bg-[var(--hertz-primary)] rounded-full"
                    />
                  </div>
                  {totalActionable > 0 && (
                    <p className="text-xs text-[var(--neutral-500)] mt-2 flex items-center gap-1.5">
                      <span
                        className={`inline-block transition-transform ${completionExpanded ? "rotate-180" : ""}`}
                        aria-hidden
                      >
                        ▼
                      </span>
                      {completionExpanded ? "Click to collapse" : "Click to see which leads need updates and what to do for each"}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Expanded list of leads needing updates */}
            <AnimatePresence>
              {completionExpanded && leadsNeedingUpdates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 border border-[var(--neutral-200)] rounded-lg bg-[var(--neutral-50)] p-4">
                    <p className="text-sm font-semibold text-[var(--hertz-black)] mb-3">
                      {missingCount} lead{missingCount !== 1 ? "s" : ""} need updates — click each to add your comments:
                    </p>
                    <ul className="space-y-3">
                      {leadsNeedingUpdates.map((lead) => {
                        const isCancelled = lead.status === "Cancelled";
                        const reasonText = isCancelled
                          ? "The GM will ask why this lead didn't convert."
                          : "The GM will ask what happened and when to follow up.";
                        const actionText = isCancelled
                          ? "Add cancellation reason, next action, and optional notes."
                          : "Add next action, follow-up date, and optional notes.";
                        return (
                          <li key={lead.id}>
                            <button
                              type="button"
                              onClick={() => handleLeadClick(lead)}
                              className="w-full text-left px-4 py-3 rounded-md bg-white border border-[var(--neutral-200)] hover:border-[var(--hertz-primary)] hover:bg-[var(--hertz-primary-subtle)] transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-medium text-[var(--hertz-black)]">
                                  {lead.customer}
                                </span>
                                <span className="text-xs text-[var(--neutral-600)] font-mono">
                                  {lead.reservationId}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-[var(--hertz-black)] border border-amber-200 shrink-0">
                                  {lead.status}
                                </span>
                              </div>
                              <div className="text-xs text-[var(--neutral-600)] space-y-0.5">
                                <p><span className="font-medium text-[var(--hertz-black)]">Why:</span> {reasonText}</p>
                                <p><span className="font-medium text-[var(--hertz-black)]">Action:</span> {actionText}</p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-xs text-[var(--neutral-500)] mt-3">
                      Click a lead to open it and add your comments.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Data mismatches — address before GM asks; same pulse/highlight as lead updates; disappears when resolved */}
          <AnimatePresence>
            {mismatchCount > 0 && (
              <motion.div
                key="data-mismatches"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: 0.1, duration: 0.35, ease: easeOut }}
                className="md:col-span-2"
              >
              <div
                className="border rounded-lg p-5 shadow-[var(--shadow-sm)] cursor-pointer transition-colors border-[var(--hertz-primary)] bg-[var(--hertz-primary-subtle)] animate-hertz-pulse hover:bg-[var(--hertz-primary-subtle)]"
                onClick={() => setMismatchExpanded((e) => !e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && setMismatchExpanded((x) => !x)
                }
                aria-expanded={mismatchExpanded}
                aria-label={`Data mismatches: ${mismatchCount} lead${mismatchCount !== 1 ? "s" : ""} need review. Click to see list.`}
              >
                <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-2">
                  Data mismatches
                </p>
                <p className="text-sm text-[var(--neutral-600)] mb-3">
                  HLES, TRANSLOG, and your comments don&apos;t align. The GM will ask about these — add clarifying notes before the meeting.
                </p>
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-[var(--hertz-black)]">
                    {mismatchCount} lead{mismatchCount !== 1 ? "s" : ""} need{mismatchCount === 1 ? "s" : ""} review
                  </p>
                  <span className="text-[var(--hertz-primary)]" aria-hidden>⚠</span>
                </div>
                <p className="text-xs text-[var(--neutral-500)] mt-2">
                  Click to see which leads have mismatches
                </p>
              </div>

              <AnimatePresence>
                {mismatchExpanded && mismatchLeads.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 border border-[var(--neutral-200)] rounded-lg bg-[var(--neutral-50)] p-4">
                      <p className="text-sm font-semibold text-[var(--hertz-black)] mb-3">
                        {mismatchCount} lead{mismatchCount !== 1 ? "s" : ""} with data mismatches — add clarifying comments:
                      </p>
                      <ul className="space-y-2">
                        {mismatchLeads.map((lead) => (
                          <li key={lead.id}>
                            <button
                              type="button"
                              onClick={() => handleLeadClick(lead)}
                              className="w-full text-left px-3 py-2 rounded-md bg-white border border-[var(--neutral-200)] hover:border-[var(--hertz-primary)] hover:bg-[var(--hertz-primary-subtle)] transition-colors flex items-center justify-between gap-2"
                            >
                              <span className="font-medium text-[var(--hertz-black)]">
                                {lead.customer}
                              </span>
                              <span className="text-xs text-[var(--neutral-600)] font-mono">
                                {lead.reservationId}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                Mismatch
                              </span>
                            </button>
                            {getMismatchReason(lead) && (
                              <p className="text-xs text-[var(--neutral-600)] mt-1 ml-3">
                                {getMismatchReason(lead)}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-[var(--neutral-500)] mt-3">
                        Click a lead to open it and add clarifying comments.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Section 3: Leads this week */}
      <div>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <h3 className="text-lg font-semibold text-[var(--hertz-black)]">
            Leads this week
          </h3>
          <label className="flex items-center gap-2 text-sm text-[var(--neutral-600)]">
            <input
              type="checkbox"
              checked={includeRented}
              onChange={(e) => setIncludeRented(e.target.checked)}
              className="rounded border-[var(--neutral-300)]"
            />
            Include Rented
          </label>
        </div>
        {queueLeads.length === 0 ? (
          <div className="border border-[var(--neutral-200)] rounded-lg p-8 text-center bg-white">
            <p className="text-[var(--hertz-black)] font-semibold">No leads</p>
            <p className="text-sm text-[var(--neutral-600)] mt-1">
              {periodLeads.length === 0
                ? "No leads for your branch."
                : "No Cancelled or Unused leads. Try including Rented."}
            </p>
          </div>
        ) : (
          <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <MeetingPrepLeadQueue
                leads={displayLeads}
                onLeadClick={handleLeadClick}
                isReadOnly={isReadOnly}
                embedded
              />
            </div>
            {(hasMoreLeads || leadsExpanded) && (
              <motion.button
                type="button"
                whileHover={!reduceMotion ? { scale: 1.01 } : {}}
                whileTap={!reduceMotion ? { scale: 0.99 } : {}}
                onClick={() => setLeadsExpanded(!leadsExpanded)}
                className="w-full py-3 text-sm font-medium text-[var(--hertz-black)] bg-[var(--neutral-100)] hover:bg-[var(--neutral-200)] transition-colors border-t border-[var(--neutral-200)] flex-shrink-0"
              >
                {leadsExpanded ? "Show less" : `View all (${queueLeads.length} leads)`}
              </motion.button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {panelLead && (
          <MeetingPrepLeadPanel
            key={panelLead.id}
            lead={panelLead}
            isReadOnly={isReadOnly}
            onClose={closePanel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
