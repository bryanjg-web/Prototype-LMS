import { useState, useEffect, useRef } from "react";
import DemoTopBar from "./DemoTopBar";
import Sidebar from "./Sidebar";
import OnboardingTour from "../OnboardingTour";
import DataBanner from "./DataBanner";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

export default function AppLayout({ children }) {
  const { userProfile, completeOnboarding } = useAuth();
  const { role } = useApp();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingReplay, setOnboardingReplay] = useState(false);
  const hasCheckedFirstLogin = useRef(false);
  const mainRef = useRef(null);

  // Scroll to top on page load/refresh (prevents browser scroll restoration)
  useEffect(() => {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      mainRef.current?.scrollTo(0, 0);
      document.getElementById("dashboard-scroll-root")?.scrollTo(0, 0);
    };
    scrollToTop();
    const t = setTimeout(scrollToTop, 100);
    return () => clearTimeout(t);
  }, []);

  // Conditional launch: BM first login when onboarding_completed_at is null
  useEffect(() => {
    if (role !== "bm" || !userProfile || hasCheckedFirstLogin.current) return;
    hasCheckedFirstLogin.current = true;
    if (userProfile.onboardingCompletedAt == null) {
      setOnboardingReplay(false);
      setOnboardingOpen(true);
    }
  }, [role, userProfile]);

  const handleOnboardingClose = () => setOnboardingOpen(false);
  const handleOnboardingComplete = async () => {
    if (!onboardingReplay) await completeOnboarding();
    setOnboardingOpen(false);
  };
  const handleOnboardingSkip = async () => {
    if (!onboardingReplay) await completeOnboarding();
    setOnboardingOpen(false);
  };
  const handleHelpClick = () => {
    setOnboardingReplay(true);
    setOnboardingOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <DemoTopBar onHelpClick={role === "bm" ? handleHelpClick : undefined} />
      <DataBanner />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overscroll-none bg-white">
          {children}
        </main>
      </div>
      <OnboardingTour
        open={onboardingOpen}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        isReplay={onboardingReplay}
      />
    </div>
  );
}
