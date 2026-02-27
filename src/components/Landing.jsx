const journeys = [
  {
    key: "bm",
    icon: "📋",
    role: "Branch View",
    description: "Review and enrich your leads",
  },
  {
    key: "gm",
    icon: "📊",
    role: "Manager View",
    description: "Track compliance and drive accountability",
  },
  {
    key: "admin",
    icon: "⚙️",
    role: "Admin",
    description: "Upload data and manage configuration",
  },
];

export default function Landing({ onSelect }) {
  return (
    <div className="h-full bg-white flex flex-col items-center justify-center px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-[#1A1A1A] tracking-tight">
          Lead Management System
        </h1>
        <div className="w-16 h-1 bg-[#F5C400] mx-auto mt-3 mb-4" />
        <p className="text-[#6E6E6E] text-lg">
          A visibility and activity layer for insurance replacement lead conversion
        </p>
      </div>

      <div className="flex gap-6 max-w-4xl w-full">
        {journeys.map((j) => (
          <button
            key={j.key}
            onClick={() => onSelect(j.key)}
            className="flex-1 text-left p-6 rounded-lg border border-[#E6E6E6] hover:border-[#F5C400] hover:border-l-4 transition-all group cursor-pointer"
          >
            <div className="text-3xl mb-3">{j.icon}</div>
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">{j.role}</h2>
            <p className="text-[#6E6E6E] text-sm">{j.description}</p>
          </button>
        ))}
      </div>

      <p className="mt-12 text-xs text-[#E6E6E6]">Hertz — Insurance Replacement Division</p>
    </div>
  );
}
