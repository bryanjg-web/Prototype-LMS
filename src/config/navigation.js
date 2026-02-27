export const roleDefaults = {
  bm: "bm-dashboard",
  gm: "gm-dashboard",
  admin: "admin-dashboard",
};

export const roleNav = {
  bm: [
    { id: "bm-dashboard", label: "Dashboard", icon: "grid" },
    { id: "bm-inbox", label: "Inbox", icon: "inbox" },
    { id: "bm-todo", label: "My To Do", icon: "check-circle" },
    { id: "bm-leads", label: "My Leads", icon: "list" },
    { id: "bm-leaderboard", label: "Leaderboard", icon: "trophy" },
  ],
  gm: [
    { id: "gm-dashboard", label: "Dashboard", icon: "grid" },
    { id: "gm-compliance", label: "Compliance", icon: "bar-chart" },
    { id: "gm-cancelled", label: "Cancelled Leads", icon: "x-circle" },
    { id: "gm-unused", label: "Unused Leads", icon: "list" },
    { id: "gm-review", label: "Lead Review", icon: "columns" },
    { id: "gm-spot-check", label: "Spot Check", icon: "search" },
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
export const drillDownViews = ["bm-lead-detail", "gm-review-detail"];

export const roleMeta = {
  bm: { label: "Branch View", shortLabel: "Branch" },
  gm: { label: "Manager View", shortLabel: "Manager" },
  admin: { label: "Admin", shortLabel: "Admin" },
};

export const roleUsers = {
  bm: { name: "Sarah Chen", initials: "SC" },
  gm: { name: "Mike Torres", initials: "MT" },
  admin: { name: "Lisa Park", initials: "LP" },
};
