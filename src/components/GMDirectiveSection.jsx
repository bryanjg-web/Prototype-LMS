import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { formatDateTimeShort, formatDateOnly } from "../utils/dateTime";

export default function GMDirectiveSection({ lead }) {
  const { fetchGmDirectives, insertGmDirective } = useData();
  const { userProfile } = useAuth();

  const [directives, setDirectives] = useState([]);
  const [directiveText, setDirectiveText] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const loadDirectives = useCallback(async () => {
    if (!lead?.id || !fetchGmDirectives) return;
    setLoadingHistory(true);
    try {
      const data = await fetchGmDirectives(lead.id);
      setDirectives(data);
    } catch (err) {
      console.error("[GMDirectiveSection] Failed to load directives:", err);
      setDirectives([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [lead?.id, fetchGmDirectives]);

  useEffect(() => {
    loadDirectives();
  }, [loadDirectives]);

  const handleSubmit = async () => {
    if (!directiveText.trim() || !lead?.id) return;
    setSaving(true);
    try {
      await insertGmDirective({
        leadId: lead.id,
        directiveText: directiveText.trim(),
        priority,
        dueDate: dueDate || null,
        createdBy: userProfile?.id ?? null,
        createdByName: userProfile?.displayName ?? "General Manager",
      });
      setDirectiveText("");
      setPriority("normal");
      setDueDate("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadDirectives();
    } catch (err) {
      console.error("[GMDirectiveSection] Failed to save directive:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso) => formatDateTimeShort(iso);

  const formatDueDate = (dateStr) => formatDateOnly(dateStr);

  const isDueDatePast = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr + "T23:59:59") < new Date();
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const latestDirective = directives[0] ?? null;
  const olderDirectives = directives.slice(1);

  return (
    <div className="border border-[var(--neutral-200)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--hertz-black)] px-5 py-3 flex items-center gap-2.5">
        <svg className="w-4 h-4 text-[var(--hertz-primary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <h3 className="text-sm font-bold text-white tracking-wide">GM Directive</h3>
      </div>

      <div className="p-5 space-y-4">
        {/* Latest directive (if any) */}
        {latestDirective && (
          <div className="rounded-lg bg-[var(--neutral-50)] border border-[var(--neutral-200)] p-3.5">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-[var(--neutral-500)]">
                Latest — {latestDirective.createdByName}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {latestDirective.priority === "urgent" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                    Urgent
                  </span>
                )}
                <span className="text-[11px] text-[var(--neutral-400)]">{formatDate(latestDirective.createdAt)}</span>
              </div>
            </div>
            <p className="text-sm text-[var(--hertz-black)] leading-relaxed">{latestDirective.directiveText}</p>
            {latestDirective.dueDate && (
              <div className="flex items-center gap-1.5 mt-2">
                <svg className="w-3 h-3 text-[var(--neutral-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={`text-xs font-medium ${isDueDatePast(latestDirective.dueDate) ? "text-red-600" : "text-[var(--neutral-500)]"}`}>
                  Due {formatDueDate(latestDirective.dueDate)}
                  {isDueDatePast(latestDirective.dueDate) && " (overdue)"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* New directive form */}
        <div>
          <label className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wide block mb-2">
            New Directive
          </label>
          <textarea
            value={directiveText}
            onChange={(e) => setDirectiveText(e.target.value)}
            placeholder="Instruct the BM on next steps for this lead..."
            rows={3}
            className="w-full border border-[var(--neutral-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)] resize-none placeholder:text-[var(--neutral-400)]"
          />

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4">
              {/* Due date */}
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[var(--neutral-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={dueDate}
                  min={todayStr}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border border-[var(--neutral-200)] rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors cursor-pointer"
                    title="Clear due date"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Priority toggle */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--neutral-500)] mr-1">Priority:</span>
                <button
                  type="button"
                  onClick={() => setPriority("normal")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    priority === "normal"
                      ? "bg-[var(--hertz-black)] text-white"
                      : "bg-[var(--neutral-100)] text-[var(--neutral-500)] hover:bg-[var(--neutral-200)]"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("urgent")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    priority === "urgent"
                      ? "bg-red-600 text-white"
                      : "bg-[var(--neutral-100)] text-[var(--neutral-500)] hover:bg-[var(--neutral-200)]"
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-[var(--color-success)] font-semibold flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Sent
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                onClick={handleSubmit}
                disabled={!directiveText.trim() || saving}
                className="px-4 py-2 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-xs font-bold hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Sending..." : "Send Directive"}
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        {olderDirectives.length > 0 && (
          <div className="border-t border-[var(--neutral-100)] pt-3">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--neutral-500)] hover:text-[var(--hertz-black)] transition-colors cursor-pointer w-full"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showHistory ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              Past Directives ({olderDirectives.length})
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-2 space-y-2">
                    {olderDirectives.map((d) => (
                      <li key={d.id} className="rounded-lg border border-[var(--neutral-100)] p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-[var(--neutral-500)]">{d.createdByName}</span>
                          <div className="flex items-center gap-2">
                            {d.priority === "urgent" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                                Urgent
                              </span>
                            )}
                            <span className="text-[11px] text-[var(--neutral-400)]">{formatDate(d.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--neutral-700)] leading-relaxed">{d.directiveText}</p>
                        {d.dueDate && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <svg className="w-3 h-3 text-[var(--neutral-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className={`text-xs font-medium ${isDueDatePast(d.dueDate) ? "text-red-600" : "text-[var(--neutral-500)]"}`}>
                              Due {formatDueDate(d.dueDate)}
                              {isDueDatePast(d.dueDate) && " (overdue)"}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {loadingHistory && directives.length === 0 && (
          <p className="text-xs text-[var(--neutral-400)] text-center py-2">Loading directives...</p>
        )}
      </div>
    </div>
  );
}
