import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import StatusBadge from "./StatusBadge";
import StatusChangeModal, { statusChangeNeedsModal } from "./StatusChangeModal";
import { formatDateTimeShort } from "../utils/dateTime";

const COLUMNS = [
  { key: "Rented", label: "Rented", color: "border-[#2E7D32]", headerBg: "bg-[#2E7D32]/10", countColor: "text-[#2E7D32]" },
  { key: "Cancelled", label: "Cancelled", color: "border-[#C62828]", headerBg: "bg-[#C62828]/10", countColor: "text-[#C62828]" },
  { key: "Unused", label: "Unused", color: "border-amber-400", headerBg: "bg-amber-50", countColor: "text-[#1A1A1A]" },
];

function formatNow() {
  return formatDateTimeShort(new Date());
}

function LeadCard({ lead, org, onLeadClick, isDragging, dataOnboarding }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `lead-${lead.id}`,
    data: { lead },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const zone = org?.zone ?? "—";
  const isClosedRented = lead.status === "Rented" && lead.enrichmentComplete;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      {...(dataOnboarding ? { "data-onboarding": dataOnboarding } : {})}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-lg border border-[var(--neutral-200)] p-3 shadow-[var(--shadow-sm)] cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[var(--neutral-300)] transition-all duration-150 ${
        isClosedRented ? "bg-[var(--neutral-100)] text-[var(--neutral-500)] line-through" : "bg-white"
      } ${isDragging ? "opacity-60 shadow-lg ring-2 ring-[var(--hertz-primary)]" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onLeadClick?.(lead);
      }}
    >
      <p className="font-semibold text-sm text-[var(--hertz-black)] truncate" title={lead.customer}>
        {lead.customer}
      </p>
      <p className="text-xs text-[var(--neutral-600)] font-mono mt-0.5">{lead.reservationId}</p>
      <p className="text-xs text-[var(--neutral-600)] mt-1">{lead.branch}</p>
      <div className="flex items-center justify-between mt-2">
        <StatusBadge status={lead.status} />
        <span className="text-[10px] text-[var(--neutral-500)]">{lead.daysOpen}d · {zone}</span>
      </div>
      {lead.timeToFirstContact && (
        <p className="text-[10px] text-[var(--neutral-500)] mt-1">1st contact: {lead.timeToFirstContact}</p>
      )}
    </motion.div>
  );
}

function DroppableColumn({ col, columnLeads, getHierarchyForBranch, onLeadClick, activeId }) {
  const { isOver, setNodeRef } = useDroppable({ id: `column-${col.key}` });
  const isActiveColumn = activeId?.startsWith("lead-");

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex-shrink-0 w-64 rounded-lg border-2 ${col.color} ${col.headerBg} flex flex-col overflow-hidden transition-colors ${
        isOver && isActiveColumn ? "ring-2 ring-[var(--hertz-primary)] ring-offset-2" : ""
      }`}
    >
      <div className="px-4 py-3 border-b border-[var(--neutral-200)] flex items-center justify-between">
        <span className="font-semibold text-sm text-[var(--hertz-black)]">{col.label}</span>
        <span className={`text-xs font-bold ${col.countColor}`}>{columnLeads.length}</span>
      </div>
      <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[200px]">
        {columnLeads.length === 0 ? (
          <p className="text-xs text-[var(--neutral-500)] py-6 text-center">No leads</p>
        ) : (
          columnLeads.map((lead, i) => {
            const org = getHierarchyForBranch?.(lead.branch);
            return (
              <LeadCard
                key={lead.id}
                lead={lead}
                org={org}
                onLeadClick={onLeadClick}
                isDragging={activeId === `lead-${lead.id}`}
                dataOnboarding={i === 0 ? "lead-row" : undefined}
              />
            );
          })
        )}
      </div>
    </motion.div>
  );
}

export default function LeadsBoardView({ leads, onLeadClick, getHierarchyForBranch, onStatusChange }) {
  const { userProfile } = useAuth();
  const [pendingDrop, setPendingDrop] = useState(null); // { lead, toStatus }
  const [activeId, setActiveId] = useState(null);
  const author = userProfile?.displayName ?? "Branch Manager";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !onStatusChange) return;
    const leadId = active.id?.replace("lead-", "");
    const toStatus = over.id?.replace("column-", "");
    if (!leadId || !toStatus || !COLUMNS.some((c) => c.key === toStatus)) return;

    const lead = leads.find((l) => String(l.id) === leadId);
    if (!lead || lead.status === toStatus) return;

    if (statusChangeNeedsModal(toStatus)) {
      setPendingDrop({ lead, toStatus });
    } else {
      // Rented only needs nextAction - we can use a minimal enrichment with CLOSE_ACTION
      const enrichment = {
        reason: null,
        notes: lead.enrichment?.notes ?? "",
        nextAction: "Close — no further action",
        followUpDate: null,
      };
      const newEntry = {
        time: formatNow(),
        timestamp: Date.now(),
        author,
        role: "bm",
        action: `Status changed: ${lead.status} → ${toStatus}`,
        notes: "",
        source: "enrichment",
      };
      onStatusChange(lead.id, enrichment, newEntry, toStatus);
    }
  }, [leads, onStatusChange]);

  const handleModalConfirm = useCallback(
    async (enrichment) => {
      if (!pendingDrop || !onStatusChange) return;
      const { lead, toStatus } = pendingDrop;
      const newEntry = {
        time: formatNow(),
        timestamp: Date.now(),
        author,
        role: "bm",
        action: `Status changed: ${lead.status} → ${toStatus}`,
        notes: enrichment.notes || "",
        source: "enrichment",
      };
      await onStatusChange(lead.id, enrichment, newEntry, toStatus);
      setPendingDrop(null);
    },
    [pendingDrop, onStatusChange]
  );

  const leadsByStatus = COLUMNS.reduce((acc, col) => {
    let columnLeads = leads.filter((l) => l.status === col.key);
    // Rented + enrichment complete go to bottom
    if (col.key === "Rented") {
      columnLeads = [...columnLeads].sort((a, b) => {
        const aClosed = a.enrichmentComplete;
        const bClosed = b.enrichmentComplete;
        return (aClosed ? 1 : 0) - (bClosed ? 1 : 0);
      });
    }
    acc[col.key] = columnLeads;
    return acc;
  }, {});

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2 min-h-[320px]">
          {COLUMNS.map((col, colIdx) => {
            const columnLeads = leadsByStatus[col.key] ?? [];
            return (
              <DroppableColumn
                key={col.key}
                col={col}
                columnLeads={columnLeads}
                getHierarchyForBranch={getHierarchyForBranch}
                onLeadClick={onLeadClick}
                activeId={activeId}
              />
            );
          })}
        </div>
      </DndContext>

      {pendingDrop && (
        <StatusChangeModal
          lead={pendingDrop.lead}
          fromStatus={pendingDrop.lead.status}
          toStatus={pendingDrop.toStatus}
          onConfirm={handleModalConfirm}
          onCancel={() => setPendingDrop(null)}
        />
      )}
    </>
  );
}
