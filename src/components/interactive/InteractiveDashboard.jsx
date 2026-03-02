import { useState, useMemo, useEffect, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import {
  getBMStats,
  getBMTrends,
  getDateRangePresets,
  getComparisonDateRange,
  getSummaryDataWithChart,
  getLeadsForBranch,
  getTasksForBranch,
  getHierarchyForBranch,
  getDefaultBranchForDemo,
  getAllLeads,
  getLeadById,
  getOpenTasksCount,
  getTaskCompletionRate,
  getAverageTimeToContact,
  getAverageTimeToContactMinutes,
  tasksInDateRange,
  getGMDashboardStats,
  resolveGMName,
  relChange,
} from "../../selectors/demoSelectors";
import { roleMeta, roleUsers, roleDefaults } from "../../config/navigation";
import MiniBarChart from "../MiniBarChart";
import StatusBadge from "../StatusBadge";
import LeadsBoardView from "../LeadsBoardView";
import InteractiveComplianceDashboard from "./InteractiveComplianceDashboard";
import MeetingPrepModule from "../MeetingPrepModule";
import LeaderboardModule from "../LeaderboardModule";
import GMLeaderboardModule from "../GMLeaderboardModule";
import GMMeetingPrepModule from "../GMMeetingPrepModule";
import GMSpotCheckModule from "../GMSpotCheckModule";
import ActivityReportModule from "../ActivityReportModule";
import { DateRangeCalendar } from "../DateRangeCalendar";
import MetricDrilldownModal from "../MetricDrilldownModal";
import GMMetricDrilldownModal from "../GMMetricDrilldownModal";
import SummaryExportModal from "../SummaryExportModal";
import { exportLeadsToCSV, exportTasksToCSV } from "../../utils/exportUtils";
import { formatDateRange as formatDateRangePST, formatDateOnly } from "../../utils/dateTime";
import CreateTaskModal from "../CreateTaskModal";

const easeOut = [0.4, 0, 0.2, 1];
const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: easeOut },
});

// Keeps overlay (line) data labels from colliding with bar-top labels.
const LABEL_BUFFER_PX = 14; // rough height of the label text
const MIN_LABEL_GAP_PX = 10; // minimum vertical gap we want between labels
function computeOverlayLabelOffsets({ overlayPercents, barPercents, chartHeightPx, minGapPx = MIN_LABEL_GAP_PX, bufferPx = LABEL_BUFFER_PX }) {
  if (!overlayPercents?.length || !barPercents?.length) return [];
  return overlayPercents.map((ov, idx) => {
    const bar = barPercents[idx];
    if (ov == null || bar == null) return 0;
    const overlayPosPx = (ov / 100) * chartHeightPx + bufferPx;
    const barPosPx = (bar / 100) * chartHeightPx + bufferPx;
    const gap = Math.abs(overlayPosPx - barPosPx);
    return gap < minGapPx ? Math.ceil(minGapPx - gap) : 0;
  });
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[var(--hertz-primary)] rounded-full" />
            <h3 className="text-lg font-extrabold text-[var(--hertz-black)] tracking-tight">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--neutral-600)] pl-4">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </motion.div>
  );
}

function getTimeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateRange(preset, customStart, customEnd) {
  if (preset?.key === "custom" && customStart && customEnd) {
    return formatDateRangePST(new Date(customStart), new Date(customEnd));
  }
  if (preset?.start && preset?.end) {
    return formatDateRangePST(preset.start, preset.end);
  }
  return preset?.label ?? "";
}

function formatDateDisplay(isoStr) {
  if (!isoStr) return "—";
  return formatDateOnly(isoStr);
}

function leadToHlesRow(lead, org) {
  const rentInd = lead.status === "Rented" ? 1 : 0;
  const cancelId = lead.status === "Cancelled" ? 1 : 0;
  const unusedInd = lead.status === "Unused" ? 1 : 0;
  return {
    INIT_DT_FINAL: formatDateDisplay(lead.initDtFinal),
    CONFIRM_NUM: lead.reservationId ?? "—",
    RENTER_LAST: lead.customer ?? "—",
    CLAIM: lead.claim ?? "—",
    CDP: lead.cdp ?? lead.insuranceCompany ?? "—",
    RENT_LOC: lead.branch ?? "—",
    RES_ID: lead.reservationId ?? "—",
    RENT_IND: rentInd,
    CANCEL_ID: cancelId,
    UNUSED_IND: unusedInd,
    STATUS: lead.status,
    CANCEL_REASON: lead.hlesReason ?? "—",
    COMMENTS: lead.enrichment?.reason ?? lead.enrichment?.notes ?? "—",
    AREA_MGR: org?.am ?? "—",
    GENERAL_MGR: org?.gm ?? "—",
    DAYS_OPEN: lead.daysOpen ?? "—",
    DT_FROM_ALPHA1: formatDateDisplay(lead.dtFromAlpha1),
    TIME_TO_CONTACT: lead.timeToFirstContact ?? "—",
  };
}

function BMDashboard({ navigateTo, selectLead, selectTask }) {
  const { userProfile } = useAuth();
  const { leads, fetchTasksForBranch, useSupabase, updateLeadEnrichment, updateTaskStatus, insertTask } = useData();
  const reduceMotion = useReducedMotion();
  const branch = (userProfile?.branch?.trim() || getDefaultBranchForDemo());

  const [branchTasks, setBranchTasks] = useState(() =>
    useSupabase ? [] : getTasksForBranch(branch)
  );

  useEffect(() => {
    if (useSupabase && branch) {
      fetchTasksForBranch(branch).then(setBranchTasks).catch(() => setBranchTasks([]));
    } else {
      setBranchTasks(getTasksForBranch(branch));
    }
  }, [useSupabase, branch, fetchTasksForBranch]);

  const presets = getDateRangePresets();
  const [selectedPresetKey, setSelectedPresetKey] = useState("trailing_4_weeks");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [summaryTrendsMetric, setSummaryTrendsMetric] = useState("leadPipeline");
  const [summaryTrendsChartType, setSummaryTrendsChartType] = useState("bar");
  const [trendsOverlayMetric, setTrendsOverlayMetric] = useState("conversionRate");
  const [trendsTimePresetKey, setTrendsTimePresetKey] = useState("trailing_4_weeks");
  const [trendsUseCustom, setTrendsUseCustom] = useState(false);
  const [trendsGroupBy, setTrendsGroupBy] = useState("status");
  const [trendsCustomStart, setTrendsCustomStart] = useState("");
  const [trendsCustomEnd, setTrendsCustomEnd] = useState("");
  const [trendsShowCustomCalendar, setTrendsShowCustomCalendar] = useState(false);
  const trendsCustomAnchorRef = useRef(null);
  const [leadsViewMode, setLeadsViewMode] = useState("table"); // "table" | "board"
  const [drilldownMetric, setDrilldownMetric] = useState(null);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [showSummaryExport, setShowSummaryExport] = useState(false);
  const customAnchorRef = useRef(null);

  const [leadsStatusFilter, setLeadsStatusFilter] = useState("All");
  const [leadsInsuranceFilter, setLeadsInsuranceFilter] = useState("All");
  const [leadsCancelReasonFilter, setLeadsCancelReasonFilter] = useState("All");
  const [leadsDaysOpenFilter, setLeadsDaysOpenFilter] = useState("All");
  const [leadsTimeToContactFilter, setLeadsTimeToContactFilter] = useState("All");
  const [leadsFirstContactByFilter, setLeadsFirstContactByFilter] = useState("All");

  const [tasksStatusFilter, setTasksStatusFilter] = useState("All");
  const [tasksPriorityFilter, setTasksPriorityFilter] = useState("All");
  const [tasksDueDateFilter, setTasksDueDateFilter] = useState("All");

  const [leadsExpanded, setLeadsExpanded] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [stackedBarTooltip, setStackedBarTooltip] = useState(null);
  const [chartOverlayTooltip, setChartOverlayTooltip] = useState(null);
  const [chartBarTooltip, setChartBarTooltip] = useState(null);

  const [leadsSearchQuery, setLeadsSearchQuery] = useState("");
  const [leadsSortField, setLeadsSortField] = useState(null);
  const [leadsSortDir, setLeadsSortDir] = useState("asc");
  const [showCreateTask, setShowCreateTask] = useState(false);

  useEffect(() => {
    if (summaryTrendsChartType === "line" && (trendsOverlayMetric || trendsGroupBy !== "period")) {
      setSummaryTrendsChartType("bar");
    }
  }, [summaryTrendsChartType, trendsOverlayMetric, trendsGroupBy]);

  const dateRange = useMemo(() => {
    if (useCustom && customStart && customEnd) {
      return {
        start: new Date(customStart + "T00:00:00"),
        end: new Date(customEnd + "T23:59:59"),
      };
    }
    const preset = presets.find((p) => p.key === selectedPresetKey);
    return preset ? { start: preset.start, end: preset.end } : null;
  }, [selectedPresetKey, useCustom, customStart, customEnd, presets]);

  const branchLeads = getLeadsForBranch(leads, branch);

  const { stats, chartData: trendsChartData } = useMemo(() => {
    if (!dateRange) return { stats: getBMStats(leads, dateRange, branch), chartData: [] };
    return getSummaryDataWithChart(
      leads,
      branchTasks,
      dateRange,
      branch,
      useCustom ? "custom" : selectedPresetKey,
      trendsGroupBy
    );
  }, [dateRange, selectedPresetKey, useCustom, trendsGroupBy, leads, branch, branchTasks]);

  const isStackedView = trendsGroupBy !== "period";

  const summaryTrendsMetricConfig = {
    leadPipeline: { key: "totalLeads", label: "Total Leads", color: "var(--chart-black)", suffix: "" },
    conversionRate: { key: "conversionRate", label: "Conversion Rate", color: "var(--chart-success)", suffix: "%" },
    commentRate: { key: "commentRate", label: "Comment Rate", color: "var(--chart-primary)", suffix: "%" },
    openTasks: { key: "openTasks", label: "Open Tasks", color: "var(--chart-info)", suffix: "" },
    taskCompletion: { key: "taskCompletionRate", label: "Task Completion Rate", color: "var(--chart-secondary)", suffix: "%" },
    avgTimeToContact: { key: "avgTimeToContact", label: "Avg. Time to First Contact", color: "var(--chart-accent)", suffix: "m" },
  };

  /** Stacked view only supports lead/count metrics; task/time metrics need period-level aggregation. */
  const STACKED_SUPPORTED_METRICS = ["leadPipeline", "conversionRate", "commentRate"];
  const summaryTrendsMetricOptions = useMemo(() => {
    const entries = Object.entries(summaryTrendsMetricConfig);
    if (isStackedView) {
      return entries.filter(([k]) => STACKED_SUPPORTED_METRICS.includes(k));
    }
    return entries;
  }, [isStackedView]);

  const effectiveTrendsMetric =
    isStackedView && !STACKED_SUPPORTED_METRICS.includes(summaryTrendsMetric)
      ? "conversionRate"
      : summaryTrendsMetric;

  const overlayOptions = useMemo(() => {
    const opts = [{ value: "", label: "None" }];
    const others = Object.entries(summaryTrendsMetricConfig).filter(
      ([k]) => k !== effectiveTrendsMetric && (isStackedView ? STACKED_SUPPORTED_METRICS.includes(k) : true)
    );
    others.forEach(([k, c]) => opts.push({ value: k, label: c.label }));
    return opts;
  }, [effectiveTrendsMetric, isStackedView]);

  const leadsFilterOptions = useMemo(() => {
    const statuses = [...new Set(branchLeads.map((l) => l.status))].sort();
    const insuranceCompanies = [...new Set(branchLeads.map((l) => l.insuranceCompany ?? "—"))].sort((a, b) => (a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)));
    const cancelReasons = [...new Set(branchLeads.map((l) => l.hlesReason ?? "—"))].sort((a, b) => (a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)));
    const timeToContacts = [...new Set(branchLeads.map((l) => l.timeToFirstContact ?? "—"))].sort((a, b) => (a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)));
    const firstContactBy = [...new Set(branchLeads.map((l) => l.firstContactBy ?? "none"))].sort();
    const daysOpenRanges = [
      { value: "0-1", label: "0–1 days" },
      { value: "2-5", label: "2–5 days" },
      { value: "6-10", label: "6–10 days" },
      { value: "11-", label: "11+ days" },
    ];
    return { statuses, insuranceCompanies, cancelReasons, timeToContacts, firstContactBy, daysOpenRanges };
  }, [branchLeads]);

  const filteredBranchLeads = useMemo(() => {
    let result = branchLeads;
    if (leadsSearchQuery.trim()) {
      const q = leadsSearchQuery.trim().toLowerCase();
      result = result.filter((l) =>
        (l.customer ?? "").toLowerCase().includes(q) ||
        (l.reservationId ?? "").toLowerCase().includes(q) ||
        (l.confirmNum ?? l.reservationId ?? "").toLowerCase().includes(q)
      );
    }
    if (leadsStatusFilter !== "All") result = result.filter((l) => l.status === leadsStatusFilter);
    if (leadsInsuranceFilter !== "All") result = result.filter((l) => (l.insuranceCompany ?? "—") === leadsInsuranceFilter);
    if (leadsCancelReasonFilter !== "All") result = result.filter((l) => (l.hlesReason ?? "—") === leadsCancelReasonFilter);
    if (leadsTimeToContactFilter !== "All") result = result.filter((l) => (l.timeToFirstContact ?? "—") === leadsTimeToContactFilter);
    if (leadsFirstContactByFilter !== "All") result = result.filter((l) => (l.firstContactBy ?? "none") === leadsFirstContactByFilter);
    if (leadsDaysOpenFilter !== "All") {
      const parts = leadsDaysOpenFilter.split("-");
      const min = Number(parts[0]);
      const max = parts[1] ? (parts[1] === "" ? null : Number(parts[1])) : min;
      result = result.filter((l) => {
        const d = l.daysOpen ?? 0;
        if (max === null) return d >= min;
        return d >= min && d <= max;
      });
    }
    result = [...result].sort((a, b) => {
      const aClosed = a.status === "Rented" && a.enrichmentComplete;
      const bClosed = b.status === "Rented" && b.enrichmentComplete;
      if (aClosed && !bClosed) return 1;
      if (!aClosed && bClosed) return -1;
      if (leadsSortField) {
        const dir = leadsSortDir === "asc" ? 1 : -1;
        const av = a[leadsSortField] ?? "";
        const bv = b[leadsSortField] ?? "";
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      }
      return (b.daysOpen ?? 0) - (a.daysOpen ?? 0);
    });
    return result;
  }, [branchLeads, leadsSearchQuery, leadsStatusFilter, leadsInsuranceFilter, leadsCancelReasonFilter, leadsDaysOpenFilter, leadsTimeToContactFilter, leadsFirstContactByFilter, leadsSortField, leadsSortDir]);

  const tasksFilterOptions = useMemo(() => {
    const statuses = [...new Set(branchTasks.map((t) => t.status))].sort();
    const priorities = [...new Set(branchTasks.map((t) => t.priority ?? "Medium"))].sort((a, b) => {
      const order = { High: 0, Medium: 1, Low: 2 };
      return (order[a] ?? 1) - (order[b] ?? 1);
    });
    const dueDateRanges = [
      { value: "overdue", label: "Overdue" },
      { value: "today", label: "Due today" },
      { value: "week", label: "Due this week" },
      { value: "later", label: "Due later" },
      { value: "none", label: "No due date" },
    ];
    return { statuses, priorities, dueDateRanges };
  }, [branchTasks]);

  const filteredBranchTasks = useMemo(() => {
    let result = branchTasks;
    if (tasksStatusFilter !== "All") result = result.filter((t) => t.status === tasksStatusFilter);
    if (tasksPriorityFilter !== "All") result = result.filter((t) => (t.priority ?? "Medium") === tasksPriorityFilter);
    if (tasksDueDateFilter !== "All") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      result = result.filter((t) => {
        const d = t.dueDate;
        if (!d) return tasksDueDateFilter === "none";
        const due = new Date(d + "T00:00:00");
        due.setHours(0, 0, 0, 0);
        if (tasksDueDateFilter === "overdue") return due < today;
        if (tasksDueDateFilter === "today") return due.getTime() === today.getTime();
        if (tasksDueDateFilter === "week") return due >= today && due <= endOfWeek;
        if (tasksDueDateFilter === "later") return due > endOfWeek;
        if (tasksDueDateFilter === "none") return false;
        return true;
      });
    }
    // Completed tasks (Done) go to bottom
    return [...result].sort((a, b) => (a.status === "Done" ? 1 : 0) - (b.status === "Done" ? 1 : 0));
  }, [branchTasks, tasksStatusFilter, tasksPriorityFilter, tasksDueDateFilter]);

  const DISPLAY_LIMIT = 5;
  const displayLeads = useMemo(
    () => (leadsExpanded ? filteredBranchLeads : filteredBranchLeads.slice(0, DISPLAY_LIMIT)),
    [filteredBranchLeads, leadsExpanded]
  );
  const displayTasks = useMemo(
    () => (tasksExpanded ? filteredBranchTasks : filteredBranchTasks.slice(0, DISPLAY_LIMIT)),
    [filteredBranchTasks, tasksExpanded]
  );
  const hasMoreLeads = filteredBranchLeads.length > DISPLAY_LIMIT;
  const hasMoreTasks = filteredBranchTasks.length > DISPLAY_LIMIT;

  const presetKey = useCustom ? "custom" : selectedPresetKey;
  const comparisonRange = useCustom
    ? getComparisonDateRange("custom", customStart, customEnd)
    : getComparisonDateRange(selectedPresetKey);
  const comparisonStats = getBMStats(leads, comparisonRange, branch);

  const convRate = stats.total ? Math.round((stats.rented / stats.total) * 100) : 0;
  const prevConvRate = comparisonStats.total ? Math.round((comparisonStats.rented / comparisonStats.total) * 100) : 0;
  const prevCommentRate = comparisonStats.enrichmentRate ?? 0;

  // Tasks in date range for period-over-period comparison (consistent with other metrics)
  const tasksInPeriod = tasksInDateRange(branchTasks, dateRange);
  const tasksInComparison = comparisonRange
    ? tasksInDateRange(branchTasks, comparisonRange)
    : [];
  const openInPeriod = getOpenTasksCount(tasksInPeriod);
  const openInComparison = getOpenTasksCount(tasksInComparison);
  const completionInPeriod = getTaskCompletionRate(tasksInPeriod);
  const completionInComparison = getTaskCompletionRate(tasksInComparison);

  const openTasksCount = dateRange ? openInPeriod : getOpenTasksCount(branchTasks);
  const taskCompletionRate = dateRange && tasksInPeriod.length > 0 ? completionInPeriod : getTaskCompletionRate(branchTasks);
  const avgTimeToContact = getAverageTimeToContact(leads, dateRange, branch);
  const avgTimeToContactMin = getAverageTimeToContactMinutes(leads, dateRange, branch);
  const prevAvgTimeToContactMin = getAverageTimeToContactMinutes(leads, comparisonRange, branch);

  const relChangeOpenTasks = comparisonRange != null && openInComparison > 0
    ? Math.round(((openInComparison - openInPeriod) / openInComparison) * 100) // fewer = better
    : null;
  const relChangeCompletion = comparisonRange != null && completionInComparison != null && completionInComparison > 0
    ? relChange(completionInPeriod ?? 0, completionInComparison)
    : null;
  const relChangeAvgTime = comparisonRange != null && prevAvgTimeToContactMin != null && prevAvgTimeToContactMin > 0 && avgTimeToContactMin != null
    ? Math.round(((prevAvgTimeToContactMin - avgTimeToContactMin) / prevAvgTimeToContactMin) * 100) // lower = better
    : null;

  const rateTiles = [
    { label: "Total Leads", value: stats.total, color: "text-[var(--hertz-black)]", isCount: true, relChange: relChange(stats.total, comparisonStats.total), metricKey: "total_leads" },
    { label: "Conversion Rate", value: `${convRate}%`, color: "text-[var(--color-success)]", isCount: false, relChange: relChange(convRate, prevConvRate), metricKey: "conversion_rate" },
    { label: "Comment Rate", value: `${stats.enrichmentRate}%`, color: "text-[var(--hertz-primary)]", isCount: false, relChange: relChange(stats.enrichmentRate, prevCommentRate), metricKey: "comment_rate" },
  ];

  const secondaryTiles = [
    { label: "Open Tasks", value: openTasksCount, color: "text-[var(--hertz-black)]", relChange: relChangeOpenTasks, metricKey: "open_tasks" },
    { label: "Task Completion Rate", value: taskCompletionRate != null ? `${taskCompletionRate}%` : "—", color: "text-[var(--neutral-700)]", relChange: relChangeCompletion, metricKey: "task_completion_rate" },
    { label: "Average Time for First Contact", value: avgTimeToContact ?? "—", color: "text-[var(--neutral-700)]", relChange: relChangeAvgTime, lowerIsBetter: true, metricKey: "avg_time_to_contact" },
  ];

  const activePreset = useCustom ? { key: "custom" } : presets.find((p) => p.key === selectedPresetKey);
  const rangeLabel = formatDateRange(activePreset, customStart, customEnd);

  const handleSortClick = (field) => {
    if (leadsSortField === field) {
      setLeadsSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setLeadsSortField(field);
      setLeadsSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (leadsSortField !== field) return <span className="text-white/30 ml-1">↕</span>;
    return <span className="text-[var(--hertz-primary)] ml-1">{leadsSortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const handleCreateTask = async (taskData) => {
    const created = await insertTask(taskData);
    if (created) {
      if (useSupabase) {
        fetchTasksForBranch(branch).then(setBranchTasks).catch(() => {});
      } else {
        setBranchTasks((prev) => [created, ...prev]);
      }
    }
    setShowCreateTask(false);
  };

  const trendsConfig = summaryTrendsMetricConfig[effectiveTrendsMetric];
  const trendsValues = isStackedView ? [] : trendsChartData.map((d) => d[trendsConfig.key] ?? 0);
  const trendsLabels = isStackedView
    ? trendsChartData.map((d) => d.period)
    : trendsChartData.map((d) => d.label);
  const trendsMax = Math.max(...trendsValues, 1);

  const overlayConfig = trendsOverlayMetric ? summaryTrendsMetricConfig[trendsOverlayMetric] : null;
  const overlayValues = overlayConfig ? trendsChartData.map((d) => d[overlayConfig.key] ?? 0) : [];
  const overlayMax = overlayValues.length > 0 ? Math.max(...overlayValues, 1) : 1;

  const SEGMENT_COLORS = {
    Rented: "var(--chart-primary)",
    Cancelled: "var(--chart-black)",
    Unused: "var(--chart-neutral)",
  };
  const SEGMENT_ORDER = ["Rented", "Cancelled", "Unused"];
  const PALETTE = ["var(--chart-primary)", "var(--hertz-primary-light)", "var(--hertz-gold-plus)", "var(--chart-black)", "var(--chart-info)", "var(--chart-accent)", "var(--chart-neutral)", "var(--chart-neutral-dark)"];
  const getSegmentColor = (key) => SEGMENT_COLORS[key] ?? PALETTE[Math.abs(key.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTE.length];

  const stackedSegmentKeys = useMemo(() => {
    if (!isStackedView) return [];
    const keys = new Set();
    for (const row of trendsChartData) {
      for (const k of Object.keys(row.segments ?? {})) keys.add(k);
    }
    const ordered = [...keys].sort((a, b) => {
      const ai = SEGMENT_ORDER.indexOf(a);
      const bi = SEGMENT_ORDER.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return String(a).localeCompare(String(b));
    });
    return ordered;
  }, [isStackedView, trendsChartData]);

  const trendsChartTypeBtn = (type, icon, label) => (
    <button
      onClick={() => setSummaryTrendsChartType(type)}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer ${
        summaryTrendsChartType === type
          ? "bg-white text-[var(--hertz-black)] shadow-sm"
          : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
      }`}
      title={label ?? (type === "bar" ? "Bar" : type === "line" ? "Line" : "Table")}
    >
      {icon}
    </button>
  );

  const getStackedBarLabel = (row) => {
    if (effectiveTrendsMetric === "leadPipeline") return row.total;
    if (effectiveTrendsMetric === "conversionRate") return row.conversionRate != null ? `${row.conversionRate}%` : "—";
    if (effectiveTrendsMetric === "commentRate") return row.commentRate != null ? `${row.commentRate}%` : "—";
    return row.total;
  };

  const renderTrendsBarChart = () => {
    if (isStackedView) {
      const stackedHasOverlay = !!trendsOverlayMetric && overlayValues.length > 0;
      const stackedN = trendsChartData.length;
      const stackedPadR = stackedHasOverlay ? 40 : 0;
      const isCountMetric = effectiveTrendsMetric === "leadPipeline" || effectiveTrendsMetric === "openTasks";
      const stackedMaxTotal = isCountMetric ? Math.max(...trendsChartData.map((d) => d.total ?? 0), 1) : 100;
      const niceMax = isCountMetric ? (stackedMaxTotal <= 4 ? 4 : stackedMaxTotal <= 8 ? 8 : stackedMaxTotal <= 12 ? 12 : Math.ceil(stackedMaxTotal / 5) * 5) : 100;
      const yTickCount = 5;
      const yTicks = Array.from({ length: yTickCount }, (_, i) => Math.round((niceMax * i) / (yTickCount - 1)));
      const STACKED_CHART_HEIGHT = 260;
      const STACKED_OVERLAY_INSET = 6;
      const stackedPlotHeightPx = STACKED_CHART_HEIGHT - STACKED_OVERLAY_INSET * 2;
      const stackedBarTopPercents = trendsChartData.map((row) =>
        isCountMetric ? (row.total / niceMax) * 100 : Object.values(row.segments ?? {}).reduce((s, v) => s + v, 0)
      );
      const stackedOverlayPercents = stackedHasOverlay ? overlayValues.map((v) => (overlayMax > 0 ? (v / overlayMax) * 100 : 0)) : [];
      const stackedOverlayLabelOffsets = stackedHasOverlay
        ? computeOverlayLabelOffsets({
            overlayPercents: stackedOverlayPercents,
            barPercents: stackedBarTopPercents,
            chartHeightPx: stackedPlotHeightPx,
          })
        : [];

      const AXIS_GAP = 12;
      return (
        <div>
          <div className="flex items-center pt-1 pb-9">
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {stackedSegmentKeys.map((k) => (
                <div key={k} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: getSegmentColor(k), borderRadius: 0 }} />
                  <span className="text-xs font-medium text-[var(--neutral-600)]">{k}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Chart area: y-axis + bars + overlay + secondary y-axis — equidistant spacing from grid to each axis */}
          <div className="flex" style={{ height: 260, gap: AXIS_GAP }}>
            <div className="flex flex-col justify-between shrink-0 py-0.5 text-right" style={{ width: 36, paddingRight: AXIS_GAP }}>
              {[...yTicks].reverse().map((val) => (
                <span key={val} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{isCountMetric ? "" : "%"}</span>
              ))}
            </div>
            <div className="flex flex-1 min-w-0">
              <div className="flex-1 relative border-l border-[var(--neutral-200)]" style={{ paddingRight: stackedPadR }}>
              {/* Grid lines — extend full width so they reach the secondary y-axis */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                {yTicks.map((val) => (
                  <div
                    key={val}
                    className="absolute left-0 right-0 border-t border-[var(--neutral-200)]"
                    style={{ top: `${100 - (val / niceMax) * 100}%`, height: 0 }}
                  />
                ))}
              </div>
              {/* Bars + bar-top labels — equidistant spacing from grid edges */}
              <div className="grid absolute inset-0 z-10 h-full" style={{ gridTemplateColumns: `repeat(${stackedN}, 1fr)`, gap: 4, right: stackedPadR, paddingLeft: AXIS_GAP, paddingRight: AXIS_GAP }}>
                {trendsChartData.map((row, i) => {
                  const totalBarPct = isCountMetric
                    ? (row.total / niceMax) * 100
                    : Object.values(row.segments ?? {}).reduce((s, v) => s + v, 0);
                  return (
                  <div key={i} className="flex flex-col items-center h-full relative">
                    <span
                      className="absolute left-1/2 z-10 text-xs font-semibold text-[var(--neutral-700)] whitespace-nowrap pointer-events-none"
                      style={{ bottom: `${totalBarPct}%`, transform: "translateX(-50%)", marginBottom: 2 }}
                    >
                      {getStackedBarLabel(row)}
                    </span>
                    <div className="flex-1 w-full flex flex-col-reverse items-center relative" style={{ width: "70%", maxWidth: 48 }}>
                      {stackedSegmentKeys.map((k) => {
                        const count = row.raw?.[k] ?? 0;
                        const pct = row.segments?.[k] ?? 0;
                        if (count <= 0 && pct <= 0) return null;
                        const heightPct = isCountMetric
                          ? (count / niceMax) * 100
                          : pct;
                        return (
                          <motion.div
                            key={k}
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPct}%` }}
                            transition={{ delay: i * 0.03, duration: 0.3, ease: "easeOut" }}
                            className="w-full min-h-[2px] cursor-default"
                            style={{ backgroundColor: getSegmentColor(k), borderRadius: 0 }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const period = trendsLabels[i] ?? row.period ?? "";
                              setStackedBarTooltip({ period, hoveredSegment: k, raw: row.raw, segments: row.segments, total: row.total, x: rect.left + rect.width / 2, y: rect.top });
                            }}
                            onMouseLeave={() => setStackedBarTooltip(null)}
                          />
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
              {/* Overlay line — inset wrapper with HTML dots + SVG polyline + data labels */}
              {stackedHasOverlay && (() => {
                const OVERLAY_INSET = STACKED_OVERLAY_INSET;
                const bottomPct = (v) => overlayMax > 0 ? (v / overlayMax) * 100 : 0;
                return (
                <div className="absolute z-20 pointer-events-none" style={{ top: OVERLAY_INSET, bottom: OVERLAY_INSET, left: AXIS_GAP, right: stackedPadR + AXIS_GAP }}>
                  {stackedN > 1 && (
                  <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="var(--color-success)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      points={overlayValues.map((v, i) => {
                        const x = ((i + 0.5) / stackedN) * 100;
                        const y = 100 - bottomPct(v);
                        return `${x},${y}`;
                      }).join(" ")}
                    />
                  </svg>
                  )}
                  {overlayValues.map((v, i) => {
                    const leftPct = ((i + 0.5) / stackedN) * 100;
                    const bPct = bottomPct(v);
                    const label = trendsLabels[i] ?? "";
                    return (
                      <div
                        key={i}
                        className="absolute"
                        style={{ left: `${leftPct}%`, bottom: `${bPct}%`, transform: "translate(-50%, 50%)", pointerEvents: "all", cursor: "pointer" }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setChartOverlayTooltip({ period: label, value: v, suffix: overlayConfig?.suffix ?? "", x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setChartOverlayTooltip(null)}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-white shadow-sm relative">
                          <span
                            className="absolute bottom-full left-1/2 -translate-x-1/2 text-xs font-bold text-[var(--color-success)] whitespace-nowrap pointer-events-none"
                            style={{ marginBottom: `${4 + (stackedOverlayLabelOffsets[i] ?? 0)}px` }}
                          >
                            {v}{overlayConfig?.suffix ?? ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>
            {stackedHasOverlay && (
              <div className="flex flex-col justify-between shrink-0 border-l border-[var(--neutral-200)]" style={{ width: 36, paddingTop: 6, paddingBottom: 6, paddingLeft: AXIS_GAP }}>
                {[0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(overlayMax * f)).reverse().map((val, idx) => (
                  <span key={idx} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{overlayConfig?.suffix ?? ""}</span>
                ))}
              </div>
            )}
            </div>
          </div>
          {stackedBarTooltip && (
            <div
              className="fixed z-50 px-3 py-2 bg-[var(--hertz-black)] text-white text-xs font-medium rounded shadow-lg pointer-events-none"
              style={{ left: stackedBarTooltip.x, top: stackedBarTooltip.y - 8, transform: "translate(-50%, -100%)" }}
            >
              {stackedBarTooltip.period && <div className="font-semibold mb-1">{stackedBarTooltip.period}</div>}
              <div className="space-y-0.5">
                {stackedSegmentKeys.map((k) => {
                  const count = stackedBarTooltip.raw?.[k] ?? 0;
                  const pct = stackedBarTooltip.segments?.[k] ?? 0;
                  if (count <= 0 && pct <= 0) return null;
                  const isHovered = k === stackedBarTooltip.hoveredSegment;
                  return (
                    <div key={k} className="flex items-center gap-1.5" style={{ opacity: isHovered ? 1 : 0.7 }}>
                      <div className="w-2 h-2 shrink-0" style={{ backgroundColor: getSegmentColor(k) }} />
                      <span>{k}: {count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 pt-1 border-t border-white/20 text-xs opacity-70">
                Total: {stackedBarTooltip.total}
              </div>
            </div>
          )}
          {chartOverlayTooltip && (
            <div
              className="fixed z-50 px-2.5 py-1.5 bg-[var(--hertz-black)] text-white text-xs font-medium rounded shadow-lg pointer-events-none"
              style={{ left: chartOverlayTooltip.x, top: chartOverlayTooltip.y - 8, transform: "translate(-50%, -100%)" }}
            >
              <div className="font-semibold">{chartOverlayTooltip.period}</div>
              <div className="text-xs opacity-90 text-[var(--color-success)]">
                {overlayConfig?.label ?? ""}: {chartOverlayTooltip.value}{chartOverlayTooltip.suffix}
              </div>
            </div>
          )}
          {/* X-axis labels — match chart row structure so columns align with bar midpoints */}
          <div className="flex pt-2 mt-1 border-t border-[var(--neutral-200)]" style={{ gap: AXIS_GAP }}>
            <div style={{ width: 36 }} />
            <div className="flex flex-1 min-w-0">
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${trendsLabels.length}, 1fr)`, gap: 4, paddingLeft: AXIS_GAP, paddingRight: stackedPadR + AXIS_GAP }}>
                {trendsLabels.map((l, i) => (
                  <span key={i} className="text-center text-xs text-[var(--neutral-500)] truncate">{l}</span>
                ))}
              </div>
              {stackedHasOverlay && <div style={{ width: 36 }} />}
            </div>
          </div>
        </div>
      );
    }
    const yTickValues = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(trendsMax * f));
    const chartHeight = 280;
    const hasOverlay = !!trendsOverlayMetric && overlayValues.length > 0;
    const n = trendsValues.length;
    const padR = hasOverlay ? 40 : 0;
    const overlayTickValues = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(overlayMax * f));
    const nonStackedAxisGap = 12;
    const NONSTACKED_OVERLAY_INSET = 6;
    const nonStackedPlotHeightPx = chartHeight - NONSTACKED_OVERLAY_INSET * 2;
    const nonStackedBarTopPercents = trendsValues.map((v) => (trendsMax > 0 ? Math.min(100, (v / trendsMax) * 100) : 0));
    const nonStackedOverlayPercents = hasOverlay ? overlayValues.map((v) => (overlayMax > 0 ? (v / overlayMax) * 100 : 0)) : [];
    const nonStackedOverlayLabelOffsets = hasOverlay
      ? computeOverlayLabelOffsets({
          overlayPercents: nonStackedOverlayPercents,
          barPercents: nonStackedBarTopPercents,
          chartHeightPx: nonStackedPlotHeightPx,
        })
      : [];
    return (
      <div>
        <div className="flex" style={{ height: chartHeight, gap: nonStackedAxisGap }}>
          <div className="flex flex-col justify-between shrink-0 py-0.5 text-right" style={{ width: 36, paddingRight: nonStackedAxisGap }}>
            {[...yTickValues].reverse().map((val) => (
              <span key={val} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{trendsConfig.suffix}</span>
            ))}
          </div>
          <div className="flex flex-1 min-w-0">
          <div className="flex-1 relative border-l border-[var(--neutral-200)]" style={{ minHeight: 260, paddingRight: padR }}>
            {/* Grid lines — extend full width so they reach the secondary y-axis */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                <div
                  key={frac}
                  className="absolute left-0 right-0 border-t border-[var(--neutral-200)]"
                  style={{ top: `${(1 - frac) * 100}%`, height: 0 }}
                />
              ))}
            </div>
            <div className="absolute inset-0 grid z-10" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 4, right: padR, paddingLeft: nonStackedAxisGap, paddingRight: nonStackedAxisGap }}>
          {trendsValues.map((v, i) => {
            const barHeightPct = trendsMax > 0 ? Math.min(100, (v / trendsMax) * 100) : 0;
            const label = trendsLabels[i] ?? "";
            return (
            <div
              key={i}
              className="flex flex-col justify-end items-center h-full cursor-pointer relative"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setChartBarTooltip({ label, value: v, suffix: trendsConfig.suffix, x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => setChartBarTooltip(null)}
            >
              <span
                className="absolute left-1/2 z-10 text-xs font-semibold text-[var(--neutral-700)] whitespace-nowrap pointer-events-none"
                style={{ bottom: `${barHeightPct}%`, transform: "translateX(-50%)", marginBottom: 2 }}
              >
                {v}{trendsConfig.suffix}
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${barHeightPct}%` }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
                className="rounded-none w-[70%] max-w-[48px] self-center"
                style={{ backgroundColor: trendsConfig.color, opacity: i === trendsValues.length - 1 ? 1 : 0.7, minHeight: 0 }}
              />
            </div>
          );
          })}
            </div>
            {/* Overlay line — inset wrapper with HTML dots + SVG polyline + data labels */}
            {hasOverlay && (() => {
              const OVERLAY_INSET = NONSTACKED_OVERLAY_INSET;
              const bottomPct = (v) => overlayMax > 0 ? (v / overlayMax) * 100 : 0;
              return (
              <div className="absolute z-20 pointer-events-none" style={{ top: OVERLAY_INSET, bottom: OVERLAY_INSET, left: nonStackedAxisGap, right: padR + nonStackedAxisGap }}>
                {n > 1 && (
                <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    points={overlayValues.map((v, i) => {
                      const x = ((i + 0.5) / n) * 100;
                      const y = 100 - bottomPct(v);
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                </svg>
                )}
                {overlayValues.map((v, i) => {
                  const leftPct = ((i + 0.5) / n) * 100;
                  const bPct = bottomPct(v);
                  const label = trendsLabels[i] ?? "";
                  return (
                    <div
                      key={i}
                      className="absolute"
                      style={{ left: `${leftPct}%`, bottom: `${bPct}%`, transform: "translate(-50%, 50%)", pointerEvents: "all", cursor: "pointer" }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setChartOverlayTooltip({ period: label, value: v, suffix: overlayConfig?.suffix ?? "", x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setChartOverlayTooltip(null)}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-white shadow-sm relative">
                        <span
                          className="absolute bottom-full left-1/2 -translate-x-1/2 text-xs font-bold text-[var(--color-success)] whitespace-nowrap pointer-events-none"
                          style={{ marginBottom: `${4 + (nonStackedOverlayLabelOffsets[i] ?? 0)}px` }}
                        >
                          {v}{overlayConfig?.suffix ?? ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })()}
          </div>
          {hasOverlay && (
            <div className="flex flex-col justify-between shrink-0 border-l border-[var(--neutral-200)]" style={{ width: 36, paddingTop: 6, paddingBottom: 6, paddingLeft: nonStackedAxisGap }}>
              {[...overlayTickValues].reverse().map((val) => (
                <span key={val} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{overlayConfig?.suffix ?? ""}</span>
              ))}
            </div>
          )}
          </div>
        </div>
        {/* X-axis labels — match chart row structure so columns align with bar midpoints */}
        <div className="flex pt-2 mt-1 border-t border-[var(--neutral-200)]" style={{ gap: nonStackedAxisGap }}>
          <div style={{ width: 36 }} />
          <div className="flex flex-1 min-w-0">
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 4, paddingLeft: nonStackedAxisGap, paddingRight: padR + nonStackedAxisGap }}>
              {trendsLabels.map((l, i) => (
                <span key={i} className="text-center text-xs text-[var(--neutral-500)] truncate">{l}</span>
              ))}
            </div>
            {hasOverlay && <div style={{ width: 36 }} />}
          </div>
        </div>
        {chartBarTooltip && (
          <div
            className="fixed z-50 px-2.5 py-1.5 bg-[var(--hertz-black)] text-white text-xs font-medium rounded shadow-lg pointer-events-none"
            style={{ left: chartBarTooltip.x, top: chartBarTooltip.y - 8, transform: "translate(-50%, -100%)" }}
          >
            <div className="font-semibold">{chartBarTooltip.label}</div>
            <div className="text-xs opacity-90">
              {trendsConfig.label}: {chartBarTooltip.value}{chartBarTooltip.suffix}
            </div>
          </div>
        )}
        {chartOverlayTooltip && (
          <div
            className="fixed z-50 px-2.5 py-1.5 bg-[var(--hertz-black)] text-white text-xs font-medium rounded shadow-lg pointer-events-none"
            style={{ left: chartOverlayTooltip.x, top: chartOverlayTooltip.y - 8, transform: "translate(-50%, -100%)" }}
          >
            <div className="font-semibold">{chartOverlayTooltip.period}</div>
            <div className="text-xs opacity-90 text-[var(--color-success)]">
              {overlayConfig?.label ?? ""}: {chartOverlayTooltip.value}{chartOverlayTooltip.suffix}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTrendsLineChart = () => {
    if (isStackedView) {
      const svgW = 560, svgH = 300;
      const pad = { t: 28, r: 25, b: 32, l: 42 };
      const plotW = svgW - pad.l - pad.r;
      const plotH = svgH - pad.t - pad.b;
      const n = trendsChartData.length;
      const paths = stackedSegmentKeys.map((k, segIdx) => {
        const pts = trendsChartData.map((row, i) => {
          const pct = row.segments?.[k] ?? 0;
          const prevPct = stackedSegmentKeys.slice(0, segIdx).reduce((s, kk) => s + (row.segments?.[kk] ?? 0), 0);
          const yFromBottom = prevPct + pct;
          const y = pad.t + plotH - (yFromBottom / 100) * plotH;
          const x = n > 1 ? pad.l + (i / (n - 1)) * plotW : pad.l + plotW / 2;
          return { x, y, pct };
        });
        const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        const areaD = n > 1
          ? `${pathD} L${pts[n - 1].x},${pad.t + plotH} L${pts[0].x},${pad.t + plotH} Z`
          : "";
        return { pathD, areaD, pts, color: getSegmentColor(k), key: k };
      });
      const stackedLineHasOverlay = !!trendsOverlayMetric && overlayValues.length > 0;
      const stackedLinePadR = stackedLineHasOverlay ? 40 : 0;
      const stackedLinePad = { ...pad, r: pad.r + stackedLinePadR };
      const overlayPtsStacked = stackedLineHasOverlay && overlayValues.length > 0
        ? overlayValues.map((v, i) => ({
            x: pad.l + (overlayValues.length > 1 ? (i / (overlayValues.length - 1)) * plotW : plotW / 2),
            y: pad.t + plotH - (overlayMax > 0 ? (v / overlayMax) * plotH : 0),
            v,
          }))
        : [];
      const overlayPathDStacked = overlayPtsStacked.length > 1
        ? overlayPtsStacked.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
        : "";
      return (
        <div>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full overflow-visible" style={{ maxHeight: 320 }}>
            {/* Y-axis line */}
            <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="var(--neutral-300)" strokeWidth={1} />
            {/* Horizontal grid lines and y-axis labels */}
            {[0, 25, 50, 75, 100].map((frac) => {
              const y = pad.t + plotH - (frac / 100) * plotH;
              return (
                <g key={frac}>
                  <line x1={pad.l} y1={y} x2={stackedLineHasOverlay ? svgW - pad.r : svgW - stackedLinePad.r} y2={y} stroke="var(--neutral-200)" strokeWidth={0.5} strokeDasharray="2,2" />
                  <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={12} fill="var(--chart-neutral-dark)">{frac}%</text>
                </g>
              );
            })}
            {stackedLineHasOverlay && (
              <line x1={svgW - pad.r} y1={pad.t} x2={svgW - pad.r} y2={pad.t + plotH} stroke="var(--neutral-300)" strokeWidth={1} />
            )}
            {stackedLineHasOverlay && [0, 25, 50, 75, 100].map((frac) => {
              const y = pad.t + plotH * (1 - frac / 100);
              const val = Math.round(overlayMax * frac / 100);
              return (
                <text key={`ov-${frac}`} x={svgW - pad.r + 6} y={y + 3} textAnchor="start" fontSize={12} fill="var(--chart-neutral-dark)">{val}{overlayConfig?.suffix ?? ""}</text>
              );
            })}
            {paths.map(({ areaD, pathD, color, key }) => (
              <g key={key}>
                {areaD && <path d={areaD} fill={color} opacity={0.6} />}
                <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
            {stackedLineHasOverlay && overlayPathDStacked && (
              <g>
                <path d={overlayPathDStacked} fill="none" stroke="var(--color-success)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
                {overlayPtsStacked.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={2} fill="var(--color-success)" stroke="white" strokeWidth={1} />
                    <text x={p.x} y={Math.max(12, p.y - 8)} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-success)">
                      {p.v}{overlayConfig?.suffix ?? ""}
                    </text>
                  </g>
                ))}
              </g>
            )}
            {trendsChartData.map((row, i) => {
              const x = n > 1 ? pad.l + (i / (n - 1)) * plotW : pad.l + plotW / 2;
              return (
                <text key={i} x={x} y={svgH - 6} textAnchor="middle" fontSize={12} fill="var(--chart-neutral-dark)">{row.period}</text>
              );
            })}
          </svg>
        </div>
      );
    }
    const hasOverlay = !!trendsOverlayMetric && overlayValues.length > 0;
    const padR = hasOverlay ? 40 : 0;
    const svgW = 560, svgH = 300;
    const pad = { t: 28, r: 25 + padR, b: 32, l: 42 };
    const plotW = svgW - pad.l - pad.r;
    const plotH = svgH - pad.t - pad.b;
    const pts = trendsValues.map((v, i) => ({
      x: pad.l + (trendsValues.length > 1 ? (i / (trendsValues.length - 1)) * plotW : plotW / 2),
      y: pad.t + plotH - (trendsMax > 0 ? (v / trendsMax) * plotH : 0),
      v,
    }));
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaD = pts.length > 1
      ? `${pathD} L${pts[pts.length - 1].x},${pad.t + plotH} L${pts[0].x},${pad.t + plotH} Z`
      : "";
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({ frac, val: Math.round(trendsMax * frac) }));
    const overlayPts = hasOverlay && overlayValues.length > 0
      ? overlayValues.map((v, i) => ({
          x: pad.l + (overlayValues.length > 1 ? (i / (overlayValues.length - 1)) * plotW : plotW / 2),
          y: pad.t + plotH - (overlayMax > 0 ? (v / overlayMax) * plotH : 0),
          v,
        }))
      : [];
    const overlayPathD = overlayPts.length > 1
      ? overlayPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
      : "";
    const overlayYTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({ frac, val: Math.round(overlayMax * frac) }));
    return (
      <div>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full overflow-visible" style={{ maxHeight: 320 }}>
          {/* Y-axis line */}
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="var(--neutral-300)" strokeWidth={1} />
          {/* Horizontal grid lines and y-axis labels */}
          {yTicks.map(({ frac, val }) => {
            const y = pad.t + plotH * (1 - frac);
            return (
              <g key={frac}>
                <line x1={pad.l} y1={y} x2={hasOverlay ? svgW - 25 : svgW - pad.r} y2={y} stroke="var(--neutral-200)" strokeWidth={0.5} strokeDasharray="2,2" />
                <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={12} fill="var(--chart-neutral-dark)">{val}{trendsConfig.suffix}</text>
              </g>
            );
          })}
          {hasOverlay && (
            <line x1={svgW - 25} y1={pad.t} x2={svgW - 25} y2={pad.t + plotH} stroke="var(--neutral-300)" strokeWidth={1} />
          )}
          {hasOverlay && overlayYTicks.map(({ frac, val }) => {
            const y = pad.t + plotH * (1 - frac);
            return (
              <text key={`ov-${frac}`} x={svgW - 25 + 6} y={y + 3} textAnchor="start" fontSize={12} fill="var(--chart-neutral-dark)">{val}{overlayConfig?.suffix ?? ""}</text>
            );
          })}
          {areaD && <path d={areaD} fill={trendsConfig.color} opacity={0.07} />}
          <path d={pathD} fill="none" stroke={trendsConfig.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={trendsConfig.color} stroke="white" strokeWidth={1.5} />
              <text x={p.x} y={Math.max(12, p.y - 10)} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--chart-black)">
                {p.v}{trendsConfig.suffix}
              </text>
              <text x={p.x} y={svgH - 6} textAnchor="middle" fontSize={12} fill="var(--chart-neutral-dark)">{trendsLabels[i]}</text>
            </g>
          ))}
          {hasOverlay && overlayPathD && (
            <g>
              <path d={overlayPathD} fill="none" stroke="var(--color-success)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
              {overlayPts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={2} fill="var(--color-success)" stroke="white" strokeWidth={1} />
                  <text x={p.x} y={Math.max(12, p.y - 8)} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-success)">
                    {p.v}{overlayConfig?.suffix ?? ""}
                  </text>
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>
    );
  };

  const trendsGroupByLabel = trendsGroupBy === "period" ? "Period" : trendsGroupBy === "body_shop" ? "Body Shop" : trendsGroupBy === "insurance_company" ? "Insurance" : "Lead Status";

  const trendsTimePeriodLabel = trendsUseCustom
    ? (trendsCustomStart && trendsCustomEnd ? formatDateRange({ key: "custom" }, trendsCustomStart, trendsCustomEnd) : "Custom")
    : (presets.find((p) => p.key === trendsTimePresetKey)?.label ?? "");
  const trendsMetricLabel = trendsConfig.suffix === "%" ? `${trendsConfig.label} %` : trendsConfig.label;
  const overallConvRate = stats.total ? Math.round((stats.rented / stats.total) * 100) : 0;
  const overallSuffix =
    effectiveTrendsMetric === "conversionRate" && stats.total > 0
      ? ` (Overall: ${overallConvRate}%)`
      : "";
  const trendsChartTitle =
    (trendsOverlayMetric
      ? `${trendsMetricLabel} + ${overlayConfig?.label ?? ""} by ${trendsGroupByLabel} over ${trendsTimePeriodLabel}`
      : `${trendsMetricLabel} Grouped By ${trendsGroupByLabel} over ${trendsTimePeriodLabel}`) + overallSuffix;

  const renderTrendsTable = () => {
    if (isStackedView) {
      return (
        <div className="overflow-x-auto rounded-md">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 text-center rounded-tl-md">Period</th>
                {stackedSegmentKeys.map((k) => (
                  <th key={k} className="px-4 py-3 text-center">
                    {k}
                  </th>
                ))}
                <th className="px-4 py-3 text-center rounded-tr-md">Total</th>
              </tr>
            </thead>
            <tbody>
              {trendsChartData.map((row, i) => (
                <tr key={i} className="border-b border-[var(--neutral-100)] hover:bg-[var(--neutral-50)] transition-colors">
                  <td className="py-2 px-4 text-center text-[var(--hertz-black)] font-medium">{row.period}</td>
                  {stackedSegmentKeys.map((k) => (
                    <td key={k} className="py-2 px-4 text-center font-medium" style={{ color: getSegmentColor(k) }}>
                      {(row.segments?.[k] ?? 0)}%
                    </td>
                  ))}
                  <td className="py-2 px-4 text-center font-semibold text-[var(--hertz-black)]">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    const hasOverlay = !!trendsOverlayMetric && overlayConfig && overlayValues.length > 0;
    return (
      <div className="overflow-x-auto rounded-md">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
              <th className="px-4 py-3 text-center rounded-tl-md">{trendsGroupByLabel}</th>
              <th className={`px-4 py-3 text-center ${!hasOverlay ? "rounded-tr-md" : ""}`}>{trendsConfig.label}</th>
              {hasOverlay && (
                <th className="px-4 py-3 text-center rounded-tr-md" style={{ color: "var(--color-success)" }}>{overlayConfig.label}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {trendsChartData.map((d, i) => (
              <tr key={i} className="border-b border-[var(--neutral-100)] hover:bg-[var(--neutral-50)] transition-colors">
                <td className="py-2 px-4 text-center text-[var(--hertz-black)] font-medium">{trendsLabels[i]}</td>
                <td className="py-2 px-4 text-center font-semibold" style={{ color: trendsConfig.color }}>
                  {trendsValues[i]}{trendsConfig.suffix}
                </td>
                {hasOverlay && (
                  <td className="py-2 px-4 text-center font-semibold" style={{ color: "var(--color-success)" }}>
                    {overlayValues[i]}{overlayConfig.suffix}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-[var(--container-max)]">
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
      <AnimatePresence>
        {showSummaryExport && (
          <SummaryExportModal
            onClose={() => setShowSummaryExport(false)}
            leads={leads}
            branchTasks={branchTasks}
            branch={branch}
          />
        )}
      </AnimatePresence>
      {/* Work — Meeting Prep & Leaderboard modules, above Summary */}
      <div id="work" className="scroll-mt-4 mb-4">
        <SectionHeader title="Work" subtitle="Prepare for your weekly meeting and see how you rank." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MeetingPrepModule
            navigateTo={navigateTo}
            leads={leads}
            dateRange={dateRange}
            branch={branch}
            reduceMotion={reduceMotion}
          />
          <LeaderboardModule
            navigateTo={navigateTo}
            leads={leads}
            branch={branch}
            dateRange={dateRange}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>

      <div id="dashboard" data-onboarding="summary" className="scroll-mt-4 mb-4">
      <SectionHeader
        title="Summary"
        subtitle="Key metrics and trends for your branch this period."
        action={
        <motion.button
          whileHover={!reduceMotion ? { scale: 1.05 } : {}}
          whileTap={!reduceMotion ? { scale: 0.95 } : {}}
          onClick={() => setShowSummaryExport(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)] transition-colors cursor-pointer shrink-0"
          title="Export summary as CSV"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
          Export
        </motion.button>
      } />
      <div className="flex items-center gap-2 flex-nowrap mb-4 whitespace-nowrap overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-nowrap">
          {presets.map((p) => {
            const isActive = !useCustom && selectedPresetKey === p.key;
            return (
              <motion.button
                key={p.key}
                onClick={() => { setSelectedPresetKey(p.key); setTrendsTimePresetKey(p.key); setUseCustom(false); setTrendsUseCustom(false); setShowCustomCalendar(false); setTrendsShowCustomCalendar(false); }}
                whileHover={!reduceMotion ? { scale: 1.03 } : {}}
                whileTap={!reduceMotion ? { scale: 0.97 } : {}}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-200 cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)] shadow-[var(--shadow-md)]"
                    : "bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)]"
                }`}
              >
                {p.label}
              </motion.button>
            );
          })}
          <span className="text-[var(--neutral-200)] mx-0.5">|</span>
          <div ref={customAnchorRef} className="relative shrink-0">
            <motion.button
              onClick={() => { setUseCustom(true); setTrendsUseCustom(true); setShowCustomCalendar(true); setTrendsShowCustomCalendar(true); }}
              whileHover={!reduceMotion ? { scale: 1.03 } : {}}
              whileTap={!reduceMotion ? { scale: 0.97 } : {}}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-200 cursor-pointer shrink-0 ${
                useCustom ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)] shadow-[var(--shadow-md)]" : "bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)]"
              }`}
            >
              Custom
            </motion.button>
            <AnimatePresence>
              {showCustomCalendar && (
                <DateRangeCalendar
                  start={customStart}
                  end={customEnd}
                  onChange={({ start: s, end: e }) => { setCustomStart(s); setCustomEnd(e); setTrendsCustomStart(s); setTrendsCustomEnd(e); }}
                  onClose={() => setShowCustomCalendar(false)}
                  anchorRef={customAnchorRef}
                />
              )}
            </AnimatePresence>
          </div>
          {rangeLabel && <span className="text-xs text-[var(--neutral-600)] ml-2 font-medium shrink-0">{rangeLabel}</span>}
        </div>
      </div>

      {/* Rate tiles — click to view underlying data and drivers */}
      <div data-onboarding="metric-drilldown" className="grid grid-cols-3 gap-2 mb-4">
        {rateTiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            {...cardAnim(i + 1, reduceMotion)}
            whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } } : {}}
            onClick={() => setDrilldownMetric(tile.metricKey)}
            title="Click to view underlying data and what's driving changes"
            className="bg-neutral-700 border border-white/20 rounded-lg px-4 py-3 shadow-[var(--shadow-sm)] cursor-pointer group transition-all duration-200 hover:ring-2 hover:ring-[var(--hertz-primary)]/50"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white uppercase tracking-wider">{tile.label}</p>
              <svg className="w-3.5 h-3.5 text-white/70 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xl font-extrabold tracking-tight text-white">{tile.value}</p>
              {comparisonRange != null && (
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    tile.relChange > 0 ? "bg-emerald-400/25 text-emerald-200" : tile.relChange < 0 ? "bg-rose-400/25 text-rose-200" : "bg-white/15 text-white/70"
                  }`}
                >
                  {tile.relChange > 0 ? "↑" : tile.relChange < 0 ? "↓" : "—"}
                  {tile.relChange !== 0 ? `${Math.abs(tile.relChange)}%` : ""}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {/* Secondary tiles: Open Tasks, Task Completion Rate, Average Time for First Contact — click to drill down */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {secondaryTiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            {...cardAnim(4 + i, reduceMotion)}
            whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } } : {}}
            onClick={() => setDrilldownMetric(tile.metricKey)}
            title="Click to view underlying data and what's driving changes"
            className="bg-neutral-700 border border-white/20 rounded-lg px-4 py-3 shadow-[var(--shadow-sm)] cursor-pointer group transition-all duration-200 hover:ring-2 hover:ring-[var(--hertz-primary)]/50"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white uppercase tracking-wider">{tile.label}</p>
              <svg className="w-3.5 h-3.5 text-white/70 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xl font-extrabold tracking-tight text-white">{tile.value}</p>
              {comparisonRange != null && tile.relChange != null && (
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    tile.relChange > 0 ? "bg-emerald-400/25 text-emerald-200" : tile.relChange < 0 ? "bg-rose-400/25 text-rose-200" : "bg-white/15 text-white/70"
                  }`}
                >
                  {tile.lowerIsBetter
                    ? (tile.relChange > 0 ? "↓" : tile.relChange < 0 ? "↑" : "—")
                    : (tile.relChange > 0 ? "↑" : tile.relChange < 0 ? "↓" : "—")}
                  {tile.relChange !== 0 ? `${Math.abs(tile.relChange)}%` : ""}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* View Trends — full view inline under Summary metrics */}
      <motion.div {...cardAnim(3, reduceMotion)} className="mb-4">
        <div className="border border-[var(--neutral-200)] rounded-lg bg-white shadow-[var(--shadow-md)] overflow-hidden" data-onboarding="view-trends">
          <div className="px-5 pt-5 pb-4">
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <div className="shrink-0">
                <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Metric</p>
                <select
                  value={effectiveTrendsMetric}
                  onChange={(e) => setSummaryTrendsMetric(e.target.value)}
                  className="w-[10rem] px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-sm font-medium text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)] cursor-pointer"
                >
                  {summaryTrendsMetricOptions.map(([k, c]) => (
                    <option key={k} value={k}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="shrink-0">
                <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Time filter</p>
                <div className="flex items-center gap-1">
                  <select
                    value={trendsUseCustom ? "custom" : trendsTimePresetKey}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "custom") {
                        setTrendsUseCustom(true);
                        setUseCustom(true);
                        setShowCustomCalendar(true);
                        setTrendsShowCustomCalendar(true);
                      } else {
                        setTrendsUseCustom(false);
                        setUseCustom(false);
                        setTrendsShowCustomCalendar(false);
                        setShowCustomCalendar(false);
                        setTrendsTimePresetKey(v);
                        setSelectedPresetKey(v);
                      }
                    }}
                    className="w-[10rem] px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-sm font-medium text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)] cursor-pointer"
                  >
                    {presets.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  <div ref={trendsCustomAnchorRef} className="relative shrink-0">
                    <AnimatePresence>
                      {trendsUseCustom && trendsShowCustomCalendar && (
                        <DateRangeCalendar
                          start={trendsCustomStart}
                          end={trendsCustomEnd}
                          onChange={({ start: s, end: e }) => { setTrendsCustomStart(s); setTrendsCustomEnd(e); setCustomStart(s); setCustomEnd(e); }}
                          onClose={() => setTrendsShowCustomCalendar(false)}
                          anchorRef={trendsCustomAnchorRef}
                        />
                      )}
                    </AnimatePresence>
                    {trendsUseCustom && (
                      <button
                        type="button"
                        onClick={() => setTrendsShowCustomCalendar((v) => !v)}
                        className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-[var(--neutral-200)] hover:bg-[var(--neutral-100)]"
                      >
                        Pick dates
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Group by</p>
                <select
                  value={trendsGroupBy}
                  onChange={(e) => setTrendsGroupBy(e.target.value)}
                  className="w-[10rem] px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-sm font-medium text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)] cursor-pointer"
                >
                  <option value="period">Period</option>
                  <option value="body_shop">Body Shop</option>
                  <option value="insurance_company">Insurance</option>
                  <option value="status">Lead Status</option>
                </select>
              </div>
              <div className="shrink-0">
                <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Add secondary metric</p>
                <select
                  value={trendsOverlayMetric}
                  onChange={(e) => setTrendsOverlayMetric(e.target.value)}
                  className="w-[10rem] px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-sm font-medium text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)] cursor-pointer"
                  title="Add a secondary data series as a line overlay"
                >
                  {overlayOptions.map((o) => (
                    <option key={o.value || "none"} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="shrink-0 ml-auto">
                <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Chart type</p>
                <div className="flex items-center gap-0.5 rounded-lg border border-[var(--neutral-200)] p-0.5 bg-[var(--neutral-50)]">
                  {trendsChartTypeBtn("bar",
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                    "Bar"
                  )}
                  {!trendsOverlayMetric && trendsGroupBy === "period" && trendsChartTypeBtn("line",
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="4,16 8,10 13,13 20,6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><polyline points="17,6 20,6 20,9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>,
                    "Line"
                  )}
                  {trendsChartTypeBtn("table",
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" /></svg>,
                    "Table"
                  )}
                </div>
              </div>
            </div>
            <div className="border border-[var(--neutral-200)] rounded-lg p-4 bg-[var(--neutral-50)]/30 overflow-visible min-h-[340px]">
              <p className="text-xs font-bold text-[var(--neutral-600)] tracking-wider mb-8">{trendsChartTitle}</p>
              {trendsChartData.length === 0 ? (
                <p className="text-sm text-[var(--neutral-600)] py-8 text-center">
                  {dateRange ? "No data for this time range and branch." : "Select a time range to see the trend."}
                </p>
              ) : summaryTrendsChartType === "bar" ? (
                renderTrendsBarChart()
              ) : summaryTrendsChartType === "line" ? (
                renderTrendsLineChart()
              ) : (
                renderTrendsTable()
              )}
            </div>
          </div>
        </div>
      </motion.div>
      </div>

      {/* My Leads */}
      <div id="lead-pipeline" className="scroll-mt-4 mb-6" data-onboarding="my-leads">
        <SectionHeader title="My Leads" subtitle="All assigned leads — filter, enrich, and take action." action={
          <motion.button
            whileHover={!reduceMotion ? { scale: 1.05 } : {}}
            whileTap={!reduceMotion ? { scale: 0.95 } : {}}
            onClick={() => {
              const rows = filteredBranchLeads.map((lead) => {
                const org = getHierarchyForBranch(lead.branch);
                return leadToHlesRow(lead, org);
              });
              exportLeadsToCSV(rows);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)] transition-colors cursor-pointer shrink-0"
            title="Export filtered leads as CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
            Export
          </motion.button>
        } />
        <div className="flex items-center gap-2 mt-2 mb-3">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--neutral-200)] p-0.5 bg-[var(--neutral-50)]">
            <button
              onClick={() => setLeadsViewMode("table")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                leadsViewMode === "table"
                  ? "bg-white text-[var(--hertz-black)] shadow-sm"
                  : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
              }`}
              title="Table view"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="text-sm font-medium">Table view</span>
            </button>
            <button
              onClick={() => setLeadsViewMode("board")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                leadsViewMode === "board"
                  ? "bg-white text-[var(--hertz-black)] shadow-sm"
                  : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
              }`}
              title="Board view"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span className="text-sm font-medium">Board view</span>
            </button>
          </div>
        </div>
      {/* Search bar */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neutral-400)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={leadsSearchQuery}
          onChange={(e) => setLeadsSearchQuery(e.target.value)}
          placeholder="Search by name or reservation #"
          className="w-full pl-9 pr-8 py-2 border border-[var(--neutral-200)] rounded-lg text-sm text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary-focus)]"
        />
        {leadsSearchQuery && (
          <button
            onClick={() => setLeadsSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-400)] hover:text-[var(--hertz-black)] transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-nowrap mb-4 w-full overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap">Status</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[5rem]"
            value={leadsStatusFilter}
            onChange={(e) => setLeadsStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            {leadsFilterOptions.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap">Insurance</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[5rem]"
            value={leadsInsuranceFilter}
            onChange={(e) => setLeadsInsuranceFilter(e.target.value)}
          >
            <option value="All">All</option>
            {leadsFilterOptions.insuranceCompanies.map((ic) => (
              <option key={ic} value={ic}>{ic}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap" title="Cancel Reason">Reason</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[6rem]"
            value={leadsCancelReasonFilter}
            onChange={(e) => setLeadsCancelReasonFilter(e.target.value)}
          >
            <option value="All">All</option>
            {leadsFilterOptions.cancelReasons.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap">Days</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[5.5rem]"
            value={leadsDaysOpenFilter}
            onChange={(e) => setLeadsDaysOpenFilter(e.target.value)}
          >
            <option value="All">All</option>
            {leadsFilterOptions.daysOpenRanges.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap" title="Time to Contact">Contact</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[5rem]"
            value={leadsTimeToContactFilter}
            onChange={(e) => setLeadsTimeToContactFilter(e.target.value)}
          >
            <option value="All">All</option>
            {leadsFilterOptions.timeToContacts.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap" title="First contact by">Contact By</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[5rem]"
            value={leadsFirstContactByFilter}
            onChange={(e) => setLeadsFirstContactByFilter(e.target.value)}
          >
            <option value="All">All</option>
            {leadsFilterOptions.firstContactBy.map((fc) => (
              <option key={fc} value={fc}>{fc === "none" ? "Not contacted" : fc}</option>
            ))}
          </select>
        </div>
        {(leadsSearchQuery || leadsStatusFilter !== "All" || leadsInsuranceFilter !== "All" || leadsCancelReasonFilter !== "All" || leadsDaysOpenFilter !== "All" || leadsTimeToContactFilter !== "All" || leadsFirstContactByFilter !== "All") && (
          <button
            onClick={() => {
              setLeadsSearchQuery("");
              setLeadsStatusFilter("All");
              setLeadsInsuranceFilter("All");
              setLeadsCancelReasonFilter("All");
              setLeadsDaysOpenFilter("All");
              setLeadsTimeToContactFilter("All");
              setLeadsFirstContactByFilter("All");
              setLeadsSortField(null);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors cursor-pointer shrink-0"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--neutral-600)] shrink-0 whitespace-nowrap">
          {filteredBranchLeads.length} of {branchLeads.length} leads
        </span>
      </div>
      <div className="w-full border border-[var(--neutral-200)] rounded-lg overflow-hidden shadow-[var(--shadow-md)]">
      <AnimatePresence mode="wait">
      {leadsViewMode === "table" ? (
      <motion.div
        key="table"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="overflow-hidden"
      >
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--hertz-black)] text-center text-xs text-white font-semibold uppercase tracking-wider">
              <th className="px-4 py-3 w-[10%] overflow-hidden">Received Date</th>
              <th className="px-4 py-3 w-[11%] overflow-hidden">Confirmation #</th>
              <th className="px-4 py-3 w-[12%] overflow-hidden">Customer</th>
              <th className="px-4 py-3 w-[8%] overflow-hidden cursor-pointer select-none hover:text-[var(--hertz-primary)] transition-colors" onClick={() => handleSortClick("status")}>Status<SortIcon field="status" /></th>
              <th className="px-4 py-3 w-[8%] overflow-hidden cursor-pointer select-none hover:text-[var(--hertz-primary)] transition-colors" onClick={() => handleSortClick("daysOpen")}>Days Open<SortIcon field="daysOpen" /></th>
              <th className="px-4 py-3 w-[11%] overflow-hidden">First Contact Date</th>
              <th className="px-4 py-3 w-[10%] overflow-hidden cursor-pointer select-none hover:text-[var(--hertz-primary)] transition-colors" onClick={() => handleSortClick("timeToFirstContact")}>Time to Contact<SortIcon field="timeToFirstContact" /></th>
              <th className="px-4 py-3 w-[14%] overflow-hidden">Cancel Reason</th>
              <th className="px-4 py-3 w-[16%] overflow-hidden">Comments</th>
            </tr>
          </thead>
          <tbody>
            {filteredBranchLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--hertz-primary)]/10 flex items-center justify-center text-[var(--hertz-primary)]">
                      {branchLeads.length === 0 ? (
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L12 21l-1.006-.503a2.25 2.25 0 01-1.244-2.013v-2.927a2.25 2.25 0 00-.659-1.591L3.659 8.409A2.25 2.25 0 013 6.818V5.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-[var(--hertz-black)] font-bold text-sm mt-1">{branchLeads.length === 0 ? "All caught up" : "No matching leads"}</p>
                    <p className="text-sm text-[var(--neutral-600)] max-w-[240px]">{branchLeads.length === 0 ? "Nothing on your plate — enjoy the calm." : "Try widening your filters to see more results."}</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayLeads.map((lead, i) => {
                const org = getHierarchyForBranch(lead.branch);
                const row = leadToHlesRow(lead, org);
                const isClosedRented = lead.status === "Rented" && lead.enrichmentComplete;
                return (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    data-onboarding={i === 0 ? "lead-row" : undefined}
                    className={`border-t border-[var(--neutral-200)] cursor-pointer hover:bg-[var(--neutral-50)] transition-colors duration-150 ${
                      isClosedRented ? "bg-[var(--neutral-100)] text-[var(--neutral-500)] [&_td]:line-through" : ""
                    }`}
                    onClick={() => {
                      selectLead(lead.id);
                      navigateTo("bm-lead-detail");
                      window.dispatchEvent(new CustomEvent("onboarding:action", { detail: { actionType: "click_lead" } }));
                    }}
                  >
                    <td className="px-4 py-3 text-center text-sm text-[var(--neutral-600)] whitespace-nowrap min-w-0 overflow-hidden">{row.INIT_DT_FINAL}</td>
                    <td className="px-4 py-3 text-center text-sm text-[var(--hertz-black)] font-medium whitespace-nowrap min-w-0 overflow-hidden">{row.CONFIRM_NUM}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-[var(--hertz-black)] min-w-0 overflow-hidden">
                      <span className="flex items-center justify-center gap-1.5 truncate" title={row.RENTER_LAST}>
                        {row.RENTER_LAST}
                        {lead.gmDirective && (
                          <span className="inline-flex items-center shrink-0 w-4 h-4 rounded-full bg-[var(--color-info)] text-white" title={`GM Directive: ${lead.gmDirective}`}>
                            <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center min-w-0 overflow-hidden"><StatusBadge status={row.STATUS} /></td>
                    <td className="px-4 py-3 text-center text-sm min-w-0 overflow-hidden">
                      <span className={`font-medium ${
                        (lead.daysOpen ?? 0) >= 8 ? "text-[var(--color-error)]" :
                        (lead.daysOpen ?? 0) >= 4 ? "text-[var(--color-warning)]" :
                        "text-[var(--color-success)]"
                      }`}>{row.DAYS_OPEN}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-[var(--neutral-600)] whitespace-nowrap min-w-0 overflow-hidden">{row.DT_FROM_ALPHA1}</td>
                    <td className="px-4 py-3 text-center text-sm min-w-0 overflow-hidden">
                      <span className={`font-medium ${
                        lead.contactRange === "(a)<30min" ? "text-[var(--color-success)]" :
                        lead.contactRange === "NO CONTACT" || lead.contactRange === "(g)24-48 hrs" ? "text-[var(--color-error)]" :
                        lead.contactRange === "(b)31min-1hr" || lead.contactRange === "(c)1-3 hrs" ? "text-[var(--color-warning)]" :
                        "text-[var(--neutral-600)]"
                      }`}>{row.TIME_TO_CONTACT}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-[var(--neutral-600)] min-w-0 overflow-hidden">
                      <span className="block truncate" title={row.CANCEL_REASON}>{row.CANCEL_REASON}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-[var(--neutral-600)] min-w-0 overflow-hidden">
                      <span className="block truncate" title={row.COMMENTS}>{row.COMMENTS}</span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>
      ) : (
      <motion.div
        key="board"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="overflow-hidden p-4"
      >
        {filteredBranchLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-[var(--hertz-primary)]/10 flex items-center justify-center text-[var(--hertz-primary)]">
              {branchLeads.length === 0 ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L12 21l-1.006-.503a2.25 2.25 0 01-1.244-2.013v-2.927a2.25 2.25 0 00-.659-1.591L3.659 8.409A2.25 2.25 0 013 6.818V5.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
              )}
            </div>
            <p className="text-[var(--hertz-black)] font-bold text-sm mt-3">{branchLeads.length === 0 ? "All caught up" : "No matching leads"}</p>
            <p className="text-sm text-[var(--neutral-600)] max-w-[240px] text-center">{branchLeads.length === 0 ? "Nothing on your plate — enjoy the calm." : "Try widening your filters to see more results."}</p>
          </div>
        ) : (
          <LeadsBoardView
            leads={displayLeads}
            onLeadClick={(lead) => {
              selectLead(lead.id);
              navigateTo("bm-lead-detail");
              window.dispatchEvent(new CustomEvent("onboarding:action", { detail: { actionType: "click_lead" } }));
            }}
            getHierarchyForBranch={getHierarchyForBranch}
            onStatusChange={updateLeadEnrichment}
          />
        )}
      </motion.div>
      )}
      </AnimatePresence>
      {(hasMoreLeads || leadsExpanded) && (
        <motion.button
          whileHover={!reduceMotion ? { scale: 1.01 } : {}}
          whileTap={!reduceMotion ? { scale: 0.99 } : {}}
          onClick={() => setLeadsExpanded(!leadsExpanded)}
          className="w-full py-3 text-sm font-medium text-[var(--neutral-600)] bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] transition-colors border-t border-[var(--neutral-200)]"
        >
          {leadsExpanded ? "Show less" : `View all (${filteredBranchLeads.length} leads)`}
        </motion.button>
      )}
      </div>
      </div>

      <AnimatePresence>
        {showCreateTask && (
          <CreateTaskModal
            onSubmit={handleCreateTask}
            onCancel={() => setShowCreateTask(false)}
            branch={branch}
            branchLeads={branchLeads}
            userProfile={userProfile}
          />
        )}
      </AnimatePresence>
      {/* Open Tasks */}
      <div id="open-tasks" className="scroll-mt-4 mb-6">
      <SectionHeader title="Open Tasks" subtitle="Track outstanding items and follow-ups." action={
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={!reduceMotion ? { scale: 1.05 } : {}}
            whileTap={!reduceMotion ? { scale: 0.95 } : {}}
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--hertz-primary)] text-[var(--hertz-black)] hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer shrink-0"
            title="Create a new task"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Task
          </motion.button>
          <motion.button
            whileHover={!reduceMotion ? { scale: 1.05 } : {}}
            whileTap={!reduceMotion ? { scale: 0.95 } : {}}
            onClick={() => {
              exportTasksToCSV(filteredBranchTasks, (id) => getLeadById(leads ?? [], id));
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)] transition-colors cursor-pointer shrink-0"
            title="Export filtered tasks as CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
            Export
          </motion.button>
        </div>
      } />
      {/* Task filter bar */}
      <div className="flex items-center gap-2 flex-nowrap mb-4 w-full overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap">Status</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[5rem]"
            value={tasksStatusFilter}
            onChange={(e) => setTasksStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            {tasksFilterOptions.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap">Priority</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[5rem]"
            value={tasksPriorityFilter}
            onChange={(e) => setTasksPriorityFilter(e.target.value)}
          >
            <option value="All">All</option>
            {tasksFilterOptions.priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-[var(--neutral-600)] font-medium whitespace-nowrap">Due Date</label>
          <select
            className="px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-xs text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] min-w-[6rem]"
            value={tasksDueDateFilter}
            onChange={(e) => setTasksDueDateFilter(e.target.value)}
          >
            <option value="All">All</option>
            {tasksFilterOptions.dueDateRanges.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        {(tasksStatusFilter !== "All" || tasksPriorityFilter !== "All" || tasksDueDateFilter !== "All") && (
          <button
            onClick={() => {
              setTasksStatusFilter("All");
              setTasksPriorityFilter("All");
              setTasksDueDateFilter("All");
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors cursor-pointer shrink-0"
          >
            Clear
          </button>
        )}
      </div>
      <div className="w-full border border-[var(--neutral-200)] rounded-lg overflow-hidden shadow-[var(--shadow-md)]">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--hertz-black)] text-center text-xs text-white font-semibold uppercase tracking-wider">
              <th className="px-4 py-3 w-12 overflow-hidden" title="Complete">
                <span className="sr-only">Done</span>
              </th>
              <th className="px-4 py-3 w-[14%] whitespace-nowrap overflow-hidden">Confirmation #</th>
              <th className="px-4 py-3 w-[38%] overflow-hidden">Title</th>
              <th className="px-4 py-3 w-[9%] whitespace-nowrap overflow-hidden">Due Date</th>
              <th className="px-4 py-3 w-[10%] whitespace-nowrap overflow-hidden">Priority</th>
              <th className="px-4 py-3 w-[11%] whitespace-nowrap overflow-hidden">Task Status</th>
              <th className="px-4 py-3 w-[18%] whitespace-nowrap overflow-hidden">Task Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredBranchTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--color-success)]/10 flex items-center justify-center text-[var(--color-success)]">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 011.65 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
                      </svg>
                    </div>
                    <p className="text-[var(--hertz-black)] font-bold text-sm mt-1">{branchTasks.length === 0 ? "All tasks done" : "No matching tasks"}</p>
                    <p className="text-sm text-[var(--neutral-600)] max-w-[220px]">{branchTasks.length === 0 ? "Your task list is clear. Great job staying on top of things." : "Try widening your filters to see more results."}</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayTasks.map((task, i) => {
                const isDone = task.status === "Done";
                const confirmationNum = task.lead?.reservationId ?? getLeadById(leads ?? [], task.leadId)?.reservationId ?? "—";
                const handleCheckboxClick = (e) => {
                  e.stopPropagation();
                  const newStatus = isDone ? "Open" : "Done";
                  if (useSupabase && updateTaskStatus) {
                    updateTaskStatus(task.id, newStatus).then(() => {
                      fetchTasksForBranch(branch).then(setBranchTasks).catch(() => {});
                    });
                  } else {
                    setBranchTasks((prev) =>
                      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
                    );
                  }
                };
                return (
                  <motion.tr
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => { selectTask?.(task.id); navigateTo("bm-task-detail"); }}
                    className={`border-t border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] transition-colors duration-150 cursor-pointer ${
                      isDone ? "bg-[var(--neutral-100)] text-[var(--neutral-500)] [&_td:nth-child(n+2)]:line-through" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-center w-12 min-w-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={handleCheckboxClick}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0 mx-auto ${
                          isDone
                            ? "bg-[var(--color-success)] border-[var(--color-success)] text-white"
                            : "border-[var(--neutral-300)] hover:border-[var(--neutral-400)]"
                        }`}
                        aria-label={isDone ? "Mark as open" : "Mark as done"}
                        title={isDone ? "Mark as open" : "Mark as done"}
                      >
                        {isDone && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-[var(--neutral-600)] font-mono min-w-0 overflow-hidden">
                      <span className="block truncate" title={confirmationNum}>{confirmationNum}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold min-w-0 overflow-hidden">
                      <span className="block truncate" title={task.title}>{task.title}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm whitespace-nowrap text-[var(--neutral-600)] min-w-0 overflow-hidden">{task.dueDate ?? "—"}</td>
                    <td className="px-4 py-3 text-center min-w-0 overflow-hidden">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                        task.priority === "High" ? "bg-amber-100 text-amber-800" :
                        "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
                      }`}>
                        {task.priority ?? "Medium"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center min-w-0 overflow-hidden">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--neutral-200)] text-[var(--neutral-600)] whitespace-nowrap">
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-[var(--neutral-600)] min-w-0 overflow-hidden">
                      <span className="block truncate" title={task.notes ?? task.notesLog?.[0]?.note ?? ""}>
                        {task.notes ?? task.notesLog?.[0]?.note ?? "—"}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
        {(hasMoreTasks || tasksExpanded) && (
          <motion.button
            whileHover={!reduceMotion ? { scale: 1.01 } : {}}
            whileTap={!reduceMotion ? { scale: 0.99 } : {}}
            onClick={() => setTasksExpanded(!tasksExpanded)}
            className="w-full py-3 text-sm font-medium text-[var(--neutral-600)] bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] transition-colors border-t border-[var(--neutral-200)]"
          >
            {tasksExpanded ? "Show less" : `View all (${filteredBranchTasks.length} tasks)`}
          </motion.button>
        )}
      </div>
    </div>
    </div>
  );
}

export function BMDashboardInbox({ navigateTo, selectLead }) {
  const { leads } = useData();
  const directiveLeads = getAllLeads(leads).filter((l) => l.gmDirective);

  const handleClick = (lead) => {
    selectLead(lead.id);
    navigateTo("bm-lead-detail");
  };

  return (
    <>
      <SectionHeader title="Inbox" subtitle="GM directives tied to specific reservations — click a row to review and take action." />
      <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden shadow-[var(--shadow-md)] max-h-[28rem] overflow-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-[var(--hertz-black)] text-left text-xs text-white font-semibold uppercase tracking-wider">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Reservation ID</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Days Open</th>
              <th className="px-4 py-3">GM Directive</th>
            </tr>
          </thead>
          <tbody>
            {directiveLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--hertz-primary)]/10 flex items-center justify-center text-[var(--hertz-primary)]">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z" />
                      </svg>
                    </div>
                    <p className="text-[var(--hertz-black)] font-bold text-sm mt-1">Inbox zero</p>
                    <p className="text-sm text-[var(--neutral-600)]">No GM directives right now — you're all set.</p>
                  </div>
                </td>
              </tr>
            ) : (
              directiveLeads.map((lead, i) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleClick(lead)}
                  className="border-t border-[var(--neutral-200)] cursor-pointer hover:bg-[var(--neutral-50)] transition-colors duration-150"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--hertz-black)]">{lead.customer}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[var(--neutral-600)]">{lead.reservationId}</td>
                  <td className="px-4 py-3 text-sm text-[var(--neutral-600)]">{lead.branch}</td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3 text-sm text-[var(--neutral-600)]">{lead.daysOpen}d</td>
                  <td className="px-4 py-3 text-sm text-[var(--neutral-600)] min-w-[200px] max-w-[320px] break-words whitespace-normal">{lead.gmDirective}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** GM chart table — same structure as BM Summary table. */
function GMChartTable({ trendsChartData, isStackedView, trendsGroupByLabel, trendsConfig, trendsValues, trendsLabels, trendsOverlayMetric, overlayConfig, overlayValues, stackedSegmentKeys, getSegmentColor }) {
  if (isStackedView) {
    return (
      <div className="overflow-x-auto rounded-md">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
              <th className="px-4 py-3 text-center rounded-tl-md">Period</th>
              {stackedSegmentKeys.map((k) => (
                <th key={k} className="px-4 py-3 text-center">{k}</th>
              ))}
              <th className="px-4 py-3 text-center rounded-tr-md">Total</th>
            </tr>
          </thead>
          <tbody>
            {trendsChartData.map((row, i) => (
              <tr key={i} className="border-b border-[var(--neutral-100)] hover:bg-[var(--neutral-50)] transition-colors">
                <td className="py-2 px-4 text-center text-[var(--hertz-black)] font-medium">{row.period}</td>
                {stackedSegmentKeys.map((k) => (
                  <td key={k} className="py-2 px-4 text-center font-medium" style={{ color: getSegmentColor(k) }}>
                    {(row.segments?.[k] ?? 0)}%
                  </td>
                ))}
                <td className="py-2 px-4 text-center font-semibold text-[var(--hertz-black)]">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const hasOverlay = !!trendsOverlayMetric && overlayConfig && overlayValues.length > 0;
  return (
    <div className="overflow-x-auto rounded-md">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
            <th className="px-4 py-3 text-center rounded-tl-md">{trendsGroupByLabel}</th>
            <th className={`px-4 py-3 text-center ${!hasOverlay ? "rounded-tr-md" : ""}`}>{trendsConfig.label}</th>
            {hasOverlay && (
              <th className="px-4 py-3 text-center rounded-tr-md" style={{ color: "var(--color-success)" }}>{overlayConfig.label}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {trendsChartData.map((d, i) => (
            <tr key={i} className="border-b border-[var(--neutral-100)] hover:bg-[var(--neutral-50)] transition-colors">
              <td className="py-2 px-4 text-center text-[var(--hertz-black)] font-medium">{trendsLabels[i]}</td>
              <td className="py-2 px-4 text-center font-semibold" style={{ color: trendsConfig.color }}>
                {trendsValues[i]}{trendsConfig.suffix}
              </td>
              {hasOverlay && (
                <td className="py-2 px-4 text-center font-semibold" style={{ color: "var(--color-success)" }}>
                  {overlayValues[i]}{overlayConfig.suffix}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** GM chart bar — same logic/design as BM Summary bar chart (stacked + non-stacked, with overlay). */
function GMChartBar({
  trendsChartData, isStackedView, trendsConfig, effectiveTrendsMetric, trendsValues, trendsLabels, trendsMax,
  trendsOverlayMetric, overlayConfig, overlayValues, overlayMax, stackedSegmentKeys,
  getSegmentColor, getStackedBarLabel, stackedBarTooltip, setStackedBarTooltip,
  chartOverlayTooltip, setChartOverlayTooltip, chartBarTooltip, setChartBarTooltip, reduceMotion,
}) {
  const AXIS_GAP = 12;
  if (isStackedView) {
    const stackedHasOverlay = !!trendsOverlayMetric && overlayValues.length > 0;
    const stackedN = trendsChartData.length;
    const stackedPadR = stackedHasOverlay ? 40 : 0;
    const isCountMetric = effectiveTrendsMetric === "leadPipeline" || effectiveTrendsMetric === "openTasks";
    const stackedMaxTotal = isCountMetric ? Math.max(...trendsChartData.map((d) => d.total ?? 0), 1) : 100;
    const niceMax = isCountMetric ? (stackedMaxTotal <= 4 ? 4 : stackedMaxTotal <= 8 ? 8 : stackedMaxTotal <= 12 ? 12 : Math.ceil(stackedMaxTotal / 5) * 5) : 100;
    const yTickCount = 5;
    const yTicks = Array.from({ length: yTickCount }, (_, i) => Math.round((niceMax * i) / (yTickCount - 1)));
    const STACKED_CHART_HEIGHT = 260;
    const STACKED_OVERLAY_INSET = 6;
    const stackedPlotHeightPx = STACKED_CHART_HEIGHT - STACKED_OVERLAY_INSET * 2;
    const stackedBarTopPercents = trendsChartData.map((row) =>
      isCountMetric ? (row.total / niceMax) * 100 : Object.values(row.segments ?? {}).reduce((s, v) => s + v, 0)
    );
    const stackedOverlayPercents = stackedHasOverlay ? overlayValues.map((v) => (overlayMax > 0 ? (v / overlayMax) * 100 : 0)) : [];
    const stackedOverlayLabelOffsets = stackedHasOverlay
      ? computeOverlayLabelOffsets({
          overlayPercents: stackedOverlayPercents,
          barPercents: stackedBarTopPercents,
          chartHeightPx: stackedPlotHeightPx,
        })
      : [];
    return (
      <div>
        <div className="flex items-center pt-1 pb-9">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {stackedSegmentKeys.map((k) => (
              <div key={k} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: getSegmentColor(k), borderRadius: 0 }} />
                <span className="text-xs font-medium text-[var(--neutral-600)]">{k}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex" style={{ height: 260, gap: AXIS_GAP }}>
          <div className="flex flex-col justify-between shrink-0 py-0.5 text-right" style={{ width: 36, paddingRight: AXIS_GAP }}>
            {[...yTicks].reverse().map((val) => (
              <span key={val} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{isCountMetric ? "" : "%"}</span>
            ))}
          </div>
          <div className="flex flex-1 min-w-0">
            <div className="flex-1 relative border-l border-[var(--neutral-200)]" style={{ paddingRight: stackedPadR }}>
              <div className="absolute inset-0 z-0 pointer-events-none">
                {yTicks.map((val) => (
                  <div key={val} className="absolute left-0 right-0 border-t border-[var(--neutral-200)]" style={{ top: `${100 - (val / niceMax) * 100}%`, height: 0 }} />
                ))}
              </div>
              <div className="grid absolute inset-0 z-10 h-full" style={{ gridTemplateColumns: `repeat(${stackedN}, 1fr)`, gap: 4, right: stackedPadR, paddingLeft: AXIS_GAP, paddingRight: AXIS_GAP }}>
                {trendsChartData.map((row, i) => {
                  const totalBarPct = isCountMetric ? (row.total / niceMax) * 100 : Object.values(row.segments ?? {}).reduce((s, v) => s + v, 0);
                  return (
                    <div key={i} className="flex flex-col items-center h-full relative">
                      <span className="absolute left-1/2 z-10 text-xs font-semibold text-[var(--neutral-700)] whitespace-nowrap pointer-events-none" style={{ bottom: `${totalBarPct}%`, transform: "translateX(-50%)", marginBottom: 2 }}>
                        {getStackedBarLabel(row)}
                      </span>
                      <div className="flex-1 w-full flex flex-col-reverse items-center relative" style={{ width: "70%", maxWidth: 48 }}>
                        {stackedSegmentKeys.map((k) => {
                          const count = row.raw?.[k] ?? 0;
                          const pct = row.segments?.[k] ?? 0;
                          if (count <= 0 && pct <= 0) return null;
                          const heightPct = isCountMetric ? (count / niceMax) * 100 : pct;
                          return (
                            <motion.div
                              key={k}
                              initial={{ height: 0 }}
                              animate={{ height: `${heightPct}%` }}
                              transition={{ delay: i * 0.03, duration: reduceMotion ? 0.01 : 0.3, ease: "easeOut" }}
                              className="w-full min-h-[2px] cursor-default"
                              style={{ backgroundColor: getSegmentColor(k), borderRadius: 0 }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setStackedBarTooltip({ period: trendsLabels[i] ?? row.period ?? "", hoveredSegment: k, raw: row.raw, segments: row.segments, total: row.total, x: rect.left + rect.width / 2, y: rect.top });
                              }}
                              onMouseLeave={() => setStackedBarTooltip(null)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {stackedHasOverlay && (() => {
                const OVERLAY_INSET = STACKED_OVERLAY_INSET;
                const bottomPct = (val) => overlayMax > 0 ? (val / overlayMax) * 100 : 0;
                return (
                  <div className="absolute z-20 pointer-events-none" style={{ top: OVERLAY_INSET, bottom: OVERLAY_INSET, left: AXIS_GAP, right: stackedPadR + AXIS_GAP }}>
                    {stackedN > 1 && (
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polyline
                          fill="none"
                          stroke="var(--color-success)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          points={overlayValues.map((val, i) => {
                            const x = ((i + 0.5) / stackedN) * 100;
                            const y = 100 - bottomPct(val);
                            return `${x},${y}`;
                          }).join(" ")}
                        />
                      </svg>
                    )}
                    {overlayValues.map((v, i) => {
                      const leftPct = ((i + 0.5) / stackedN) * 100;
                      const bPct = bottomPct(v);
                      const label = trendsLabels[i] ?? "";
                      return (
                        <div key={i} className="absolute pointer-events-auto cursor-pointer" style={{ left: `${leftPct}%`, bottom: `${bPct}%`, transform: "translate(-50%, 50%)" }}
                          onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setChartOverlayTooltip({ period: label, value: v, suffix: overlayConfig?.suffix ?? "", x: rect.left + rect.width / 2, y: rect.top }); }}
                          onMouseLeave={() => setChartOverlayTooltip(null)}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-white shadow-sm relative">
                            <span
                              className="absolute bottom-full left-1/2 -translate-x-1/2 text-xs font-bold text-[var(--color-success)] whitespace-nowrap pointer-events-none"
                              style={{ marginBottom: `${4 + (stackedOverlayLabelOffsets[i] ?? 0)}px` }}
                            >
                              {v}{overlayConfig?.suffix ?? ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            {stackedHasOverlay && (
              <div className="flex flex-col justify-between shrink-0 border-l border-[var(--neutral-200)]" style={{ width: 36, paddingTop: 6, paddingBottom: 6, paddingLeft: AXIS_GAP }}>
                {[0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(overlayMax * f)).reverse().map((val, idx) => (
                  <span key={idx} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{overlayConfig?.suffix ?? ""}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        {stackedBarTooltip && (
          <div className="fixed z-50 px-3 py-2 bg-[var(--hertz-black)] text-white text-xs font-medium rounded shadow-lg pointer-events-none" style={{ left: stackedBarTooltip.x, top: stackedBarTooltip.y - 8, transform: "translate(-50%, -100%)" }}>
            {stackedBarTooltip.period && <div className="font-semibold mb-1">{stackedBarTooltip.period}</div>}
            <div className="space-y-0.5">
              {stackedSegmentKeys.map((k) => {
                const count = stackedBarTooltip.raw?.[k] ?? 0;
                const pct = stackedBarTooltip.segments?.[k] ?? 0;
                if (count <= 0 && pct <= 0) return null;
                return (
                  <div key={k} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 shrink-0" style={{ backgroundColor: getSegmentColor(k) }} />
                    <span>{k}: {count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-1 pt-1 border-t border-white/20 text-xs opacity-70">Total: {stackedBarTooltip.total}</div>
          </div>
        )}
        {chartOverlayTooltip && (
          <div className="fixed z-50 px-2.5 py-1.5 bg-[var(--hertz-black)] text-white text-xs font-medium rounded shadow-lg pointer-events-none" style={{ left: chartOverlayTooltip.x, top: chartOverlayTooltip.y - 8, transform: "translate(-50%, -100%)" }}>
            <div className="font-semibold">{chartOverlayTooltip.period}</div>
            <div className="text-xs opacity-90 text-[var(--color-success)]">{overlayConfig?.label ?? ""}: {chartOverlayTooltip.value}{chartOverlayTooltip.suffix}</div>
          </div>
        )}
        <div className="flex pt-2 mt-1 border-t border-[var(--neutral-200)]" style={{ gap: AXIS_GAP }}>
          <div style={{ width: 36 }} />
          <div className="flex flex-1 min-w-0">
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${trendsLabels.length}, 1fr)`, gap: 4, paddingLeft: AXIS_GAP, paddingRight: stackedPadR + AXIS_GAP }}>
              {trendsLabels.map((l, i) => (
                <span key={i} className="block w-full text-center text-xs text-[var(--neutral-500)] truncate">{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const yTickValues = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(trendsMax * f));
  const hasOverlay = !!trendsOverlayMetric && overlayValues.length > 0;
  const n = trendsValues.length;
  const padR = hasOverlay ? 40 : 0;
  const overlayTickValues = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(overlayMax * f));
  const NONSTACKED_CHART_HEIGHT = 280;
  const NONSTACKED_OVERLAY_INSET = 6;
  const nonStackedPlotHeightPx = NONSTACKED_CHART_HEIGHT - NONSTACKED_OVERLAY_INSET * 2;
  const nonStackedBarTopPercents = trendsValues.map((v) => (trendsMax > 0 ? Math.min(100, (v / trendsMax) * 100) : 0));
  const nonStackedOverlayPercents = hasOverlay ? overlayValues.map((v) => (overlayMax > 0 ? (v / overlayMax) * 100 : 0)) : [];
  const nonStackedOverlayLabelOffsets = hasOverlay
    ? computeOverlayLabelOffsets({
        overlayPercents: nonStackedOverlayPercents,
        barPercents: nonStackedBarTopPercents,
        chartHeightPx: nonStackedPlotHeightPx,
      })
    : [];
  return (
    <div>
      <div className="flex" style={{ height: 280, gap: AXIS_GAP }}>
        <div className="flex flex-col justify-between shrink-0 py-0.5 text-right" style={{ width: 36, paddingRight: AXIS_GAP }}>
          {[...yTickValues].reverse().map((val) => (
            <span key={val} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{trendsConfig.suffix}</span>
          ))}
        </div>
        <div className="flex flex-1 min-w-0">
          <div className="flex-1 relative border-l border-[var(--neutral-200)]" style={{ minHeight: 260, paddingRight: padR }}>
            <div className="absolute inset-0 grid z-10" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 4, right: padR, paddingLeft: AXIS_GAP, paddingRight: AXIS_GAP }}>
              {trendsValues.map((v, i) => {
                const barHeightPct = trendsMax > 0 ? Math.min(100, (v / trendsMax) * 100) : 0;
                return (
                  <div key={i} className="flex flex-col justify-end items-center h-full cursor-pointer relative"
                    onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setChartBarTooltip({ label: trendsLabels[i] ?? "", value: v, suffix: trendsConfig.suffix, x: rect.left + rect.width / 2, y: rect.top }); }}
                    onMouseLeave={() => setChartBarTooltip(null)}
                  >
                    <span className="absolute left-1/2 z-10 text-xs font-semibold text-[var(--neutral-700)] whitespace-nowrap pointer-events-none" style={{ bottom: `${barHeightPct}%`, transform: "translateX(-50%)", marginBottom: 2 }}>{v}{trendsConfig.suffix}</span>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${barHeightPct}%` }} transition={{ delay: i * 0.05, duration: reduceMotion ? 0.01 : 0.3, ease: "easeOut" }}
                      className="rounded-none w-[70%] max-w-[48px] self-center" style={{ backgroundColor: trendsConfig.color, opacity: i === trendsValues.length - 1 ? 1 : 0.7, minHeight: 0 }} />
                  </div>
                );
              })}
            </div>
            {hasOverlay && (() => {
              const OVERLAY_INSET = NONSTACKED_OVERLAY_INSET;
              const bottomPct = (val) => overlayMax > 0 ? (val / overlayMax) * 100 : 0;
              return (
                <div className="absolute z-20 pointer-events-none" style={{ top: OVERLAY_INSET, bottom: OVERLAY_INSET, left: AXIS_GAP, right: padR + AXIS_GAP }}>
                  {n > 1 && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="var(--color-success)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        points={overlayValues.map((val, i) => {
                          const x = ((i + 0.5) / n) * 100;
                          const y = 100 - bottomPct(val);
                          return `${x},${y}`;
                        }).join(" ")}
                      />
                    </svg>
                  )}
                  {overlayValues.map((v, i) => {
                    const leftPct = ((i + 0.5) / n) * 100;
                    const bPct = bottomPct(v);
                    return (
                      <div key={i} className="absolute pointer-events-auto cursor-pointer" style={{ left: `${leftPct}%`, bottom: `${bPct}%`, transform: "translate(-50%, 50%)" }}
                        onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setChartOverlayTooltip({ period: trendsLabels[i] ?? "", value: v, suffix: overlayConfig?.suffix ?? "", x: rect.left + rect.width / 2, y: rect.top }); }}
                        onMouseLeave={() => setChartOverlayTooltip(null)}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-white shadow-sm relative">
                          <span
                            className="absolute bottom-full left-1/2 -translate-x-1/2 text-xs font-bold text-[var(--color-success)] whitespace-nowrap pointer-events-none"
                            style={{ marginBottom: `${4 + (nonStackedOverlayLabelOffsets[i] ?? 0)}px` }}
                          >
                            {v}{overlayConfig?.suffix ?? ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          {hasOverlay && (
            <div className="flex flex-col justify-between shrink-0 border-l border-[var(--neutral-200)]" style={{ width: 36, paddingTop: 6, paddingBottom: 6, paddingLeft: AXIS_GAP }}>
              {[...overlayTickValues].reverse().map((val) => (
                <span key={val} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{overlayConfig?.suffix ?? ""}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex pt-2 mt-1 border-t border-[var(--neutral-200)]" style={{ gap: AXIS_GAP }}>
        <div style={{ width: 36 }} />
        <div className="flex flex-1 min-w-0">
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 4, paddingLeft: AXIS_GAP, paddingRight: padR + AXIS_GAP }}>
            {trendsLabels.map((l, i) => (
              <span key={i} className="block w-full text-center text-xs text-[var(--neutral-500)] truncate">{l}</span>
            ))}
          </div>
        </div>
      </div>
      {chartBarTooltip && (
        <div className="fixed z-50 px-2.5 py-1.5 bg-[var(--hertz-black)] text-white text-xs font-medium rounded shadow-lg pointer-events-none" style={{ left: chartBarTooltip.x, top: chartBarTooltip.y - 8, transform: "translate(-50%, -100%)" }}>
          <div className="font-semibold">{chartBarTooltip.label}</div>
          <div className="text-xs opacity-90">{trendsConfig.label}: {chartBarTooltip.value}{chartBarTooltip.suffix}</div>
        </div>
      )}
      {chartOverlayTooltip && (
        <div className="fixed z-50 px-2.5 py-1.5 bg-[var(--hertz-black)] text-white text-xs font-medium rounded shadow-lg pointer-events-none" style={{ left: chartOverlayTooltip.x, top: chartOverlayTooltip.y - 8, transform: "translate(-50%, -100%)" }}>
          <div className="font-semibold">{chartOverlayTooltip.period}</div>
          <div className="text-xs opacity-90 text-[var(--color-success)]">{overlayConfig?.label ?? ""}: {chartOverlayTooltip.value}{chartOverlayTooltip.suffix}</div>
        </div>
      )}
    </div>
  );
}

/** GM chart line — same logic/design as BM Summary line chart. */
function GMChartLine({ trendsChartData, isStackedView, trendsConfig, trendsValues, trendsLabels, trendsMax, trendsOverlayMetric, overlayConfig, overlayValues, overlayMax, stackedSegmentKeys, getSegmentColor, reduceMotion }) {
  const svgW = 560, svgH = 300;
  const pad = { t: 28, r: 25, b: 32, l: 42 };
  const plotW = svgW - pad.l - pad.r;
  const plotH = svgH - pad.t - pad.b;
  const n = trendsChartData.length;
  if (isStackedView) {
    const paths = stackedSegmentKeys.map((k, segIdx) => {
      const pts = trendsChartData.map((row, i) => {
        const pct = row.segments?.[k] ?? 0;
        const prevPct = stackedSegmentKeys.slice(0, segIdx).reduce((s, kk) => s + (row.segments?.[kk] ?? 0), 0);
        const yFromBottom = prevPct + pct;
        const y = pad.t + plotH - (yFromBottom / 100) * plotH;
        const x = n > 1 ? pad.l + (i / (n - 1)) * plotW : pad.l + plotW / 2;
        return { x, y, pct };
      });
      const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
      const areaD = n > 1 ? `${pathD} L${pts[n - 1].x},${pad.t + plotH} L${pts[0].x},${pad.t + plotH} Z` : "";
      return { pathD, areaD, color: getSegmentColor(k), key: k };
    });
    const stackedLineHasOverlay = !!trendsOverlayMetric && overlayValues.length > 0;
    const stackedLinePadR = stackedLineHasOverlay ? 40 : 0;
    const overlayPtsStacked = stackedLineHasOverlay ? overlayValues.map((v, i) => ({
      x: pad.l + (overlayValues.length > 1 ? (i / (overlayValues.length - 1)) * plotW : plotW / 2),
      y: pad.t + plotH - (overlayMax > 0 ? (v / overlayMax) * plotH : 0),
      v,
    })) : [];
    const overlayPathDStacked = overlayPtsStacked.length > 1 ? overlayPtsStacked.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") : "";
    return (
      <div>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full overflow-visible" style={{ maxHeight: 320 }}>
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="var(--neutral-300)" strokeWidth={1} />
          {[0, 25, 50, 75, 100].map((frac) => {
            const y = pad.t + plotH - (frac / 100) * plotH;
            return (
              <g key={frac}>
                <line x1={pad.l} y1={y} x2={stackedLineHasOverlay ? svgW - pad.r : svgW - pad.r - stackedLinePadR} y2={y} stroke="var(--neutral-200)" strokeWidth={0.5} strokeDasharray="2,2" />
                <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={12} fill="var(--chart-neutral-dark)">{frac}%</text>
              </g>
            );
          })}
          {stackedLineHasOverlay && [0, 25, 50, 75, 100].map((frac) => {
            const y = pad.t + plotH * (1 - frac / 100);
            const val = Math.round(overlayMax * frac / 100);
            return <text key={`ov-${frac}`} x={svgW - pad.r + 6} y={y + 3} textAnchor="start" fontSize={12} fill="var(--chart-neutral-dark)">{val}{overlayConfig?.suffix ?? ""}</text>;
          })}
          {paths.map(({ areaD, pathD, color, key }) => (
            <g key={key}>
              {areaD && <path d={areaD} fill={color} opacity={0.6} />}
              <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
          {stackedLineHasOverlay && overlayPathDStacked && (
            <g>
              <path d={overlayPathDStacked} fill="none" stroke="var(--color-success)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
              {overlayPtsStacked.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={2} fill="var(--color-success)" stroke="white" strokeWidth={1} />
                  <text x={p.x} y={Math.max(12, p.y - 8)} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-success)">{p.v}{overlayConfig?.suffix ?? ""}</text>
                </g>
              ))}
            </g>
          )}
          {trendsChartData.map((row, i) => {
            const x = n > 1 ? pad.l + (i / (n - 1)) * plotW : pad.l + plotW / 2;
            return <text key={i} x={x} y={svgH - 6} textAnchor="middle" fontSize={12} fill="var(--chart-neutral-dark)">{row.period}</text>;
          })}
        </svg>
      </div>
    );
  }
  const hasOverlay = !!trendsOverlayMetric && overlayValues.length > 0;
  const padR = hasOverlay ? 40 : 0;
  const pad2 = { ...pad, r: pad.r + padR };
  const pts = trendsValues.map((v, i) => ({
    x: pad.l + (trendsValues.length > 1 ? (i / (trendsValues.length - 1)) * plotW : plotW / 2),
    y: pad.t + plotH - (trendsMax > 0 ? (v / trendsMax) * plotH : 0),
    v,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = pts.length > 1 ? `${pathD} L${pts[pts.length - 1].x},${pad.t + plotH} L${pts[0].x},${pad.t + plotH} Z` : "";
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({ frac, val: Math.round(trendsMax * frac) }));
  const overlayPts = hasOverlay ? overlayValues.map((v, i) => ({
    x: pad.l + (overlayValues.length > 1 ? (i / (overlayValues.length - 1)) * plotW : plotW / 2),
    y: pad.t + plotH - (overlayMax > 0 ? (v / overlayMax) * plotH : 0),
    v,
  })) : [];
  const overlayPathD = overlayPts.length > 1 ? overlayPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") : "";
  const overlayYTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({ frac, val: Math.round(overlayMax * frac) }));
  return (
    <div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full overflow-visible" style={{ maxHeight: 320 }}>
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="var(--neutral-300)" strokeWidth={1} />
        {yTicks.map(({ frac, val }) => {
          const y = pad.t + plotH * (1 - frac);
          return (
            <g key={frac}>
              <line x1={pad.l} y1={y} x2={hasOverlay ? svgW - 25 : svgW - pad2.r} y2={y} stroke="var(--neutral-200)" strokeWidth={0.5} strokeDasharray="2,2" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={12} fill="var(--chart-neutral-dark)">{val}{trendsConfig.suffix}</text>
            </g>
          );
        })}
        {hasOverlay && <line x1={svgW - 25} y1={pad.t} x2={svgW - 25} y2={pad.t + plotH} stroke="var(--neutral-300)" strokeWidth={1} />}
        {hasOverlay && overlayYTicks.map(({ frac, val }) => {
          const y = pad.t + plotH * (1 - frac);
          return <text key={`ov-${frac}`} x={svgW - 25 + 6} y={y + 3} textAnchor="start" fontSize={12} fill="var(--chart-neutral-dark)">{val}{overlayConfig?.suffix ?? ""}</text>;
        })}
        {areaD && <path d={areaD} fill={trendsConfig.color} opacity={0.07} />}
        <path d={pathD} fill="none" stroke={trendsConfig.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={trendsConfig.color} stroke="white" strokeWidth={1.5} />
            <text x={p.x} y={Math.max(12, p.y - 10)} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--chart-black)">{p.v}{trendsConfig.suffix}</text>
            <text x={p.x} y={svgH - 6} textAnchor="middle" fontSize={12} fill="var(--chart-neutral-dark)">{trendsLabels[i]}</text>
          </g>
        ))}
        {hasOverlay && overlayPathD && (
          <g>
            <path d={overlayPathD} fill="none" stroke="var(--color-success)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
            {overlayPts.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={2} fill="var(--color-success)" stroke="white" strokeWidth={1} />
                <text x={p.x} y={Math.max(12, p.y - 8)} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-success)">{p.v}{overlayConfig?.suffix ?? ""}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

const GM_SUMMARY_TRENDS_METRIC_CONFIG = {
  leadPipeline: { key: "totalLeads", label: "Total Leads", color: "var(--chart-black)", suffix: "" },
  conversionRate: { key: "conversionRate", label: "Conversion Rate", color: "var(--chart-success)", suffix: "%" },
  commentRate: { key: "commentRate", label: "Comment Rate", color: "var(--chart-primary)", suffix: "%" },
};
const GM_STACKED_SUPPORTED_METRICS = ["leadPipeline", "conversionRate", "commentRate"];

function getGMContextualInsight({ stats, prevStats }) {
  if (!stats) return null;
  if ((stats.cancelledUnreviewed ?? 0) === 0 && (stats.unusedOverdue ?? 0) === 0)
    return "All clear — no urgent reviews.";
  if (stats.total > 0 && prevStats?.total > 0) {
    const change = stats.total - prevStats.total;
    if (change > 0) return `${change} new lead${change !== 1 ? "s" : ""} since last period.`;
  }
  if (stats.conversionRate > (prevStats?.conversionRate ?? 0) && (prevStats?.conversionRate ?? 0) > 0) {
    return `Conversion rate is up ${stats.conversionRate - (prevStats?.conversionRate ?? 0)}pp — keep it going.`;
  }
  if (stats.cancelledUnreviewed > 0 || stats.unusedOverdue > 0) {
    const parts = [];
    if (stats.cancelledUnreviewed > 0) parts.push(`${stats.cancelledUnreviewed} cancelled unreviewed`);
    if (stats.unusedOverdue > 0) parts.push(`${stats.unusedOverdue} unused overdue`);
    return parts.join(". ") + ".";
  }
  return null;
}

function GMDashboardPage({ navigateTo }) {
  const { userProfile } = useAuth();
  const { leads, loading } = useData();
  const reduceMotion = useReducedMotion();
  const displayName = userProfile?.displayName ?? roleUsers.gm?.name ?? "there";
  const [drilldownMetric, setDrilldownMetric] = useState(null);
  const presets = useMemo(() => getDateRangePresets(), [loading]);

  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const [summaryTrendsMetric, setSummaryTrendsMetric] = useState("leadPipeline");
  const [trendsOverlayMetric, setTrendsOverlayMetric] = useState("conversionRate");
  const [trendsTimePresetKey, setTrendsTimePresetKey] = useState("trailing_4_weeks");
  const [trendsGroupBy, setTrendsGroupBy] = useState("status");
  const [summaryTrendsChartType, setSummaryTrendsChartType] = useState("bar");
  const [trendsUseCustom, setTrendsUseCustom] = useState(false);
  const [trendsCustomStart, setTrendsCustomStart] = useState("");
  const [trendsCustomEnd, setTrendsCustomEnd] = useState("");
  const [trendsShowCustomCalendar, setTrendsShowCustomCalendar] = useState(false);
  const trendsCustomAnchorRef = useRef(null);
  const [stackedBarTooltip, setStackedBarTooltip] = useState(null);
  const [chartOverlayTooltip, setChartOverlayTooltip] = useState(null);
  const [chartBarTooltip, setChartBarTooltip] = useState(null);

  const currentPreset = presets.find((p) => p.key === selectedPresetKey);
  const dateRange = currentPreset ? { start: currentPreset.start, end: currentPreset.end } : null;

  const chartDateRange = useMemo(() => {
    if (trendsUseCustom && trendsCustomStart && trendsCustomEnd) {
      return { start: new Date(trendsCustomStart + "T00:00:00"), end: new Date(trendsCustomEnd + "T23:59:59") };
    }
    const preset = presets.find((p) => p.key === trendsTimePresetKey);
    return preset ? { start: preset.start, end: preset.end } : null;
  }, [trendsTimePresetKey, trendsUseCustom, trendsCustomStart, trendsCustomEnd, presets]);

  const gmName = resolveGMName(userProfile?.displayName, userProfile?.id);
  const stats = useMemo(() => getGMDashboardStats(leads, dateRange, gmName), [leads, dateRange, gmName]);
  const prevRange = useMemo(() => getComparisonDateRange(selectedPresetKey), [selectedPresetKey]);
  const prevStats = useMemo(() => (prevRange ? getGMDashboardStats(leads, prevRange, gmName) : null), [leads, prevRange, gmName]);

  const greeting = getTimeOfDayGreeting();
  const insight = getGMContextualInsight({ stats, prevStats });

  const { stats: chartStats, chartData: trendsChartData } = useMemo(() => {
    if (!chartDateRange) return { stats: null, chartData: [] };
    return getSummaryDataWithChart(
      leads,
      [],
      chartDateRange,
      null,
      trendsUseCustom ? "custom" : trendsTimePresetKey,
      trendsGroupBy
    );
  }, [leads, chartDateRange, trendsTimePresetKey, trendsUseCustom, trendsGroupBy]);

  const isStackedView = trendsGroupBy !== "period";
  const effectiveTrendsMetric = isStackedView && !GM_STACKED_SUPPORTED_METRICS.includes(summaryTrendsMetric)
    ? "leadPipeline"
    : summaryTrendsMetric;
  const trendsConfig = GM_SUMMARY_TRENDS_METRIC_CONFIG[effectiveTrendsMetric];
  const trendsValues = isStackedView ? [] : trendsChartData.map((d) => d[trendsConfig.key] ?? 0);
  const trendsLabels = isStackedView
    ? trendsChartData.map((d) => d.period)
    : trendsChartData.map((d) => d.label);
  const trendsMax = Math.max(...trendsValues, 1);

  const overlayConfig = trendsOverlayMetric ? GM_SUMMARY_TRENDS_METRIC_CONFIG[trendsOverlayMetric] : null;
  const overlayValues = overlayConfig ? trendsChartData.map((d) => d[overlayConfig.key] ?? 0) : [];
  const overlayMax = overlayValues.length > 0 ? Math.max(...overlayValues, 1) : 1;

  const overlayOptions = useMemo(() => {
    const opts = [{ value: "", label: "None" }];
    const others = Object.entries(GM_SUMMARY_TRENDS_METRIC_CONFIG).filter(
      ([k]) => k !== effectiveTrendsMetric && (isStackedView ? GM_STACKED_SUPPORTED_METRICS.includes(k) : true)
    );
    others.forEach(([k, c]) => opts.push({ value: k, label: c.label }));
    return opts;
  }, [effectiveTrendsMetric, isStackedView]);

  const summaryTrendsMetricOptions = useMemo(() => {
    const entries = Object.entries(GM_SUMMARY_TRENDS_METRIC_CONFIG);
    if (isStackedView) {
      return entries.filter(([k]) => GM_STACKED_SUPPORTED_METRICS.includes(k));
    }
    return entries;
  }, [isStackedView]);

  const SEGMENT_COLORS = { Rented: "var(--chart-primary)", Cancelled: "var(--chart-black)", Unused: "var(--chart-neutral)" };
  const SEGMENT_ORDER = ["Rented", "Cancelled", "Unused"];
  const GM_PALETTE = ["var(--chart-primary)", "var(--hertz-primary-light)", "var(--hertz-gold-plus)", "var(--chart-black)", "var(--chart-info)", "var(--chart-accent)", "var(--chart-neutral)", "var(--chart-neutral-dark)"];
  const stackedSegmentKeys = useMemo(() => {
    if (!isStackedView) return [];
    const keys = new Set();
    for (const row of trendsChartData) {
      for (const k of Object.keys(row.segments ?? {})) keys.add(k);
    }
    return [...keys].sort((a, b) => {
      const ai = SEGMENT_ORDER.indexOf(a);
      const bi = SEGMENT_ORDER.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return String(a).localeCompare(String(b));
    });
  }, [isStackedView, trendsChartData]);

  const getSegmentColor = (key) => SEGMENT_COLORS[key] ?? GM_PALETTE[Math.abs(key.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % GM_PALETTE.length];

  useEffect(() => {
    if (summaryTrendsChartType === "line" && (trendsOverlayMetric || trendsGroupBy !== "period")) {
      setSummaryTrendsChartType("bar");
    }
  }, [summaryTrendsChartType, trendsOverlayMetric, trendsGroupBy]);

  const gmTiles = [
    { label: "Conversion Rate", value: `${stats.conversionRate}%`, relChange: relChange(stats.conversionRate, prevStats?.conversionRate), metricKey: "conversion_rate" },
    { label: "Contacted < 30 min", value: `${stats.pctWithin30}%`, relChange: relChange(stats.pctWithin30, prevStats?.pctWithin30), metricKey: "contacted_within_30_min" },
    { label: "Comment Compliance", value: `${stats.commentCompliance}%`, relChange: relChange(stats.commentCompliance, prevStats?.commentCompliance), metricKey: "comment_rate" },
    { label: "Branch Contact %", value: `${stats.branchPct}%`, relChange: relChange(stats.branchPct, prevStats?.branchPct), metricKey: "branch_vs_hrd_split" },
    { label: "Cancelled Unreviewed", value: stats.cancelledUnreviewed, relChange: relChange(stats.cancelledUnreviewed, prevStats?.cancelledUnreviewed), isAlert: stats.cancelledUnreviewed > 0, lowerIsBetter: true, metricKey: "cancelled_unreviewed" },
    { label: "Unused Overdue", value: stats.unusedOverdue, relChange: relChange(stats.unusedOverdue, prevStats?.unusedOverdue), isAlert: stats.unusedOverdue > 0, lowerIsBetter: true, metricKey: "unused_overdue" },
  ];

  const trendsGroupByLabel = trendsGroupBy === "period" ? "Period" : trendsGroupBy === "branch" ? "Branch" : trendsGroupBy === "body_shop" ? "Body Shop" : trendsGroupBy === "insurance_company" ? "Insurance" : "Lead Status";
  const trendsTimePeriodLabel = trendsUseCustom
    ? (trendsCustomStart && trendsCustomEnd ? formatDateRange({ key: "custom" }, trendsCustomStart, trendsCustomEnd) : "Custom")
    : (presets.find((p) => p.key === trendsTimePresetKey)?.label ?? "");
  const trendsMetricLabel = trendsConfig.suffix === "%" ? `${trendsConfig.label} %` : trendsConfig.label;
  const overallConvRate = chartStats?.total ? Math.round((chartStats.rented / chartStats.total) * 100) : 0;
  const overallSuffix =
    effectiveTrendsMetric === "conversionRate" && chartStats?.total > 0
      ? ` (Overall: ${overallConvRate}%)`
      : "";
  const trendsChartTitle =
    (trendsOverlayMetric
      ? `${trendsMetricLabel} + ${overlayConfig?.label ?? ""} by ${trendsGroupByLabel} over ${trendsTimePeriodLabel}`
      : `${trendsMetricLabel} Grouped By ${trendsGroupByLabel} over ${trendsTimePeriodLabel}`) + overallSuffix;

  const getStackedBarLabel = (row) => {
    if (effectiveTrendsMetric === "leadPipeline") return row.total;
    if (effectiveTrendsMetric === "conversionRate") return row.conversionRate != null ? `${row.conversionRate}%` : "—";
    if (effectiveTrendsMetric === "commentRate") return row.commentRate != null ? `${row.commentRate}%` : "—";
    return row.total;
  };

  return (
    <div className="max-w-[var(--container-max)]">
      <AnimatePresence>
        {drilldownMetric && (() => {
          const tile = gmTiles.find((t) => t.metricKey === drilldownMetric);
          const rawVal = tile?.value;
          const numericCurrent = typeof rawVal === "string" ? parseFloat(rawVal) : rawVal;
          const prevTile = {
            conversion_rate: prevStats?.conversionRate,
            contacted_within_30_min: prevStats?.pctWithin30,
            comment_rate: prevStats?.commentCompliance,
            branch_vs_hrd_split: prevStats?.branchPct,
            cancelled_unreviewed: prevStats?.cancelledUnreviewed,
            unused_overdue: prevStats?.unusedOverdue,
          };
          return (
            <GMMetricDrilldownModal
              metricKey={drilldownMetric}
              onClose={() => setDrilldownMetric(null)}
              leads={leads}
              dateRange={dateRange}
              comparisonRange={prevRange}
              currentValue={numericCurrent}
              previousValue={prevTile[drilldownMetric]}
              selectedPresetKey={selectedPresetKey}
              gmName={gmName}
            />
          );
        })()}
      </AnimatePresence>
      {/* Home — top of overview page, same greeting and logic as BM */}
      <div id="home" className="scroll-mt-4 mb-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-semibold text-[var(--hertz-primary)] uppercase tracking-wider mb-1"
        >
          {greeting}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="text-3xl md:text-4xl font-extrabold text-[var(--hertz-black)] tracking-tight"
        >
          {displayName}
        </motion.h1>
        {insight && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="text-sm text-[var(--neutral-600)] mt-2.5"
          >
            {insight}
          </motion.p>
        )}
      </div>

      {/* Section 1: Work (formerly To Dos) */}
      <div id="todos" className="scroll-mt-4 mb-8" data-onboarding="gm-work">
        <SectionHeader title="Work" subtitle="Meeting prep and branch health checks at a glance." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div data-onboarding="gm-meeting-prep">
            <GMMeetingPrepModule
              navigateTo={navigateTo}
              leads={leads}
              dateRange={dateRange}
              reduceMotion={reduceMotion}
            />
          </div>
          <div data-onboarding="gm-spot-check">
            <GMSpotCheckModule
              navigateTo={navigateTo}
              leads={leads}
              dateRange={dateRange}
              reduceMotion={reduceMotion}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Summary (formerly Business Metrics) */}
      <div id="business-metrics" className="scroll-mt-4 mb-8" data-onboarding="gm-summary">
        <SectionHeader title="Summary" subtitle="Zone-wide metrics and performance trends." />

        {/* Time filter */}
        <div className="flex items-center gap-1.5 mb-4 flex-nowrap whitespace-nowrap overflow-x-auto">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPresetKey(p.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                selectedPresetKey === p.key
                  ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)] shadow-[var(--shadow-md)]"
                  : "bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Metric tiles — 2 rows of 3, BM black-tile format */}
        <div className="grid grid-cols-3 gap-2 mb-2" data-onboarding="gm-metric-drilldown">
          {gmTiles.slice(0, 3).map((tile, i) => (
            <motion.div
              key={tile.label}
              {...cardAnim(i + 1, reduceMotion)}
              whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } } : {}}
              onClick={() => tile.metricKey && setDrilldownMetric(tile.metricKey)}
              title="Click to view underlying data and what's driving changes"
              className="bg-neutral-700 border border-white/20 rounded-lg px-4 py-3 shadow-[var(--shadow-sm)] cursor-pointer group transition-all duration-200 hover:ring-2 hover:ring-[var(--hertz-primary)]/50"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white uppercase tracking-wider">{tile.label}</p>
                <svg className="w-3.5 h-3.5 text-white/70 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xl font-extrabold tracking-tight text-white">{tile.value}</p>
                {prevRange != null && tile.relChange != null && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    tile.relChange > 0 ? "bg-emerald-400/25 text-emerald-200" : tile.relChange < 0 ? "bg-rose-400/25 text-rose-200" : "bg-white/15 text-white/70"
                  }`}>
                    {tile.relChange > 0 ? "↑" : tile.relChange < 0 ? "↓" : "—"}
                    {tile.relChange !== 0 ? `${Math.abs(tile.relChange)}%` : ""}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {gmTiles.slice(3).map((tile, i) => (
            <motion.div
              key={tile.label}
              {...cardAnim(4 + i, reduceMotion)}
              whileHover={!reduceMotion ? { y: -3, boxShadow: "0 12px 28px rgba(39,36,37,0.12), 0 4px 10px rgba(39,36,37,0.06)", transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } } : {}}
              onClick={() => tile.metricKey && setDrilldownMetric(tile.metricKey)}
              title="Click to view underlying data and what's driving changes"
              className="bg-neutral-700 border border-white/20 rounded-lg px-4 py-3 shadow-[var(--shadow-sm)] cursor-pointer group transition-all duration-200 hover:ring-2 hover:ring-[var(--hertz-primary)]/50"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white uppercase tracking-wider">{tile.label}</p>
                <svg className="w-3.5 h-3.5 text-white/70 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xl font-extrabold tracking-tight text-white">{tile.value}</p>
                {prevRange != null && tile.relChange != null && tile.relChange !== 0 && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    tile.lowerIsBetter
                      ? (tile.relChange > 0 ? "bg-rose-400/25 text-rose-200" : "bg-emerald-400/25 text-emerald-200")
                      : (tile.relChange > 0 ? "bg-emerald-400/25 text-emerald-200" : "bg-rose-400/25 text-rose-200")
                  }`}>
                    {tile.lowerIsBetter
                      ? (tile.relChange > 0 ? "↑" : "↓")
                      : (tile.relChange > 0 ? "↑" : "↓")}
                    {`${Math.abs(tile.relChange)}%`}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Interactive trend chart — same logic and design as BM Summary */}
        <motion.div {...cardAnim(3, reduceMotion)} className="mb-4">
          <div className="border border-[var(--neutral-200)] rounded-lg bg-white shadow-[var(--shadow-md)] overflow-hidden" data-onboarding="gm-trends">
            <div className="px-5 pt-5 pb-4">
              <div className="flex flex-wrap items-end gap-2 mb-4">
                <div className="shrink-0">
                  <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Metric</p>
                  <select
                    value={effectiveTrendsMetric}
                    onChange={(e) => setSummaryTrendsMetric(e.target.value)}
                    className="w-[10rem] px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-sm font-medium text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)] cursor-pointer"
                  >
                    {summaryTrendsMetricOptions.map(([k, c]) => (
                      <option key={k} value={k}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="shrink-0">
                  <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Time filter</p>
                  <div className="flex items-center gap-1">
                    <select
                      value={trendsUseCustom ? "custom" : trendsTimePresetKey}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "custom") {
                          setTrendsUseCustom(true);
                          setTrendsShowCustomCalendar(true);
                        } else {
                          setTrendsUseCustom(false);
                          setTrendsShowCustomCalendar(false);
                          setTrendsTimePresetKey(v);
                        }
                      }}
                      className="w-[10rem] px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-sm font-medium text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)] cursor-pointer"
                    >
                      {presets.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                      <option value="custom">Custom</option>
                    </select>
                    {trendsUseCustom && (
                      <button
                        type="button"
                        onClick={() => setTrendsShowCustomCalendar((v) => !v)}
                        className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-[var(--neutral-200)] hover:bg-[var(--neutral-100)]"
                      >
                        Pick dates
                      </button>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Group by</p>
                  <select
                    value={trendsGroupBy}
                    onChange={(e) => setTrendsGroupBy(e.target.value)}
                    className="w-[10rem] px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-sm font-medium text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)] cursor-pointer"
                  >
                    <option value="period">Period</option>
                    <option value="branch">Branch</option>
                    <option value="body_shop">Body Shop</option>
                    <option value="insurance_company">Insurance</option>
                    <option value="status">Lead Status</option>
                  </select>
                </div>
                <div className="shrink-0">
                  <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Add secondary metric</p>
                  <select
                    value={trendsOverlayMetric}
                    onChange={(e) => setTrendsOverlayMetric(e.target.value)}
                    className="w-[10rem] px-2.5 py-1.5 border border-[var(--neutral-200)] rounded-lg text-sm font-medium text-[var(--hertz-black)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)] cursor-pointer"
                    title="Add a secondary data series as a line overlay"
                  >
                    {overlayOptions.map((o) => (
                      <option key={o.value || "none"} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="shrink-0 ml-auto">
                  <p className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wider mb-1.5">Chart type</p>
                  <div className="flex items-center gap-0.5 rounded-lg border border-[var(--neutral-200)] p-0.5 bg-[var(--neutral-50)]">
                    <button
                      onClick={() => setSummaryTrendsChartType("bar")}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                        summaryTrendsChartType === "bar" ? "bg-white text-[var(--hertz-black)] shadow-sm" : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
                      }`}
                      title="Bar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Bar
                    </button>
                    {!trendsOverlayMetric && trendsGroupBy === "period" && (
                      <button
                        onClick={() => setSummaryTrendsChartType("line")}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                          summaryTrendsChartType === "line" ? "bg-white text-[var(--hertz-black)] shadow-sm" : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
                        }`}
                        title="Line"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="4,16 8,10 13,13 20,6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><polyline points="17,6 20,6 20,9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Line
                      </button>
                    )}
                    <button
                      onClick={() => setSummaryTrendsChartType("table")}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                        summaryTrendsChartType === "table" ? "bg-white text-[var(--hertz-black)] shadow-sm" : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
                      }`}
                      title="Table"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" /></svg>
                      Table
                    </button>
                  </div>
                </div>
              </div>
              <div ref={trendsCustomAnchorRef} className="relative shrink-0">
                <AnimatePresence>
                  {trendsUseCustom && trendsShowCustomCalendar && (
                    <DateRangeCalendar
                      start={trendsCustomStart}
                      end={trendsCustomEnd}
                      onChange={({ start: s, end: e }) => { setTrendsCustomStart(s); setTrendsCustomEnd(e); }}
                      onClose={() => setTrendsShowCustomCalendar(false)}
                      anchorRef={trendsCustomAnchorRef}
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="border border-[var(--neutral-200)] rounded-lg p-4 bg-[var(--neutral-50)]/30 overflow-visible min-h-[340px]">
                <p className="text-xs font-bold text-[var(--neutral-600)] tracking-wider mb-8">{trendsChartTitle}</p>
                {trendsChartData.length === 0 ? (
                  <p className="text-sm text-[var(--neutral-600)] py-8 text-center">
                    {chartDateRange ? "No data for this time range." : "Select a time range to see the trend."}
                  </p>
                ) : summaryTrendsChartType === "bar" ? (
                <GMChartBar
                  trendsChartData={trendsChartData}
                  isStackedView={isStackedView}
                  trendsConfig={trendsConfig}
                  effectiveTrendsMetric={effectiveTrendsMetric}
                  trendsValues={trendsValues}
                  trendsLabels={trendsLabels}
                  trendsMax={trendsMax}
                  trendsOverlayMetric={trendsOverlayMetric}
                  overlayConfig={overlayConfig}
                  overlayValues={overlayValues}
                  overlayMax={overlayMax}
                  stackedSegmentKeys={stackedSegmentKeys}
                  getSegmentColor={getSegmentColor}
                  getStackedBarLabel={getStackedBarLabel}
                  stackedBarTooltip={stackedBarTooltip}
                  setStackedBarTooltip={setStackedBarTooltip}
                  chartOverlayTooltip={chartOverlayTooltip}
                  setChartOverlayTooltip={setChartOverlayTooltip}
                  chartBarTooltip={chartBarTooltip}
                  setChartBarTooltip={setChartBarTooltip}
                  reduceMotion={reduceMotion}
                />
              ) : summaryTrendsChartType === "line" ? (
                <GMChartLine
                  trendsChartData={trendsChartData}
                  isStackedView={isStackedView}
                  trendsConfig={trendsConfig}
                  trendsValues={trendsValues}
                  trendsLabels={trendsLabels}
                  trendsMax={trendsMax}
                  trendsOverlayMetric={trendsOverlayMetric}
                  overlayConfig={overlayConfig}
                  overlayValues={overlayValues}
                  overlayMax={overlayMax}
                  stackedSegmentKeys={stackedSegmentKeys}
                  getSegmentColor={getSegmentColor}
                  reduceMotion={reduceMotion}
                />
              ) : (
                <GMChartTable
                  trendsChartData={trendsChartData}
                  isStackedView={isStackedView}
                  trendsGroupByLabel={trendsGroupByLabel}
                  trendsConfig={trendsConfig}
                  trendsValues={trendsValues}
                  trendsLabels={trendsLabels}
                  trendsOverlayMetric={trendsOverlayMetric}
                  overlayConfig={overlayConfig}
                  overlayValues={overlayValues}
                  stackedSegmentKeys={stackedSegmentKeys}
                  getSegmentColor={getSegmentColor}
                />
              )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section 3: Team Performance */}
      <div id="team-performance" className="scroll-mt-4 mb-8" data-onboarding="gm-team-performance">
        <SectionHeader title="Team Performance" subtitle="Leaderboard rankings, activity, and compliance across branches." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GMLeaderboardModule
            navigateTo={navigateTo}
            leads={leads}
            dateRange={dateRange}
            reduceMotion={reduceMotion}
          />
          <ActivityReportModule
            navigateTo={navigateTo}
            leads={leads}
            reduceMotion={reduceMotion}
          />
        </div>
        <div className="mt-4">
          <InteractiveComplianceDashboard />
        </div>
      </div>
    </div>
  );
}

function GMTrendBarChart({ data, metricConfig, getColor, hasMultipleSeries, reduceMotion }) {
  const n = data.weekLabels.length;
  if (n === 0) return <p className="text-sm text-[var(--neutral-500)] py-8 text-center">No data available.</p>;

  const allVals = data.series.flatMap((s) => s.values.filter((v) => v != null));
  const maxVal = Math.max(...allVals, 1);
  const isPercent = metricConfig.suffix === "%";
  const niceMax = isPercent ? 100 : (maxVal <= 4 ? 4 : maxVal <= 10 ? 10 : Math.ceil(maxVal / 5) * 5);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));

  return (
    <div>
      <div className="flex" style={{ height: 260, gap: 12 }}>
        <div className="flex flex-col justify-between shrink-0 py-0.5 text-right" style={{ width: 36, paddingRight: 12 }}>
          {[...yTicks].reverse().map((val) => (
            <span key={val} className="text-xs text-[var(--neutral-500)]" style={{ lineHeight: 1 }}>{val}{isPercent ? "%" : ""}</span>
          ))}
        </div>
        <div className="flex-1 relative border-l border-[var(--neutral-200)]">
          <div className="absolute inset-0 z-0 pointer-events-none">
            {yTicks.map((val) => (
              <div key={val} className="absolute left-0 right-0 border-t border-[var(--neutral-200)]" style={{ top: `${100 - (val / niceMax) * 100}%`, height: 0 }} />
            ))}
          </div>
          <div className="absolute inset-0 grid z-10 h-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 4, paddingLeft: 12, paddingRight: 12 }}>
            {data.weekLabels.map((_, wi) => {
              const seriesCount = hasMultipleSeries ? data.series.length : 1;
              return (
                <div key={wi} className="flex items-end justify-center h-full gap-[2px]">
                  {data.series.map((s, si) => {
                    const v = s.values[wi];
                    if (v == null) return <div key={si} style={{ width: `${80 / seriesCount}%` }} />;
                    const pct = (v / niceMax) * 100;
                    return (
                      <motion.div
                        key={si}
                        initial={{ height: 0 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ delay: wi * 0.03, duration: reduceMotion ? 0.01 : 0.3, ease: "easeOut" }}
                        className="min-h-[2px] relative group/bar"
                        style={{ backgroundColor: getColor(si), width: `${80 / seriesCount}%`, maxWidth: 48, opacity: hasMultipleSeries ? 0.85 : (wi === n - 1 ? 1 : 0.7) }}
                        title={`${s.name}: ${v}${metricConfig.suffix}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex pt-2 mt-1 border-t border-[var(--neutral-200)]" style={{ gap: 12 }}>
        <div style={{ width: 36 }} />
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 4, paddingLeft: 12, paddingRight: 12 }}>
          {data.weekLabels.map((l, i) => (
            <span key={i} className="text-center text-xs text-[var(--neutral-500)] truncate">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GMTrendLineChart({ data, metricConfig, getColor, hasMultipleSeries }) {
  const svgW = 560, svgH = 300;
  const pad = { t: 28, r: 25, b: 32, l: 42 };
  const plotW = svgW - pad.l - pad.r;
  const plotH = svgH - pad.t - pad.b;
  const n = data.weekLabels.length;
  if (n === 0) return <p className="text-sm text-[var(--neutral-500)] py-8 text-center">No data available.</p>;

  const allVals = data.series.flatMap((s) => s.values.filter((v) => v != null));
  const maxVal = Math.max(...allVals, 1);
  const isPercent = metricConfig.suffix === "%";
  const niceMax = isPercent ? 100 : (maxVal <= 4 ? 4 : maxVal <= 10 ? 10 : Math.ceil(maxVal / 5) * 5);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));

  return (
    <div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full overflow-visible" style={{ maxHeight: 320 }}>
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="var(--neutral-300)" strokeWidth={1} />
        {yTicks.map((val) => {
          const y = pad.t + plotH - (val / niceMax) * plotH;
          return (
            <g key={val}>
              <line x1={pad.l} y1={y} x2={svgW - pad.r} y2={y} stroke="var(--neutral-200)" strokeWidth={0.5} strokeDasharray="2,2" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={12} fill="var(--chart-neutral-dark)">{val}{isPercent ? "%" : ""}</text>
            </g>
          );
        })}
        {data.series.map((s, si) => {
          const pts = s.values.map((v, i) => {
            if (v == null) return null;
            return {
              x: n > 1 ? pad.l + (i / (n - 1)) * plotW : pad.l + plotW / 2,
              y: pad.t + plotH - (v / niceMax) * plotH,
              v,
            };
          }).filter(Boolean);
          const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
          const color = getColor(si);
          return (
            <g key={s.name}>
              <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={3} fill={color} stroke="white" strokeWidth={1.5} />
                  {!hasMultipleSeries && (
                    <text x={p.x} y={Math.max(12, p.y - 10)} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--chart-black)">
                      {p.v}{metricConfig.suffix}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
        {data.weekLabels.map((wl, i) => {
          const x = n > 1 ? pad.l + (i / (n - 1)) * plotW : pad.l + plotW / 2;
          return <text key={i} x={x} y={svgH - 6} textAnchor="middle" fontSize={12} fill="var(--chart-neutral-dark)">{wl}</text>;
        })}
      </svg>
    </div>
  );
}

function AdminDashboard({ navigateTo }) {
  const cards = [
    {
      label: "Data Uploads",
      desc: "Upload HLES and TRANSLOG CSV files to refresh lead data",
      view: "admin-uploads",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      accent: "bg-[var(--hertz-primary)]",
    },
    {
      label: "Org Mapping",
      desc: "BM-to-branch assignments and auto-derived hierarchy",
      view: "admin-org-mapping",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      accent: "bg-[var(--hertz-black)]",
    },
    {
      label: "Cancellation Reasons",
      desc: "Configure the reason categories BMs use for cancelled leads",
      view: "admin-legend",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      accent: "bg-[var(--neutral-100)]",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-5">
        {cards.map((card, i) => (
          <motion.button
            key={card.view}
            {...cardAnim(i)}
            onClick={() => navigateTo(card.view)}
            className="border border-[var(--neutral-200)] rounded-xl p-5 text-left hover:border-[var(--hertz-primary)] hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className={`w-11 h-11 ${card.accent} rounded-lg flex items-center justify-center mb-4 ${card.accent === "bg-[var(--hertz-primary)]" ? "text-[var(--hertz-black)]" : card.accent === "bg-[var(--hertz-black)]" ? "text-white" : "text-[var(--neutral-600)]"}`}>
              {card.icon}
            </div>
            <p className="text-base font-semibold text-[var(--hertz-black)] mb-1 group-hover:text-[var(--hertz-primary)] transition-colors">
              {card.label}
            </p>
            <p className="text-sm text-[var(--neutral-500)] leading-relaxed">{card.desc}</p>
            <div className="flex items-center gap-1 mt-3 text-xs font-medium text-[var(--neutral-400)] group-hover:text-[var(--hertz-black)] transition-colors">
              Open
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// BM sections in scroll order on Summary page: Work → Summary → My Leads → Open Tasks
const BM_SECTION_MAP = {
  "bm-work": "work",
  "bm-dashboard": "dashboard",
  "bm-leads": "lead-pipeline",
  "bm-todo": "open-tasks",
};

const GM_SECTION_MAP = {
  "gm-overview": "home",
  "gm-todos": "todos",
  "gm-business-metrics": "business-metrics",
  "gm-team-performance": "team-performance",
};

// Reverse: sectionId -> viewId for scroll-based highlight
const BM_SECTION_TO_VIEW = Object.fromEntries(
  Object.entries(BM_SECTION_MAP).map(([view, section]) => [section, view])
);
const GM_SECTION_TO_VIEW = Object.fromEntries(
  Object.entries(GM_SECTION_MAP).map(([view, section]) => [section, view])
);

export default function InteractiveDashboard() {
  const { role, activeView, navigateTo, setScrollActiveView, setScrollDirection, selectLead, selectTask } = useApp();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const sectionMap = role === "bm" ? BM_SECTION_MAP : role === "gm" ? GM_SECTION_MAP : null;
    const sectionId = sectionMap?.[activeView];
    if (sectionId) {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [role, activeView]);

  useEffect(() => {
    const sectionToView = role === "bm" ? BM_SECTION_TO_VIEW : role === "gm" ? GM_SECTION_TO_VIEW : null;
    if (!sectionToView) return;

    const scrollRoot = document.getElementById("dashboard-scroll-root");
    if (!scrollRoot) return;

    const sectionIds = Object.keys(sectionToView);
    const lastViewId = sectionToView[sectionIds[sectionIds.length - 1]];
    const firstViewId = sectionToView[sectionIds[0]];
    const secondViewId = sectionIds.length > 1 ? sectionToView[sectionIds[1]] : null;
    // GM: Work (todos) is the first substantial section; home is just the greeting. Highlight Work at top.
    const topViewId = role === "gm" ? sectionToView["todos"] ?? firstViewId : firstViewId;
    const observed = [];
    let hasUserScrolled = false;
    let lastScrollTop = scrollRoot.scrollTop;

    setScrollActiveView(topViewId);

    const updateActiveFromScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = scrollRoot;
      const atTop = scrollTop < 8;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 50;
      if (atTop && topViewId) {
        setScrollActiveView(topViewId);
        return true;
      }
      if (atBottom && lastViewId) {
        setScrollActiveView(lastViewId);
        return true;
      }
      return false;
    };

    const computeActiveFromSections = () => {
      const { scrollTop, clientHeight, scrollHeight } = scrollRoot;
      if (scrollTop < 8) return topViewId;
      if (scrollTop + clientHeight >= scrollHeight - 50) return lastViewId;
      const rootRect = scrollRoot.getBoundingClientRect();
      const candidates = sectionIds
        .map((id) => {
          const el = document.getElementById(id);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          if (rect.bottom <= rootRect.top || rect.top >= rootRect.bottom) return null;
          return { id, viewId: sectionToView[id], top: rect.top };
        })
        .filter(Boolean);
      if (candidates.length === 0) return firstViewId;
      const inViewport = candidates.filter((c) => c.top >= 0);
      let topmost;
      if (inViewport.length > 0) {
        inViewport.sort((a, b) => a.top - b.top);
        topmost = inViewport[0];
      } else {
        candidates.sort((a, b) => b.top - a.top);
        topmost = candidates[0];
      }
      if (role === "bm" && topmost.viewId === "bm-home" && topmost.top < 0 && secondViewId) {
        return secondViewId;
      }
      return topmost.viewId;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (updateActiveFromScroll()) return;
        if (!hasUserScrolled) return;
        const viewId = computeActiveFromSections();
        if (viewId) setScrollActiveView(viewId);
      },
      { root: scrollRoot, rootMargin: "0px 0px -35% 0px", threshold: 0 }
    );

    const handleScroll = () => {
      hasUserScrolled = true;
      const { scrollTop } = scrollRoot;
      const delta = scrollTop - lastScrollTop;
      if (Math.abs(delta) > 2) {
        setScrollDirection(delta > 0 ? "down" : "up");
      }
      lastScrollTop = scrollTop;
      if (updateActiveFromScroll()) return;
      const viewId = computeActiveFromSections();
      if (viewId) setScrollActiveView(viewId);
    };

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    });

    scrollRoot.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollRoot.removeEventListener("scroll", handleScroll);
      observed.forEach((el) => observer.unobserve(el));
    };
  }, [role, setScrollActiveView, setScrollDirection]);

  return (
    <div>
      {role === "bm" ? (
        <BMDashboard navigateTo={navigateTo} selectLead={selectLead} selectTask={selectTask} />
      ) : (
        <>
          {role === "admin" && (
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-[var(--hertz-black)] tracking-tight">{roleMeta[role]?.label} Dashboard</h1>
            </div>
          )}
          {role === "gm" && <GMDashboardPage navigateTo={navigateTo} />}
          {role === "admin" && <AdminDashboard navigateTo={navigateTo} />}
        </>
      )}
    </div>
  );
}
