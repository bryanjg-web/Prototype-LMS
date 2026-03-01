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

/** Insert a single task. Returns the created task or throws. */
export async function insertTask({
  title,
  description = null,
  dueDate,
  leadId,
  assignedTo = null,
  assignedToName,
  createdBy = null,
  createdByName,
  source = "gm_assigned",
  priority = "High",
}) {
  const dueDateStr = dueDate instanceof Date ? dueDate.toISOString().slice(0, 10) : dueDate;
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      due_date: dueDateStr,
      lead_id: leadId,
      assigned_to: assignedTo,
      assigned_to_name: assignedToName,
      created_by: createdBy,
      created_by_name: createdByName,
      source,
      priority,
      status: "Open",
    })
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
export async function commitHlesUpload(uploadId, commitPlan) {
  const results = { inserted: 0, updated: 0, archived: 0, errors: [] };

  // Insert new leads
  for (const lead of commitPlan.inserts) {
    try {
      const { error } = await supabase.from("leads").insert({
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
      });
      if (error) {
        results.errors.push({ reservationId: lead.reservationId, error: error.message });
      } else {
        results.inserted++;
      }
    } catch (err) {
      results.errors.push({ reservationId: lead.reservationId, error: err.message });
    }
  }

  // Update existing leads (source fields only, preserve enrichment)
  for (const item of commitPlan.updates) {
    try {
      const updateFields = {
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
        last_upload_id: uploadId,
        updated_at: new Date().toISOString(),
      };

      // If resolution says use_source, also update the conflicting fields
      if (item.useSourceForConflicts) {
        updateFields.status = item.parsed.status;
        updateFields.branch = item.parsed.branch;
      } else {
        // Safe source fields that don't conflict with enrichment
        if (!item.resolution) {
          updateFields.status = item.parsed.status;
          updateFields.branch = item.parsed.branch;
        }
      }

      const { error } = await supabase
        .from("leads")
        .update(updateFields)
        .eq("id", item.id)
        .select()
        .single();
      if (error) {
        results.errors.push({ reservationId: item.reservationId, error: error.message });
      } else {
        results.updated++;
      }
    } catch (err) {
      results.errors.push({ reservationId: item.reservationId, error: err.message });
    }
  }

  // Archive orphaned leads
  for (const item of commitPlan.archives) {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) {
        results.errors.push({ reservationId: item.reservationId, error: error.message });
      } else {
        results.archived++;
      }
    } catch (err) {
      results.errors.push({ reservationId: item.reservationId, error: err.message });
    }
  }

  // Update the upload record
  await updateUploadRecord(uploadId, {
    status: results.errors.length > 0 ? "completed" : "completed",
    newCount: results.inserted,
    updatedCount: results.updated,
  });

  return results;
}

/**
 * Commit TRANSLOG upload: append events to matched leads.
 */
export async function commitTranslogUpload(uploadId, matchedLeads) {
  const results = { updated: 0, errors: [] };

  for (const { lead, events } of matchedLeads) {
    try {
      const { data: current } = await supabase
        .from("leads")
        .select("translog")
        .eq("id", lead.id)
        .single();

      const existingTranslog = current?.translog ?? [];
      const newTranslog = [...existingTranslog, ...events.map((e) => ({
        date: e.systemDate,
        type: e.eventTypeLabel,
        detail: e.msgSummary,
        eventType: e.eventType,
        empName: e.empName,
      }))];

      const { error } = await supabase
        .from("leads")
        .update({
          translog: newTranslog,
          last_upload_id: uploadId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (error) {
        results.errors.push({ leadId: lead.id, error: error.message });
      } else {
        results.updated++;
      }
    } catch (err) {
      results.errors.push({ leadId: lead.id, error: err.message });
    }
  }

  return results;
}

/**
 * Update org mapping from HLES-derived hierarchy.
 * Auto-derives AM/GM/Zone from HLES data. Preserves manual BM assignments.
 */
export async function updateOrgMappingFromHles(orgRows, uploadId) {
  const results = { updated: 0, inserted: 0, errors: [] };

  for (const row of orgRows) {
    try {
      // Check if branch exists
      const { data: existing } = await supabase
        .from("org_mapping")
        .select("id, bm")
        .eq("branch", row.branch)
        .maybeSingle();

      if (existing) {
        // Update hierarchy fields, preserve BM
        const { error } = await supabase
          .from("org_mapping")
          .update({
            am: row.am || existing.am,
            gm: row.gm || existing.gm,
            zone: row.zone || existing.zone,
            auto_derived: true,
            last_upload_id: uploadId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) results.errors.push({ branch: row.branch, error: error.message });
        else results.updated++;
      } else {
        // New branch — insert with placeholder BM
        const { error } = await supabase
          .from("org_mapping")
          .insert({
            bm: "— Unassigned —",
            branch: row.branch,
            am: row.am || "",
            gm: row.gm || "",
            zone: row.zone || "",
            auto_derived: true,
            last_upload_id: uploadId,
          });
        if (error) results.errors.push({ branch: row.branch, error: error.message });
        else results.inserted++;
      }
    } catch (err) {
      results.errors.push({ branch: row.branch, error: err.message });
    }
  }

  return results;
}
