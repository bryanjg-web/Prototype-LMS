/**
 * GroupBySelector — Primary and secondary group-by dropdowns for conversion breakdown.
 * Options: None, Status, Insurance Company, Body Shop.
 */
const GROUP_OPTIONS = [
  { value: "", label: "None" },
  { value: "status", label: "Status" },
  { value: "insurance_company", label: "Insurance Company" },
  { value: "body_shop", label: "Body Shop" },
];

export default function GroupBySelector({
  primary,
  secondary,
  onPrimaryChange,
  onSecondaryChange,
  disabled = false,
  className = "",
}) {
  const secondaryOptions = GROUP_OPTIONS.filter((o) => o.value === "" || o.value !== primary);

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <label htmlFor="group-by-primary" className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wide">
          Group by
        </label>
        <select
          id="group-by-primary"
          value={primary ?? ""}
          onChange={(e) => onPrimaryChange(e.target.value || null)}
          disabled={disabled}
          className="border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white min-w-[160px] focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)] focus:border-[var(--hertz-black)] disabled:opacity-60"
        >
          {GROUP_OPTIONS.map((o) => (
            <option key={o.value || "none"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {primary && (
        <div className="flex items-center gap-2">
          <label htmlFor="group-by-secondary" className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wide">
            Then by
          </label>
          <select
            id="group-by-secondary"
            value={secondary ?? ""}
            onChange={(e) => onSecondaryChange(e.target.value || null)}
            disabled={disabled}
            className="border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white min-w-[160px] focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)] focus:border-[var(--hertz-black)] disabled:opacity-60"
          >
            {secondaryOptions.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
