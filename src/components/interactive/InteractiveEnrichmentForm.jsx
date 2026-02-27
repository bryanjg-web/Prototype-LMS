import { useState } from "react";
import { motion } from "framer-motion";
import { cancellationReasonCategories, nextActions } from "../../data/mockData";
import EnrichmentTimeline from "../EnrichmentTimeline";

function formatNow() {
  const d = new Date("2026-02-26T09:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function InteractiveEnrichmentForm({ lead }) {
  const existing = lead.enrichment || {};
  const [reason, setReason] = useState(existing.reason || "");
  const [notes, setNotes] = useState(existing.notes || "");
  const [nextAction, setNextAction] = useState(existing.nextAction || "");
  const [followUpDate, setFollowUpDate] = useState(existing.followUpDate || "");
  const [isSaved, setIsSaved] = useState(false);
  const [enrichmentLog, setEnrichmentLog] = useState(() => lead.enrichmentLog || []);

  const handleSave = () => {
    // Build a summary of what changed
    const parts = [];
    if (reason) parts.push(`Reason: ${reason}`);
    if (nextAction) parts.push(`Next action: ${nextAction}`);
    if (followUpDate) parts.push(`Follow-up: ${followUpDate}`);

    const newEntry = {
      time: formatNow(),
      author: lead.bmName || "Branch Manager",
      role: "bm",
      action: parts.length > 0 ? parts.join(" | ") : "Comment updated",
      notes: notes || "",
    };

    setEnrichmentLog((prev) => [...prev, newEntry]);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Enrichment activity log */}
      <EnrichmentTimeline entries={enrichmentLog} />

      {/* Divider */}
      <div className="border-t border-[#E6E6E6]" />

      {/* Form */}
      <div className="space-y-5">
        <h4 className="text-xs font-semibold text-[#6E6E6E] uppercase tracking-wide">
          Add Comment
        </h4>

        <div>
          <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
            Cancellation Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-[#E6E6E6] rounded px-3 py-2 text-sm bg-white focus:border-[#F5C400] focus:outline-none"
          >
            <option value="">Select a reason...</option>
            {cancellationReasonCategories.map((cat) => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
            Next Action
          </label>
          <select
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            className="w-full border border-[#E6E6E6] rounded px-3 py-2 text-sm bg-white focus:border-[#F5C400] focus:outline-none"
          >
            <option value="">Select next action...</option>
            {nextActions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
            Follow-up Date
          </label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full border border-[#E6E6E6] rounded px-3 py-2 text-sm bg-white focus:border-[#F5C400] focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes..."
            className="w-full border border-[#E6E6E6] rounded px-3 py-2 text-sm bg-white focus:border-[#F5C400] focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#F5C400] text-[#1A1A1A] rounded text-sm font-medium hover:bg-[#e0b200] transition-colors cursor-pointer"
          >
            Save Comment
          </button>
          {isSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[#2E7D32] text-sm font-medium flex items-center gap-1"
            >
              <span className="text-lg">✓</span> Saved
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
