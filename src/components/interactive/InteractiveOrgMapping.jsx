import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { orgMapping } from "../../data/mockData";

const bmOptions = [
  "J. Smith", "M. Johnson", "A. Williams", "S. Davis", "T. Brown",
  "L. Garcia", "R. Martinez", "B. Jackson", "C. Taylor", "D. Anderson",
];

export default function InteractiveOrgMapping() {
  const [rows, setRows] = useState(() =>
    orgMapping.map((r) => ({ ...r, autoDerived: !r.bm || r.bm === "— Unassigned —" ? false : true })),
  );
  const [editingRow, setEditingRow] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [filterZone, setFilterZone] = useState("All");
  const [filterUnassigned, setFilterUnassigned] = useState(false);

  const zones = useMemo(
    () => ["All", ...new Set(rows.map((r) => r.zone).filter(Boolean))],
    [rows],
  );

  const unassignedCount = rows.filter((r) => !r.bm || r.bm === "— Unassigned —").length;

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filterZone !== "All") result = result.filter((r) => r.zone === filterZone);
    if (filterUnassigned) result = result.filter((r) => !r.bm || r.bm === "— Unassigned —");
    return result;
  }, [rows, filterZone, filterUnassigned]);

  const handleBMChange = (branch, value) => {
    setRows((prev) => prev.map((r) => (r.branch === branch ? { ...r, bm: value } : r)));
  };

  const handleConfirm = () => {
    setEditingRow(null);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--hertz-black)]">Organisation Mapping</h2>
          <p className="text-sm text-[var(--neutral-500)] mt-1">
            Hierarchy (AM, GM, Zone) is auto-derived from HLES uploads. Manually assign Branch Managers below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg text-sm font-semibold hover:bg-[#E6BC00] transition-colors cursor-pointer"
          >
            Save Changes
          </button>
          {isSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[#2E7D32] text-sm font-medium"
            >
              Saved
            </motion.span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--neutral-500)]">Zone</label>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="text-sm border border-[var(--neutral-200)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[var(--hertz-primary)]"
          >
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setFilterUnassigned(!filterUnassigned)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            filterUnassigned
              ? "border-[#C62828] bg-[#FFEBEE] text-[#C62828]"
              : "border-[var(--neutral-200)] text-[var(--neutral-500)] hover:border-[var(--neutral-400)]"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${unassignedCount > 0 ? "bg-[#C62828]" : "bg-[var(--neutral-300)]"}`} />
          {unassignedCount} Unassigned
        </button>
        <span className="text-xs text-[var(--neutral-400)]">
          {filteredRows.length} of {rows.length} branches
        </span>
      </div>

      {/* Table */}
      <div className="border border-[var(--neutral-200)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--hertz-black)] text-white text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left font-medium">Branch Manager</th>
              <th className="px-4 py-2.5 text-left font-medium">Branch Location</th>
              <th className="px-4 py-2.5 text-left font-medium">
                Area Manager
                <span className="ml-1 text-[10px] font-normal text-[var(--neutral-400)]">(HLES)</span>
              </th>
              <th className="px-4 py-2.5 text-left font-medium">
                General Manager
                <span className="ml-1 text-[10px] font-normal text-[var(--neutral-400)]">(HLES)</span>
              </th>
              <th className="px-4 py-2.5 text-left font-medium">
                Zone
                <span className="ml-1 text-[10px] font-normal text-[var(--neutral-400)]">(HLES)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => {
              const isUnassigned = !row.bm || row.bm === "— Unassigned —";
              const isEditing = editingRow === row.branch;
              return (
                <motion.tr
                  key={row.branch}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`border-t border-[var(--neutral-100)] ${
                    isEditing
                      ? "bg-[var(--hertz-primary-subtle)]"
                      : isUnassigned
                        ? "bg-[#FFF8F8]"
                        : "hover:bg-[var(--neutral-50)]"
                  }`}
                >
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={row.bm || ""}
                          onChange={(e) => handleBMChange(row.branch, e.target.value)}
                          className="border border-[var(--hertz-primary)] rounded px-2 py-1 bg-white text-sm focus:outline-none"
                          autoFocus
                        >
                          <option value="">— Select BM —</option>
                          {bmOptions.map((bm) => (
                            <option key={bm} value={bm}>{bm}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingRow(null)}
                          className="text-xs text-[var(--neutral-500)] hover:text-[var(--hertz-black)] cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    ) : isUnassigned ? (
                      <button
                        onClick={() => setEditingRow(row.branch)}
                        className="text-[#C62828] italic cursor-pointer hover:underline text-sm"
                      >
                        — Unassigned — click to assign
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingRow(row.branch)}
                        className="cursor-pointer hover:text-[var(--hertz-primary)] transition-colors text-sm font-medium"
                      >
                        {row.bm}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--neutral-600)]">{row.branch}</td>
                  <td className="px-4 py-2.5 text-[var(--neutral-500)]">{row.am || "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--neutral-500)]">{row.gm || "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--neutral-500)]">{row.zone || "—"}</td>
                </motion.tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--neutral-400)] text-sm">
                  No branches match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--neutral-400)] mt-3">
        AM, GM, and Zone columns are read-only — they update automatically when HLES data is uploaded.
        Only Branch Manager assignment is manually editable.
      </p>
    </div>
  );
}
