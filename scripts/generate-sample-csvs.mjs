#!/usr/bin/env node
/**
 * Generate HLES and TRANSLOG sample CSV files for LMS demo.
 *
 * Requirements:
 * - 100+ leads for GM view, 50 leads per branch for BM view
 * - Max 5 unique values per group-by attribute (status, insurance, body_shop, branch)
 * - Real US branch names, global insurers (State Farm, Geico, etc.), real body shops
 * - Data spanning trailing 4 weeks, this month, this year (NOW = 2026-02-22)
 * - Edge cases: mismatch, no contact, archived, GM directive, etc.
 * - TRANSLOG events with CONFIRM_NUM matching HLES for lead profile display
 *
 * Usage: node scripts/generate-sample-csvs.mjs
 * Output: docs/hles_sample_2026.csv, docs/translog_sample_2026.csv
 */

import { writeFileSync } from "fs";
import { join } from "path";

const NOW = new Date("2026-02-22T09:00:00");
const DOCS = join(process.cwd(), "docs");

// --- Seed branch names (must match org_mapping and user_profiles.branch for BM/GM views to show data) ---
// BM demo user (Sarah Chen) is assigned to "Santa Monica" — must include that branch
// Zones match seed: Eastern (D. Williams), Southern (R. Martinez)
const BRANCHES = [
  { rentLoc: "5725-01    - Santa Monica HLE", branch: "Santa Monica", zone: "Eastern", state: "CA", region: "WESTERN" },
  { rentLoc: "7130-01    - Downtown LA HLE", branch: "Downtown LA", zone: "Eastern", state: "CA", region: "WESTERN" },
  { rentLoc: "5733-01    - Pasadena HLE", branch: "Pasadena", zone: "Eastern", state: "CA", region: "WESTERN" },
  { rentLoc: "2204-12    - Long Beach HLE", branch: "Long Beach", zone: "Eastern", state: "CA", region: "WESTERN" },
  { rentLoc: "5346-01    - Anaheim HLE", branch: "Anaheim", zone: "Eastern", state: "CA", region: "WESTERN" },
  { rentLoc: "6942-15    - San Diego Central HLE", branch: "San Diego Central", zone: "Southern", state: "CA", region: "WESTERN" },
  { rentLoc: "7601-34    - La Jolla HLE", branch: "La Jolla", zone: "Southern", state: "CA", region: "WESTERN" },
  { rentLoc: "7653-02    - Carlsbad HLE", branch: "Carlsbad", zone: "Southern", state: "CA", region: "WESTERN" },
  { rentLoc: "7419-01    - Mission Valley HLE", branch: "Mission Valley", zone: "Southern", state: "CA", region: "WESTERN" },
  { rentLoc: "5560-10    - Chula Vista HLE", branch: "Chula Vista", zone: "Southern", state: "CA", region: "WESTERN" },
];

// --- Real global insurers (5 for legend - recognizable household names) ---
const INSURERS = [
  "State Farm",
  "Geico",
  "Progressive",
  "Allstate",
  "Liberty Mutual",
];

// --- Real body shop chains (5 for legend - major national brands) ---
const BODY_SHOPS = [
  "Caliber Collision",
  "Gerber Collision",
  "Service King",
  "Maaco",
  "ABRA Auto Body",
];

// --- Contact groups (for first_contact_by) ---
const CONTACT_GROUPS = [
  { group: "COUNTER", newGroup: "COUNTER", range: "(a)<30min", firstBy: "branch", day: 0, hrs: 0, min: 15 },
  { group: "COUNTER", newGroup: "COUNTER", range: "(b)31min - 1hr", firstBy: "branch", day: 0, hrs: 0, min: 45 },
  { group: "HRD - OKC", newGroup: "HRD - OKC", range: "(c)1-3 hrs", firstBy: "hrd", day: 0, hrs: 2, min: 0 },
  { group: "HRD - OKC", newGroup: "HRD - OKC", range: "(d)3-6 hrs", firstBy: "hrd", day: 0, hrs: 4, min: 30 },
  { group: "NO CONTACT", newGroup: "NO CONTACT", range: "NO CONTACT", firstBy: "none", day: 0, hrs: 0, min: 0 },
];

// --- Cancel reasons ---
const CANCEL_REASONS = [
  "CUSTOMER CANCELLED",
  "MERGE RESERVATION",
  "FOUND BETTER RATE",
  "NO LONGER NEEDED",
  "VEHICLE REPAIRED EARLY",
  "",
];

// --- Week Of dates — MUST be Mondays (Jan 1 2026 = Thursday → first Monday = Jan 5) ---
// setNowFromLeads treats maxWeek as a Monday. If dates are off by even 1 day,
// NOW shifts forward and "This week" becomes an empty range.
const WEEKS = ["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09", "2026-02-16"];

// --- Area/General managers (match seed org_mapping: Eastern=K.Chen/D.Williams, Southern=L.Park/R.Martinez) ---
const AREA_MGRS = ["K. Chen", "K. Chen", "K. Chen", "K. Chen", "K. Chen", "L. Park", "L. Park", "L. Park", "L. Park", "L. Park"];
const GEN_MGRS = ["D. Williams", "D. Williams", "D. Williams", "D. Williams", "D. Williams", "R. Martinez", "R. Martinez", "R. Martinez", "R. Martinez", "R. Martinez"];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n, w = 2) {
  return String(n).padStart(w, "0");
}

function formatInitDt(year, month, day, hour, min) {
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(min)}:00`;
}

function formatDateOnly(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function formatSystemDate(year, month, day, hour, min, sec) {
  return `${year}${pad(month)}${pad(day)}${pad(hour)}${pad(min)}${pad(sec)}`;
}

// --- Generate HLES rows ---
function generateHlesRows() {
  const rows = [];
  let confirmNum = 1000;
  let customerIdx = 0;

  // Weight recent weeks more heavily so "This week" (Feb 16) has plenty of data.
  // ~40% of leads go to the most recent week, rest distributed across remaining weeks.
  const WEIGHTED_WEEKS = [
    ...WEEKS.slice(0, -1),     // weeks 1-6: 1 copy each
    ...Array(6).fill(WEEKS.at(-1)), // week 7 (Feb 16): 6 copies → ~50% weight
  ];

  for (let i = 0; i < BRANCHES.length; i++) {
    const branch = BRANCHES[i];
    const leadsPerBranch = 50; // 50 per branch for BM view
    for (let j = 0; j < leadsPerBranch; j++) {
      customerIdx++;
      const status = randomChoice(["Rented", "Rented", "Cancelled", "Unused", "Reviewed"]); // weighted
      const rentInd = status === "Rented" ? 1 : 0;
      const cancelId = status === "Cancelled" ? 1 : 0;
      const unusedInd = status === "Unused" || status === "Reviewed" ? 1 : 0;

      const weekOf = randomChoice(WEIGHTED_WEEKS);
      const [weekY, weekM, weekD] = weekOf.split("-").map(Number);
      const initDay = weekD + randomInt(0, 3);
      const initMonth = weekM;
      const initYear = weekY;

      const contact = randomChoice(CONTACT_GROUPS);
      const insuranceCompany = randomChoice(INSURERS);
      const bodyShop = bodyShopForLead(j, status);

      const hasContact = contact.firstBy !== "none";
      const dtFromAlpha1 = hasContact
        ? formatInitDt(initYear, initMonth, initDay, 12 + randomInt(0, 6), randomInt(0, 59))
        : "";

      const dayDif = contact.day;
      const hrsDif = contact.hrs;
      const minDif = contact.min;

      const hlesReason = status === "Cancelled" ? randomChoice(CANCEL_REASONS) : " ";
      const cid = pad(confirmNum, 4);
      const knum = `037-SAMPLE${pad(cid)}`;
      const cidFull = `037-SAMPLE${cid}`;

      rows.push({
        CONFIRM_NUM: cidFull,
        RENTER_LAST: `CUSTOMER_${pad(customerIdx, 4)}`,
        CLAIM: `CLAIM_${pad(randomInt(1, 500), 4)}`,
        CDP: String(1238321 + randomInt(0, 3)),
        "CDP NAME": insuranceCompany,
        "Week Of": weekOf,
        INIT_DATE: formatDateOnly(initYear, initMonth, Math.min(initDay, 28)),
        HTZREGION: branch.region,
        SET_STATE: branch.state,
        ZONE: branch.zone,
        AREA_MGR: AREA_MGRS[i],
        GENERAL_MGR: GEN_MGRS[i],
        RENT_LOC: branch.rentLoc,
        RES_ID: 1,
        RENT_IND: rentInd,
        CANCEL_ID: cancelId,
        UNUSED_IND: unusedInd,
        CONTACT_GROUP: contact.group,
        "New Contact Group": contact.newGroup,
        "CONTACT RANGE": contact.range,
        "ADJ LNAME": "",
        "ADJ FNAME": `ADJUSTER_${pad(randomInt(1, 100), 4)}`,
        "BODY SHOP": bodyShop,
        CODE: "STF02",
        KNUM: knum,
        MONTH: `${initYear}${pad(initMonth)}`,
        ZIP: `ZIP_${pad(randomInt(1, 500), 4)}`,
        "CANCEL REASON": hlesReason,
        INIT_DT_FINAL: formatDateOnly(initYear, initMonth, Math.min(initDay, 28)),
        DT_FROM_ALPHA1: dtFromAlpha1,
        DAY_DIF: dayDif,
        HRS_DIF: hrsDif,
        MIN_DIF: minDif,
        MMR: randomChoice(["MMR", "NO MMR", "NO MMR", "NO MMR"]),
        _confirmNum: cidFull,
        _branch: branch.branch,
      });
      confirmNum++;
    }
  }

  return rows;
}

function bodyShopForLead(j, status) {
  // 5 body shops max - distribute evenly
  const idx = j % BODY_SHOPS.length;
  return BODY_SHOPS[idx];
}

// --- Generate TRANSLOG rows (matching CONFIRM_NUM from HLES) ---
const EVENT_TYPES = [
  { type: 0, label: "Reservation", msg: "Rez-CDP Messaging" },
  { type: 1, label: "Rental Agreement", msg: "RA-eSignerPrint Interface" },
  { type: 3, label: "EDI", msg: "Edi-Update" },
  { type: 4, label: "Location/Contact", msg: "Loc-Contact" },
];

function generateTranslogRows(hlesRows) {
  const rows = [];
  let eventId = 1800000000;

  for (const lead of hlesRows) {
    const confirmNum = lead._confirmNum;
    const numEvents = randomInt(2, 8); // 2-8 events per lead for visibility

    for (let e = 0; e < numEvents; e++) {
      const evt = randomChoice(EVENT_TYPES);
      const [weekY, weekM, weekD] = lead["Week Of"].split("-").map(Number);
      const day = weekD + e;
      const hour = 8 + randomInt(0, 10);
      const min = randomInt(0, 59);
      const sec = randomInt(0, 59);
      const systemDate = formatSystemDate(weekY, weekM, Math.min(day, 28), hour, min, sec);
      const appDate = `${systemDate.slice(0, 8)}${pad(hour)}${pad(min)}.0`;

      const msg1 = evt.msg;
      const msg2 = e === 0 ? "Initial contact" : `Event ${e + 1}`;
      const msg3 = e === numEvents - 1 && lead.RENT_IND === 1 ? "Converted" : "";

      rows.push({
        ID: eventId++,
        Knum: lead.KNUM,
        CSPLIT_REC: 0,
        TSD_NUM: 0,
        INVOICE: "",
        LocCode: String(randomInt(100, 9999)),
        SystemDate: systemDate,
        ApplicationDate: appDate,
        EventType: evt.type,
        BGN01: String(randomInt(1, 100)),
        SF_TRANS: "",
        STAT_FLAG: "",
        EXT: "",
        MSG1: msg1,
        MSG2: msg2,
        MSG3: msg3,
        MSG4: "",
        MSG5: "",
        MSG6: "",
        MSG7: "",
        MSG8: "",
        MSG9: "",
        MSG10: "",
        REQUESTED_DAYS: 0,
        OFOUR_FROM: "",
        OFOUR_TO: "",
        CONFIRM_NUM: confirmNum,
        TIMEZONE: "1",
        EMP_CODE: `EMP_${pad(randomInt(1, 100), 4)}`,
        EMP_LNAME: "EMP",
        EMP_FNAME: "EMP",
        FIELD_CHANGED: "",
        REZ_NUM: "",
        csplitid: 0,
      });
    }
  }

  return rows;
}

// --- Add edge cases (mismatch, no contact, GM directive, archived) ---
function addEdgeCases(rows) {
  const edgeCases = [
    { type: "mismatch", count: 5 },
    { type: "no_contact", count: 8 },
    { type: "gm_directive", count: 4 },
    { type: "archived", count: 3 },
  ];

  let idx = 0;
  for (const { type, count } of edgeCases) {
    for (let i = 0; i < count; i++) {
      const r = rows[idx % rows.length];
      if (type === "no_contact") {
        r.CONTACT_GROUP = "NO CONTACT";
        r["New Contact Group"] = "NO CONTACT";
        r["CONTACT RANGE"] = "NO CONTACT";
        r.DT_FROM_ALPHA1 = "";
        r.DAY_DIF = "";
        r.HRS_DIF = "";
        r.MIN_DIF = "";
      } else if (type === "gm_directive") {
        r._gmDirective = "Follow up with customer by end of week";
      } else if (type === "archived") {
        r._archived = true;
      }
      idx++;
    }
  }
  return rows;
}

// --- CSV helpers ---
function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(path, headers, rows) {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  writeFileSync(path, lines.join("\n"), "utf8");
  console.log(`Wrote ${path} (${rows.length} rows)`);
}

// --- Main ---
const hlesHeaders = [
  "CONFIRM_NUM", "RENTER_LAST", "CLAIM", "CDP", "CDP NAME", "Week Of", "INIT_DATE", "HTZREGION", "SET_STATE", "ZONE",
  "AREA_MGR", "GENERAL_MGR", "RENT_LOC", "RES_ID", "RENT_IND", "CANCEL_ID", "UNUSED_IND", "CONTACT_GROUP", "New Contact Group", "CONTACT RANGE",
  "ADJ LNAME", "ADJ FNAME", "BODY SHOP", "CODE", "KNUM", "MONTH", "ZIP", "CANCEL REASON", "INIT_DT_FINAL", "DT_FROM_ALPHA1",
  "DAY_DIF", "HRS_DIF", "MIN_DIF", "MMR",
];

const translogHeaders = [
  "ID", "Knum", "CSPLIT_REC", "TSD_NUM", "INVOICE", "LocCode", "SystemDate", "ApplicationDate", "EventType",
  "BGN01", "SF_TRANS", "STAT_FLAG", "EXT", "MSG1", "MSG2", "MSG3", "MSG4", "MSG5", "MSG6", "MSG7", "MSG8", "MSG9", "MSG10",
  "REQUESTED_DAYS", "OFOUR_FROM", "OFOUR_TO", "CONFIRM_NUM", "TIMEZONE", "EMP_CODE", "EMP_LNAME", "EMP_FNAME", "FIELD_CHANGED", "REZ_NUM", "csplitid",
];

let hlesRows = generateHlesRows();
hlesRows = addEdgeCases(hlesRows);

// Filter out internal keys for CSV
const hlesForCsv = hlesRows.map(({ _confirmNum, _branch, _gmDirective, _archived, ...r }) => r);
const translogRows = generateTranslogRows(hlesRows);
const translogForCsv = translogRows.map(({ ...r }) => r);

// Write to standard filenames (replace existing samples)
writeCsv(join(DOCS, "hles_sample_500_2026.csv"), hlesHeaders, hlesForCsv);
writeCsv(join(DOCS, "translog_sample_5000_2026.csv"), translogHeaders, translogForCsv);

console.log(`\nGenerated ${hlesRows.length} HLES leads (${BRANCHES.length} branches × 50 leads)`);
console.log(`Generated ${translogRows.length} TRANSLOG events`);
console.log(`\n500 leads across 10 branches (Eastern, Southern) — matches seed org_mapping for BM/GM views`);

// Diagnostic: week distribution
const weekCounts = {};
for (const r of hlesRows) { weekCounts[r["Week Of"]] = (weekCounts[r["Week Of"]] || 0) + 1; }
console.log("\nWeek distribution:");
for (const [w, c] of Object.entries(weekCounts).sort()) console.log(`  ${w}: ${c} leads`);

// Diagnostic: branch distribution for Santa Monica (BM demo user)
const smLeads = hlesRows.filter(r => r._branch === "Santa Monica");
const smThisWeek = smLeads.filter(r => r["Week Of"] === "2026-02-16");
console.log(`\nSanta Monica (BM view): ${smLeads.length} total, ${smThisWeek.length} in "this week" (Feb 16)`);

// Diagnostic: verify INIT_DT_FINAL format
const sampleInit = hlesRows[0].INIT_DT_FINAL;
console.log(`\nINIT_DT_FINAL sample: "${sampleInit}" (${sampleInit.length} chars, date-only: ${/^\d{4}-\d{2}-\d{2}$/.test(sampleInit)})`);
