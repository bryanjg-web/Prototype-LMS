import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";
import TranslogTimeline from "./TranslogTimeline";

export default function ThreeColumnReview({ lead, showMismatchWarning = false }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-[#1A1A1A]">{lead.customer}</h2>
        <StatusBadge status={lead.status} />
        <span className="text-sm text-[#6E6E6E] font-mono">{lead.reservationId}</span>
        {lead.bmName && <span className="text-sm text-[#6E6E6E]">• {lead.bmName}</span>}
      </div>

      {showMismatchWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="px-4 py-2 bg-yellow-50 border border-[#F5C400] rounded text-sm text-[#1A1A1A] flex items-center gap-2"
        >
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-[#F5C400] text-lg"
          >
            ⚠
          </motion.span>
          Stated reason does not match recorded activity
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-6 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-[#E6E6E6] rounded-lg p-4"
        >
          <h3 className="text-xs font-semibold text-[#6E6E6E] uppercase tracking-wide mb-3">
            HLES Reason
          </h3>
          <p className="text-sm font-medium text-[#C62828]">{lead.hlesReason || "—"}</p>
          <div className="mt-3 text-xs text-[#6E6E6E] space-y-1">
            <p>Time to 1st contact: {lead.timeToFirstContact}</p>
            {lead.timeToCancel && <p>Time to cancellation: {lead.timeToCancel}</p>}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-[#E6E6E6] rounded-lg p-4"
        >
          <TranslogTimeline events={lead.translog} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-[#E6E6E6] rounded-lg p-4"
        >
          <h3 className="text-xs font-semibold text-[#6E6E6E] uppercase tracking-wide mb-3">
            BM Comments
          </h3>
          {lead.enrichment?.reason ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-[#6E6E6E]">Reason:</span> {lead.enrichment.reason}</p>
              {lead.enrichment.notes && (
                <p><span className="text-[#6E6E6E]">Notes:</span> {lead.enrichment.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#6E6E6E] italic">No comments recorded</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
