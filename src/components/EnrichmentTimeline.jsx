import { motion } from "framer-motion";

const roleStyles = {
  bm: { color: "#2E7D32", bg: "bg-green-50", border: "border-green-200", label: "BM" },
  gm: { color: "#F5C400", bg: "bg-yellow-50", border: "border-yellow-200", label: "GM" },
};

export default function EnrichmentTimeline({ entries = [] }) {
  if (entries.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-[#6E6E6E] uppercase tracking-wide mb-2">
          Comment History
        </h3>
        <p className="text-sm text-[#6E6E6E] italic">No comment history yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-[#6E6E6E] uppercase tracking-wide mb-3">
        Comment History
      </h3>
      <div className="space-y-0">
        {entries.map((entry, i) => {
          const style = roleStyles[entry.role] || roleStyles.bm;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-3 items-start"
            >
              {/* Timeline rail */}
              <div className="flex flex-col items-center">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: style.color }}
                />
                {i < entries.length - 1 && <div className="w-px flex-1 min-h-6 bg-[#E6E6E6]" />}
              </div>

              {/* Entry card */}
              <div className={`flex-1 mb-3 rounded border px-3 py-2 ${style.bg} ${style.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: style.color }}
                  >
                    {style.label}
                  </span>
                  <span className="text-xs font-medium text-[#1A1A1A]">{entry.author}</span>
                  <span className="text-xs text-[#6E6E6E] ml-auto">{entry.time}</span>
                </div>
                <p className="text-xs font-medium text-[#6E6E6E] mb-0.5">{entry.action}</p>
                {entry.notes && (
                  <p className="text-sm text-[#1A1A1A] leading-relaxed">{entry.notes}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
