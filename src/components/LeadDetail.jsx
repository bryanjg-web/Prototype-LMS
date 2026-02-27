import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";
import TranslogTimeline from "./TranslogTimeline";
import { getHierarchyForBranch } from "../selectors/demoSelectors";

export default function LeadDetail({ lead, enrichmentSlot }) {
  const hierarchy = getHierarchyForBranch(lead.branch);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-2 gap-8 h-full"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">{lead.customer}</h2>
          <p className="text-sm text-[#6E6E6E] font-mono">{lead.reservationId}</p>
        </div>

        {hierarchy && (
          <div className="flex items-center gap-2 text-xs text-[#6E6E6E] bg-gray-50 rounded px-3 py-2">
            <span><span className="font-medium text-[#1A1A1A]">BM</span> {hierarchy.bm}</span>
            <span className="text-[#E6E6E6]">→</span>
            <span><span className="font-medium text-[#1A1A1A]">AM</span> {hierarchy.am}</span>
            <span className="text-[#E6E6E6]">→</span>
            <span><span className="font-medium text-[#1A1A1A]">GM</span> {hierarchy.gm}</span>
            <span className="text-[#E6E6E6]">→</span>
            <span><span className="font-medium text-[#1A1A1A]">Zone</span> {hierarchy.zone}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#6E6E6E] text-xs uppercase">Status</p>
            <StatusBadge status={lead.status} />
          </div>
          <div>
            <p className="text-[#6E6E6E] text-xs uppercase">Days Open</p>
            <p className="font-medium">{lead.daysOpen}</p>
          </div>
          <div>
            <p className="text-[#6E6E6E] text-xs uppercase">Time to 1st Contact</p>
            <div className="flex items-center gap-2">
              <p className="font-medium">{lead.timeToFirstContact}</p>
              {lead.firstContactBy && lead.firstContactBy !== "none" && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  lead.firstContactBy === "branch"
                    ? "bg-green-50 text-[#2E7D32] border border-green-200"
                    : "bg-red-50 text-[#C62828] border border-red-200"
                }`}>
                  {lead.firstContactBy === "branch" ? "Branch" : "HRD"}
                </span>
              )}
            </div>
          </div>
          {lead.timeToCancel && (
            <div>
              <p className="text-[#6E6E6E] text-xs uppercase">Time to Cancellation</p>
              <p className="font-medium">{lead.timeToCancel}</p>
            </div>
          )}
          {lead.hlesReason && (
            <div className="col-span-2">
              <p className="text-[#6E6E6E] text-xs uppercase">HLES Cancellation Reason</p>
              <p className="font-medium text-[#C62828]">{lead.hlesReason}</p>
            </div>
          )}
        </div>

        <TranslogTimeline events={lead.translog} />
      </div>

      <div className="border-l border-[#E6E6E6] pl-8">
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">LMS Comments</h3>
        {enrichmentSlot}
      </div>
    </motion.div>
  );
}
