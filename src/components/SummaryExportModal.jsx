import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DateRangeCalendar } from "./DateRangeCalendar";
import {
  getDateRangePresets,
  getBMStats,
  getOpenTasksCount,
  getTaskCompletionRate,
  getAverageTimeToContact,
  tasksInDateRange,
} from "../selectors/demoSelectors";
import { exportSummaryToCSV } from "../utils/exportUtils";
import { formatDateRange } from "../utils/dateTime";

const METRIC_DEFS = [
  { key: "total_leads", label: "Total Leads", getValue: (stats) => stats.total },
  { key: "conversion_rate", label: "Conversion Rate", getValue: (stats) => `${stats.rented && stats.total ? Math.round((stats.rented / stats.total) * 100) : 0}%` },
  { key: "comment_rate", label: "Comment Rate", getValue: (stats) => `${stats.enrichmentRate}%` },
  { key: "open_tasks", label: "Open Tasks", getValue: (_, taskCount) => taskCount },
  { key: "task_completion_rate", label: "Task Completion Rate", getValue: (_, __, compRate) => compRate != null ? `${compRate}%` : "—" },
  { key: "avg_time_to_contact", label: "Avg. Time to First Contact", getValue: (_, __, ___, avgTime) => avgTime ?? "—" },
];

export default function SummaryExportModal({ onClose, leads, branchTasks, branch }) {
  const presets = useMemo(() => getDateRangePresets(), []);
  const [selectedPreset, setSelectedPreset] = useState("this_week");
  const [useCustom, setUseCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarAnchorRef = useRef(null);

  const allChecked = METRIC_DEFS.map((m) => m.key);
  const [selectedMetrics, setSelectedMetrics] = useState(allChecked);

  const toggleMetric = (key) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    setSelectedMetrics((prev) => (prev.length === allChecked.length ? [] : [...allChecked]));
  };

  const dateRange = useMemo(() => {
    if (useCustom && customStart && customEnd) {
      return { start: new Date(customStart + "T00:00:00"), end: new Date(customEnd + "T23:59:59") };
    }
    const preset = presets.find((p) => p.key === selectedPreset);
    return preset ? { start: preset.start, end: preset.end } : null;
  }, [selectedPreset, useCustom, customStart, customEnd, presets]);

  const periodLabel = useMemo(() => {
    if (useCustom && customStart && customEnd) {
      return formatDateRange(new Date(customStart + "T12:00:00"), new Date(customEnd + "T12:00:00"), true);
    }
    const preset = presets.find((p) => p.key === selectedPreset);
    return preset?.label ?? "—";
  }, [selectedPreset, useCustom, customStart, customEnd, presets]);

  const stats = useMemo(() => getBMStats(leads, dateRange, branch), [leads, dateRange, branch]);
  const filteredTasks = useMemo(() => tasksInDateRange(branchTasks, dateRange), [branchTasks, dateRange]);
  const openTasksCount = useMemo(() => getOpenTasksCount(filteredTasks), [filteredTasks]);
  const taskCompRate = useMemo(() => getTaskCompletionRate(filteredTasks), [filteredTasks]);
  const avgTime = useMemo(() => getAverageTimeToContact(leads, dateRange, branch), [leads, dateRange, branch]);

  const handleExport = () => {
    const selected = METRIC_DEFS.filter((m) => selectedMetrics.includes(m.key));
    const rows = selected.map((m) => ({
      label: m.label,
      value: m.getValue(stats, openTasksCount, taskCompRate, avgTime),
    }));
    const startStr = dateRange?.start ? dateRange.start.toISOString().split("T")[0] : "";
    const endStr = dateRange?.end ? dateRange.end.toISOString().split("T")[0] : "";
    exportSummaryToCSV(rows, periodLabel, startStr, endStr);
    onClose();
  };

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
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--neutral-200)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-[var(--hertz-black)]">Export Summary</h3>
            <p className="text-xs text-[var(--neutral-600)] mt-0.5">Choose metrics and time frame to download</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--neutral-100)] text-[var(--neutral-600)] transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Time frame */}
          <div>
            <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-2">Time Frame</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map((p) => {
                const isActive = !useCustom && selectedPreset === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => { setSelectedPreset(p.key); setUseCustom(false); setShowCalendar(false); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)] shadow-sm"
                        : "bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              <span className="text-[var(--neutral-200)] mx-0.5">|</span>
              <div ref={calendarAnchorRef} className="relative shrink-0">
                <button
                  onClick={() => { setUseCustom(true); setShowCalendar(true); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    useCustom
                      ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)] shadow-sm"
                      : "bg-[var(--neutral-50)] text-[var(--neutral-600)] border border-transparent hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-100)]"
                  }`}
                >
                  Custom
                </button>
                <AnimatePresence>
                  {showCalendar && (
                    <DateRangeCalendar
                      start={customStart}
                      end={customEnd}
                      onChange={({ start: s, end: e }) => { setCustomStart(s); setCustomEnd(e); }}
                      onClose={() => setShowCalendar(false)}
                      anchorRef={calendarAnchorRef}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
            {periodLabel && (
              <p className="text-xs text-[var(--neutral-600)] mt-2 font-medium">{periodLabel}</p>
            )}
          </div>

          {/* Metrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Metrics</p>
              <button
                onClick={toggleAll}
                className="text-xs text-[var(--hertz-primary)] font-medium hover:underline cursor-pointer"
              >
                {selectedMetrics.length === allChecked.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="space-y-1.5">
              {METRIC_DEFS.map((m) => {
                const checked = selectedMetrics.includes(m.key);
                const preview = m.getValue(stats, openTasksCount, taskCompRate, avgTime);
                return (
                  <label
                    key={m.key}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      checked ? "bg-[var(--hertz-primary)]/10" : "hover:bg-[var(--neutral-50)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMetric(m.key)}
                      className="accent-[var(--hertz-primary)] w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="flex-1 text-sm font-medium text-[var(--hertz-black)]">{m.label}</span>
                    <span className="text-sm font-semibold text-[var(--neutral-600)] tabular-nums">{preview}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--neutral-200)] flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedMetrics.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--hertz-primary)] text-[var(--hertz-black)] hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            Download CSV
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
