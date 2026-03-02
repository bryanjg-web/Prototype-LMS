/**
 * Contact section — Email, SMS, Call buttons for lead profile.
 * Calls Supabase Edge Functions. Disabled when contact info missing.
 */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import EmailComposeModal from "./EmailComposeModal";
import SmsComposeModal from "./SmsComposeModal";
import { parsePhoneE164, formatLocalDisplay } from "./PhoneInput";

function fmtPhone(phone) {
  if (!phone) return "";
  const { countryCode, local } = parsePhoneE164(phone);
  return `${countryCode} ${formatLocalDisplay(countryCode, local)}`;
}

export default function ContactButtons({ lead, agentPhone, userProfile, onContactSuccess }) {
  const [loading, setLoading] = useState(null); // "email" | "sms" | "call"
  const [message, setMessage] = useState(null); // { type: "success" | "error", text, channel? }
  const [showCompose, setShowCompose] = useState(false);
  const [showSmsCompose, setShowSmsCompose] = useState(false);

  const hasEmail = lead?.email && lead.email.includes("@");
  const hasPhone = lead?.phone && lead.phone.length >= 10;

  useEffect(() => {
    if (!message) return;
    const delay = message.channel === "call" ? 10000 : 4000;
    const t = setTimeout(() => setMessage(null), delay);
    return () => clearTimeout(t);
  }, [message]);

  const getErrorMessage = async (data, error, fallback) => {
    if (data?.error) return data.error;
    // Extract error from FunctionsHttpError response body (Supabase Edge Functions)
    if (error?.context && typeof error.context?.json === "function") {
      try {
        const body = await error.context.json();
        if (body?.error) return body.error;
        if (body?.message) return body.message;
      } catch (e) {
        console.error("[ContactButtons] Could not parse error body:", e);
      }
    }
    if (error?.message && !error.message.includes("non-2xx")) return error.message;
    return fallback;
  };

  const handleEmail = () => {
    if (!hasEmail) return;
    setShowCompose(true);
  };

  const handleEmailSend = async ({ template, subject, body: bodyText }) => {
    setShowCompose(false);
    setLoading("email");
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          leadId: lead.id,
          to: lead.email,
          template,
          subject,
          body: bodyText,
          customer: lead.customer,
          reservationId: lead.reservationId ?? "",
          branch: lead.branch ?? "",
          performedBy: userProfile?.id ?? null,
          performedByName: userProfile?.displayName ?? null,
        },
      });
      if (error) {
        const msg = await getErrorMessage(data, error, "Failed to send email");
        setMessage({ type: "error", text: msg });
        return;
      }
      if (data?.success) {
        if (data.activityError) {
          console.error("[ContactButtons] Email sent but activity log failed:", data.activityError);
        }
        setMessage({ type: "success", text: `Email delivered to ${lead.email}` });
        onContactSuccess?.();
      } else {
        setMessage({ type: "error", text: data?.error ?? "Failed to send" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.message ?? "Failed to send email" });
    } finally {
      setLoading(null);
    }
  };

  const handleSms = () => {
    if (!hasPhone) return;
    setShowSmsCompose(true);
  };

  const handleSmsSend = async ({ body: bodyText }) => {
    setShowSmsCompose(false);
    setLoading("sms");
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          leadId: lead.id,
          to: lead.phone,
          body: bodyText,
          customer: lead.customer,
          reservationId: lead.reservationId ?? "",
          branch: lead.branch ?? "",
          performedBy: userProfile?.id ?? null,
          performedByName: userProfile?.displayName ?? null,
        },
      });
      if (error) {
        const msg = await getErrorMessage(data, error, "Failed to send SMS");
        setMessage({ type: "error", text: msg });
        return;
      }
      if (data?.success) {
        if (data.activityError) {
          console.error("[ContactButtons] SMS sent but activity log failed:", data.activityError);
        }
        setMessage({ type: "success", text: `SMS sent to ${fmtPhone(lead.phone)}` });
        onContactSuccess?.();
      } else {
        setMessage({ type: "error", text: data?.error ?? "Failed to send" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.message ?? "Failed to send SMS" });
    } finally {
      setLoading(null);
    }
  };

  const handleCall = async () => {
    if (!hasPhone) return;
    if (!agentPhone || agentPhone.length < 10) {
      setMessage({ type: "error", text: "Add phone to your profile to enable calls" });
      return;
    }
    setLoading("call");
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("initiate-call", {
        body: {
          leadId: lead.id,
          customerPhone: lead.phone,
          agentPhone,
          performedBy: userProfile?.id ?? null,
          performedByName: userProfile?.displayName ?? null,
        },
      });
      if (error) {
        console.error("[ContactButtons] initiate-call failed:", { data, error });
        const msg = await getErrorMessage(data, error, "Failed to initiate call");
        setMessage({ type: "error", text: msg });
        return;
      }
      if (data?.success) {
        if (data.activityError) {
          console.error("[ContactButtons] Call initiated but activity log failed:", data.activityError);
        }
        const fromLabel = data.from ? fmtPhone(data.from) : "the Hertz number";
        setMessage({
          type: "success",
          text: `Incoming call from ${fromLabel} to ${fmtPhone(agentPhone)} — answer to connect`,
          channel: "call",
        });
        onContactSuccess?.();
      } else {
        setMessage({ type: "error", text: data?.error ?? "Failed to initiate call" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.message ?? "Failed to initiate call" });
    } finally {
      setLoading(null);
    }
  };

  const missingParts = [];
  if (!hasEmail) missingParts.push("email");
  if (!hasPhone) missingParts.push("phone");

  return (
    <div>
      {missingParts.length > 0 && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 mb-3 bg-[var(--color-warning-light)] border border-[var(--color-warning)]/40 rounded-lg">
          <svg className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[var(--hertz-black)]">
            <span className="font-medium">Missing {missingParts.join(" & ")}</span>
            {" — update contact details to enable "}
            {!hasEmail && !hasPhone ? "email, SMS, and calls" : !hasEmail ? "email" : "SMS and calls"}.
          </p>
        </div>
      )}
      {showCompose && (
        <EmailComposeModal
          lead={lead}
          onSend={handleEmailSend}
          onCancel={() => setShowCompose(false)}
        />
      )}
      {showSmsCompose && (
        <SmsComposeModal
          lead={lead}
          onSend={handleSmsSend}
          onCancel={() => setShowSmsCompose(false)}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleEmail}
          disabled={!hasEmail || loading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            hasEmail && !loading
              ? "bg-[var(--hertz-primary)] border-[var(--hertz-primary)] text-[var(--hertz-black)] hover:bg-[var(--hertz-primary-hover)] hover:border-[var(--hertz-primary-hover)]"
              : "bg-white border-[var(--neutral-200)] text-[var(--hertz-black)] hover:bg-[var(--neutral-50)] hover:border-[var(--neutral-300)] disabled:hover:bg-white disabled:hover:border-[var(--neutral-200)]"
          }`}
          title={hasEmail ? `Send email to ${lead.email}` : "Add email above first"}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email
        </button>
        <button
          type="button"
          onClick={handleSms}
          disabled={!hasPhone || loading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            hasPhone && !loading
              ? "bg-[var(--hertz-primary)] border-[var(--hertz-primary)] text-[var(--hertz-black)] hover:bg-[var(--hertz-primary-hover)] hover:border-[var(--hertz-primary-hover)]"
              : "bg-white border-[var(--neutral-200)] text-[var(--hertz-black)] hover:bg-[var(--neutral-50)] hover:border-[var(--neutral-300)] disabled:hover:bg-white disabled:hover:border-[var(--neutral-200)]"
          }`}
          title={hasPhone ? `Send SMS to ${fmtPhone(lead.phone)}` : "Add phone above first"}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          SMS
        </button>
        <button
          type="button"
          onClick={handleCall}
          disabled={!hasPhone || loading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            hasPhone && !loading
              ? "bg-[var(--hertz-primary)] border-[var(--hertz-primary)] text-[var(--hertz-black)] hover:bg-[var(--hertz-primary-hover)] hover:border-[var(--hertz-primary-hover)]"
              : "bg-white border-[var(--neutral-200)] text-[var(--hertz-black)] hover:bg-[var(--neutral-50)] hover:border-[var(--neutral-300)] disabled:hover:bg-white disabled:hover:border-[var(--neutral-200)]"
          }`}
          title={hasPhone ? `We'll call you at ${fmtPhone(agentPhone)}, then connect you to the customer` : "Add phone above first"}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Call
        </button>
        {loading && (
          <span className="text-sm text-[var(--neutral-600)]">
            {loading === "call"
              ? `Dialing ${fmtPhone(agentPhone)}…`
              : loading === "email"
                ? `Sending email to ${lead.email}…`
                : `Sending SMS to ${fmtPhone(lead.phone)}…`}
          </span>
        )}
        {message && (
          <span
            className={`text-sm font-medium inline-flex items-center gap-1.5 ${
              message.type === "success" ? "text-[var(--color-success)]" : "text-[var(--color-error)]"
            }`}
          >
            {message.text}
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="p-0.5 rounded hover:bg-[var(--neutral-100)] transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
