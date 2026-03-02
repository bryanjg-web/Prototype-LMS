/**
 * Supabase data layer - fetches LMS data from Supabase.
 * Use this when VITE_USE_SUPABASE=true; otherwise mockData is used.
 */
import { supabase } from "../lib/supabase";
import codeMappings from "./codeMappings.json";
import { formatDateTimeShort } from "../utils/dateTime";

// Transform DB row to app shape (snake_case → camelCase)
function leadFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customer: row.customer,
    reservationId: row.reservation_id,
    confirmNum: row.confirm_num ?? row.reservation_id,
    knum: row.knum ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    sourceEmail: row.source_email ?? null,
    sourcePhone: row.source_phone ?? null,
    sourceStatus: row.source_status ?? null,
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
    lastUploadId: row.last_upload_id ?? null,
    cdpName: row.cdp_name ?? null,
    htzRegion: row.htz_region ?? null,
    setState: row.set_state ?? null,
    zone: row.zone ?? null,
    areaMgr: row.area_mgr ?? null,
    generalMgr: row.general_mgr ?? null,
    rentLoc: row.rent_loc ?? null,
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
    gmUserId: row.gm_user_id ?? null,
    bmUserId: row.bm_user_id ?? null,
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
    dataAsOfDate: data.created_at ?? data.data_as_of_date,
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

/** Update lead GM directive (keeps leads.gm_directive as the latest for quick lookups) */
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

function gmDirectiveFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    leadId: row.lead_id,
    directiveText: row.directive_text,
    priority: row.priority ?? "normal",
    dueDate: row.due_date ?? null,
    createdBy: row.created_by ?? null,
    createdByName: row.created_by_name ?? "Unknown",
    createdAt: row.created_at,
  };
}

/** Fetch all GM directives for a lead (newest first) */
export async function fetchGmDirectives(leadId) {
  const { data, error } = await supabase
    .from("gm_directives")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(gmDirectiveFromRow);
}

/** Insert a new GM directive and update leads.gm_directive with the latest text */
export async function insertGmDirective({ leadId, directiveText, priority, dueDate, createdBy, createdByName }) {
  const { data, error } = await supabase
    .from("gm_directives")
    .insert({
      lead_id: leadId,
      directive_text: directiveText,
      priority: priority ?? "normal",
      due_date: dueDate ?? null,
      created_by: createdBy ?? null,
      created_by_name: createdByName ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: leadErr } = await supabase
    .from("leads")
    .update({ gm_directive: directiveText, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (leadErr) console.error("Failed to sync leads.gm_directive:", leadErr);

  return gmDirectiveFromRow(data);
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
  return formatDateTimeShort(iso) || "";
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
    assignedBranch: lead?.branch ?? row.assigned_branch ?? null,
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

/** Fetch tasks for a branch (tasks whose lead belongs to that branch, or standalone tasks assigned to that branch). */
export async function fetchTasksForBranch(branch) {
  // PostgREST may not support .eq('leads.branch', branch) on joined table; use fallback
  const { data, error } = await supabase
    .from("tasks")
    .select("*, leads(id, customer, reservation_id, branch)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.leads?.branch === branch || (row.lead_id == null && row.assigned_branch === branch))
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
  const timeStr = formatDateTimeShort(now);
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

/** Fetch all tasks for branches under a GM (for the GM dashboard/meeting prep). */
export async function fetchTasksForGM(gmBranches) {
  if (!gmBranches?.length) return [];
  const { data, error } = await supabase
    .from("tasks")
    .select("*, leads(id, customer, reservation_id, branch)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchTasksForGM failed:", error);
    return [];
  }
  return (data ?? [])
    .filter((row) => gmBranches.includes(row.leads?.branch))
    .map((row) => taskFromRow(row));
}

/** Mark a lead as reviewed (sets status=Reviewed, archived=true) */
export async function markLeadReviewed(leadId) {
  const { data, error } = await supabase
    .from("leads")
    .update({
      status: "Reviewed",
      archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw error;
  return leadFromRow(data);
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

/** Fetch user profile by branch (BM for that branch) — for task assignment. */
export async function fetchUserProfileByBranch(branch) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .eq("branch", branch)
    .eq("role", "bm")
    .maybeSingle();
  if (error) throw error;
  return data;
}

const VALID_PRIORITIES = new Set(["High", "Medium", "Low"]);

/** Insert a single task. Returns the created task or throws. */
export async function insertTask({
  title,
  description = null,
  dueDate,
  leadId,
  assignedTo = null,
  assignedToName,
  assignedBranch = null,
  createdBy = null,
  createdByName,
  source = "gm_assigned",
  priority = "High",
}) {
  const dueDateStr = dueDate instanceof Date ? dueDate.toISOString().slice(0, 10) : dueDate;
  const payload = {
    title,
    description,
    due_date: dueDateStr,
    lead_id: leadId ?? null,
    assigned_to: assignedTo,
    assigned_to_name: assignedToName,
    assigned_branch: assignedBranch ?? null,
    created_by: createdBy,
    created_by_name: createdByName,
    source,
    status: "Open",
  };
  // Use DB default for priority to avoid constraint violations; only pass if explicitly valid
  const safePriority = (typeof priority === "string" && VALID_PRIORITIES.has(priority.trim())) ? priority.trim() : "Medium";
  payload.priority = safePriority;
  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("*, leads(id, customer, reservation_id, branch)")
    .single();
  if (error) throw error;
  return taskFromRow(data);
}

// ─── Wins & Learnings ────────────────────────────────────────────────────────

function winsLearningFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    bmName: row.bm_name,
    branch: row.branch,
    gmName: row.gm_name,
    content: row.content,
    weekOf: row.week_of,
    createdAt: row.created_at,
  };
}

/** Fetch Wins & Learnings entries. If gmName is provided, filters to that GM's zone; otherwise returns all. */
export async function fetchWinsLearnings(gmName = null) {
  let query = supabase.from("wins_learnings").select("*").order("created_at", { ascending: false });
  if (gmName) query = query.eq("gm_name", gmName);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(winsLearningFromRow);
}

/** Submit a new Wins & Learnings entry for a BM. */
export async function submitWinsLearning({ bmName, branch, gmName, content, weekOf }) {
  const { data, error } = await supabase
    .from("wins_learnings")
    .insert({ bm_name: bmName, branch, gm_name: gmName, content, week_of: weekOf })
    .select()
    .single();
  if (error) throw error;
  return winsLearningFromRow(data);
}

// ─────────────────────────────────────────────────────────────────────────────

/** Build task title and description for a lead with outstanding compliance items. */
function getComplianceTaskForLead(lead) {
  const issues = [];
  if (lead.status === "Cancelled" && !lead.archived && !lead.gmDirective) issues.push("cancelled unreviewed");
  if (lead.status === "Unused" && (lead.daysOpen ?? 0) > 5) issues.push("unused overdue");
  const actionable = lead.status === "Cancelled" || lead.status === "Unused";
  if (actionable && !(lead.enrichment?.reason || lead.enrichment?.notes)) issues.push("missing comments");
  if (lead.mismatch) issues.push("data mismatch");

  const customer = lead.customer ?? "Lead";
  const title = issues.length === 1
    ? `Compliance: ${issues[0]} — ${customer}`
    : `Compliance: ${issues.join(", ")} — ${customer}`;
  const description = `Resolve before weekly compliance meeting. ${lead.reservationId ? `Reservation: ${lead.reservationId}` : ""}`.trim();
  return { title, description };
}

/** Create compliance tasks for each outstanding lead in a branch. Returns count created. */
export async function createComplianceTasksForBranch({
  branch,
  bmName,
  outstandingLeads,
  dueDateStr,
  gmName,
  gmUserId = null,
}) {
  if (!outstandingLeads?.length) return { created: 0, errors: [] };
  const dueDate = dueDateStr ? new Date(dueDateStr + "T23:59:59") : null;
  const createdByName = gmName ?? "GM";
  const assignedToName = bmName ?? "—";

  let assignedTo = null;
  try {
    const profile = await fetchUserProfileByBranch(branch);
    if (profile?.id) assignedTo = profile.id;
  } catch (e) {
    console.warn("[createComplianceTasksForBranch] Could not resolve BM user for branch:", branch, e);
  }

  const created = [];
  const errors = [];
  for (const lead of outstandingLeads) {
    try {
      const { title, description } = getComplianceTaskForLead(lead);
      const task = await insertTask({
        title,
        description,
        dueDate: dueDate ?? new Date(),
        leadId: lead.id,
        assignedTo,
        assignedToName,
        createdBy: gmUserId,
        createdByName,
        source: "gm_assigned",
        priority: "High",
      });
      created.push(task);
    } catch (err) {
      errors.push({ leadId: lead.id, customer: lead.customer, error: err?.message ?? String(err) });
    }
  }
  return { created: created.length, errors };
}

// =============================================================================
// ADMIN UPLOAD FUNCTIONS
// =============================================================================

function uploadFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    uploadType: row.upload_type,
    fileName: row.file_name,
    status: row.status,
    summary: row.summary ?? {},
    rowCount: row.row_count,
    newCount: row.new_count,
    updatedCount: row.updated_count,
    unchangedCount: row.unchanged_count,
    failedCount: row.failed_count,
    conflictCount: row.conflict_count,
    orphanCount: row.orphan_count,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function conflictFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    uploadId: row.upload_id,
    leadId: row.lead_id,
    reservationId: row.reservation_id,
    customerName: row.customer_name,
    branch: row.branch,
    fieldName: row.field_name,
    sourceValue: row.source_value,
    enrichedValue: row.enriched_value,
    conflictType: row.conflict_type,
    resolution: row.resolution,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
  };
}

/** Create an upload record (status=pending). Returns the upload row. */
export async function createUploadRecord({ uploadType, fileName, uploadedByName }) {
  const { data, error } = await supabase
    .from("uploads")
    .insert({
      upload_type: uploadType,
      file_name: fileName,
      status: "pending",
      uploaded_by_name: uploadedByName ?? "Admin",
    })
    .select()
    .single();
  if (error) throw error;
  return uploadFromRow(data);
}

/** Update upload record with summary and status. */
export async function updateUploadRecord(uploadId, updates) {
  const row = {};
  if (updates.status) row.status = updates.status;
  if (updates.summary) row.summary = updates.summary;
  if (updates.rowCount !== undefined) row.row_count = updates.rowCount;
  if (updates.newCount !== undefined) row.new_count = updates.newCount;
  if (updates.updatedCount !== undefined) row.updated_count = updates.updatedCount;
  if (updates.unchangedCount !== undefined) row.unchanged_count = updates.unchangedCount;
  if (updates.failedCount !== undefined) row.failed_count = updates.failedCount;
  if (updates.conflictCount !== undefined) row.conflict_count = updates.conflictCount;
  if (updates.orphanCount !== undefined) row.orphan_count = updates.orphanCount;
  if (updates.status === "completed") row.completed_at = new Date().toISOString();
  const { data, error } = await supabase.from("uploads").update(row).eq("id", uploadId).select().single();
  if (error) throw error;
  return uploadFromRow(data);
}

/** Fetch recent uploads. */
export async function fetchUploads(limit = 10) {
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(uploadFromRow);
}

/** Insert conflict records for an upload. */
export async function insertUploadConflicts(uploadId, conflicts) {
  if (!conflicts?.length) return [];
  const rows = conflicts.map((c) => ({
    upload_id: uploadId,
    lead_id: c.leadId ?? null,
    reservation_id: c.reservationId,
    customer_name: c.customerName ?? null,
    branch: c.branch ?? null,
    field_name: c.fieldName,
    source_value: c.sourceValue ?? null,
    enriched_value: c.enrichedValue ?? null,
    conflict_type: c.conflictType,
  }));
  const { data, error } = await supabase.from("upload_conflicts").insert(rows).select();
  if (error) throw error;
  return (data ?? []).map(conflictFromRow);
}

/** Resolve a conflict. */
export async function resolveUploadConflict(conflictId, resolution, resolvedBy) {
  const { data, error } = await supabase
    .from("upload_conflicts")
    .update({
      resolution,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy ?? "Admin",
    })
    .eq("id", conflictId)
    .select()
    .single();
  if (error) throw error;
  return conflictFromRow(data);
}

/** Fetch unresolved conflicts for an upload. */
export async function fetchUnresolvedConflicts(uploadId) {
  const { data, error } = await supabase
    .from("upload_conflicts")
    .select("*")
    .eq("upload_id", uploadId)
    .is("resolution", null)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(conflictFromRow);
}

/**
 * Commit HLES upload: insert new leads, update existing, handle conflicts.
 * This is the main write operation for the admin upload flow.
 */
function leadToInsertRow(lead, uploadId) {
  return {
    customer: lead.customer,
    reservation_id: lead.reservationId,
    confirm_num: lead.confirmNum,
    knum: lead.knum,
    status: lead.status,
    source_status: lead.sourceStatus ?? lead.status,
    branch: lead.branch,
    bm_name: "—",
    insurance_company: lead.insuranceCompany,
    cdp_name: lead.cdpName,
    time_to_first_contact: lead.timeToFirstContact,
    first_contact_by: lead.firstContactBy,
    hles_reason: lead.hlesReason,
    body_shop: lead.bodyShop,
    week_of: lead.weekOf,
    init_dt_final: lead.initDtFinal,
    contact_range: lead.contactRange,
    htz_region: lead.htzRegion,
    set_state: lead.setState,
    zone: lead.zone,
    area_mgr: lead.areaMgr,
    general_mgr: lead.generalMgr,
    rent_loc: lead.rentLoc,
    last_upload_id: uploadId,
  };
}

const BATCH_SIZE = 200;
const UPDATE_CONCURRENCY = 20;

export async function commitHlesUpload(uploadId, commitPlan, onProgress) {
  const results = { inserted: 0, updated: 0, archived: 0, deleted: 0, errors: [] };
  const totalOps = commitPlan.inserts.length + commitPlan.updates.length + (commitPlan.archives?.length ?? 0) + (commitPlan.deletes?.length ?? 0);
  let completedOps = 0;

  const reportProgress = (label) => {
    onProgress?.({ completed: completedOps, total: totalOps, label });
  };

  // Batch-insert new leads
  if (commitPlan.inserts.length > 0) {
    const rows = commitPlan.inserts.map((lead) => leadToInsertRow(lead, uploadId));
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      let batch = rows.slice(i, i + BATCH_SIZE);
      reportProgress(`Inserting leads ${i + 1}–${Math.min(i + BATCH_SIZE, rows.length)} of ${rows.length}`);
      let { error } = await supabase.from("leads").insert(batch);
      // Retry: if a column doesn't exist in the DB, strip it and retry
      if (error?.message?.includes("column") && error?.message?.includes("does not exist")) {
        const missingCol = error.message.match(/column "([^"]+)"/)?.[1];
        if (missingCol) {
          console.warn(`[Upload] Column "${missingCol}" missing from DB — skipping it`);
          batch = batch.map((r) => { const { [missingCol]: _, ...rest } = r; return rest; });
          ({ error } = await supabase.from("leads").insert(batch));
        }
      }
      if (error) {
        batch.forEach((r) => results.errors.push({ reservationId: r.reservation_id, error: error.message }));
      } else {
        results.inserted += batch.length;
      }
      completedOps += batch.length;
    }
  }

  // Parallel-update existing leads
  if (commitPlan.updates.length > 0) {
    const now = new Date().toISOString();
    let skipCol = null;

    const buildUpdateFields = (item) => {
      const fields = {
        source_status: item.parsed.status,
        insurance_company: item.parsed.insuranceCompany,
        time_to_first_contact: item.parsed.timeToFirstContact,
        first_contact_by: item.parsed.firstContactBy,
        hles_reason: item.parsed.hlesReason,
        body_shop: item.parsed.bodyShop,
        week_of: item.parsed.weekOf,
        contact_range: item.parsed.contactRange,
        confirm_num: item.parsed.confirmNum,
        knum: item.parsed.knum,
        htz_region: item.parsed.htzRegion,
        set_state: item.parsed.setState,
        zone: item.parsed.zone,
        area_mgr: item.parsed.areaMgr,
        general_mgr: item.parsed.generalMgr,
        rent_loc: item.parsed.rentLoc,
        cdp_name: item.parsed.cdpName,
        bm_name: item.existing?.bmName || "—",
        last_upload_id: uploadId,
        updated_at: now,
      };
      if (item.useSourceForConflicts || !item.resolution) {
        fields.status = item.parsed.status;
        fields.branch = item.parsed.branch;
      }
      if (skipCol) delete fields[skipCol];
      return fields;
    };

    for (let i = 0; i < commitPlan.updates.length; i += UPDATE_CONCURRENCY) {
      const batch = commitPlan.updates.slice(i, i + UPDATE_CONCURRENCY);
      reportProgress(`Updating leads ${i + 1}–${Math.min(i + UPDATE_CONCURRENCY, commitPlan.updates.length)} of ${commitPlan.updates.length}`);

      const settled = await Promise.allSettled(
        batch.map((item) =>
          supabase.from("leads").update(buildUpdateFields(item)).eq("id", item.id),
        ),
      );

      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        const err = s.status === "rejected" ? s.reason : s.value?.error;
        if (err) {
          // On first missing-column error, remember it and retry just this one
          if (!skipCol && err.message?.includes("column") && err.message?.includes("does not exist")) {
            skipCol = err.message.match(/column "([^"]+)"/)?.[1];
            if (skipCol) {
              console.warn(`[Upload] Column "${skipCol}" missing — skipping for all updates`);
              const { error: retryErr } = await supabase.from("leads").update(buildUpdateFields(batch[j])).eq("id", batch[j].id);
              if (retryErr) {
                results.errors.push({ reservationId: batch[j].reservationId, error: retryErr.message });
              } else {
                results.updated++;
              }
              completedOps++;
              continue;
            }
          }
          results.errors.push({ reservationId: batch[j].reservationId, error: err.message ?? String(err) });
        } else {
          results.updated++;
        }
        completedOps++;
      }
    }
  }

  // Batch-archive orphaned leads
  if (commitPlan.archives?.length > 0) {
    const archiveIds = commitPlan.archives.map((a) => a.id);
    reportProgress(`Archiving ${archiveIds.length} orphaned leads`);
    const { error } = await supabase
      .from("leads")
      .update({ archived: true, updated_at: new Date().toISOString() })
      .in("id", archiveIds);
    if (error) {
      archiveIds.forEach((id) => results.errors.push({ reservationId: id, error: error.message }));
    } else {
      results.archived += archiveIds.length;
    }
    completedOps += archiveIds.length;
  }

  // Batch-delete orphaned leads
  if (commitPlan.deletes?.length > 0) {
    const deleteIds = commitPlan.deletes.map((d) => d.id);
    reportProgress(`Removing ${deleteIds.length} orphaned leads`);
    const { error } = await supabase.from("leads").delete().in("id", deleteIds);
    if (error) {
      deleteIds.forEach((id) => results.errors.push({ reservationId: id, error: error.message }));
    } else {
      results.deleted = (results.deleted ?? 0) + deleteIds.length;
    }
    completedOps += deleteIds.length;
  }

  reportProgress("Saving upload record");

  const hasErrors = results.errors.length > 0;
  await updateUploadRecord(uploadId, {
    status: hasErrors ? "failed" : "completed",
    newCount: results.inserted,
    updatedCount: results.updated,
    failedCount: results.errors.length,
  });

  return results;
}

/**
 * Commit TRANSLOG upload: append events to matched leads.
 * Batched: one SELECT for all existing translogs, merge in memory, parallel UPDATEs.
 */
export async function commitTranslogUpload(uploadId, matchedLeads, onProgress) {
  const results = { updated: 0, errors: [] };
  const total = matchedLeads.length;
  if (!total) return results;

  // 1. Fetch all existing translogs (chunked to avoid URL length limits)
  onProgress?.({ completed: 0, total, label: "Reading existing activity logs" });
  const leadIds = matchedLeads.map((m) => m.lead.id).filter(Boolean);
  const existingById = new Map();

  for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
    const chunk = leadIds.slice(i, i + BATCH_SIZE);
    const { data, error: fetchErr } = await supabase
      .from("leads")
      .select("id, translog")
      .in("id", chunk);
    if (fetchErr) {
      chunk.forEach((id) => results.errors.push({ leadId: id, error: fetchErr.message }));
    } else {
      (data ?? []).forEach((r) => existingById.set(r.id, r.translog ?? []));
    }
  }

  // 2. Merge new events into existing translogs in memory
  const updates = matchedLeads.map(({ lead, events }) => {
    const existing = existingById.get(lead.id) ?? [];
    const merged = [...existing, ...events.map((e) => ({
      date: e.systemDate,
      type: e.eventTypeLabel,
      detail: e.msgSummary,
      eventType: e.eventType,
      empName: e.empName,
    }))];
    return { id: lead.id, translog: merged };
  });

  // 3. Parallel UPDATEs
  const now = new Date().toISOString();
  let completed = 0;

  for (let i = 0; i < updates.length; i += UPDATE_CONCURRENCY) {
    const batch = updates.slice(i, i + UPDATE_CONCURRENCY);
    onProgress?.({ completed, total, label: `Writing events ${i + 1}–${Math.min(i + UPDATE_CONCURRENCY, total)} of ${total}` });

    const settled = await Promise.allSettled(
      batch.map((u) =>
        supabase
          .from("leads")
          .update({ translog: u.translog, last_upload_id: uploadId, updated_at: now })
          .eq("id", u.id),
      ),
    );

    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      if (s.status === "rejected" || s.value?.error) {
        results.errors.push({ leadId: batch[j].id, error: s.reason?.message ?? s.value?.error?.message });
      } else {
        results.updated++;
      }
      completed++;
    }
  }

  onProgress?.({ completed: total, total, label: "TRANSLOG commit complete" });
  return results;
}

/**
 * Insert a new upload_summary row with updated data_as_of_date.
 * This drives the "Data last updated on ..." banner.
 */
export async function insertUploadSummary({ hles = {}, translog = {}, dataAsOfDate }) {
  const dateStr = dataAsOfDate ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("upload_summary")
    .insert({
      hles,
      translog,
      data_as_of_date: dateStr,
    })
    .select()
    .single();
  if (error) {
    console.error("[insertUploadSummary] failed:", error);
    throw error;
  }
  return {
    hles: data.hles ?? {},
    translog: data.translog ?? {},
    dataAsOfDate: data.created_at ?? data.data_as_of_date,
  };
}

/**
 * Update org mapping from HLES-derived hierarchy.
 * Auto-derives AM/GM/Zone from HLES data. Preserves manual BM assignments.
 * Batched: one SELECT for all branches, then batched upserts.
 */
export async function updateOrgMappingFromHles(orgRows, uploadId) {
  const results = { updated: 0, inserted: 0, errors: [] };
  if (!orgRows?.length) return results;

  // 1. Fetch all existing org_mapping rows in one call
  const branchNames = orgRows.map((r) => r.branch).filter(Boolean);
  const { data: existingRows, error: fetchErr } = await supabase
    .from("org_mapping")
    .select("id, branch, bm, am, gm, zone")
    .in("branch", branchNames);
  if (fetchErr) {
    return { ...results, errors: [{ branch: "*", error: fetchErr.message }] };
  }

  const existingByBranch = new Map((existingRows ?? []).map((r) => [r.branch, r]));
  const now = new Date().toISOString();

  // 2. Split into updates vs inserts.
  //    Preserves manual BM assignments from the Org Mapping page.
  const toUpdate = [];
  const toInsert = [];
  for (const row of orgRows) {
    if (!row.branch) continue;
    const existing = existingByBranch.get(row.branch);
    if (existing) {
      toUpdate.push({
        id: existing.id,
        am: row.am || existing.am,
        gm: row.gm || existing.gm,
        zone: row.zone || existing.zone,
        auto_derived: true,
        last_upload_id: uploadId,
        updated_at: now,
      });
    } else {
      toInsert.push({
        bm: "— Unassigned —",
        branch: row.branch,
        am: row.am || "",
        gm: row.gm || "",
        zone: row.zone || "",
        auto_derived: true,
        last_upload_id: uploadId,
      });
    }
  }

  // 3. Batch-update existing rows (row-by-row because each has a unique id+values)
  //    Use Promise.all with concurrency limit to avoid hammering the DB
  const CONCURRENCY = 10;
  for (let i = 0; i < toUpdate.length; i += CONCURRENCY) {
    const batch = toUpdate.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(({ id, ...fields }) =>
        supabase.from("org_mapping").update(fields).eq("id", id),
      ),
    );
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      if (s.status === "rejected" || s.value?.error) {
        results.errors.push({ branch: batch[j].branch ?? `id:${batch[j].id}`, error: s.reason?.message ?? s.value?.error?.message });
      } else {
        results.updated++;
      }
    }
  }

  // 4. Batch-insert new branches
  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("org_mapping").insert(toInsert);
    if (insertErr) {
      toInsert.forEach((r) => results.errors.push({ branch: r.branch, error: insertErr.message }));
    } else {
      results.inserted += toInsert.length;
    }
  }

  // 5. Auto-link gm_user_id for org_mapping rows whose `gm` text
  //    matches a user_profile with role='gm' that isn't linked yet.
  await autoLinkGMUserIds();

  return results;
}

/**
 * Match org_mapping.gm text names to user_profiles with role='gm' and set
 * gm_user_id so resolveGMName can look up by FK instead of fragile text match.
 * Only touches rows where gm_user_id is currently null.
 */
async function autoLinkGMUserIds() {
  const { data: gmProfiles, error: profErr } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .eq("role", "gm");
  if (profErr || !gmProfiles?.length) return;

  const { data: unmappedRows, error: fetchErr } = await supabase
    .from("org_mapping")
    .select("id, gm")
    .is("gm_user_id", null)
    .not("gm", "is", null);
  if (fetchErr || !unmappedRows?.length) return;

  for (const profile of gmProfiles) {
    const matching = unmappedRows.filter((r) => r.gm === profile.display_name);
    if (matching.length === 0) continue;
    const ids = matching.map((r) => r.id);
    const { error } = await supabase
      .from("org_mapping")
      .update({ gm_user_id: profile.id })
      .in("id", ids);
    if (error) console.error(`[autoLinkGMUserIds] Failed for ${profile.display_name}:`, error);
  }
}

/**
 * Remove org_mapping rows that came from seed data and have zero leads.
 * Safe to call after every upload — only deletes branches with no matching leads.
 */
export async function cleanupStaleSeedBranches() {
  const { data: allBranches, error: fetchErr } = await supabase
    .from("org_mapping")
    .select("id, branch");
  if (fetchErr || !allBranches?.length) return { removed: 0 };

  const { data: activeBranches, error: leadErr } = await supabase
    .from("leads")
    .select("branch")
    .limit(10000);
  if (leadErr) return { removed: 0 };

  const activeBranchSet = new Set((activeBranches ?? []).map((r) => r.branch));
  const staleIds = allBranches
    .filter((r) => !activeBranchSet.has(r.branch))
    .map((r) => r.id);

  if (staleIds.length === 0) return { removed: 0 };

  const { error: delErr } = await supabase
    .from("org_mapping")
    .delete()
    .in("id", staleIds);
  if (delErr) {
    console.error("[cleanupStaleSeedBranches] Delete failed:", delErr);
    return { removed: 0 };
  }
  return { removed: staleIds.length };
}

/**
 * De-anonymize uploaded data using persistent code mappings.
 * Runs after every HLES upload to translate coded values to readable names.
 * All updates are batched concurrently for speed.
 */
export async function applyCodeMappings() {
  const { cdp, customer, gm, am } = codeMappings;
  const BATCH = 80;
  let leadCount = 0;
  let orgCount = 0;

  const BM_FIRST = ["J","M","A","S","T","R","E","P","C","N","D","F","G","H","B","K","L","W","V"];
  const BM_LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Lee","Harris","Clark","Lewis","Robinson","Walker","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Phillips"];
  function bmNameForBranch(branch) {
    const hash = [...branch].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    return BM_FIRST[Math.abs(hash) % BM_FIRST.length] + ". " + BM_LAST[Math.abs(hash >> 4) % BM_LAST.length];
  }

  // 1. De-anonymize leads — fetch all anonymized, batch-update concurrently
  const { data: anonLeads } = await supabase
    .from("leads")
    .select("id, customer, insurance_company, general_mgr, area_mgr")
    .or("customer.like.CUSTOMER_%,insurance_company.like.CDP_%,general_mgr.like.GEN_MGR_%,area_mgr.like.AREA_MGR_%");

  if (anonLeads?.length) {
    for (let i = 0; i < anonLeads.length; i += BATCH) {
      await Promise.allSettled(anonLeads.slice(i, i + BATCH).map((l) => {
        const u = {};
        if (l.customer && customer[l.customer]) u.customer = customer[l.customer];
        if (l.insurance_company && cdp[l.insurance_company]) { u.insurance_company = cdp[l.insurance_company]; u.cdp_name = cdp[l.insurance_company]; }
        if (l.general_mgr && gm[l.general_mgr]) u.general_mgr = gm[l.general_mgr];
        if (l.area_mgr && am[l.area_mgr]) u.area_mgr = am[l.area_mgr];
        return Object.keys(u).length ? supabase.from("leads").update(u).eq("id", l.id) : Promise.resolve({});
      }));
    }
    leadCount = anonLeads.length;
  }

  // 2. De-anonymize org_mapping GM/AM + assign BM names — single pass, batched
  const { data: orgs } = await supabase
    .from("org_mapping")
    .select("id, gm, am, bm");

  if (orgs?.length) {
    const updates = orgs.map((o) => {
      const u = {};
      if (o.gm && gm[o.gm]) u.gm = gm[o.gm];
      if (o.am && am[o.am]) u.am = am[o.am];
      if (!o.bm || o.bm === "— Unassigned —" || o.bm === "MMR" || o.bm === "NO MMR") {
        u.bm = bmNameForBranch(o.id.toString());
      }
      return Object.keys(u).length ? { id: o.id, ...u } : null;
    }).filter(Boolean);

    for (let i = 0; i < updates.length; i += BATCH) {
      await Promise.allSettled(updates.slice(i, i + BATCH).map(({ id, ...fields }) =>
        supabase.from("org_mapping").update(fields).eq("id", id)
      ));
    }
    orgCount = updates.length;
  }

  // 3. Backfill bm_name on leads from org_mapping — batched
  const { data: bmOrgs } = await supabase.from("org_mapping").select("branch, bm");
  const bmByBranch = {};
  (bmOrgs ?? []).forEach((o) => { if (o.bm && o.bm !== "— Unassigned —") bmByBranch[o.branch] = o.bm; });

  const { data: dashLeads } = await supabase.from("leads").select("id, branch").eq("bm_name", "—");
  if (dashLeads?.length) {
    for (let i = 0; i < dashLeads.length; i += BATCH) {
      await Promise.allSettled(dashLeads.slice(i, i + BATCH).map((l) => {
        const bm = bmByBranch[l.branch];
        return bm ? supabase.from("leads").update({ bm_name: bm }).eq("id", l.id) : Promise.resolve({});
      }));
    }
  }

  console.log(`[applyCodeMappings] De-anonymized ${leadCount} leads, ${orgCount} org rows`);
  return { leads: leadCount, orgs: orgCount };
}
