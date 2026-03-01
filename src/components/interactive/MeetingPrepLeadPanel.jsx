/**
 * Meeting Prep Lead Detail — Slide-in panel from right.
 * Uses the same LeadDetail as the leads table for consistent lead profile display.
 * isReadOnly when viewing past week.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LeadDetail from "../LeadDetail";
import LeadContactCard from "../LeadContactCard";
import ContactButtons from "../ContactButtons";
import InteractiveEnrichmentForm from "./InteractiveEnrichmentForm";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { getLeadById, getTasksForLead } from "../../selectors/demoSelectors";

export default function MeetingPrepLeadPanel({ lead, isReadOnly, onClose }) {
  const { navigateTo, selectTask } = useApp();
  const { userProfile } = useAuth();
  const {
    leads,
    fetchLeadActivities,
    fetchTasksForLead,
    refetchLeads,
    useSupabase,
  } = useData();

  // Use live lead from context so updates reflect; fallback to prop
  const liveLead = getLeadById(leads ?? [], lead?.id) ?? lead;
  const [contactActivities, setContactActivities] = useState([]);
  const [leadTasks, setLeadTasks] = useState([]);

  const loadActivities = useCallback(async () => {
    if (!liveLead?.id || !fetchLeadActivities) return;
    try {
      const activities = await fetchLeadActivities(liveLead.id);
      setContactActivities(activities);
      refetchLeads?.();
    } catch (err) {
      console.error("[MeetingPrepLeadPanel] Failed to fetch activities:", err);
      setContactActivities([]);
    }
  }, [liveLead?.id, fetchLeadActivities, refetchLeads]);

  const loadTasks = useCallback(async () => {
    if (!liveLead?.id) return;
    if (useSupabase) {
      try {
        const t = await fetchTasksForLead(liveLead.id);
        setLeadTasks(t);
      } catch (err) {
        console.error("[MeetingPrepLeadPanel] Failed to fetch tasks:", err);
        setLeadTasks([]);
      }
    } else {
      setLeadTasks(getTasksForLead(liveLead.id));
    }
  }, [liveLead?.id, useSupabase, fetchTasksForLead]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!liveLead) return null;

  const enrichmentSlot = isReadOnly ? (
    <div>
      <h3 className="text-xs font-bold text-[#6E6E6E] uppercase tracking-wider mb-3">BM Comments</h3>
      {liveLead.enrichment?.reason || liveLead.enrichment?.notes ? (
        <div className="space-y-2 text-sm">
          {liveLead.enrichment.reason && (
            <p><span className="text-[var(--neutral-600)]">Reason:</span> {liveLead.enrichment.reason}</p>
          )}
          {liveLead.enrichment.notes && (
            <p><span className="text-[var(--neutral-600)]">Notes:</span> {liveLead.enrichment.notes}</p>
          )}
          {liveLead.enrichment.nextAction && (
            <p><span className="text-[var(--neutral-600)]">Next action:</span> {liveLead.enrichment.nextAction}</p>
          )}
          {liveLead.enrichment.followUpDate && (
            <p><span className="text-[var(--neutral-600)]">Follow-up:</span> {liveLead.enrichment.followUpDate}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--neutral-600)] italic">No comments recorded</p>
      )}
    </div>
  ) : (
    <InteractiveEnrichmentForm lead={liveLead} />
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden />

        {/* Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative w-full max-w-4xl bg-white shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-[var(--neutral-200)] px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-[var(--hertz-black)]">
              Lead Detail
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-[var(--neutral-100)] text-[var(--neutral-600)]"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            <LeadDetail
              lead={liveLead}
              contactSlot={<LeadContactCard lead={liveLead} />}
              contactButtonsSlot={
                <ContactButtons
                  lead={liveLead}
                  agentPhone={userProfile?.phone}
                  userProfile={userProfile}
                  onContactSuccess={loadActivities}
                />
              }
              enrichmentSlot={enrichmentSlot}
              tasksSlot={
                <div data-onboarding="tasks-section">
                  <h3 className="text-xs font-bold text-[#6E6E6E] uppercase tracking-wider mb-3">Tasks</h3>
                  {leadTasks.length === 0 ? (
                    <p className="text-sm text-[var(--neutral-600)]">No tasks for this lead.</p>
                  ) : (
                    <ul className="space-y-2">
                      {leadTasks.map((task) => (
                        <li
                          key={task.id}
                          onClick={() => {
                            selectTask?.(task.id);
                            navigateTo("bm-task-detail");
                          }}
                          className="flex items-center justify-between p-2 rounded border border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] cursor-pointer transition-colors"
                        >
                          <span className="font-medium text-sm text-[var(--hertz-black)] truncate">{task.title}</span>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${
                            task.status === "Done" ? "bg-[var(--color-success)]/15 text-[var(--color-success)]" :
                            task.status === "In Progress" ? "bg-[var(--hertz-primary)]/25 text-[var(--hertz-black)]" :
                            "bg-[var(--color-error)]/15 text-[var(--color-error)]"
                          }`}>
                            {task.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              }
              contactActivities={contactActivities}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
