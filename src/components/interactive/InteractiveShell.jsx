import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import InteractiveDashboard from "./InteractiveDashboard";
import InteractiveLeadDetail from "./InteractiveLeadDetail";
import InteractiveUploads from "./InteractiveUploads";
import InteractiveOrgMapping from "./InteractiveOrgMapping";
import InteractiveLegend from "./InteractiveLegend";
import InteractiveThreeColumn from "./InteractiveThreeColumn";
import ProfileView from "../ProfileView";
import InteractiveTaskDetail from "./InteractiveTaskDetail";
import InteractiveMeetingPrepPage from "./InteractiveMeetingPrepPage";
import InteractiveLeaderboardPage from "./InteractiveLeaderboardPage";
import InteractiveGMLeadsPage from "./InteractiveGMLeadsPage";
import InteractiveGMLeaderboardPage from "./InteractiveGMLeaderboardPage";
import InteractiveGMMeetingPrepPage from "./InteractiveGMMeetingPrepPage";
import InteractiveGMSpotCheckPage from "./InteractiveGMSpotCheckPage";
import InteractiveGMActivityReportPage from "./InteractiveGMActivityReportPage";

const viewComponents = {
  "bm-home": InteractiveDashboard,
  "bm-dashboard": InteractiveDashboard,
  "bm-leads": InteractiveDashboard,
  "bm-todo": InteractiveDashboard,
  "bm-lead-detail": InteractiveLeadDetail,
  "bm-task-detail": InteractiveTaskDetail,
  "bm-meeting-prep": InteractiveMeetingPrepPage,
  "bm-leaderboard": InteractiveLeaderboardPage,
  "gm-overview": InteractiveDashboard,
  "gm-business-metrics": InteractiveDashboard,
  "gm-team-performance": InteractiveDashboard,
  "gm-todos": InteractiveDashboard,
  "gm-meeting-prep": InteractiveGMMeetingPrepPage,
  "gm-task-detail": InteractiveTaskDetail,
  "gm-lead-detail": InteractiveLeadDetail,
  "gm-lead-review": InteractiveGMLeadsPage,
  "gm-spot-check": InteractiveGMSpotCheckPage,
  "gm-leaderboard": InteractiveGMLeaderboardPage,
  "gm-activity-report": InteractiveGMActivityReportPage,
  "admin-dashboard": InteractiveDashboard,
  "admin-uploads": InteractiveUploads,
  "admin-org-mapping": InteractiveOrgMapping,
  "admin-legend": InteractiveLegend,
  profile: ProfileView,
};

// Views that share the same scrollable page - use stable key to avoid remount/refresh
// Meeting Prep and Leaderboard are separate pages; Summary (dashboard) has Home, Work, My Leads + Open Tasks
const BM_MAIN_VIEWS = ["bm-home", "bm-dashboard", "bm-leads", "bm-todo"];
const GM_MAIN_VIEWS = ["gm-overview", "gm-todos", "gm-business-metrics", "gm-team-performance"];

function getShellKey(activeView) {
  if (BM_MAIN_VIEWS.includes(activeView)) return "bm-main";
  if (GM_MAIN_VIEWS.includes(activeView)) return "gm-main";
  return activeView;
}

export default function InteractiveShell() {
  const { activeView } = useApp();
  const ViewComponent = viewComponents[activeView];

  // Scroll to top when shell mounts (e.g. after login, refresh)
  useEffect(() => {
    window.scrollTo(0, 0);
    const root = document.getElementById("dashboard-scroll-root");
    if (root) root.scrollTo(0, 0);
  }, []);

  if (!ViewComponent) {
    return (
      <div className="h-full flex items-center justify-center text-[#6E6E6E]">
        Select a view from the sidebar.
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={getShellKey(activeView)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="h-full"
      >
        <div id="dashboard-scroll-root" className="px-8 py-4 lg:px-12 lg:py-4 h-full min-h-0 overflow-y-auto overscroll-none bg-[var(--neutral-50)]">
          <ViewComponent />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
