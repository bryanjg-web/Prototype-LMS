import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useData } from "../../context/DataContext";
import {
  getGMDashboardStats,
  getContactRangeDistribution,
  getDateRangePresets,
  getComparisonDateRange,
  getGMMetricTrendByWeek,
} from "../../selectors/demoSelectors";
import ConversionTrendChart from "../ConversionTrendChart";
import GroupBySelector from "../GroupBySelector";

const easeOut = [0.4, 0, 0.2, 1];
const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: easeOut },
});

const CONTACT_COLORS = {
  "< 30m": "#2E7D32",
  "30m–1h": "#FFD100",
  "1–3h": "#1A1A1A",
  "3–6h": "#C62828",
  "6–12h": "#888",
  "12–24h": "#aaa",
  "24–48h": "#ccc",
  "No Contact": "#eee",
};

const METRIC_OPTIONS = [
  { value: "conversion_rate", label: "Conversion Rate" },
  { value: "contacted_within_30_min", label: "% Contacted < 30 min" },
  { value: "comment_rate", label: "Comment Compliance" },
  { value: "branch_vs_hrd_split", label: "Branch vs HRD %" },
];

export default function InteractiveGMDashboard({ navigateTo }) {
  const { leads } = useData();
  const prefersReduced = useReducedMotion();
  const presets = useMemo(() => getDateRangePresets(), []);

  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const [trendMetric, setTrendMetric] = useState("conversion_rate");
  const [trendTimeframe, setTrendTimeframe] = useState("trailing_4_weeks");
  const [groupBy, setGroupBy] = useState(null);
  const [secondaryGroupBy, setSecondaryGroupBy] = useState(null);

  const currentPreset = presets.find((p) => p.key === selectedPresetKey);
  const dateRange = currentPreset ? { start: currentPreset.start, end: currentPreset.end } : null;

  const stats = useMemo(() => getGMDashboardStats(leads, dateRange), [leads, dateRange]);
  const prevRange = useMemo(() => getComparisonDateRange(selectedPresetKey), [selectedPresetKey]);
  const prevStats = useMemo(() => (prevRange ? getGMDashboardStats(leads, prevRange) : null), [leads, prevRange]);
  const contactDist = useMemo(() => getContactRangeDistribution(leads, dateRange), [leads, dateRange]);

  const trendData = useMemo(
    () => getGMMetricTrendByWeek(leads, { metric: trendMetric, groupBy, timeframe: trendTimeframe }),
    [leads, trendMetric, groupBy, trendTimeframe]
  );

  const delta = (current, previous) => {
    if (previous == null || previous === 0) return null;
    return current - previous;
  };

  const tiles = [
    { label: "Total Leads", value: stats.total, prev: prevStats?.total, suffix: "", isCount: true },
    { label: "Conversion Rate", value: stats.conversionRate, prev: prevStats?.conversionRate, suffix: "%" },
    { label: "Contacted < 30 min", value: stats.pctWithin30, prev: prevStats?.pctWithin30, suffix: "%" },
    { label: "Branch Contact %", value: stats.branchPct, prev: prevStats?.branchPct, suffix: "%" },
    { label: "Comment Compliance", value: stats.commentCompliance, prev: prevStats?.commentCompliance, suffix: "%" },
    { label: "Cancelled Unreviewed", value: stats.cancelledUnreviewed, prev: prevStats?.cancelledUnreviewed, suffix: "", isCount: true, isAlert: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--hertz-black)]">Overview</h2>
          <p className="text-sm text-[var(--neutral-600)] mt-0.5">D. Williams — All Zones</p>
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

      {/* KPI Tiles */}
      <div className="grid grid-cols-3 gap-4">
        {tiles.map((tile, i) => {
          const d = delta(tile.value, tile.prev);
          return (
            <motion.div
              key={tile.label}
              {...cardAnim(i, prefersReduced)}
              className={`rounded-xl p-5 ${tile.isAlert && tile.value > 0 ? "bg-red-50 border border-red-200" : "bg-[var(--hertz-black)]"}`}
            >
              <p className={`text-xs font-bold uppercase tracking-wide ${tile.isAlert && tile.value > 0 ? "text-red-600" : "text-[var(--neutral-400)]"}`}>
                {tile.label}
              </p>
              <div className="flex items-end gap-2 mt-2">
                <span className={`text-3xl font-bold ${tile.isAlert && tile.value > 0 ? "text-red-700" : "text-white"}`}>
                  {tile.value}{tile.suffix}
                </span>
                {d != null && (
                  <span className={`text-xs font-semibold mb-1 ${d > 0 && !tile.isAlert ? "text-green-400" : d < 0 && !tile.isAlert ? "text-red-400" : d > 0 && tile.isAlert ? "text-red-400" : "text-green-400"}`}>
                    {d > 0 ? "▲" : "▼"} {Math.abs(d)}{tile.suffix}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Time to Contact Breakdown + Contact Source */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div {...cardAnim(6, prefersReduced)} className="border border-[var(--neutral-200)] rounded-xl p-5">
          <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-3">Time to First Contact</p>
          <div className="flex h-5 rounded-lg overflow-hidden mb-3">
            {contactDist.filter((b) => b.count > 0).map((b) => (
              <div
                key={b.label}
                style={{ width: `${b.pct}%`, backgroundColor: CONTACT_COLORS[b.label] || "#ccc" }}
                title={`${b.label}: ${b.pct}%`}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {contactDist.filter((b) => b.count > 0).slice(0, 4).map((b) => (
              <div key={b.label} className="text-center">
                <p className="text-lg font-bold text-[var(--hertz-black)]">{b.pct}%</p>
                <p className="text-xs text-[var(--neutral-600)]">{b.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...cardAnim(7, prefersReduced)} className="border border-[var(--neutral-200)] rounded-xl p-5">
          <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-3">First Contact Source</p>
          <div className="flex gap-6 items-center justify-center h-[calc(100%-2rem)]">
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--hertz-black)]">{stats.branchPct}%</p>
              <p className="text-xs text-[var(--neutral-600)] mt-1">Branch</p>
              <p className="text-sm text-[var(--neutral-500)]">{stats.branchContact} leads</p>
            </div>
            <div className="w-px h-16 bg-[var(--neutral-200)]" />
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--hertz-black)]">{stats.hrdPct}%</p>
              <p className="text-xs text-[var(--neutral-600)] mt-1">HRD (OKC)</p>
              <p className="text-sm text-[var(--neutral-500)]">{stats.hrdContact} leads</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Trend Chart Section */}
      <motion.div {...cardAnim(8, prefersReduced)} className="border border-[var(--neutral-200)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-[var(--hertz-black)] uppercase tracking-wide">Trend</h3>
            <select
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value)}
              className="border border-[var(--neutral-200)] rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]"
            >
              {METRIC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <GroupBySelector
            primary={groupBy}
            secondary={secondaryGroupBy}
            onPrimaryChange={(v) => { setGroupBy(v); if (!v) setSecondaryGroupBy(null); }}
            onSecondaryChange={setSecondaryGroupBy}
          />
        </div>
        <ConversionTrendChart
          data={trendData}
          metric={trendMetric}
          timeframe={trendTimeframe}
          onTimeframeChange={setTrendTimeframe}
          groupBy={groupBy}
          yLabel={trendMetric === "conversion_rate" ? "Conversion %" : trendMetric === "comment_rate" ? "Compliance %" : trendMetric === "contacted_within_30_min" ? "% < 30 min" : "Branch %"}
        />
      </motion.div>

      {/* Quick nav actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigateTo("gm-compliance")}
          className="px-4 py-2 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg font-medium text-sm hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer"
        >
          View Compliance
        </button>
        <button
          onClick={() => navigateTo("gm-leads")}
          className="px-4 py-2 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg font-medium text-sm hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer"
        >
          Review Leads
        </button>
        <button
          onClick={() => navigateTo("gm-leaderboard")}
          className="px-4 py-2 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg font-medium text-sm hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer"
        >
          View Leaderboard
        </button>
      </div>
    </div>
  );
}
