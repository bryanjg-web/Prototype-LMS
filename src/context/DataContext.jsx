/**
 * DataContext — provides leads from Supabase or mockData.
 * When VITE_USE_SUPABASE=true: fetches from Supabase, refetches after updates (persistent).
 * When false: uses mockData with localStorage persistence so enrichment survives logout/restart.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { leads as mockLeads, winsLearnings as mockWinsLearnings } from "../data/mockData";
import {
  fetchLeads,
  fetchUploadSummary,
  updateLeadEnrichment as apiUpdateLeadEnrichment,
  updateLeadContact as apiUpdateLeadContact,
  fetchLeadActivities as apiFetchLeadActivities,
  fetchTasksForBranch as apiFetchTasksForBranch,
  fetchTasksForLead as apiFetchTasksForLead,
  fetchTaskById as apiFetchTaskById,
  updateTaskStatus as apiUpdateTaskStatus,
  appendTaskNote as apiAppendTaskNote,
  createComplianceTasksForBranch as apiCreateComplianceTasksForBranch,
  fetchWinsLearnings as apiFetchWinsLearnings,
  submitWinsLearning as apiSubmitWinsLearning,
} from "../data/supabaseData";
import { dataAsOfDate as mockDataAsOfDate } from "../data/mockData";

const DataContext = createContext(null);

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === "true";
const STORAGE_KEY = "hertz_lms_leads";

function loadLeadsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveLeadsToStorage(leads) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads ?? []));
  } catch {
    // Ignore quota / privacy errors
  }
}

/** Ensure Maria Santos (Santa Monica) is a mismatch demo lead for Meeting Prep. Patches stored data that may have old values. */
function ensureMismatchDemoLead(leads) {
  if (!Array.isArray(leads)) return leads;
  const maria = leads.find((l) => l.reservationId === "HL-2026-001243" || l.id === 10);
  if (!maria) return leads;
  if (maria.mismatch && (maria.weekOf === "2026-02-16" || maria.week_of === "2026-02-16")) return leads;
  return leads.map((l) => {
    if (l.reservationId !== "HL-2026-001243" && l.id !== 10) return l;
    return {
      ...l,
      mismatch: true,
      mismatchReason: "HLES says 'Unable to reach' but TRANSLOG shows 2 contact attempts. Add clarifying notes before the meeting.",
      weekOf: "2026-02-16",
      week_of: "2026-02-16",
    };
  });
}

export function DataProvider({ children }) {
  const [leads, setLeads] = useState(() => {
    if (USE_SUPABASE) return [];
    const stored = loadLeadsFromStorage();
    const initial = stored ?? [...mockLeads];
    return ensureMismatchDemoLead(initial);
  });
  const [winsLearnings, setWinsLearnings] = useState(USE_SUPABASE ? [] : [...mockWinsLearnings]);
  const [loading, setLoading] = useState(USE_SUPABASE);
  const [error, setError] = useState(null);
  const [dataAsOfDate, setDataAsOfDate] = useState(USE_SUPABASE ? null : mockDataAsOfDate);

  // Fetch upload summary (data-as-of date) when using Supabase
  useEffect(() => {
    if (!USE_SUPABASE) return;
    fetchUploadSummary()
      .then(({ dataAsOfDate: d }) => setDataAsOfDate(d ?? null))
      .catch(() => setDataAsOfDate(null));
  }, [USE_SUPABASE]);

  // Persist leads to localStorage whenever they change (mock mode only)
  useEffect(() => {
    if (!USE_SUPABASE && leads.length > 0) {
      saveLeadsToStorage(leads);
    }
  }, [USE_SUPABASE, leads]);

  const refetchLeads = useCallback(async () => {
    if (!USE_SUPABASE) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads();
      setLeads(data ?? []);
    } catch (err) {
      setError(err?.message ?? "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (USE_SUPABASE) refetchLeads();
  }, [refetchLeads]);

  // Fetch all wins & learnings on mount (Supabase mode). Selector filters by gmName client-side.
  useEffect(() => {
    if (!USE_SUPABASE) return;
    apiFetchWinsLearnings()
      .then((data) => setWinsLearnings(data ?? []))
      .catch((err) => console.error("[DataContext] fetchWinsLearnings failed:", err));
  }, []);

  const updateLeadEnrichment = useCallback(
    async (leadId, enrichment, enrichmentLogEntry, status = null) => {
      if (USE_SUPABASE) {
        const updated = await apiUpdateLeadEnrichment(leadId, enrichment, enrichmentLogEntry, status);
        setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
        return updated;
      }
      // Mock mode: optimistic local update
      let updatedLead = null;
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== leadId) return l;
          const newLog = enrichmentLogEntry ? [...(l.enrichmentLog ?? []), enrichmentLogEntry] : (l.enrichmentLog ?? []);
          updatedLead = {
            ...l,
            enrichment: enrichment ?? l.enrichment,
            enrichmentComplete: !!enrichment && Object.keys(enrichment ?? {}).length > 0,
            enrichmentLog: newLog,
            status: status ?? l.status,
            ...(status === "Cancelled" && enrichment?.reason ? { hlesReason: enrichment.reason } : {}),
          };
          return updatedLead;
        })
      );
      return updatedLead;
    },
    [USE_SUPABASE]
  );

  const updateLeadContact = useCallback(
    async (leadId, { email, phone }, enrichmentLogEntry = null) => {
      if (USE_SUPABASE) {
        const updated = await apiUpdateLeadContact(leadId, { email, phone }, enrichmentLogEntry);
        setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
        return updated;
      }
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== leadId) return l;
          const newLog = enrichmentLogEntry ? [...(l.enrichmentLog ?? []), enrichmentLogEntry] : (l.enrichmentLog ?? []);
          return {
            ...l,
            email: email !== undefined ? (email || null) : l.email,
            phone: phone !== undefined ? (phone || null) : l.phone,
            enrichmentLog: newLog,
          };
        })
      );
      return null;
    },
    [USE_SUPABASE]
  );

  const fetchLeadActivities = useCallback(
    async (leadId) => {
      if (!USE_SUPABASE) return [];
      return apiFetchLeadActivities(leadId);
    },
    [USE_SUPABASE]
  );

  const fetchTasksForBranch = useCallback(
    async (branch) => {
      if (!USE_SUPABASE) return [];
      return apiFetchTasksForBranch(branch);
    },
    [USE_SUPABASE]
  );

  const fetchTasksForLead = useCallback(
    async (leadId) => {
      if (!USE_SUPABASE) return [];
      return apiFetchTasksForLead(leadId);
    },
    [USE_SUPABASE]
  );

  const fetchTaskById = useCallback(
    async (taskId) => {
      if (!USE_SUPABASE) return null;
      return apiFetchTaskById(taskId);
    },
    [USE_SUPABASE]
  );

  const updateTaskStatus = useCallback(
    async (taskId, status) => {
      if (!USE_SUPABASE) return null;
      return apiUpdateTaskStatus(taskId, status);
    },
    [USE_SUPABASE]
  );

  const appendTaskNote = useCallback(
    async (taskId, noteText, author) => {
      if (!USE_SUPABASE) return null;
      return apiAppendTaskNote(taskId, noteText, author);
    },
    [USE_SUPABASE]
  );

  const createComplianceTasksForBranch = useCallback(
    async (params) => {
      if (!USE_SUPABASE) return { created: 0, errors: [{ error: "Supabase required" }] };
      return apiCreateComplianceTasksForBranch(params);
    },
    [USE_SUPABASE]
  );

  const submitWinsLearning = useCallback(
    async ({ bmName, branch, gmName, content, weekOf }) => {
      const entry = { bmName, branch, gmName, content, weekOf };
      if (USE_SUPABASE) {
        const created = await apiSubmitWinsLearning(entry);
        setWinsLearnings((prev) => [created, ...prev]);
        return created;
      }
      // Mock mode: optimistic local add — use demo NOW so date ordering is consistent
      const mockEntry = {
        ...entry,
        id: `wl-mock-${Date.now()}`,
        createdAt: new Date("2026-02-22T09:00:00").toISOString(),
      };
      setWinsLearnings((prev) => [mockEntry, ...prev]);
      return mockEntry;
    },
    [USE_SUPABASE]
  );

  const value = {
    leads,
    loading,
    error,
    dataAsOfDate,
    refetchLeads,
    updateLeadEnrichment,
    updateLeadContact,
    fetchLeadActivities,
    fetchTasksForBranch,
    fetchTasksForLead,
    fetchTaskById,
    updateTaskStatus,
    appendTaskNote,
    createComplianceTasksForBranch,
    winsLearnings,
    submitWinsLearning,
    useSupabase: USE_SUPABASE,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
