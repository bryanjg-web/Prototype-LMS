/**
 * Centralized date/time formatting — all timestamps displayed in PST (San Francisco).
 * Uses America/Los_Angeles (handles PST/PDT automatically).
 */
export const TZ_PST = "America/Los_Angeles";

const dateOpts = (opts = {}) => ({ timeZone: TZ_PST, ...opts });
const timeOpts = (opts = {}) => ({ timeZone: TZ_PST, ...opts });

/** Format date only: "Feb 22" or "Feb 22, 2026" */
export function formatDateShort(d, includeYear = false) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", dateOpts({
    month: "short",
    day: "numeric",
    ...(includeYear && { year: "numeric" }),
  }));
}

/** Format date with year: "Feb 22, 2026" */
export function formatDate(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", dateOpts({
    month: "short",
    day: "numeric",
    year: "numeric",
  }));
}

/** Format time only: "9:15 AM" */
export function formatTime(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleTimeString("en-US", timeOpts({
    hour: "numeric",
    minute: "2-digit",
  }));
}

/** Format date + time: "Feb 22, 2026, 9:15 AM" */
export function formatDateTime(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return formatDate(date) + ", " + formatTime(date);
}

/** Format date + time compact: "Feb 22, 9:15 AM" */
export function formatDateTimeShort(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", dateOpts({
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }));
}

/** Format full date + time with weekday: "Mon, Feb 22, 2026, 9:15 AM" */
export function formatDateTimeFull(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", dateOpts({
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }));
}

/** Format weekday: "Mon" or "Mon, Feb 22" or "Mon, Feb 22, 2026" */
export function formatWeekday(d, withDate = false, withYear = false) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", dateOpts({
    weekday: "short",
    ...(withDate && { month: "short", day: "numeric" }),
    ...(withYear && { year: "numeric" }),
  }));
}

/** Format month + year: "Feb '26" */
export function formatMonthYear(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", dateOpts({ month: "short", year: "2-digit" }));
}

/** Format date range: "Feb 16 – Feb 22" */
export function formatDateRange(start, end, includeYearOnEnd = false) {
  if (!start || !end) return "—";
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "—";
  const startStr = s.toLocaleDateString("en-US", dateOpts({ month: "short", day: "numeric" }));
  const endStr = e.toLocaleDateString("en-US", dateOpts({
    month: "short",
    day: "numeric",
    ...(includeYearOnEnd && { year: "numeric" }),
  }));
  return `${startStr} – ${endStr}`;
}

/** Format YYYYMMDDHHMMSS (translog upload) to display string in PST */
export function formatTranslogTimestamp(raw) {
  if (!raw) return "—";
  const str = String(raw).replace(/\D/g, "");
  if (str.length >= 14) {
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(4, 6), 10) - 1;
    const d = parseInt(str.slice(6, 8), 10);
    const h = parseInt(str.slice(8, 10), 10);
    const min = parseInt(str.slice(10, 12), 10);
    const date = new Date(y, m, d, h, min);
    if (isNaN(date.getTime())) return raw;
    return formatDateTimeShort(date);
  }
  return raw;
}

/** Format date-only string (YYYY-MM-DD) — no timezone conversion needed for calendar dates */
export function formatDateOnly(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr + "T12:00:00");
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString("en-US", dateOpts({
    month: "short",
    day: "numeric",
    year: "numeric",
  }));
}

/** Format date for HTML date input (YYYY-MM-DD) in PST */
export function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", dateOpts({ year: "numeric", month: "2-digit", day: "2-digit" }));
}
