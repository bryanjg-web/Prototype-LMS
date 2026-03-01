/**
 * CSV export utilities for Hertz LMS.
 * Zero-dependency — generates CSV strings and triggers browser downloads.
 */

function escapeCSV(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCSV(rows, columns) {
  const header = columns.map((c) => escapeCSV(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns.map((c) => escapeCSV(typeof c.accessor === "function" ? c.accessor(row) : row[c.key])).join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCSV(csvString, filename) {
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateSuffix() {
  return new Date().toISOString().split("T")[0];
}

// ── Leads Export ──────────────────────────────────────────────

const LEADS_COLUMNS = [
  { label: "Received Date", key: "INIT_DT_FINAL" },
  { label: "Confirmation #", key: "CONFIRM_NUM" },
  { label: "Customer", key: "RENTER_LAST" },
  { label: "CDP", key: "CDP" },
  { label: "Branch", key: "RENT_LOC" },
  { label: "Rented", key: "RENT_IND" },
  { label: "Cancelled", key: "CANCEL_ID" },
  { label: "Unused", key: "UNUSED_IND" },
  { label: "Status", key: "STATUS" },
  { label: "Cancel Reason", key: "CANCEL_REASON" },
  { label: "Comments", key: "COMMENTS" },
  { label: "Area Manager", key: "AREA_MGR" },
  { label: "General Manager", key: "GENERAL_MGR" },
  { label: "Days Open", key: "DAYS_OPEN" },
  { label: "First Contact Date", key: "DT_FROM_ALPHA1" },
  { label: "Time to Contact", key: "TIME_TO_CONTACT" },
];

export function exportLeadsToCSV(hlesRows, filename) {
  const csv = arrayToCSV(hlesRows, LEADS_COLUMNS);
  downloadCSV(csv, filename ?? `hertz_leads_${dateSuffix()}.csv`);
}

// ── Tasks Export ─────────────────────────────────────────────

const TASKS_COLUMNS = [
  { label: "Title", key: "title" },
  { label: "Lead ID", accessor: (t) => t.leadId ?? "" },
  { label: "Customer", key: "customerName" },
  { label: "Description", accessor: (t) => t.description ?? "" },
  { label: "Due Date", accessor: (t) => t.dueDate ?? "" },
  { label: "Priority", accessor: (t) => t.priority ?? "Medium" },
  { label: "Status", key: "status" },
  { label: "Created By", accessor: (t) => t.createdBy ?? "" },
  { label: "Created At", accessor: (t) => t.createdAt ?? "" },
];

export function exportTasksToCSV(tasks, leadLookup, filename) {
  const rows = tasks.map((t) => ({
    ...t,
    customerName: t.lead?.customer ?? leadLookup?.(t.leadId)?.customer ?? "",
  }));
  const csv = arrayToCSV(rows, TASKS_COLUMNS);
  downloadCSV(csv, filename ?? `hertz_tasks_${dateSuffix()}.csv`);
}

// ── Summary Export ───────────────────────────────────────────

export function exportSummaryToCSV(metrics, periodLabel, startDate, endDate, filename) {
  const columns = [
    { label: "Metric", key: "metric" },
    { label: "Value", key: "value" },
    { label: "Period", key: "period" },
    { label: "Start Date", key: "startDate" },
    { label: "End Date", key: "endDate" },
  ];
  const rows = metrics.map((m) => ({
    metric: m.label,
    value: m.value,
    period: periodLabel,
    startDate: startDate ?? "",
    endDate: endDate ?? "",
  }));
  const csv = arrayToCSV(rows, columns);
  downloadCSV(csv, filename ?? `hertz_summary_${dateSuffix()}.csv`);
}
