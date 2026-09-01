"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    const q = query.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    router.push(`/discover?q=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const [focused, setFocused] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* "Ask CampusFind AI" microcopy */}
      <div className="flex items-center justify-center gap-1.5 mb-2.5 text-[12px] font-semibold text-violet-600">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Ask CampusFind AI anything
      </div>

      {/* Search box — gradient ring appears on focus, the AI "signature" moment */}
      <div className={`relative rounded-2xl transition-all ${focused ? "p-[1.5px]" : "p-0"}`} style={focused ? { background: "var(--ai-gradient)" } : undefined}>
        <div
          className={`flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 transition-all ${
            focused ? "shadow-xl shadow-violet-100" : "border border-slate-200 shadow-lg shadow-slate-100"
          }`}
        >
          {/* Sparkle icon — signals "AI", not a plain search bar */}
          <svg
            className={`w-5 h-5 flex-shrink-0 transition-colors ${focused ? "text-violet-500" : "text-slate-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>

          {/* Input */}
          <input
            ref={inputRef}
            id="hero-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder='Find AI hackathons in Chennai this month…'
            className="flex-1 text-[15px] text-slate-800 placeholder-slate-400 bg-transparent outline-none min-w-0"
            aria-label="Search opportunities with AI"
            autoComplete="off"
          />

          {/* Search button */}
          <button
            id="hero-search-btn"
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="flex-shrink-0 px-5 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-95"
            style={{ background: "var(--ai-gradient)" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Searching
              </span>
            ) : (
              "Search"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
