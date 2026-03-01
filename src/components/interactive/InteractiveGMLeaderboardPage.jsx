import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useData } from "../../context/DataContext";
import { useApp } from "../../context/AppContext";
import {
  getGMBranchLeaderboard,
  getDateRangePresets,
} from "../../selectors/demoSelectors";

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

  const currentPreset = presets.find((p) => p.key === selectedPresetKey);
  const dateRange = currentPreset ? { start: currentPreset.start, end: currentPreset.end } : null;

  const leaderboard = useMemo(
    () => getGMBranchLeaderboard(leads, dateRange, sortMetric, scope),
    [leads, dateRange, sortMetric, scope]
  );

  const activeSortMeta = SORT_METRICS.find((m) => m.value === sortMetric);

  return (
    <div className="space-y-6">
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

      {/* Leaderboard table */}
      <div className="border border-[var(--neutral-200)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--hertz-black)]">
              <th className="text-left text-white text-xs font-semibold px-4 py-3 w-12">#</th>
              <th className="text-left text-white text-xs font-semibold px-4 py-3">Branch</th>
              <th className="text-left text-white text-xs font-semibold px-4 py-3">BM</th>
              <th className="text-left text-white text-xs font-semibold px-4 py-3">Zone</th>
              {SORT_METRICS.map((m) => (
                <th
                  key={m.value}
                  onClick={() => setSortMetric(m.value)}
                  className={`text-right text-xs font-semibold px-4 py-3 cursor-pointer transition-colors ${
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
                className={`border-b border-[var(--neutral-100)] transition-colors hover:bg-[var(--neutral-50)] ${
                  row.isMyBranch && scope === "all" ? "bg-[var(--hertz-primary-subtle)]" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    row.rank <= 3 ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]" : "bg-[var(--neutral-100)] text-[var(--neutral-600)]"
                  }`}>
                    {row.rank}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-[var(--hertz-black)]">{row.branch}</td>
                <td className="px-4 py-3 text-[var(--neutral-600)]">{row.bmName}</td>
                <td className="px-4 py-3 text-[var(--neutral-600)]">{row.zone}</td>
                {SORT_METRICS.map((m) => {
                  const val = row[m.value];
                  return (
                    <td key={m.value} className={`px-4 py-3 text-right font-medium ${
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
    </div>
  );
}
