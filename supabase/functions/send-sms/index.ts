// Hertz LMS - Send SMS via Twilio API
// Called from lead profile Contact section.

import { createClient } from "npm:@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSmsBody {
  leadId: number;
  to: string;
  body?: string;
  customer?: string;
  reservationId?: string;
  branch?: string;
  performedBy?: string;
  performedByName?: string;
}

function defaultBody(customer: string, branch: string, reservationId: string) {
  return `Hi ${customer}, this is the Hertz ${branch} team reaching out about your reservation ${reservationId}. We'd love to make sure everything is on track for your rental. Please give us a call at your convenience — we're here to help!`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return new Response(
      JSON.stringify({ success: false, error: "Twilio not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as SendSmsBody;
    const { to, body: bodyOverride, customer = "there", reservationId = "", branch = "your branch" } = body;

    if (!to || to.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid phone number required (E.164)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalBody = bodyOverride ?? defaultBody(customer, branch, reservationId);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: finalBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data.message ?? "Twilio API error" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Persist activity and update lead last_activity
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let activityError: string | null = null;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });

      const { error: insertErr } = await supabase.from("lead_activities").insert({
        lead_id: body.leadId,
        type: "sms",
        performed_by: body.performedBy || null,
        performed_by_name: body.performedByName || null,
        metadata: { sid: data.sid },
      });

      if (insertErr) {
        console.error("[send-sms] lead_activities insert failed:", insertErr);
        activityError = insertErr.message;
      } else {
        const { error: updateErr } = await supabase
          .from("leads")
          .update({ last_activity: new Date().toISOString() })
          .eq("id", body.leadId);
        if (updateErr) {
          console.error("[send-sms] leads.last_activity update failed:", updateErr);
        }
      }
    } else {
      console.error("[send-sms] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — activity not logged");
      activityError = "Server config: activity logging unavailable";
    }

    return new Response(
      JSON.stringify({ success: true, sid: data.sid, from: TWILIO_PHONE_NUMBER, ...(activityError && { activityError }) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
