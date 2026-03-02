import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateRange } from "../utils/dateTime";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(str) {
  if (!str) return null;
  const d = new Date(str + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function getDaysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export function DateRangeCalendar({ start, end, onChange, onClose, anchorRef, placement = "bottom-start" }) {
  const startDate = parseYMD(start);
  const endDate = parseYMD(end);
  const [viewDate, setViewDate] = useState(() => startDate || endDate || new Date());
  const [selecting, setSelecting] = useState(null);
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  const handleDayClick = (d) => {
    if (!d) return;
    const ymd = toYMD(d);
    if (!selecting) {
      setSelecting(ymd);
      onChange?.({ start: ymd, end: ymd });
    } else {
      const [a, b] = selecting <= ymd ? [selecting, ymd] : [ymd, selecting];
      onChange?.({ start: a, end: b });
      setSelecting(null);
      onClose?.();
    }
  };

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  const days = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const currentStart = selecting || start;
  const currentEnd = selecting ? selecting : end;
  const rangeStart = currentStart ? parseYMD(currentStart)?.getTime() : null;
  const rangeEnd = currentEnd ? parseYMD(currentEnd)?.getTime() : null;

  return (
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 mt-1 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg p-3 min-w-[260px]"
      style={
        placement === "bottom-start"
          ? { top: "100%", left: 0 }
          : placement === "bottom-end"
          ? { top: "100%", right: 0 }
          : { top: "100%", left: 0 }
      }
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded hover:bg-[var(--neutral-100)] text-[var(--neutral-600)]"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-semibold text-[var(--hertz-black)]">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded hover:bg-[var(--neutral-100)] text-[var(--neutral-600)]"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] font-semibold text-[var(--neutral-500)] py-1">{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`pad-${i}`} />;
          const ymd = toYMD(d);
          const ts = d.getTime();
          const isInRange = rangeStart != null && rangeEnd != null && ts >= Math.min(rangeStart, rangeEnd) && ts <= Math.max(rangeStart, rangeEnd);
          const isStart = ymd === currentStart;
          const isEnd = ymd === currentEnd;
          const isSelected = isStart || isEnd;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => handleDayClick(d)}
              className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]"
                  : isInRange
                  ? "bg-[var(--hertz-primary)]/25 text-[var(--hertz-black)]"
                  : "hover:bg-[var(--neutral-100)] text-[var(--hertz-black)]"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-[var(--neutral-500)] mt-2 text-center">
        {selecting ? "Click end date" : "Click start date, then end date"}
      </p>
    </motion.div>
  );
}

export function DateRangeCalendarTrigger({ start, end, onStartChange, onEndChange, children, className }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  const handleChange = ({ start: s, end: e }) => {
    onStartChange?.(s);
    onEndChange?.(e);
  };

  const label = start && end
    ? formatDateRange(new Date(start), new Date(end))
    : "Select dates";

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={className ?? "px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--neutral-200)] bg-white text-[var(--hertz-black)] hover:bg-[var(--neutral-50)] focus:outline-none focus:border-[var(--hertz-primary)] transition-colors shrink-0"}
      >
        {children ?? label}
      </button>
      <AnimatePresence>
        {open && (
          <DateRangeCalendar
            start={start}
            end={end}
            onChange={handleChange}
            onClose={() => setOpen(false)}
            anchorRef={anchorRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
