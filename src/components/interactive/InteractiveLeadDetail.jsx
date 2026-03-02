import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import BackButton from "../BackButton";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { getLeadById, getTasksForLead, getUpcomingCommunications } from "../../selectors/demoSelectors";
import LeadDetail from "../LeadDetail";
import LeadContactCard from "../LeadContactCard";
import ContactButtons from "../ContactButtons";
import UpcomingCommunications from "../UpcomingCommunications";
import InteractiveEnrichmentForm from "./InteractiveEnrichmentForm";
import GMDirectiveSection from "../GMDirectiveSection";

export default function InteractiveLeadDetail() {
  const { selectedLeadId, navigateTo, selectTask, activeView, role } = useApp();
  const isGMContext = activeView === "gm-lead-detail" || role === "gm";
  const backView = isGMContext ? "gm-lead-review" : "bm-leads";
  const backLabel = isGMContext ? "Back to Lead Review" : "Back to leads";
  const { userProfile } = useAuth();
  const { leads, fetchLeadActivities, fetchTasksForLead, refetchLeads, useSupabase, updateTaskStatus } = useData();
  const lead = getLeadById(leads, selectedLeadId);
  const [contactActivities, setContactActivities] = useState([]);
  const [leadTasks, setLeadTasks] = useState([]);

  const loadActivities = useCallback(async () => {
    if (!lead?.id || !fetchLeadActivities) return;
    try {
      const activities = await fetchLeadActivities(lead.id);
      setContactActivities(activities);
      refetchLeads?.();
    } catch (err) {
      console.error("[InteractiveLeadDetail] Failed to fetch activities:", err);
      setContactActivities([]);
    }
  }, [lead?.id, fetchLeadActivities, refetchLeads]);

  const loadTasks = useCallback(async () => {
    if (!lead?.id) return;
    if (useSupabase) {
      try {
        const t = await fetchTasksForLead(lead.id);
        setLeadTasks(t);
      } catch (err) {
        console.error("[InteractiveLeadDetail] Failed to fetch tasks:", err);
        setLeadTasks([]);
      }
    } else {
      setLeadTasks(getTasksForLead(lead.id));
    }
  }, [lead?.id, useSupabase, fetchTasksForLead]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center text-[#6E6E6E]">
        No lead selected.
        <BackButton onClick={() => navigateTo(backView)} label={backLabel} className="ml-2 mb-0" />
      </div>
    );
  }

  return (
    <div>
      <BackButton onClick={() => navigateTo(backView)} label={backLabel} />
      <LeadDetail
        lead={lead}
        contactSlot={<LeadContactCard lead={lead} />}
        contactButtonsSlot={
          <ContactButtons
            lead={lead}
            agentPhone={userProfile?.phone}
            userProfile={userProfile}
            onContactSuccess={loadActivities}
          />
        }
        upcomingCommsSlot={
          (() => {
            const upcomingItems = getUpcomingCommunications(lead, contactActivities);
            return upcomingItems.length > 0 ? <UpcomingCommunications items={upcomingItems} /> : null;
          })()
        }
        enrichmentSlot={
          isGMContext
            ? <GMDirectiveSection lead={lead} />
            : <InteractiveEnrichmentForm lead={lead} />
        }
        tasksSlot={
          <div data-onboarding="tasks-section">
            <h3 className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-3">Tasks</h3>
            {leadTasks.length === 0 ? (
              <p className="text-sm text-[var(--neutral-600)]">No tasks for this lead.</p>
            ) : (
              <ul className="space-y-2">
                {leadTasks.map((task) => {
                  const isDone = task.status === "Done";
                  const handleCheckboxClick = (e) => {
                    e.stopPropagation();
                    const newStatus = isDone ? "Open" : "Done";
                    if (useSupabase && updateTaskStatus) {
                      updateTaskStatus(task.id, newStatus).then(() => loadTasks());
                    } else {
                      setLeadTasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
                      );
                    }
                  };
                  return (
                    <li
                      key={task.id}
                        onClick={() => {
                        selectTask?.(task.id);
                        navigateTo(isGMContext ? "gm-task-detail" : "bm-task-detail");
                        window.dispatchEvent(new CustomEvent("onboarding:action", { detail: { actionType: "open_task" } }));
                      }}
                      className={`flex items-center gap-3 p-2 rounded border border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] cursor-pointer transition-colors ${isDone ? "opacity-75" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={handleCheckboxClick}
                        className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          isDone
                            ? "bg-[var(--color-success)] border-[var(--color-success)] text-white"
                            : "border-[var(--neutral-300)] hover:border-[var(--neutral-400)]"
                        }`}
                        aria-label={isDone ? "Mark as open" : "Mark as done"}
                      >
                        {isDone && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className="font-medium text-sm text-[var(--hertz-black)] truncate flex-1 min-w-0">{task.title}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        }
        contactActivities={contactActivities}
      />
    </div>
  );
}
