/**
 * Meeting Prep — Dedicated page. Reached from Summary module card or sidebar.
 */
import { useApp } from "../../context/AppContext";
import BackButton from "../BackButton";
import InteractiveMeetingPrep from "./InteractiveMeetingPrep";

export default function InteractiveMeetingPrepPage() {
  const { navigateTo } = useApp();
  return (
    <div className="max-w-6xl">
      <BackButton onClick={() => navigateTo("bm-dashboard")} label="Back to Summary" />
      <div id="compliance-meeting" className="scroll-mt-4">
        <InteractiveMeetingPrep />
      </div>
    </div>
  );
}
