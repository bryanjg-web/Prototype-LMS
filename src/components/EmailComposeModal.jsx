/**
 * EmailComposeModal — Template picker + editable subject/body before sending.
 * Matches the modal pattern from StatusChangeModal (framer-motion overlay).
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EMAIL_TEMPLATES = [
  {
    id: "general",
    label: "General",
    description: "Warm outreach about the reservation",
    subject: (res) => `Your Hertz reservation – ${res}`,
    body: (c, b, res) =>
      `Hi ${c},\n\nThank you for choosing Hertz — we truly appreciate your business. We're reaching out from our ${b} location regarding your reservation ${res}.\n\nOur goal is to provide a seamless and reliable experience every time you rent with us. If there's anything we can help with — whether it's adjusting your reservation, answering questions, or simply making your trip a little easier — please don't hesitate to reach out.\n\nWe're here for you and look forward to getting you on the road.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
  {
    id: "confirmation",
    label: "Pickup Confirmation",
    description: "Rental confirmed — welcoming the customer",
    subject: (res) => `Great news — your rental is confirmed – ${res}`,
    body: (c, b, res) =>
      `Hi ${c},\n\nGreat news — your Hertz rental reservation ${res} has been confirmed, and we're excited to help you get on your way.\n\nYour vehicle is ready for collection at our ${b} location. Please bring a valid driver's licence and the credit card used at the time of booking.\n\nIf you need to adjust your pickup time or have any questions at all, we're happy to help — don't hesitate to reach out. Our goal is to make your rental experience as smooth and dependable as possible.\n\nWe truly value your trust in Hertz and look forward to welcoming you.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
  {
    id: "reminder",
    label: "Pickup Reminder",
    description: "Friendly nudge — understanding & flexible",
    subject: (res) => `Friendly reminder – your Hertz rental ${res} is ready`,
    body: (c, b, res) =>
      `Hi ${c},\n\nWe hope this message finds you well. Just a friendly reminder that your Hertz rental reservation ${res} is confirmed, and your vehicle is reserved and waiting for you at our ${b} location.\n\nWe understand that plans can change — and that's perfectly okay. If you need to adjust your pickup time or reschedule, we're happy to work with you to find a time that suits you best.\n\nWe want to make sure everything goes smoothly for your trip, so please don't hesitate to let us know how we can help.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
  {
    id: "final_attempt",
    label: "Final Attempt",
    description: "Empathetic last outreach — we care",
    subject: (res) => `We'd love to hear from you – ${res}`,
    body: (c, b, res) =>
      `Hi ${c},\n\nWe've been trying to reach you regarding your Hertz reservation ${res}, which was confirmed for pickup at our ${b} location — and we want to make sure everything is okay.\n\nWe understand that life gets busy, and sometimes plans change unexpectedly. We'd love to hear from you so we can keep your reservation in place, or help you reschedule if that works better for your plans.\n\nTo make sure we can continue to hold your vehicle, please get in touch with us at ${b} at your earliest convenience. If we don't hear from you in the next 48 hours, we may need to release the reservation — but we'd genuinely love to help you get on the road.\n\nYour satisfaction matters to us, and we're here to make it work.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
];

// Official Hertz logo (Hertz-Line_White_2020.png) — white on transparent, needs dark background.
const LOGO_DATA_URI = "/Hertz-Line_White_2020.png";

function EmailPreview({ subject, body }) {
  const bodyHtml = body.replace(/\n/g, "<br>");
  return (
    <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden bg-[var(--neutral-100)]">
      <div className="text-xs text-[var(--neutral-600)] px-3 py-2 border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]">
        Preview
      </div>
      <div className="bg-[var(--neutral-100)] p-4">
        <div className="max-w-[480px] mx-auto bg-white rounded-lg overflow-hidden shadow-sm">
          <div className="bg-[var(--hertz-black)] py-4 px-6 text-center">
            <img src={LOGO_DATA_URI} alt="Hertz" width={140} height={49} className="mx-auto" />
          </div>
          <div className="h-1 bg-[var(--hertz-primary)]" />
          <div className="px-6 py-2 border-b border-[var(--neutral-200)]">
            <p className="text-xs text-[var(--neutral-500)] mb-0.5">Subject</p>
            <p className="text-sm font-semibold text-[var(--hertz-black)] truncate">{subject}</p>
          </div>
          <div
            className="px-6 py-5 text-sm leading-relaxed text-[var(--hertz-black)]"
            style={{ lineHeight: "1.7" }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
          <div className="bg-[var(--neutral-50)] px-6 py-3 border-t border-[var(--neutral-200)]">
            <p className="text-xs text-[var(--neutral-500)] m-0">We truly value your trust in Hertz.</p>
            <p className="text-[10px] text-[var(--neutral-400)] m-0 mt-1">&copy; Hertz. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailComposeModal({ lead, onSend, onCancel }) {
  const [templateId, setTemplateId] = useState("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const customer = lead?.customer ?? "Customer";
  const branch = lead?.branch ?? "your branch";
  const reservationId = lead?.reservationId ?? "";

  const template = useMemo(
    () => EMAIL_TEMPLATES.find((t) => t.id === templateId) ?? EMAIL_TEMPLATES[0],
    [templateId]
  );

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    setSubject(template.subject(reservationId));
    setBody(template.body(customer, branch, reservationId));
    setShowPreview(false);
    setError(null);
  }, [templateId, template, customer, branch, reservationId]);

  const handleSend = async () => {
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (!body.trim()) {
      setError("Message body is required");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onSend({ template: templateId, subject, body });
    } catch (err) {
      setError(err?.message ?? "Failed to send email");
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
          className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col border border-[var(--neutral-200)]"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-[var(--neutral-200)] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-[var(--hertz-black)]">Compose Email</h3>
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
              To: <span className="font-medium text-[var(--hertz-black)]">{lead.email}</span>
              <span className="mx-2 text-[var(--neutral-300)]">·</span>
              {lead.customer} · {lead.reservationId}
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
                {EMAIL_TEMPLATES.map((t) => (
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

            {/* Subject */}
            <div>
              <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setError(null); }}
                className="w-full border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white focus:border-[var(--hertz-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--hertz-primary)]"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-xs text-[var(--neutral-600)] uppercase tracking-wide block mb-1">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => { setBody(e.target.value); setError(null); }}
                rows={8}
                className="w-full border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white leading-relaxed focus:border-[var(--hertz-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--hertz-primary)] resize-none"
              />
            </div>

            {/* Preview toggle */}
            {showPreview && <EmailPreview subject={subject} body={body} />}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--neutral-200)] shrink-0">
            {error && (
              <p className="text-sm text-[var(--color-error)] mb-3">{error}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="px-3 py-2 text-sm font-medium text-[var(--neutral-600)] border border-[var(--neutral-200)] rounded-md hover:bg-[var(--neutral-50)] transition-colors"
              >
                {showPreview ? "Hide Preview" : "Preview"}
              </button>
              <div className="flex-1" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Email
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
