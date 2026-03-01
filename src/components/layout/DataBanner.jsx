import { useData } from "../../context/DataContext";

/** Format data-as-of date for display (e.g. "2026-02-26" → "Feb 26, 2026") */
function formatDataAsOfDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
      <span className="font-medium">Data last updated on {formatDataAsOfDate(dataAsOfDate)}</span>
    </div>
  );
}
