// Hertz LMS - Send email via Resend API
// Called from lead profile Contact section. Uses Resend sandbox for development.
// Emails use Hertz-branded HTML template.

import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Hertz <onboarding@resend.dev>"; // Resend sandbox; use verified domain in prod

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailTemplate = "general" | "confirmation" | "reminder" | "final_attempt";

interface SendEmailBody {
  leadId: number;
  to: string;
  template?: EmailTemplate;
  subject?: string;
  body?: string;
  customer?: string;
  reservationId?: string;
  branch?: string;
  performedBy?: string;
  performedByName?: string;
}

// ---------------------------------------------------------------------------
// Template: subject + plain-text body per email type
// ---------------------------------------------------------------------------

const templates = {
  general: {
    subject: (res: string) => `Your Hertz reservation – ${res}`,
    body: (c: string, b: string, res: string) =>
      `Hi ${c},\n\n` +
      `Thank you for choosing Hertz — we truly appreciate your business. ` +
      `We're reaching out from our ${b} location regarding your reservation ${res}.\n\n` +
      `Our goal is to provide a seamless and reliable experience every time you rent with us. ` +
      `If there's anything we can help with — whether it's adjusting your reservation, ` +
      `answering questions, or simply making your trip a little easier — please don't hesitate to reach out.\n\n` +
      `We're here for you and look forward to getting you on the road.\n\n` +
      `Warm regards,\nThe Hertz ${b} Team`,
  },

  confirmation: {
    subject: (res: string) => `Great news — your rental is confirmed – ${res}`,
    body: (c: string, b: string, res: string) =>
      `Hi ${c},\n\n` +
      `Great news — your Hertz rental reservation ${res} has been confirmed, ` +
      `and we're excited to help you get on your way.\n\n` +
      `Your vehicle is ready for collection at our ${b} location. ` +
      `Please bring a valid driver's licence and the credit card used at the time of booking.\n\n` +
      `If you need to adjust your pickup time or have any questions at all, ` +
      `we're happy to help — don't hesitate to reach out. ` +
      `Our goal is to make your rental experience as smooth and dependable as possible.\n\n` +
      `We truly value your trust in Hertz and look forward to welcoming you.\n\n` +
      `Warm regards,\nThe Hertz ${b} Team`,
  },

  reminder: {
    subject: (res: string) => `Friendly reminder – your Hertz rental ${res} is ready`,
    body: (c: string, b: string, res: string) =>
      `Hi ${c},\n\n` +
      `We hope this message finds you well. ` +
      `Just a friendly reminder that your Hertz rental reservation ${res} ` +
      `is confirmed, and your vehicle is reserved and waiting for you at our ${b} location.\n\n` +
      `We understand that plans can change — and that's perfectly okay. ` +
      `If you need to adjust your pickup time or reschedule, ` +
      `we're happy to work with you to find a time that suits you best.\n\n` +
      `We want to make sure everything goes smoothly for your trip, ` +
      `so please don't hesitate to let us know how we can help.\n\n` +
      `Warm regards,\nThe Hertz ${b} Team`,
  },

  final_attempt: {
    subject: (res: string) => `We'd love to hear from you – ${res}`,
    body: (c: string, b: string, res: string) =>
      `Hi ${c},\n\n` +
      `We've been trying to reach you regarding your Hertz reservation ${res}, ` +
      `which was confirmed for pickup at our ${b} location — ` +
      `and we want to make sure everything is okay.\n\n` +
      `We understand that life gets busy, and sometimes plans change unexpectedly. ` +
      `We'd love to hear from you so we can keep your reservation in place, ` +
      `or help you reschedule if that works better for your plans.\n\n` +
      `To make sure we can continue to hold your vehicle, ` +
      `please get in touch with us at ${b} at your earliest convenience. ` +
      `If we don't hear from you in the next 48 hours, ` +
      `we may need to release the reservation — ` +
      `but we'd genuinely love to help you get on the road.\n\n` +
      `Your satisfaction matters to us, and we're here to make it work.\n\n` +
      `Warm regards,\nThe Hertz ${b} Team`,
  },
} as const;

function getTemplate(type: EmailTemplate = "general") {
  return templates[type] ?? templates.general;
}

function defaultSubject(reservationId: string) {
  return templates.general.subject(reservationId);
}

function defaultBody(customer: string, branch: string, reservationId: string) {
  return templates.general.body(customer, branch, reservationId);
}

// Base64-encoded Hertz-Line_White_2020.png — official Hertz logo (white on transparent).
// Embedded as a data URI so the logo renders inline in all email clients.
const HERTZ_LOGO_DATA_URI =
  "data:image/png;base64,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L3JkZjpsaT4KICAgIDxyZGY6bGk+UkdCPC9yZGY6bGk+CiAgICA8cmRmOmxpPlBORzwvcmRmOmxpPgogICA8L3JkZjpCYWc+CiAgPC9kYzpzdWJqZWN0PgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6S2V5d29yZHM+SGVydHosSGVydHogTG9nbyxMb2dvLFByaW1hcnksQmxhY2ssV2hpdGUsWWVsbG93IExpbmUsWWVsbG93LEhlcnR6IFByaW1hcnkgTG9nbyxSR0IsUE5HPC9wZGY6S2V5d29yZHM+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnBob3Rvc2hvcD0naHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyc+CiAgPHBob3Rvc2hvcDpJbnN0cnVjdGlvbnM+IEltYWdlIEFwcHJvdmVkIEZvciBVc2U8L3Bob3Rvc2hvcDpJbnN0cnVjdGlvbnM+CiA8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0ncic/PhbHJ3cAAAAASUVORK5CYII=";

/** Hertz-branded HTML email template. Uses inline styles for email client compatibility. */
function buildHertzEmailHtml(customer: string, branch: string, reservationId: string, bodyOverride?: string): string {
  const bodyContent = bodyOverride ?? defaultBody(customer, branch, reservationId);
  const bodyHtml = bodyContent.replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hertz - Your Reservation</title>
</head>
<body style="margin:0; padding:0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F2F2F2; color: #272425;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F2F2F2; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(39, 36, 37, 0.08);">
          <!-- Hertz header with logo -->
          <tr>
            <td style="background-color: #272425; padding: 24px 32px; text-align: center;">
              <img src="${HERTZ_LOGO_DATA_URI}" alt="Hertz" width="180" height="63" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none;" />
            </td>
          </tr>
          <!-- Gold accent bar -->
          <tr>
            <td style="background-color: #FFD100; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Body content -->
          <tr>
            <td style="padding: 32px; font-size: 16px; line-height: 1.7; color: #272425;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F8F8; padding: 24px 32px; font-size: 13px; color: #666666; border-top: 1px solid #E5E5E5;">
              <p style="margin: 0 0 8px 0;">We truly value your trust in Hertz.</p>
              <p style="margin: 0; font-size: 12px; color: #999999;">&copy; Hertz. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as SendEmailBody;
    const { to, template, subject, body: bodyOverride, customer = "Customer", reservationId = "", branch = "your branch" } = body;

    if (!to || !to.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid email address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tpl = getTemplate(template);
    const finalSubject = subject ?? tpl.subject(reservationId);
    const tplBody = bodyOverride ?? tpl.body(customer, branch, reservationId);
    const finalHtml = buildHertzEmailHtml(customer, branch, reservationId, tplBody);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: finalSubject,
        html: finalHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data.message ?? "Resend API error" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plainBody = tplBody;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let activityError: string | null = null;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });

      const { error: insertErr } = await supabase.from("lead_activities").insert({
        lead_id: body.leadId,
        type: "email",
        performed_by: body.performedBy || null,
        performed_by_name: body.performedByName || null,
        metadata: {
          id: data.id,
          template: template ?? "general",
          subject: finalSubject,
          body: plainBody,
          to,
        },
      });

      if (insertErr) {
        console.error("[send-email] lead_activities insert failed:", insertErr);
        activityError = insertErr.message;
      } else {
        const { error: updateErr } = await supabase
          .from("leads")
          .update({ last_activity: new Date().toISOString() })
          .eq("id", body.leadId);
        if (updateErr) {
          console.error("[send-email] leads.last_activity update failed:", updateErr);
        }
      }
    } else {
      console.error("[send-email] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — activity not logged");
      activityError = "Server config: activity logging unavailable";
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id, ...(activityError && { activityError }) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
