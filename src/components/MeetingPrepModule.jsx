import { useMemo } from "react";
import { motion } from "framer-motion";
import { getMeetingPrepOutstandingCount, getDateRangePresets, getNextComplianceMeetingDate } from "../selectors/demoSelectors";

const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: [0.4, 0, 0.2, 1] },
});

export default function MeetingPrepModule({ navigateTo, leads, dateRange, branch, reduceMotion }) {
  // Use this_week for count to match Sidebar badge (meeting prep is always "this week's meeting")
  const thisWeekRange = useMemo(() => {
    const presets = getDateRangePresets();
    const thisWeek = presets.find((p) => p.key === "this_week");
    return thisWeek ? { start: thisWeek.start, end: thisWeek.end } : null;
  }, []);

  const outstandingCount = useMemo(
    () => getMeetingPrepOutstandingCount(leads ?? [], thisWeekRange ?? dateRange, branch),
    [leads, thisWeekRange, dateRange, branch]
  );

  const hasNotifications = outstandingCount >= 1;
  const { dateStr, daysLeft } = getNextComplianceMeetingDate();

  return (
    <motion.div {...cardAnim(0, reduceMotion)}>
      <motion.button
        onClick={() => navigateTo("bm-meeting-prep")}
        whileHover={!reduceMotion ? { scale: 1.005 } : {}}
        whileTap={!reduceMotion ? { scale: 0.995 } : {}}
        className={`w-full text-left border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer group
          ${hasNotifications
            ? "bg-[var(--hertz-primary-subtle)] border-[var(--hertz-primary)] shadow-[0_0_0_2px_rgba(255,209,0,0.4)]"
            : "border-[var(--neutral-200)] hover:border-[var(--hertz-primary)] hover:shadow-[var(--shadow-lg)] bg-white hover:bg-[var(--hertz-primary-subtle)]"
          }
          ${hasNotifications && !reduceMotion ? "animate-hertz-pulse" : ""}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="shrink-0 w-12 h-12 rounded-lg bg-[var(--hertz-primary)] flex items-center justify-center text-[var(--hertz-black)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-[var(--hertz-black)] tracking-tight">
                Meeting Prep
              </h3>
              <p className="text-sm text-[var(--neutral-600)] mt-0.5">
                {outstandingCount > 0 ? (
                  <>
                    <strong className="text-[var(--hertz-black)]">{outstandingCount}</strong>
                    {outstandingCount === 1
                      ? " action needed before your meeting"
                      : " actions needed before your meeting"}
                    — add comments or resolve data mismatches on Cancelled/Unused leads.
                  </>
                ) : (
                  "All caught up. No leads need comments or data mismatch resolution before your meeting."
                )}
              </p>
              <p className="text-xs font-medium text-[var(--hertz-black)] mt-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Weekly Compliance Meeting: {dateStr}
                {daysLeft >= 0 && (
                  <span className="font-semibold">
                    — {daysLeft === 0 ? "today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <span className="text-[var(--neutral-400)] group-hover:text-[var(--hertz-black)] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
