/**
 * Automated communication rules for the lead lifecycle.
 *
 * Each rule defines a scheduled communication that fires based on lead state.
 * The selector in demoSelectors.js evaluates these against a lead to compute
 * which communications are upcoming (scheduled but not yet "sent").
 *
 * Anchor types:
 *   "initDtFinal"  – delay is relative to the lead creation date
 *   "cancellation"  – delay is relative to estimated cancellation time
 */

const EMAIL_TEMPLATES = {
  confirmation: {
    subject: (res) => `Great news — your rental is confirmed – ${res}`,
    body: (c, b, res) =>
      `Hi ${c},\n\nGreat news — your Hertz rental reservation ${res} has been confirmed, and we're excited to help you get on your way.\n\nYour vehicle is ready for collection at our ${b} location. Please bring a valid driver's licence and the credit card used at the time of booking.\n\nIf you need to adjust your pickup time or have any questions at all, we're happy to help — don't hesitate to reach out.\n\nWe truly value your trust in Hertz and look forward to welcoming you.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
  reminder: {
    subject: (res) => `Friendly reminder – your Hertz rental ${res} is ready`,
    body: (c, b, res) =>
      `Hi ${c},\n\nJust a friendly reminder that your Hertz rental reservation ${res} is confirmed, and your vehicle is reserved and waiting for you at our ${b} location.\n\nWe understand that plans can change — and that's perfectly okay. If you need to adjust your pickup time or reschedule, we're happy to work with you.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
  final_attempt: {
    subject: (res) => `We'd love to hear from you – ${res}`,
    body: (c, b, res) =>
      `Hi ${c},\n\nWe've been trying to reach you regarding your Hertz reservation ${res} at our ${b} location — and we want to make sure everything is okay.\n\nIf we don't hear from you in the next 48 hours, we may need to release the reservation — but we'd genuinely love to help you get on the road.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
  cancellation_inquiry: {
    subject: (res) => `We'd love your feedback – ${res}`,
    body: (c, b, res) =>
      `Hi ${c},\n\nWe noticed your reservation ${res} at our ${b} location was recently cancelled, and we'd genuinely like to understand how we can improve.\n\nYour experience matters to us — whether you chose a different provider, had a scheduling conflict, or simply changed plans, your feedback helps us serve you better next time.\n\nWould you mind taking a moment to let us know what happened? You can simply reply to this email.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
  post_rental_survey: {
    subject: (res) => `How was your Hertz experience? – ${res}`,
    body: (c, b, res) =>
      `Hi ${c},\n\nThank you for choosing Hertz for your recent rental from our ${b} location (${res}). We hope everything went smoothly!\n\nYour feedback is incredibly valuable to us. We'd love to hear about your experience — what went well, and where we can improve.\n\nWould you mind taking a moment to share your thoughts? Simply reply to this email.\n\nWarm regards,\nThe Hertz ${b} Team`,
  },
};

const SMS_TEMPLATES = {
  pickup_ready: {
    body: (c, b, res) =>
      `Hi ${c}, great news! Your Hertz vehicle is ready for collection at ${b} (reservation ${res}). We look forward to welcoming you — see you soon!`,
  },
  reminder: {
    body: (c, b, res) =>
      `Hi ${c}, friendly reminder that your Hertz rental (${res}) is confirmed at ${b}. If your plans have changed, we're happy to help you reschedule. Call us anytime!`,
  },
  callback: {
    body: (c, b, res) =>
      `Hi ${c}, we've been trying to reach you about your Hertz reservation ${res} at ${b}. We'd love to help — please give us a call when you have a moment.`,
  },
  unused_checkin: {
    body: (c, b, res) =>
      `Hi ${c}, just checking in from Hertz ${b} about your reservation ${res}. Your vehicle is still reserved — give us a call if you'd like to arrange pickup or if plans have changed.`,
  },
};

export { EMAIL_TEMPLATES, SMS_TEMPLATES };

/**
 * @type {Array<{
 *   id: string,
 *   type: "email" | "sms",
 *   templateKey: string,
 *   label: string,
 *   reason: string,
 *   delayHours: number,
 *   anchor: "initDtFinal" | "cancellation" | "now",
 *   statusFilter: string[] | null,
 *   requiresEmail: boolean,
 *   requiresPhone: boolean,
 *   suppressWhen: "manual_email" | "manual_sms" | "any_manual_contact" | null,
 *   extraCondition: ((lead: object) => boolean) | null,
 * }>}
 */
export const COMMUNICATION_RULES = [
  {
    id: "confirmation_email",
    type: "email",
    templateKey: "confirmation",
    label: "Reservation Confirmation",
    reason: "Sent automatically when reservation is received",
    delayHours: 0,
    anchor: "initDtFinal",
    statusFilter: null,
    requiresEmail: true,
    requiresPhone: false,
    suppressWhen: null,
    extraCondition: null,
  },
  {
    id: "pickup_ready_sms",
    type: "sms",
    templateKey: "pickup_ready",
    label: "Pickup Ready Notification",
    reason: "Vehicle ready — notifying customer via SMS",
    delayHours: 4,
    anchor: "initDtFinal",
    statusFilter: ["Unused", "Rented", "Reviewed"],
    requiresEmail: false,
    requiresPhone: true,
    suppressWhen: "manual_sms",
    extraCondition: null,
  },
  {
    id: "day2_reminder_email",
    type: "email",
    templateKey: "reminder",
    label: "Pickup Reminder",
    reason: "No pickup after 2 days — sending friendly reminder",
    delayHours: 48,
    anchor: "initDtFinal",
    statusFilter: ["Unused"],
    requiresEmail: true,
    requiresPhone: false,
    suppressWhen: "manual_email",
    extraCondition: null,
  },
  {
    id: "day3_followup_sms",
    type: "sms",
    templateKey: "callback",
    label: "Follow-up SMS",
    reason: "Day 3 with no pickup — SMS follow-up",
    delayHours: 72,
    anchor: "initDtFinal",
    statusFilter: ["Unused"],
    requiresEmail: false,
    requiresPhone: true,
    suppressWhen: "any_manual_contact",
    extraCondition: null,
  },
  {
    id: "final_attempt_email",
    type: "email",
    templateKey: "final_attempt",
    label: "Final Outreach",
    reason: "Day 4 — last attempt before reservation may be released",
    delayHours: 96,
    anchor: "initDtFinal",
    statusFilter: ["Unused"],
    requiresEmail: true,
    requiresPhone: false,
    suppressWhen: "any_manual_contact",
    extraCondition: null,
  },
  {
    id: "cancellation_inquiry",
    type: "email",
    templateKey: "cancellation_inquiry",
    label: "Cancellation Inquiry",
    reason: "No reason recorded — requesting customer feedback",
    delayHours: 72,
    anchor: "cancellation",
    statusFilter: ["Cancelled"],
    requiresEmail: true,
    requiresPhone: false,
    suppressWhen: "manual_email",
    extraCondition: (lead) => !lead.enrichment?.reason,
  },
  {
    id: "post_rental_survey",
    type: "email",
    templateKey: "post_rental_survey",
    label: "Post-Rental Survey",
    reason: "Rental complete — requesting customer feedback",
    delayHours: 120,
    anchor: "initDtFinal",
    statusFilter: ["Rented"],
    requiresEmail: true,
    requiresPhone: false,
    suppressWhen: null,
    extraCondition: null,
  },

  // --- Rolling rules (anchored to NOW, fire for ongoing conditions) ---

  {
    id: "unused_reminder_email",
    type: "email",
    templateKey: "reminder",
    label: "Unused Lead Reminder",
    reason: "Reservation still open with no pickup — automated follow-up",
    delayHours: 24,
    anchor: "now",
    statusFilter: ["Unused"],
    requiresEmail: true,
    requiresPhone: false,
    suppressWhen: "manual_email",
    extraCondition: null,
  },
  {
    id: "unused_checkin_sms",
    type: "sms",
    templateKey: "unused_checkin",
    label: "Unused Lead Check-in",
    reason: "No pickup recorded — SMS check-in with customer",
    delayHours: 18,
    anchor: "now",
    statusFilter: ["Unused"],
    requiresEmail: false,
    requiresPhone: true,
    suppressWhen: "manual_sms",
    extraCondition: null,
  },
  {
    id: "cancellation_feedback_email",
    type: "email",
    templateKey: "cancellation_inquiry",
    label: "Cancellation Feedback Request",
    reason: "No cancellation reason on file — requesting customer feedback",
    delayHours: 36,
    anchor: "now",
    statusFilter: ["Cancelled"],
    requiresEmail: true,
    requiresPhone: false,
    suppressWhen: null,
    extraCondition: (lead) => !lead.enrichment?.reason,
  },
];
