/**
 * SmsComposeModal — Template picker + editable body before sending SMS.
 * Mirrors the EmailComposeModal pattern (framer-motion overlay).
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SMS_TEMPLATES = [
  {
    id: "general",
    label: "General",
    description: "Warm outreach about the reservation",
    body: (c, b, res) =>
      `Hi ${c}, thank you for choosing Hertz. We're reaching out from ${b} about your reservation ${res}. We're here to help — please call us at your convenience.`,
  },
  {
    id: "pickup_ready",
    label: "Pickup Ready",
    description: "Vehicle ready for collection",
    body: (c, b, res) =>
      `Hi ${c}, great news! Your Hertz vehicle is ready for collection at ${b} (reservation ${res}). We look forward to welcoming you — see you soon!`,
  },
  {
    id: "reminder",
    label: "Reminder",
    description: "Friendly nudge — plans may have changed",
    body: (c, b, res) =>
      `Hi ${c}, friendly reminder that your Hertz rental (${res}) is confirmed at ${b}. If your plans have changed, we're happy to help you reschedule. Call us anytime!`,
  },
  {
    id: "callback",
    label: "Callback",
    description: "We'd love to hear from you",
    body: (c, b, res) =>
      `Hi ${c}, we've been trying to reach you about your Hertz reservation ${res} at ${b}. We'd love to help — please give us a call when you have a moment.`,
  },
];

function segmentInfo(text) {
  const len = text.length;
  const perSegment = 160;
  const segments = len === 0 ? 0 : Math.ceil(len / perSegment);
  return { len, segments, perSegment };
}

export default function SmsComposeModal({ lead, onSend, onCancel }) {
  const [templateId, setTemplateId] = useState("general");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const customer = lead?.customer ?? "there";
  const branch = lead?.branch ?? "your branch";
  const reservationId = lead?.reservationId ?? "";

  const template = useMemo(
    () => SMS_TEMPLATES.find((t) => t.id === templateId) ?? SMS_TEMPLATES[0],
    [templateId]
  );

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    setBody(template.body(customer, branch, reservationId));
    setError(null);
  }, [templateId, template, customer, branch, reservationId]);

  const { len, segments } = segmentInfo(body);

  const handleSend = async () => {
    if (!body.trim()) {
      setError("Message body is required");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onSend({ body });
    } catch (err) {
      setError(err?.message ?? "Failed to send SMS");
      setSending(false);
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
          className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col border border-[var(--neutral-200)]"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-[var(--neutral-200)] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-[var(--hertz-black)]">Compose SMS</h3>
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
            <p className="text-sm text-[var(--neutral-600)]">
              To: <span className="font-medium text-[var(--hertz-black)]">{lead.phone}</span>
              <span className="mx-2 text-[var(--neutral-300)]">·</span>
              {lead.customer}
            </p>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Template selector */}
            <div>
              <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-2">
                Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SMS_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      templateId === t.id
                        ? "border-[var(--hertz-primary)] bg-[var(--hertz-primary-subtle)] ring-1 ring-[var(--hertz-primary)]"
                        : "border-[var(--neutral-200)] hover:border-[var(--neutral-300)] hover:bg-[var(--neutral-50)]"
                    }`}
                  >
                    <span className="font-medium text-[var(--hertz-black)] block">{t.label}</span>
                    <span className="text-xs text-[var(--neutral-500)] leading-tight">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message body */}
            <div>
              <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-1">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => { setBody(e.target.value); setError(null); }}
                rows={5}
                className="w-full border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white leading-relaxed focus:border-[var(--hertz-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--hertz-primary)] resize-none"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-[var(--neutral-500)]">
                  {len} character{len !== 1 ? "s" : ""}
                  {segments > 0 && (
                    <span className={segments > 2 ? "text-amber-600 font-medium" : ""}>
                      {" · "}{segments} segment{segments !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
                {segments > 2 && (
                  <p className="text-xs text-amber-600">Consider shortening</p>
                )}
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
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-md hover:bg-[var(--hertz-primary-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[var(--hertz-black)]/30 border-t-[var(--hertz-black)] rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Send SMS
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
