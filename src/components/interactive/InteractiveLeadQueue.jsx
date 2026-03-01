import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useData } from "../../context/DataContext";
import { getAllLeads, getUnresolvedLeads, getInsuranceCompanies } from "../../selectors/demoSelectors";
import { getLastTranslogTime } from "../LeadQueue";
import LeadQueue from "../LeadQueue";

// "Now" for this demo
const NOW = new Date("2026-02-26T09:00:00");

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function getWeekPresets() {
  const thisMonday = getMonday(NOW);

  const presets = [
    { label: "All Time", start: null, end: null },
    {
      label: "This Week",
      start: new Date(thisMonday),
      end: new Date(thisMonday.getTime() + 6 * 86400000),
    },
  ];

  for (let i = 1; i <= 3; i++) {
    const monday = new Date(thisMonday.getTime() - i * 7 * 86400000);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    const label = i === 1 ? "Last Week" : `W/C ${formatShortDate(monday)}`;
    presets.push({ label, start: monday, end: sunday });
  }

  return presets;
}

const PRESETS = getWeekPresets();

const selectClass =
  "px-3 py-1.5 border border-[#E6E6E6] rounded text-xs text-[#1A1A1A] bg-white focus:outline-none focus:border-[#FFD100]";

export default function InteractiveLeadQueue() {
  const { navigateTo, selectLead } = useApp();
  const { leads } = useData();
  const allLeads = getAllLeads(leads);
  const unresolved = getUnresolvedLeads(leads);
  const bannerCount = unresolved.length;

  const [selectedPreset, setSelectedPreset] = useState(0); // "All Time"
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const [resTypeFilter, setResTypeFilter] = useState("All");
  const [cdpFilter, setCdpFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [insuranceFilter, setInsuranceFilter] = useState("All");

  // Derive unique values for dropdowns
  const filterOptions = useMemo(() => {
    const resTypes = [...new Set(allLeads.map((l) => l.reservationType).filter(Boolean))].sort();
    const cdps = [...new Set(allLeads.map((l) => l.cdp).filter(Boolean))].sort();
    const statuses = [...new Set(allLeads.map((l) => l.status))].sort();
    const insuranceCompanies = getInsuranceCompanies(leads);
    return { resTypes, cdps, statuses, insuranceCompanies };
  }, [allLeads]);

  const filteredLeads = useMemo(() => {
    let result = allLeads;

    // Date filter
    if (useCustom && customStart && customEnd) {
      const s = new Date(customStart + "T00:00:00");
      const e = new Date(customEnd + "T23:59:59");
      result = result.filter((lead) => {
        const t = getLastTranslogTime(lead);
        return t && t >= s && t <= e;
      });
    } else {
      const preset = PRESETS[selectedPreset];
      if (preset && preset.start) {
        result = result.filter((lead) => {
          const t = getLastTranslogTime(lead);
          return t && t >= preset.start && t <= new Date(preset.end.getTime() + 86400000 - 1);
        });
      }
    }

    // Dropdown filters
    if (resTypeFilter !== "All") {
      result = result.filter((l) => l.reservationType === resTypeFilter);
    }
    if (cdpFilter !== "All") {
      result = result.filter((l) => l.cdp === cdpFilter);
    }
    if (statusFilter !== "All") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (insuranceFilter !== "All") {
      result = result.filter((l) => l.insuranceCompany === insuranceFilter);
    }

    return result;
  }, [allLeads, selectedPreset, useCustom, customStart, customEnd, resTypeFilter, cdpFilter, statusFilter, insuranceFilter]);

  const handleLeadClick = (lead) => {
    selectLead(lead.id);
    navigateTo("bm-lead-detail");
  };

  const mismatchCount = useMemo(
    () => filteredLeads.filter((l) => l.mismatch).length,
    [filteredLeads],
  );

  const activePreset = PRESETS[selectedPreset];
  const subtitle = useCustom && customStart && customEnd
    ? `${formatShortDate(new Date(customStart))} – ${formatShortDate(new Date(customEnd))}`
    : activePreset?.start
      ? `${formatShortDate(activePreset.start)} – ${formatShortDate(activePreset.end)}`
      : "All leads";

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">My Leads</h2>
      <p className="text-sm text-[#6E6E6E] mb-4">{subtitle}</p>

      {/* Week filter bar */}
      <div className="flex items-center gap-1.5 flex-nowrap mb-3 overflow-x-auto">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            onClick={() => { setSelectedPreset(i); setUseCustom(false); }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              !useCustom && selectedPreset === i
                ? "bg-[#FFD100] text-[#1A1A1A]"
                : "bg-gray-100 text-[#6E6E6E] hover:bg-gray-200"
            }`}
          >
            {preset.label}
          </button>
        ))}

        <span className="text-[#E6E6E6] mx-0.5">|</span>

        <button
          onClick={() => setUseCustom(true)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
            useCustom
              ? "bg-[#FFD100] text-[#1A1A1A]"
              : "bg-gray-100 text-[#6E6E6E] hover:bg-gray-200"
          }`}
        >
          Custom
        </button>

        {useCustom && (
          <div className="flex items-center gap-1.5 ml-0.5">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 border border-[#E6E6E6] rounded text-xs text-[#1A1A1A] focus:outline-none focus:border-[#FFD100]"
            />
            <span className="text-xs text-[#6E6E6E]">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 border border-[#E6E6E6] rounded text-xs text-[#1A1A1A] focus:outline-none focus:border-[#FFD100]"
            />
          </div>
        )}
      </div>

      {/* Dropdown filters */}
      <div className="flex items-center gap-3 flex-nowrap mb-4 overflow-x-auto">
        <label className="text-xs text-[#6E6E6E] font-medium">Res. Type</label>
        <select className={selectClass} value={resTypeFilter} onChange={(e) => setResTypeFilter(e.target.value)}>
          <option>All</option>
          {filterOptions.resTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <label className="text-xs text-[#6E6E6E] font-medium ml-2">CDP</label>
        <select className={selectClass} value={cdpFilter} onChange={(e) => setCdpFilter(e.target.value)}>
          <option>All</option>
          {filterOptions.cdps.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <label className="text-xs text-[#6E6E6E] font-medium ml-2">Status</label>
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>
          {filterOptions.statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <label className="text-xs text-[#6E6E6E] font-medium ml-2">Insurance Co.</label>
        <select className={selectClass} value={insuranceFilter} onChange={(e) => setInsuranceFilter(e.target.value)}>
          <option>All</option>
          {filterOptions.insuranceCompanies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <LeadQueue
        leads={filteredLeads}
        bannerCount={bannerCount}
        mismatchCount={mismatchCount}
        onLeadClick={handleLeadClick}
      />
    </div>
  );
}
