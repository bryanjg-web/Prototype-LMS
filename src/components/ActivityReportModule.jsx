import { useMemo } from "react";
import { motion } from "framer-motion";
import { getActivityReportData } from "../selectors/demoSelectors";

const cardAnim = (i, reduced = false) => ({
  initial: reduced ? false : { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: reduced ? 0 : i * 0.06, duration: reduced ? 0.01 : 0.4, ease: [0.4, 0, 0.2, 1] },
});

export default function ActivityReportModule({ navigateTo, leads, reduceMotion }) {
  const data = useMemo(() => getActivityReportData(leads ?? [], 50), [leads]);

  const totalCount = data.all.length;
  const loginCount = data.logins.length;
  const commentCount = data.comments.length;
  const contactCount = data.contact.length;

  return (
    <motion.div {...cardAnim(1, reduceMotion)} className="h-full">
      <motion.button
        onClick={() => navigateTo("gm-activity-report")}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-[var(--hertz-black)] tracking-tight leading-snug">
                Activity Report
              </h3>
              <p className="text-sm text-[var(--neutral-600)] mt-0.5 line-clamp-2">
                {totalCount > 0 ? (
                  <>
                    <strong className="text-[var(--hertz-black)]">{totalCount}</strong>
                    {" "}recent {totalCount === 1 ? "activity" : "activities"} recorded across team.
                  </>
                ) : (
                  "Team logins, comments, and contact activity."
                )}
              </p>
              {totalCount > 0 && (
                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                  {loginCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)] px-2 py-0.5 rounded-md">
                      {loginCount} {loginCount === 1 ? "login" : "logins"}
                    </span>
                  )}
                  {commentCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)] px-2 py-0.5 rounded-md">
                      {commentCount} {commentCount === 1 ? "comment" : "comments"}
                    </span>
                  )}
                  {contactCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)] px-2 py-0.5 rounded-md">
                      {contactCount} {contactCount === 1 ? "contact" : "contacts"}
                    </span>
                  )}
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
