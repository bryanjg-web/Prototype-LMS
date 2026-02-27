import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cancellationReasonCategories } from "../../data/mockData";

export default function InteractiveLegend() {
  const [categories, setCategories] = useState(() =>
    cancellationReasonCategories.map((c) => ({ ...c, reasons: [...c.reasons] })),
  );
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [editingReason, setEditingReason] = useState(null); // { catIdx, reasonIdx }
  const [editValue, setEditValue] = useState("");
  const [addingTo, setAddingTo] = useState(null); // catIdx
  const [newReason, setNewReason] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const toggleExpand = (idx) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
    setEditingReason(null);
    setAddingTo(null);
  };

  const startEdit = (catIdx, reasonIdx) => {
    setEditingReason({ catIdx, reasonIdx });
    setEditValue(categories[catIdx].reasons[reasonIdx]);
  };

  const saveEdit = () => {
    if (!editingReason || !editValue.trim()) return;
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci === editingReason.catIdx
          ? { ...cat, reasons: cat.reasons.map((r, ri) => (ri === editingReason.reasonIdx ? editValue.trim() : r)) }
          : cat,
      ),
    );
    setEditingReason(null);
    setEditValue("");
  };

  const deleteReason = (catIdx, reasonIdx) => {
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci === catIdx ? { ...cat, reasons: cat.reasons.filter((_, ri) => ri !== reasonIdx) } : cat,
      ),
    );
  };

  const addReason = (catIdx) => {
    if (!newReason.trim()) return;
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci === catIdx ? { ...cat, reasons: [...cat.reasons, newReason.trim()] } : cat,
      ),
    );
    setNewReason("");
    setAddingTo(null);
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    setCategories((prev) => [...prev, { category: newCategory.trim(), reasons: [] }]);
    setNewCategory("");
    setAddingCategory(false);
    setExpandedIdx(categories.length);
  };

  const deleteCategory = (catIdx) => {
    setCategories((prev) => prev.filter((_, i) => i !== catIdx));
    if (expandedIdx === catIdx) setExpandedIdx(null);
  };

  const handlePublish = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const totalReasons = categories.reduce((sum, c) => sum + c.reasons.length, 0);

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Cancellation Reason Legend</h2>
      <p className="text-sm text-[#6E6E6E] mb-4">
        Configure the categories and reasons that Branch Managers use when commenting on cancelled leads.
        Changes here flow to all comment forms across the portal.
      </p>

      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs text-[#6E6E6E]">
          {categories.length} categories &middot; {totalReasons} reasons
        </span>
      </div>

      <div className="max-w-2xl space-y-2">
        {categories.map((cat, catIdx) => {
          const isExpanded = expandedIdx === catIdx;
          return (
            <div
              key={catIdx}
              className="border border-[#E6E6E6] rounded-lg overflow-hidden"
            >
              {/* Category header */}
              <button
                onClick={() => toggleExpand(catIdx)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-4 h-4 text-[#6E6E6E] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-medium text-[#1A1A1A]">{cat.category}</span>
                </div>
                <span className="text-xs text-[#6E6E6E] bg-white px-2 py-0.5 rounded border border-[#E6E6E6]">
                  {cat.reasons.length} reason{cat.reasons.length !== 1 ? "s" : ""}
                </span>
              </button>

              {/* Expanded sub-reasons */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-2 space-y-1 border-t border-[#E6E6E6]">
                      {cat.reasons.map((reason, reasonIdx) => {
                        const isEditing =
                          editingReason?.catIdx === catIdx && editingReason?.reasonIdx === reasonIdx;
                        return (
                          <div
                            key={reasonIdx}
                            className="flex items-center gap-2 group py-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F5C400] shrink-0" />
                            {isEditing ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                                  className="flex-1 px-2 py-1 border border-[#F5C400] rounded text-sm focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={saveEdit}
                                  className="text-xs text-[#2E7D32] font-medium hover:underline cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingReason(null)}
                                  className="text-xs text-[#6E6E6E] hover:underline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 text-sm text-[#1A1A1A]">{reason}</span>
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                                  <button
                                    onClick={() => startEdit(catIdx, reasonIdx)}
                                    className="text-xs text-[#6E6E6E] hover:text-[#1A1A1A] cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteReason(catIdx, reasonIdx)}
                                    className="text-xs text-[#C62828] hover:underline cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {cat.reasons.length === 0 && (
                        <p className="text-xs text-[#6E6E6E] italic py-1">No reasons yet — add one below.</p>
                      )}

                      {/* Add reason row */}
                      {addingTo === catIdx ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addReason(catIdx)}
                            placeholder="New reason..."
                            className="flex-1 px-2 py-1 border border-[#E6E6E6] rounded text-sm focus:outline-none focus:border-[#F5C400]"
                            autoFocus
                          />
                          <button
                            onClick={() => addReason(catIdx)}
                            className="text-xs text-[#2E7D32] font-medium hover:underline cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setAddingTo(null); setNewReason(""); }}
                            className="text-xs text-[#6E6E6E] hover:underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-1 pb-1">
                          <button
                            onClick={() => setAddingTo(catIdx)}
                            className="text-xs text-[#F5C400] font-medium hover:underline cursor-pointer"
                          >
                            + Add Reason
                          </button>
                          <button
                            onClick={() => deleteCategory(catIdx)}
                            className="text-xs text-[#C62828] opacity-60 hover:opacity-100 cursor-pointer"
                          >
                            Delete Category
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Add category */}
        {addingCategory ? (
          <div className="flex items-center gap-2 pt-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 border border-[#E6E6E6] rounded text-sm focus:outline-none focus:border-[#F5C400]"
              autoFocus
            />
            <button
              onClick={addCategory}
              className="px-3 py-2 bg-[#F5C400] text-[#1A1A1A] rounded text-xs font-medium hover:bg-[#e0b200] transition-colors cursor-pointer"
            >
              Add
            </button>
            <button
              onClick={() => { setAddingCategory(false); setNewCategory(""); }}
              className="text-xs text-[#6E6E6E] hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingCategory(true)}
            className="w-full py-2.5 border-2 border-dashed border-[#E6E6E6] rounded-lg text-xs text-[#6E6E6E] font-medium hover:border-[#F5C400] hover:text-[#1A1A1A] transition-colors cursor-pointer"
          >
            + Add Category
          </button>
        )}

        {/* Publish */}
        <div className="flex items-center gap-3 justify-end pt-4">
          <button
            onClick={handlePublish}
            className="px-4 py-2 bg-[#F5C400] text-[#1A1A1A] rounded text-sm font-medium hover:bg-[#e0b200] transition-colors cursor-pointer"
          >
            Publish Changes
          </button>
          {isSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[#2E7D32] text-sm font-medium"
            >
              ✓ Published — live across all roles
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
