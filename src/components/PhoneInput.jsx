/**
 * PhoneInput — country code select + number input, same as LeadContactCard.
 * Shared between lead profiles and user profile.
 */

// Country codes for phone input — sorted by length descending for parsing
const COUNTRY_CODES = [
  { code: "+1", label: "🇺🇸 +1 (US/Canada)" },
  { code: "+44", label: "🇬🇧 +44 (UK)" },
  { code: "+61", label: "🇦🇺 +61 (Australia)" },
  { code: "+49", label: "🇩🇪 +49 (Germany)" },
  { code: "+33", label: "🇫🇷 +33 (France)" },
  { code: "+81", label: "🇯🇵 +81 (Japan)" },
  { code: "+91", label: "🇮🇳 +91 (India)" },
  { code: "+86", label: "🇨🇳 +86 (China)" },
  { code: "+52", label: "🇲🇽 +52 (Mexico)" },
  { code: "+34", label: "🇪🇸 +34 (Spain)" },
  { code: "+39", label: "🇮🇹 +39 (Italy)" },
  { code: "+31", label: "🇳🇱 +31 (Netherlands)" },
  { code: "+55", label: "🇧🇷 +55 (Brazil)" },
  { code: "+27", label: "🇿🇦 +27 (South Africa)" },
  { code: "+64", label: "🇳🇿 +64 (New Zealand)" },
  { code: "+353", label: "🇮🇪 +353 (Ireland)" },
  { code: "+971", label: "🇦🇪 +971 (UAE)" },
  { code: "+65", label: "🇸🇬 +65 (Singapore)" },
  { code: "+82", label: "🇰🇷 +82 (South Korea)" },
  { code: "+48", label: "🇵🇱 +48 (Poland)" },
  { code: "+46", label: "🇸🇪 +46 (Sweden)" },
  { code: "+47", label: "🇳🇴 +47 (Norway)" },
].sort((a, b) => b.code.length - a.code.length); // longest first for parsing

export function parsePhoneE164(full) {
  if (!full?.trim()) return { countryCode: "+1", local: "" };
  const cleaned = full.replace(/\s/g, "");
  for (const { code } of COUNTRY_CODES) {
    if (cleaned.startsWith(code)) {
      return { countryCode: code, local: cleaned.slice(code.length).replace(/\D/g, "") };
    }
  }
  return { countryCode: "+1", local: cleaned.replace(/\D/g, "") };
}

export function formatPhoneE164(countryCode, local) {
  const digits = (local ?? "").replace(/\D/g, "");
  if (!digits) return countryCode || "";
  return `${countryCode}${digits}`;
}

const CODE_TO_FLAG = Object.fromEntries(
  COUNTRY_CODES.map(({ code, label }) => [code, label.match(/^\p{So}\p{So}/u)?.[0] ?? ""])
);

export function flagForCode(countryCode) {
  return CODE_TO_FLAG[countryCode] ?? "";
}

export function formatLocalDisplay(countryCode, local) {
  if (!local) return "—";
  if (countryCode === "+1" && local.length === 10) {
    return local.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
  }
  return local;
}

const SORTED_COUNTRY_CODES = [...COUNTRY_CODES].sort((a, b) => a.code.localeCompare(b.code));

export default function PhoneInput({ value, onChange, placeholder = "555 123 4567", showHint = true, showIncomplete = false }) {
  const parsed = parsePhoneE164(value ?? "");
  const countryCode = parsed.countryCode;
  const local = parsed.local;

  const handleCountryChange = (e) => {
    const code = e.target.value;
    onChange(formatPhoneE164(code, local));
  };

  const handleLocalChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
    onChange(formatPhoneE164(countryCode, digits));
  };

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={handleCountryChange}
          className={`shrink-0 min-w-[200px] border rounded px-3 py-2 text-sm bg-white focus:border-[var(--hertz-primary)] focus:outline-none ${
            showIncomplete ? "border-[var(--hertz-primary)] animate-hertz-pulse" : "border-[var(--neutral-200)]"
          }`}
          aria-label="Country code"
        >
          {SORTED_COUNTRY_CODES.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          value={local}
          onChange={handleLocalChange}
          placeholder={placeholder}
          className={`flex-1 min-w-0 border rounded px-3 py-2 text-sm bg-white focus:border-[var(--hertz-primary)] focus:outline-none ${
            showIncomplete ? "border-[var(--hertz-primary)] animate-hertz-pulse" : "border-[var(--neutral-200)]"
          }`}
          aria-label="Phone number"
        />
      </div>
      {showHint && (
        <p className="text-[10px] text-[var(--neutral-500)] mt-1">
          Select country, then enter number without spaces or dashes.
        </p>
      )}
    </div>
  );
}
