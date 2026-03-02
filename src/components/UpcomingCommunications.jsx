import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime, formatWeekday, formatDateTimeFull } from "../utils/dateTime";

const LOGO_DATA_URI = "/Hertz-Line_White_2020.png";

function formatScheduledTime(date) {
  const now = new Date("2026-02-22T09:00:00");
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / 3600000);
  if (diffHours < 1) return "Within the hour";
  if (diffHours < 24) return `In ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return `Tomorrow, ${formatTime(date)}`;
  }
  return `${formatWeekday(date, true)}, ${formatTime(date)}`;
}

function formatAbsoluteTime(date) {
  return formatDateTimeFull(date);
}

function EmailIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function SmsIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function EmailPreviewCard({ subject, body }) {
  const bodyHtml = body.replace(/\n/g, "<br>");
  return (
    <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden bg-[var(--neutral-100)]">
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
  );
}

function SmsPreviewCard({ body, recipient }) {
  return (
    <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden bg-[var(--neutral-100)] p-4">
      <div className="max-w-[320px] mx-auto">
        <div className="bg-[var(--hertz-black)] rounded-t-2xl px-4 py-2 text-center">
          <p className="text-[10px] text-[var(--neutral-400)] font-medium tracking-wide">SMS MESSAGE</p>
          <p className="text-xs text-white font-medium mt-0.5">{recipient}</p>
        </div>
        <div className="bg-white rounded-b-2xl px-4 py-5 border border-t-0 border-[var(--neutral-200)]">
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--hertz-primary)] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-[var(--hertz-black)]">H</span>
            </div>
            <div className="bg-[var(--neutral-100)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-[var(--hertz-black)] leading-relaxed flex-1">
              {body}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunicationPreviewPane({ item, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!item) return null;

  const isEmail = item.type === "email";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-[var(--neutral-200)] px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isEmail
                  ? "bg-blue-50 text-blue-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}>
                {isEmail ? <EmailIcon className="w-4 h-4" /> : <SmsIcon className="w-4 h-4" />}
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--hertz-black)] truncate">{item.label}</h2>
                <p className="text-xs text-[var(--neutral-600)]">Automated {isEmail ? "Email" : "SMS"}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-[var(--neutral-100)] text-[var(--neutral-600)] shrink-0 cursor-pointer"
              aria-label="Close panel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-[var(--neutral-500)] uppercase tracking-wide font-medium mb-1">Recipient</p>
                <p className="text-sm font-medium text-[var(--hertz-black)] font-mono break-all">{item.recipient}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--neutral-500)] uppercase tracking-wide font-medium mb-1">Scheduled</p>
                <p className="text-sm font-medium text-[var(--hertz-black)]">{formatAbsoluteTime(item.scheduledAt)}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[var(--neutral-500)] uppercase tracking-wide font-medium mb-1">Trigger</p>
              <p className="text-sm text-[var(--hertz-black)]">{item.reason}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-sm text-blue-800 font-medium">Scheduled</span>
              <span className="text-xs text-blue-600 ml-auto">{formatScheduledTime(item.scheduledAt)}</span>
            </div>

            <div className="h-px bg-[var(--neutral-200)]" />

            {/* Content preview */}
            <div>
              <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-3">
                {isEmail ? "Email Preview" : "SMS Preview"}
              </p>
              {isEmail && item.contentPreview && (
                <EmailPreviewCard
                  subject={item.contentPreview.subject}
                  body={item.contentPreview.body}
                />
              )}
              {!isEmail && item.contentPreview && (
                <SmsPreviewCard
                  body={item.contentPreview.body}
                  recipient={item.recipient}
                />
              )}
            </div>

            <p className="text-xs text-[var(--neutral-500)] italic">
              This communication is part of the automated customer experience flow and will be sent at the scheduled time.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function UpcomingCommunications({ items }) {
  const [selectedItem, setSelectedItem] = useState(null);

  if (!items || items.length === 0) return null;

  return (
    <>
      <div data-onboarding="upcoming-comms">
        <h3 className="text-xs font-bold text-[#6E6E6E] uppercase tracking-wider mb-3">
          Upcoming Communications
        </h3>
        <ul className="space-y-1.5">
          {items.map((item) => {
            const isEmail = item.type === "email";
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] hover:border-[var(--neutral-300)] transition-colors text-left group cursor-pointer"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isEmail
                      ? "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                      : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                  } transition-colors`}>
                    {isEmail ? <EmailIcon className="w-3.5 h-3.5" /> : <SmsIcon className="w-3.5 h-3.5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--hertz-black)] truncate">{item.label}</p>
                    <p className="text-xs text-[var(--neutral-500)] truncate">{formatScheduledTime(item.scheduledAt)}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Scheduled" />
                  <svg className="w-4 h-4 text-[var(--neutral-400)] group-hover:text-[var(--neutral-600)] shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <CommunicationPreviewPane
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
