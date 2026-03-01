import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import StatusBadge from "./StatusBadge";

const BAR_HEIGHT = 48;
const SEGMENTS = [
  { key: "rented", label: "Rented", color: "var(--hertz-primary)" },
  { key: "cancelled", label: "Cancelled", color: "var(--hertz-black)" },
  { key: "unused", label: "Unused", color: "var(--neutral-600)" },
];

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr + "T00:00:00");
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" });
}

export default function LeadStackedBarChart({ total, rented, cancelled, unused, leads = [] }) {
  const reduceMotion = useReducedMotion();
  const [viewMode, setViewMode] = useState("chart");

  const values = { rented: rented ?? 0, cancelled: cancelled ?? 0, unused: unused ?? 0 };
  const totalLeads = total ?? (values.rented + values.cancelled + values.unused);
  const maxVal = Math.max(totalLeads, 1);

  if (totalLeads === 0) {
    return (
      <div className="border border-[var(--neutral-200)] rounded-lg p-10 bg-white text-center">
        <p className="text-sm text-[var(--neutral-600)]">No leads for this range.</p>
      </div>
    );
  }

  const sortedLeads = [...leads].sort((a, b) => {
    const statusOrder = { Rented: 0, Cancelled: 1, Unused: 2 };
    const diff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (diff !== 0) return diff;
    return (b.daysOpen ?? 0) - (a.daysOpen ?? 0);
  });

  const viewBtn = (mode, label, icon) => (
    <button
      onClick={() => setViewMode(mode)}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer ${
        viewMode === mode
          ? "bg-white text-[var(--hertz-black)] shadow-sm"
          : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
      }`}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="border border-[var(--neutral-200)] rounded-lg bg-white shadow-[var(--shadow-md)] overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">
            Lead Pipeline
          </p>
          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--neutral-200)] p-0.5 bg-[var(--neutral-50)]">
            {viewBtn("chart", "Chart",
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            )}
            {viewBtn("table", "Table",
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" /></svg>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 mb-3 flex-wrap">
          {SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-[11px] font-medium text-[var(--neutral-600)]">
                {seg.label}: {values[seg.key]}
              </span>
            </div>
          ))}
          <span className="text-[11px] font-medium text-[var(--neutral-600)] ml-auto">
            Total: {totalLeads}
          </span>
        </div>

        {viewMode === "chart" ? (
          <div className="relative">
            <div
              className="flex h-12 rounded-lg overflow-hidden border border-[var(--neutral-200)]"
              style={{ minHeight: BAR_HEIGHT }}
            >
              {SEGMENTS.map((seg, i) => {
                const val = values[seg.key];
                const pct = val / maxVal;
                const w = Math.max(0, pct * 100);
                return (
                  <motion.div
                    key={seg.key}
                    initial={reduceMotion ? false : { width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      backgroundColor: seg.color,
                      minWidth: val > 0 ? 4 : 0,
                    }}
                    title={`${seg.label}: ${val}`}
                  >
                    {val > 0 && w > 12 && (
                      <span className="text-[11px] font-bold text-white drop-shadow-sm">
                        {val}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
                    <th className="px-3 py-2.5 text-left">Customer</th>
                    <th className="px-3 py-2.5 text-left">Reservation</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-center">Days Open</th>
                    <th className="px-3 py-2.5 text-left">Received</th>
                    <th className="px-3 py-2.5 text-left">Insurance</th>
                    <th className="px-3 py-2.5 text-left">Time to Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-[var(--neutral-600)]">
                        No leads match the current date range.
                      </td>
                    </tr>
                  ) : (
                    sortedLeads.map((lead, i) => (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-t border-[var(--neutral-100)] hover:bg-[var(--neutral-50)] transition-colors"
                      >
                        <td className="px-3 py-2 font-semibold text-[var(--hertz-black)] whitespace-nowrap">{lead.customer}</td>
                        <td className="px-3 py-2 font-mono text-xs text-[var(--neutral-600)]">{lead.reservationId}</td>
                        <td className="px-3 py-2 text-center"><StatusBadge status={lead.status} /></td>
                        <td className="px-3 py-2 text-center text-[var(--neutral-600)]">{lead.daysOpen ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--neutral-600)] whitespace-nowrap">{formatDate(lead.initDtFinal)}</td>
                        <td className="px-3 py-2 text-[var(--neutral-600)]">{lead.insuranceCompany ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--neutral-600)]">{lead.timeToFirstContact ?? "—"}</td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-[var(--neutral-50)] border-t border-[var(--neutral-200)] px-3 py-2 text-[11px] text-[var(--neutral-600)] font-medium">
              {sortedLeads.length} lead{sortedLeads.length !== 1 ? "s" : ""} in this period
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
