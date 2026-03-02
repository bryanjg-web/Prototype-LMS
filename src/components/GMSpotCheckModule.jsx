import { useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { getBranchesWithFlags, getDateRangePresets, resolveGMName } from "../selectors/demoSelectors";

const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: [0.4, 0, 0.2, 1] },
});

export default function GMSpotCheckModule({ navigateTo, leads, dateRange, reduceMotion }) {
  const { userProfile } = useAuth();
  const { loading } = useData();
  const gmName = resolveGMName(userProfile?.displayName, userProfile?.id);

  const thisWeekRange = useMemo(() => {
    const presets = getDateRangePresets();
    const thisWeek = presets.find((p) => p.key === "this_week");
    return thisWeek ? { start: thisWeek.start, end: thisWeek.end } : null;
  }, [loading]);

  const { flaggedBranches, totalBranches, flagged } = useMemo(() => {
    const range = thisWeekRange ?? dateRange;
    return getBranchesWithFlags(leads ?? [], range, gmName);
  }, [leads, thisWeekRange, dateRange, gmName]);

  const hasFlags = flaggedBranches > 0;

  return (
    <motion.div {...cardAnim(1, reduceMotion)} className="h-full">
      <motion.button
        onClick={() => navigateTo("gm-spot-check")}
        whileHover={!reduceMotion ? { scale: 1.005 } : {}}
        whileTap={!reduceMotion ? { scale: 0.995 } : {}}
        className={`w-full h-full text-left border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer group
          ${hasFlags
            ? "bg-[var(--hertz-primary-subtle)] border-[var(--hertz-primary)] shadow-[0_0_0_2px_rgba(255,209,0,0.4)] hover:shadow-[var(--shadow-lg)]"
            : "border-[var(--neutral-200)] hover:border-[var(--hertz-primary)] hover:shadow-[var(--shadow-lg)] bg-white hover:bg-[var(--hertz-primary-subtle)]"
          }
          ${hasFlags && !reduceMotion ? "animate-hertz-pulse" : ""}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--hertz-primary)] text-[var(--hertz-black)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-[var(--hertz-black)] tracking-tight leading-snug">
                Spot Check
              </h3>
              <p className="text-sm text-[var(--neutral-600)] mt-0.5 line-clamp-2">
                {hasFlags ? (
                  <>
                    <strong className="text-[var(--hertz-black)]">{flaggedBranches}</strong>
                    {flaggedBranches === 1 ? " branch" : " branches"} with untouched leads or mismatches.
                  </>
                ) : (
                  `All ${totalBranches} branches look clean — no red flags.`
                )}
              </p>
              {flagged.length > 0 ? (
                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                  {flagged.slice(0, 2).map((f) => (
                    <span key={f.branch} className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)] px-2 py-0.5 rounded-md">
                      {f.branch}: {f.untouched > 0 && `${f.untouched} untouched`}{f.untouched > 0 && f.mismatches > 0 && ", "}{f.mismatches > 0 && `${f.mismatches} mismatch`}
                    </span>
                  ))}
                  {flagged.length > 2 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)] px-2 py-0.5 rounded-md">
                      +{flagged.length - 2} more
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--color-success-light)] text-[var(--color-success)] px-2 py-0.5 rounded-md">
                    All {totalBranches} branches clear
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
