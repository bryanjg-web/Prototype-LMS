import { motion } from "framer-motion";
import TitleCard from "../components/TitleCard";
import ComplianceDashboard from "../components/ComplianceDashboard";
import LeadQueue from "../components/LeadQueue";
import ThreeColumnReview from "../components/ThreeColumnReview";
import StatusBadge from "../components/StatusBadge";
import { leads, branchManagers } from "../data/mockData";

const summaryCards = [
  { label: "Cancelled Unreviewed", value: "23", color: "text-[#C62828]" },
  { label: "Unused Overdue", value: "8", color: "text-[#F5C400]" },
  { label: "Comment Compliance", value: "91%", color: "text-[#2E7D32]" },
];

const cancelledLeads = leads.filter((l) => l.status === "Cancelled" && !l.archived);

function GM1() {
  return (
    <TitleCard
      title="General Manager — Compliance & Oversight"
      subtitle="Track conversion. Review cancellations. Drive accountability."
    />
  );
}

function GM2() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Compliance Dashboard</h2>
        <span className="text-sm text-[#6E6E6E]">D. Williams — Eastern Zone</span>
      </div>
      <ComplianceDashboard branchManagers={branchManagers} summaryCards={summaryCards} />
    </div>
  );
}

function GM3() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Weekly Meeting</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-[#F5C400] text-[#1A1A1A] rounded font-medium">Cancelled · Unreviewed</span>
        </div>
      </div>
      <LeadQueue leads={cancelledLeads} />
    </div>
  );
}

function GM4() {
  const lead = leads.find((l) => l.id === 1);
  return <ThreeColumnReview lead={lead} />;
}

function GM5() {
  const lead = leads.find((l) => l.id === 3);
  return (
    <div>
      <ThreeColumnReview lead={lead} showMismatchWarning />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 text-sm text-[#6E6E6E] italic text-center"
      >
        The stated reason doesn&apos;t match the evidence. Was this lead ever actually worked?
      </motion.p>
    </div>
  );
}

function GM6() {
  const lead = leads.find((l) => l.id === 3);
  return (
    <div className="space-y-6">
      <ThreeColumnReview lead={lead} showMismatchWarning />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-md mx-auto space-y-3"
      >
        <div>
          <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
            GM Directive
          </label>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="border border-[#F5C400] bg-yellow-50 rounded px-3 py-2 text-sm"
          >
            No contact attempts recorded. Discuss in meeting — need to understand what happened.
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center gap-3"
        >
          <button className="px-3 py-1.5 bg-[#6E6E6E] text-white rounded text-sm">
            ✓ Archive — Reviewed
          </button>
          <StatusBadge status="Reviewed" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function GM7() {
  const untouchedLeads = leads.filter((l) => l.status === "Unused" && !l.enrichmentComplete);
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Spot Check — Central Station</h2>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-2 py-1 bg-red-50 text-[#C62828] text-xs rounded font-medium border border-red-200"
        >
          5 untouched leads
        </motion.span>
      </div>
      <LeadQueue leads={untouchedLeads} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-4 max-w-md"
      >
        <label className="text-xs text-[#6E6E6E] uppercase tracking-wide block mb-1">
          GM Directive
        </label>
        <div className="border border-[#F5C400] bg-yellow-50 rounded px-3 py-2 text-sm">
          Follow up on these before Friday.
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 text-sm text-[#6E6E6E] italic"
      >
        No need to wait for the weekly call.
      </motion.p>
    </div>
  );
}

function GM8() {
  return (
    <TitleCard
      title="Full visibility. No surprises."
      subtitle="Every lead accounted for."
      summary
    />
  );
}

export const gmSteps = [GM1, GM2, GM3, GM4, GM5, GM6, GM7, GM8];
