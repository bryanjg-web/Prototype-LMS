/**
 * HLES + TRANSLOG CSV parsers.
 *
 * Parses raw CSV files into normalised objects the reconciliation engine
 * can compare against existing leads. Uses Papa Parse for robust CSV handling
 * (quoted fields, encoding edge-cases, streaming for large files).
 */
import Papa from "papaparse";

// ---------------------------------------------------------------------------
// HLES column name normalisation (real exports often have leading \n)
// ---------------------------------------------------------------------------
function cleanKey(key) {
  return key.replace(/^\n/, "").trim();
}

function cleanRow(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[cleanKey(k)] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Status derivation from HLES indicator columns
// ---------------------------------------------------------------------------
function deriveStatus(row) {
  if (String(row.RENT_IND) === "1") return "Rented";
  if (String(row.CANCEL_ID) === "1") return "Cancelled";
  if (String(row.UNUSED_IND) === "1") return "Unused";
  return "Unused"; // default if none set
}

// ---------------------------------------------------------------------------
// Contact group → first_contact_by mapping
// ---------------------------------------------------------------------------
function deriveFirstContactBy(row) {
  const group = (row["New Contact Group"] || row.CONTACT_GROUP || "").toUpperCase();
  if (group.includes("NO CONTACT")) return "none";
  if (group.includes("HRD")) return "hrd";
  return "branch";
}

// ---------------------------------------------------------------------------
// Time-to-first-contact from DT_FROM_ALPHA1 or DAY_DIF/HRS_DIF/MIN_DIF
// ---------------------------------------------------------------------------
function deriveTimeToContact(row) {
  const days = parseFloat(row.DAY_DIF) || 0;
  const hrs = parseFloat(row.HRS_DIF) || 0;
  const mins = parseFloat(row.MIN_DIF) || 0;

  if (days === 0 && hrs === 0 && mins === 0) {
    return row.DT_FROM_ALPHA1 ? null : "No contact";
  }

  const totalMins = days * 1440 + hrs * 60 + mins;
  if (totalMins < 60) return `${Math.round(totalMins)} min`;
  if (totalMins < 1440) return `${Math.round(totalMins / 60 * 10) / 10} hrs`;
  return `${Math.round(totalMins / 1440 * 10) / 10} days`;
}

// ---------------------------------------------------------------------------
// Parse branch name from RENT_LOC (e.g. "93156-02   - GOLDEN TRIANGLE AP HLE")
// ---------------------------------------------------------------------------
function parseBranchName(rentLoc) {
  if (!rentLoc) return "";
  const match = rentLoc.match(/-\s+(.+)/);
  return match ? match[1].replace(/\s+HLE$/i, "").trim() : rentLoc.trim();
}

// ---------------------------------------------------------------------------
// HLES Required fields for validation
// ---------------------------------------------------------------------------
const HLES_REQUIRED = ["CONFIRM_NUM", "RENTER_LAST", "RENT_LOC"];

/**
 * Validate a single HLES row. Returns null if valid, or an error string.
 */
function validateHlesRow(row, rowIndex) {
  for (const field of HLES_REQUIRED) {
    if (!row[field]) return `Row ${rowIndex}: Missing required field "${field}"`;
  }
  if (row.RENT_IND === undefined && row.CANCEL_ID === undefined && row.UNUSED_IND === undefined) {
    return `Row ${rowIndex}: No status indicator (RENT_IND, CANCEL_ID, UNUSED_IND)`;
  }
  return null;
}

/**
 * Transform a clean HLES row into a normalised lead object
 * that maps to the leads table schema.
 */
function hlesRowToLead(row) {
  const status = deriveStatus(row);
  return {
    confirmNum: row.CONFIRM_NUM,
    knum: row.KNUM || row.CONFIRM_NUM,
    customer: row.RENTER_LAST || "Unknown",
    reservationId: row.CONFIRM_NUM,
    status,
    sourceStatus: status,
    branch: parseBranchName(row.RENT_LOC),
    rentLoc: row.RENT_LOC,
    insuranceCompany: row["CDP NAME"] || row.CDP || "",
    cdpName: row["CDP NAME"] || "",
    weekOf: row["Week Of"] || "",
    initDtFinal: row.INIT_DT_FINAL || "",
    contactRange: row["CONTACT RANGE"] || row["New Contact Group"] || "",
    firstContactBy: deriveFirstContactBy(row),
    timeToFirstContact: deriveTimeToContact(row),
    hlesReason: (row["CANCEL REASON"] || "").trim() || null,
    bodyShop: row["BODY SHOP"] || "",
    htzRegion: row.HTZREGION || "",
    setState: row.SET_STATE || "",
    zone: row.ZONE || "",
    areaMgr: row.AREA_MGR || "",
    generalMgr: row.GENERAL_MGR || "",
    adjusterLastName: row["ADJ LNAME"] || "",
    adjusterFirstName: row["ADJ FNAME"] || "",
    mmr: row.MMR || "",
  };
}

// ---------------------------------------------------------------------------
// TRANSLOG parsing
// ---------------------------------------------------------------------------
const TRANSLOG_REQUIRED = ["CONFIRM_NUM"];

function validateTranslogRow(row, rowIndex) {
  const hasKey = row.CONFIRM_NUM || row.Knum;
  if (!hasKey) return `Row ${rowIndex}: Missing CONFIRM_NUM and Knum`;
  return null;
}

/**
 * Human-readable label for a TRANSLOG event type.
 */
const EVENT_TYPE_LABELS = {
  0: "Reservation",
  1: "Rental Agreement",
  2: "Employee",
  3: "EDI",
  4: "Location/Contact",
};

function translogRowToEvent(row) {
  const msgs = [];
  for (let i = 1; i <= 10; i++) {
    const val = row[`MSG${i}`];
    if (val && String(val).trim()) msgs.push(String(val).trim());
  }

  return {
    confirmNum: row.CONFIRM_NUM || "",
    knum: row.Knum || "",
    eventType: String(row.EventType ?? ""),
    eventTypeLabel: EVENT_TYPE_LABELS[Number(row.EventType)] || "Other",
    systemDate: row.SystemDate || "",
    applicationDate: row.ApplicationDate || "",
    locCode: row.LocCode || "",
    empCode: row.EMP_CODE || "",
    empName: [row.EMP_FNAME, row.EMP_LNAME].filter(Boolean).join(" ").trim(),
    messages: msgs,
    msgSummary: msgs.slice(0, 3).join(" | "),
    fieldChanged: row.FIELD_CHANGED || "",
    rawRow: row,
  };
}

// ---------------------------------------------------------------------------
// Public API — parse full CSV files
// ---------------------------------------------------------------------------

/**
 * Parse an HLES CSV file.
 * @param {File} file — browser File object
 * @returns {Promise<{ leads: object[], errors: string[], orgRows: object[], rawRowCount: number }>}
 */
export function parseHlesCsv(file) {
  return new Promise((resolve) => {
    const leads = [];
    const errors = [];
    const orgSet = new Map();
    let rowIndex = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanKey,
      chunk(results) {
        for (const rawRow of results.data) {
          rowIndex++;
          const row = cleanRow(rawRow);
          const err = validateHlesRow(row, rowIndex);
          if (err) {
            errors.push(err);
            continue;
          }
          const lead = hlesRowToLead(row);
          leads.push(lead);

          // Collect unique org mappings
          const orgKey = lead.rentLoc;
          if (orgKey && !orgSet.has(orgKey)) {
            orgSet.set(orgKey, {
              branch: lead.branch,
              rentLoc: lead.rentLoc,
              am: lead.areaMgr,
              gm: lead.generalMgr,
              zone: lead.zone,
            });
          }
        }
      },
      complete() {
        resolve({
          leads,
          errors,
          orgRows: Array.from(orgSet.values()),
          rawRowCount: rowIndex,
        });
      },
      error(err) {
        errors.push(`Parse error: ${err.message}`);
        resolve({ leads: [], errors, orgRows: [], rawRowCount: 0 });
      },
    });
  });
}

/**
 * Parse a TRANSLOG CSV file.
 * @param {File} file — browser File object
 * @returns {Promise<{ events: object[], eventsByLead: Map<string, object[]>, errors: string[], rawRowCount: number }>}
 */
export function parseTranslogCsv(file) {
  return new Promise((resolve) => {
    const events = [];
    const errors = [];
    const eventsByLead = new Map();
    let rowIndex = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanKey,
      chunk(results) {
        for (const rawRow of results.data) {
          rowIndex++;
          const row = cleanRow(rawRow);
          const err = validateTranslogRow(row, rowIndex);
          if (err) {
            errors.push(err);
            continue;
          }
          const event = translogRowToEvent(row);
          events.push(event);

          // Group by CONFIRM_NUM first, then Knum
          const key = event.confirmNum || event.knum;
          if (key) {
            if (!eventsByLead.has(key)) eventsByLead.set(key, []);
            eventsByLead.get(key).push(event);
          }
        }
      },
      complete() {
        resolve({ events, eventsByLead, errors, rawRowCount: rowIndex });
      },
      error(err) {
        errors.push(`Parse error: ${err.message}`);
        resolve({ events: [], eventsByLead: new Map(), errors: [], rawRowCount: 0 });
      },
    });
  });
}

/**
 * Extract unique org hierarchy rows from parsed HLES leads.
 * Returns de-duplicated array of { branch, rentLoc, am, gm, zone }.
 */
export function extractOrgMapping(parsedLeads) {
  const map = new Map();
  for (const lead of parsedLeads) {
    const key = lead.rentLoc;
    if (!key || map.has(key)) continue;
    map.set(key, {
      branch: lead.branch,
      rentLoc: lead.rentLoc,
      am: lead.areaMgr,
      gm: lead.generalMgr,
      zone: lead.zone,
    });
  }
  return Array.from(map.values());
}
