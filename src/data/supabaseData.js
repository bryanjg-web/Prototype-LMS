/**
 * Supabase data layer - fetches LMS data from Supabase.
 * Use this when VITE_USE_SUPABASE=true; otherwise mockData is used.
 */
import { supabase } from "../lib/supabase";

// Transform DB row to app shape (snake_case → camelCase)
function leadFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customer: row.customer,
    reservationId: row.reservation_id,
    email: row.email ?? null,
    phone: row.phone ?? null,
    status: row.status,
    archived: row.archived ?? false,
    enrichmentComplete: row.enrichment_complete ?? false,
    branch: row.branch,
    bmName: row.bm_name,
    daysOpen: row.days_open ?? 0,
    mismatch: row.mismatch ?? false,
    mismatchReason: row.mismatch_reason ?? null,
    gmDirective: row.gm_directive,
    insuranceCompany: row.insurance_company,
    bodyShop: row.body_shop,
    timeToFirstContact: row.time_to_first_contact,
    firstContactBy: row.first_contact_by,
    timeToCancel: row.time_to_cancel,
    hlesReason: row.hles_reason,
    translog: row.translog ?? [],
    lastActivity: row.last_activity,
    enrichment: row.enrichment,
    enrichmentLog: row.enrichment_log ?? [],
    initDtFinal: row.init_dt_final ?? null,
    weekOf: row.week_of ?? null,
    contactRange: row.contact_range ?? null,
  };
}

function orgMappingFromRow(row) {
  if (!row) return null;
  return {
    bm: row.bm,
    branch: row.branch,
    am: row.am,
    gm: row.gm,
    zone: row.zone,
  };
}

function branchManagerFromRow(row) {
  if (!row) return null;
  return {
    name: row.name,
    conversionRate: row.conversion_rate,
    quartile: row.quartile,
  };
}

export async function fetchLeads() {
  const { data, error } = await supabase.from("leads").select("*").order("id");
  if (error) throw error;
  return (data ?? []).map(leadFromRow);
}

export async function fetchOrgMapping() {
  const { data, error } = await supabase.from("org_mapping").select("*");
  if (error) throw error;
  return (data ?? []).map(orgMappingFromRow);
}

export async function fetchBranchManagers() {
  const { data, error } = await supabase.from("branch_managers").select("*");
  if (error) throw error;
  return (data ?? []).map(branchManagerFromRow);
}

export async function fetchWeeklyTrends() {
  const { data: bmData } = await supabase
    .from("weekly_trends")
    .select("*")
    .eq("type", "bm")
    .order("week_start");
  const { data: gmData } = await supabase
    .from("weekly_trends")
    .select("*")
    .eq("type", "gm")
    .order("week_start");

  return {
    bm: (bmData ?? []).map((r) => ({
      weekLabel: r.week_label,
      totalLeads: r.total_leads,
      conversionRate: r.conversion_rate,
      commentRate: r.comment_rate,
    })),
    gm: (gmData ?? []).map((r) => ({
      weekLabel: r.week_label,
      cancelledUnreviewed: r.cancelled_unreviewed,
      commentCompliance: r.comment_compliance,
      zoneConversionRate: r.zone_conversion_rate,
      timeToContact: r.time_to_contact,
      branchContactRate: r.branch_contact_rate,
      hrdContactRate: r.hrd_contact_rate,
    })),
  };
}

export async function fetchUploadSummary() {
  const { data, error } = await supabase
    .from("upload_summary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  if (!data) return { hles: {}, translog: {}, dataAsOfDate: null };
  return {
    hles: data.hles ?? {},
    translog: data.translog ?? {},
    dataAsOfDate: data.data_as_of_date,
  };
}

export async function fetchLeaderboardData() {
  const { data, error } = await supabase
    .from("leaderboard_data")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  if (!data) return { branches: [], gms: [], ams: [], zones: [] };
  return {
    branches: data.branches ?? [],
    gms: data.gms ?? [],
    ams: data.ams ?? [],
    zones: data.zones ?? [],
  };
}

export async function fetchCancellationReasonCategories() {
  const { data, error } = await supabase
    .from("cancellation_reason_categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    category: r.category,
    reasons: r.reasons ?? [],
  }));
}

export async function fetchNextActions() {
  const { data, error } = await supabase
    .from("next_actions")
    .select("action")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => r.action);
}

export async function fetchDataAsOfDate() {
  const { data } = await supabase
    .from("upload_summary")
    .select("data_as_of_date")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data?.data_as_of_date ?? "—";
}

/** Update lead enrichment (BM comments) and optionally append to enrichment_log. Can also update status. */
export async function updateLeadEnrichment(leadId, enrichment, enrichmentLogEntry = null, status = null) {
  const updates = {
    enrichment: enrichment ?? {},
    enrichment_complete: !!enrichment && Object.keys(enrichment).length > 0,
    updated_at: new Date().toISOString(),
  };
  if (status) updates.status = status;
  if (status === "Cancelled" && enrichment?.reason) {
    updates.hles_reason = enrichment.reason;
  }

  if (enrichmentLogEntry) {
    const { data: existing } = await supabase
      .from("leads")
      .select("enrichment_log")
      .eq("id", leadId)
      .single();
    const currentLog = existing?.enrichment_log ?? [];
    updates.enrichment_log = [...currentLog, enrichmentLogEntry];
  }

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw error;
  return leadFromRow(data);
}

/** Update lead GM directive */
export async function updateLeadDirective(leadId, gmDirective) {
  const { data, error } = await supabase
    .from("leads")
    .update({
      gm_directive: gmDirective,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw error;
  return leadFromRow(data);
}

/** Update lead contact info (email, phone) — manual enrichment. Optionally append to enrichment_log. */
export async function updateLeadContact(leadId, { email, phone }, enrichmentLogEntry = null) {
  const updates = { updated_at: new Date().toISOString() };
  if (email !== undefined) updates.email = email || null;
  if (phone !== undefined) updates.phone = phone || null;

  if (enrichmentLogEntry) {
    const { data: existing } = await supabase
      .from("leads")
      .select("enrichment_log")
      .eq("id", leadId)
      .single();
    const currentLog = existing?.enrichment_log ?? [];
    updates.enrichment_log = [...currentLog, enrichmentLogEntry];
  }

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw error;
  return leadFromRow(data);
}

/** Fetch contact activities (email, SMS, call) for a lead */
export async function fetchLeadActivities(leadId) {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("id, type, performed_by_name, metadata, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    author: row.performed_by_name || "Unknown",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    time: formatActivityTime(row.created_at),
    timestamp: new Date(row.created_at).getTime(),
    action: getActivityAction(row.type),
    source: "contact",
  }));
}

function formatActivityTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getActivityAction(type) {
  switch (type) {
    case "email": return "Email sent";
    case "sms": return "SMS sent";
    case "call": return "Call initiated";
    default: return "Contact";
  }
}

/** Transform tasks DB row to app shape */
function taskFromRow(row) {
  if (!row) return null;
  const lead = row.leads;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    notes: row.notes ?? null,
    notesLog: row.notes_log ?? [],
    dueDate: row.due_date ? formatTaskDate(row.due_date) : null,
    dueDateRaw: row.due_date,
    status: row.status,
    priority: row.priority ?? "Medium",
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name ?? "—",
    createdBy: row.created_by_name ?? "—",
    leadId: row.lead_id,
    lead: lead ? { id: lead.id, customer: lead.customer, reservationId: lead.reservation_id, branch: lead.branch } : null,
    source: row.source ?? "gm_assigned",
    translogEventId: row.translog_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
  };
}

function formatTaskDate(isoOrDate) {
  if (!isoOrDate) return null;
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate + "T00:00:00") : isoOrDate;
  return d.toISOString().slice(0, 10);
}

/** Fetch tasks for a branch (tasks whose lead belongs to that branch). */
export async function fetchTasksForBranch(branch) {
  // PostgREST may not support .eq('leads.branch', branch) on joined table; use fallback
  const { data, error } = await supabase
    .from("tasks")
    .select("*, leads(id, customer, reservation_id, branch)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.leads?.branch === branch)
    .map((row) => taskFromRow(row));
}

/** Fetch a single task by id (with lead) */
export async function fetchTaskById(taskId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, leads(id, customer, reservation_id, branch)")
    .eq("id", taskId)
    .single();
  if (error) throw error;
  return taskFromRow(data);
}

/** Fetch tasks for a specific lead */
export async function fetchTasksForLead(leadId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, leads(id, customer, reservation_id, branch)")
    .eq("lead_id", leadId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => taskFromRow(row));
}

/** Update task status (sets completed_at when status = Done) */
export async function updateTaskStatus(taskId, status) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (status === "Done") {
    updates.completed_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return taskFromRow(data);
}

/** Append a note to task notes_log (like enrichment_log / TRANSLOG activity). Each note has timestamp and author. */
export async function appendTaskNote(taskId, noteText, author) {
  const now = new Date();
  const timeStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const entry = {
    time: timeStr,
    timestamp: now.getTime(),
    author: author ?? "—",
    note: (noteText ?? "").trim(),
  };

  const { data: existing } = await supabase
    .from("tasks")
    .select("notes_log")
    .eq("id", taskId)
    .single();
  const currentLog = existing?.notes_log ?? [];
  const newLog = [...currentLog, entry];

  const { data, error } = await supabase
    .from("tasks")
    .update({ notes_log: newLog, updated_at: now.toISOString() })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return taskFromRow(data);
}

/** Archive a lead */
export async function archiveLead(leadId) {
  const { data, error } = await supabase
    .from("leads")
    .update({
      archived: true,
      status: "Reviewed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw error;
  return leadFromRow(data);
}
