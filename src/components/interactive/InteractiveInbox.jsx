import { motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import { getAllLeads } from "../../selectors/demoSelectors";
import StatusBadge from "../StatusBadge";

export default function InteractiveInbox() {
  const { navigateTo, selectLead } = useApp();
  const directiveLeads = getAllLeads().filter((l) => l.gmDirective);

  const handleClick = (lead) => {
    selectLead(lead.id);
    navigateTo("bm-lead-detail");
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-1">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Inbox</h2>
        {directiveLeads.length > 0 && (
          <span className="px-2 py-1 bg-[#C62828] text-white rounded text-xs font-medium">
            {directiveLeads.length} directive{directiveLeads.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-sm text-[#6E6E6E] mb-5">
        Messages from your General Manager tied to specific reservations. Click to review and take action.
      </p>

      {directiveLeads.length === 0 ? (
        <div className="text-center py-12 text-[#6E6E6E]">
          No directives — your inbox is clear.
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {directiveLeads.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => handleClick(lead)}
              className="border border-[#E6E6E6] rounded-lg p-4 cursor-pointer hover:border-[#F5C400] hover:shadow-sm transition-all group"
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#1A1A1A]">{lead.customer}</span>
                  <span className="text-xs font-mono text-[#6E6E6E]">{lead.reservationId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lead.status} />
                  {!lead.enrichmentComplete && (
                    <span className="text-xs text-[#C62828] font-medium">Needs comments</span>
                  )}
                </div>
              </div>

              {/* Directive message */}
              <div className="flex gap-3">
                <div className="shrink-0 mt-0.5">
                  <span className="w-6 h-6 rounded-full bg-[#F5C400] text-[#1A1A1A] text-[10px] font-bold flex items-center justify-center">
                    GM
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#1A1A1A] leading-relaxed">
                    {lead.gmDirective}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#E6E6E6]">
                <div className="flex items-center gap-4 text-xs text-[#6E6E6E]">
                  <span>{lead.branch}</span>
                  <span>{lead.daysOpen}d open</span>
                  {lead.reservationType && <span>{lead.reservationType}</span>}
                </div>
                <span className="text-xs text-[#F5C400] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Review &rarr;
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
