/**
 * BM Leaderboard — Compare your performance vs peers (GM cohort) and region benchmark.
 * Metrics: Conversion rate, Contacted within 30 min, Comment rate, Branch vs HRD.
 * Time filtering: same presets as Summary view.
 */
import { useMemo, useState, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import {
  getDefaultBranchForDemo,
  getDateRangePresets,
  getBMLeaderboardData,
} from "../../selectors/demoSelectors";
import { DateRangeCalendar } from "../DateRangeCalendar";

const easeOut = [0.4, 0, 0.2, 1];

const METRICS = [
  { key: "conversionRate", label: "Conversion rate", suffix: "%", higherIsBetter: true },
  { key: "pctWithin30", label: "Contacted within 30 min", suffix: "%", higherIsBetter: true },
  { key: "commentRate", label: "Comment rate", suffix: "%", higherIsBetter: true },
  { key: "branchHrdPct", label: "Branch vs HRD", suffix: "% Branch", higherIsBetter: true },
];

function formatDateRange(preset, customStart, customEnd) {
  if (preset?.key === "custom" && customStart && customEnd) {
    return `${new Date(customStart).toLocaleDateString("en-AU", { month: "short", day: "numeric" })} – ${new Date(customEnd).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}`;
  }
  if (preset?.start && preset?.end) {
    return `${preset.start.toLocaleDateString("en-AU", { month: "short", day: "numeric" })} – ${preset.end.toLocaleDateString("en-AU", { month: "short", day: "numeric" })}`;
  }
  return preset?.label ?? "";
}

function getMetricValue(row, key) {
  const v = row?.[key];
  return v != null ? v : null;
}

function BarRow({ row, metricKey, maxVal, isCurrentBranch, regionBenchmark, metric }) {
  const val = getMetricValue(row, metricKey);
  const displayVal = val != null ? `${val}${metric.suffix}` : "—";
  const width = maxVal > 0 && val != null ? Math.min(100, (val / maxVal) * 100) : 0;
  const benchVal = regionBenchmark?.[metricKey];
  const benchWidth = maxVal > 0 && benchVal != null ? Math.min(100, (benchVal / maxVal) * 100) : 0;

  const getColor = () => {
    if (isCurrentBranch) return "var(--hertz-primary)";
    return "var(--neutral-400)";
  };

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-8 text-sm font-semibold text-[var(--neutral-600)] shrink-0">
        {row.rank ?? "—"}
      </span>
      <span
        className={`min-w-[140px] text-sm font-medium shrink-0 ${
          isCurrentBranch ? "text-[var(--hertz-black)]" : "text-[var(--neutral-600)]"
        }`}
      >
        {row.branch}
        {isCurrentBranch && (
          <span className="ml-1.5 text-xs font-normal text-[var(--hertz-primary)]">(You)</span>
        )}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="flex-1 h-6 bg-[var(--neutral-100)] rounded overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="h-full rounded absolute left-0 top-0"
            style={{ backgroundColor: getColor(), minWidth: val != null && val > 0 ? 4 : 0 }}
          />
          {benchVal != null && benchVal > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--hertz-black)] opacity-60"
              style={{ left: `${benchWidth}%` }}
              title={`Region benchmark: ${benchVal}${metric.suffix}`}
            />
          )}
        </div>
        <span className="text-sm font-semibold w-16 text-right shrink-0 text-[var(--hertz-black)]">
          {displayVal}
        </span>
      </div>
    </div>
  );
}

export default function InteractiveBMLeaderboard() {
  const { userProfile } = useAuth();
  const { leads } = useData();
  const branch = userProfile?.branch ?? getDefaultBranchForDemo();
  const reduceMotion = useReducedMotion();

  const presets = getDateRangePresets();
  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const [useCustom, setUseCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [metricKey, setMetricKey] = useState("conversionRate");
  const customAnchorRef = useRef(null);

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

  const leaderboardData = useMemo(
    () => (dateRange ? getBMLeaderboardData(leads ?? [], branch, dateRange, metricKey) : null),
    [leads, branch, dateRange, metricKey]
  );

  const activePreset = presets.find((p) => p.key === selectedPresetKey);
  const rangeLabel = formatDateRange(activePreset, customStart, customEnd);

  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];
  const sorted = leaderboardData?.sorted ?? [];
  const maxVal = useMemo(() => {
    const vals = sorted.map((r) => getMetricValue(r, metricKey)).filter((v) => v != null);
    return vals.length > 0 ? Math.max(...vals, 100) : 100;
  }, [sorted, metricKey]);

  const noPeers = leaderboardData && leaderboardData.peers.length === 0 && !leaderboardData.myBranch?.total;

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--hertz-black)] mb-2">Leaderboard</h2>
      <p className="text-sm text-[var(--neutral-600)] mb-6">
        Compare your performance against peers in your GM cohort and the region benchmark.
      </p>

      {/* Date range — same as Summary */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <label className="text-sm font-medium text-[var(--hertz-black)]">Period</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {presets.map((p) => {
            const isActive = !useCustom && selectedPresetKey === p.key;
            return (
              <motion.button
                key={p.key}
                onClick={() => {
                  setSelectedPresetKey(p.key);
                  setUseCustom(false);
                  setShowCustomCalendar(false);
                }}
                whileHover={!reduceMotion ? { scale: 1.03 } : {}}
                whileTap={!reduceMotion ? { scale: 0.97 } : {}}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
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
              onClick={() => {
                setUseCustom(true);
                setShowCustomCalendar(true);
              }}
              whileHover={!reduceMotion ? { scale: 1.03 } : {}}
              whileTap={!reduceMotion ? { scale: 0.97 } : {}}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                useCustom
                  ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)] shadow-[var(--shadow-md)]"
                  : "bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)]"
              }`}
            >
              Custom
            </motion.button>
            <AnimatePresence>
              {showCustomCalendar && (
                <DateRangeCalendar
                  start={customStart}
                  end={customEnd}
                  onChange={({ start: s, end: e }) => {
                    setCustomStart(s);
                    setCustomEnd(e);
                  }}
                  onClose={() => setShowCustomCalendar(false)}
                  anchorRef={customAnchorRef}
                />
              )}
            </AnimatePresence>
          </div>
          {rangeLabel && (
            <span className="text-xs text-[var(--neutral-600)] ml-2 font-medium shrink-0">
              {rangeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Metric toggle */}
      <div className="mb-6">
        <label className="text-sm font-medium text-[var(--hertz-black)] block mb-2">Rank by</label>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (
            <motion.button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              whileHover={!reduceMotion ? { scale: 1.02 } : {}}
              whileTap={!reduceMotion ? { scale: 0.98 } : {}}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                metricKey === m.key
                  ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]"
                  : "bg-[var(--neutral-100)] text-[var(--neutral-600)] hover:bg-[var(--neutral-200)]"
              }`}
            >
              {m.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Leaderboard content */}
      {noPeers ? (
        <div className="border border-[var(--neutral-200)] rounded-lg p-12 bg-white text-center">
          <p className="text-[var(--hertz-black)] font-semibold">No peers in this period</p>
          <p className="text-sm text-[var(--neutral-600)] mt-1">
            No leads for your branch or other branches in your GM cohort for the selected period.
          </p>
        </div>
      ) : leaderboardData ? (
        <div className="border border-[var(--neutral-200)] rounded-lg bg-white shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Header: Your rank + region benchmark */}
          <div className="px-5 py-4 bg-[var(--neutral-50)] border-b border-[var(--neutral-200)]">
            <div className="flex flex-wrap items-center gap-6">
              {leaderboardData.myBranch && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide">
                    Your rank
                  </span>
                  <span className="text-2xl font-extrabold text-[var(--hertz-black)]">
                    #{leaderboardData.myBranch.rank} of {sorted.length}
                  </span>
                </div>
              )}
              {leaderboardData.cohortLabel && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide">
                    Cohort
                  </span>
                  <span className="text-sm font-medium text-[var(--hertz-black)]">
                    {leaderboardData.cohortLabel}
                  </span>
                </div>
              )}
              {leaderboardData.regionBenchmark && getMetricValue(leaderboardData.regionBenchmark, metricKey) != null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide">
                    Region benchmark
                  </span>
                  <span className="text-sm font-semibold text-[var(--hertz-black)]">
                    {getMetricValue(leaderboardData.regionBenchmark, metricKey)}
                    {metric.suffix}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[2rem_9rem_1fr_4rem] gap-3 px-5 py-3 border-b border-[var(--neutral-200)] text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wide">
            <span>#</span>
            <span>Branch</span>
            <span>{metric.label}</span>
            <span className="text-right">Value</span>
          </div>

          {/* Rows */}
          <div className="px-5 py-4">
            {sorted.map((row, i) => (
              <BarRow
                key={row.branch}
                row={{ ...row, rank: i + 1 }}
                metricKey={metricKey}
                maxVal={maxVal}
                isCurrentBranch={row.isCurrentBranch}
                regionBenchmark={leaderboardData.regionBenchmark}
                metric={metric}
              />
            ))}
          </div>

          {/* Benchmark legend */}
          {leaderboardData.regionBenchmark && getMetricValue(leaderboardData.regionBenchmark, metricKey) != null && (
            <div className="px-5 py-3 bg-[var(--neutral-50)] border-t border-[var(--neutral-200)] text-xs text-[var(--neutral-600)]">
              <span className="inline-block w-2 h-2 rounded-sm bg-[var(--hertz-black)] opacity-60 align-middle mr-1.5" />
              Vertical line = region benchmark
            </div>
          )}
        </div>
      ) : (
        <div className="border border-[var(--neutral-200)] rounded-lg p-8 bg-white text-center text-[var(--neutral-600)]">
          Select a date range to view the leaderboard.
        </div>
      )}
    </div>
  );
}
