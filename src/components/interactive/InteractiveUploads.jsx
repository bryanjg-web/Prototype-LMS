import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseHlesCsv, parseTranslogCsv } from "../../utils/csvParsers";
import { reconcileHlesUpload, reconcileTranslogUpload, buildCommitPlan } from "../../utils/reconciliation";
import { leads as mockLeads } from "../../data/mockData";

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
const STEPS = [
  { key: "select", label: "Select Files" },
  { key: "validate", label: "Validate" },
  { key: "preview", label: "Preview & Resolve" },
  { key: "commit", label: "Commit" },
  { key: "summary", label: "Summary" },
];

function StepIndicator({ currentStep }) {
  const idx = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, i) => {
        const isActive = i === idx;
        const isDone = i < idx;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--hertz-primary)] text-[var(--hertz-black)]"
                    : isDone
                      ? "bg-[var(--hertz-black)] text-white"
                      : "bg-[var(--neutral-100)] text-[var(--neutral-400)]"
                }`}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? "text-[var(--hertz-black)]" : isDone ? "text-[var(--neutral-600)]" : "text-[var(--neutral-400)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-2 ${i < idx ? "bg-[var(--hertz-black)]" : "bg-[var(--neutral-200)]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File drop zone
// ---------------------------------------------------------------------------
function FileDropZone({ label, accept, file, onFileSelect, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) onFileSelect(dropped);
    },
    [onFileSelect],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
        dragOver
          ? "border-[var(--hertz-primary)] bg-[var(--hertz-primary-subtle)]"
          : file
            ? "border-[var(--hertz-black)] bg-[var(--neutral-50)]"
            : "border-[var(--neutral-200)] hover:border-[var(--neutral-400)]"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--hertz-black)] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[var(--hertz-black)]">{file.name}</p>
            <p className="text-xs text-[var(--neutral-500)]">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
            className="ml-2 text-xs text-[var(--neutral-500)] hover:text-[#C62828] cursor-pointer"
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <svg className="w-8 h-8 text-[var(--neutral-400)] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-medium text-[var(--hertz-black)] mb-1">{label}</p>
          <p className="text-xs text-[var(--neutral-500)]">Drag & drop or click to browse (.csv, .xlsx)</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validation summary card
// ---------------------------------------------------------------------------
function ValidationCard({ title, stats, errors, isLoading }) {
  const [showErrors, setShowErrors] = useState(false);

  if (isLoading) {
    return (
      <div className="border border-[var(--neutral-200)] rounded-lg p-5">
        <p className="text-sm font-semibold text-[var(--hertz-black)] mb-3">{title}</p>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--hertz-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--neutral-500)]">Parsing and validating...</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--neutral-200)] rounded-lg p-5"
    >
      <p className="text-sm font-semibold text-[var(--hertz-black)] mb-3">{title}</p>
      <div className="space-y-1.5">
        {stats.map((s, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-[var(--neutral-500)]">{s.label}</span>
            <span className={`font-medium ${s.color || "text-[var(--hertz-black)]"}`}>{s.value}</span>
          </div>
        ))}
      </div>
      {errors?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--neutral-100)]">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="text-xs font-medium text-[#C62828] hover:underline cursor-pointer flex items-center gap-1"
          >
            <svg className={`w-3 h-3 transition-transform ${showErrors ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {errors.length} validation error{errors.length !== 1 ? "s" : ""}
          </button>
          <AnimatePresence>
            {showErrors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {errors.map((err, i) => (
                    <p key={i} className="text-xs text-[#C62828] font-mono">{err}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Preview table
// ---------------------------------------------------------------------------
function PreviewTable({ reconciliation }) {
  const { summary } = reconciliation;
  const [activeTab, setActiveTab] = useState("all");

  const items = {
    all: [
      ...reconciliation.newLeads.map((i) => ({ ...i, category: "new" })),
      ...reconciliation.updatedLeads.map((i) => ({ ...i, category: "updated" })),
      ...reconciliation.conflicts.map((i) => ({ ...i, category: "conflict" })),
      ...reconciliation.unchangedLeads.map((i) => ({ ...i, category: "unchanged" })),
    ],
    new: reconciliation.newLeads.map((i) => ({ ...i, category: "new" })),
    updated: reconciliation.updatedLeads.map((i) => ({ ...i, category: "updated" })),
    conflicts: reconciliation.conflicts.map((i) => ({ ...i, category: "conflict" })),
    orphaned: reconciliation.orphanedLeads.map((lead) => ({ existing: lead, category: "orphaned" })),
  };

  const tabs = [
    { key: "all", label: "All", count: summary.total },
    { key: "new", label: "New", count: summary.new, color: "text-[#2E7D32]" },
    { key: "updated", label: "Updated", count: summary.updated },
    { key: "conflicts", label: "Conflicts", count: summary.conflicts, color: "text-[#E65100]" },
    { key: "orphaned", label: "Orphaned", count: summary.orphaned, color: "text-[#C62828]" },
  ];

  const displayItems = items[activeTab] || [];
  const categoryColors = {
    new: "bg-[#E8F5E9] text-[#2E7D32]",
    updated: "bg-[#E3F2FD] text-[#1565C0]",
    conflict: "bg-[#FFF3E0] text-[#E65100]",
    unchanged: "bg-[var(--neutral-100)] text-[var(--neutral-500)]",
    orphaned: "bg-[#FFEBEE] text-[#C62828]",
  };

  return (
    <div>
      {/* Summary tiles */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total Rows", value: summary.total, bg: "bg-[var(--hertz-black)]", text: "text-white" },
          { label: "New Leads", value: summary.new, bg: "bg-[#E8F5E9]", text: "text-[#2E7D32]" },
          { label: "Updated", value: summary.updated, bg: "bg-[#E3F2FD]", text: "text-[#1565C0]" },
          { label: "Conflicts", value: summary.conflicts, bg: "bg-[#FFF3E0]", text: "text-[#E65100]" },
          { label: "Orphaned", value: summary.orphaned, bg: "bg-[#FFEBEE]", text: "text-[#C62828]" },
        ].map((tile) => (
          <div key={tile.label} className={`${tile.bg} rounded-lg p-3`}>
            <p className={`text-2xl font-bold ${tile.text}`}>{tile.value}</p>
            <p className={`text-xs ${tile.text} opacity-70`}>{tile.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--neutral-200)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "border-[var(--hertz-primary)] text-[var(--hertz-black)]"
                : "border-transparent text-[var(--neutral-500)] hover:text-[var(--hertz-black)]"
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 ${tab.color || ""}`}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-[var(--hertz-black)] text-white sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Reservation ID</th>
              <th className="px-3 py-2 text-left font-medium">Customer</th>
              <th className="px-3 py-2 text-left font-medium">Branch</th>
              <th className="px-3 py-2 text-left font-medium">Lead Status</th>
              <th className="px-3 py-2 text-left font-medium">Changes</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.slice(0, 100).map((item, i) => {
              const lead = item.parsed || item.existing;
              return (
                <tr key={i} className="border-t border-[var(--neutral-100)] hover:bg-[var(--neutral-50)]">
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${categoryColors[item.category]}`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono">{lead?.reservationId || lead?.confirmNum || "—"}</td>
                  <td className="px-3 py-2">{lead?.customer || "—"}</td>
                  <td className="px-3 py-2">{lead?.branch || "—"}</td>
                  <td className="px-3 py-2">{lead?.status || "—"}</td>
                  <td className="px-3 py-2 text-[var(--neutral-500)]">
                    {item.sourceChanges?.length
                      ? item.sourceChanges.map((c) => c.field).join(", ")
                      : item.enrichmentConflicts?.length
                        ? `${item.enrichmentConflicts.length} conflict(s)`
                        : "—"}
                  </td>
                </tr>
              );
            })}
            {displayItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--neutral-400)]">
                  No items in this category
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {displayItems.length > 100 && (
          <div className="px-3 py-2 bg-[var(--neutral-50)] text-xs text-[var(--neutral-500)] text-center">
            Showing first 100 of {displayItems.length} rows
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conflict resolution
// ---------------------------------------------------------------------------
function ConflictResolver({ conflicts, resolutions, onResolve }) {
  if (!conflicts?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-[var(--hertz-black)]">
            {conflicts.length} Enrichment Conflict{conflicts.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-[var(--neutral-500)]">
            These leads have been enriched by BMs but the new HLES upload has different source values.
            Choose how to handle each conflict.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => conflicts.forEach((_, i) => onResolve(i, "keep_enriched"))}
            className="px-3 py-1.5 text-xs font-medium border border-[var(--neutral-300)] rounded hover:bg-[var(--neutral-50)] cursor-pointer"
          >
            Keep All Enriched
          </button>
          <button
            onClick={() => conflicts.forEach((_, i) => onResolve(i, "use_source"))}
            className="px-3 py-1.5 text-xs font-medium border border-[var(--neutral-300)] rounded hover:bg-[var(--neutral-50)] cursor-pointer"
          >
            Use All Source
          </button>
        </div>
      </div>

      {conflicts.map((conflict, idx) => {
        const resolution = resolutions[idx];
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`border rounded-lg p-4 ${
              resolution
                ? "border-[var(--neutral-200)] bg-[var(--neutral-50)]"
                : "border-[#E65100] bg-[#FFF3E0]"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[var(--hertz-black)]">
                  {conflict.existing?.customer || conflict.parsed?.customer} &mdash;{" "}
                  <span className="font-mono text-xs">{conflict.parsed?.reservationId}</span>
                </p>
                <p className="text-xs text-[var(--neutral-500)]">{conflict.existing?.branch}</p>
              </div>
              {resolution && (
                <span className="text-xs font-medium text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded">
                  Resolved: {resolution === "keep_enriched" ? "Keep Enriched" : resolution === "use_source" ? "Use Source" : "Skip"}
                </span>
              )}
            </div>

            {conflict.enrichmentConflicts?.map((ec, ecIdx) => (
              <div key={ecIdx} className="mb-3 p-3 bg-white rounded border border-[var(--neutral-200)]">
                <p className="text-xs font-semibold text-[var(--hertz-black)] mb-2">{ec.field}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--neutral-500)] mb-1">New (HLES Source)</p>
                    <p className="text-sm font-medium text-[#1565C0]">{ec.sourceValue || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--neutral-500)] mb-1">Current (Enriched)</p>
                    <p className="text-sm font-medium text-[#E65100]">{ec.enrichedValue || "—"}</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--neutral-500)] mt-2">{ec.detail}</p>
              </div>
            ))}

            <div className="flex gap-2 mt-2">
              {["keep_enriched", "use_source", "skip"].map((action) => (
                <button
                  key={action}
                  onClick={() => onResolve(idx, action)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                    resolution === action
                      ? "bg-[var(--hertz-black)] text-white"
                      : "border border-[var(--neutral-300)] hover:bg-[var(--neutral-50)]"
                  }`}
                >
                  {action === "keep_enriched" ? "Keep Enriched" : action === "use_source" ? "Use Source" : "Skip Lead"}
                </button>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orphan action selector
// ---------------------------------------------------------------------------
function OrphanActionSelector({ orphanedLeads, orphanAction, onOrphanAction }) {
  if (!orphanedLeads?.length) return null;

  return (
    <div className="border border-[#FFEBEE] rounded-lg p-5 bg-[#FFF8F8]">
      <p className="text-sm font-semibold text-[var(--hertz-black)] mb-1">
        {orphanedLeads.length} Orphaned Lead{orphanedLeads.length !== 1 ? "s" : ""}
      </p>
      <p className="text-xs text-[var(--neutral-500)] mb-4">
        These leads exist in the database but were not found in the new HLES upload.
        They may have fallen outside the rolling 8-week window.
      </p>
      <div className="flex gap-2">
        {[
          { value: "keep", label: "Keep As-Is", desc: "Leave in database unchanged" },
          { value: "archive", label: "Archive All", desc: "Mark as archived" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => onOrphanAction(opt.value)}
            className={`flex-1 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
              orphanAction === opt.value
                ? "border-[var(--hertz-black)] bg-[var(--neutral-50)]"
                : "border-[var(--neutral-200)] hover:border-[var(--neutral-400)]"
            }`}
          >
            <p className="text-sm font-medium text-[var(--hertz-black)]">{opt.label}</p>
            <p className="text-xs text-[var(--neutral-500)]">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Upload Wizard
// ---------------------------------------------------------------------------
export default function InteractiveUploads() {
  const [step, setStep] = useState("select");
  const [hlesFile, setHlesFile] = useState(null);
  const [translogFile, setTranslogFile] = useState(null);

  // Parse results
  const [hlesParsed, setHlesParsed] = useState(null);
  const [translogParsed, setTranslogParsed] = useState(null);
  const [parsing, setParsing] = useState(false);

  // Reconciliation
  const [hlesReconciliation, setHlesReconciliation] = useState(null);
  const [translogReconciliation, setTranslogReconciliation] = useState(null);

  // Conflict resolution
  const [conflictResolutions, setConflictResolutions] = useState({});
  const [orphanAction, setOrphanAction] = useState("keep");

  // Commit
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);

  // Use mock leads for reconciliation comparison (prototype)
  const existingLeads = useMemo(
    () => mockLeads.map((l) => ({ ...l, confirmNum: l.reservationId })),
    [],
  );

  // ---- Step: Validate ----
  const handleValidate = useCallback(async () => {
    setParsing(true);
    setStep("validate");

    try {
      let hResult = null;
      let tResult = null;

      if (hlesFile) {
        hResult = await parseHlesCsv(hlesFile);
        setHlesParsed(hResult);
      }
      if (translogFile) {
        tResult = await parseTranslogCsv(translogFile);
        setTranslogParsed(tResult);
      }

      // Run reconciliation
      if (hResult?.leads?.length) {
        const recon = reconcileHlesUpload(hResult.leads, existingLeads);
        setHlesReconciliation(recon);
      }
      if (tResult?.eventsByLead?.size) {
        const recon = reconcileTranslogUpload(tResult.eventsByLead, existingLeads);
        setTranslogReconciliation(recon);
      }
    } catch (err) {
      console.error("Parse error:", err);
    }

    setParsing(false);
    // Auto-advance if no errors prevent it
    setTimeout(() => setStep("preview"), 500);
  }, [hlesFile, translogFile, existingLeads]);

  // ---- Step: Commit ----
  const handleCommit = useCallback(async () => {
    setCommitting(true);
    setStep("commit");

    // Build commit plan
    const plan = hlesReconciliation
      ? buildCommitPlan(hlesReconciliation, conflictResolutions, orphanAction)
      : { inserts: [], updates: [], archives: [], skips: [] };

    // For prototype: simulate commit with a delay
    await new Promise((r) => setTimeout(r, 1500));

    setCommitResult({
      hles: {
        inserted: plan.inserts.length,
        updated: plan.updates.length,
        archived: plan.archives.length,
        skipped: plan.skips.length,
      },
      translog: translogReconciliation
        ? {
            matchedLeads: translogReconciliation.summary.matchedLeads,
            matchedEvents: translogReconciliation.summary.matchedEvents,
            orphanKeys: translogReconciliation.summary.orphanKeys,
          }
        : null,
      orgMapping: hlesParsed?.orgRows
        ? { branchesFound: hlesParsed.orgRows.length }
        : null,
    });

    setCommitting(false);
    setStep("summary");
  }, [hlesReconciliation, translogReconciliation, conflictResolutions, orphanAction, hlesParsed]);

  const handleResolveConflict = useCallback((idx, resolution) => {
    setConflictResolutions((prev) => ({ ...prev, [idx]: resolution }));
  }, []);

  const allConflictsResolved =
    !hlesReconciliation?.conflicts?.length ||
    hlesReconciliation.conflicts.every((_, i) => conflictResolutions[i]);

  const canProceedFromPreview = allConflictsResolved;

  const handleReset = useCallback(() => {
    setStep("select");
    setHlesFile(null);
    setTranslogFile(null);
    setHlesParsed(null);
    setTranslogParsed(null);
    setHlesReconciliation(null);
    setTranslogReconciliation(null);
    setConflictResolutions({});
    setOrphanAction("keep");
    setCommitting(false);
    setCommitResult(null);
  }, []);

  // ---- Render ----
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--hertz-black)]">Data Uploads</h2>
        <p className="text-sm text-[var(--neutral-500)] mt-1">
          Upload HLES and TRANSLOG CSV files to refresh lead data. The system will validate,
          detect conflicts with enriched data, and let you resolve them before committing.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      <AnimatePresence mode="wait">
        {/* ---- STEP: SELECT FILES ---- */}
        {step === "select" && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm font-semibold text-[var(--hertz-black)] mb-2">HLES Conversion Data</p>
                <FileDropZone
                  label="Drop HLES CSV file here"
                  accept=".csv,.xlsx"
                  file={hlesFile}
                  onFileSelect={setHlesFile}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--hertz-black)] mb-2">TRANSLOG Activity Data</p>
                <FileDropZone
                  label="Drop TRANSLOG CSV file here"
                  accept=".csv,.xlsx"
                  file={translogFile}
                  onFileSelect={setTranslogFile}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleValidate}
                disabled={!hlesFile && !translogFile}
                className="px-5 py-2.5 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-sm font-semibold hover:bg-[#E6BC00] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Upload & Validate
              </button>
            </div>
          </motion.div>
        )}

        {/* ---- STEP: VALIDATE ---- */}
        {step === "validate" && (
          <motion.div key="validate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-6">
              {hlesFile && (
                <ValidationCard
                  title="HLES Conversion Data"
                  isLoading={parsing}
                  stats={
                    hlesParsed
                      ? [
                          { label: "Rows parsed", value: hlesParsed.rawRowCount.toLocaleString() },
                          { label: "Valid leads", value: hlesParsed.leads.length.toLocaleString(), color: "text-[#2E7D32]" },
                          { label: "Branches found", value: hlesParsed.orgRows.length.toLocaleString() },
                          { label: "Validation errors", value: hlesParsed.errors.length.toString(), color: hlesParsed.errors.length ? "text-[#C62828]" : "" },
                        ]
                      : null
                  }
                  errors={hlesParsed?.errors}
                />
              )}
              {translogFile && (
                <ValidationCard
                  title="TRANSLOG Activity Data"
                  isLoading={parsing}
                  stats={
                    translogParsed
                      ? [
                          { label: "Rows parsed", value: translogParsed.rawRowCount.toLocaleString() },
                          { label: "Valid events", value: translogParsed.events.length.toLocaleString(), color: "text-[#2E7D32]" },
                          { label: "Unique leads", value: translogParsed.eventsByLead.size.toLocaleString() },
                          { label: "Validation errors", value: translogParsed.errors.length.toString(), color: translogParsed.errors.length ? "text-[#C62828]" : "" },
                        ]
                      : null
                  }
                  errors={translogParsed?.errors}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* ---- STEP: PREVIEW ---- */}
        {step === "preview" && hlesReconciliation && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PreviewTable reconciliation={hlesReconciliation} />

            {translogReconciliation && (
              <div className="mt-6 border border-[var(--neutral-200)] rounded-lg p-5">
                <p className="text-sm font-semibold text-[var(--hertz-black)] mb-3">TRANSLOG Activity Summary</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Events Parsed", value: translogReconciliation.summary.totalEvents },
                    { label: "Matched to Leads", value: translogReconciliation.summary.matchedEvents, color: "text-[#2E7D32]" },
                    { label: "Orphan Events", value: translogReconciliation.summary.orphanEventCount, color: "text-[var(--neutral-500)]" },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className={`text-xl font-bold ${s.color || "text-[var(--hertz-black)]"}`}>{s.value.toLocaleString()}</p>
                      <p className="text-xs text-[var(--neutral-500)]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hlesReconciliation.conflicts.length > 0 && (
              <div className="mt-6">
                <ConflictResolver
                  conflicts={hlesReconciliation.conflicts}
                  resolutions={conflictResolutions}
                  onResolve={handleResolveConflict}
                />
              </div>
            )}

            {hlesReconciliation.orphanedLeads.length > 0 && (
              <div className="mt-6">
                <OrphanActionSelector
                  orphanedLeads={hlesReconciliation.orphanedLeads}
                  orphanAction={orphanAction}
                  onOrphanAction={setOrphanAction}
                />
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep("select")}
                className="px-4 py-2 text-sm text-[var(--neutral-500)] hover:text-[var(--hertz-black)] cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleCommit}
                disabled={!canProceedFromPreview}
                className="px-5 py-2.5 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-sm font-semibold hover:bg-[#E6BC00] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {hlesReconciliation.conflicts.length > 0 && !allConflictsResolved
                  ? `Resolve ${hlesReconciliation.conflicts.length - Object.keys(conflictResolutions).length} Conflict(s) to Continue`
                  : "Commit Changes"}
              </button>
            </div>
          </motion.div>
        )}

        {/* If no HLES reconciliation but we parsed something, show validation only */}
        {step === "preview" && !hlesReconciliation && !parsing && (
          <motion.div key="preview-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center py-12 text-[var(--neutral-400)]">
              <p>No HLES data to preview. Go back and select an HLES file.</p>
              <button onClick={() => setStep("select")} className="mt-4 text-sm text-[var(--hertz-primary)] hover:underline cursor-pointer">
                Back to File Selection
              </button>
            </div>
          </motion.div>
        )}

        {/* ---- STEP: COMMIT ---- */}
        {step === "commit" && committing && (
          <motion.div key="commit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center py-16">
              <div className="w-12 h-12 border-3 border-[var(--hertz-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold text-[var(--hertz-black)]">Committing changes...</p>
              <p className="text-xs text-[var(--neutral-500)] mt-1">Inserting new leads, updating existing records, resolving conflicts.</p>
            </div>
          </motion.div>
        )}

        {/* ---- STEP: SUMMARY ---- */}
        {step === "summary" && commitResult && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#2E7D32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[var(--hertz-black)]">Upload Complete</h3>
              <p className="text-sm text-[var(--neutral-500)] mt-1">Data has been processed and committed successfully.</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {commitResult.hles && (
                <div className="border border-[var(--neutral-200)] rounded-lg p-5">
                  <p className="text-sm font-semibold text-[var(--hertz-black)] mb-3">HLES Results</p>
                  <div className="space-y-2">
                    {[
                      { label: "New leads inserted", value: commitResult.hles.inserted, color: "text-[#2E7D32]" },
                      { label: "Existing leads updated", value: commitResult.hles.updated, color: "text-[#1565C0]" },
                      { label: "Leads archived", value: commitResult.hles.archived },
                      { label: "Leads skipped", value: commitResult.hles.skipped, color: "text-[var(--neutral-500)]" },
                    ].map((s) => (
                      <div key={s.label} className="flex justify-between text-sm">
                        <span className="text-[var(--neutral-500)]">{s.label}</span>
                        <span className={`font-medium ${s.color || ""}`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {commitResult.translog && (
                <div className="border border-[var(--neutral-200)] rounded-lg p-5">
                  <p className="text-sm font-semibold text-[var(--hertz-black)] mb-3">TRANSLOG Results</p>
                  <div className="space-y-2">
                    {[
                      { label: "Leads with new events", value: commitResult.translog.matchedLeads, color: "text-[#2E7D32]" },
                      { label: "Events matched", value: commitResult.translog.matchedEvents },
                      { label: "Orphan event keys", value: commitResult.translog.orphanKeys, color: "text-[var(--neutral-500)]" },
                    ].map((s) => (
                      <div key={s.label} className="flex justify-between text-sm">
                        <span className="text-[var(--neutral-500)]">{s.label}</span>
                        <span className={`font-medium ${s.color || ""}`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {commitResult.orgMapping && (
              <div className="border border-[var(--neutral-200)] rounded-lg p-5 mb-6">
                <p className="text-sm font-semibold text-[var(--hertz-black)] mb-1">Org Mapping Updated</p>
                <p className="text-xs text-[var(--neutral-500)]">
                  {commitResult.orgMapping.branchesFound} branch hierarchy records auto-derived from HLES data.
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-sm font-semibold hover:bg-[#E6BC00] transition-colors cursor-pointer"
              >
                Start New Upload
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
