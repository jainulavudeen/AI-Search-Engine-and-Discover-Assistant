"use client";

import { useRouter } from "next/navigation";

const CHIPS = [
  "AI Hackathons",
  "Internships in Chennai",
  "Tech workshops",
  "Student competitions",
  "ML scholarships",
  "Open source programs",
];

export default function SuggestionChips() {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
      <span className="text-sm text-slate-400 mr-1 hidden sm:inline">Try:</span>
      {CHIPS.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => router.push(`/discover?q=${encodeURIComponent(chip)}`)}
          className="px-3.5 py-1.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
