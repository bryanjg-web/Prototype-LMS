/**
 * GMPresentationMode — fullscreen Hertz-branded slide presenter for the GM Compliance Meeting.
 * Data is frozen at the time the user clicks "Present" — changes mid-meeting won't affect slides.
 *
 * Slides:
 *   1. Conversion by Branch   — stacked bar chart + leaderboard table
 *   2. Conversion by Insurer  — stacked bar chart + insurer table (State Farm highlighted)
 *   3. Wins & Learnings       — two-column BM submissions
 *   4. Spot Check             — live branch selector + stats + leads table
 *
 * Keyboard: ArrowLeft / ArrowRight to navigate, Escape to close.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  getConversionByBranch,
  getConversionByInsurer,
  getConversionByBodyShop,
  getStackedWeeklyByBranch,
  getWinsLearningsForGM,
  getDateRangePresets,
} from "../../selectors/demoSelectors";
import { useData } from "../../context/DataContext";
import { formatDateShort } from "../../utils/dateTime";

// ─── Design tokens (2024 Hertz Sustainability Report palette) ──────────────────
const GOLD = "#F4C300";
const BLACK = "#141618";
const RENTED_COLOR = "#2E7D32";
const CANCELLED_COLOR = "#C62828";
const UNUSED_COLOR = GOLD;
const LINE_COLOR = "#FFFFFF";

const SLIDES = [
  { id: "branch",    title: "Conversion by Branch" },
  { id: "insurer",   title: "Conversion Rate % by Insurer" },
  { id: "bodyshop",  title: "Conversion Rate % by Body Shop" },
  { id: "wins",      title: "Wins & Learnings" },
  { id: "spotcheck", title: "Spot Check: Branch Deep Dive" },
];

// ─── Shared slide components ──────────────────────────────────────────────────

function SlideHeading({ title, subtitle }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-7 rounded-full" style={{ background: GOLD }} />
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{title}</h2>
      </div>
      {subtitle && <p className="text-white/50 text-sm ml-4">{subtitle}</p>}
    </div>
  );
}

/** Proportional stacked bar chart (each bar = 100% height, divided by status %). */
function StackedBarsChart({ weeks, maxBarHeightPx = 200 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!weeks || weeks.length === 0) {
    return <p className="text-white/30 text-sm">No data for this period.</p>;
  }
  const maxTotal = Math.max(...weeks.map((w) => w.total), 1);

  return (
    <div className="flex items-end gap-5">
      {weeks.map((w, i) => {
        const barH = maxTotal > 0 ? Math.round((w.total / maxTotal) * maxBarHeightPx) : 0;
        const rentedPct = w.total > 0 ? (w.rented / w.total) * 100 : 0;
        const cancelledPct = w.total > 0 ? (w.cancelled / w.total) * 100 : 0;
        const unusedPct = w.total > 0 ? (w.unused / w.total) * 100 : 0;
        const convRate = w.total > 0 ? Math.round((w.rented / w.total) * 100) : null;

        const rentedH = (rentedPct / 100) * barH;
        const cancelledH = (cancelledPct / 100) * barH;
        const unusedH = (unusedPct / 100) * barH;

        return (
          <div
            key={i}
            className="flex flex-col items-center gap-2 flex-1 relative"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Hover tooltip */}
            {hoveredIdx === i && (
              <div
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                style={{ minWidth: 170 }}
              >
                <div className="rounded-lg px-3.5 py-3 text-xs shadow-xl border border-white/15" style={{ background: "#1E2023" }}>
                  <p className="text-white font-bold mb-2">{w.label}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: RENTED_COLOR }} />
                        <span className="text-white/60">Rented</span>
                      </span>
                      <span className="text-white font-semibold">{w.rented} <span className="text-white/40 font-normal">({Math.round(rentedPct)}%)</span></span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: CANCELLED_COLOR }} />
                        <span className="text-white/60">Cancelled</span>
                      </span>
                      <span className="text-white font-semibold">{w.cancelled} <span className="text-white/40 font-normal">({Math.round(cancelledPct)}%)</span></span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: UNUSED_COLOR }} />
                        <span className="text-white/60">Unused</span>
                      </span>
                      <span className="text-white font-semibold">{w.unused} <span className="text-white/40 font-normal">({Math.round(unusedPct)}%)</span></span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-white/60">Conversion Rate</span>
                    <span className="text-white font-bold">{convRate !== null ? `${convRate}%` : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Total Leads</span>
                    <span className="text-white font-bold">{w.total}</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-2.5 h-2.5 rotate-45 -mt-[5px] border-r border-b border-white/15" style={{ background: "#1E2023" }} />
                </div>
              </div>
            )}

            <span className="text-white/50 text-xs font-semibold">{w.total}</span>
            <div
              className={`w-full rounded-sm overflow-hidden flex flex-col-reverse transition-opacity duration-150 ${hoveredIdx !== null && hoveredIdx !== i ? "opacity-40" : ""}`}
              style={{ height: barH, minHeight: 8, background: "rgba(255,255,255,0.05)" }}
            >
              <div className="relative flex items-center justify-center" style={{ height: `${rentedPct}%`, background: RENTED_COLOR, opacity: 0.9 }}>
                {w.rented > 0 && rentedH > 18 && (
                  <span className="text-white text-[10px] font-bold">{w.rented}</span>
                )}
              </div>
              <div className="relative flex items-center justify-center" style={{ height: `${cancelledPct}%`, background: CANCELLED_COLOR, opacity: 0.85 }}>
                {w.cancelled > 0 && cancelledH > 18 && (
                  <span className="text-white text-[10px] font-bold">{w.cancelled}</span>
                )}
              </div>
              <div className="relative flex items-center justify-center" style={{ height: `${unusedPct}%`, background: UNUSED_COLOR, opacity: 0.8 }}>
                {w.unused > 0 && unusedH > 18 && (
                  <span className="text-[#141618] text-[10px] font-bold">{w.unused}</span>
                )}
              </div>
            </div>
            <span className="text-white/40 text-xs text-center leading-tight">{w.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal stacked bar chart — one bar per insurer, conversion rate% centered on the bar, clickable. */
function InsurerStackedBarChart({ data, onInsurerClick }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const items = (data ?? []).slice(0, 8);
  const maxTotal = Math.max(...items.map((d) => d.total), 1);

  if (items.length === 0) {
    return <p className="text-white/30 text-sm">No insurer data for this period.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((d, i) => {
        const rentedW = (d.rented / maxTotal) * 100;
        const cancelledW = (d.cancelled / maxTotal) * 100;
        const unusedW = (d.unused / maxTotal) * 100;
        const isStateFarm = d.insurer === "State Farm";
        const convText = d.conversionRate !== null ? `${d.conversionRate}%` : "—";
        const rentedPct = d.total ? Math.round((d.rented / d.total) * 100) : 0;
        const cancelledPct = d.total ? Math.round((d.cancelled / d.total) * 100) : 0;
        const unusedPct = d.total ? Math.round((d.unused / d.total) * 100) : 0;

        return (
          <div
            key={d.insurer}
            className="flex items-center gap-3 relative cursor-pointer group"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => onInsurerClick?.(d.insurer)}
          >
            {hoveredIdx === i && (
              <div
                className="absolute -top-2 -translate-y-full left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                style={{ minWidth: 200 }}
              >
                <div className="rounded-lg px-3.5 py-3 text-xs shadow-xl border border-white/15" style={{ background: "#1E2023" }}>
                  <p className="text-white font-bold mb-2">{d.insurer}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: RENTED_COLOR }} />
                        <span className="text-white/60">Rented</span>
                      </span>
                      <span className="text-white font-semibold">
                        {d.rented} <span className="text-white/40 font-normal">({d.total ? Math.round((d.rented / d.total) * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: CANCELLED_COLOR }} />
                        <span className="text-white/60">Cancelled</span>
                      </span>
                      <span className="text-white font-semibold">
                        {d.cancelled} <span className="text-white/40 font-normal">({d.total ? Math.round((d.cancelled / d.total) * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: UNUSED_COLOR }} />
                        <span className="text-white/60">Unused</span>
                      </span>
                      <span className="text-white font-semibold">
                        {d.unused} <span className="text-white/40 font-normal">({d.total ? Math.round((d.unused / d.total) * 100) : 0}%)</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-white/60">Conversion Rate</span>
                    <span className="text-white font-bold">{convText}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Total Leads</span>
                    <span className="text-white font-bold">{d.total}</span>
                  </div>
                  <p className="text-white/30 text-[10px] mt-2 text-center">Click to view leads</p>
                </div>
                <div className="flex justify-center">
                  <div className="w-2.5 h-2.5 rotate-45 -mt-[5px] border-r border-b border-white/15" style={{ background: "#1E2023" }} />
                </div>
              </div>
            )}

            <span
              className={`text-xs font-semibold w-28 text-right shrink-0 truncate ${isStateFarm ? "text-[#F4C300]" : "text-white/70"}`}
            >
              {d.insurer}
            </span>

            <div className="flex-1">
              <div
                className={`relative h-9 rounded overflow-hidden transition-opacity duration-150 ${hoveredIdx !== null && hoveredIdx !== i ? "opacity-45" : ""}`}
                style={{ background: "rgba(255,255,255,0.05)" }}
                title={`${d.insurer}: ${d.total} leads, ${convText} conversion`}
              >
                <div className="absolute inset-0 flex items-center gap-px">
                  <div style={{ width: `${rentedW}%`, height: "100%", background: RENTED_COLOR, opacity: 0.9 }} />
                  <div style={{ width: `${cancelledW}%`, height: "100%", background: CANCELLED_COLOR, opacity: 0.85 }} />
                  <div style={{ width: `${unusedW}%`, height: "100%", background: UNUSED_COLOR, opacity: 0.8 }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span
                    className={`text-[11px] font-bold ${isStateFarm ? "text-[#F4C300]" : "text-white"}`}
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55)" }}
                  >
                    {convText}
                  </span>
                </div>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-white/50 w-10 shrink-0 text-right">{d.total}</span>
          </div>
        );
      })}
    </div>
  );
}

function DeltaTag({ delta }) {
  if (delta === null || delta === undefined) return <span className="text-white/30 text-xs">—</span>;
  const isUp = delta > 0;
  const isDown = delta < 0;
  return (
    <span
      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
        isUp ? "bg-[#2E7D32]/20 text-[#2E7D32]" : isDown ? "bg-[#C62828]/20 text-[#C62828]" : "bg-white/10 text-white/50"
      }`}
    >
      {isUp ? "↑" : isDown ? "↓" : "—"}
      {delta !== 0 ? `${Math.abs(delta)}%` : ""}
    </span>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ChartLegend({ showLine = true }) {
  return (
    <div className="flex items-center gap-4 mt-2 mb-3">
      {[
        { color: RENTED_COLOR,   label: "Rented" },
        { color: CANCELLED_COLOR, label: "Cancelled" },
        { color: UNUSED_COLOR,   label: "Unused" },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
          <span className="text-white/40 text-xs">{label}</span>
        </div>
      ))}
      {showLine && (
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-4 h-0.5 rounded-full" style={{ background: LINE_COLOR }} />
          <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: LINE_COLOR }} />
          <span className="text-white/40 text-xs">Conv. Rate %</span>
        </div>
      )}
    </div>
  );
}

/** Combo chart: stacked bars for lead statuses + conversion rate line (secondary axis). */
function CombinedStackedBarLineChart({ items, height = 600, maxBars = 10, onBarClick }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);
  const [hoveredBarIdx, setHoveredBarIdx] = useState(null);
  const [hoveredDotIdx, setHoveredDotIdx] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => setContainerW(containerRef.current.offsetWidth);
    measure();
    const obs = new ResizeObserver(() => measure());
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const data = (items ?? []).slice(0, maxBars);
  if (data.length === 0) {
    return <div ref={containerRef}><p className="text-white/30 text-sm">No data for this period.</p></div>;
  }

  const svgW = containerW || 600;
  const padding = { top: 24, right: 12, bottom: 130, left: 38 };
  const chartH = height - padding.top - padding.bottom;
  const chartW = svgW - padding.left - padding.right;
  const barWidth = Math.min(52, Math.floor((chartW / data.length) * 0.55));
  const maxTotal = Math.max(...data.map((d) => d.total ?? 0), 1);

  const xStep = data.length > 1 ? chartW / data.length : chartW;
  const xFor = (i) => padding.left + i * xStep + xStep / 2;
  const yForPct = (v) => padding.top + chartH - (v / 100) * chartH;

  const linePoints = data
    .map((d, i) => (d.conversionRate === null ? null : { x: xFor(i), y: yForPct(d.conversionRate), label: d.conversionRate, idx: i }))
    .filter(Boolean);

  const linePath =
    linePoints.length < 2
      ? ""
      : linePoints
          .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`)
          .join(" ");

  const activeHover = hoveredBarIdx ?? hoveredDotIdx;

  return (
    <div className="relative" ref={containerRef}>
      {containerW > 0 && (
      <svg width={svgW} height={height} className="overflow-visible">
        {/* Grid lines */}
        <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={padding.left + chartW}
              y1={yForPct(tick)}
              y2={yForPct(tick)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
            <text x={padding.left - 6} y={yForPct(tick) + 4} fill="rgba(255,255,255,0.4)" fontSize="12" textAnchor="end">
              {tick}%
            </text>
          </g>
        ))}

        {/* Bars with data labels */}
        {data.map((d, i) => {
          const x = xFor(i) - barWidth / 2;
          const rentedH = (d.rented / maxTotal) * chartH;
          const cancelledH = (d.cancelled / maxTotal) * chartH;
          const unusedH = (d.unused / maxTotal) * chartH;
          const yRented = padding.top + chartH - rentedH;
          const yCancelled = yRented - cancelledH;
          const yUnused = yCancelled - unusedH;
          const isHovered = activeHover === i;
          const isDimmed = activeHover !== null && !isHovered;
          return (
            <g
              key={d.branch ?? d.insurer ?? i}
              opacity={isDimmed ? 0.3 : 1}
              style={{ transition: "opacity 0.15s", cursor: onBarClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredBarIdx(i)}
              onMouseLeave={() => setHoveredBarIdx(null)}
              onClick={() => onBarClick?.(d.branch ?? d.insurer)}
            >
              <rect x={x - 4} y={padding.top} width={barWidth + 8} height={chartH + padding.bottom} fill="transparent" />
              <rect x={x} y={yRented} width={barWidth} height={rentedH} fill={RENTED_COLOR} opacity="0.9" rx="2" />
              <rect x={x} y={yCancelled} width={barWidth} height={cancelledH} fill={CANCELLED_COLOR} opacity="0.85" rx="2" />
              <rect x={x} y={yUnused} width={barWidth} height={unusedH} fill={UNUSED_COLOR} opacity="0.8" rx="2" />
              <text x={x + barWidth / 2} y={yUnused - 8} fill="rgba(255,255,255,0.6)" fontSize="13" fontWeight="700" textAnchor="middle" style={{ pointerEvents: "none" }}>
                {d.total}
              </text>
              <text
                x={x + barWidth / 2}
                y={padding.top + chartH + 14}
                fill="rgba(255,255,255,0.75)"
                fontSize="13"
                fontWeight="600"
                textAnchor="end"
                transform={`rotate(-35, ${x + barWidth / 2}, ${padding.top + chartH + 14})`}
                style={{ pointerEvents: "none" }}
              >
                {d.branch ?? d.insurer ?? ""}
              </text>
            </g>
          );
        })}

        {/* Conversion rate line (grey) */}
        {linePoints.length > 1 && (
          <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth="2" strokeOpacity="0.9" />
        )}
        {linePoints.map((p, lpIdx) => {
          const isActive = hoveredDotIdx === p.idx;
          return (
            <g
              key={lpIdx}
              onMouseEnter={() => { setHoveredDotIdx(p.idx); setHoveredBarIdx(null); }}
              onMouseLeave={() => setHoveredDotIdx(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={isActive ? 6 : 4} fill={isActive ? "white" : LINE_COLOR} stroke="#0F0F0F" strokeWidth="1.5" style={{ transition: "r 0.15s" }} />
              <text x={p.x} y={p.y - 10} fill={LINE_COLOR} fontSize="12" fontWeight="700" textAnchor="middle" style={{ pointerEvents: "none" }}>
                {p.label}%
              </text>
            </g>
          );
        })}
      </svg>
      )}

      {/* Bar hover tooltip */}
      {hoveredBarIdx !== null && data[hoveredBarIdx] && (() => {
        const d = data[hoveredBarIdx];
        const rentedPct = d.total ? Math.round((d.rented / d.total) * 100) : 0;
        const cancelledPct = d.total ? Math.round((d.cancelled / d.total) * 100) : 0;
        const unusedPct = d.total ? Math.round((d.unused / d.total) * 100) : 0;
        const convText = d.conversionRate !== null ? `${d.conversionRate}%` : "—";
        const tooltipX = (xFor(hoveredBarIdx) / svgW) * 100;
        return (
          <div
            className="absolute z-30 pointer-events-none"
            style={{ left: `${tooltipX}%`, top: 0, transform: "translateX(-50%)" }}
          >
            <div className="rounded-lg px-4 py-3 text-xs shadow-xl border border-white/15" style={{ background: "#1E2023", minWidth: 180 }}>
              <p className="text-white font-bold mb-2">{d.branch ?? d.insurer ?? ""}</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm inline-block" style={{ background: RENTED_COLOR }} />
                    <span className="text-white/60">Rented</span>
                  </span>
                  <span className="text-white font-semibold">{d.rented} <span className="text-white/40 font-normal">({rentedPct}%)</span></span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm inline-block" style={{ background: CANCELLED_COLOR }} />
                    <span className="text-white/60">Cancelled</span>
                  </span>
                  <span className="text-white font-semibold">{d.cancelled} <span className="text-white/40 font-normal">({cancelledPct}%)</span></span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm inline-block" style={{ background: UNUSED_COLOR }} />
                    <span className="text-white/60">Unused</span>
                  </span>
                  <span className="text-white font-semibold">{d.unused} <span className="text-white/40 font-normal">({unusedPct}%)</span></span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-white/60">Conversion Rate</span>
                <span className="text-white font-bold">{convText}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total Leads</span>
                <span className="text-white font-bold">{d.total}</span>
              </div>
              {onBarClick && <p className="text-white/30 text-[10px] mt-2 text-center">Click to view leads</p>}
            </div>
            <div className="flex justify-center">
              <div className="w-2.5 h-2.5 rotate-45 -mt-[5px] border-r border-b border-white/15" style={{ background: "#1E2023" }} />
            </div>
          </div>
        );
      })()}

      {/* Line dot hover tooltip */}
      {hoveredDotIdx !== null && data[hoveredDotIdx] && (() => {
        const d = data[hoveredDotIdx];
        const convText = d.conversionRate !== null ? `${d.conversionRate}%` : "—";
        const tooltipX = (xFor(hoveredDotIdx) / svgW) * 100;
        const dotY = yForPct(d.conversionRate ?? 0);
        const tooltipYPct = (dotY / height) * 100;
        return (
          <div
            className="absolute z-30 pointer-events-none"
            style={{ left: `${tooltipX}%`, top: `${tooltipYPct}%`, transform: "translate(-50%, -100%)" }}
          >
            <div className="rounded-lg px-4 py-3 text-xs shadow-xl border border-white/15 mb-3" style={{ background: "#1E2023", minWidth: 170 }}>
              <p className="text-white font-bold mb-2">{d.branch ?? d.insurer ?? ""}</p>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/60">Conversion Rate</span>
                <span className="text-white font-bold text-sm">{convText}</span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-1">
                <span className="text-white/60">Rented / Total</span>
                <span className="text-white font-semibold">{d.rented} / {d.total}</span>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-2.5 h-2.5 rotate-45 -mt-[17px] border-r border-b border-white/15" style={{ background: "#1E2023" }} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Slide 1: Conversion by Branch ───────────────────────────────────────────

const BRANCH_SORT_COLUMNS = [
  { key: "rank",           label: "#",                  align: "left",   getValue: (r) => r.rank },
  { key: "branch",         label: "Branch",             align: "left",   getValue: (r) => (r.branch ?? "").toLowerCase() },
  { key: "bmName",         label: "BM",                 align: "left",   getValue: (r) => (r.bmName ?? "").toLowerCase() },
  { key: "conversionRate", label: "Conversion Rate %",  align: "center", getValue: (r) => r.conversionRate ?? -1 },
  { key: "total",          label: "Leads",              align: "center", getValue: (r) => r.total ?? 0 },
  { key: "unused",         label: "Unused Leads",       align: "center", getValue: (r) => r.unused ?? 0 },
  { key: "delta",          label: "vs Prior Period",    align: "center", getValue: (r) => r.delta ?? -Infinity },
];

const INSURER_SORT_COLUMNS = [
  { key: "rank",           label: "#",                  align: "left",   getValue: (r) => r._rank ?? 0 },
  { key: "insurer",        label: "Insurer",            align: "left",   getValue: (r) => (r.insurer ?? "").toLowerCase() },
  { key: "conversionRate", label: "Conversion Rate %",  align: "center", getValue: (r) => r.conversionRate ?? -1 },
  { key: "total",          label: "Leads",              align: "center", getValue: (r) => r.total ?? 0 },
  { key: "unused",         label: "Unused Leads",       align: "center", getValue: (r) => r.unused ?? 0 },
  { key: "delta",          label: "vs Prior Period",    align: "center", getValue: (r) => r.delta ?? -Infinity },
];

const BRANCH_DETAIL_SORT_COLUMNS = [
  { key: "customer",  label: "Customer",  align: "left", getValue: (r) => (r.customer ?? "").toLowerCase() },
  { key: "status",    label: "Status",    align: "left", getValue: (r) => r.status ?? "" },
  { key: "insurer",   label: "Insurer",   align: "left", getValue: (r) => (r.insuranceCompany ?? "").toLowerCase() },
  { key: "notes",     label: "BM Notes",  align: "left", getValue: (r) => (r.enrichment?.reason || r.enrichment?.notes || r.hlesReason || "").toLowerCase() },
  { key: "daysOpen",  label: "Days Open", align: "left", getValue: (r) => r.daysOpen ?? 0 },
];

const INSURER_DETAIL_SORT_COLUMNS = [
  { key: "customer",  label: "Customer",  align: "left", getValue: (r) => (r.customer ?? "").toLowerCase() },
  { key: "branch",    label: "Branch",    align: "left", getValue: (r) => (r.branch ?? "").toLowerCase() },
  { key: "status",    label: "Status",    align: "left", getValue: (r) => r.status ?? "" },
  { key: "notes",     label: "BM Notes",  align: "left", getValue: (r) => (r.enrichment?.reason || r.enrichment?.notes || r.hlesReason || "").toLowerCase() },
  { key: "daysOpen",  label: "Days Open", align: "left", getValue: (r) => r.daysOpen ?? 0 },
];

const SPOT_CHECK_SORT_COLUMNS = [
  { key: "reservationId", label: "Res #",    align: "left",   getValue: (r) => (r.reservationId ?? r.confirmNum ?? "").toLowerCase() },
  { key: "customer",  label: "Customer",  align: "left",   getValue: (r) => (r.customer ?? "").toLowerCase() },
  { key: "status",    label: "Status",    align: "center", getValue: (r) => r.status ?? "" },
  { key: "notes",     label: "BM Notes",  align: "left",   getValue: (r) => (r.enrichment?.reason || r.enrichment?.notes || r.hlesReason || "").toLowerCase() },
  { key: "daysOpen",  label: "Days Open", align: "center", getValue: (r) => r.daysOpen ?? 0 },
];

function SortArrow({ active, direction }) {
  return (
    <span className={`inline-flex flex-col ml-1 leading-none ${active ? "text-[#F4C300]" : "text-white/20"}`}>
      <svg className="w-2.5 h-2.5" viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 0L10 6H0z" opacity={active && direction === "asc" ? 1 : 0.3} />
      </svg>
      <svg className="w-2.5 h-2.5 -mt-0.5" viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 6L0 0h10z" opacity={active && direction === "desc" ? 1 : 0.3} />
      </svg>
    </span>
  );
}

function BranchLeadDetailPanel({ branch, leads, leaderboardRow, onBack }) {
  const [sortCol, setSortCol] = useState("status");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = useCallback((colKey) => {
    if (colKey === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("desc");
    }
  }, [sortCol]);

  const filteredRaw = useMemo(
    () => (leads ?? []).filter((l) => l.branch === branch),
    [leads, branch]
  );

  const filtered = useMemo(() => {
    const col = BRANCH_DETAIL_SORT_COLUMNS.find((c) => c.key === sortCol);
    if (!col) return filteredRaw;
    return [...filteredRaw].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filteredRaw, sortCol, sortDir]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const rented = filtered.filter((l) => l.status === "Rented").length;
    const cancelled = filtered.filter((l) => l.status === "Cancelled").length;
    const unused = filtered.filter((l) => l.status === "Unused").length;
    const convRate = total > 0 ? Math.round((rented / total) * 100) : null;
    return { total, rented, cancelled, unused, convRate };
  }, [filtered]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-5 group transition-colors"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all branches
      </button>

      <SlideHeading
        title={branch}
        subtitle={`${stats.total} leads — ${stats.convRate !== null ? `${stats.convRate}% conversion rate` : "No data"}${leaderboardRow?.bmName ? ` — BM: ${leaderboardRow.bmName}` : ""}`}
      />

      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Leads", value: stats.total, color: "text-white" },
          { label: "Rented", value: stats.rented, color: "text-[#2E7D32]" },
          { label: "Cancelled", value: stats.cancelled, color: "text-[#C62828]" },
          { label: "Unused", value: stats.unused, color: "text-[#F4C300]" },
          { label: "Conversion Rate", value: stats.convRate !== null ? `${stats.convRate}%` : "—", color: "text-white" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ background: BLACK }}>
            <tr className="border-b border-white/10">
              {BRANCH_DETAIL_SORT_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left text-white/30 text-xs font-semibold uppercase tracking-wider pb-2 pr-3 cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap"
                >
                  {col.label}
                  <SortArrow active={sortCol === col.key} direction={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-white/30 text-sm py-6 text-center">No leads for this branch.</td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const notes = lead.enrichment?.reason || lead.enrichment?.notes || lead.hlesReason || null;
                return (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-3 text-white font-medium truncate max-w-[160px]">{lead.customer}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          lead.status === "Rented"
                            ? "bg-[#2E7D32]/20 text-[#2E7D32]"
                            : lead.status === "Cancelled"
                            ? "bg-[#C62828]/20 text-[#C62828]"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-white/60 text-xs truncate max-w-[120px]">{lead.insuranceCompany ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-white/50 text-xs truncate max-w-[200px]">
                      {notes ?? <span className="text-white/20 italic">No notes</span>}
                    </td>
                    <td className="py-2.5 text-white/50 text-xs">{lead.daysOpen ?? "—"}d</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function SlideBranch({ frozenLeads, dateRange, compRange, gmName, onBranchClick }) {
  const leaderboardRaw = useMemo(
    () => getConversionByBranch(frozenLeads, dateRange, compRange, gmName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [sortCol, setSortCol] = useState("conversionRate");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedBranch, setSelectedBranch] = useState(null);

  const CHROME_PX = 280;
  const contentHeight = Math.max(320, (typeof window !== "undefined" ? window.innerHeight : 900) - CHROME_PX);

  const handleSort = useCallback((colKey) => {
    if (colKey === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("desc");
    }
  }, [sortCol]);

  const leaderboard = useMemo(() => {
    const col = BRANCH_SORT_COLUMNS.find((c) => c.key === sortCol);
    if (!col) return leaderboardRaw;
    return [...leaderboardRaw].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [leaderboardRaw, sortCol, sortDir]);

  const handleBranchSelect = useCallback((branch) => {
    setSelectedBranch(branch);
  }, []);

  if (selectedBranch) {
    const row = leaderboardRaw.find((r) => r.branch === selectedBranch);
    return (
      <BranchLeadDetailPanel
        branch={selectedBranch}
        leads={frozenLeads}
        leaderboardRow={row}
        onBack={() => setSelectedBranch(null)}
      />
    );
  }

  return (
    <div>
      <SlideHeading title="Conversion by Branch" subtitle="Click any branch in the chart or table to view leads" />
      <div className="grid grid-cols-2 gap-8" style={{ alignItems: "start" }}>
        {/* Chart (left, 50%) */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Conversion Rate % by Branch</p>
          <ChartLegend />
          <CombinedStackedBarLineChart
            items={leaderboard.map((row) => ({
              branch: row.branch,
              total: row.total,
              rented: row.rented,
              cancelled: row.cancelled,
              unused: row.unused,
              conversionRate: row.conversionRate,
            }))}
            height={contentHeight}
            onBarClick={handleBranchSelect}
          />
        </div>

        {/* Leaderboard table (right, 50%) */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Branch Ranking</p>
          <div className="overflow-y-auto" style={{ maxHeight: contentHeight }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: BLACK }}>
                <tr className="border-b border-white/10">
                  {BRANCH_SORT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`text-${col.align} text-white/30 text-xs font-semibold uppercase tracking-wider pb-2.5 pr-3 cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap`}
                    >
                      {col.label}
                      <SortArrow active={sortCol === col.key} direction={sortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr
                    key={row.branch}
                    onClick={() => handleBranchSelect(row.branch)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-colors"
                    title={`View lead data for ${row.branch}`}
                  >
                    <td className="py-3 pr-3 text-white/60 text-sm font-bold">{row.rank}</td>
                    <td className="py-3 pr-3 text-white/60 font-semibold text-sm group-hover:text-[#F4C300] transition-colors">
                      {row.branch}
                      <svg className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </td>
                    <td className="py-3 pr-3 text-white/60 text-sm">{row.bmName}</td>
                    <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.conversionRate !== null ? `${row.conversionRate}%` : "—"}</td>
                    <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.total}</td>
                    <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.unused}</td>
                    <td className="py-3 text-center"><DeltaTag delta={row.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 2: Lead Volume & Conversion by Insurer ───────────────────────────

function InsurerLeadDetailPanel({ insurer, leads, onBack }) {
  const [sortCol, setSortCol] = useState("status");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = useCallback((colKey) => {
    if (colKey === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("desc");
    }
  }, [sortCol]);

  const filteredRaw = useMemo(
    () => (leads ?? []).filter((l) => l.insuranceCompany === insurer),
    [leads, insurer]
  );

  const filtered = useMemo(() => {
    const col = INSURER_DETAIL_SORT_COLUMNS.find((c) => c.key === sortCol);
    if (!col) return filteredRaw;
    return [...filteredRaw].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filteredRaw, sortCol, sortDir]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const rented = filtered.filter((l) => l.status === "Rented").length;
    const cancelled = filtered.filter((l) => l.status === "Cancelled").length;
    const unused = filtered.filter((l) => l.status === "Unused").length;
    const convRate = total > 0 ? Math.round((rented / total) * 100) : null;
    return { total, rented, cancelled, unused, convRate };
  }, [filtered]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-5 group transition-colors"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all insurers
      </button>

      <SlideHeading
        title={insurer}
        subtitle={`${stats.total} leads — ${stats.convRate !== null ? `${stats.convRate}% conversion rate` : "No data"}`}
      />

      {/* Stats tiles */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Leads", value: stats.total, color: "text-white" },
          { label: "Rented", value: stats.rented, color: "text-[#2E7D32]" },
          { label: "Cancelled", value: stats.cancelled, color: "text-[#C62828]" },
          { label: "Unused", value: stats.unused, color: "text-[#F4C300]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Lead table */}
      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ background: BLACK }}>
            <tr className="border-b border-white/10">
              {INSURER_DETAIL_SORT_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left text-white/30 text-xs font-semibold uppercase tracking-wider pb-2 pr-3 cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap"
                >
                  {col.label}
                  <SortArrow active={sortCol === col.key} direction={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-white/30 text-sm py-6 text-center">No leads for this insurer.</td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const notes = lead.enrichment?.reason || lead.enrichment?.notes || lead.hlesReason || null;
                return (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-3 text-white font-medium truncate max-w-[140px]">{lead.customer}</td>
                    <td className="py-2.5 pr-3 text-white/60">{lead.branch}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          lead.status === "Rented"
                            ? "bg-[#2E7D32]/20 text-[#2E7D32]"
                            : lead.status === "Cancelled"
                            ? "bg-[#C62828]/20 text-[#C62828]"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-white/50 text-xs truncate max-w-[200px]">
                      {notes ?? <span className="text-white/20 italic">No notes</span>}
                    </td>
                    <td className="py-2.5 text-white/50 text-xs">{lead.daysOpen ?? "—"}d</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function SlideInsurer({ frozenLeads, dateRange, compRange, gmName }) {
  const [selectedInsurer, setSelectedInsurer] = useState(null);
  const [sortCol, setSortCol] = useState("total");
  const [sortDir, setSortDir] = useState("desc");

  const dataRaw = useMemo(
    () => getConversionByInsurer(frozenLeads, dateRange, compRange, gmName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const CHROME_PX = 280;
  const contentHeight = Math.max(320, (typeof window !== "undefined" ? window.innerHeight : 900) - CHROME_PX);

  const handleSort = useCallback((colKey) => {
    if (colKey === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("desc");
    }
  }, [sortCol]);

  const data = useMemo(() => {
    const col = INSURER_SORT_COLUMNS.find((c) => c.key === sortCol);
    if (!col) return dataRaw;
    return [...dataRaw].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [dataRaw, sortCol, sortDir]);

  const handleInsurerSelect = useCallback((insurer) => {
    setSelectedInsurer(insurer);
  }, []);

  if (selectedInsurer) {
    return (
      <InsurerLeadDetailPanel
        insurer={selectedInsurer}
        leads={frozenLeads}
        onBack={() => setSelectedInsurer(null)}
      />
    );
  }

  return (
    <div>
      <SlideHeading
        title="Conversion Rate % by Insurer"
        subtitle={`${data.find((d) => d.insurer === "State Farm") ? "State Farm highlighted — priority book of business. " : ""}Click any insurer to view lead details.`}
      />

      <div className="grid grid-cols-2 gap-8" style={{ alignItems: "start" }}>
        {/* Chart (left, 50%) */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Conversion Rate % by Insurer</p>
          <ChartLegend />
          <CombinedStackedBarLineChart
            items={data.map((d) => ({
              insurer: d.insurer,
              total: d.total,
              rented: d.rented,
              cancelled: d.cancelled,
              unused: d.unused,
              conversionRate: d.conversionRate,
            }))}
            height={contentHeight}
            onBarClick={handleInsurerSelect}
          />
        </div>

        {/* Table (right, 50%) */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Insurer Ranking</p>
          <div className="overflow-y-auto" style={{ maxHeight: contentHeight }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: BLACK }}>
                <tr className="border-b border-white/10">
                  {INSURER_SORT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`text-${col.align} text-white/30 text-xs font-semibold uppercase tracking-wider pb-2.5 pr-3 cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap`}
                    >
                      {col.label}
                      <SortArrow active={sortCol === col.key} direction={sortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const isStateFarm = row.insurer === "State Farm";
                  return (
                    <tr
                      key={row.insurer}
                      onClick={() => handleInsurerSelect(row.insurer)}
                      className={`border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-colors ${isStateFarm ? "bg-yellow-500/5" : ""}`}
                      title={`View leads for ${row.insurer}`}
                    >
                      <td className="py-3 pr-3 text-white/60 text-sm font-bold">{idx + 1}</td>
                      <td className={`py-3 pr-3 text-sm font-semibold group-hover:text-[#F4C300] transition-colors ${isStateFarm ? "text-[#F4C300]" : "text-white/60"}`}>
                        {row.insurer}
                        {isStateFarm && <span className="ml-1.5 text-xs text-[#F4C300]/60 font-normal">★</span>}
                        <svg className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </td>
                      <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.conversionRate !== null ? `${row.conversionRate}%` : "—"}</td>
                      <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.total}</td>
                      <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.unused}</td>
                      <td className="py-3 text-center"><DeltaTag delta={row.delta} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 3: Conversion by Body Shop ─────────────────────────────────────────

const BODYSHOP_SORT_COLUMNS = [
  { key: "rank",           label: "#",                  align: "left",   getValue: (r) => r._rank ?? 0 },
  { key: "bodyShop",       label: "Body Shop",          align: "left",   getValue: (r) => (r.bodyShop ?? "").toLowerCase() },
  { key: "conversionRate", label: "Conversion Rate %",  align: "center", getValue: (r) => r.conversionRate ?? -1 },
  { key: "total",          label: "Leads",              align: "center", getValue: (r) => r.total ?? 0 },
  { key: "unused",         label: "Unused Leads",       align: "center", getValue: (r) => r.unused ?? 0 },
  { key: "delta",          label: "vs Prior Period",    align: "center", getValue: (r) => r.delta ?? -Infinity },
];

const BODYSHOP_DETAIL_SORT_COLUMNS = [
  { key: "customer",  label: "Customer",  align: "left", getValue: (r) => (r.customer ?? "").toLowerCase() },
  { key: "branch",    label: "Branch",    align: "left", getValue: (r) => (r.branch ?? "").toLowerCase() },
  { key: "status",    label: "Status",    align: "left", getValue: (r) => r.status ?? "" },
  { key: "notes",     label: "BM Notes",  align: "left", getValue: (r) => (r.enrichment?.reason || r.enrichment?.notes || r.hlesReason || "").toLowerCase() },
  { key: "daysOpen",  label: "Days Open", align: "left", getValue: (r) => r.daysOpen ?? 0 },
];

function BodyShopLeadDetailPanel({ bodyShop, leads, onBack }) {
  const [sortCol, setSortCol] = useState("status");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = useCallback((colKey) => {
    if (colKey === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("desc");
    }
  }, [sortCol]);

  const filteredRaw = useMemo(
    () => (leads ?? []).filter((l) => (l.bodyShop ?? l.body_shop) === bodyShop),
    [leads, bodyShop]
  );

  const filtered = useMemo(() => {
    const col = BODYSHOP_DETAIL_SORT_COLUMNS.find((c) => c.key === sortCol);
    if (!col) return filteredRaw;
    return [...filteredRaw].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filteredRaw, sortCol, sortDir]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const rented = filtered.filter((l) => l.status === "Rented").length;
    const cancelled = filtered.filter((l) => l.status === "Cancelled").length;
    const unused = filtered.filter((l) => l.status === "Unused").length;
    const convRate = total > 0 ? Math.round((rented / total) * 100) : null;
    return { total, rented, cancelled, unused, convRate };
  }, [filtered]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-5 group transition-colors"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all body shops
      </button>

      <SlideHeading
        title={bodyShop}
        subtitle={`${stats.total} leads — ${stats.convRate !== null ? `${stats.convRate}% conversion rate` : "No data"}`}
      />

      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Leads", value: stats.total, color: "text-white" },
          { label: "Rented", value: stats.rented, color: "text-[#2E7D32]" },
          { label: "Cancelled", value: stats.cancelled, color: "text-[#C62828]" },
          { label: "Unused", value: stats.unused, color: "text-[#F4C300]" },
          { label: "Conversion Rate", value: stats.convRate !== null ? `${stats.convRate}%` : "—", color: "text-white" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ background: BLACK }}>
            <tr className="border-b border-white/10">
              {BODYSHOP_DETAIL_SORT_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left text-white/30 text-xs font-semibold uppercase tracking-wider pb-2 pr-3 cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap"
                >
                  {col.label}
                  <SortArrow active={sortCol === col.key} direction={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-white/30 text-sm py-6 text-center">No leads for this body shop.</td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const notes = lead.enrichment?.reason || lead.enrichment?.notes || lead.hlesReason || null;
                return (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-3 text-white font-medium truncate max-w-[140px]">{lead.customer}</td>
                    <td className="py-2.5 pr-3 text-white/60">{lead.branch}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          lead.status === "Rented"
                            ? "bg-[#2E7D32]/20 text-[#2E7D32]"
                            : lead.status === "Cancelled"
                            ? "bg-[#C62828]/20 text-[#C62828]"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-white/50 text-xs truncate max-w-[200px]">
                      {notes ?? <span className="text-white/20 italic">No notes</span>}
                    </td>
                    <td className="py-2.5 text-white/50 text-xs">{lead.daysOpen ?? "—"}d</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function SlideBodyShop({ frozenLeads, dateRange, compRange, gmName }) {
  const [selectedShop, setSelectedShop] = useState(null);
  const [sortCol, setSortCol] = useState("total");
  const [sortDir, setSortDir] = useState("desc");

  const dataRaw = useMemo(
    () => getConversionByBodyShop(frozenLeads, dateRange, compRange, gmName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const CHROME_PX = 280;
  const contentHeight = Math.max(320, (typeof window !== "undefined" ? window.innerHeight : 900) - CHROME_PX);

  const handleSort = useCallback((colKey) => {
    if (colKey === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("desc");
    }
  }, [sortCol]);

  const data = useMemo(() => {
    const col = BODYSHOP_SORT_COLUMNS.find((c) => c.key === sortCol);
    if (!col) return dataRaw;
    return [...dataRaw].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [dataRaw, sortCol, sortDir]);

  const handleShopSelect = useCallback((shop) => {
    setSelectedShop(shop);
  }, []);

  if (selectedShop) {
    return (
      <BodyShopLeadDetailPanel
        bodyShop={selectedShop}
        leads={frozenLeads}
        onBack={() => setSelectedShop(null)}
      />
    );
  }

  return (
    <div>
      <SlideHeading
        title="Conversion Rate % by Body Shop"
        subtitle="Click any body shop in the chart or table to view lead details."
      />

      <div className="grid grid-cols-2 gap-8" style={{ alignItems: "start" }}>
        {/* Chart (left, 50%) */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Conversion Rate % by Body Shop</p>
          <ChartLegend />
          <CombinedStackedBarLineChart
            items={data.map((d) => ({
              insurer: d.bodyShop,
              total: d.total,
              rented: d.rented,
              cancelled: d.cancelled,
              unused: d.unused,
              conversionRate: d.conversionRate,
            }))}
            height={contentHeight}
            onBarClick={handleShopSelect}
          />
        </div>

        {/* Table (right, 50%) */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Body Shop Ranking</p>
          <div className="overflow-y-auto" style={{ maxHeight: contentHeight }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: BLACK }}>
                <tr className="border-b border-white/10">
                  {BODYSHOP_SORT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`text-${col.align} text-white/30 text-xs font-semibold uppercase tracking-wider pb-2.5 pr-3 cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap`}
                    >
                      {col.label}
                      <SortArrow active={sortCol === col.key} direction={sortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr
                    key={row.bodyShop}
                    onClick={() => handleShopSelect(row.bodyShop)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-colors"
                    title={`View leads for ${row.bodyShop}`}
                  >
                    <td className="py-3 pr-3 text-white/60 text-sm font-bold">{idx + 1}</td>
                    <td className="py-3 pr-3 text-white/60 text-sm font-semibold group-hover:text-[#F4C300] transition-colors">
                      {row.bodyShop}
                      <svg className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </td>
                    <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.conversionRate !== null ? `${row.conversionRate}%` : "—"}</td>
                    <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.total}</td>
                    <td className="py-3 pr-3 text-center text-white/60 text-sm">{row.unused}</td>
                    <td className="py-3 text-center"><DeltaTag delta={row.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 4: Wins & Learnings ────────────────────────────────────────────────

function SlideWinsLearnings({ frozenWinsLearnings, gmName }) {
  const entries = useMemo(
    () => getWinsLearningsForGM(frozenWinsLearnings, gmName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const thisWeekMonday = getDateRangePresets().find((p) => p.key === "this_week")?.start.toISOString().slice(0, 10) ?? "2026-02-16";
  const currentWeek = entries.filter((e) => e.weekOf >= thisWeekMonday);
  const prior = entries.filter((e) => e.weekOf < thisWeekMonday);
  const displayEntries = currentWeek.length > 0 ? currentWeek : entries;

  if (entries.length === 0) {
    return (
      <div>
        <SlideHeading title="Wins & Learnings" subtitle="Submitted by your BMs before the meeting" />
        <div className="flex flex-col items-center justify-center h-48 text-white/30">
          <p className="text-lg font-semibold">No submissions yet this week.</p>
          <p className="text-sm mt-1">Remind your BMs to submit before Thursday.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SlideHeading title="Wins & Learnings" subtitle={`${displayEntries.length} submission${displayEntries.length !== 1 ? "s" : ""} from your team`} />
      <div className="grid grid-cols-2 gap-6 mt-2">
        {displayEntries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            className="rounded-xl p-5 border border-white/10 bg-white/5"
          >
            {/* Branch label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
              <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">{entry.branch}</span>
            </div>
            {/* Content */}
            <p className="text-white/90 text-sm leading-relaxed">{entry.content}</p>
          </motion.div>
        ))}
      </div>
      {prior.length > 0 && currentWeek.length === 0 && (
        <p className="text-white/30 text-xs mt-6 text-center">Showing prior week submissions — no entries for this week yet.</p>
      )}
    </div>
  );
}

// ─── Slide 4: Spot Check ──────────────────────────────────────────────────────

function SpotCheckLeadDetailPanel({ lead, onBack }) {
  if (!lead) return null;
  const notes = lead.enrichment?.reason || lead.enrichment?.notes || lead.hlesReason || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-5 group transition-colors">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to leads
      </button>

      <SlideHeading
        title={lead.customer}
        subtitle={`Reservation: ${lead.reservationId ?? lead.confirmNum ?? "—"} — ${lead.branch ?? ""}`}
      />

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Reservation #", value: lead.reservationId ?? lead.confirmNum ?? "—", color: "text-white" },
          { label: "Status", value: lead.status, color: lead.status === "Rented" ? "text-[#2E7D32]" : lead.status === "Cancelled" ? "text-[#C62828]" : "text-[#F4C300]" },
          { label: "Days Open", value: lead.daysOpen != null ? `${lead.daysOpen}d` : "—", color: "text-white" },
          { label: "Insurer", value: lead.insuranceCompany ?? "—", color: "text-white" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl p-5 bg-white/5 border border-white/10">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Contact Information</p>
          <div className="space-y-2.5">
            {[
              { label: "Email", value: lead.email ?? "—" },
              { label: "Phone", value: lead.phone ?? "—" },
              { label: "Body Shop", value: lead.bodyShop ?? lead.body_shop ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-white/50 text-sm">{label}</span>
                <span className="text-white text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-5 bg-white/5 border border-white/10">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">BM Notes</p>
          <p className="text-white/80 text-sm leading-relaxed">
            {notes ?? <span className="text-white/20 italic">No notes submitted</span>}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SlideSpotCheck({ frozenLeads, gmName, initialBranch }) {
  const { orgMapping } = useData();
  const myBranches = useMemo(
    () => orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch),
    [orgMapping, gmName]
  );

  const [selectedBranch, setSelectedBranch] = useState(initialBranch ?? myBranches[0] ?? null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    if (initialBranch && myBranches.includes(initialBranch)) {
      setSelectedBranch(initialBranch);
    }
  }, [initialBranch, myBranches]);

  const weekData = useMemo(
    () => (selectedBranch ? getStackedWeeklyByBranch(frozenLeads, selectedBranch, gmName) : []),
    [selectedBranch, frozenLeads, gmName]
  );

  const [sortCol, setSortCol] = useState("status");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = useCallback((colKey) => {
    if (colKey === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colKey);
      setSortDir("desc");
    }
  }, [sortCol]);

  const branchLeadsRaw = useMemo(() => {
    if (!selectedBranch) return [];
    return (frozenLeads ?? []).filter((l) => l.branch === selectedBranch);
  }, [selectedBranch, frozenLeads]);

  const branchLeadsFiltered = useMemo(() => {
    if (!statusFilter) return branchLeadsRaw;
    return branchLeadsRaw.filter((l) => l.status === statusFilter);
  }, [branchLeadsRaw, statusFilter]);

  const branchLeads = useMemo(() => {
    const col = SPOT_CHECK_SORT_COLUMNS.find((c) => c.key === sortCol);
    if (!col) return branchLeadsFiltered;
    return [...branchLeadsFiltered].sort((a, b) => {
      const va = col.getValue(a);
      const vb = col.getValue(b);
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [branchLeadsFiltered, sortCol, sortDir]);

  const stats = useMemo(() => {
    const total = branchLeadsRaw.length;
    const rented = branchLeadsRaw.filter((l) => l.status === "Rented").length;
    const cancelled = branchLeadsRaw.filter((l) => l.status === "Cancelled").length;
    const unused = branchLeadsRaw.filter((l) => l.status === "Unused").length;
    return { total, rented, cancelled, unused };
  }, [branchLeadsRaw]);

  const orgBm = orgMapping.find((r) => r.branch === selectedBranch)?.bm;
  const bmName = (orgBm && orgBm !== "— Unassigned —")
    ? orgBm
    : branchLeadsRaw.find((l) => l.bmName && l.bmName !== "—")?.bmName ?? "—";

  const handleTileClick = useCallback((status) => {
    setStatusFilter((prev) => (prev === status ? null : status));
  }, []);

  if (selectedLead) {
    return (
      <SpotCheckLeadDetailPanel
        lead={selectedLead}
        onBack={() => setSelectedLead(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <SlideHeading
          title="Spot Check: Branch Deep Dive"
          subtitle={selectedBranch ? `${selectedBranch} — BM: ${bmName}` : "Select a branch to review"}
        />
        <div className="ml-4 mt-2">
          <select
            value={selectedBranch ?? ""}
            onChange={(e) => { setSelectedBranch(e.target.value); setStatusFilter(null); }}
            className="bg-white/10 text-white text-sm border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F4C300]/50 cursor-pointer"
            style={{ colorScheme: "dark" }}
          >
            {myBranches.map((b) => (
              <option key={b} value={b} style={{ background: BLACK }}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Reservations", value: stats.total, color: "text-white", filterStatus: null },
          { label: "Rented", value: stats.rented, color: "text-[#2E7D32]", filterStatus: "Rented" },
          { label: "Cancelled", value: stats.cancelled, color: "text-[#C62828]", filterStatus: "Cancelled" },
          { label: "Unused", value: stats.unused, color: "text-[#F4C300]", filterStatus: "Unused" },
        ].map(({ label, value, color, filterStatus }) => {
          const isActive = statusFilter === filterStatus || (filterStatus === null && statusFilter === null);
          return (
            <div
              key={label}
              onClick={() => handleTileClick(filterStatus)}
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                isActive
                  ? "bg-white/10 border-[#F4C300]/40 ring-1 ring-[#F4C300]/20"
                  : "bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20"
              }`}
            >
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Trailing 4 Weeks</p>
          <ChartLegend showLine={false} />
          <StackedBarsChart weeks={weekData} maxBarHeightPx={120} />
        </div>

        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
            Leads to Discuss ({branchLeads.length})
            {statusFilter && (
              <button
                onClick={() => setStatusFilter(null)}
                className="ml-2 text-[10px] text-[#F4C300]/60 hover:text-[#F4C300] font-normal normal-case tracking-normal"
              >
                Clear filter
              </button>
            )}
          </p>
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: BLACK }}>
                <tr className="border-b border-white/10">
                  {SPOT_CHECK_SORT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`text-${col.align} text-white/30 text-xs font-semibold uppercase tracking-wider pb-2 pr-3 cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap`}
                    >
                      {col.label}
                      <SortArrow active={sortCol === col.key} direction={sortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchLeads.length === 0 ? (
                  <tr>
                    <td colSpan={SPOT_CHECK_SORT_COLUMNS.length} className="text-white/30 text-sm py-6 text-center">
                      {statusFilter ? `No ${statusFilter.toLowerCase()} leads for this branch.` : "No leads for this branch in the selected period."}
                    </td>
                  </tr>
                ) : (
                  branchLeads.map((lead) => {
                    const notes = lead.enrichment?.reason || lead.enrichment?.notes || lead.hlesReason || null;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer group transition-colors"
                      >
                        <td className="py-2.5 pr-3 text-white/50 text-xs font-mono">{lead.reservationId ?? lead.confirmNum ?? "—"}</td>
                        <td className="py-2.5 pr-3 text-white font-medium truncate max-w-[140px] group-hover:text-[#F4C300] transition-colors">
                          {lead.customer}
                          <svg className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </td>
                        <td className="py-2.5 pr-3 text-center">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              lead.status === "Rented"
                                ? "bg-[#2E7D32]/20 text-[#2E7D32]"
                                : lead.status === "Cancelled"
                                ? "bg-[#C62828]/20 text-[#C62828]"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-white/50 text-xs truncate max-w-[180px]">
                          {notes ?? <span className="text-white/20 italic">No notes</span>}
                        </td>
                        <td className="py-2.5 text-white/50 text-xs text-center">{lead.daysOpen ?? "—"}d</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GMPresentationMode({
  frozenLeads,
  frozenWinsLearnings,
  dateRange,
  compRange,
  meetingDateStr,
  gmName = "D. Williams",
  onClose,
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [spotCheckBranch, setSpotCheckBranch] = useState(null);
  const reduceMotion = useReducedMotion();

  const goNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1);
      setCurrentSlide((s) => s + 1);
    }
  }, [currentSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((s) => s - 1);
    }
  }, [currentSlide]);

  const goTo = useCallback(
    (i) => {
      setDirection(i > currentSlide ? 1 : -1);
      setCurrentSlide(i);
    },
    [currentSlide]
  );

  const handleBranchClick = useCallback((branch) => {
    setSpotCheckBranch(branch);
    setDirection(1);
    setCurrentSlide(4);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? "60%" : "-60%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? "-40%" : "40%", opacity: 0 }),
  };

  const slideTransition = {
    duration: reduceMotion ? 0.01 : 0.4,
    ease: [0.4, 0, 0.2, 1],
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col select-none"
      style={{ background: BLACK, fontFamily: "inherit" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Gold accent bar */}
      <div className="shrink-0 h-1" style={{ background: GOLD }} />

      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-8 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-lg tracking-[0.2em] uppercase" style={{ color: GOLD }}>
            HERTZ
          </span>
          <span className="text-white/20 text-xl font-thin">|</span>
          <span className="text-white/40 text-sm font-medium">
            Weekly Compliance Meeting:
            {dateRange?.start && dateRange?.end && (
              <span className="text-white/60 ml-1.5 font-semibold">
                {formatDateShort(dateRange.start)}
                {" – "}
                {formatDateShort(dateRange.end, true)}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-6">
          {meetingDateStr && (
            <span className="text-white/30 text-xs font-medium">{meetingDateStr}</span>
          )}
          <span className="text-sm font-bold" style={{ color: GOLD }}>
            {currentSlide + 1} <span className="text-white/30">/ {SLIDES.length}</span>
          </span>
          <button
            onClick={onClose}
            title="Exit presentation (Esc)"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0 overflow-y-auto px-10 py-5"
          >
            {currentSlide === 0 && (
              <SlideBranch frozenLeads={frozenLeads} dateRange={dateRange} compRange={compRange} gmName={gmName} onBranchClick={handleBranchClick} />
            )}
            {currentSlide === 1 && (
              <SlideInsurer frozenLeads={frozenLeads} dateRange={dateRange} compRange={compRange} gmName={gmName} />
            )}
            {currentSlide === 2 && (
              <SlideBodyShop frozenLeads={frozenLeads} dateRange={dateRange} compRange={compRange} gmName={gmName} />
            )}
            {currentSlide === 3 && (
              <SlideWinsLearnings frozenWinsLearnings={frozenWinsLearnings} gmName={gmName} />
            )}
            {currentSlide === 4 && (
              <SlideSpotCheck frozenLeads={frozenLeads} gmName={gmName} initialBranch={spotCheckBranch} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Left nav arrow */}
        {currentSlide > 0 && (
          <button
            onClick={goPrev}
            title="Previous slide (←)"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right nav arrow */}
        {currentSlide < SLIDES.length - 1 && (
          <button
            onClick={goNext}
            title="Next slide (→)"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 flex items-center justify-between px-8 py-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              title={s.title}
              className={`rounded-full transition-all duration-300 ${
                i === currentSlide ? "w-5 h-2" : "w-2 h-2 hover:bg-white/50"
              }`}
              style={{
                background: i === currentSlide ? GOLD : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
        <p className="text-white/25 text-xs font-semibold uppercase tracking-widest">
          {SLIDES[currentSlide].title}
        </p>
      </div>
    </motion.div>
  );
}
