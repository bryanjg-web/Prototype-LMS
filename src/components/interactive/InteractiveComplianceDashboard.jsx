import { useState } from "react";
import { useApp } from "../../context/AppContext";
import ComplianceDashboard from "../ComplianceDashboard";
import { getBranchManagers, getGMStats, getInsuranceCompanies } from "../../selectors/demoSelectors";

export default function InteractiveComplianceDashboard() {
  const { navigateTo } = useApp();
  const managers = getBranchManagers();
  const stats = getGMStats();
  const insuranceCompanies = getInsuranceCompanies();
  const [insuranceFilter, setInsuranceFilter] = useState("All");

  const summaryCards = [
    { label: "Cancelled Unreviewed", value: String(stats.cancelledUnreviewed), color: "text-[#C62828]" },
    { label: "Unused Overdue", value: String(stats.unusedOverdue), color: "text-[#F5C400]" },
    { label: "Comment Compliance", value: `${stats.enrichmentCompliance}%`, color: "text-[#2E7D32]" },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-1">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Compliance Dashboard</h2>
        <span className="text-sm text-[#6E6E6E]">D. Williams — Eastern Zone</span>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-xs text-[#6E6E6E]">Week of Feb 17–21</p>
        <span className="text-[#E6E6E6]">|</span>
        <label className="text-xs text-[#6E6E6E] font-medium">Insurance Co.</label>
        <select
          value={insuranceFilter}
          onChange={(e) => setInsuranceFilter(e.target.value)}
          className="px-3 py-1.5 border border-[#E6E6E6] rounded text-xs text-[#1A1A1A] bg-white focus:outline-none focus:border-[#F5C400]"
        >
          <option>All</option>
          {insuranceCompanies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <ComplianceDashboard branchManagers={managers} summaryCards={summaryCards} />
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigateTo("gm-cancelled")}
          className="px-4 py-2 bg-[#F5C400] text-[#1A1A1A] rounded text-sm font-medium hover:bg-[#e0b200] transition-colors cursor-pointer"
        >
          Review Cancelled Leads
        </button>
        <button
          onClick={() => navigateTo("gm-spot-check")}
          className="px-4 py-2 border border-[#E6E6E6] text-[#1A1A1A] rounded text-sm font-medium hover:border-[#F5C400] transition-colors cursor-pointer"
        >
          Spot Check
        </button>
      </div>
    </div>
  );
}
