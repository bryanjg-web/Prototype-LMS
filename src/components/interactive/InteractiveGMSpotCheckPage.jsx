import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useData } from "../../context/DataContext";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../BackButton";
import StatusBadge from "../StatusBadge";
import ThreeColumnReview from "../ThreeColumnReview";
import {
  getSpotCheckData,
  getZoneBenchmark,
  getDateRangePresets,
  getComparisonDateRange,
  getLeadById,
  resolveGMName,
} from "../../selectors/demoSelectors";
import MetricDrilldownModal from "../MetricDrilldownModal";

const easeOut = [0.4, 0, 0.2, 1];

function MetricComparison({ label, branchVal, zoneVal, suffix = "%", lowerIsBetter = false, onClick }) {
  const diff = branchVal - zoneVal;
  const isGood = lowerIsBetter ? diff <= 0 : diff >= 0;
  const isClickable = !!onClick;
  const Wrapper = isClickable ? motion.button : "div";
  return (
    <Wrapper
      type={isClickable ? "button" : undefined}
      onClick={isClickable ? onClick : undefined}
      className={`bg-white border border-[var(--neutral-200)] rounded-lg px-4 py-3 text-left w-full ${isClickable ? "cursor-pointer hover:border-[var(--hertz-primary)] hover:ring-2 hover:ring-[var(--hertz-primary)]/30 transition-all duration-200 group" : ""}`}
      title={isClickable ? "Click to view underlying data and what's driving changes" : undefined}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider">{label}</p>
        {isClickable && (
          <svg className="w-3.5 h-3.5 text-[var(--neutral-400)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        )}
      </div>
      <div className="flex items-end gap-2">
        <p className="text-xl font-bold text-[var(--hertz-black)]">
          {branchVal}{suffix}
        </p>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded mb-0.5 ${
          isGood ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {diff > 0 ? "+" : ""}{diff}{suffix} vs zone
        </span>
      </div>
      <p className="text-xs text-[var(--neutral-500)] mt-0.5">Zone avg: {zoneVal}{suffix}</p>
    </Wrapper>
  );
}

export default function InteractiveGMSpotCheckPage() {
  const { leads, loading, orgMapping, updateLeadDirective, markLeadReviewed } = useData();
  const { navigateTo, selectLead } = useApp();
  const { userProfile } = useAuth();
  const reduceMotion = useReducedMotion();
  const presets = useMemo(() => getDateRangePresets(), [loading]);
  const gmName = resolveGMName(userProfile?.displayName, userProfile?.id);

  const myBranches = useMemo(
    () => orgMapping.filter((r) => r.gm === gmName).map((r) => r.branch),
    [orgMapping, gmName]
  );

  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const [selectedBranch, setSelectedBranch] = useState(myBranches[0] ?? null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [drilldownMetric, setDrilldownMetric] = useState(null);
  const [directive, setDirective] = useState("");
  const [directiveSaved, setDirectiveSaved] = useState(false);
  const [directiveSaving, setDirectiveSaving] = useState(false);
  const panelRef = useRef(null);

  const currentPreset = presets.find((p) => p.key === selectedPresetKey);
  const dateRange = currentPreset ? { start: currentPreset.start, end: currentPreset.end } : null;
  const comparisonRange = useMemo(
    () => getComparisonDateRange(selectedPresetKey),
    [selectedPresetKey]
  );

  const spotData = useMemo(
    () => selectedBranch ? getSpotCheckData(leads, selectedBranch, dateRange) : null,
    [leads, selectedBranch, dateRange]
  );

  const zoneBenchmark = useMemo(
    () => getZoneBenchmark(leads, dateRange, gmName),
    [leads, dateRange, gmName]
  );

  const selectedLead = selectedLeadId ? getLeadById(leads, selectedLeadId) : null;
  const bmName = useMemo(() => {
    const orgBm = orgMapping.find((r) => r.branch === selectedBranch)?.bm;
    if (orgBm && orgBm !== "— Unassigned —") return orgBm;
    const fromLead = (leads ?? []).find((l) => l.branch === selectedBranch && l.bmName && l.bmName !== "—")?.bmName;
    return fromLead ?? "—";
  }, [orgMapping, selectedBranch, leads]);

  useEffect(() => {
    if (selectedLead && panelRef.current) {
      panelRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedLeadId]);

  const handleSaveDirective = async () => {
    if (!directive.trim() || !selectedLeadId) return;
    setDirectiveSaving(true);
    try {
      await updateLeadDirective(selectedLeadId, directive.trim());
      setDirective("");
      setDirectiveSaved(true);
      setTimeout(() => setDirectiveSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save directive:", err);
    } finally {
      setDirectiveSaving(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!selectedLeadId) return;
    try {
      await markLeadReviewed(selectedLeadId);
      setSelectedLeadId(null);
    } catch (err) {
      console.error("Failed to mark lead reviewed:", err);
    }
  };

  const handleViewLead = (leadId) => {
    selectLead(leadId);
    navigateTo("gm-lead-detail");
  };

  return (
    <div className="max-w-6xl">
      <AnimatePresence>
        {drilldownMetric && (
          <MetricDrilldownModal
            metricKey={drilldownMetric}
            onClose={() => setDrilldownMetric(null)}
            leads={leads}
            branchTasks={[]}
            dateRange={dateRange}
            comparisonRange={comparisonRange}
            branch={selectedBranch}
          />
        )}
      </AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <BackButton onClick={() => navigateTo("gm-todos")} label="Back to Work" />
        <h1 className="text-2xl font-extrabold text-[var(--hertz-black)] tracking-tight mb-1">
          Spot Check
        </h1>
        <p className="text-sm text-[var(--neutral-600)]">
          Quick health check on any branch — see untouched leads and data mismatches between meetings.
        </p>
      </motion.div>

      {/* Controls: Branch + Period on same line */}
      <div className="mb-6">
        <div className="flex items-end gap-6">
          <div>
            <label className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider block mb-1.5">Branch</label>
            <select
              value={selectedBranch ?? ""}
              onChange={(e) => { setSelectedBranch(e.target.value); setSelectedLeadId(null); }}
              className="border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-sm bg-white min-w-[220px] font-medium focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)]"
            >
              {myBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider block mb-1.5">Period</label>
            <div className="flex items-center gap-1">
              {presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPresetKey(p.key)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    selectedPresetKey === p.key
                      ? "bg-[var(--hertz-black)] text-white"
                      : "bg-[var(--neutral-100)] text-[var(--neutral-600)] hover:bg-[var(--neutral-200)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-[var(--neutral-600)] mt-1.5">
          BM: <span className="font-semibold text-[var(--hertz-black)]">{bmName}</span>
        </p>
      </div>

      {spotData && (
        <>
          {/* Metrics vs zone benchmark */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          >
            <MetricComparison label="Conversion Rate" branchVal={spotData.conversionRate} zoneVal={zoneBenchmark.conversionRate} onClick={() => setDrilldownMetric("conversion_rate")} />
            <MetricComparison label="Contacted < 30 min" branchVal={spotData.pctWithin30} zoneVal={zoneBenchmark.pctWithin30} onClick={() => setDrilldownMetric("contacted_within_30_min")} />
            <MetricComparison label="Branch Contact %" branchVal={spotData.branchPct} zoneVal={zoneBenchmark.branchPct} onClick={() => setDrilldownMetric("branch_vs_hrd_split")} />
            <MetricComparison label="Comment Rate" branchVal={spotData.commentRate} zoneVal={zoneBenchmark.commentCompliance} onClick={() => setDrilldownMetric("meeting_prep_comment_rate")} />
          </motion.div>

          {/* Red flags */}
          <div className="flex gap-4">
            <div className={`transition-all duration-300 ${selectedLead ? "w-1/2" : "w-full"}`}>
              {/* Untouched leads */}
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-[var(--hertz-black)] uppercase tracking-wider">
                    Untouched Leads
                  </h3>
                  {spotData.untouched.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#C62828]/15 text-[#C62828] text-xs font-bold">
                      {spotData.untouched.length}
                    </span>
                  )}
                </div>
                <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden">
                  {spotData.untouched.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[var(--neutral-500)] text-sm bg-emerald-50/50">
                      <svg className="w-5 h-5 mx-auto mb-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      No untouched leads — all cancelled/unused leads had at least one contact attempt.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-center">Days Open</th>
                          <th className="px-4 py-3 text-left">HLES Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spotData.untouched.map((lead) => (
                          <tr
                            key={lead.id}
                            onClick={() => { setSelectedLeadId(lead.id); setDirective(""); setDirectiveSaved(false); }}
                            className={`border-t border-[var(--neutral-100)] cursor-pointer transition-colors ${
                              selectedLeadId === lead.id ? "bg-[var(--hertz-primary-subtle)]" : "hover:bg-[var(--neutral-50)]"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-[var(--hertz-black)]">{lead.customer}</td>
                            <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                            <td className="px-4 py-3 text-center text-[var(--neutral-600)]">{lead.daysOpen ?? "—"}d</td>
                            <td className="px-4 py-3 text-[var(--neutral-500)] text-xs truncate max-w-[180px]" title={lead.hlesReason ?? ""}>{lead.hlesReason ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>

              {/* Mismatch leads */}
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-[var(--hertz-black)] uppercase tracking-wider">
                    Data Mismatches
                  </h3>
                  {spotData.mismatches.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      {spotData.mismatches.length}
                    </span>
                  )}
                </div>
                <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden">
                  {spotData.mismatches.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[var(--neutral-500)] text-sm bg-emerald-50/50">
                      <svg className="w-5 h-5 mx-auto mb-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      No data mismatches found.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--hertz-black)] text-xs text-white font-semibold uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Mismatch Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spotData.mismatches.map((lead) => (
                          <tr
                            key={lead.id}
                            onClick={() => { setSelectedLeadId(lead.id); setDirective(""); setDirectiveSaved(false); }}
                            className={`border-t border-[var(--neutral-100)] cursor-pointer transition-colors ${
                              selectedLeadId === lead.id ? "bg-[var(--hertz-primary-subtle)]" : "hover:bg-[var(--neutral-50)]"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-[var(--hertz-black)]">{lead.customer}</td>
                            <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                            <td className="px-4 py-3 text-xs text-amber-700">{lead.mismatchReason ?? "Activity does not match outcome"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Slide-in lead panel */}
            <AnimatePresence>
              {selectedLead && (
                <motion.div
                  ref={panelRef}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "50%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: easeOut }}
                  className="border border-[var(--neutral-200)] rounded-lg bg-white overflow-y-auto"
                  style={{ maxHeight: 700 }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-[var(--hertz-black)]">{selectedLead.customer}</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewLead(selectedLead.id)}
                          className="text-xs font-medium text-[var(--neutral-600)] hover:text-[var(--hertz-black)] transition-colors"
                        >
                          Full detail
                        </button>
                        <button
                          onClick={() => setSelectedLeadId(null)}
                          className="text-[var(--neutral-400)] hover:text-[var(--hertz-black)] transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <ThreeColumnReview lead={selectedLead} showMismatchWarning={!!selectedLead.mismatch} />

                    <div className="mt-4 pt-4 border-t border-[var(--neutral-200)]">
                      <label className="text-xs font-bold text-[var(--hertz-black)] uppercase tracking-wider">GM Directive</label>
                      {selectedLead.gmDirective && (
                        <div className="mt-2 mb-2 px-3 py-2 bg-[var(--neutral-50)] rounded-lg text-sm text-[var(--neutral-600)]">
                          <span className="font-medium text-[var(--hertz-black)]">Previous:</span> {selectedLead.gmDirective}
                        </div>
                      )}
                      <textarea
                        value={directive}
                        onChange={(e) => setDirective(e.target.value)}
                        placeholder="Add directive for BM..."
                        className="w-full mt-2 px-3 py-2 border border-[var(--neutral-200)] rounded-lg text-sm resize-none focus:outline-none focus:border-[var(--hertz-primary)] focus:ring-1 focus:ring-[var(--hertz-primary)]"
                        rows={3}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={handleSaveDirective}
                          disabled={!directive.trim() || directiveSaving}
                          className="px-4 py-1.5 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-sm font-medium hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {directiveSaving ? "Saving..." : "Send Directive"}
                        </button>
                        <button
                          onClick={handleMarkReviewed}
                          className="px-4 py-1.5 border border-[var(--neutral-300)] text-[var(--hertz-black)] rounded-lg text-sm font-medium hover:bg-[var(--neutral-100)] transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Mark Reviewed
                        </button>
                        {directiveSaved && (
                          <span className="text-xs text-[var(--color-success)] font-medium">Directive saved</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
