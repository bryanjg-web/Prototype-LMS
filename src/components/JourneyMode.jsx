import { useApp } from "../context/AppContext";
import Landing from "./Landing";
import WalkthroughShell from "./WalkthroughShell";
import { bmSteps } from "../walkthroughs/BranchManagerSteps";
import { gmSteps } from "../walkthroughs/GeneralManagerSteps";
import { adminSteps } from "../walkthroughs/AdminSteps";

const walkthroughs = {
  bm: { title: "Branch View — Weekly Lead Review", steps: bmSteps },
  gm: { title: "Manager View — Compliance & Oversight", steps: gmSteps },
  admin: { title: "Admin — Data & Configuration", steps: adminSteps },
};

export default function JourneyMode() {
  const { role, journeyStarted, setRole, setJourneyStarted } = useApp();

  const handleSelect = (key) => {
    setRole(key);
    setJourneyStarted(true);
  };

  const handleBack = () => {
    setJourneyStarted(false);
  };

  if (!role || !journeyStarted) {
    return <Landing onSelect={handleSelect} />;
  }

  const wt = walkthroughs[role];
  return (
    <WalkthroughShell
      steps={wt.steps}
      title={wt.title}
      onBack={handleBack}
    />
  );
}
