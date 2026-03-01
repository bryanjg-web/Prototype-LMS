import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import { useData } from "../../context/DataContext";
import {
  getGMDashboardStats,
  getGMBranchLeaderboard,
  getDateRangePresets,
  getInsuranceCompanies,
} from "../../selectors/demoSelectors";

const quartileColors = { 1: "#2E7D32", 2: "#FFD100", 3: "#6E6E6E", 4: "#C62828" };

function getQuartile(rate, maxRate) {
  if (rate == null) return 4;
  const pct = maxRate > 0 ? rate / maxRate : 0;
  if (pct >= 0.75) return 1;
  if (pct >= 0.5) return 2;
  if (pct >= 0.25) return 3;
  return 4;
}

export default function InteractiveComplianceDashboard() {
  const { navigateTo } = useApp();
  const { leads } = useData();
  const presets = useMemo(() => getDateRangePresets(), []);

  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const [insuranceFilter, setInsuranceFilter] = useState("All");
  const [sortMetric, setSortMetric] = useState("commentRate");

  const currentPreset = presets.find((p) => p.key === selectedPresetKey);
  const dateRange = currentPreset ? { start: currentPreset.start, end: currentPreset.end } : null;
  const insuranceCompanies = useMemo(() => getInsuranceCompanies(leads), [leads]);

  const filteredLeads = useMemo(() => {
    if (insuranceFilter === "All") return leads;
    return (leads ?? []).filter((l) => l.insuranceCompany === insuranceFilter);
  }, [leads, insuranceFilter]);

  const stats = useMemo(() => getGMDashboardStats(filteredLeads, dateRange), [filteredLeads, dateRange]);
  const leaderboard = useMemo(
    () => getGMBranchLeaderboard(filteredLeads, dateRange, sortMetric, "all"),
    [filteredLeads, dateRange, sortMetric]
  );

  const maxRate = Math.max(...leaderboard.sorted.map((b) => b[sortMetric] ?? 0), 1);

  const summaryCards = [
    { label: "Cancelled Unreviewed", value: String(stats.cancelledUnreviewed), color: "text-[#C62828]" },
    { label: "Unused Overdue (5+ days)", value: String(stats.unusedOverdue), color: "text-[#FFD100]" },
    { label: "Comment Compliance", value: `${stats.commentCompliance}%`, color: "text-[#2E7D32]" },
  ];

  const sortOptions = [
    { value: "commentRate", label: "Comment Rate" },
    { value: "conversionRate", label: "Conversion Rate" },
    { value: "pctWithin30", label: "% < 30 min" },
    { value: "branchHrdPct", label: "Branch Contact %" },
  ];

  const metricLabel = sortOptions.find((o) => o.value === sortMetric)?.label ?? sortMetric;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-[var(--hertz-black)]">Compliance Dashboard</h2>
          <span className="text-sm text-[var(--neutral-600)]">D. Williams — All Zones</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPresetKey(p.key)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                selectedPresetKey === p.key
                  ? "bg-[var(--hertz-black)] text-white"
                  : "bg-[var(--neutral-100)] text-[var(--neutral-600)] hover:bg-[var(--neutral-200)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-[var(--neutral-200)]">|</span>
        <label className="text-xs text-[var(--neutral-600)] font-medium">Insurance</label>
        <select
          value={insuranceFilter}
          onChange={(e) => setInsuranceFilter(e.target.value)}
          className="px-3 py-1.5 border border-[var(--neutral-200)] rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]"
        >
          <option>All</option>
          {insuranceCompanies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="border border-[var(--neutral-200)] rounded-xl p-5"
          >
            <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Branch scoreboard */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--hertz-black)]">Branch Scoreboard</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--neutral-600)] font-medium">Rank by</label>
          <select
            value={sortMetric}
            onChange={(e) => setSortMetric(e.target.value)}
            className="px-3 py-1.5 border border-[var(--neutral-200)] rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {leaderboard.sorted.filter((b) => b.total > 0).map((bm, i) => {
          const val = bm[sortMetric] ?? 0;
          const quartile = getQuartile(val, maxRate);
          return (
            <div key={bm.branch} className="flex items-center gap-4">
              <span className="w-6 text-xs font-bold text-[var(--neutral-500)] text-right">{bm.rank}</span>
              <span className="w-32 text-sm text-[var(--hertz-black)] font-medium truncate" title={`${bm.bmName} — ${bm.branch}`}>
                {bm.bmName}
              </span>
              <div className="flex-1 bg-[var(--neutral-50)] rounded-md h-8 relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(val, 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                  className="h-full rounded-md"
                  style={{ backgroundColor: quartileColors[quartile] }}
                />
              </div>
              <span className="w-12 text-sm font-semibold text-right text-[var(--hertz-black)]">
                {val != null ? `${val}%` : "—"}
              </span>
            </div>
          );
        })}
        {leaderboard.sorted.filter((b) => b.total > 0).length === 0 && (
          <p className="text-sm text-[var(--neutral-500)] py-4 text-center">No data for this period</p>
        )}
      </div>

      {/* Benchmark */}
      {leaderboard.benchmark.total > 0 && (
        <div className="flex items-center gap-6 border-t border-[var(--neutral-200)] pt-4 mb-6">
          <span className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide">Benchmark ({metricLabel})</span>
          <span className="text-lg font-bold text-[var(--hertz-black)]">{leaderboard.benchmark[sortMetric] ?? "—"}%</span>
          <span className="text-xs text-[var(--neutral-500)]">{leaderboard.benchmark.total} leads total</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigateTo("gm-leads")}
          className="px-4 py-2 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-sm font-medium hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer"
        >
          Review Leads
        </button>
        <button
          onClick={() => navigateTo("gm-leaderboard")}
          className="px-4 py-2 border border-[var(--neutral-200)] text-[var(--hertz-black)] rounded-lg text-sm font-medium hover:border-[var(--hertz-primary)] transition-colors cursor-pointer"
        >
          Full Leaderboard
        </button>
      </div>
    </div>
  );
}
