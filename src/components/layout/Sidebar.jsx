import { useApp } from "../../context/AppContext";
import { roleNav, roleMeta, roleUsers, drillDownViews } from "../../config/navigation";

const iconMap = {
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
};

const roles = ["bm", "gm", "admin"];

export default function Sidebar() {
  const { role, mode, activeView, sidebarCollapsed, setRole, setMode, navigateTo, toggleSidebar } = useApp();
  const isJourney = mode === "journey";
  const navItems = role ? roleNav[role] || [] : [];

  // Resolve parent view for drill-down highlighting
  const resolvedActive = drillDownViews.includes(activeView)
    ? activeView.replace(/-detail$/, "").replace("bm-lead", "bm-leads")
    : activeView;

  return (
    <div
      className={`bg-gray-50 border-r border-[#E6E6E6] flex flex-col shrink-0 transition-all duration-200 ${
        sidebarCollapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="p-3 text-[#6E6E6E] hover:text-[#1A1A1A] self-end cursor-pointer"
        title={sidebarCollapsed ? "Expand" : "Collapse"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sidebarCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          )}
        </svg>
      </button>

      {/* Role selector */}
      <div className={`px-3 mb-4 ${sidebarCollapsed ? "px-1" : ""}`}>
        {!sidebarCollapsed && (
          <p className="text-[10px] text-[#6E6E6E] uppercase tracking-wider mb-2 px-2">Role</p>
        )}
        <div className={`flex ${sidebarCollapsed ? "flex-col items-center gap-1" : "gap-1"}`}>
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`text-xs font-medium rounded px-2 py-1.5 transition-colors cursor-pointer ${
                role === r
                  ? "bg-[#F5C400] text-[#1A1A1A]"
                  : "text-[#6E6E6E] hover:bg-gray-200"
              }`}
              title={roleMeta[r].label}
            >
              {sidebarCollapsed ? roleMeta[r].shortLabel : roleMeta[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#E6E6E6] mx-3 mb-3" />

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = resolvedActive === item.id;
          const disabled = isJourney;
          return (
            <button
              key={item.id}
              onClick={() => !disabled && navigateTo(item.id)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors cursor-pointer ${
                disabled
                  ? "text-[#E6E6E6] cursor-not-allowed"
                  : isActive
                  ? "bg-[#F5C400]/10 text-[#1A1A1A] font-medium"
                  : "text-[#6E6E6E] hover:bg-gray-100 hover:text-[#1A1A1A]"
              }`}
              title={item.label}
            >
              <span className={isActive ? "text-[#F5C400]" : ""}>{iconMap[item.icon]}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}

        {isJourney && role && !sidebarCollapsed && (
          <div className="mt-4 px-3 py-2 text-xs text-[#6E6E6E] italic">
            Guided tour active
          </div>
        )}
      </nav>

      {/* Footer — user, settings, logout */}
      <div className="border-t border-[#E6E6E6] mx-3 mt-auto" />
      <div className={`px-2 py-3 space-y-1 ${sidebarCollapsed ? "items-center" : ""}`}>
        {/* User alias */}
        {role && (
          <div className={`flex items-center gap-3 px-3 py-2 ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
            <span className="w-7 h-7 rounded-full bg-[#F5C400] text-[#1A1A1A] text-xs font-bold flex items-center justify-center shrink-0">
              {roleUsers[role]?.initials}
            </span>
            {!sidebarCollapsed && (
              <span className="text-sm text-[#1A1A1A] truncate">{roleUsers[role]?.name}</span>
            )}
          </div>
        )}

        {/* Settings */}
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-[#6E6E6E] hover:bg-gray-100 hover:text-[#1A1A1A] transition-colors cursor-pointer ${
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

        {/* Logout */}
        <button
          onClick={() => { setMode("interactive"); setRole(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-[#6E6E6E] hover:bg-gray-100 hover:text-[#1A1A1A] transition-colors cursor-pointer ${
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
    </div>
  );
}
