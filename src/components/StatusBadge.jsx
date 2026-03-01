/** Semantic colors: each maps to a clear action/state
 *  Success (green) = completed, rented
 *  Error (red) = cancelled, needs attention
 *  Warning (amber) = unused, action required
 *  Neutral (grey) = reviewed, informational */
const statusStyles = {
  Cancelled: "bg-[var(--color-error-light)] text-[var(--color-error)] border border-[var(--color-error)]/40",
  Unused: "bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[var(--color-warning)]/40",
  Rented: "bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]/40",
  Reviewed: "bg-[var(--neutral-100)] text-[var(--neutral-600)] border border-[var(--neutral-200)]",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[status] || ""}`}>
      {status}
    </span>
  );
}
