import { useApp } from "../../context/AppContext";
import { getCancelledLeads, getUnusedLeads } from "../../selectors/demoSelectors";
import LeadQueue from "../LeadQueue";

export default function InteractiveToDo() {
  const { navigateTo, selectLead } = useApp();

  const unenrichedCancelled = getCancelledLeads().filter((l) => !l.enrichmentComplete);
  const unenrichedUnused = getUnusedLeads().filter((l) => !l.enrichmentComplete);
  const todoLeads = [...unenrichedCancelled, ...unenrichedUnused];

  const handleLeadClick = (lead) => {
    selectLead(lead.id);
    navigateTo("bm-lead-detail");
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-1">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">My To Do</h2>
        <span className="px-2 py-1 bg-[#C62828] text-white rounded text-xs font-medium">
          {todoLeads.length} pending
        </span>
      </div>
      <p className="text-sm text-[#6E6E6E] mb-4">
        Cancelled and unused leads that still need comments.
      </p>
      {todoLeads.length === 0 ? (
        <div className="text-center py-12 text-[#6E6E6E]">
          All caught up — no leads need comments.
        </div>
      ) : (
        <LeadQueue leads={todoLeads} onLeadClick={handleLeadClick} />
      )}
    </div>
  );
}
