/**
 * Meeting Prep — Dedicated page. Reached from Summary module card or sidebar.
 */
import InteractiveMeetingPrep from "./InteractiveMeetingPrep";

export default function InteractiveMeetingPrepPage() {
  return (
    <div className="max-w-6xl">
      <div id="compliance-meeting" className="scroll-mt-4">
        <InteractiveMeetingPrep />
      </div>
    </div>
  );
}
