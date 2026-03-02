import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useData } from "../../context/DataContext";
import { useApp } from "../../context/AppContext";
import BackButton from "../BackButton";
import { getActivityReportData } from "../../selectors/demoSelectors";
import { formatDateShort } from "../../utils/dateTime";

const TABS = [
  { id: "all", label: "All Activity" },
  { id: "logins", label: "Logins" },
  { id: "comments", label: "Comments" },
  { id: "contact", label: "Contact" },
];

const typeColors = {
  login: "bg-[var(--neutral-400)]",
  comment: "bg-[var(--color-success)]",
  contact: "bg-[var(--hertz-primary)]",
};

const typeLabels = {
  login: "Login",
  comment: "Comment",
  contact: "Contact",
};

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date("2026-02-22T09:00:00");
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 0) return formatDateShort(d);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(d, d.getFullYear() !== now.getFullYear());
}

export default function InteractiveGMActivityReportPage() {
  const { leads } = useData();
  const { navigateTo } = useApp();
  const [activeTab, setActiveTab] = useState("all");

  const data = useMemo(() => getActivityReportData(leads ?? [], 100), [leads]);

  const entries = activeTab === "all"
    ? data.all
    : activeTab === "logins"
      ? data.logins
      : activeTab === "comments"
        ? data.comments
        : data.contact;

  const hasData = entries.length > 0;

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigateTo("gm-team-performance")} label="Back to Team Performance" />

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hertz-black)]">Activity Report</h1>
          <p className="text-sm text-[var(--neutral-600)] mt-0.5">
            Team logins, comments, and contact activity — {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-[var(--hertz-black)] text-white"
                : "bg-[var(--neutral-100)] text-[var(--neutral-600)] hover:bg-[var(--neutral-200)]"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">
              ({tab.id === "all" ? data.all.length : tab.id === "logins" ? data.logins.length : tab.id === "comments" ? data.comments.length : data.contact.length})
            </span>
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border-2 border-[var(--neutral-200)] bg-white overflow-hidden"
      >
        {hasData ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--hertz-black)] text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Context</th>
                  <th className="px-4 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={`${entry.type}-${entry.user}-${entry.timestamp}-${i}`}
                    className="border-b border-[var(--neutral-100)] hover:bg-[var(--neutral-50)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-white ${typeColors[entry.type] ?? "bg-[var(--neutral-400)]"}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                        {typeLabels[entry.type] ?? entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--hertz-black)]">{entry.user}</td>
                    <td className="px-4 py-3 text-[var(--neutral-700)]">{entry.action}</td>
                    <td className="px-4 py-3 text-[var(--neutral-600)]">
                      {entry.branch && (
                        <span className="truncate max-w-[200px] block" title={entry.branch}>
                          {entry.branch}
                          {entry.customer && ` · ${entry.customer}`}
                        </span>
                      )}
                      {entry.preview && (
                        <span className="text-[var(--neutral-500)] italic truncate max-w-[240px] block" title={entry.preview}>
                          {entry.preview}{entry.preview.length >= 60 ? "…" : ""}
                        </span>
                      )}
                      {!entry.branch && !entry.preview && "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--neutral-500)] tabular-nums whitespace-nowrap">
                      {formatTime(entry.time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--neutral-100)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--neutral-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-[var(--neutral-500)]">No {activeTab === "all" ? "" : activeTab + " "}activity recorded yet.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
