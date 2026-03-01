import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import BackButton from "../BackButton";
import { useData } from "../../context/DataContext";
import { getCancelledLeads, getLeadById } from "../../selectors/demoSelectors";
import ThreeColumnReview from "../ThreeColumnReview";
import StatusBadge from "../StatusBadge";

export default function InteractiveThreeColumn() {
  const { selectedLeadId, selectLead, navigateTo } = useApp();
  const { leads } = useData();
  const cancelledLeads = getCancelledLeads(leads);
  const lead = getLeadById(leads, selectedLeadId) || cancelledLeads[0];

  const [directive, setDirective] = useState("");
  const [isArchived, setIsArchived] = useState(false);

  const handleArchive = () => {
    setIsArchived(true);
    setTimeout(() => setIsArchived(false), 2000);
  };

  const handleLeadSwitch = (l) => {
    selectLead(l.id);
    setDirective("");
    setIsArchived(false);
  };

  return (
    <div>
      <BackButton onClick={() => navigateTo("gm-lead-review")} label="Back to leads" />

      {/* Mini lead selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {cancelledLeads.map((l) => (
          <button
            key={l.id}
            onClick={() => handleLeadSwitch(l)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              lead?.id === l.id
                ? "bg-[#FFD100] text-[#1A1A1A]"
                : "bg-gray-100 text-[#6E6E6E] hover:bg-gray-200"
            }`}
          >
            {l.customer}
          </button>
        ))}
      </div>

      {lead && (
        <div className="space-y-6">
          <ThreeColumnReview lead={lead} showMismatchWarning={lead.mismatch} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-md space-y-3"
          >
            <div>
              <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
                GM Directive
              </label>
              <textarea
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
                rows={2}
                placeholder="Add directive for BM..."
                className="w-full border border-[#FFD100] bg-amber-50 rounded px-3 py-2 text-sm focus:outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleArchive}
                className="px-3 py-1.5 bg-[#6E6E6E] text-white rounded text-sm hover:bg-[#555] transition-colors cursor-pointer"
              >
                ✓ Archive — Reviewed
              </button>
              {isArchived && <StatusBadge status="Reviewed" />}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
