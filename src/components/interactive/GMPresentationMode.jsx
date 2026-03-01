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
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  getConversionByBranch,
  getConversionByInsurer,
  getStackedWeeklyByBranch,
  getWinsLearningsForGM,
  getDateRangePresets,
} from "../../selectors/demoSelectors";
import { orgMapping } from "../../data/mockData";

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD = "#FFD100";
const BLACK = "#272425";
const RENTED_COLOR = "#22c55e";
const CANCELLED_COLOR = "#ef4444";
const UNUSED_COLOR = GOLD;

const SLIDES = [
  { id: "branch",   title: "Conversion by Branch" },
  { id: "insurer",  title: "Conversion by Insurance Company" },
  { id: "wins",     title: "Wins & Learnings" },
  { id: "spotcheck",title: "Spot Check: Branch Deep Dive" },
];

// ─── Shared slide components ──────────────────────────────────────────────────

function SlideHeading({ title, subtitle }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-8 rounded-full" style={{ background: GOLD }} />
        <h2 className="text-3xl font-extrabold text-white tracking-tight">{title}</h2>
      </div>
      {subtitle && <p className="text-white/50 text-sm ml-4">{subtitle}</p>}
    </div>
  );
}

/** Proportional stacked bar chart (each bar = 100% height, divided by status %). */
function StackedBarsChart({ weeks, maxBarHeightPx = 160 }) {
  if (!weeks || weeks.length === 0) {
    return <p className="text-white/30 text-sm">No data for this period.</p>;
  }
  const maxTotal = Math.max(...weeks.map((w) => w.total), 1);

  return (
    <div className="flex items-end gap-4">
      {weeks.map((w, i) => {
        const barH = maxTotal > 0 ? Math.round((w.total / maxTotal) * maxBarHeightPx) : 0;
        const rentedPct = w.total > 0 ? (w.rented / w.total) * 100 : 0;
        const cancelledPct = w.total > 0 ? (w.cancelled / w.total) * 100 : 0;
        const unusedPct = w.total > 0 ? (w.unused / w.total) * 100 : 0;

        return (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <span className="text-white/50 text-xs font-medium">{w.total}</span>
            {/* Bar — flex-col with segments from bottom using flex-col-reverse */}
            <div
              className="w-full rounded-sm overflow-hidden flex flex-col-reverse"
              style={{ height: barH, minHeight: 8, background: "rgba(255,255,255,0.05)" }}
            >
              {/* Rented — bottom (green) */}
              <div style={{ height: `${rentedPct}%`, background: RENTED_COLOR, opacity: 0.9 }} />
              {/* Cancelled — middle (red) */}
              <div style={{ height: `${cancelledPct}%`, background: CANCELLED_COLOR, opacity: 0.85 }} />
              {/* Unused — top (gold) */}
              <div style={{ height: `${unusedPct}%`, background: UNUSED_COLOR, opacity: 0.8 }} />
            </div>
            <span className="text-white/40 text-xs text-center leading-tight">{w.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal bar chart for insurer comparison by total volume. */
function HorizontalBarsChart({ data, maxBarWidthPct = 100 }) {
  const maxTotal = Math.max(...(data ?? []).map((d) => d.total), 1);
  return (
    <div className="flex flex-col gap-3">
      {(data ?? []).slice(0, 6).map((d, i) => {
        const rentedW = (d.rented / maxTotal) * maxBarWidthPct;
        const cancelledW = (d.cancelled / maxTotal) * maxBarWidthPct;
        const unusedW = (d.unused / maxTotal) * maxBarWidthPct;
        const isStateFarm = d.insurer === "State Farm";
        return (
          <div key={i} className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold w-28 text-right shrink-0 truncate ${isStateFarm ? "text-[#FFD100]" : "text-white/70"}`}
            >
              {d.insurer}
            </span>
            <div className="flex-1 flex items-center gap-px h-6 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div style={{ width: `${rentedW}%`, height: "100%", background: RENTED_COLOR, opacity: 0.9 }} />
              <div style={{ width: `${cancelledW}%`, height: "100%", background: CANCELLED_COLOR, opacity: 0.85 }} />
              <div style={{ width: `${unusedW}%`, height: "100%", background: UNUSED_COLOR, opacity: 0.8 }} />
            </div>
            <span className={`text-xs font-bold w-10 shrink-0 ${isStateFarm ? "text-[#FFD100]" : "text-white/60"}`}>
              {d.conversionRate !== null ? `${d.conversionRate}%` : "—"}
            </span>
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
        isUp ? "bg-green-500/20 text-green-400" : isDown ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/50"
      }`}
    >
      {isUp ? "↑" : isDown ? "↓" : "—"}
      {delta !== 0 ? `${Math.abs(delta)}%` : ""}
    </span>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ChartLegend() {
  return (
    <div className="flex items-center gap-4 mt-3">
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
    </div>
  );
}

// ─── Slide 1: Conversion by Branch ───────────────────────────────────────────

function SlideBranch({ frozenLeads, dateRange, compRange, gmName }) {
  const leaderboard = useMemo(
    () => getConversionByBranch(frozenLeads, dateRange, compRange, gmName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const zoneWeeks = useMemo(
    () => getStackedWeeklyByBranch(frozenLeads, null, gmName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
      <SlideHeading title="Conversion by Branch" subtitle="Sorted by conversion rate — current period vs prior" />
      <div className="grid grid-cols-5 gap-8">
        {/* Chart (left, 2 cols) */}
        <div className="col-span-2">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Zone Trend — Trailing 4 Weeks</p>
          <StackedBarsChart weeks={zoneWeeks} maxBarHeightPx={160} />
          <ChartLegend />
        </div>

        {/* Leaderboard table (right, 3 cols) */}
        <div className="col-span-3">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Branch Ranking</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["#", "Branch", "BM", "Leads", "Conv %", "vs Last"].map((h) => (
                  <th key={h} className="text-left text-white/30 text-xs font-semibold uppercase tracking-wider pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.branch} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 pr-3 text-white/40 text-xs font-bold">{row.rank}</td>
                  <td className="py-2.5 pr-3 text-white font-semibold">{row.branch}</td>
                  <td className="py-2.5 pr-3 text-white/60">{row.bmName}</td>
                  <td className="py-2.5 pr-3 text-white/70">{row.total}</td>
                  <td className="py-2.5 pr-3">
                    <span className="text-white font-bold">{row.conversionRate !== null ? `${row.conversionRate}%` : "—"}</span>
                  </td>
                  <td className="py-2.5"><DeltaTag delta={row.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 2: Conversion by Insurer ──────────────────────────────────────────

function SlideInsurer({ frozenLeads, dateRange, compRange, gmName }) {
  const data = useMemo(
    () => getConversionByInsurer(frozenLeads, dateRange, compRange, gmName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
      <SlideHeading
        title="Conversion by Insurance Company"
        subtitle={`${data.find((d) => d.insurer === "State Farm") ? "State Farm highlighted — priority book of business" : "Sorted by total volume"}`}
      />
      <div className="grid grid-cols-5 gap-8">
        {/* Horizontal bar chart (left, 3 cols) */}
        <div className="col-span-3">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Volume by Insurer</p>
          <HorizontalBarsChart data={data} />
          <ChartLegend />
        </div>

        {/* Table (right, 2 cols) */}
        <div className="col-span-2">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Insurer Breakdown</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Insurer", "Leads", "Conv %", "vs Last"].map((h) => (
                  <th key={h} className="text-left text-white/30 text-xs font-semibold uppercase tracking-wider pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const isStateFarm = row.insurer === "State Farm";
                return (
                  <tr
                    key={row.insurer}
                    className={`border-b border-white/5 ${isStateFarm ? "bg-yellow-500/5" : ""}`}
                  >
                    <td className={`py-2.5 pr-3 font-semibold ${isStateFarm ? "text-[#FFD100]" : "text-white"}`}>
                      {row.insurer}
                      {isStateFarm && <span className="ml-1.5 text-xs text-[#FFD100]/60 font-normal">★</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-white/70">{row.total}</td>
                    <td className="py-2.5 pr-3">
                      <span className="text-white font-bold">{row.conversionRate !== null ? `${row.conversionRate}%` : "—"}</span>
                    </td>
                    <td className="py-2.5"><DeltaTag delta={row.delta} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 3: Wins & Learnings ────────────────────────────────────────────────

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

function SlideSpotCheck({ frozenLeads, gmName }) {
  const myBranches = useMemo(
    () => orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch),
    [gmName]
  );

  const [selectedBranch, setSelectedBranch] = useState(myBranches[0] ?? null);

  const weekData = useMemo(
    () => (selectedBranch ? getStackedWeeklyByBranch(frozenLeads, selectedBranch, gmName) : []),
    [selectedBranch, frozenLeads, gmName]
  );

  const branchLeads = useMemo(() => {
    if (!selectedBranch) return [];
    return (frozenLeads ?? [])
      .filter((l) => l.branch === selectedBranch)
      .sort((a, b) => {
        const order = { Cancelled: 0, Unused: 1, Rented: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });
  }, [selectedBranch, frozenLeads]);

  const stats = useMemo(() => {
    const total = branchLeads.length;
    const rented = branchLeads.filter((l) => l.status === "Rented").length;
    const cancelled = branchLeads.filter((l) => l.status === "Cancelled").length;
    const unused = branchLeads.filter((l) => l.status === "Unused").length;
    return { total, rented, cancelled, unused };
  }, [branchLeads]);

  const bmName = orgMapping.find((r) => r.branch === selectedBranch)?.bm ?? "—";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <SlideHeading
          title="Spot Check: Branch Deep Dive"
          subtitle={selectedBranch ? `${selectedBranch} — BM: ${bmName}` : "Select a branch to review"}
        />
        {/* Branch selector */}
        <div className="shrink-0 mt-1">
          <select
            value={selectedBranch ?? ""}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-white/10 text-white text-sm border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFD100]/50 cursor-pointer"
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

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Reservations", value: stats.total, color: "text-white" },
          { label: "Rented",   value: stats.rented,   color: "text-green-400" },
          { label: "Cancelled", value: stats.cancelled, color: "text-red-400" },
          { label: "Unused",   value: stats.unused,   color: "text-[#FFD100]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-8">
        {/* Stacked chart for branch */}
        <div className="col-span-2">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Trailing 4 Weeks</p>
          <StackedBarsChart weeks={weekData} maxBarHeightPx={120} />
          <ChartLegend />
        </div>

        {/* Lead table */}
        <div className="col-span-3">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">
            Leads to Discuss ({branchLeads.length})
          </p>
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: BLACK }}>
                <tr className="border-b border-white/10">
                  {["Customer", "Status", "BM Notes", "Days Open"].map((h) => (
                    <th key={h} className="text-left text-white/30 text-xs font-semibold uppercase tracking-wider pb-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchLeads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-white/30 text-sm py-6 text-center">No leads for this branch in the selected period.</td>
                  </tr>
                ) : (
                  branchLeads.map((lead) => {
                    const notes = lead.enrichment?.reason || lead.enrichment?.notes || lead.hlesReason || null;
                    return (
                      <tr key={lead.id} className="border-b border-white/5">
                        <td className="py-2.5 pr-3 text-white font-medium truncate max-w-[140px]">{lead.customer}</td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              lead.status === "Rented"
                                ? "bg-green-500/20 text-green-400"
                                : lead.status === "Cancelled"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-white/50 text-xs truncate max-w-[180px]">
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
      <div className="shrink-0 h-1.5" style={{ background: GOLD }} />

      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-8 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-lg tracking-[0.2em] uppercase" style={{ color: GOLD }}>
            HERTZ
          </span>
          <span className="text-white/20 text-xl font-thin">|</span>
          <span className="text-white/40 text-sm font-medium">Zone Management — Compliance Meeting</span>
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
            className="absolute inset-0 overflow-y-auto px-12 py-10"
          >
            {currentSlide === 0 && (
              <SlideBranch frozenLeads={frozenLeads} dateRange={dateRange} compRange={compRange} gmName={gmName} />
            )}
            {currentSlide === 1 && (
              <SlideInsurer frozenLeads={frozenLeads} dateRange={dateRange} compRange={compRange} gmName={gmName} />
            )}
            {currentSlide === 2 && (
              <SlideWinsLearnings frozenWinsLearnings={frozenWinsLearnings} gmName={gmName} />
            )}
            {currentSlide === 3 && (
              <SlideSpotCheck frozenLeads={frozenLeads} gmName={gmName} />
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
        className="shrink-0 flex items-center justify-between px-8 py-4"
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
