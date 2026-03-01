/**
 * Work page — Meeting Prep + Leaderboard on one scrollable page.
 * Scroll-based sidebar highlight follows as user scrolls (same as Summary).
 */
import { useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import InteractiveMeetingPrep from "./InteractiveMeetingPrep";
import InteractiveBMLeaderboard from "./InteractiveBMLeaderboard";

const WORK_SECTION_MAP = {
  "bm-meeting-prep": "compliance-meeting",
  "bm-leaderboard": "leaderboard",
};

const WORK_SECTION_TO_VIEW = Object.fromEntries(
  Object.entries(WORK_SECTION_MAP).map(([view, section]) => [section, view])
);

export default function InteractiveWorkPage() {
  const { activeView, setScrollActiveView } = useApp();
  const isInitialMount = useRef(true);

  // Scroll to section when navigating
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const sectionId = WORK_SECTION_MAP[activeView];
    if (sectionId) {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeView]);

  // Scroll observer: update sidebar highlight as user scrolls
  useEffect(() => {
    const scrollRoot = document.getElementById("dashboard-scroll-root");
    if (!scrollRoot) return;

    const sectionIds = Object.keys(WORK_SECTION_TO_VIEW);
    const lastViewId = WORK_SECTION_TO_VIEW[sectionIds[sectionIds.length - 1]];
    let hasUserScrolled = false;

    setScrollActiveView("bm-meeting-prep");

    const updateActiveFromScroll = () => {
      if (!hasUserScrolled) return false;
      const { scrollTop, clientHeight, scrollHeight } = scrollRoot;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 50;
      if (atBottom && lastViewId) {
        setScrollActiveView(lastViewId);
        return true;
      }
      return false;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!hasUserScrolled) return;
        if (updateActiveFromScroll()) return;
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;
        const sorted = intersecting
          .map((e) => ({ entry: e, viewId: WORK_SECTION_TO_VIEW[e.target.id] }))
          .filter((x) => x.viewId)
          .sort((a, b) => a.entry.boundingClientRect.top - b.entry.boundingClientRect.top);
        if (sorted.length > 0) {
          setScrollActiveView(sorted[0].viewId);
        }
      },
      { root: scrollRoot, rootMargin: "0px 0px -20% 0px", threshold: 0 }
    );

    const handleScroll = () => {
      hasUserScrolled = true;
      updateActiveFromScroll();
    };

    const observed = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    });

    scrollRoot.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollRoot.removeEventListener("scroll", handleScroll);
      observed.forEach((el) => observer.unobserve(el));
    };
  }, [setScrollActiveView]);

  return (
    <div className="max-w-6xl">
      <div id="compliance-meeting" className="scroll-mt-4 mb-12">
        <InteractiveMeetingPrep />
      </div>
      <div id="leaderboard" className="scroll-mt-4">
        <InteractiveBMLeaderboard />
      </div>
    </div>
  );
}
