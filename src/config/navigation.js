export const roleDefaults = {
  bm: "bm-dashboard",
  gm: "gm-dashboard",
  admin: "admin-dashboard",
};

export const roleNav = {
  bm: [
    { id: "bm-home", label: "Home", icon: "home", sectionId: "home" },
    { id: "bm-work", label: "Work", icon: "briefcase", sectionId: "work" },
    { id: "bm-meeting-prep", label: "Meeting Prep", icon: "columns", sectionId: "work", parentId: "bm-work" },
    { id: "bm-leaderboard", label: "Leaderboard", icon: "trophy", sectionId: "leaderboard", parentId: "bm-work" },
    { id: "bm-dashboard", label: "Summary", icon: "grid", sectionId: "dashboard" },
    { id: "bm-leads", label: "My Leads", icon: "list", sectionId: "lead-pipeline", parentId: "bm-dashboard" },
    { id: "bm-todo", label: "Open Tasks", icon: "check-circle", sectionId: "open-tasks", parentId: "bm-dashboard" },
  ],
  gm: [
    { id: "gm-dashboard", label: "Overview", icon: "grid", sectionId: "dashboard" },
    { id: "gm-compliance", label: "Compliance", icon: "bar-chart", sectionId: "compliance" },
    { id: "gm-leads", label: "Leads", icon: "list" },
    { id: "gm-leaderboard", label: "Leaderboard", icon: "trophy" },
  ],
  admin: [
    { id: "admin-dashboard", label: "Dashboard", icon: "grid" },
    { id: "admin-uploads", label: "Data Uploads", icon: "upload" },
    { id: "admin-org-mapping", label: "Org Mapping", icon: "users" },
    { id: "admin-legend", label: "Legend", icon: "book" },
  ],
};

// Hidden drill-down views (not shown in sidebar)
export const drillDownViews = ["bm-lead-detail", "bm-task-detail", "gm-lead-detail"];

export const roleMeta = {
  bm: { label: "Branch View", shortLabel: "Branch", profileLabel: "Branch Manager" },
  gm: { label: "Manager View", shortLabel: "Manager", profileLabel: "General Manager" },
  admin: { label: "Admin", shortLabel: "Admin", profileLabel: "Admin" },
};

export const roleUsers = {
  bm: { name: "Sarah Chen", initials: "SC" },
  gm: { name: "Mike Torres", initials: "MT" },
  admin: { name: "Lisa Park", initials: "LP" },
};
