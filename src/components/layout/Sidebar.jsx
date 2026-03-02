import { useMemo, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { roleNav, roleMeta, roleUsers, drillDownViews } from "../../config/navigation";
import {
  getDateRangePresets,
  getMeetingPrepOutstandingCount,
  getDefaultBranchForDemo,
  getGMOutstandingCount,
  getGMLeadsToReviewCount,
  getTasksForGMBranches,
  getBranchesWithFlags,
  resolveGMName,
} from "../../selectors/demoSelectors";

const iconMap = {
  home: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  grid: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  list: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  "bar-chart": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  "x-circle": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  columns: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  upload: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  inbox: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  "check-circle": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  book: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  trophy: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14M9 3v2a3 3 0 003 3v0a3 3 0 003-3V3M5 3a2 2 0 00-2 2v1a4 4 0 004 4h0M19 3a2 2 0 012 2v1a4 4 0 01-4 4h0M7 10v1a5 5 0 005 5v0a5 5 0 005-5v-1M9 21h6M12 16v5" />
    </svg>
  ),
  briefcase: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  activity: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
};

const SECTION_VIEW_IDS = {
  bm: ["bm-home", "bm-dashboard", "bm-leads", "bm-todo", "bm-work", "bm-meeting-prep", "bm-leaderboard"],
  gm: ["gm-todos", "gm-meeting-prep", "gm-spot-check", "gm-overview", "gm-business-metrics", "gm-team-performance", "gm-activity-report", "gm-leaderboard"],
};

/** Derives initials from display name (e.g. "Sarah Chen" → "SC"). */
function getInitials(displayName) {
  if (!displayName || typeof displayName !== "string") return "?";
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const { role, activeView, scrollActiveView, scrollDirection, sidebarCollapsed, navigateTo, toggleSidebar } = useApp();
  const isProfileActive = activeView === "profile";
  const reduceMotion = useReducedMotion();
  const { signOut, userProfile } = useAuth();
  const { leads, gmTasks } = useData();
  const navItems = role ? roleNav[role] || [] : [];

  // Outstanding actions for Meeting Prep (this week only) — leads needing comments + data mismatches
  const meetingPrepOutstanding = useMemo(() => {
    if (role !== "bm") return 0;
    const presets = getDateRangePresets();
    const thisWeek = presets.find((p) => p.key === "this_week");
    if (!thisWeek) return 0;
    const dateRange = { start: thisWeek.start, end: thisWeek.end };
    const branch = (userProfile?.branch?.trim() || getDefaultBranchForDemo());
    return getMeetingPrepOutstandingCount(leads ?? [], dateRange, branch);
  }, [role, leads, userProfile?.branch]);

  const gmName = resolveGMName(userProfile?.displayName, userProfile?.id);

  // GM Meeting Prep: outstanding branch items + open tasks to chase
  const gmMeetingPrepOutstanding = useMemo(() => {
    if (role !== "gm") return 0;
    const presets = getDateRangePresets();
    const thisWeek = presets.find((p) => p.key === "this_week");
    if (!thisWeek) return 0;
    const dateRange = { start: thisWeek.start, end: thisWeek.end };
    const outstanding = getGMOutstandingCount(leads ?? [], dateRange, gmName);
    const openTasks = getTasksForGMBranches(gmTasks, gmName);
    return outstanding + openTasks.length;
  }, [role, leads, gmTasks, gmName]);

  // GM Spot Check: branches with red flags (untouched leads or mismatches)
  const gmSpotCheckFlags = useMemo(() => {
    if (role !== "gm") return 0;
    const presets = getDateRangePresets();
    const thisWeek = presets.find((p) => p.key === "this_week");
    if (!thisWeek) return 0;
    const dateRange = { start: thisWeek.start, end: thisWeek.end };
    return getBranchesWithFlags(leads ?? [], dateRange, gmName).flaggedBranches;
  }, [role, leads, gmName]);

  // GM Lead Review: leads pending review (cancelled unreviewed + unused overdue)
  const gmLeadReviewCount = useMemo(() => {
    if (role !== "gm") return 0;
    const presets = getDateRangePresets();
    const thisWeek = presets.find((p) => p.key === "this_week");
    if (!thisWeek) return 0;
    const dateRange = { start: thisWeek.start, end: thisWeek.end };
    return getGMLeadsToReviewCount(leads ?? [], dateRange);
  }, [role, leads]);

  const BM_SCROLL_VIEWS = ["bm-home", "bm-dashboard", "bm-leads", "bm-todo"];
  const GM_SCROLL_VIEWS = ["gm-overview", "gm-business-metrics", "gm-team-performance", "gm-todos"];
  const isOnScrollPage = BM_SCROLL_VIEWS.includes(activeView) || GM_SCROLL_VIEWS.includes(activeView);
  const isSectionView = role && SECTION_VIEW_IDS[role]?.includes(activeView);
  const resolvedActive = isOnScrollPage && scrollActiveView
    ? scrollActiveView
    : drillDownViews.includes(activeView)
      ? activeView === "bm-task-detail"
        ? "bm-todo"
        : activeView === "gm-lead-detail"
          ? "gm-spot-check"
          : activeView.replace(/-detail$/, "").replace("bm-lead", "bm-leads")
      : activeView;

  // BM: Work sub-sections (Meeting Prep, Leaderboard)
  const workChildIds = ["bm-meeting-prep", "bm-leaderboard"];
  const summaryChildIds = ["bm-leads", "bm-todo"];
  const hasWorkChildren = role === "bm" && workChildIds.some((id) => navItems.some((n) => n.id === id));
  const hasSummaryChildren = role === "bm" && summaryChildIds.some((id) => navItems.some((n) => n.id === id));
  const inWorkSection = resolvedActive === "bm-work" || workChildIds.includes(resolvedActive);
  const inSummarySection = resolvedActive === "bm-dashboard" || summaryChildIds.includes(resolvedActive);
  const workExpanded =
    inWorkSection || (inSummarySection && scrollDirection === "down");
  const summaryExpanded =
    inSummarySection || (inWorkSection && scrollDirection === "down");

  // GM: Work sub-sections (Meeting Prep, Lead Review); Summary sub-sections (Business Metrics, Team Performance)
  const gmTodosChildIds = ["gm-meeting-prep", "gm-spot-check"];
  const gmOverviewChildIds = ["gm-business-metrics", "gm-team-performance", "gm-activity-report"];
  const hasGmOverviewChildren = role === "gm" && gmOverviewChildIds.some((id) => navItems.some((n) => n.id === id));
  const hasGmTodosChildren = role === "gm" && gmTodosChildIds.some((id) => navItems.some((n) => n.id === id));
  const inGmOverviewSection = resolvedActive === "gm-overview" || gmOverviewChildIds.includes(resolvedActive);
  const inGmTodosSection = resolvedActive === "gm-todos" || gmTodosChildIds.includes(resolvedActive);
  const gmTodosExpanded =
    inGmTodosSection || (inGmOverviewSection && scrollDirection === "down");
  const gmOverviewExpanded =
    inGmOverviewSection || (inGmTodosSection && scrollDirection === "down");

  const navScrollRef = useRef(null);
  useEffect(() => {
    if (!navScrollRef.current || !resolvedActive) return;
    const activeEl = navScrollRef.current.querySelector(`[data-nav-id="${resolvedActive}"]`);
    if (activeEl) activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [resolvedActive]);

  return (
    <motion.div
      layout={!reduceMotion}
      initial={false}
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[#F8F8F8] border-r border-[#E5E5E5] flex flex-col shrink-0 overflow-hidden"
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="p-2.5 text-[#666666] hover:text-[#272425] self-end cursor-pointer transition-colors duration-200 hover:scale-110 active:scale-95"
        title={sidebarCollapsed ? "Expand sidebar" : "Close sidebar"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sidebarCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
      </button>

      {/* Nav items — scrollable so Open Tasks is reachable when expanded */}
      <nav ref={navScrollRef} className="flex-1 min-h-0 overflow-y-auto px-2 space-y-0.5 min-w-0" data-onboarding="sidebar-nav">
        {navItems.map((item, i) => {
          // BM parent/child visibility
          const isWorkChild = item.parentId === "bm-work";
          const isSummaryChild = item.parentId === "bm-dashboard";
          if (isWorkChild && !workExpanded) return null;
          if (isSummaryChild && !summaryExpanded) return null;

          // GM parent/child visibility
          const isGmOverviewChild = item.parentId === "gm-overview";
          const isGmTodosChild = item.parentId === "gm-todos";
          if (isGmOverviewChild && !gmOverviewExpanded) return null;
          if (isGmTodosChild && !gmTodosExpanded) return null;

          // Determine active state
          let isActive;
          if (item.id === "bm-work") {
            isActive = workChildIds.includes(resolvedActive) || resolvedActive === "bm-work";
          } else if (item.id === "bm-dashboard") {
            isActive = summaryChildIds.includes(resolvedActive) || resolvedActive === "bm-dashboard";
          } else if (item.id === "gm-overview") {
            isActive = gmOverviewChildIds.includes(resolvedActive) || resolvedActive === "gm-overview";
          } else if (item.id === "gm-todos") {
            isActive = gmTodosChildIds.includes(resolvedActive) || resolvedActive === "gm-todos";
          } else {
            isActive = resolvedActive === item.id;
          }

          const isChild = !!item.parentId;

          const showMeetingPrepBadge =
            item.id === "bm-meeting-prep" && meetingPrepOutstanding > 0;
          const showGmMeetingPrepBadge =
            item.id === "gm-meeting-prep" && gmMeetingPrepOutstanding > 0;
          const showGmSpotCheckBadge =
            item.id === "gm-spot-check" && gmSpotCheckFlags > 0;
          const showGmLeadReviewBadge =
            item.id === "gm-lead-review" && gmLeadReviewCount > 0;

          const badgeCount =
            showMeetingPrepBadge ? meetingPrepOutstanding
            : showGmMeetingPrepBadge ? gmMeetingPrepOutstanding
            : showGmSpotCheckBadge ? gmSpotCheckFlags
            : showGmLeadReviewBadge ? gmLeadReviewCount
            : 0;
          const badgeTitle =
            badgeCount === 1
              ? showGmLeadReviewBadge
                ? "1 lead needing review"
                : "1 action needed before your meeting"
              : showGmLeadReviewBadge
                ? `${badgeCount} leads needing review`
                : `${badgeCount} actions needed before your meeting`;

          const showBadge = showMeetingPrepBadge || showGmMeetingPrepBadge || showGmSpotCheckBadge || showGmLeadReviewBadge;

          // Parent items with chevrons
          const isWorkParent = item.id === "bm-work" && hasWorkChildren;
          const isSummaryParent = item.id === "bm-dashboard" && hasSummaryChildren;
          const isGmOverviewParent = item.id === "gm-overview" && hasGmOverviewChildren;
          const isGmTodosParent = item.id === "gm-todos" && hasGmTodosChildren;
          const hasChevron = isWorkParent || isSummaryParent || isGmOverviewParent || isGmTodosParent;

          // Chevron expanded state
          const chevronExpanded = isWorkParent ? workExpanded
            : isSummaryParent ? summaryExpanded
            : isGmOverviewParent ? gmOverviewExpanded
            : isGmTodosParent ? gmTodosExpanded
            : false;

          // Navigation target: parent items scroll to first child section
          let navTarget = item.id;
          if (item.id === "bm-work") navTarget = "bm-meeting-prep";
          if (item.id === "gm-overview") navTarget = "gm-overview";
          if (item.id === "gm-todos") navTarget = "gm-todos";

          return (
            <div key={item.id} data-nav-id={item.id} className="flex items-center min-w-0">
              <motion.button
                layout={!reduceMotion}
                initial={false}
                onClick={() => navigateTo(navTarget)}
                whileHover={!reduceMotion ? { x: 2, transition: { duration: 0.15 } } : {}}
                whileTap={!reduceMotion ? { scale: 0.98 } : {}}
                className={`flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer min-w-0 ${
                  !sidebarCollapsed && isChild ? "pl-6" : ""
                } ${
                  isActive
                    ? "bg-[#FFD100]/15 text-[#272425] font-semibold ring-1 ring-[#FFD100]/40"
                    : "text-[#666666] hover:bg-white/80 hover:text-[#272425]"
                }`}
                title={showBadge ? badgeTitle : item.label}
              >
                <span className={`relative shrink-0 ${isActive ? "text-[#FFD100]" : ""}`}>
                  {iconMap[item.icon]}
                  {showBadge && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--hertz-primary)] text-[var(--hertz-black)] text-[10px] font-bold shadow-[var(--shadow-sm)]"
                      aria-label={badgeTitle}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </span>
                {!sidebarCollapsed && (
                  <>
                    <span className={`truncate ${hasChevron ? "shrink-0" : ""}`}>{item.label}</span>
                    {hasChevron && (
                      <span className="ml-auto shrink-0 pointer-events-none" aria-expanded={chevronExpanded}>
                        <motion.svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          animate={{ rotate: chevronExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </motion.svg>
                      </span>
                    )}
                  </>
                )}
              </motion.button>
            </div>
          );
        })}
      </nav>

      {/* Footer — user, settings, logout */}
      <div className="border-t border-[#E5E5E5] mx-2 mt-auto" />
      <div className={`flex flex-col px-2 py-3 space-y-0.5 ${sidebarCollapsed ? "items-center" : ""}`}>
        {role && (
          <button
            onClick={() => navigateTo("profile")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer ${
              isProfileActive ? "bg-[var(--hertz-primary)]/15 ring-1 ring-[var(--hertz-primary)]/40" : "hover:bg-white/80"
            } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
            title="View profile"
            aria-current={isProfileActive ? "page" : undefined}
          >
            {userProfile?.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="w-6 h-6 rounded-full bg-[var(--hertz-primary)] text-[var(--hertz-black)] text-[10px] font-bold flex items-center justify-center shrink-0">
                {userProfile ? getInitials(userProfile.displayName) : roleUsers[role]?.initials}
              </span>
            )}
            {!sidebarCollapsed && (
              <span className="text-xs text-[var(--hertz-black)] font-medium truncate">
                {userProfile?.displayName ?? roleUsers[role]?.name}
              </span>
            )}
          </button>
        )}
        <button
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-[#666666] hover:bg-white/80 hover:text-[#272425] transition-colors cursor-pointer ${
            sidebarCollapsed ? "justify-center px-0" : ""
          }`}
          title="Settings"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {!sidebarCollapsed && <span>Settings</span>}
        </button>
        <button
          onClick={() => signOut()}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-[#666666] hover:bg-white/80 hover:text-[#272425] transition-colors cursor-pointer ${
            sidebarCollapsed ? "justify-center px-0" : ""
          }`}
          title="Logout"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  );
}
