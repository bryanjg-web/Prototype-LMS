/**
 * Leaderboard — Dedicated page. Reached from Summary module card or sidebar.
 */
import { useApp } from "../../context/AppContext";
import BackButton from "../BackButton";
import InteractiveBMLeaderboard from "./InteractiveBMLeaderboard";

export default function InteractiveLeaderboardPage() {
  const { navigateTo } = useApp();
  return (
    <div className="max-w-6xl">
      <BackButton onClick={() => navigateTo("bm-dashboard")} label="Back to Summary" />
      <div id="leaderboard" className="scroll-mt-4">
        <InteractiveBMLeaderboard />
      </div>
    </div>
  );
}
