import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cancellationReasonCategories, nextActions } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useData } from "../../context/DataContext";
import ConfettiCelebration from "../ConfettiCelebration";

const CLOSE_ACTION = "Close — no further action";

function formatNow() {
  const d = new Date();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function InteractiveEnrichmentForm({ lead }) {
  const { userProfile } = useAuth();
  const { role } = useApp();
  const { updateLeadEnrichment, refetchLeads } = useData();

  const existing = lead.enrichment || {};
  const [status, setStatus] = useState(lead.status || "Unused");
  const [reason, setReason] = useState(existing.reason || "");
  const [notes, setNotes] = useState(existing.notes || "");
  const [nextAction, setNextAction] = useState(existing.nextAction || "");
  const [followUpDate, setFollowUpDate] = useState(formatDateForInput(existing.followUpDate) || "");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setStatus(lead.status || "Unused");
    setReason(existing.reason || "");
    setNotes(existing.notes || "");
    setNextAction(existing.nextAction || "");
    setFollowUpDate(formatDateForInput(existing.followUpDate) || "");
  }, [lead.id, lead.status, existing.reason, existing.notes, existing.nextAction, existing.followUpDate]);

  // When status changes to Rented, pre-fill next action; when Cancelled, clear follow-up date
  useEffect(() => {
    if (status === "Rented") {
      setNextAction(CLOSE_ACTION);
      setFollowUpDate("");
    } else if (status === "Cancelled") {
      setFollowUpDate("");
    }
  }, [status]);

  const showCancellationReason = status === "Cancelled";
  const showNextAction = true;
  const showFollowUpDate = status === "Unused";

  const hasChanges =
    status !== (lead.status || "Unused") ||
    notes !== (existing.notes || "") ||
    reason !== (existing.reason || "") ||
    nextAction !== (existing.nextAction || "") ||
    followUpDate !== (formatDateForInput(existing.followUpDate) || "");

  const getValidationError = () => {
    if (status === "Cancelled") {
      if (!reason?.trim()) return "Cancellation reason is required";
      if (!nextAction?.trim()) return "Next action is required";
    }
    if (status === "Unused") {
      if (!nextAction?.trim()) return "Next action is required";
      if (!followUpDate?.trim()) return "Follow-up date is required";
    }
    if (status === "Rented") {
      if (!nextAction?.trim()) return "Next action is required";
    }
    return null;
  };

  const clearError = () => setSaveError(null);

  const handleSave = async () => {
    const err = getValidationError();
    if (err) {
      setSaveError(err);
      return;
    }

    const enrichment = {
      reason: showCancellationReason ? (reason || null) : null,
      notes: notes || "",
      nextAction: nextAction || null,
      followUpDate: showFollowUpDate && followUpDate ? followUpDate : null,
    };

    const author = userProfile?.displayName ?? lead.bmName ?? "Branch Manager";
    const userRole = userProfile?.role ?? role ?? "bm";

    const parts = [];
    const prevStatus = lead.status;
    if (status !== prevStatus) {
      parts.push(`Status changed: ${prevStatus} → ${status}`);
    }
    if (enrichment.reason) parts.push(`Reason: ${enrichment.reason}`);
    if (enrichment.nextAction) parts.push(`Next action: ${enrichment.nextAction}`);
    if (enrichment.followUpDate) parts.push(`Follow-up: ${enrichment.followUpDate}`);

    const newEntry = {
      time: formatNow(),
      timestamp: Date.now(),
      author,
      role: userRole,
      action: parts.length > 0 ? parts.join(" | ") : "Lead updated",
      notes: notes || "",
      source: "enrichment",
    };

    setSaving(true);
    setSaveError(null);
    try {
      await updateLeadEnrichment(lead.id, enrichment, newEntry, status);
      await refetchLeads?.();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      if (notes?.trim()) {
        window.dispatchEvent(new CustomEvent("onboarding:action", { detail: { actionType: "add_note" } }));
      }
      if (status === "Rented" && prevStatus !== "Rented") {
        setShowConfetti(true);
      }
    } catch (err) {
      setSaveError(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {showConfetti && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} />
      )}

      <div className="space-y-5">
        <h4 className="text-xs font-semibold text-[#6E6E6E] uppercase tracking-wide">
          Update Lead
        </h4>

        <div>
          <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
            Status
          </label>
          <div className="flex gap-2">
            {["Unused", "Cancelled", "Rented"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatus(s); clearError(); }}
                className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors cursor-pointer ${
                  status === s
                    ? "bg-[var(--hertz-primary)] border-[var(--hertz-primary)] text-[var(--hertz-black)]"
                    : "bg-white border-[var(--neutral-200)] text-[var(--neutral-600)] hover:border-[var(--neutral-300)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {showCancellationReason && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
              Cancellation Reason <span className="text-[var(--color-error)]">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => { setReason(e.target.value); clearError(); }}
              className={`w-full border rounded px-3 py-2 text-sm bg-white focus:border-[#FFD100] focus:outline-none ${
                showCancellationReason && !reason?.trim()
                  ? "border-[var(--hertz-primary)] animate-hertz-pulse"
                  : "border-[#E6E6E6]"
              }`}
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
          </motion.div>
        )}

        {showNextAction && (
          <div>
            <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
              Next Action {(status === "Cancelled" || status === "Unused") && <span className="text-[var(--color-error)]">*</span>}
            </label>
            <select
              value={nextAction}
              onChange={(e) => { setNextAction(e.target.value); clearError(); }}
              disabled={status === "Rented"}
              className={`w-full border rounded px-3 py-2 text-sm bg-white focus:border-[#FFD100] focus:outline-none disabled:bg-[var(--neutral-50)] disabled:cursor-not-allowed ${
                showNextAction && !nextAction?.trim() && status !== "Rented"
                  ? "border-[var(--hertz-primary)] animate-hertz-pulse"
                  : "border-[#E6E6E6]"
              }`}
            >
              <option value="">Select next action...</option>
              {nextActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}

        {showFollowUpDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
              Follow-up Date <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => { setFollowUpDate(e.target.value); clearError(); }}
              className={`w-full border rounded px-3 py-2 text-sm bg-white focus:border-[#FFD100] focus:outline-none ${
                showFollowUpDate && !followUpDate?.trim()
                  ? "border-[var(--hertz-primary)] animate-hertz-pulse"
                  : "border-[#E6E6E6]"
              }`}
            />
          </motion.div>
        )}

        <div data-onboarding="notes-textarea">
          <div>
            <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); clearError(); }}
              rows={3}
              placeholder="Add notes..."
              className="w-full border border-[#E6E6E6] rounded px-3 py-2 text-sm bg-white focus:border-[#FFD100] focus:outline-none resize-none"
            />
          </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-4 py-2 bg-[#FFD100] text-[#1A1A1A] rounded text-sm font-medium hover:bg-[#E6BC00] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Update Lead"}
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
    </div>
  );
}
