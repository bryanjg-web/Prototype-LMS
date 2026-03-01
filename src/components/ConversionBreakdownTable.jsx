/**
 * ConversionBreakdownTable — Renders conversion breakdown rows with optional zone benchmark.
 * Shows Group | Total | Rented | Unused | Cancelled | Conv % | Unused % | Cancelled %.
 * "Opportunity" insight: high Unused % = opportunity left; high Cancelled % = lost.
 */
import { motion } from "framer-motion";

function OpportunityHint({ unusedPct, cancelledPct }) {
  if (unusedPct == null && cancelledPct == null) return null;
  const highUnused = (unusedPct ?? 0) > 25;
  const highCancelled = (cancelledPct ?? 0) > 25;
  if (highUnused && !highCancelled) {
    return (
      <span className="text-[10px] font-medium text-[var(--color-success)]" title="More opportunity left — focus on follow-up">
        ↑ Opportunity
      </span>
    );
  }
  if (highCancelled && !highUnused) {
    return (
      <span className="text-[10px] font-medium text-[var(--color-error)]" title="More lost — review cancellation reasons">
        ↓ Lost
      </span>
    );
  }
  return null;
}

export default function ConversionBreakdownTable({
  rows = [],
  zoneBenchmark = null,
  showBenchmarks = false,
  groupByPrimary = null,
  className = "",
}) {
  if (rows.length === 0) {
    return (
      <div className={`border border-[var(--neutral-200)] rounded-lg p-8 text-center bg-white ${className}`}>
        <p className="text-sm text-[var(--neutral-600)]">No data for this period.</p>
      </div>
    );
  }

  const hasSecondary = rows.some((r) => r.isSecondary);

  return (
    <div className={`border border-[var(--neutral-200)] rounded-lg bg-white shadow-[var(--shadow-sm)] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
              <th className="px-3 py-3 text-left">{groupByPrimary === "status" ? "Status" : "Group"}</th>
              {hasSecondary && <th className="px-3 py-3 text-left">Sub-group</th>}
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-right">Rented</th>
              <th className="px-3 py-3 text-right">Unused</th>
              <th className="px-3 py-3 text-right">Cancelled</th>
              <th className="px-3 py-3 text-right">Conv %</th>
              <th className="px-3 py-3 text-right">Unused %</th>
              <th className="px-3 py-3 text-right">Cancelled %</th>
              {showBenchmarks && zoneBenchmark && <th className="px-3 py-3 text-right">Zone</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={`${row.groupKey}-${row.groupKeySecondary ?? ""}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={`border-t border-[var(--neutral-200)] transition-colors ${
                  row.isSecondary ? "bg-[var(--neutral-50)]" : "hover:bg-[var(--neutral-50)]"
                }`}
              >
                <td className={`px-3 py-2.5 font-medium text-[var(--hertz-black)] ${row.isSecondary ? "pl-6" : ""}`}>
                  {row.isSecondary ? "↳" : row.groupKey}
                </td>
                {hasSecondary && (
                  <td className="px-3 py-2.5 text-[var(--neutral-600)]">
                    {row.groupKeySecondary ?? "—"}
                  </td>
                )}
                <td className="px-3 py-2.5 text-right text-[var(--neutral-700)]">{row.total}</td>
                <td className="px-3 py-2.5 text-right text-[var(--color-success)]">{row.rented}</td>
                <td className="px-3 py-2.5 text-right text-[var(--neutral-600)]">{row.unused}</td>
                <td className="px-3 py-2.5 text-right text-[var(--color-error)]">{row.cancelled}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-[var(--hertz-black)]">{row.conversionRate}%</td>
                <td className="px-3 py-2.5 text-right text-[var(--neutral-600)]">
                  <span className="inline-flex items-center gap-1">
                    {row.unusedPct}%
                    <OpportunityHint unusedPct={row.unusedPct} cancelledPct={row.cancelledPct} />
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-[var(--neutral-600)]">{row.cancelledPct}%</td>
                {showBenchmarks && zoneBenchmark && (
                  <td className="px-3 py-2.5 text-right text-[var(--neutral-500)] text-xs">
                    {!row.isSecondary && zoneBenchmark.conversionRate != null
                      ? `Zone ${zoneBenchmark.conversionRate}%`
                      : "—"}
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {showBenchmarks && zoneBenchmark && (
        <div className="border-t border-[var(--neutral-200)] px-3 py-2 bg-[var(--neutral-50)] text-xs text-[var(--neutral-600)]">
          Zone benchmark: {zoneBenchmark.conversionRate}% conversion ({zoneBenchmark.rented}/{zoneBenchmark.total} leads)
        </div>
      )}
    </div>
  );
}
