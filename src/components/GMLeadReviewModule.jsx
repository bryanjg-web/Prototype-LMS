import { useMemo } from "react";
import { motion } from "framer-motion";
import { getGMLeadsToReviewCount, getMismatchLeads, getDateRangePresets, getNextComplianceMeetingDate } from "../selectors/demoSelectors";

const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: [0.4, 0, 0.2, 1] },
});

export default function GMLeadReviewModule({ navigateTo, leads, dateRange, reduceMotion }) {
  // Use this_week for count to match Sidebar badge
  const thisWeekRange = useMemo(() => {
    const presets = getDateRangePresets();
    const thisWeek = presets.find((p) => p.key === "this_week");
    return thisWeek ? { start: thisWeek.start, end: thisWeek.end } : null;
  }, []);

  // Match Sidebar: leads to review + mismatch leads
  const reviewCount = useMemo(() => {
    const range = thisWeekRange ?? dateRange;
    const toReview = getGMLeadsToReviewCount(leads ?? [], range);
    const mismatches = getMismatchLeads(leads ?? []).length;
    return toReview + mismatches;
  }, [leads, thisWeekRange, dateRange]);

  const hasItems = reviewCount > 0;
  const { dateStr, daysLeft } = getNextComplianceMeetingDate();

  return (
    <motion.div {...cardAnim(1, reduceMotion)} className="h-full">
      <motion.button
        onClick={() => navigateTo("gm-lead-review")}
        whileHover={!reduceMotion ? { scale: 1.005 } : {}}
        whileTap={!reduceMotion ? { scale: 0.995 } : {}}
        className={`w-full h-full text-left border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer group
          ${hasItems
            ? "bg-[var(--hertz-primary-subtle)] border-[var(--hertz-primary)] shadow-[0_0_0_2px_rgba(255,209,0,0.4)] hover:shadow-[var(--shadow-lg)]"
            : "border-[var(--neutral-200)] hover:border-[var(--hertz-primary)] hover:shadow-[var(--shadow-lg)] bg-white hover:bg-[var(--hertz-primary-subtle)]"
          }
          ${hasItems && !reduceMotion ? "animate-hertz-pulse" : ""}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--hertz-primary)] text-[var(--hertz-black)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-[var(--hertz-black)] tracking-tight leading-snug">
                Lead Review
              </h3>
              <p className="text-sm text-[var(--neutral-600)] mt-0.5 line-clamp-2">
                {reviewCount > 0 ? (
                  <>
                    <strong className="text-[var(--hertz-black)]">{reviewCount}</strong>
                    {reviewCount === 1 ? " lead" : " leads"} pending review.
                  </>
                ) : (
                  "No leads pending review."
                )}
              </p>
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--neutral-100)] text-[var(--hertz-black)] px-2 py-0.5 rounded-md">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {dateStr}
                  {daysLeft >= 0 && (
                    <span className="font-semibold">
                      · {daysLeft === 0 ? "Today" : `${daysLeft}d left`}
                    </span>
                  )}
                </span>
              </div>
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
