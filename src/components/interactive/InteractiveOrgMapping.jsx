import { useState } from "react";
import { motion } from "framer-motion";
import { orgMapping } from "../../data/mockData";

const gmOptions = ["D. Williams", "R. Martinez"];

export default function InteractiveOrgMapping() {
  const [rows, setRows] = useState(() =>
    orgMapping.map((r) => ({ ...r }))
  );
  const [editingRow, setEditingRow] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const missingRows = rows
    .map((r, i) => (!r.gm ? i : null))
    .filter((i) => i !== null);

  const handleGMChange = (index, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, gm: value } : r)));
  };

  const handleConfirm = () => {
    setEditingRow(null);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Organisation Mapping</h2>
      <p className="text-sm text-[#6E6E6E] mb-4">Click a GM cell to edit. Assign missing GMs.</p>

      <div className="max-w-5xl space-y-4">
        <div className="border border-[#E6E6E6] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-[#6E6E6E] uppercase tracking-wide">
                <th className="px-4 py-3">Branch Manager</th>
                <th className="px-4 py-3">Branch Location</th>
                <th className="px-4 py-3">Area Manager</th>
                <th className="px-4 py-3">General Manager</th>
                <th className="px-4 py-3">Zone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isMissing = missingRows.includes(i);
                const isEditing = editingRow === i;
                return (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-t border-[#E6E6E6] ${
                      isEditing ? "bg-yellow-50" : isMissing ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">{row.bm}</td>
                    <td className="px-4 py-2.5">{row.branch}</td>
                    <td className="px-4 py-2.5 text-[#6E6E6E]">{row.am || "—"}</td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <select
                          value={row.gm}
                          onChange={(e) => handleGMChange(i, e.target.value)}
                          className="border border-[#F5C400] rounded px-2 py-0.5 bg-white text-sm focus:outline-none"
                          autoFocus
                        >
                          <option value="">— Select —</option>
                          {gmOptions.map((gm) => (
                            <option key={gm} value={gm}>{gm}</option>
                          ))}
                        </select>
                      ) : isMissing && !row.gm ? (
                        <button
                          onClick={() => setEditingRow(i)}
                          className="text-[#C62828] italic cursor-pointer hover:underline"
                        >
                          — Missing — click to assign
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingRow(i)}
                          className="cursor-pointer hover:text-[#F5C400] transition-colors"
                        >
                          {row.gm}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[#6E6E6E]">{row.zone || "—"}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-[#F5C400] text-[#1A1A1A] rounded text-sm font-medium hover:bg-[#e0b200] transition-colors cursor-pointer"
          >
            Confirm Mapping
          </button>
          {isSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[#2E7D32] text-sm font-medium"
            >
              ✓ Saved
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
