import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../../context/DataContext";
import { useApp } from "../../context/AppContext";
import BackButton from "../BackButton";
import {
  getGMBranchLeaderboard,
  getDateRangePresets,
} from "../../selectors/demoSelectors";
import BranchDetailPane from "./BranchDetailPane";

function getMetricColor(val, meta) {
  if (meta?.value === "total" || val == null) return "var(--hertz-black)";
  if (val >= 70) return "var(--color-success)";
  if (val >= 65) return "var(--hertz-black)";
  return "#C62828";
}

const SORT_METRICS = [
  { value: "conversionRate", label: "Conversion Rate", suffix: "%" },
  { value: "pctWithin30", label: "% < 30 min", suffix: "%" },
  { value: "commentRate", label: "Comment Rate", suffix: "%" },
  { value: "branchHrdPct", label: "Branch Contact %", suffix: "%" },
  { value: "total", label: "Total Leads", suffix: "" },
];

const SCOPE_TABS = [
  { value: "my_branches", label: "My Branches" },
  { value: "all", label: "All Branches" },
];

export default function InteractiveGMLeaderboardPage() {
  const { leads } = useData();
  const { navigateTo } = useApp();
  const presets = useMemo(() => getDateRangePresets(), []);

  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const [sortMetric, setSortMetric] = useState("conversionRate");
  const [scope, setScope] = useState("my_branches");
  const [viewMode, setViewMode] = useState("table");
  const [selectedBranch, setSelectedBranch] = useState(null);

  const currentPreset = presets.find((p) => p.key === selectedPresetKey);
  const dateRange = currentPreset ? { start: currentPreset.start, end: currentPreset.end } : null;

  const leaderboard = useMemo(
    () => getGMBranchLeaderboard(leads, dateRange, sortMetric, scope),
    [leads, dateRange, sortMetric, scope]
  );

  const activeSortMeta = SORT_METRICS.find((m) => m.value === sortMetric);

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigateTo("gm-todos")} label="Back to Work" />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hertz-black)]">Leaderboard</h1>
          <p className="text-sm text-[var(--neutral-600)] mt-0.5">
            Branch performance rankings — {leaderboard.sorted.length} branches
          </p>
        </div>
        <div className="flex items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPresetKey(p.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                selectedPresetKey === p.key
                  ? "bg-[var(--hertz-black)] text-white"
                  : "bg-[var(--neutral-100)] text-[var(--neutral-600)] hover:bg-[var(--neutral-200)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scope + Sort controls */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-[var(--neutral-200)] overflow-hidden">
          {SCOPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setScope(tab.value)}
              className={`px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                scope === tab.value
                  ? "bg-[var(--hertz-black)] text-white"
                  : "bg-white text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--neutral-600)] font-medium">Sort by</label>
            <select
              value={sortMetric}
              onChange={(e) => setSortMetric(e.target.value)}
              className="px-3 py-1.5 border border-[var(--neutral-200)] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]"
            >
              {SORT_METRICS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--neutral-200)] p-0.5 bg-[var(--neutral-50)]">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-[var(--hertz-black)] shadow-sm"
                  : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
              }`}
              title="Table view"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
              </svg>
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer ${
                viewMode === "chart"
                  ? "bg-white text-[var(--hertz-black)] shadow-sm"
                  : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
              }`}
              title="Chart view"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Chart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Benchmark bar */}
      {leaderboard.benchmark.total > 0 && (
        <div className="bg-[var(--neutral-50)] rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide">
            {scope === "my_branches" ? "My Branches" : "All Branches"} Benchmark
          </span>
          <div className="flex items-center gap-6">
            {SORT_METRICS.filter((m) => m.value !== "total").map((m) => (
              <div key={m.value} className="text-center">
                <p className={`text-lg font-bold ${m.value === sortMetric ? "text-[var(--hertz-black)]" : "text-[var(--neutral-500)]"}`}>
                  {leaderboard.benchmark[m.value] ?? "—"}{m.suffix}
                </p>
                <p className="text-xs text-[var(--neutral-500)]">{m.label}</p>
              </div>
            ))}
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--neutral-500)]">{leaderboard.benchmark.total}</p>
              <p className="text-xs text-[var(--neutral-500)]">Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard table or chart */}
      {viewMode === "table" ? (
        <div className="border border-[var(--neutral-200)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--hertz-black)]">
                <th className="text-center text-white text-xs font-semibold px-4 py-3 w-12">#</th>
                <th className="text-center text-white text-xs font-semibold px-4 py-3">Branch</th>
                <th className="text-center text-white text-xs font-semibold px-4 py-3">BM</th>
                <th className="text-center text-white text-xs font-semibold px-4 py-3">Zone</th>
                {SORT_METRICS.map((m) => (
                  <th
                    key={m.value}
                    onClick={() => setSortMetric(m.value)}
                    className={`text-center text-xs font-semibold px-4 py-3 cursor-pointer transition-colors ${
                      sortMetric === m.value ? "text-[var(--hertz-primary)]" : "text-white hover:text-[var(--neutral-300)]"
                    }`}
                  >
                    {m.label} {sortMetric === m.value && "▼"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.sorted.length === 0 && (
                <tr>
                  <td colSpan={4 + SORT_METRICS.length} className="px-4 py-8 text-center text-[var(--neutral-500)]">
                    No data for this period
                  </td>
                </tr>
              )}
              {leaderboard.sorted.map((row, i) => (
                <motion.tr
                  key={row.branch}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => setSelectedBranch(row)}
                  className={`border-b border-[var(--neutral-100)] transition-colors hover:bg-[var(--neutral-50)] cursor-pointer ${
                    row.isMyBranch && scope === "all" ? "bg-[var(--hertz-primary-subtle)]" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      row.rank <= 3 ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]" : "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
                    }`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-[var(--hertz-black)]">{row.branch}</td>
                  <td className="px-4 py-3 text-center text-[var(--neutral-600)]">{row.bmName}</td>
                  <td className="px-4 py-3 text-center text-[var(--neutral-600)]">{row.zone}</td>
                  {SORT_METRICS.map((m) => {
                    const val = row[m.value];
                    return (
                      <td key={m.value} className={`px-4 py-3 text-center font-medium ${
                        m.value === sortMetric ? "text-[var(--hertz-black)]" : "text-[var(--neutral-600)]"
                      }`}>
                        {val != null ? `${val}${m.suffix}` : "—"}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[var(--neutral-200)] rounded-xl overflow-hidden bg-white">
          {leaderboard.sorted.length === 0 ? (
            <div className="px-4 py-12 text-center text-[var(--neutral-500)] text-sm">
              No data for this period
            </div>
          ) : (
            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-4">
                {activeSortMeta.label} by branch
              </p>
              {leaderboard.sorted.map((row, i) => {
                const val = row[sortMetric];
                const maxVal = sortMetric === "total"
                  ? Math.max(...leaderboard.sorted.map((r) => r.total ?? 0), 1)
                  : 100;
                const width = val != null && maxVal > 0 ? Math.min(100, (val / maxVal) * 100) : 0;
                const barColor = getMetricColor(val, activeSortMeta);
                return (
                  <motion.div
                    key={row.branch}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    onClick={() => setSelectedBranch(row)}
                    className={`flex items-center gap-4 cursor-pointer hover:opacity-90 ${row.isMyBranch && scope === "all" ? "bg-[var(--hertz-primary-subtle)] -mx-2 px-2 py-1 rounded-lg" : ""}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0" style={{ width: 180 }}>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                        row.rank <= 3 ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]" : "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
                      }`}>
                        {row.rank}
                      </span>
                      <span className="text-sm font-medium text-[var(--hertz-black)] truncate">{row.branch}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className="flex-1 h-8 bg-[var(--neutral-100)] rounded overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                          className="h-full rounded"
                          style={{ backgroundColor: barColor }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-14 text-right shrink-0" style={{ color: barColor }}>
                        {val != null ? `${val}${activeSortMeta.suffix}` : "—"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Branch detail slide-in pane */}
      <AnimatePresence>
        {selectedBranch && (
          <BranchDetailPane
            branchRow={selectedBranch}
            dateRange={dateRange}
            leads={leads}
            onClose={() => setSelectedBranch(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
