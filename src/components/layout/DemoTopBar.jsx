import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../../context/AppContext";
import { useData } from "../../context/DataContext";
import { BMDashboardInbox } from "../interactive/InteractiveDashboard";
import { getAllLeads } from "../../selectors/demoSelectors";

export default function DemoTopBar({ onHelpClick }) {
  const { role, navigateTo, selectLead, selectTask } = useApp();
  const { leads } = useData();
  const [inboxOpen, setInboxOpen] = useState(false);
  const panelRef = useRef(null);

  const directiveCount = role === "bm" ? getAllLeads(leads).filter((l) => l.gmDirective).length : 0;

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setInboxOpen(false);
      }
    }
    if (inboxOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inboxOpen]);

  const handleNavigate = (viewId) => {
    navigateTo(viewId);
    setInboxOpen(false);
  };

  const handleSelectLead = (leadId) => {
    selectLead(leadId);
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
        {role === "bm" && (
          <>
            {/* Plus (Create) button hidden for now - doesn't fully work */}
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
