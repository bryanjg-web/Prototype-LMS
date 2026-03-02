import { motion } from "framer-motion";

export default function MiniBarChart({ data, labels, color, label, suffix = "" }) {
  const max = Math.max(...data);
  const current = data[data.length - 1];
  const prior = data[data.length - 2];
  const delta = prior !== 0 ? Math.round(((current - prior) / prior) * 100) : 0;
  const deltaUp = delta > 0;
  const deltaFlat = delta === 0;

  return (
    <div className="border border-[var(--neutral-200)] rounded-lg p-4">
      <p className="text-xs font-bold text-[var(--chart-neutral-dark)] uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-[var(--hertz-black)]">
          {current}{suffix}
        </span>
        {!deltaFlat && (
          <span className={`text-xs font-medium ${deltaUp ? "text-[var(--color-success)]" : "text-[var(--color-error)]"}`}>
            {deltaUp ? "↑" : "↓"}{Math.abs(delta)}%
          </span>
        )}
        {deltaFlat && (
          <span className="text-xs font-medium text-[var(--chart-neutral-dark)]">—</span>
        )}
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 48 }}>
        {data.map((value, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: max > 0 ? `${(value / max) * 100}%` : "0%" }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
            className="flex-1 rounded-sm"
            style={{ backgroundColor: color, opacity: i === data.length - 1 ? 1 : 0.5 }}
          />
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 text-center text-xs text-[var(--chart-neutral-dark)]">{l}</span>
        ))}
      </div>
    </div>
  );
}
