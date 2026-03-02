/**
 * Meeting Prep Lead Queue — 8 columns, priority-sorted.
 * Columns: Customer | Status | Confirmation # | Insurance | Contact Source | Time to Contact | Lead Received | Comment Status
 */
import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";
import { formatDateOnly } from "../utils/dateTime";

export default function MeetingPrepLeadQueue({
  leads,
  onLeadClick = null,
  isReadOnly = false,
  embedded = false,
}) {
  const content = (
    <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="bg-[var(--neutral-50)] text-left text-xs text-[var(--neutral-600)] uppercase tracking-wide">
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Confirmation #</th>
            <th className="px-4 py-3">Insurance</th>
            <th className="px-4 py-3">Contact Source</th>
            <th className="px-4 py-3">Time to Contact</th>
            <th className="px-4 py-3">Lead Received</th>
            <th className="px-4 py-3">Comment Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => {
            const hasComment = !!(lead.enrichment?.reason || lead.enrichment?.notes);
            const contactSource = lead.firstContactBy === "branch" ? "Branch" : lead.firstContactBy === "hrd" ? "HRD" : "—";
            const leadReceived = lead.initDtFinal ?? lead.init_dt_final ?? "—";
            const leadReceivedFormatted = typeof leadReceived === "string" && leadReceived !== "—"
              ? formatDateOnly(leadReceived)
              : leadReceived;
            return (
              <motion.tr
                key={lead.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`border-t border-[var(--neutral-200)] ${
                  onLeadClick ? "cursor-pointer hover:bg-[var(--neutral-50)]" : ""
                }`}
                onClick={() => onLeadClick?.(lead)}
              >
                <td className="px-4 py-3 font-medium text-[var(--hertz-black)]">{lead.customer}</td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-4 py-3 text-[var(--neutral-600)] font-mono text-xs">{lead.reservationId}</td>
                <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.insuranceCompany ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--neutral-600)]">{contactSource}</td>
                <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.timeToFirstContact ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--neutral-600)]">{leadReceivedFormatted}</td>
                <td className="px-4 py-3">
                  {hasComment ? (
                    <span className="text-[var(--color-success)]">✓</span>
                  ) : (
                    <span className="text-[var(--neutral-500)]">—</span>
                  )}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
  );

  if (embedded) {
    return content;
  }
  return <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden">{content}</div>;
}
