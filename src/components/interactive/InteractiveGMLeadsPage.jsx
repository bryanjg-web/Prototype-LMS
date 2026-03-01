import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../../context/DataContext";
import { useApp } from "../../context/AppContext";
import {
  getGMLeads,
  getDateRangePresets,
  getInsuranceCompanies,
  getLeadById,
} from "../../selectors/demoSelectors";
import { orgMapping } from "../../data/mockData";
import StatusBadge from "../StatusBadge";
import ThreeColumnReview from "../ThreeColumnReview";

const STATUS_TABS = ["All", "Cancelled", "Unused"];

export default function InteractiveGMLeadsPage() {
  const { leads } = useData();
  const { navigateTo } = useApp();
  const presets = useMemo(() => getDateRangePresets(), []);

  const [selectedPresetKey, setSelectedPresetKey] = useState("this_week");
  const [statusFilter, setStatusFilter] = useState("All");
  const [bmFilter, setBmFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [insuranceFilter, setInsuranceFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [directive, setDirective] = useState("");
  const [directiveSaved, setDirectiveSaved] = useState(false);
  const panelRef = useRef(null);

  const currentPreset = presets.find((p) => p.key === selectedPresetKey);
  const dateRange = currentPreset ? { start: currentPreset.start, end: currentPreset.end } : null;

  const bmNames = useMemo(() => [...new Set(orgMapping.map((r) => r.bm))].sort(), []);
  const branches = useMemo(() => [...new Set(orgMapping.map((r) => r.branch))].sort(), []);
  const insuranceCompanies = useMemo(() => getInsuranceCompanies(leads), [leads]);

  const filteredLeads = useMemo(
    () => getGMLeads(leads, dateRange, { statusFilter: statusFilter === "All" ? null : statusFilter, bmFilter: bmFilter === "All" ? null : bmFilter, branchFilter: branchFilter === "All" ? null : branchFilter, insuranceFilter: insuranceFilter === "All" ? null : insuranceFilter, searchQuery: searchQuery || null }),
    [leads, dateRange, statusFilter, bmFilter, branchFilter, insuranceFilter, searchQuery]
  );

  const selectedLead = selectedLeadId ? getLeadById(leads, selectedLeadId) : null;

  useEffect(() => {
    if (selectedLead && panelRef.current) {
      panelRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedLeadId]);

  const handleSelectLead = (id) => {
    setSelectedLeadId(id);
    setDirective("");
    setDirectiveSaved(false);
  };

  const handleSaveDirective = () => {
    if (!directive.trim()) return;
    setDirectiveSaved(true);
    setTimeout(() => setDirectiveSaved(false), 2000);
  };

  return (
    <div className="flex h-full gap-0">
      {/* Left: Table */}
      <div className={`transition-all duration-300 ${selectedLead ? "w-[45%]" : "w-full"}`}>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--hertz-black)]">Leads</h1>
            <p className="text-sm text-[var(--neutral-600)] mt-0.5">
              Cancelled and unused leads across all branches — {filteredLeads.length} results
            </p>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPresetKey(p.key)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Status tabs */}
            <div className="flex rounded-lg border border-[var(--neutral-200)] overflow-hidden">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === tab
                      ? "bg-[var(--hertz-black)] text-white"
                      : "bg-white text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <select value={bmFilter} onChange={(e) => setBmFilter(e.target.value)} className="px-3 py-1.5 border border-[var(--neutral-200)] rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]">
              <option value="All">All BMs</option>
              {bmNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-1.5 border border-[var(--neutral-200)] rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]">
              <option value="All">All Branches</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>

            <select value={insuranceFilter} onChange={(e) => setInsuranceFilter(e.target.value)} className="px-3 py-1.5 border border-[var(--neutral-200)] rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]">
              <option value="All">All Insurance</option>
              {insuranceCompanies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or reservation..."
              className="px-3 py-1.5 border border-[var(--neutral-200)] rounded-md text-xs bg-white w-52 focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)]"
            />
          </div>

          {/* Table */}
          <div className="border border-[var(--neutral-200)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--hertz-black)]">
                  <th className="text-left text-white text-xs font-semibold px-4 py-3">Customer</th>
                  <th className="text-left text-white text-xs font-semibold px-4 py-3">Status</th>
                  <th className="text-left text-white text-xs font-semibold px-4 py-3">Branch</th>
                  <th className="text-left text-white text-xs font-semibold px-4 py-3">BM</th>
                  <th className="text-left text-white text-xs font-semibold px-4 py-3">Insurance</th>
                  <th className="text-left text-white text-xs font-semibold px-4 py-3">Days Open</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-[var(--neutral-500)]">
                      No leads match the current filters
                    </td>
                  </tr>
                )}
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => handleSelectLead(lead.id)}
                    className={`border-b border-[var(--neutral-100)] cursor-pointer transition-colors ${
                      selectedLeadId === lead.id
                        ? "bg-[var(--hertz-primary-subtle)]"
                        : "hover:bg-[var(--neutral-50)]"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--hertz-black)]">
                      <div>{lead.customer}</div>
                      <div className="text-xs text-[var(--neutral-500)] font-mono">{lead.reservationId}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.branch}</td>
                    <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.bmName ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.insuranceCompany ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--neutral-600)]">{lead.daysOpen ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: Slide-in Lead Profile Panel */}
      <AnimatePresence mode="wait">
        {selectedLead && (
          <motion.div
            key={selectedLead.id}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="w-[55%] border-l border-[var(--neutral-200)] bg-white overflow-y-auto pl-6"
            ref={panelRef}
          >
            <div className="sticky top-0 bg-white z-10 pb-3 pt-1 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--hertz-black)]">{selectedLead.customer}</h2>
              <button
                onClick={() => setSelectedLeadId(null)}
                className="text-[var(--neutral-500)] hover:text-[var(--hertz-black)] transition-colors cursor-pointer p-1"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <ThreeColumnReview lead={selectedLead} showMismatchWarning={selectedLead.mismatch} />

            {/* GM Directive */}
            <div className="mt-6 border border-[var(--neutral-200)] rounded-xl p-5">
              <h3 className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wide mb-3">GM Directive</h3>
              {selectedLead.gmDirective && (
                <div className="mb-3 px-3 py-2 bg-[var(--neutral-50)] rounded-lg text-sm text-[var(--neutral-600)]">
                  <span className="font-medium text-[var(--hertz-black)]">Previous:</span> {selectedLead.gmDirective}
                </div>
              )}
              <textarea
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
                placeholder="Add directive for BM (e.g., 'Follow up with customer by EOD')"
                rows={3}
                className="w-full border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--hertz-primary)] resize-none"
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleSaveDirective}
                  disabled={!directive.trim()}
                  className="px-4 py-2 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-sm font-medium hover:bg-[var(--hertz-primary-hover)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Directive
                </button>
                {directiveSaved && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-600 font-medium">
                    Directive saved
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
