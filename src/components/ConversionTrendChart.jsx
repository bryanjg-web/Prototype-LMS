/**
 * ConversionTrendChart — Generic chart for visualizing metrics over a configurable timeframe.
 * Chart type: Bar | Line | Table. Cut data by: None | Status | Insurance Company | Body Shop.
 * Timeframe: Trailing 4 weeks (default) | Last 13 weeks | Year | Month | Week.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

const PADDING = { top: 24, right: 24, bottom: 44, left: 48 };
const COMBO_PADDING = { top: 24, right: 44, bottom: 44, left: 48 };
const CHART_HEIGHT = 260;
const Y_TICKS = [0, 25, 50, 75, 100];

const SERIES_COLORS = [
  "var(--hertz-primary)",
  "var(--hertz-black)",
  "var(--color-success)",
  "var(--color-error)",
  "var(--neutral-600)",
  "var(--color-info)",
];

const TIMEFRAME_OPTIONS = [
  { value: "trailing_4_weeks", label: "Trailing 4 weeks" },
  { value: "last_13_weeks", label: "Last 13 weeks" },
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
];

const METRIC_OPTIONS = [
  { value: "conversion_rate", label: "Conversion rate" },
  { value: "comment_rate", label: "Comment rate" },
  { value: "meeting_prep_comment_rate", label: "Comment rate (Meeting Prep)" },
  { value: "contacted_within_30_min", label: "Contacted within 30 min" },
  { value: "branch_vs_hrd_split", label: "Branch vs. HRD split" },
];

function buildSmoothPath(points) {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

const CHART_TYPES = [
  { key: "bar", label: "Bar" },
  { key: "line", label: "Line" },
  { key: "combo", label: "Combo" },
  { key: "table", label: "Table" },
];

const GROUP_OPTIONS = [
  { value: "", label: "None" },
  { value: "status", label: "Status" },
  { value: "insurance_company", label: "Insurance Company" },
  { value: "body_shop", label: "Body Shop" },
];

export default function ConversionTrendChart({
  data,
  chartType,
  groupBy,
  timeframe = "trailing_4_weeks",
  metric = "conversion_rate",
  onChartTypeChange,
  onGroupByChange,
  onTimeframeChange,
  onMetricChange,
}) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(500);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const activeChartType = chartType ?? "bar";
  const activeGroupBy = groupBy ?? "";
  const activeTimeframe = timeframe ?? "trailing_4_weeks";
  const activeMetric = metric ?? "conversion_rate";

  const controlsRow = (
    <div className="px-4 py-3 border-b border-[var(--neutral-200)] flex flex-wrap items-center gap-4 bg-white">
      <div className="flex items-center gap-2">
        <label htmlFor="conv-trend-metric" className="text-xs font-semibold text-[var(--neutral-600)]">
          Metric
        </label>
        <select
          id="conv-trend-metric"
          value={activeMetric}
          onChange={(e) => onMetricChange?.(e.target.value)}
          className="border border-[var(--neutral-200)] rounded-md px-2 py-1.5 text-xs bg-white min-w-[160px]"
          style={{ zIndex: 10 }}
        >
          {METRIC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="conv-trend-timeframe" className="text-xs font-semibold text-[var(--neutral-600)]">
          Time frame
        </label>
        <select
          id="conv-trend-timeframe"
          value={activeTimeframe}
          onChange={(e) => onTimeframeChange?.(e.target.value)}
          className="border border-[var(--neutral-200)] rounded-md px-2 py-1.5 text-xs bg-white min-w-[140px]"
          style={{ zIndex: 10 }}
        >
          {TIMEFRAME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-[var(--neutral-200)] p-0.5 bg-[var(--neutral-50)]">
        {CHART_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => onChartTypeChange?.(t.key)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeChartType === t.key
                ? "bg-white text-[var(--hertz-black)] shadow-sm"
                : "text-[var(--neutral-600)] hover:text-[var(--hertz-black)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="conv-trend-group" className="text-xs font-semibold text-[var(--neutral-600)]">
          Cut by
        </label>
        <select
          id="conv-trend-group"
          value={activeGroupBy}
          onChange={(e) => onGroupByChange?.(e.target.value || "")}
          className="border border-[var(--neutral-200)] rounded-md px-2 py-1.5 text-xs bg-white min-w-[140px]"
          style={{ zIndex: 10 }}
        >
          {GROUP_OPTIONS.map((o) => (
            <option key={o.value || "none"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const hasCounts = Array.isArray(data?.counts) && data.counts.length > 0;
  const hasNoData =
    !data ||
    !data.weekLabels ||
    data.weekLabels.length === 0 ||
    (activeChartType !== "combo" &&
      (!data.series ||
        data.series.length === 0 ||
        data.series.every((s) => !s.values || s.values.every((v) => v == null)))) ||
    (activeChartType === "combo" && (!hasCounts || !Array.isArray(data?.aggregateRate)));

  if (hasNoData) {
    return (
      <div className="border border-[var(--neutral-200)] rounded-lg bg-white shadow-[var(--shadow-sm)]">
        {controlsRow}
        <div className="p-10 text-center">
          <p className="text-sm text-[var(--neutral-600)]">No data for the selected metric, time frame, or group.</p>
        </div>
      </div>
    );
  }

  const { weekLabels, series } = data;
  const needsScroll = weekLabels.length > 8;
  const chartWidth = needsScroll ? Math.max(width, weekLabels.length * 52) : width;
  const chartW = chartWidth - PADDING.left - PADDING.right;
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = weekLabels.length > 1 ? chartW / (weekLabels.length - 1) : chartW;
  const toX = (i) => PADDING.left + i * stepX;
  const toY = (v) => PADDING.top + chartH - ((v ?? 0) / 100) * chartH;

  return (
    <div className="border border-[var(--neutral-200)] rounded-lg bg-white shadow-[var(--shadow-sm)]">
      {controlsRow}

      <div
        ref={containerRef}
        className={`p-4 ${needsScroll ? "overflow-x-auto" : ""}`}
      >
        <div style={needsScroll ? { minWidth: chartWidth } : undefined}>
          {activeChartType === "bar" && (
            <BarView data={data} width={chartWidth} reduceMotion={reduceMotion} />
          )}
          {activeChartType === "line" && (
            <LineView
              data={data}
              width={chartWidth}
              toX={toX}
              toY={toY}
              stepX={stepX}
              hoveredPoint={hoveredPoint}
              setHoveredPoint={setHoveredPoint}
              reduceMotion={reduceMotion}
            />
          )}
          {activeChartType === "combo" && (
            <ComboView
              data={data}
              width={chartWidth}
              metric={activeMetric}
              hoveredPoint={hoveredPoint}
              setHoveredPoint={setHoveredPoint}
              reduceMotion={reduceMotion}
            />
          )}
          {activeChartType === "table" && <TableView data={data} />}
        </div>
      </div>
    </div>
  );
}

function BarView({ data, width, reduceMotion }) {
  const { weekLabels, series } = data;
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const barGroupWidth = chartW / weekLabels.length;
  const barCount = series.length;
  const barGap = 2;
  const barWidth = Math.max(4, (barGroupWidth - barGap * (barCount - 1)) / barCount);

  return (
    <>
      <svg width={width} height={CHART_HEIGHT} className="overflow-visible">
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={PADDING.top + chartH - (tick / 100) * chartH}
              x2={width - PADDING.right}
              y2={PADDING.top + chartH - (tick / 100) * chartH}
              stroke="var(--neutral-200)"
              strokeDasharray="3 3"
            />
            <text
              x={PADDING.left - 8}
              y={PADDING.top + chartH - (tick / 100) * chartH + 4}
              textAnchor="end"
              className="text-xs fill-[var(--neutral-600)]"
            >
              {tick}%
            </text>
          </g>
        ))}
        {weekLabels.map((label, wi) => (
          <text
            key={wi}
            x={PADDING.left + wi * barGroupWidth + barGroupWidth / 2}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            className="text-xs fill-[var(--neutral-600)]"
          >
            {label}
          </text>
        ))}
        <line
          x1={PADDING.left}
          y1={PADDING.top + chartH}
          x2={width - PADDING.right}
          y2={PADDING.top + chartH}
          stroke="var(--neutral-200)"
        />
        {series.map((s, si) =>
          s.values.map((v, wi) => {
            const x = PADDING.left + wi * barGroupWidth + si * (barWidth + barGap);
            const h = v != null ? (v / 100) * chartH : 0;
            const y = PADDING.top + chartH - h;
            return (
              <motion.rect
                key={`${si}-${wi}`}
                x={x}
                y={y}
                width={barWidth}
                height={h}
                fill={SERIES_COLORS[si % SERIES_COLORS.length]}
                rx={2}
                initial={reduceMotion ? false : { height: 0, y: PADDING.top + chartH }}
                animate={{ height: h, y }}
                transition={{ delay: wi * 0.05 + si * 0.02, duration: 0.4, ease: "easeOut" }}
              />
            );
          })
        )}
      </svg>
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[var(--neutral-200)]">
          {series.map((s, i) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              <span className="text-xs text-[var(--neutral-600)]">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LineView({ data, width, toX, toY, stepX, hoveredPoint, setHoveredPoint, reduceMotion }) {
  const { weekLabels, series } = data;
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const lineContainerRef = useRef(null);
  const handleMouseMove = useCallback(
    (e) => {
      const rect = lineContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left - PADDING.left;
      const idx = Math.round(mouseX / stepX);
      const clamped = Math.max(0, Math.min(weekLabels.length - 1, idx));
      setHoveredPoint(clamped);
    },
    [weekLabels.length, stepX]
  );

  return (
    <div ref={lineContainerRef}>
      <svg
        width={width}
        height={CHART_HEIGHT}
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
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
            <text x={PADDING.left - 8} y={toY(tick) + 4} textAnchor="end" className="text-xs fill-[var(--neutral-600)]">
              {tick}%
            </text>
          </g>
        ))}
        {weekLabels.map((label, i) => (
          <text key={i} x={toX(i)} y={CHART_HEIGHT - 8} textAnchor="middle" className="text-xs fill-[var(--neutral-600)]">
            {label}
          </text>
        ))}
        <line x1={PADDING.left} y1={PADDING.top + chartH} x2={width - PADDING.right} y2={PADDING.top + chartH} stroke="var(--neutral-200)" />
        {series.map((s, si) => {
          const points = s.values.map((v, i) => ({ x: toX(i), y: toY(v) }));
          const path = buildSmoothPath(points);
          return (
            <g key={s.name}>
              <motion.path
                d={path}
                fill="none"
                stroke={SERIES_COLORS[si % SERIES_COLORS.length]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint === i ? 5 : 3}
                  fill={SERIES_COLORS[si % SERIES_COLORS.length]}
                  stroke="white"
                  strokeWidth={hoveredPoint === i ? 2 : 0}
                  className="transition-all duration-150"
                />
              ))}
            </g>
          );
        })}
        {hoveredPoint !== null && (
          <line
            x1={toX(hoveredPoint)}
            y1={PADDING.top}
            x2={toX(hoveredPoint)}
            y2={PADDING.top + chartH}
            stroke="var(--hertz-black)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.3}
          />
        )}
      </svg>
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[var(--neutral-200)]">
          {series.map((s, i) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              <span className="text-xs text-[var(--neutral-600)]">{s.name}</span>
            </div>
          ))}
        </div>
      )}
      {hoveredPoint !== null && (
        <div className="mt-2 text-xs text-[var(--neutral-600)]">
          {weekLabels[hoveredPoint]}:{" "}
          {series.map((s) => (
            <span key={s.name} className="mr-3">
              {s.name} {s.values[hoveredPoint] != null ? `${s.values[hoveredPoint]}%` : "—"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function niceTicks(max) {
  if (max <= 0) return [0];
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : Math.ceil(max / 5);
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function ComboView({ data, width, metric, hoveredPoint, setHoveredPoint, reduceMotion }) {
  const { weekLabels, counts = [], aggregateRate = [] } = data;
  const pad = COMBO_PADDING;
  const chartW = width - pad.left - pad.right;
  const chartH = CHART_HEIGHT - pad.top - pad.bottom;
  const barGroupWidth = chartW / weekLabels.length;
  const barWidth = Math.max(8, barGroupWidth * 0.6);
  const stepX = weekLabels.length > 1 ? chartW / (weekLabels.length - 1) : chartW;

  const maxCount = Math.max(1, ...counts);
  const countTicks = niceTicks(maxCount);
  const toX = (i) => pad.left + i * stepX;
  const toYCount = (c) => pad.top + chartH - ((c ?? 0) / maxCount) * chartH;
  const toYRate = (v) => pad.top + chartH - ((v ?? 0) / 100) * chartH;

  const lineContainerRef = useRef(null);
  const handleMouseMove = useCallback(
    (e) => {
      const rect = lineContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left - pad.left;
      const idx = Math.round(mouseX / stepX);
      const clamped = Math.max(0, Math.min(weekLabels.length - 1, idx));
      setHoveredPoint(clamped);
    },
    [weekLabels.length, stepX]
  );

  const rateLabel =
    metric === "conversion_rate"
      ? "Conversion rate"
      : metric === "comment_rate"
        ? "Comment rate"
        : metric === "meeting_prep_comment_rate"
          ? "Comment rate (MP)"
          : metric === "contacted_within_30_min"
            ? "Contacted <30m"
            : "Rate";

  return (
    <div ref={lineContainerRef}>
      <svg
        width={width}
        height={CHART_HEIGHT}
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Left axis (count) grid and labels */}
        {countTicks.map((tick) => {
          const y = toYCount(tick);
          return (
            <g key={`count-${tick}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="var(--neutral-200)"
                strokeDasharray="3 3"
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-[var(--neutral-600)]"
              >
                {tick}
              </text>
            </g>
          );
        })}
        {/* Right axis (rate %) grid and labels */}
        {Y_TICKS.map((tick) => {
          const y = toYRate(tick);
          return (
            <g key={`rate-${tick}`}>
              <text
                x={width - pad.right + 8}
                y={y + 4}
                textAnchor="start"
                className="text-xs fill-[var(--color-success)]"
              >
                {tick}%
              </text>
            </g>
          );
        })}
        {/* Week labels */}
        {weekLabels.map((label, i) => (
          <text
            key={i}
            x={toX(i)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            className="text-xs fill-[var(--neutral-600)]"
          >
            {label}
          </text>
        ))}
        {/* Baseline */}
        <line
          x1={pad.left}
          y1={pad.top + chartH}
          x2={width - pad.right}
          y2={pad.top + chartH}
          stroke="var(--neutral-200)"
        />
        {/* Bars (lead count) */}
        {counts.map((c, wi) => {
          const h = (c / maxCount) * chartH;
          const x = pad.left + wi * barGroupWidth + (barGroupWidth - barWidth) / 2;
          const y = pad.top + chartH - h;
          return (
            <motion.rect
              key={`bar-${wi}`}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              fill="var(--hertz-primary)"
              fillOpacity={0.4}
              rx={2}
              initial={reduceMotion ? false : { height: 0, y: pad.top + chartH }}
              animate={{ height: h, y }}
              transition={{ delay: wi * 0.05, duration: 0.4, ease: "easeOut" }}
            />
          );
        })}
        {/* Line (rate) */}
        {aggregateRate.length > 0 && (
          <g>
            <motion.path
              d={buildSmoothPath(
                aggregateRate.map((v, i) => ({ x: toX(i), y: toYRate(v) }))
              )}
              fill="none"
              stroke="var(--color-success)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {aggregateRate.map((v, i) => (
              <circle
                key={i}
                cx={toX(i)}
                cy={toYRate(v)}
                r={hoveredPoint === i ? 5 : 3}
                fill="var(--color-success)"
                stroke="white"
                strokeWidth={hoveredPoint === i ? 2 : 0}
                className="transition-all duration-150"
              />
            ))}
          </g>
        )}
        {hoveredPoint !== null && (
          <line
            x1={toX(hoveredPoint)}
            y1={pad.top}
            x2={toX(hoveredPoint)}
            y2={pad.top + chartH}
            stroke="var(--hertz-black)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.3}
          />
        )}
      </svg>
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-[var(--neutral-200)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm shrink-0 bg-[var(--hertz-primary)] opacity-60" />
          <span className="text-xs text-[var(--neutral-600)]">Leads (count)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm shrink-0 bg-[var(--color-success)]" />
          <span className="text-xs text-[var(--neutral-600)]">{rateLabel} (%)</span>
        </div>
      </div>
      {hoveredPoint !== null && (
        <div className="mt-2 text-xs text-[var(--neutral-600)]">
          {weekLabels[hoveredPoint]}:{" "}
          <span className="mr-3 font-medium">{counts[hoveredPoint] ?? 0} leads</span>
          <span className="text-[var(--color-success)] font-medium">
            {aggregateRate[hoveredPoint] != null ? `${aggregateRate[hoveredPoint]}%` : "—"}
          </span>
        </div>
      )}
    </div>
  );
}

function TableView({ data }) {
  const { weekLabels, series } = data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
            <th className="px-3 py-2.5 text-left">Week</th>
            {series.map((s) => (
              <th key={s.name} className="px-3 py-2.5 text-right">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekLabels.map((label, wi) => (
            <tr key={wi} className="border-t border-[var(--neutral-200)] hover:bg-[var(--neutral-50)]">
              <td className="px-3 py-2 font-medium text-[var(--hertz-black)]">{label}</td>
              {series.map((s) => (
                <td key={s.name} className="px-3 py-2 text-right text-[var(--neutral-700)]">
                  {s.values[wi] != null ? `${s.values[wi]}%` : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
