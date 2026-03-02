import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

const PADDING = { top: 24, right: 24, bottom: 44, left: 52 };
const CHART_HEIGHT = 280;
const Y_TICKS = [0, 20, 40, 60, 80, 100];

function buildPath(points) {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

function buildSmoothPath(points) {
  if (points.length < 2) return buildPath(points);
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

export default function ConversionLineChart({ data }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="border border-[var(--neutral-200)] rounded-lg p-10 bg-white text-center">
        <p className="text-sm text-[var(--neutral-600)]">No data available for this range.</p>
      </div>
    );
  }

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const toX = (i) => PADDING.left + i * stepX;
  const toY = (v) => PADDING.top + chartH - (v / 100) * chartH;

  const convPoints = data.map((d, i) => ({ x: toX(i), y: toY(d.conversionRate) }));
  const commentPoints = data.map((d, i) => ({ x: toX(i), y: toY(d.commentRate) }));

  const convPath = buildSmoothPath(convPoints);
  const commentPath = buildSmoothPath(commentPoints);

  const labelInterval = data.length > 14 ? Math.ceil(data.length / 10) : 1;

  const handleMouseMove = useCallback(
    (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left - PADDING.left;
      const idx = Math.round(mouseX / stepX);
      const clamped = Math.max(0, Math.min(data.length - 1, idx));
      setHoveredIdx(clamped);
      setTooltipPos({ x: toX(clamped), y: Math.min(toY(data[clamped].conversionRate), toY(data[clamped].commentRate)) });
    },
    [data, stepX],
  );

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="border border-[var(--neutral-200)] rounded-lg bg-white shadow-[var(--shadow-md)] overflow-hidden">
      <div className="px-5 pt-5 pb-1 flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">
          Conversion &amp; Comment Rate
        </p>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[3px] rounded-sm bg-[var(--chart-black)]" />
            <span className="text-xs text-[var(--neutral-600)] font-medium">Conversion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] rounded-sm bg-[var(--chart-primary)]" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--chart-primary) 0, var(--chart-primary) 4px, transparent 4px, transparent 7px)", backgroundColor: "transparent" }} />
            <span className="text-xs text-[var(--neutral-600)] font-medium">Comment Rate</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="px-2 pb-4">
        <svg
          width={width}
          height={CHART_HEIGHT}
          className="overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Horizontal grid lines */}
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={toY(tick)}
                x2={width - PADDING.right}
                y2={toY(tick)}
                stroke="var(--neutral-200)"
                strokeDasharray="3 3"
              />
              <text
                x={PADDING.left - 10}
                y={toY(tick) + 4}
                textAnchor="end"
                className="text-xs fill-[var(--neutral-500)]"
              >
                {tick}%
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {data.map((d, i) =>
            i % labelInterval === 0 || i === data.length - 1 ? (
              <text
                key={i}
                x={toX(i)}
                y={CHART_HEIGHT - 8}
                textAnchor="middle"
                className="text-xs fill-[var(--neutral-500)]"
              >
                {d.label}
              </text>
            ) : null,
          )}

          {/* X-axis line */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + chartH}
            x2={width - PADDING.right}
            y2={PADDING.top + chartH}
            stroke="var(--neutral-200)"
          />

          {/* Comment Rate line (behind conversion) */}
          <motion.path
            d={commentPath}
            fill="none"
            stroke="var(--chart-primary)"
            strokeWidth={2}
            strokeDasharray="6 3"
            strokeLinecap="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* Conversion Rate line */}
          <motion.path
            d={convPath}
            fill="none"
            stroke="var(--chart-black)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* Data point dots (only if ≤ 31 points) */}
          {data.length <= 31 &&
            convPoints.map((p, i) => (
              <circle
                key={`conv-${i}`}
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === i ? 5 : 3}
                fill="var(--chart-black)"
                stroke={hoveredIdx === i ? "#fff" : "none"}
                strokeWidth={2}
                className="transition-all duration-150"
              />
            ))}
          {data.length <= 31 &&
            commentPoints.map((p, i) => (
              <circle
                key={`comm-${i}`}
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === i ? 4.5 : 2.5}
                fill="var(--chart-primary)"
                stroke={hoveredIdx === i ? "#fff" : "none"}
                strokeWidth={2}
                className="transition-all duration-150"
              />
            ))}

          {/* Hover crosshair line */}
          {hoveredIdx !== null && (
            <line
              x1={toX(hoveredIdx)}
              y1={PADDING.top}
              x2={toX(hoveredIdx)}
              y2={PADDING.top + chartH}
              stroke="var(--chart-black)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.3}
            />
          )}

          {/* Invisible hit areas for hover detection */}
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={chartW}
            height={chartH}
            fill="transparent"
          />
        </svg>

        {/* Tooltip */}
        {hovered && hoveredIdx !== null && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: Math.min(tooltipPos.x + 12, width - 180),
              top: tooltipPos.y - 10,
            }}
          >
            <div className="bg-white border border-[var(--neutral-200)] rounded-lg p-3 shadow-[var(--shadow-lg)] min-w-[160px]">
              <p className="text-xs font-bold text-[var(--hertz-black)] mb-2 border-b border-[var(--neutral-100)] pb-1.5">
                {hovered.label}
              </p>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[var(--chart-black)] flex-shrink-0" />
                <span className="text-xs text-[var(--neutral-600)]">Conversion</span>
                <span className="text-xs font-bold ml-auto text-[var(--chart-black)]">{hovered.conversionRate}%</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[var(--chart-primary)] flex-shrink-0" />
                <span className="text-xs text-[var(--neutral-600)]">Comment Rate</span>
                <span className="text-xs font-bold ml-auto text-[var(--chart-primary)]">{hovered.commentRate}%</span>
              </div>
              <div className="border-t border-[var(--neutral-100)] mt-1.5 pt-1.5">
                <p className="text-xs text-[var(--neutral-600)]">
                  {hovered.rented} rented of {hovered.totalLeads} leads
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
