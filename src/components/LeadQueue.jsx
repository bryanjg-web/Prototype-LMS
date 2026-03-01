import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";

const NOW = new Date("2026-02-26T09:00:00");
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getLastTranslogTime(lead) {
  if (lead.translog && lead.translog.length > 0) {
    const last = lead.translog[lead.translog.length - 1];
    // Translog times are like "Feb 10, 9:15 AM" — parse with year 2026
    const parsed = new Date(`${last.time}, 2026`);
    if (!isNaN(parsed)) return parsed;
  }
  // Fallback to lastActivity field
  if (lead.lastActivity) return new Date(lead.lastActivity);
  return null;
}

function formatRelativeTime(date) {
  if (!date) return "—";
  const diffMs = NOW - date;
  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isOverOneWeek(date) {
  if (!date) return false;
  return NOW - date > ONE_WEEK_MS;
}

export default function LeadQueue({
  leads,
  highlightId = null,
  enrichedIds = [],
  bannerCount = null,
  mismatchCount = null,
  onLeadClick = null,
}) {
  return (
    <div>
      {bannerCount !== null && bannerCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-[#1A1A1A]"
        >
          <span className="font-semibold text-[#FFD100]">{bannerCount}</span> lead{bannerCount !== 1 ? "s" : ""} need comments
        </motion.div>
      )}
      {mismatchCount !== null && mismatchCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 px-4 py-2 bg-amber-50 border border-amber-300 rounded text-sm text-[#1A1A1A]"
        >
          <span className="font-semibold text-amber-700">⚠</span>{" "}
          <span className="font-semibold">{mismatchCount}</span> lead{mismatchCount !== 1 ? "s" : ""} with data mismatch{mismatchCount !== 1 ? "es" : ""} — address before your GM meeting
        </motion.div>
      )}

      <div className="border border-[#E6E6E6] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-[#6E6E6E] uppercase tracking-wide">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Reservation ID</th>
              <th className="px-4 py-3">Res. Type</th>
              <th className="px-4 py-3">CDP</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Days Open</th>
              <th className="px-4 py-3">Time to 1st Contact</th>
              <th className="px-4 py-3">Last Activity</th>
              <th className="px-4 py-3">Comments</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => {
              const isHighlighted = lead.id === highlightId;
              const isEnriched = enrichedIds.includes(lead.id) || lead.enrichmentComplete;
              const lastTime = getLastTranslogTime(lead);
              const relativeTime = formatRelativeTime(lastTime);
              const isStale = isOverOneWeek(lastTime);
              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    backgroundColor: isHighlighted ? "#FFF9E0" : "transparent",
                  }}
                  transition={{ delay: i * 0.05 }}
                  className={`border-t border-[#E6E6E6] ${
                    onLeadClick ? "cursor-pointer hover:bg-gray-50" : ""
                  } ${isHighlighted ? "ring-2 ring-[#FFD100] ring-inset" : ""}`}
                  onClick={() => onLeadClick?.(lead)}
                >
                  <td className="px-4 py-3 font-medium text-[#1A1A1A]">{lead.customer}</td>
                  <td className="px-4 py-3 text-[#6E6E6E] font-mono text-xs">{lead.reservationId}</td>
                  <td className="px-4 py-3 text-[#6E6E6E] text-xs">{lead.reservationType || "—"}</td>
                  <td className="px-4 py-3 text-[#6E6E6E] font-mono text-xs">{lead.cdp || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={lead.status} />
                      {lead.mismatch && (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
                          title="Data mismatch — HLES, TRANSLOG, and BM comments don't align"
                        >
                          Mismatch
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{lead.daysOpen}</td>
                  <td className="px-4 py-3">{lead.timeToFirstContact}</td>
                  <td className={`px-4 py-3 ${isStale ? "text-[#C62828] font-medium" : "text-[#6E6E6E]"}`}>
                    {relativeTime}
                  </td>
                  <td className="px-4 py-3">
                    {isEnriched ? (
                      <span className="text-[#2E7D32]">✓</span>
                    ) : (
                      <span className="text-[#C62828]">—</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { getLastTranslogTime };
