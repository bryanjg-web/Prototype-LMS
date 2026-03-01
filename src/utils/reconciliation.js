/**
 * Reconciliation engine for HLES uploads.
 *
 * Compares parsed HLES leads against existing leads in the database,
 * categorises each as new / updated / unchanged / conflict, and produces
 * a preview the admin can review before committing.
 *
 * Field provenance rules:
 *   SOURCE fields (from HLES) — always updated on upload:
 *     status, hlesReason, branch, insuranceCompany, timeToFirstContact,
 *     firstContactBy, weekOf, initDtFinal, contactRange, bodyShop,
 *     zone, areaMgr, generalMgr, sourceEmail, sourcePhone, sourceStatus
 *
 *   ENRICHED fields (from BM/GM) — never overwritten by upload:
 *     enrichment, enrichmentLog, email, phone, gmDirective,
 *     enrichmentComplete, archived
 *
 *   CONFLICT fields — require admin resolution:
 *     email/phone (if BM enriched AND source value changed)
 *     status (if lead has enrichment AND status changed)
 */

/**
 * @typedef {Object} ReconciliationResult
 * @property {object[]} newLeads        - Leads not in DB (will be inserted)
 * @property {object[]} updatedLeads    - Leads in DB with changed source fields (safe update)
 * @property {object[]} unchangedLeads  - Leads in DB with no changes
 * @property {object[]} conflicts       - Leads with enrichment conflicts
 * @property {object[]} orphanedLeads   - Leads in DB but not in new upload
 * @property {object}   summary         - Counts for preview
 */

/**
 * Compare parsed HLES leads against existing DB leads.
 *
 * @param {object[]} parsedLeads - Output from parseHlesCsv().leads
 * @param {object[]} existingLeads - Current leads from DB/state
 * @returns {ReconciliationResult}
 */
export function reconcileHlesUpload(parsedLeads, existingLeads) {
  const existingByConfirmNum = new Map();
  const existingByReservationId = new Map();
  for (const lead of existingLeads) {
    if (lead.confirmNum) existingByConfirmNum.set(lead.confirmNum, lead);
    if (lead.reservationId) existingByReservationId.set(lead.reservationId, lead);
  }

  const newLeads = [];
  const updatedLeads = [];
  const unchangedLeads = [];
  const conflicts = [];
  const matchedIds = new Set();

  for (const parsed of parsedLeads) {
    const existing =
      existingByConfirmNum.get(parsed.confirmNum) ||
      existingByReservationId.get(parsed.reservationId);

    if (!existing) {
      newLeads.push({ parsed, action: "insert" });
      continue;
    }

    matchedIds.add(existing.id ?? existing.reservationId);

    const sourceChanges = detectSourceChanges(parsed, existing);
    const enrichmentConflicts = detectEnrichmentConflicts(parsed, existing);

    if (enrichmentConflicts.length > 0) {
      conflicts.push({
        parsed,
        existing,
        sourceChanges,
        enrichmentConflicts,
        action: "conflict",
      });
    } else if (sourceChanges.length > 0) {
      updatedLeads.push({
        parsed,
        existing,
        sourceChanges,
        action: "update",
      });
    } else {
      unchangedLeads.push({ parsed, existing, action: "unchanged" });
    }
  }

  // Orphaned leads: in DB but not in the new HLES upload
  const parsedConfirmNums = new Set(parsedLeads.map((l) => l.confirmNum));
  const orphanedLeads = existingLeads.filter((lead) => {
    const key = lead.confirmNum || lead.reservationId;
    return key && !parsedConfirmNums.has(key) && !matchedIds.has(lead.id ?? lead.reservationId);
  });

  return {
    newLeads,
    updatedLeads,
    unchangedLeads,
    conflicts,
    orphanedLeads,
    summary: {
      total: parsedLeads.length,
      new: newLeads.length,
      updated: updatedLeads.length,
      unchanged: unchangedLeads.length,
      conflicts: conflicts.length,
      orphaned: orphanedLeads.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Source field change detection (safe to auto-update)
// ---------------------------------------------------------------------------
const SOURCE_FIELDS = [
  { parsed: "status", existing: "status", label: "Status" },
  { parsed: "hlesReason", existing: "hlesReason", label: "HLES Reason" },
  { parsed: "branch", existing: "branch", label: "Branch" },
  { parsed: "insuranceCompany", existing: "insuranceCompany", label: "Insurance Company" },
  { parsed: "timeToFirstContact", existing: "timeToFirstContact", label: "Time to First Contact" },
  { parsed: "firstContactBy", existing: "firstContactBy", label: "First Contact By" },
  { parsed: "weekOf", existing: "weekOf", label: "Week Of" },
  { parsed: "contactRange", existing: "contactRange", label: "Contact Range" },
  { parsed: "bodyShop", existing: "bodyShop", label: "Body Shop" },
];

function detectSourceChanges(parsed, existing) {
  const changes = [];
  for (const field of SOURCE_FIELDS) {
    const pVal = normalise(parsed[field.parsed]);
    const eVal = normalise(existing[field.existing]);
    if (pVal !== eVal) {
      changes.push({
        field: field.label,
        key: field.existing,
        oldValue: existing[field.existing] ?? null,
        newValue: parsed[field.parsed] ?? null,
      });
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Enrichment conflict detection
// ---------------------------------------------------------------------------

function detectEnrichmentConflicts(parsed, existing) {
  const conflicts = [];
  const hasEnrichment = existing.enrichment || existing.enrichmentComplete;

  // Contact info: BM enriched email/phone vs HLES source changed
  if (existing.email && existing.email !== existing.sourceEmail) {
    // BM has enriched the email (it differs from the last source value)
    // Check if HLES is now providing a DIFFERENT source value
    // (We don't have parsed source email from HLES since HLES doesn't have email columns,
    //  but this pattern is ready for future TRANSLOG-derived emails)
  }

  if (existing.phone && existing.phone !== existing.sourcePhone) {
    // Same pattern for phone
  }

  // Status change with existing enrichment
  const newStatus = parsed.status;
  const oldStatus = existing.status;
  if (newStatus !== oldStatus && hasEnrichment) {
    conflicts.push({
      type: "status_change",
      field: "Status",
      sourceValue: newStatus,
      enrichedValue: oldStatus,
      detail: `Lead status changed from "${oldStatus}" to "${newStatus}" but has existing enrichment/comments`,
    });
  }

  // Mismatch: HLES reason changed when BM has already provided comments
  if (
    parsed.hlesReason &&
    existing.hlesReason &&
    parsed.hlesReason !== existing.hlesReason &&
    existing.enrichment?.reason
  ) {
    conflicts.push({
      type: "status_change",
      field: "HLES Reason",
      sourceValue: parsed.hlesReason,
      enrichedValue: existing.hlesReason,
      detail: `HLES cancellation reason changed from "${existing.hlesReason}" to "${parsed.hlesReason}" but BM has added comments with reason "${existing.enrichment.reason}"`,
    });
  }

  return conflicts;
}

// ---------------------------------------------------------------------------
// TRANSLOG reconciliation — simpler, append-only
// ---------------------------------------------------------------------------

/**
 * Merge TRANSLOG events into existing leads.
 * TRANSLOG is append-only — new events are added to the lead's translog array.
 *
 * @param {Map<string, object[]>} eventsByLead - From parseTranslogCsv()
 * @param {object[]} existingLeads
 * @returns {{ matched: object[], orphanEvents: object[], summary: object }}
 */
export function reconcileTranslogUpload(eventsByLead, existingLeads) {
  const leadsByConfirmNum = new Map();
  const leadsByKnum = new Map();
  for (const lead of existingLeads) {
    if (lead.confirmNum) leadsByConfirmNum.set(lead.confirmNum, lead);
    if (lead.knum) leadsByKnum.set(lead.knum, lead);
    if (lead.reservationId) leadsByConfirmNum.set(lead.reservationId, lead);
  }

  const matched = [];
  const orphanEvents = [];

  for (const [key, events] of eventsByLead.entries()) {
    const lead = leadsByConfirmNum.get(key) || leadsByKnum.get(key);
    if (lead) {
      matched.push({ lead, events, newEventCount: events.length });
    } else {
      orphanEvents.push({ key, events, eventCount: events.length });
    }
  }

  return {
    matched,
    orphanEvents,
    summary: {
      totalEvents: Array.from(eventsByLead.values()).reduce((s, e) => s + e.length, 0),
      matchedLeads: matched.length,
      matchedEvents: matched.reduce((s, m) => s + m.newEventCount, 0),
      orphanKeys: orphanEvents.length,
      orphanEventCount: orphanEvents.reduce((s, o) => s + o.eventCount, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalise(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim().toLowerCase();
}

/**
 * Build the set of DB operations for committing an HLES upload.
 * Admin has resolved conflicts; this produces the final upsert plan.
 *
 * @param {ReconciliationResult} reconciliation
 * @param {Object<string, string>} conflictResolutions - Map of conflict index → 'keep_enriched' | 'use_source' | 'skip'
 * @param {string} orphanAction - 'archive' | 'keep' | 'delete' — what to do with orphaned leads
 * @returns {{ inserts: object[], updates: object[], archives: object[], skips: object[] }}
 */
export function buildCommitPlan(reconciliation, conflictResolutions = {}, orphanAction = "keep") {
  const inserts = reconciliation.newLeads.map((item) => ({
    ...item.parsed,
    sourceStatus: item.parsed.status,
  }));

  const updates = reconciliation.updatedLeads.map((item) => ({
    id: item.existing.id,
    reservationId: item.existing.reservationId,
    changes: item.sourceChanges,
    parsed: item.parsed,
  }));

  // Resolved conflicts
  const resolvedConflicts = reconciliation.conflicts.map((item, idx) => {
    const resolution = conflictResolutions[idx] || "keep_enriched";
    return { ...item, resolution };
  });

  const conflictUpdates = resolvedConflicts
    .filter((c) => c.resolution !== "skip")
    .map((item) => ({
      id: item.existing.id,
      reservationId: item.existing.reservationId,
      parsed: item.parsed,
      sourceChanges: item.sourceChanges,
      resolution: item.resolution,
      useSourceForConflicts: item.resolution === "use_source",
    }));

  const skips = resolvedConflicts.filter((c) => c.resolution === "skip");

  let archives = [];
  if (orphanAction === "archive") {
    archives = reconciliation.orphanedLeads.map((lead) => ({
      id: lead.id,
      reservationId: lead.reservationId,
    }));
  }

  return {
    inserts,
    updates: [...updates, ...conflictUpdates],
    archives,
    skips,
  };
}
