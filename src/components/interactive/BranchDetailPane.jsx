/**
 * Branch Detail — Slide-in pane from right showing line-level lead data
 * that powers the GM leaderboard metrics for a branch.
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "../StatusBadge";
import { getLeadsForBranchInRange } from "../../selectors/demoSelectors";
import { formatDateRange } from "../../utils/dateTime";

function formatDateRangeDisplay(dateRange) {
  return formatDateRange(dateRange?.start, dateRange?.end) || "";
}

export default function BranchDetailPane({ branchRow, dateRange, leads, onClose }) {
  const branchLeads = branchRow
    ? getLeadsForBranchInRange(leads ?? [], dateRange, branchRow.branch)
    : [];

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!branchRow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden />

        {/* Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative w-full max-w-4xl bg-white shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-[var(--neutral-200)] px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-lg font-semibold text-[var(--hertz-black)]">
                {branchRow.branch} — Line-level data
              </h2>
              <p className="text-xs text-[var(--neutral-600)] mt-0.5">
                {branchRow.bmName} · {branchRow.zone} · {formatDateRangeDisplay(dateRange)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-[var(--neutral-100)] text-[var(--neutral-600)]"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-[var(--neutral-50)] rounded-lg px-4 py-3">
                <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Total</p>
                <p className="text-xl font-bold text-[var(--hertz-black)]">{branchRow.total}</p>
              </div>
              <div className="bg-[var(--neutral-50)] rounded-lg px-4 py-3">
                <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Conversion Rate</p>
                <p className="text-xl font-bold text-[var(--hertz-black)]">{branchRow.conversionRate ?? "—"}%</p>
              </div>
              <div className="bg-[var(--neutral-50)] rounded-lg px-4 py-3">
                <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">% &lt; 30 min</p>
                <p className="text-xl font-bold text-[var(--hertz-black)]">{branchRow.pctWithin30 ?? "—"}%</p>
              </div>
              <div className="bg-[var(--neutral-50)] rounded-lg px-4 py-3">
                <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Branch Contact %</p>
                <p className="text-xl font-bold text-[var(--hertz-black)]">{branchRow.branchHrdPct ?? "—"}%</p>
              </div>
              <div className="bg-[var(--neutral-50)] rounded-lg px-4 py-3">
                <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Comment Rate</p>
                <p className="text-xl font-bold text-[var(--hertz-black)]">{branchRow.commentRate ?? "—"}%</p>
              </div>
            </div>

            {/* Lead table */}
            <div>
              <h3 className="text-sm font-bold text-[var(--hertz-black)] mb-3">
                Leads ({branchLeads.length})
              </h3>
              <div className="border border-[var(--neutral-200)] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[var(--hertz-black)] text-white text-xs font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Customer</th>
                        <th className="px-4 py-3 text-center">Confirmation #</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Contact Range</th>
                        <th className="px-4 py-3 text-center">First Contact By</th>
                        <th className="px-4 py-3 text-center">Days Open</th>
                        <th className="px-4 py-3 text-left">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchLeads.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-[var(--neutral-500)]">
                            No leads in this period
                          </td>
                        </tr>
                      ) : (
                        branchLeads.map((lead) => (
                          <tr
                            key={lead.id}
                            className="border-t border-[var(--neutral-100)] hover:bg-[var(--neutral-50)] transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-[var(--hertz-black)]">{lead.customer ?? "—"}</td>
                            <td className="px-4 py-3 text-center font-mono text-xs text-[var(--neutral-600)]">{lead.reservationId ?? "—"}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge status={lead.status} />
                            </td>
                            <td className="px-4 py-3 text-center text-[var(--neutral-600)]">
                              {lead.contactRange ?? lead.contact_range ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-center text-[var(--neutral-600)]">
                              {(lead.firstContactBy ?? lead.first_contact_by) === "branch"
                                ? "Branch"
                                : (lead.firstContactBy ?? lead.first_contact_by) === "hrd"
                                  ? "HRD"
                                  : "—"}
                            </td>
                            <td className="px-4 py-3 text-center text-[var(--neutral-600)]">{lead.daysOpen ?? "—"}</td>
                            <td className="px-4 py-3 text-[var(--neutral-600)] max-w-[180px] truncate" title={lead.enrichment?.reason ?? lead.enrichment?.notes ?? ""}>
                              {lead.enrichment?.reason ?? lead.enrichment?.notes ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
