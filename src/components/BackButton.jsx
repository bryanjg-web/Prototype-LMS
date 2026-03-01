/**
 * Consistent back chevron button used across drill-down and separate pages.
 * Enables users to return to the previous page they came from.
 */
export default function BackButton({ onClick, label, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm text-[var(--neutral-600)] hover:text-[var(--hertz-black)] mb-4 inline-flex items-center gap-1.5 cursor-pointer transition-colors ${className}`}
      aria-label={label || "Go back"}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
