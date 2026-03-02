import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import BackButton from "../BackButton";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { getTaskById, getLeadById } from "../../selectors/demoSelectors";
import { formatDateTime, formatDateTimeShort } from "../../utils/dateTime";

const STATUS_OPTIONS = ["Open", "In Progress", "Done"];
const PRIORITY_COLORS = {
  High: "bg-amber-100 text-amber-800",
  Medium: "bg-[var(--neutral-100)] text-[var(--neutral-600)]",
  Low: "bg-[var(--neutral-100)] text-[var(--neutral-600)]",
};
const SOURCE_LABELS = { gm_assigned: "GM Assigned", auto_translog: "Auto (Translog)", auto_other: "Auto (Other)" };

function formatTimestamp(iso) {
  return formatDateTime(iso);
}

function formatRelativeTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatTimestamp(iso);
}

export default function InteractiveTaskDetail() {
  const { selectedTaskId, navigateTo, selectLead, selectTask, activeView, role } = useApp();
  const { userProfile } = useAuth();
  const { leads, fetchTaskById, updateTaskStatus, appendTaskNote, useSupabase } = useData();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const loadTask = useCallback(async () => {
    if (!selectedTaskId) return;
    if (useSupabase) {
      setLoading(true);
      try {
        const t = await fetchTaskById(selectedTaskId);
        setTask(t);
      } catch (err) {
        console.error("[InteractiveTaskDetail] Failed to fetch task:", err);
        setTask(null);
      } finally {
        setLoading(false);
      }
    } else {
      const t = getTaskById(selectedTaskId);
      setTask(t);
    }
  }, [selectedTaskId, useSupabase, fetchTaskById]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleStatusChange = async (newStatus) => {
    if (!task || task.status === newStatus) return;
    if (useSupabase) {
      setUpdating(true);
      try {
        const updated = await updateTaskStatus(task.id, newStatus);
        setTask(updated);
      } catch (err) {
        console.error("[InteractiveTaskDetail] Failed to update status:", err);
      } finally {
        setUpdating(false);
      }
    } else {
      setTask((t) =>
        t
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === "Done" ? new Date().toISOString() : null,
            }
          : null
      );
    }
  };

  const handleAddNote = useCallback(async () => {
    const text = (newNoteText ?? "").trim();
    if (!task || !text) return;
    if (useSupabase) {
      setNotesSaving(true);
      try {
        const author = userProfile?.displayName ?? "—";
        const updated = await appendTaskNote(task.id, text, author);
        setTask(updated);
        setNewNoteText("");
      } catch (err) {
        console.error("[InteractiveTaskDetail] Failed to add note:", err);
      } finally {
        setNotesSaving(false);
      }
    } else {
      const author = userProfile?.displayName ?? "—";
      const entry = {
        time: formatDateTimeShort(new Date()),
        timestamp: Date.now(),
        author,
        note: text,
      };
      setTask((t) => (t ? { ...t, notesLog: [...(t.notesLog ?? []), entry] } : null));
      setNewNoteText("");
    }
  }, [task, newNoteText, useSupabase, appendTaskNote, userProfile?.displayName]);

  const isGMContext = activeView === "gm-task-detail" || role === "gm";
  const backView = isGMContext ? "gm-meeting-prep" : "bm-todo";
  const backLabel = isGMContext ? "Back to Meeting Prep" : "Back to Open Tasks";

  const handleViewLead = () => {
    if (task?.leadId) {
      selectLead(task.leadId);
      selectTask(null);
      navigateTo(isGMContext ? "gm-lead-detail" : "bm-lead-detail");
    }
  };

  if (!selectedTaskId) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--neutral-600)]">
        No task selected.
        <BackButton onClick={() => navigateTo(backView)} label={backLabel} className="ml-2 mb-0" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--neutral-600)]">
        Loading task…
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--neutral-600)]">
        Task not found.
        <BackButton onClick={() => { selectTask(null); navigateTo(backView); }} label={backLabel} className="ml-2 mb-0" />
      </div>
    );
  }

  const priorityClass = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.Medium;
  const statusClass =
    task.status === "Done"
      ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
      : task.status === "In Progress"
        ? "bg-[var(--hertz-primary)]/25 text-[var(--hertz-black)]"
        : "bg-[var(--color-error)]/15 text-[var(--color-error)]";

  // Resolve lead for display (Supabase returns task.lead; mock needs lookup)
  const lead = task.lead ?? (task.leadId ? getLeadById(leads, task.leadId) : null);
  const leadDisplay = lead ? { customer: lead.customer, reservationId: lead.reservationId } : null;

  const assignedToName = task.assignedToName ?? task.assignedTo ?? "—";
  const sourceLabel = SOURCE_LABELS[task.source] ?? task.source;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl"
    >
      <BackButton onClick={() => { selectTask(null); navigateTo(backView); }} label={backLabel} />

      <div className="space-y-6">
        {/* Title + badges */}
        <div>
          <h2 className="text-2xl font-bold text-[var(--hertz-black)]">{task.title}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${statusClass}`}>{task.status}</span>
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${priorityClass}`}>{task.priority}</span>
            {sourceLabel && (
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-600)]">
                {sourceLabel}
              </span>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Assigned To</p>
            <p className="font-medium">{assignedToName}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Created By</p>
            <p className="font-medium">{task.createdBy ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Due Date</p>
            <p className="font-medium">{task.dueDate ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Created</p>
            <p className="font-medium">{task.createdAt ? formatRelativeTime(task.createdAt) : "—"}</p>
          </div>
          {task.status === "Done" && task.completedAt && (
            <div className="col-span-2">
              <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">Completed</p>
              <p className="font-medium">{formatRelativeTime(task.completedAt)}</p>
            </div>
          )}
        </div>

        {task.description && (
          <div>
            <h3 className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-[var(--hertz-black)]">{task.description}</p>
          </div>
        )}

        {/* Task Notes — append-only timeline (like TRANSLOG activity) */}
        <div>
          <h3 className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-2">Task Notes</h3>
          <p className="text-xs text-[var(--neutral-600)] mb-3">
            Add work notes as you progress. Each note is saved with your name and timestamp.
            {!useSupabase && (
              <span className="block mt-1 text-amber-600">Notes require Supabase to persist across sessions.</span>
            )}
          </p>

          {/* Notes timeline (newest first, like TRANSLOG) */}
          <div className="space-y-3 mb-4">
            {(task.notesLog ?? []).length === 0 ? (
              <p className="text-sm text-[var(--neutral-500)] italic">No notes yet. Add one below.</p>
            ) : (
              [...(task.notesLog ?? [])]
                .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
                .map((ev, i) => (
                  <motion.div
                    key={ev.timestamp ?? i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3 items-start"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: "#2E7D32" }}
                      />
                      {i < (task.notesLog ?? []).length - 1 && (
                        <div className="w-px h-6 bg-[var(--neutral-200)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--hertz-black)]">{ev.note}</p>
                      <p className="text-xs text-[var(--neutral-600)]">By {ev.author} · {ev.time}</p>
                    </div>
                  </motion.div>
                ))
            )}
          </div>

          {/* Add new note */}
          <div className="flex gap-2">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
              placeholder="e.g. Called 3x, left voicemail. Customer will call back tomorrow."
              rows={2}
              className="flex-1 px-3 py-2 rounded border border-[var(--neutral-200)] text-sm text-[var(--hertz-black)] placeholder:text-[var(--neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)] focus:border-transparent"
            />
            <button
              onClick={handleAddNote}
              disabled={notesSaving || !(newNoteText ?? "").trim()}
              className="self-end px-3 py-1.5 rounded text-sm font-medium bg-[var(--hertz-primary)] text-[var(--hertz-black)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
            >
              {notesSaving ? "Adding…" : "Add Note"}
            </button>
          </div>
        </div>

        {leadDisplay && (
          <div>
            <h3 className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-2">Linked Lead</h3>
            <div className="flex items-center justify-between p-3 bg-[var(--neutral-50)] rounded-lg border border-[var(--neutral-200)]">
              <div>
                <p className="font-semibold text-[var(--hertz-black)]">{leadDisplay.customer}</p>
                <p className="text-xs text-[var(--neutral-600)] font-mono">{leadDisplay.reservationId}</p>
              </div>
              <button
                onClick={handleViewLead}
                className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--hertz-primary)] text-[var(--hertz-black)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                View Lead
              </button>
            </div>
          </div>
        )}

        {/* Status controls */}
        <div>
          <h3 className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-2">Status</h3>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updating}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                  task.status === s
                    ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]"
                    : "bg-[var(--neutral-100)] text-[var(--neutral-600)] hover:bg-[var(--neutral-200)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
