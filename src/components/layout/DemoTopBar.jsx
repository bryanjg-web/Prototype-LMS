import { useApp } from "../../context/AppContext";
import { dataAsOfDate } from "../../data/mockData";

function formatAsOfDate(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function DemoTopBar() {
  const { mode, setMode } = useApp();

  return (
    <div className="h-[52px] bg-[#1A1A1A] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <img src="/Hertz-Line_White_2020.png" alt="Hertz" className="h-7" />
        <span className="text-white/40 text-xs">|</span>
        <span className="text-white/70 text-sm">Lead Management System</span>
        <span className="text-white/40 text-xs">|</span>
        <span className="text-white/50 text-xs">Data as of: {formatAsOfDate(dataAsOfDate)}</span>
      </div>

      <div className="flex items-center bg-white/10 rounded-full p-0.5">
        <button
          onClick={() => setMode("journey")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            mode === "journey"
              ? "bg-[#F5C400] text-[#1A1A1A]"
              : "text-white/60 hover:text-white"
          }`}
        >
          Guided Tour
        </button>
        <button
          onClick={() => setMode("interactive")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            mode === "interactive"
              ? "bg-[#F5C400] text-[#1A1A1A]"
              : "text-white/60 hover:text-white"
          }`}
        >
          Interactive Demo
        </button>
      </div>
    </div>
  );
}
