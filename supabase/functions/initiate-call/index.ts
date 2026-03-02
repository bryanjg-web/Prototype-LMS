// Hertz LMS - Initiate click-to-call via Twilio
// Calls BM first; when BM answers, TwiML connects to customer.
// Frontend passes agentPhone (from user_profiles) and customerPhone (from lead).

import { createClient } from "npm:@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitiateCallBody {
  leadId: number;
  customerPhone: string;
  agentPhone: string; // BM phone from user_profiles
  performedBy?: string;
  performedByName?: string;
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
    const body = (await req.json()) as InitiateCallBody;
    const { customerPhone, agentPhone } = body;

    if (!customerPhone || customerPhone.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid customer phone required (E.164)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agentPhone || agentPhone.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: "BM phone required. Add phone to your profile." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TwiML URL: when BM answers, Twilio fetches this to get instructions to dial customer
    const twimlUrl = `${SUPABASE_URL}/functions/v1/twiml-connect?to=${encodeURIComponent(customerPhone)}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // Call BM first; when they answer, Twilio fetches twimlUrl and dials customer
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: agentPhone,
        From: TWILIO_PHONE_NUMBER,
        Url: twimlUrl,
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
        type: "call",
        performed_by: body.performedBy || null,
        performed_by_name: body.performedByName || null,
        metadata: { callSid: data.sid },
      });

      if (insertErr) {
        console.error("[initiate-call] lead_activities insert failed:", insertErr);
        activityError = insertErr.message;
      } else {
        const { error: updateErr } = await supabase
          .from("leads")
          .update({ last_activity: new Date().toISOString() })
          .eq("id", body.leadId);
        if (updateErr) {
          console.error("[initiate-call] leads.last_activity update failed:", updateErr);
        }
      }
    } else {
      console.error("[initiate-call] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — activity not logged");
      activityError = "Server config: activity logging unavailable";
    }

    return new Response(
      JSON.stringify({ success: true, callSid: data.sid, from: TWILIO_PHONE_NUMBER, ...(activityError && { activityError }) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
