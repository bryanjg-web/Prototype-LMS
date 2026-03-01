import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useData } from "../../context/DataContext";
import { getCancelledLeads } from "../../selectors/demoSelectors";
import { orgMapping } from "../../data/mockData";
import LeadQueue from "../LeadQueue";

function useOrgFilterOptions() {
  return useMemo(() => {
    const bms = [...new Set(orgMapping.map((o) => o.bm))].sort();
    const branches = [...new Set(orgMapping.map((o) => o.branch))].sort();
    const gms = [...new Set(orgMapping.filter((o) => o.gm).map((o) => o.gm))].sort();
    return { bms, branches, gms };
  }, []);
}

function applyFilters(leads, { bmFilter, branchFilter, gmFilter }) {
  let filtered = leads;
  if (bmFilter !== "All") {
    filtered = filtered.filter((l) => l.bmName === bmFilter);
  }
  if (branchFilter !== "All") {
    filtered = filtered.filter((l) => l.branch === branchFilter);
  }
  if (gmFilter !== "All") {
    const bmsForGm = orgMapping.filter((o) => o.gm === gmFilter).map((o) => o.bm);
    filtered = filtered.filter((l) => bmsForGm.includes(l.bmName));
  }
  return filtered;
}

function FilterBar({ bmFilter, setBmFilter, branchFilter, setBranchFilter, gmFilter, setGmFilter, options }) {
  const selectClass =
    "px-3 py-1.5 border border-[#E6E6E6] rounded text-sm text-[#1A1A1A] bg-white focus:outline-none focus:border-[#FFD100]";

  return (
    <div className="flex items-center gap-3 flex-nowrap overflow-x-auto">
      <label className="text-xs text-[#6E6E6E] font-medium">Branch Manager</label>
      <select className={selectClass} value={bmFilter} onChange={(e) => setBmFilter(e.target.value)}>
        <option>All</option>
        {options.bms.map((bm) => (
          <option key={bm}>{bm}</option>
        ))}
      </select>

      <label className="text-xs text-[#6E6E6E] font-medium ml-2">Zone / Branch</label>
      <select className={selectClass} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
        <option>All</option>
        {options.branches.map((b) => (
          <option key={b}>{b}</option>
        ))}
      </select>

      <label className="text-xs text-[#6E6E6E] font-medium ml-2">GM</label>
      <select className={selectClass} value={gmFilter} onChange={(e) => setGmFilter(e.target.value)}>
        <option>All</option>
        {options.gms.map((gm) => (
          <option key={gm}>{gm}</option>
        ))}
      </select>
    </div>
  );
}

export default function InteractiveCancelledLeads() {
  const { navigateTo, selectLead } = useApp();
  const { leads } = useData();
  const cancelledLeads = getCancelledLeads(leads);
  const options = useOrgFilterOptions();

  const [bmFilter, setBmFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [gmFilter, setGmFilter] = useState("All");

  const filteredLeads = useMemo(
    () => applyFilters(cancelledLeads, { bmFilter, branchFilter, gmFilter }),
    [cancelledLeads, bmFilter, branchFilter, gmFilter],
  );

  const handleLeadClick = (lead) => {
    selectLead(lead.id);
    navigateTo("gm-review");
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Cancelled Leads</h2>
        <span className="px-2 py-1 bg-[#FFD100] text-[#1A1A1A] rounded text-xs font-medium">
          {filteredLeads.length} unreviewed
        </span>
      </div>
      <div className="mb-4">
        <FilterBar
          bmFilter={bmFilter}
          setBmFilter={setBmFilter}
          branchFilter={branchFilter}
          setBranchFilter={setBranchFilter}
          gmFilter={gmFilter}
          setGmFilter={setGmFilter}
          options={options}
        />
      </div>
      <LeadQueue leads={filteredLeads} onLeadClick={handleLeadClick} />
    </div>
  );
}

export { FilterBar, useOrgFilterOptions, applyFilters };
