import { useData } from "../../context/DataContext";
import { formatDate, formatTime } from "../../utils/dateTime";

/** Format an ISO timestamp for display in PST (e.g. "Feb 26, 2026 at 2:32 PM PST") */
function formatDataTimestamp(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${formatDate(d)} at ${formatTime(d)} PST`;
  } catch {
    return dateStr;
  }
}

/**
 * Fixed banner at top of every page showing when data was last updated.
 * Reduces cognitive load by surfacing this critical context consistently.
 */
export default function DataBanner() {
  const { dataAsOfDate } = useData();

  if (!dataAsOfDate) return null;

  return (
    <div
      className="shrink-0 flex items-center justify-center gap-2 py-1.5 px-4 bg-blue-50 border-2 border-blue-300 text-sm text-blue-700"
      role="status"
      aria-live="polite"
    >
      <svg className="w-4 h-4 text-blue-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="font-medium">Data last updated {formatDataTimestamp(dataAsOfDate)}</span>
    </div>
  );
}
