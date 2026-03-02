import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  getGMMetricTrendByWeek,
  getGMBranchLeaderboard,
} from "../selectors/demoSelectors";
import { formatDateRange } from "../utils/dateTime";

const GM_METRIC_CONFIG = {
  conversion_rate: {
    label: "Conversion Rate",
    description: "Percentage of leads that converted to a rental",
    format: (v) => (v != null ? `${v}%` : "—"),
    suffix: "%",
    branchKey: "conversionRate",
    prevBranchKey: "prevConversionRate",
    deltaKey: "improvementDelta",
    isRate: true,
  },
  contacted_within_30_min: {
    label: "Contacted within 30 min",
    description: "Percentage of leads with first contact within 30 minutes",
    format: (v) => (v != null ? `${v}%` : "—"),
    suffix: "%",
    branchKey: "pctWithin30",
    prevBranchKey: "prevPctWithin30",
    isRate: true,
  },
  comment_rate: {
    label: "Comment Compliance",
    description: "Percentage of actionable leads with enrichment/comments",
    format: (v) => (v != null ? `${v}%` : "—"),
    suffix: "%",
    branchKey: "commentRate",
    prevBranchKey: "prevCommentRate",
    isRate: true,
  },
  branch_vs_hrd_split: {
    label: "Branch Contact %",
    description: "Percentage of first contacts made by Branch (vs. HRD)",
    format: (v) => (v != null ? `${v}%` : "—"),
    suffix: "%",
    branchKey: "branchHrdPct",
    prevBranchKey: "prevBranchHrdPct",
    isRate: true,
  },
  cancelled_unreviewed: {
    label: "Cancelled Unreviewed",
    description: "Cancelled leads not yet archived or with GM directive",
    format: (v) => `${v ?? 0}`,
    suffix: "",
    branchKey: "cancelledUnreviewed",
    prevBranchKey: "prevCancelledUnreviewed",
    isRate: false,
    lowerIsBetter: true,
  },
  unused_overdue: {
    label: "Unused Overdue",
    description: "Unused leads open more than 5 days",
    format: (v) => `${v ?? 0}`,
    suffix: "",
    branchKey: "unusedOverdue",
    prevBranchKey: "prevUnusedOverdue",
    isRate: false,
    lowerIsBetter: true,
  },
};

function TrendChart({ data, config }) {
  const { weekLabels, series } = data;
  const values = series?.[0]?.values ?? [];

  if (!weekLabels?.length || values.every((v) => v == null)) {
    return (
      <div className="flex items-center justify-center h-[120px] text-[11px] text-[var(--neutral-500)]">
        No trend data available
      </div>
    );
  }

  const numericValues = values.filter((v) => v != null);
  const isCount = !config.isRate;
  const rawMax = Math.max(...numericValues, 0);
  const rawMin = Math.min(...numericValues, 0);

  const dataSpread = rawMax - rawMin;
  let yMin, yMax;
  if (isCount) {
    yMin = Math.max(rawMin - 1, 0);
    yMax = rawMax + Math.max(1, Math.ceil(dataSpread * 0.15));
  } else {
    const pad = Math.max(5, Math.ceil(dataSpread * 0.2));
    yMin = Math.max(Math.floor((rawMin - pad) / 5) * 5, 0);
    yMax = Math.min(Math.ceil((rawMax + pad) / 5) * 5, 100);
  }
  const range = yMax - yMin || 1;

  const W = 560;
  const H = 160;
  const PAD = { top: 18, right: 12, bottom: 24, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const n = weekLabels.length;

  const xStep = n > 1 ? plotW / (n - 1) : 0;
  const points = values.map((v, i) => {
    if (v == null) return null;
    const x = PAD.left + i * xStep;
    const y = PAD.top + plotH - ((v - yMin) / range) * plotH;
    return { x, y, v };
  });

  const validPoints = points.filter(Boolean);
  const pathD = validPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const tickCount = isCount ? Math.min(5, yMax - yMin + 1) : 5;
  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const raw = yMin + (i * range) / (tickCount - 1);
    return isCount ? Math.round(raw) : Math.round(raw / 5) * 5;
  });
  const uniqueTicks = [...new Set(yTicks)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: "180px" }}>
      {uniqueTicks.map((tick) => {
        const y = PAD.top + plotH - ((tick - yMin) / range) * plotH;
        return (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--neutral-100)" strokeWidth={0.5} />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" className="fill-[var(--neutral-400)]" fontSize={9}>
              {tick}{config.suffix}
            </text>
          </g>
        );
      })}
      {weekLabels.map((label, i) => {
        const x = PAD.left + i * xStep;
        return (
          <text key={i} x={x} y={H - 6} textAnchor="middle" className="fill-[var(--neutral-500)]" fontSize={9} fontWeight={500}>
            {label}
          </text>
        );
      })}
      {validPoints.length > 1 && (
        <path d={pathD} fill="none" stroke="var(--hertz-primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {points.map((p, i) => {
        if (!p) return null;
        const isLast = i === points.length - 1 || points.slice(i + 1).every((pp) => pp == null);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={isLast ? 5 : 3.5} fill="var(--hertz-primary)" stroke="white" strokeWidth={isLast ? 2 : 1.5} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fontWeight={isLast ? 700 : 500} className={isLast ? "fill-[var(--hertz-black)]" : "fill-[var(--neutral-600)]"}>
              {config.format(p.v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BranchBar({ row, maxVal, config, benchmark, rank }) {
  const val = row[config.branchKey];
  const prevVal = row[config.prevBranchKey];
  const delta = (val != null && prevVal != null) ? val - prevVal : null;
  const isPositive = config.lowerIsBetter ? (delta != null && delta < 0) : (delta != null && delta > 0);
  const isNegative = config.lowerIsBetter ? (delta != null && delta > 0) : (delta != null && delta < 0);
  const barWidth = val != null && maxVal > 0 ? Math.max((Math.abs(val) / maxVal) * 100, 2) : 0;

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-[var(--neutral-50)] transition-colors group">
      <span className="text-[10px] font-semibold text-[var(--neutral-400)] w-5 text-right shrink-0">{rank}</span>
      <span className="text-[11px] font-medium text-[var(--hertz-black)] w-[130px] truncate shrink-0" title={row.branch}>{row.branch}</span>
      <div className="flex-1 h-5 bg-[var(--neutral-100)] rounded-sm relative overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{ width: `${barWidth}%`, backgroundColor: "var(--hertz-primary)" }}
        />
        {benchmark != null && maxVal > 0 && (
          <div
            className="absolute top-0 h-full border-r-2 border-[var(--hertz-black)]"
            style={{ left: `${(benchmark / maxVal) * 100}%` }}
            title={`Zone avg: ${config.format(benchmark)}`}
          />
        )}
      </div>
      <span className="text-[11px] font-bold text-[var(--hertz-black)] w-[50px] text-center shrink-0">{config.format(val)}</span>
      <span className={`text-[10px] font-semibold w-[48px] text-center shrink-0 ${
        delta == null || delta === 0
          ? "text-[var(--neutral-400)]"
          : isPositive ? "text-[#2E7D32]" : isNegative ? "text-[#C62828]" : "text-[var(--neutral-400)]"
      }`}>
        {delta == null ? "—" : delta === 0 ? "—" : `${isPositive ? "↑" : "↓"}${Math.abs(delta)}${config.suffix}`}
      </span>
    </div>
  );
}

function BranchPerformanceSection({ leaderboard, config, sortKey, onSortChange }) {
  const { sorted, benchmark } = leaderboard;
  const benchmarkVal = benchmark?.[config.branchKey] ?? null;
  const maxVal = Math.max(...sorted.map((r) => Math.abs(r[config.branchKey] ?? 0)), 1);

  const sortOptions = [
    { value: "highToLow", label: "High \u2192 Low" },
    { value: "lowToHigh", label: "Low \u2192 High" },
    { value: "mostImproved", label: "Most Improved" },
    { value: "alpha", label: "A \u2192 Z" },
  ];

  const displayed = useMemo(() => {
    const rows = [...sorted];
    if (sortKey === "lowToHigh") {
      rows.sort((a, b) => (a[config.branchKey] ?? -1) - (b[config.branchKey] ?? -1));
    } else if (sortKey === "mostImproved") {
      rows.sort((a, b) => {
        const da = (a[config.branchKey] ?? 0) - (a[config.prevBranchKey] ?? 0);
        const db = (b[config.branchKey] ?? 0) - (b[config.prevBranchKey] ?? 0);
        return config.lowerIsBetter ? da - db : db - da;
      });
    } else if (sortKey === "alpha") {
      rows.sort((a, b) => a.branch.localeCompare(b.branch));
    }
    return rows;
  }, [sorted, sortKey, config]);

  return (
    <div>
      <p className="text-xs font-bold text-[var(--hertz-black)] uppercase tracking-wider mb-2">By Branch</p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-[var(--neutral-500)]">Sort:</span>
        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value)}
          className="text-xs border border-[var(--neutral-200)] rounded-md px-2 py-1 text-[var(--neutral-600)] bg-white focus:outline-none focus:border-[var(--hertz-primary)] cursor-pointer"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {displayed.map((row, i) => (
          <BranchBar
            key={row.branch}
            row={row}
            maxVal={maxVal}
            config={config}
            benchmark={benchmarkVal}
            rank={i + 1}
          />
        ))}
      </div>
      {benchmarkVal != null && (
        <p className="text-[10px] text-[var(--neutral-500)] mt-1.5 pl-8">
          <span className="inline-block w-3 border-t-2 border-[var(--hertz-black)] mr-1.5 align-middle" />
          Zone average: {config.format(benchmarkVal)}
        </p>
      )}
    </div>
  );
}

export default function GMMetricDrilldownModal({
  metricKey,
  onClose,
  leads,
  dateRange,
  comparisonRange,
  currentValue,
  previousValue,
  selectedPresetKey,
  gmName,
}) {
  const [branchSort, setBranchSort] = useState("mostImproved");

  const config = GM_METRIC_CONFIG[metricKey];
  if (!config) return null;

  const relChangeVal = useMemo(() => {
    if (previousValue == null || previousValue === 0 || currentValue == null) return null;
    return Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 100);
  }, [currentValue, previousValue]);

  const isPositive = config.lowerIsBetter
    ? (relChangeVal != null && relChangeVal < 0)
    : (relChangeVal != null && relChangeVal > 0);
  const isNegative = config.lowerIsBetter
    ? (relChangeVal != null && relChangeVal > 0)
    : (relChangeVal != null && relChangeVal < 0);

  const trendData = useMemo(
    () => getGMMetricTrendByWeek(leads, { metric: metricKey, timeframe: "trailing_4_weeks" }),
    [leads, metricKey]
  );

  const leaderboard = useMemo(
    () => getGMBranchLeaderboard(leads, dateRange, config.branchKey, "my_branches", gmName),
    [leads, dateRange, config.branchKey, gmName]
  );

  const formatRange = (r) => formatDateRange(r?.start, r?.end);

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
        className="bg-white rounded-xl shadow-xl w-full max-w-[56rem] mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--neutral-200)] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-0.5">
                <h3 className="text-lg font-bold text-[var(--hertz-black)]">{config.label}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-[var(--hertz-black)]">{config.format(currentValue)}</span>
                  {relChangeVal != null && relChangeVal !== 0 && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      isPositive ? "bg-[#2E7D32]/15 text-[#2E7D32]" : isNegative ? "bg-[#C62828]/15 text-[#C62828]" : "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
                    }`}>
                      {config.lowerIsBetter
                        ? (relChangeVal < 0 ? "↓" : "↑")
                        : (relChangeVal > 0 ? "↑" : "↓")}
                      {Math.abs(relChangeVal)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-[var(--neutral-600)]">
                {config.description} &middot; {formatRange(dateRange)}
                {comparisonRange && <span className="text-[var(--neutral-400)]"> vs {formatRange(comparisonRange)}</span>}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--neutral-100)] text-[var(--neutral-600)] transition-colors ml-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-auto flex-1 space-y-6">
          {/* Section 1: Trend Over Time */}
          <div>
            <p className="text-xs font-bold text-[var(--hertz-black)] uppercase tracking-wider mb-3">Trend Over Time</p>
            <div className="border border-[var(--neutral-100)] rounded-lg p-3 bg-[var(--neutral-50)]/50">
              <TrendChart data={trendData} config={config} />
            </div>
          </div>

          {/* Section 2: Performance by Branch */}
          <div>
            <BranchPerformanceSection
              leaderboard={leaderboard}
              config={config}
              sortKey={branchSort}
              onSortChange={setBranchSort}
            />
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
