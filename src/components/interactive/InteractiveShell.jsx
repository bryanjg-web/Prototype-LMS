import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import InteractiveDashboard from "./InteractiveDashboard";
import InteractiveLeadQueue from "./InteractiveLeadQueue";
import InteractiveInbox from "./InteractiveInbox";
import InteractiveToDo from "./InteractiveToDo";
import InteractiveLeadDetail from "./InteractiveLeadDetail";
import InteractiveComplianceDashboard from "./InteractiveComplianceDashboard";
import InteractiveCancelledLeads from "./InteractiveCancelledLeads";
import InteractiveUnusedLeads from "./InteractiveUnusedLeads";
import InteractiveThreeColumn from "./InteractiveThreeColumn";
import InteractiveSpotCheck from "./InteractiveSpotCheck";
import InteractiveUploads from "./InteractiveUploads";
import InteractiveOrgMapping from "./InteractiveOrgMapping";
import InteractiveLegend from "./InteractiveLegend";
import InteractiveLeaderboard from "./InteractiveLeaderboard";

const viewComponents = {
  "bm-dashboard": InteractiveDashboard,
  "bm-inbox": InteractiveInbox,
  "bm-todo": InteractiveToDo,
  "bm-leads": InteractiveLeadQueue,
  "bm-lead-detail": InteractiveLeadDetail,
  "gm-dashboard": InteractiveDashboard,
  "gm-compliance": InteractiveComplianceDashboard,
  "gm-cancelled": InteractiveCancelledLeads,
  "gm-unused": InteractiveUnusedLeads,
  "gm-review": InteractiveThreeColumn,
  "gm-spot-check": InteractiveSpotCheck,
  "admin-dashboard": InteractiveDashboard,
  "admin-uploads": InteractiveUploads,
  "admin-org-mapping": InteractiveOrgMapping,
  "admin-legend": InteractiveLegend,
  "bm-leaderboard": InteractiveLeaderboard,
  "gm-leaderboard": InteractiveLeaderboard,
};

export default function InteractiveShell() {
  const { activeView } = useApp();
  const ViewComponent = viewComponents[activeView];

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
        key={activeView}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="h-full"
      >
        <div className="px-8 py-6 h-full overflow-auto">
          <ViewComponent />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
