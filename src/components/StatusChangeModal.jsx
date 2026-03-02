import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../context/DataContext";
import { formatDateForInput } from "../utils/dateTime";

const CLOSE_ACTION = "Close — no further action";

/** Required fields per target status */
export function getRequiredFieldsForStatus(status) {
  switch (status) {
    case "Cancelled":
      return { reason: true, nextAction: true };
    case "Unused":
      return { nextAction: true, followUpDate: true };
    case "Rented":
      return { nextAction: true };
    default:
      return {};
  }
}

/** Returns true if target status needs a popup before changing */
export function statusChangeNeedsModal(targetStatus) {
  const fields = getRequiredFieldsForStatus(targetStatus);
  return Object.keys(fields).length > 0;
}

export default function StatusChangeModal({ lead, fromStatus, toStatus, onConfirm, onCancel }) {
  const { cancellationReasonCategories, nextActions } = useData();
  const existing = lead?.enrichment || {};
  const [reason, setReason] = useState(existing.reason || "");
  const [nextAction, setNextAction] = useState(existing.nextAction || "");
  const [followUpDate, setFollowUpDate] = useState(formatDateForInput(existing.followUpDate) || "");
  const [notes, setNotes] = useState(existing.notes || "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fields = getRequiredFieldsForStatus(toStatus);
  const showReason = fields.reason;
  const showNextAction = fields.nextAction;
  const showFollowUpDate = fields.followUpDate;

  useEffect(() => {
    if (toStatus === "Rented") {
      setNextAction(CLOSE_ACTION);
    }
  }, [toStatus]);

  const clearError = () => setError(null);

  const getValidationError = () => {
    if (showReason && !reason?.trim()) return "Cancellation reason is required";
    if (showNextAction && !nextAction?.trim()) return "Next action is required";
    if (showFollowUpDate && !followUpDate?.trim()) return "Follow-up date is required";
    return null;
  };

  const handleConfirm = async () => {
    const err = getValidationError();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const enrichment = {
        reason: showReason ? (reason || null) : (existing.reason ?? null),
        notes: notes || existing.notes || "",
        nextAction: showNextAction ? (nextAction || null) : (existing.nextAction ?? null),
        followUpDate: showFollowUpDate && followUpDate ? followUpDate : (existing.followUpDate ?? null),
      };
      await onConfirm(enrichment);
      onCancel();
    } catch (e) {
      setError(e?.message ?? "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-[var(--neutral-200)]"
        >
          <h3 className="text-lg font-bold text-[var(--hertz-black)] mb-1">
            Change status to {toStatus}
          </h3>
          <p className="text-sm text-[var(--neutral-600)] mb-4">
            {lead.customer} · {lead.reservationId}
          </p>

          <div className="space-y-4">
            {showReason && (
              <div>
                <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
                  Cancellation Reason <span className="text-[var(--color-error)]">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); clearError(); }}
                  className={`w-full border rounded px-3 py-2 text-sm bg-white focus:border-[#FFD100] focus:outline-none ${
                    error && !reason?.trim() ? "border-[var(--color-error)]/50" : "border-[#E6E6E6]"
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
              </div>
            )}

            {showNextAction && (
              <div>
                <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
                  Next Action <span className="text-[var(--color-error)]">*</span>
                </label>
                <select
                  value={nextAction}
                  onChange={(e) => { setNextAction(e.target.value); clearError(); }}
                  disabled={toStatus === "Rented"}
                  className={`w-full border rounded px-3 py-2 text-sm bg-white focus:border-[#FFD100] focus:outline-none disabled:bg-[var(--neutral-50)] disabled:cursor-not-allowed ${
                    error && !nextAction?.trim() && toStatus !== "Rented" ? "border-[var(--color-error)]/50" : "border-[#E6E6E6]"
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
              <div>
                <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
                  Follow-up Date <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => { setFollowUpDate(e.target.value); clearError(); }}
                  className={`w-full border rounded px-3 py-2 text-sm bg-white focus:border-[#FFD100] focus:outline-none ${
                    error && !followUpDate?.trim() ? "border-[var(--color-error)]/50" : "border-[#E6E6E6]"
                  }`}
                />
              </div>
            )}

            <div>
              <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); clearError(); }}
                rows={2}
                placeholder="Add notes (optional)..."
                className="w-full border border-[#E6E6E6] rounded px-3 py-2 text-sm bg-white focus:border-[#FFD100] focus:outline-none resize-none"
              />
            </div>
          </div>

          {error && (
            <span className="text-sm text-[var(--color-error)] block mt-2">{error}</span>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-[var(--neutral-200)] rounded text-sm font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-50)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#FFD100] text-[#1A1A1A] rounded text-sm font-medium hover:bg-[#E6BC00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
