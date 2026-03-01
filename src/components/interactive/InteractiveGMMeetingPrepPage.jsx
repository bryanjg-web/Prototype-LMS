import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useData } from "../../context/DataContext";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../BackButton";
import {
  getGMDashboardStats,
  getGMMeetingPrepData,
  getGMLeads,
  getTasksForGMBranches,
  getGMTasksProgress,
  getDateRangePresets,
  getComparisonDateRange,
  getLeadById,
  getNextComplianceMeetingDate,
  getLeadsWithOutstandingItemsForBranch,
  getUnreachableLeadsStats,
  getWinsLearningsForGM,
  relChange,
} from "../../selectors/demoSelectors";
import StatusBadge from "../StatusBadge";
import MetricDrilldownModal from "../MetricDrilldownModal";
import ThreeColumnReview from "../ThreeColumnReview";
import BranchComplianceDetailPane from "./BranchComplianceDetailPane";
import GMPresentationMode from "./GMPresentationMode";

const easeOut = [0.4, 0, 0.2, 1];

/** Color code modules by progress %: 0-50% red, 50-99% yellow, 100% green */
function getProgressModuleColors(progressPct) {
  if (progressPct >= 100) return { bg: "bg-emerald-50", border: "border-emerald-200", bar: "var(--color-success)" };
  if (progressPct >= 50) return { bg: "bg-amber-50", border: "border-amber-200", bar: "var(--hertz-primary)" };
  return { bg: "bg-red-50", border: "border-red-200", bar: "#C62828" };
}

const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: easeOut },
});

/** Metric card — BM-style design: white bg, border, shadow. Matches InteractiveMeetingPrep. */
function MetricCard({ label, value, subtext, onClick, relChange: relChangeVal, showChangeTag }) {
  const isClickable = !!onClick;
  const reduceMotion = useReducedMotion();
  const Wrapper = isClickable ? motion.div : "div";
  return (
    <Wrapper
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick(e) : undefined}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOut }}
      whileHover={isClickable && !reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: easeOut } } : undefined}
      className={`border rounded-lg p-5 bg-white shadow-[var(--shadow-sm)] border-[var(--neutral-200)] ${isClickable ? "cursor-pointer group transition-all duration-200 hover:ring-2 hover:ring-[var(--hertz-primary)]/50" : ""}`}
      title={isClickable ? "Click to view underlying data and what's driving changes" : undefined}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--neutral-600)]">{label}</p>
        {isClickable && (
          <svg className="w-3.5 h-3.5 text-[var(--neutral-400)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-2xl font-bold text-[var(--hertz-black)]">{value}</p>
        {showChangeTag && relChangeVal != null && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              relChangeVal > 0 ? "bg-[#2E7D32]/15 text-[#2E7D32]" : relChangeVal < 0 ? "bg-[#C62828]/15 text-[#C62828]" : "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
            }`}
          >
            {relChangeVal > 0 ? "↑" : relChangeVal < 0 ? "↓" : "—"}
            {relChangeVal !== 0 ? `${Math.abs(relChangeVal)}%` : ""}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-[var(--neutral-600)] mt-1">{subtext}</p>}
    </Wrapper>
  );
}

function formatDueDate(dueStr) {
  if (!dueStr) return "—";
  const d = new Date(dueStr + "T23:59:59");
  const now = new Date("2026-02-22T09:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.ceil((dueDay - today) / 86400000);
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InteractiveGMMeetingPrepPage() {
  const { leads, createComplianceTasksForBranch, winsLearnings, useSupabase } = useData();
  const { navigateTo, selectTask, selectLead } = useApp();
  const { userProfile } = useAuth();
  const reduceMotion = useReducedMotion();
  const presets = useMemo(() => getDateRangePresets(), []);

  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const [branchComplianceExpanded, setBranchComplianceExpanded] = useState(false);
  const [selectedBranchForDetail, setSelectedBranchForDetail] = useState(null);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [leadsExpanded, setLeadsExpanded] = useState(false);
  const [unreachableExpanded, setUnreachableExpanded] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [drilldownMetric, setDrilldownMetric] = useState(null);
  const [directive, setDirective] = useState("");
  const [directiveSaved, setDirectiveSaved] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [presentationSnapshot, setPresentationSnapshot] = useState(null);
  const panelRef = useRef(null);

  const currentPreset = presets.find((p) => p.key === selectedPresetKey);
  const dateRange = currentPreset ? { start: currentPreset.start, end: currentPreset.end } : null;
  const comparisonRange = useMemo(() => getComparisonDateRange(selectedPresetKey), [selectedPresetKey]);

  const stats = useMemo(() => getGMDashboardStats(leads, dateRange), [leads, dateRange]);
  const prevStats = useMemo(() => (comparisonRange ? getGMDashboardStats(leads, comparisonRange) : null), [leads, comparisonRange]);
  const prevUnreachable = useMemo(() => (comparisonRange ? getUnreachableLeadsStats(leads, comparisonRange) : null), [leads, comparisonRange]);
  const unreachableStats = useMemo(() => getUnreachableLeadsStats(leads, dateRange), [leads, dateRange]);
  const meetingPrepData = useMemo(() => getGMMeetingPrepData(leads, dateRange), [leads, dateRange]);
  const openTasks = useMemo(() => getTasksForGMBranches(null, "D. Williams"), []);
  const tasksProgress = useMemo(() => getGMTasksProgress(null, "D. Williams"), []);
  const leadsToReview = useMemo(() => getGMLeads(leads, dateRange, {}), [leads, dateRange]);
  const leadsReviewed = useMemo(() => leadsToReview.filter((l) => l.gmDirective).length, [leadsToReview]);
  const leadsProgressPct = leadsToReview.length > 0 ? Math.round((leadsReviewed / leadsToReview.length) * 100) : 100;
  const { dateStr: meetingDateStr, daysLeft, date: meetingDate } = useMemo(() => getNextComplianceMeetingDate(), []);
  const meetingDueDateStr = meetingDate ? meetingDate.toISOString().slice(0, 10) : null;

  const selectedLead = selectedLeadId ? getLeadById(leads, selectedLeadId) : null;
  const gmName = userProfile?.name ?? "D. Williams";
  const winsLearningsForGM = useMemo(() => getWinsLearningsForGM(winsLearnings ?? [], gmName), [winsLearnings, gmName]);

  // Freeze data snapshot when opening presentation so it can't change mid-meeting
  const handleOpenPresentation = useCallback(() => {
    setPresentationSnapshot({
      frozenLeads: [...leads],
      frozenWinsLearnings: [...(winsLearnings ?? [])],
      dateRange,
      compRange: comparisonRange,
      meetingDateStr,
      gmName,
    });
    setShowPresentation(true);
  }, [leads, winsLearnings, dateRange, comparisonRange, meetingDateStr, gmName]);

  useEffect(() => {
    if (selectedLead && panelRef.current) {
      panelRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedLeadId]);

  const handleSaveDirective = () => {
    setDirectiveSaved(true);
    setTimeout(() => setDirectiveSaved(false), 2000);
  };

  const handleViewTask = (taskId) => {
    selectTask(taskId);
    navigateTo("gm-task-detail");
  };

  const handleViewLead = (leadId) => {
    selectLead(leadId);
    navigateTo("gm-lead-detail");
  };

  return (
    <div className="max-w-6xl">
      {/* Fullscreen presentation overlay — rendered above everything */}
      <AnimatePresence>
        {showPresentation && presentationSnapshot && (
          <GMPresentationMode
            {...presentationSnapshot}
            onClose={() => setShowPresentation(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drilldownMetric && (
          <MetricDrilldownModal
            metricKey={drilldownMetric}
            onClose={() => setDrilldownMetric(null)}
            leads={leads}
            branchTasks={[]}
            dateRange={dateRange}
            comparisonRange={comparisonRange}
            branch={null}
          />
        )}
      </AnimatePresence>
      {/* Header — GM chase-up framing */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <BackButton onClick={() => navigateTo("gm-todos")} label="Back to Work" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-[var(--hertz-black)] tracking-tight mb-1">
              Meeting Prep — Chase Up
            </h1>
            <p className="text-sm text-[var(--neutral-600)]">
              Review outstanding tasks assigned to your team and follow up before the Thursday compliance meeting.
              Weekly Compliance Meeting: {meetingDateStr}
              {daysLeft >= 0 && (
                <span className="font-semibold text-[var(--hertz-black)]">
                  — {daysLeft === 0 ? "today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                </span>
              )}
            </p>
          </div>
          {/* Present button — opens fullscreen branded slide deck */}
          <motion.button
            onClick={handleOpenPresentation}
            whileHover={!reduceMotion ? { scale: 1.03 } : {}}
            whileTap={!reduceMotion ? { scale: 0.97 } : {}}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-[var(--hertz-black)] text-[var(--hertz-primary)] border border-[var(--hertz-black)] hover:bg-[var(--hertz-primary)] hover:text-[var(--hertz-black)] transition-all duration-200 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            Present
          </motion.button>
        </div>
      </motion.div>

      {/* Period filter — matches BM meeting prep */}
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
        {selectedPresetKey !== "this_week" && (
          <span className="px-2 py-1 bg-[var(--neutral-100)] text-[var(--neutral-600)] rounded text-xs font-medium">
            Read-only (past period)
          </span>
        )}
      </div>

      {/* At a glance — metrics for the meeting (top of view) */}
      <motion.div {...cardAnim(0, reduceMotion)} className="mb-6">
        <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-3">
          At a Glance for the Meeting
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard label="Conversion Rate" value={`${stats.conversionRate}%`} onClick={() => setDrilldownMetric("conversion_rate")} relChange={comparisonRange ? relChange(stats.conversionRate, prevStats?.conversionRate) : null} showChangeTag={!!comparisonRange} />
          <MetricCard label="Contacted < 30 min" value={`${stats.pctWithin30}%`} onClick={() => setDrilldownMetric("contacted_within_30_min")} relChange={comparisonRange ? relChange(stats.pctWithin30, prevStats?.pctWithin30) : null} showChangeTag={!!comparisonRange} />
          <MetricCard label="Comment Compliance" value={`${stats.commentCompliance}%`} onClick={() => setDrilldownMetric("comment_rate")} relChange={comparisonRange ? relChange(stats.commentCompliance, prevStats?.commentCompliance) : null} showChangeTag={!!comparisonRange} />
          <MetricCard label="Branch Contact %" value={`${stats.branchPct}%`} onClick={() => setDrilldownMetric("branch_vs_hrd_split")} relChange={comparisonRange ? relChange(stats.branchPct, prevStats?.branchPct) : null} showChangeTag={!!comparisonRange} />
          {/* Unreachable leads tile — no contact attempt at all; high-urgency signal */}
          <MetricCard
            label="No Contact Attempt"
            value={unreachableStats.count}
            subtext={unreachableStats.total > 0 ? `${unreachableStats.pct}% of cancelled/unused` : "No cancelled or unused leads"}
            relChange={comparisonRange && prevUnreachable != null ? relChange(unreachableStats.count, prevUnreachable.count) : null}
            showChangeTag={!!comparisonRange}
          />
        </div>
      </motion.div>

      {/* 1. Leads needing review — first */}
      <motion.div {...cardAnim(1, reduceMotion)} className="mb-6">
        <h3 className="text-sm font-bold text-[var(--hertz-black)] uppercase tracking-wider mb-3">
          Leads Needing Review
        </h3>
        {(() => {
          const colors = getProgressModuleColors(leadsProgressPct);
          return (
            <>
              <button
                type="button"
                onClick={() => setLeadsExpanded((prev) => !prev)}
                className={`w-full rounded-lg px-5 py-4 text-left transition-colors cursor-pointer flex items-center justify-between gap-4 ${colors.bg} border ${colors.border} hover:opacity-90`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--hertz-black)]">
                    {leadsToReview.length === 0
                      ? "No leads to review"
                      : `${leadsReviewed} of ${leadsToReview.length} leads reviewed`}
                  </p>
                  <p className="text-xs text-[var(--neutral-600)] mt-0.5">
                    {leadsToReview.length === 0
                      ? "No cancelled or unused leads in this period."
                      : leadsToReview.length - leadsReviewed > 0
                        ? `${leadsToReview.length - leadsReviewed} cancelled and unused lead${leadsToReview.length - leadsReviewed !== 1 ? "s" : ""} — add directives or review before the meeting`
                        : "All leads reviewed — no outstanding items."}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-32 h-2 bg-[var(--neutral-200)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${leadsProgressPct}%`,
                        backgroundColor: colors.bar,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--hertz-black)] w-8">
                    {leadsProgressPct}%
                  </span>
                  <motion.svg
                    className="w-5 h-5 text-[var(--hertz-black)] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: leadsExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </div>
              </button>

              <AnimatePresence>
                {leadsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex gap-4">
                      <div className={`border border-[var(--neutral-200)] rounded-lg overflow-hidden bg-white ${selectedLead ? "w-1/2" : "w-full"} transition-all duration-300`}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
                              <th className="px-4 py-3 text-left">Customer</th>
                              <th className="px-4 py-3 text-left">Status</th>
                              <th className="px-4 py-3 text-left">Branch</th>
                              <th className="px-4 py-3 text-center">Days Open</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leadsToReview.length === 0 ? (
                              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--neutral-500)]">No leads to review.</td></tr>
                            ) : (
                              leadsToReview.slice(0, 20).map((lead) => (
                                <tr
                                  key={lead.id}
                                  onClick={() => { setSelectedLeadId(lead.id); setDirective(""); setDirectiveSaved(false); }}
                                  className={`border-t border-[var(--neutral-100)] cursor-pointer transition-colors ${selectedLeadId === lead.id ? "bg-[var(--hertz-primary-subtle)]" : "hover:bg-[var(--neutral-50)]"}`}
                                >
                                  <td className="px-4 py-3 font-semibold text-[var(--hertz-black)]">{lead.customer}</td>
                                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                                  <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.branch}</td>
                                  <td className="px-4 py-3 text-center text-[var(--neutral-600)]">{lead.daysOpen ?? "—"}d</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                        {leadsToReview.length > 20 && (
                          <button
                            onClick={() => navigateTo("gm-lead-review")}
                            className="w-full py-3 text-center text-sm font-medium text-[var(--neutral-600)] bg-[var(--neutral-50)] hover:bg-[var(--neutral-100)] transition-colors cursor-pointer border-t border-[var(--neutral-200)]"
                          >
                            View all {leadsToReview.length} leads
                          </button>
                        )}
                      </div>

                      <AnimatePresence>
                        {selectedLead && (
                          <motion.div
                            ref={panelRef}
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "50%", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: easeOut }}
                            className="border border-[var(--neutral-200)] rounded-lg bg-white overflow-y-auto"
                            style={{ maxHeight: 600 }}
                          >
                            <div className="px-5 py-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-bold text-[var(--hertz-black)]">{selectedLead.customer}</h4>
                                <button
                                  onClick={() => setSelectedLeadId(null)}
                                  className="text-[var(--neutral-400)] hover:text-[var(--hertz-black)] transition-colors cursor-pointer"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              <ThreeColumnReview lead={selectedLead} showMismatchWarning={!!selectedLead.mismatch} />

                              <div className="mt-4 pt-4 border-t border-[var(--neutral-200)]">
                                <label className="text-xs font-bold text-[var(--hertz-black)] uppercase tracking-wider">GM Directive</label>
                                <textarea
                                  value={directive}
                                  onChange={(e) => setDirective(e.target.value)}
                                  placeholder="Add a directive for this lead..."
                                  className="w-full mt-2 px-3 py-2 border border-[var(--neutral-200)] rounded-lg text-sm resize-none focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)]"
                                  rows={3}
                                />
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={handleSaveDirective}
                                    disabled={!directive.trim()}
                                    className="px-4 py-1.5 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-sm font-medium hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Send Directive
                                  </button>
                                  {directiveSaved && (
                                    <span className="text-xs text-[var(--color-success)] font-medium">Saved</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}
      </motion.div>

      {/* 2. Branch compliance — second */}
      <motion.div {...cardAnim(2, reduceMotion)} className="mb-6">
        <h3 className="text-sm font-bold text-[var(--hertz-black)] uppercase tracking-wider mb-3">
          Branch Compliance — Who Needs Follow Up
        </h3>
        {(() => {
          const branchProgressPct = meetingPrepData.totalBranches > 0 ? Math.round((meetingPrepData.branchesComplete / meetingPrepData.totalBranches) * 100) : 100;
          const colors = getProgressModuleColors(branchProgressPct);
          return (
            <button
              type="button"
              onClick={() => setBranchComplianceExpanded((prev) => !prev)}
              className={`w-full rounded-lg px-5 py-4 text-left transition-colors cursor-pointer flex items-center justify-between gap-4 ${colors.bg} border ${colors.border} hover:opacity-90`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--hertz-black)]">
                  {meetingPrepData.branchesComplete} of {meetingPrepData.totalBranches} branches are fully compliant
                </p>
                <p className="text-xs text-[var(--neutral-600)] mt-0.5">
                  {meetingPrepData.totalOutstanding > 0
                    ? `${meetingPrepData.totalOutstanding} outstanding item${meetingPrepData.totalOutstanding !== 1 ? "s" : ""} across ${meetingPrepData.totalBranches - meetingPrepData.branchesComplete} branch${meetingPrepData.totalBranches - meetingPrepData.branchesComplete !== 1 ? "es" : ""} — chase these before the meeting`
                    : "All branches are up to date — no outstanding items."}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-32 h-2 bg-[var(--neutral-200)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${branchProgressPct}%`,
                      backgroundColor: colors.bar,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-[var(--hertz-black)] w-8">
                  {branchProgressPct}%
                </span>
                <motion.svg
                  className="w-5 h-5 text-[var(--hertz-black)] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ rotate: branchComplianceExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </div>
            </button>
          );
        })()}

        {/* Expandable per-branch breakdown — revealed when module is clicked */}
        <AnimatePresence>
          {branchComplianceExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="overflow-hidden"
            >
              <div className="mt-3 border border-[var(--neutral-200)] rounded-lg overflow-hidden bg-white">
                <p className="px-4 py-2 text-xs text-[var(--neutral-500)] bg-[var(--neutral-50)] border-b border-[var(--neutral-200)]">
                  Click a row to view line-level lead data for each metric
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Branch</th>
                      <th className="px-4 py-3 text-left">BM</th>
                      <th className="px-4 py-3 text-center">Outstanding</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetingPrepData.branchChecklist.map((row) => (
                      <BranchChecklistRow
                        key={row.branch}
                        row={row}
                        leads={leads}
                        dateRange={dateRange}
                        meetingDueDateStr={meetingDueDateStr}
                        gmName={userProfile?.displayName ?? "D. Williams"}
                        gmUserId={userProfile?.id ?? null}
                        useSupabase={useSupabase}
                        createComplianceTasksForBranch={createComplianceTasksForBranch}
                        onRowClick={() => setSelectedBranchForDetail(row)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 3. Tasks to chase — last */}
      <motion.div {...cardAnim(3, reduceMotion)}>
        <h3 className="text-sm font-bold text-[var(--hertz-black)] uppercase tracking-wider mb-3">
          Tasks to Chase
        </h3>
        {(() => {
          const colors = getProgressModuleColors(tasksProgress.progressPct);
          return (
            <>
              <button
                type="button"
                onClick={() => setTasksExpanded((prev) => !prev)}
                className={`w-full rounded-lg px-5 py-4 text-left transition-colors cursor-pointer flex items-center justify-between gap-4 ${colors.bg} border ${colors.border} hover:opacity-90`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--hertz-black)]">
                    {tasksProgress.completed} of {tasksProgress.total} tasks complete
                  </p>
                  <p className="text-xs text-[var(--neutral-600)] mt-0.5">
                    {openTasks.length > 0
                      ? `${openTasks.length} open task${openTasks.length !== 1 ? "s" : ""} across your branches — chase these before the meeting`
                      : "All tasks assigned to your team are complete."}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-32 h-2 bg-[var(--neutral-200)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${tasksProgress.progressPct}%`,
                        backgroundColor: colors.bar,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--hertz-black)] w-8">
                    {tasksProgress.progressPct}%
                  </span>
                  <motion.svg
                    className="w-5 h-5 text-[var(--hertz-black)] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: tasksExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </div>
              </button>

              <AnimatePresence>
                {tasksExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 border border-[var(--neutral-200)] rounded-lg overflow-hidden bg-white">
                      {openTasks.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                          <p className="text-[var(--neutral-600)]">No open tasks to chase. All tasks assigned to your team are complete.</p>
                        </div>
                      ) : (
                        <>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
                                <th className="px-4 py-3 text-left">Follow up with</th>
                                <th className="px-4 py-3 text-left">Task</th>
                                <th className="px-4 py-3 text-left">Lead</th>
                                <th className="px-4 py-3 text-center">Due</th>
                                <th className="px-4 py-3 text-center">Priority</th>
                                <th className="px-4 py-3 text-center w-10"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {openTasks.slice(0, 15).map((task) => {
                                const lead = task.leadId ? getLeadById(leads, task.leadId) : null;
                                const overdue = task.dueDate && new Date(task.dueDate + "T23:59:59") < new Date("2026-02-22T09:00:00");
                                return (
                                  <tr
                                    key={task.id}
                                    onClick={() => handleViewTask(task.id)}
                                    className={`border-t border-[var(--neutral-100)] cursor-pointer transition-colors hover:bg-[var(--neutral-50)] ${
                                      overdue ? "bg-red-50/50" : ""
                                    }`}
                                  >
                                    <td className="px-4 py-3">
                                      <div className="font-semibold text-[var(--hertz-black)]">{task.assignedToName ?? "—"}</div>
                                      <div className="text-xs text-[var(--neutral-500)]">{task.assignedBranch}</div>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--neutral-700)]">{task.title}</td>
                                    <td className="px-4 py-3 text-[var(--neutral-600)]">
                                      {lead ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewLead(lead.id);
                                          }}
                                          className="text-left hover:underline font-medium text-[var(--hertz-black)]"
                                        >
                                          {lead.customer}
                                        </button>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={overdue ? "text-red-600 font-semibold" : "text-[var(--neutral-600)]"}>
                                        {formatDueDate(task.dueDate)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                          task.priority === "High"
                                            ? "bg-amber-100 text-amber-800"
                                            : task.priority === "Medium"
                                              ? "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
                                              : "bg-[var(--neutral-100)] text-[var(--neutral-500)]"
                                        }`}
                                      >
                                        {task.priority}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="text-[var(--neutral-400)]">
                                        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {openTasks.length > 15 && (
                            <p className="px-4 py-2 text-xs text-[var(--neutral-500)] border-t border-[var(--neutral-100)]">
                              Showing 15 of {openTasks.length} — click a row to view task details
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}
      </motion.div>

      {/* 4. Unreachable leads — cancelled/unused with zero contact attempt (David's Bucket 3) */}
      <motion.div {...cardAnim(4, reduceMotion)} className="mt-6">
        <h3 className="text-sm font-bold text-[var(--hertz-black)] uppercase tracking-wider mb-3">
          Leads With No Contact Attempt
        </h3>
        {(() => {
          const hasLeads = unreachableStats.count > 0;
          // This is an alert state — even 1 lead here is a problem worth surfacing
          const alertColors = hasLeads
            ? { bg: "bg-red-50", border: "border-red-200" }
            : { bg: "bg-emerald-50", border: "border-emerald-200" };
          return (
            <>
              <button
                type="button"
                onClick={() => setUnreachableExpanded((prev) => !prev)}
                className={`w-full rounded-lg px-5 py-4 text-left transition-colors cursor-pointer flex items-center justify-between gap-4 ${alertColors.bg} border ${alertColors.border} hover:opacity-90`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--hertz-black)]">
                    {hasLeads
                      ? `${unreachableStats.count} lead${unreachableStats.count !== 1 ? "s" : ""} — no contact ever attempted`
                      : "No unreachable leads — all cancelled/unused leads had at least one contact attempt"}
                  </p>
                  <p className="text-xs text-[var(--neutral-600)] mt-0.5">
                    {hasLeads
                      ? `${unreachableStats.pct}% of cancelled/unused leads — these slipped through without a single call, email, or SMS from branch or HRD`
                      : "Good news — every lead in this period received at least one contact attempt."}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {hasLeads && (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#C62828]/15 text-[#C62828] text-xs font-bold">
                      {unreachableStats.count}
                    </span>
                  )}
                  <motion.svg
                    className="w-5 h-5 text-[var(--hertz-black)] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: unreachableExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </div>
              </button>

              <AnimatePresence>
                {unreachableExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 border border-[var(--neutral-200)] rounded-lg overflow-hidden bg-white">
                      {!hasLeads ? (
                        <div className="px-6 py-8 text-center text-[var(--neutral-500)]">
                          No unreachable leads in this period.
                        </div>
                      ) : (
                        <>
                          {/* Per-branch summary header */}
                          {unreachableStats.branchBreakdown.length > 1 && (
                            <div className="px-4 py-3 bg-[var(--neutral-50)] border-b border-[var(--neutral-200)] flex flex-wrap gap-3">
                              {unreachableStats.branchBreakdown.map(({ branch, count }) => (
                                <span
                                  key={branch}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#C62828]/10 text-[#C62828]"
                                >
                                  {branch}
                                  <span className="font-bold">{count}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
                                <th className="px-4 py-3 text-left">Customer</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Branch</th>
                                <th className="px-4 py-3 text-left">BM</th>
                                <th className="px-4 py-3 text-center">Days Open</th>
                                <th className="px-4 py-3 text-left">HLES Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {unreachableStats.leads.map((lead) => (
                                <tr
                                  key={lead.id}
                                  onClick={() => handleViewLead(lead.id)}
                                  className="border-t border-[var(--neutral-100)] cursor-pointer transition-colors hover:bg-[var(--neutral-50)] group"
                                >
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-[var(--hertz-black)]">{lead.customer}</div>
                                    {lead.reservationId && (
                                      <div className="text-xs text-[var(--neutral-500)]">{lead.reservationId}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                                  <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.branch}</td>
                                  <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.bmName ?? "—"}</td>
                                  <td className="px-4 py-3 text-center text-[var(--neutral-600)]">
                                    {lead.daysOpen != null ? `${lead.daysOpen}d` : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--neutral-500)] text-xs max-w-[200px] truncate" title={lead.hlesReason ?? ""}>
                                    {lead.hlesReason ?? "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="px-4 py-2 text-xs text-[var(--neutral-500)] border-t border-[var(--neutral-100)] flex items-center justify-between">
                            <span>Click a row to view the full lead detail</span>
                            <span>{unreachableStats.count} lead{unreachableStats.count !== 1 ? "s" : ""}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}
      </motion.div>

      {/* Section: Wins & Learnings — BM submissions displayed for GM review */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-6"
      >
        <div className="border border-[var(--neutral-200)] rounded-xl bg-white shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--neutral-100)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--hertz-primary)] flex items-center justify-center text-[var(--hertz-black)] shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--hertz-black)]">Wins &amp; Learnings</h3>
                <p className="text-xs text-[var(--neutral-500)]">Submitted by your BMs — surfaces in the meeting presentation</p>
              </div>
            </div>
            {winsLearningsForGM.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--hertz-primary-subtle)] text-[var(--hertz-black)]">
                {winsLearningsForGM.length} submission{winsLearningsForGM.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {winsLearningsForGM.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--hertz-black)]">No submissions yet</p>
              <p className="text-xs text-[var(--neutral-500)] mt-1">
                BMs can submit wins and learnings from their Meeting Prep page before Thursday.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--neutral-100)]">
              {winsLearningsForGM.slice(0, 6).map((entry) => (
                <div key={entry.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--hertz-primary)] mt-2 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--hertz-black)] leading-relaxed">{entry.content}</p>
                    <p className="text-xs text-[var(--neutral-400)] mt-1">{entry.branch} · {entry.weekOf}</p>
                  </div>
                </div>
              ))}
              {winsLearningsForGM.length > 6 && (
                <p className="px-5 py-3 text-xs text-[var(--neutral-500)] text-center">
                  + {winsLearningsForGM.length - 6} more — all shown in the presentation
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Branch compliance detail pane — line-level data from row click */}
      <AnimatePresence>
        {selectedBranchForDetail && (
          <BranchComplianceDetailPane
            branchRow={selectedBranchForDetail}
            dateRange={dateRange}
            leads={leads}
            onClose={() => setSelectedBranchForDetail(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BranchChecklistRow({
  row,
  leads,
  dateRange,
  meetingDueDateStr,
  gmName,
  gmUserId,
  useSupabase,
  createComplianceTasksForBranch,
  onRowClick,
}) {
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  const outstandingLeads = useMemo(
    () => getLeadsWithOutstandingItemsForBranch(leads ?? [], dateRange, row.branch),
    [leads, dateRange, row.branch]
  );

  const canCreate = useSupabase && !row.isComplete && outstandingLeads.length > 0;
  const isDisabled = !canCreate || creating;

  const handleCreateTasks = async (e) => {
    e.stopPropagation();
    if (!canCreate || creating) return;
    setCreating(true);
    setCreateResult(null);
    try {
      const result = await createComplianceTasksForBranch({
        branch: row.branch,
        bmName: row.bmName,
        outstandingLeads,
        dueDateStr: meetingDueDateStr,
        gmName,
        gmUserId,
      });
      setCreateResult(result);
    } catch (err) {
      setCreateResult({ created: 0, errors: [{ error: err?.message ?? String(err) }] });
    } finally {
      setCreating(false);
    }
  };

  return (
    <tr
      onClick={onRowClick}
      className="border-t border-[var(--neutral-100)] cursor-pointer transition-colors hover:bg-[var(--neutral-50)] group"
      title="Click to view line-level data"
    >
      <td className="px-4 py-3 font-semibold text-[var(--hertz-black)]">{row.branch}</td>
      <td className="px-4 py-3 text-[var(--neutral-600)]">{row.bmName}</td>
      <td className="px-4 py-3 text-center">
        {row.outstanding > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--hertz-primary-subtle)] text-[var(--hertz-black)]">
            {row.outstanding}
          </span>
        ) : (
          <span className="text-xs text-[var(--neutral-400)]">0</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {row.isComplete ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
            Pending
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleCreateTasks}
          disabled={isDisabled}
          title={
            !useSupabase
              ? "Create tasks (requires Supabase)"
              : row.isComplete
                ? "Branch is compliant — no tasks needed"
                : outstandingLeads.length === 0
                  ? "No outstanding items"
                  : `Create ${outstandingLeads.length} task${outstandingLeads.length !== 1 ? "s" : ""} for ${row.bmName}`
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            isDisabled
              ? "bg-[var(--neutral-100)] text-[var(--neutral-400)] cursor-not-allowed"
              : "bg-[var(--hertz-primary)] text-[var(--hertz-black)] hover:bg-[var(--hertz-primary-hover)]"
          }`}
        >
          {creating ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Creating…
            </>
          ) : createResult ? (
            createResult.created > 0 ? (
              <span className="text-[var(--color-success)]">✓ {createResult.created} created</span>
            ) : (
              <span className="text-red-600">Failed</span>
            )
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Tasks
            </>
          )}
        </button>
      </td>
    </tr>
  );
}
