import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../../context/AppContext";
import { useData } from "../../context/DataContext";
import { BMDashboardInbox } from "../interactive/InteractiveDashboard";
import { getAllLeads } from "../../selectors/demoSelectors";

const createMenuItems = [
  {
    id: "new-lead",
    label: "New Lead",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    id: "new-task",
    label: "New Task",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "log-call",
    label: "Log a Call",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    id: "add-comment",
    label: "Add a Comment",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
  },
];

export default function DemoTopBar({ onHelpClick }) {
  const { role, navigateTo, selectLead, selectTask } = useApp();
  const { leads } = useData();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const panelRef = useRef(null);
  const createMenuRef = useRef(null);

  const directiveCount = role === "bm" ? getAllLeads(leads).filter((l) => l.gmDirective).length : 0;

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setInboxOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
        setCreateMenuOpen(false);
      }
    }
    if (inboxOpen || createMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inboxOpen, createMenuOpen]);

  const handleNavigate = (viewId) => {
    navigateTo(viewId);
    setInboxOpen(false);
  };

  const handleSelectLead = (leadId) => {
    selectLead(leadId);
  };

  const handleCreateAction = (actionId) => {
    setCreateMenuOpen(false);
    switch (actionId) {
      case "new-lead":
        navigateTo("bm-leads");
        break;
      case "new-task":
        navigateTo("bm-todo");
        break;
      case "log-call":
        navigateTo("bm-leads");
        break;
      case "add-comment":
        navigateTo("bm-todo");
        break;
      default:
        break;
    }
  };

  return (
    <div className="h-[52px] bg-[#1A1A1A] flex items-center px-6 shrink-0 relative z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (role) {
              navigateTo(`${role}-dashboard`);
              selectLead(null);
              selectTask(null);
            }
          }}
          className="flex items-center hover:opacity-90 transition-opacity cursor-pointer"
          title="Back to dashboard"
          aria-label="Back to dashboard"
        >
          <img src="/Hertz-Line_White_2020.png" alt="Hertz" className="h-7" />
        </button>
        <span className="text-white/40 text-xs">|</span>
        <span className="text-white/70 text-sm">LEO: Your Lead Management System</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {role === "bm" && (
          <>
            {onHelpClick && (
              <button
                onClick={onHelpClick}
                data-onboarding="help-button"
                className="p-2 text-white/70 hover:text-[#FFD100] hover:bg-white/10 rounded-md transition-colors duration-200 cursor-pointer"
                title="Replay onboarding tour"
                aria-label="Replay onboarding tour"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </button>
            )}
            <div ref={createMenuRef} className="relative">
              <button
                onClick={() => setCreateMenuOpen((v) => !v)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors duration-200 cursor-pointer"
                title="Create"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              <AnimatePresence>
                {createMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute right-0 top-full mt-1 w-[200px] py-1 bg-white rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.2)] border border-[#E5E5E5] z-50"
                  >
                    {createMenuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleCreateAction(item.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[#272425] hover:bg-[#FFD100]/15 transition-colors cursor-pointer"
                      >
                        <span className="text-[#666666] shrink-0">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div ref={panelRef}>
              <button
                onClick={() => setInboxOpen((v) => !v)}
                data-onboarding="inbox-button"
                className="relative p-2 text-white/70 hover:text-white transition-colors duration-200 cursor-pointer"
                title="Inbox"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                {directiveCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#FFD100] text-[#272425] text-[10px] font-bold px-1">
                    {directiveCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {inboxOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute right-6 top-[52px] w-[720px] max-h-[480px] overflow-y-auto bg-white rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.2)] border border-[#E5E5E5] z-50"
                  >
                    <div className="p-5">
                      <BMDashboardInbox navigateTo={handleNavigate} selectLead={handleSelectLead} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
