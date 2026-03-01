import { useMemo } from "react";
import { motion } from "framer-motion";
import { getGMLeadsToReviewCount } from "../selectors/demoSelectors";

const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: [0.4, 0, 0.2, 1] },
});

export default function GMLeadReviewModule({ navigateTo, leads, dateRange, reduceMotion }) {
  const reviewCount = useMemo(
    () => getGMLeadsToReviewCount(leads ?? [], dateRange),
    [leads, dateRange]
  );

  const hasItems = reviewCount > 0;

  return (
    <motion.div {...cardAnim(1, reduceMotion)}>
      <motion.button
        onClick={() => navigateTo("gm-lead-review")}
        whileHover={!reduceMotion ? { scale: 1.005 } : {}}
        whileTap={!reduceMotion ? { scale: 0.995 } : {}}
        className={`w-full text-left border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer group
          ${hasItems
            ? "bg-red-50 border-red-200 hover:border-red-300 hover:shadow-[var(--shadow-lg)]"
            : "border-[var(--neutral-200)] hover:border-[var(--hertz-primary)] hover:shadow-[var(--shadow-lg)] bg-white hover:bg-[var(--hertz-primary-subtle)]"
          }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
              hasItems ? "bg-red-100 text-red-700" : "bg-[var(--hertz-primary)] text-[var(--hertz-black)]"
            }`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-[var(--hertz-black)] tracking-tight">
                Lead Review
              </h3>
              <p className="text-sm text-[var(--neutral-600)] mt-0.5">
                {reviewCount > 0 ? (
                  <>
                    <strong className={hasItems ? "text-red-700" : "text-[var(--hertz-black)]"}>{reviewCount}</strong>
                    {reviewCount === 1 ? " lead" : " leads"} pending review — cancelled unreviewed and unused overdue leads needing your attention.
                  </>
                ) : (
                  "No leads pending review. All cancelled and unused leads have been addressed."
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
