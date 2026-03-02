import { useState } from "react";
import { motion } from "framer-motion";
import { formatTranslogTimestamp } from "../utils/dateTime";

const typeColors = {
  system: "#6E6E6E",
  contact: "#FFD100",
  enrichment: "#2E7D32",
  translog: "#6E6E6E",
};

/** Parse translog time to timestamp for sorting. Handles:
 * - "Feb 10, 9:15 AM" (display format)
 * - "20260105071232" (YYYYMMDDHHMMSS from TRANSLOG upload)
 */
function parseTimeToTs(timeStr) {
  if (!timeStr) return 0;
  try {
    // TRANSLOG upload format: YYYYMMDDHHMMSS
    const raw = String(timeStr).replace(/\D/g, "");
    if (raw.length >= 14) {
      const y = parseInt(raw.slice(0, 4), 10);
      const m = parseInt(raw.slice(4, 6), 10) - 1;
      const d = parseInt(raw.slice(6, 8), 10);
      const h = parseInt(raw.slice(8, 10), 10);
      const min = parseInt(raw.slice(10, 12), 10);
      const sec = parseInt(raw.slice(12, 14), 10);
      const date = new Date(y, m, d, h, min, sec);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    }
    const year = new Date().getFullYear();
    const d = new Date(`${timeStr}, ${year}`);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
}


function formatValue(v) {
  return v && String(v).trim() ? v : "—";
}

export default function TranslogTimeline({ events = [], enrichmentLog = [], contactActivities = [], animate = true, showHeader = true }) {
  const [expandedKey, setExpandedKey] = useState(null);

  // Merge translog (HLES), enrichment_log (user edits), and contact activities (email/SMS/call), sort by time
  // Normalize: display format uses { time, event, outcome }; upload format uses { date, type, detail }
  const translogItems = (events ?? []).map((ev) => {
    const time = ev.time ?? ev.date;
    const event = ev.event ?? ev.type ?? ev.detail ?? "—";
    const outcome = ev.outcome ?? (ev.detail && ev.detail !== event ? ev.detail : null);
    const sortTs = parseTimeToTs(time);
    return {
      ...ev,
      _time: time,
      _event: event,
      _outcome: outcome,
      _sortTs: sortTs,
      _source: "translog",
    };
  });
  const enrichmentItems = (enrichmentLog ?? []).map((ev) => ({
    ...ev,
    _sortTs: ev.timestamp ?? parseTimeToTs(ev.time) ?? 0,
    _source: "enrichment",
  }));
  const contactItems = (contactActivities ?? []).map((ev) => ({
    ...ev,
    _sortTs: ev.timestamp ?? 0,
    _source: "contact",
  }));
  const merged = [...translogItems, ...enrichmentItems, ...contactItems].sort((a, b) => b._sortTs - a._sortTs);

  return (
    <div className="space-y-3">
      {showHeader && (
        <h3 className="text-xs font-semibold text-[var(--neutral-600)] uppercase tracking-wide mb-2">
          TRANSLOG Activity
        </h3>
      )}
      {merged.length === 0 ? (
        <p className="text-sm text-[var(--color-error)] italic">No activity recorded</p>
      ) : (
        merged.map((ev, i) => {
          const key = ev._source === "contact" ? `contact-${i}-${ev.id ?? ev.timestamp}` : ev._source === "enrichment" ? `enrich-${i}-${ev.timestamp}` : `trans-${i}-${ev._time ?? ev.time ?? ev.date ?? i}`;
          const hasEnrichmentDetails = ev._source === "enrichment" && ev.previous && ev.updated;
          const hasEmailDetails = ev._source === "contact" && ev.type === "email" && ev.metadata?.subject;
          const hasDetails = hasEnrichmentDetails || hasEmailDetails;
          const isExpanded = expandedKey === key;

          return (
            <motion.div
              key={key}
              initial={animate ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-3 items-start"
            >
              <div className="flex flex-col items-center">
              <div
                className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                style={{
                  backgroundColor:
                    ev._source === "contact"
                      ? typeColors.contact
                      : ev._source === "enrichment"
                        ? typeColors.enrichment
                        : (typeColors[ev.type] || typeColors.system),
                }}
              />
                {i < merged.length - 1 && <div className="w-px h-6 bg-[var(--neutral-200)]" />}
              </div>
            <div className="min-w-0 flex-1">
              {ev._source === "contact" ? (
                <>
                  <button
                    type="button"
                    onClick={() => hasEmailDetails && setExpandedKey(isExpanded ? null : key)}
                    className={`text-left w-full ${hasEmailDetails ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
                  >
                    <p className="text-sm font-medium text-[var(--hertz-black)]">{ev.action}</p>
                    <p className="text-xs text-[var(--neutral-600)]">By {ev.author} · {ev.time}</p>
                    {hasEmailDetails && (
                      <span className="inline-block mt-1.5 text-[9px] text-[var(--neutral-600)] px-1.5 py-0.5 rounded bg-[var(--neutral-100)] border border-[var(--neutral-200)]">
                        {isExpanded ? "▼" : "▶"} Click to {isExpanded ? "collapse" : "view email"}
                      </span>
                    )}
                  </button>
                  {hasEmailDetails && isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 pl-3 border-l-2 border-amber-200 space-y-2"
                    >
                      <div className="text-xs">
                        <p className="font-medium text-[var(--neutral-600)] uppercase mb-0.5">Subject</p>
                        <p className="text-[var(--hertz-black)] mb-2">{ev.metadata.subject}</p>
                        {ev.metadata.to && (
                          <>
                            <p className="font-medium text-[var(--neutral-600)] uppercase mb-0.5">To</p>
                            <p className="text-[var(--hertz-black)] mb-2">{ev.metadata.to}</p>
                          </>
                        )}
                        <p className="font-medium text-[var(--neutral-600)] uppercase mb-0.5">Body</p>
                        <p className="text-[var(--hertz-black)] whitespace-pre-wrap">{ev.metadata.body || "—"}</p>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : ev._source === "enrichment" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => hasEnrichmentDetails && setExpandedKey(isExpanded ? null : key)}
                      className={`text-left w-full ${hasEnrichmentDetails ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
                    >
                      <p className="text-sm font-medium text-[var(--hertz-black)]">{ev.action}</p>
                      <p className="text-xs text-[var(--neutral-600)]">By {ev.author} · {ev.time}</p>
                      <div className="flex flex-col gap-1.5 mt-1">
                        <span className="inline-block w-fit text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                          Enrichment
                        </span>
                        {hasEnrichmentDetails && (
                          <span className="inline-block w-fit text-[9px] text-[var(--neutral-600)] px-1.5 py-0.5 rounded bg-[var(--neutral-100)] border border-[var(--neutral-200)]">
                            {isExpanded ? "▼" : "▶"} Click to {isExpanded ? "collapse" : "view changes"}
                          </span>
                        )}
                      </div>
                      {ev.notes && (
                        <p className="text-xs text-[var(--neutral-600)] mt-0.5 italic">{ev.notes}</p>
                      )}
                    </button>
                    {hasEnrichmentDetails && isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 pl-3 border-l-2 border-[var(--neutral-200)] space-y-2"
                      >
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <p className="font-medium text-[var(--neutral-600)] uppercase">Previous</p>
                            <p className="text-[var(--hertz-black)]">Email: {formatValue(ev.previous?.email)}</p>
                            <p className="text-[var(--hertz-black)]">Phone: {formatValue(ev.previous?.phone)}</p>
                          </div>
                          <div>
                            <p className="font-medium text-[var(--neutral-600)] uppercase">Updated</p>
                            <p className="text-[var(--hertz-black)]">Email: {formatValue(ev.updated?.email)}</p>
                            <p className="text-[var(--hertz-black)]">Phone: {formatValue(ev.updated?.phone)}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[var(--hertz-black)]">
                      {ev._event ?? ev.event}
                      {(ev._outcome ?? ev.outcome) && (
                        <span className="text-[var(--neutral-600)]"> — {ev._outcome ?? ev.outcome}</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--neutral-600)]">
                      {ev._time ? (String(ev._time).match(/^\d{14}$/) ? formatTranslogTimestamp(ev._time) : ev._time) : (ev.time ?? "—")}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
