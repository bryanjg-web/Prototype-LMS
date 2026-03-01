/**
 * Contact section — Email, SMS, Call buttons for lead profile.
 * Calls Supabase Edge Functions. Disabled when contact info missing.
 */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import EmailComposeModal from "./EmailComposeModal";

export default function ContactButtons({ lead, agentPhone, userProfile, onContactSuccess }) {
  const [loading, setLoading] = useState(null); // "email" | "sms" | "call"
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }
  const [showCompose, setShowCompose] = useState(false);

  const hasEmail = lead?.email && lead.email.includes("@");
  const hasPhone = lead?.phone && lead.phone.length >= 10;

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
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
          setMessage({ type: "success", text: `Email sent (activity log error: ${data.activityError})` });
        } else {
          setMessage({ type: "success", text: "Email sent" });
        }
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

  const handleSms = async () => {
    if (!hasPhone) return;
    setLoading("sms");
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          leadId: lead.id,
          to: lead.phone,
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
          setMessage({ type: "success", text: `SMS sent (activity log error: ${data.activityError})` });
        } else {
          setMessage({ type: "success", text: "SMS sent" });
        }
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
          setMessage({ type: "success", text: `Calling you now (activity log error: ${data.activityError})` });
        } else {
          setMessage({ type: "success", text: "Calling you now" });
        }
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

  return (
    <div>
      {showCompose && (
        <EmailComposeModal
          lead={lead}
          onSend={handleEmailSend}
          onCancel={() => setShowCompose(false)}
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
          title={hasEmail ? "Send email" : "Add email above first"}
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
          title={hasPhone ? "Send SMS" : "Add phone above first"}
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
          title={hasPhone ? "Click to call" : "Add phone above first"}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Call
        </button>
        {loading && (
          <span className="text-sm text-[var(--neutral-600)]">
            {loading === "call" ? "Connecting…" : "Sending…"}
          </span>
        )}
        {message && (
          <span
            className={`text-sm font-medium ${
              message.type === "success" ? "text-[var(--color-success)]" : "text-[var(--color-error)]"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
