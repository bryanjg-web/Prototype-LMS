/**
 * CreateTaskModal — lets BMs create tasks linked to a lead.
 * All mandatory attributes (lead, title, due date, priority) must be set before creating.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const VALID_PRIORITIES = new Set(PRIORITY_OPTIONS);

export default function CreateTaskModal({ onSubmit, onCancel, lead = null, branchLeads = [], branch, userProfile }) {
  const [selectedLeadId, setSelectedLeadId] = useState(lead?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedLead = lead ?? (selectedLeadId ? branchLeads.find((l) => String(l.id) === String(selectedLeadId)) : null);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (lead) {
      setSelectedLeadId(String(lead.id));
      setTitle(`Follow up: ${lead.customer} (${lead.reservationId})`);
    } else if (branchLeads.length === 1) {
      setSelectedLeadId(String(branchLeads[0].id));
    }
  }, [lead, branchLeads]);

  const isValid = Boolean(
    title.trim() &&
    selectedLeadId &&
    dueDate &&
    VALID_PRIORITIES.has(priority)
  );

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!selectedLeadId) {
      setError("Please select a lead");
      return;
    }
    if (!dueDate) {
      setError("Due date is required");
      return;
    }
    if (!VALID_PRIORITIES.has(priority)) {
      setError("Please select a valid priority");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        dueDate,
        priority,
        leadId: Number(selectedLeadId) || selectedLeadId,
        assignedTo: userProfile?.id ?? null,
        assignedToName: userProfile?.displayName ?? branch ?? null,
        assignedBranch: branch,
        createdBy: userProfile?.id ?? null,
        createdByName: userProfile?.displayName ?? null,
        source: "bm_created",
      });
    } catch (err) {
      setError(err?.message ?? "Failed to create task");
      setSaving(false);
    }
  };

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
          className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col border border-[var(--neutral-200)]"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-[var(--neutral-200)] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-[var(--hertz-black)]">Create Task</h3>
              <button
                type="button"
                onClick={onCancel}
                className="p-1 text-[var(--neutral-500)] hover:text-[var(--hertz-black)] transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            {selectedLead && (
              <p className="text-sm text-[var(--neutral-600)]">
                Linked to: <span className="font-medium text-[var(--hertz-black)]">{selectedLead.customer}</span>
                <span className="mx-2 text-[var(--neutral-300)]">·</span>
                {selectedLead.reservationId}
              </p>
            )}
          </div>

          {/* Form */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {!lead && (
              <div>
                <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-1">
                  Lead <span className="text-[var(--color-error)]">*</span>
                </label>
                {branchLeads.length === 0 ? (
                  <p className="text-sm text-[var(--neutral-600)] py-2">No leads in this branch. Add leads first.</p>
                ) : (
                  <select
                    value={selectedLeadId}
                    onChange={(e) => { setSelectedLeadId(e.target.value); setError(null); }}
                    className="w-full border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white focus:border-[var(--hertz-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--hertz-primary)]"
                    required
                  >
                    <option value="">Select a lead…</option>
                    {branchLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.customer ?? "—"} ({l.reservationId ?? l.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-1">
                Title <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(null); }}
                placeholder="e.g. Call customer back tomorrow"
                className="w-full border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white focus:border-[var(--hertz-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--hertz-primary)]"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional notes or details"
                className="w-full border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white leading-relaxed focus:border-[var(--hertz-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--hertz-primary)] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-1">
                  Due Date <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); setError(null); }}
                  className="w-full border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white focus:border-[var(--hertz-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--hertz-primary)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-1">
                  Priority
                </label>
                <div className="flex gap-1">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                        priority === p
                          ? p === "High"
                            ? "bg-[var(--color-error)] text-white"
                            : p === "Medium"
                            ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]"
                            : "bg-[var(--neutral-600)] text-white"
                          : "border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-50)]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--neutral-200)] shrink-0">
            {error && (
              <p className="text-sm text-[var(--color-error)] mb-3">{error}</p>
            )}
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-[var(--neutral-600)] border border-[var(--neutral-200)] rounded-md hover:bg-[var(--neutral-50)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !isValid}
                className="px-4 py-2 text-sm font-medium bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-md hover:bg-[var(--hertz-primary-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[var(--hertz-black)]/30 border-t-[var(--hertz-black)] rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Task
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
