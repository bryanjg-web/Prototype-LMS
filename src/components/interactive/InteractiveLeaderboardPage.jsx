/**
 * Leaderboard — Dedicated page. Reached from Summary module card or sidebar.
 */
import InteractiveBMLeaderboard from "./InteractiveBMLeaderboard";

export default function InteractiveLeaderboardPage() {
  return (
    <div className="max-w-6xl">
      <div id="leaderboard" className="scroll-mt-4">
        <InteractiveBMLeaderboard />
      </div>
    </div>
  );
}
