import { useMemo } from "react";
import { motion } from "framer-motion";
import { getGMBranchLeaderboard } from "../selectors/demoSelectors";

const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: [0.4, 0, 0.2, 1] },
});

export default function GMLeaderboardModule({ navigateTo, leads, dateRange, reduceMotion }) {
  const leaderboardData = useMemo(
    () => (dateRange ? getGMBranchLeaderboard(leads ?? [], dateRange, "conversionRate", "my_branches") : null),
    [leads, dateRange]
  );

  const topBranch = leaderboardData?.sorted?.[0];
  const bottomBranch = leaderboardData?.sorted?.length > 1
    ? leaderboardData.sorted[leaderboardData.sorted.length - 1]
    : null;

  return (
    <motion.div {...cardAnim(0, reduceMotion)} className="h-full">
      <motion.button
        onClick={() => navigateTo("gm-leaderboard")}
        whileHover={!reduceMotion ? { scale: 1.005 } : {}}
        whileTap={!reduceMotion ? { scale: 0.995 } : {}}
        className="w-full h-full text-left border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer group
          border-[var(--neutral-200)] hover:border-[var(--hertz-primary)] hover:shadow-[var(--shadow-lg)]
          bg-white hover:bg-[var(--hertz-primary-subtle)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="shrink-0 w-12 h-12 rounded-lg bg-[var(--hertz-primary)] flex items-center justify-center text-[var(--hertz-black)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14M9 3v2a3 3 0 003 3v0a3 3 0 003-3V3M5 3a2 2 0 00-2 2v1a4 4 0 004 4h0M19 3a2 2 0 012 2v1a4 4 0 01-4 4h0M7 10v1a5 5 0 005 5v0a5 5 0 005-5v-1M9 21h6M12 16v5" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-[var(--hertz-black)] tracking-tight leading-snug">
                Leaderboard
              </h3>
              <p className="text-sm text-[var(--neutral-600)] mt-0.5 line-clamp-2">
                {topBranch ? (
                  <>
                    <strong className="text-[var(--hertz-black)]">{topBranch.branch}</strong> leads at{" "}
                    <strong className="text-[var(--color-success)]">{topBranch.conversionRate}%</strong> conversion.
                  </>
                ) : (
                  "Compare branch performance by conversion, contact speed, and compliance."
                )}
              </p>
              {bottomBranch && bottomBranch.conversionRate != null && (
                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)] px-2 py-0.5 rounded-md">
                    Needs attention: {bottomBranch.branch} ({bottomBranch.conversionRate}%)
                  </span>
                </div>
              )}
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
