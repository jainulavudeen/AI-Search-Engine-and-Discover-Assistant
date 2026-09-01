"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchRecommendations,
  fetchOpportunities,
  fetchBookmarks,
  fetchRecentViews,
  trackRecommendationClick,
  calculateDeadline,
  DEADLINE_STYLES,
  type RecommendationItem,
  type ApiOpportunity,
} from "@/lib/api";
import { adaptApiOpportunities } from "@/lib/adapt";
import { OPPORTUNITIES as MOCK_OPPS } from "@/lib/mockData";
import type { Opportunity } from "@/lib/mockData";
import type { AuthUser } from "@/lib/authClient";

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function deadlineLabel(days: number): string {
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `Closes in ${days} days`;
}

function deadlineColor(days: number) {
  if (days <= 3) return { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 border-rose-100" };
  if (days <= 7) return { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-100" };
  return { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-100" };
}

const CAT_STYLE: Record<string, string> = {
  hackathon: "bg-violet-50 text-violet-700",
  internship: "bg-sky-50 text-sky-700",
  workshop: "bg-teal-50 text-teal-700",
  competition: "bg-orange-50 text-orange-700",
  conference: "bg-indigo-50 text-indigo-700",
  scholarship: "bg-rose-50 text-rose-700",
};

const CAT_TO_TYPE: Record<string, string> = {
  hackathon: "Hackathons",
  internship: "Internships",
  workshop: "Workshops",
  competition: "Competitions",
  conference: "Conferences",
  scholarship: "Scholarships",
};

function scoreOpportunity(
  opp: Opportunity,
  user: AuthUser | null
): { score: number; reason: string } {
  if (!user || (!user.interests?.length && !user.preferredLocations?.length)) {
    return { score: opp.relevanceScore, reason: "Top-rated opportunity for students." };
  }

  let score = opp.relevanceScore;
  const matched: string[] = [];

  const interests = user.interests ?? [];
  const locations = user.preferredLocations ?? [];
  const oppTypes = user.opportunityTypes ?? [];
  const fullText = [opp.title, opp.description, ...(opp.tags ?? [])].join(" ").toLowerCase();

  // Interest match
  for (const interest of interests) {
    const kw = interest.toLowerCase().split(" ")[0];
    if (fullText.includes(kw)) {
      score = Math.min(score + 12, 99);
      matched.push(`your ${interest} interest`);
      break;
    }
  }

  // Location match
  const locationHit = locations.some(
    (loc) =>
      loc === "Anywhere" ||
      (loc === "Online" && opp.mode === "online") ||
      opp.location.toLowerCase().includes(loc.toLowerCase())
  );
  if (locationHit) {
    score = Math.min(score + 8, 99);
    matched.push("your preferred location");
  }

  // Category / type match
  const oppType = CAT_TO_TYPE[opp.category];
  if (oppType && oppTypes.includes(oppType)) {
    score = Math.min(score + 6, 99);
  }

  const reason =
    matched.length > 0
      ? `Matches ${matched.join(" and ")}.`
      : "Relevant to your profile.";

  return { score: Math.round(score), reason };
}

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR NAV ITEMS
// ══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Discover",
    href: "/discover",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
      </svg>
    ),
  },
  {
    label: "Saved",
    href: "/dashboard#saved",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    ),
  },
  {
    label: "My Profile",
    href: "/onboarding",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "#",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function Sidebar({
  user,
  onLogout,
  onClose,
}: {
  user: AuthUser | null;
  onLogout: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full w-full bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white select-none" style={{ background: "var(--ai-gradient)" }}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </span>
          <span className="font-bold text-slate-900 text-[15px] tracking-tight">
            CampusFind<span className="ai-gradient-text">AI</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden transition-colors" aria-label="Close sidebar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href) && href !== "#";
          return (
            <Link
              key={label}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={isActive ? "text-indigo-600" : "text-slate-400"}>{icon}</span>
              {label}
              {label === "Saved" && (
                <span className="ml-auto text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">0</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 truncate">{user?.name ?? "Student"}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.college ?? user?.email ?? ""}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MATCH BADGE
// ══════════════════════════════════════════════════════════════════════════════

function MatchBadge({ score }: { score: number }) {
  // Always clamp display score to 0–100 for safety
  const clamped = Math.min(Math.max(Math.round(score), 0), 100);

  // Top-tier matches get the signature AI gradient — a visual reward that
  // makes the strongest recommendations instantly recognizable.
  if (clamped >= 90) {
    return (
      <span className="ai-match-pill inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded-full">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {clamped}% Match
      </span>
    );
  }

  const { ring, bg, text } =
    clamped >= 75
      ? { ring: "border-indigo-200", bg: "bg-indigo-50", text: "text-indigo-700" }
      : { ring: "border-slate-200", bg: "bg-slate-50", text: "text-slate-600" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${ring} ${bg} ${text}`}
    >
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
      {clamped}% Match
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD OPPORTUNITY CARD (compact)
// ══════════════════════════════════════════════════════════════════════════════

function DashboardOppCard({
  opp,
  score,
  reason,
}: {
  opp: Opportunity;
  score: number;
  reason: string;
}) {
  const days = daysUntil(opp.registrationDeadline);
  const dl = deadlineColor(days);

  return (
    <Link
      href={`/opportunities/${opp.id}`}
      onClick={() => trackRecommendationClick(opp.id)}
      className="group block h-full"
    >
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all h-full flex flex-col gap-3 relative overflow-hidden">
        {/* Subtle gradient accent for high-match cards */}
        {score >= 85 && (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-transparent pointer-events-none" aria-hidden />
        )}

        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${CAT_STYLE[opp.category] ?? "bg-slate-50 text-slate-600"}`}>
            {opp.category}
          </span>
          <MatchBadge score={score} />
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
            {opp.title}
          </h3>
          <p className="text-[12px] text-slate-500 mt-1">{opp.organizer}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[12px] text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            {opp.location}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${opp.mode === "online" ? "bg-sky-50 text-sky-700" : opp.mode === "hybrid" ? "bg-purple-50 text-purple-700" : "bg-slate-50 text-slate-600"}`}>
            {opp.mode}
          </span>
        </div>

        {/* Deadline */}
        {days >= 0 && (
          <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg border ${dl.pill}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {deadlineLabel(days)}
          </div>
        )}

        {/* Reason — AI-generated explanation */}
        <div className="flex items-start gap-1.5 pt-1 border-t border-slate-50">
          <svg className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
            {reason}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// QUICK STATS
// ══════════════════════════════════════════════════════════════════════════════

function StatCard({
  value,
  label,
  icon,
  color,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-[12px] text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI ASSISTANT CARD
// ══════════════════════════════════════════════════════════════════════════════

function AIAssistantCard({
  query,
  setQuery,
  onSearch,
}: {
  query: string;
  setQuery: (v: string) => void;
  onSearch: () => void;
}) {
  const EXAMPLES = [
    "AI hackathons near Chennai",
    "Cloud internships this month",
    "ML workshops online",
    "Scholarship for CS students",
  ];

  const [focused, setFocused] = useState(false);

  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      {/* Background accent */}
      <div className="ai-glow absolute top-0 right-0 w-48 h-48 rounded-full -translate-y-16 translate-x-16 pointer-events-none opacity-[0.12]" aria-hidden />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-200" style={{ background: "var(--ai-gradient)" }}>
            <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">Your AI Opportunity Assistant</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Tell me what you&rsquo;re looking for and I&rsquo;ll find opportunities that match your interests.
            </p>
          </div>
        </div>

        {/* Search input — gradient ring on focus, consistent with the hero/discover search */}
        <div className={`relative rounded-xl transition-all ${focused ? "p-[1.5px]" : "p-0"}`} style={focused ? { background: "var(--ai-gradient)" } : undefined}>
          <div className={`flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 transition-all ${focused ? "bg-white" : "border border-slate-200"}`}>
            <svg className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? "text-violet-500" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <input
              id="ai-assistant-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="What opportunity are you looking for?"
              className="flex-1 text-[14px] text-slate-800 placeholder-slate-400 bg-transparent outline-none"
              autoComplete="off"
            />
            <button
              id="ai-assistant-search-btn"
              onClick={onSearch}
              className="flex-shrink-0 px-5 py-2 text-white text-[13px] font-semibold rounded-xl transition-transform active:scale-95"
              style={{ background: "var(--ai-gradient)" }}
            >
              Search
            </button>
          </div>
        </div>

        {/* Example queries */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-[11px] text-slate-400 font-medium">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setQuery(ex); }}
              className="text-[11px] text-slate-600 bg-slate-100 hover:bg-violet-50 hover:text-violet-700 px-2.5 py-1 rounded-full transition-colors border border-transparent hover:border-violet-100"
            >
              &ldquo;{ex}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

function Section({
  title,
  subtitle,
  action,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SKELETON
// ══════════════════════════════════════════════════════════════════════════════

function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between mb-3"><div className="skeleton-shimmer h-5 w-20 bg-slate-100 rounded-full" /><div className="skeleton-shimmer h-5 w-16 bg-slate-100 rounded-full" /></div>
      <div className="skeleton-shimmer h-4 bg-slate-100 rounded w-3/4 mb-2" />
      <div className="skeleton-shimmer h-3 bg-slate-100 rounded w-1/2 mb-4" />
      <div className="skeleton-shimmer h-3 bg-slate-100 rounded w-full" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export default function DashboardClient() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allOpps, setAllOpps] = useState<Opportunity[]>([]);
  const [oppsLoading, setOppsLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedBookmarks, setSavedBookmarks] = useState<ApiOpportunity[]>([]);
  const [apiRecommendations, setApiRecommendations] = useState<RecommendationItem[] | null>(null);
  const [recentViews, setRecentViews] = useState<ApiOpportunity[]>([]);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // Load recent searches from localStorage
    try {
      const rs = localStorage.getItem("recent_searches");
      if (rs) setRecentSearches(JSON.parse(rs));
    } catch { /* ignore */ }

    // Fetch real recommendations, opportunities, bookmarks, and recent views in parallel
    Promise.all([
      fetchRecommendations(12),
      fetchOpportunities({ sort: "relevant", limit: 50 }),
      fetchBookmarks(),
      fetchRecentViews(),
    ]).then(([recs, oppsRes, bookmarks, views]) => {
      if (recs && recs.length > 0) setApiRecommendations(recs);
      if (oppsRes?.data.length) setAllOpps(adaptApiOpportunities(oppsRes.data));
      else setAllOpps(MOCK_OPPS);
      if (bookmarks) setSavedBookmarks(bookmarks);
      if (views) setRecentViews(views);
    }).catch(() => setAllOpps(MOCK_OPPS))
      .finally(() => setOppsLoading(false));
  }, []);

  // ── Computed data ──────────────────────────────────────────────────────────

  // Use real API recommendations if available, else fall back to client-side scoring
  const recommended = useMemo(() => {
    if (apiRecommendations && apiRecommendations.length > 0) {
      return apiRecommendations.slice(0, 6).map((r) => ({
        opp: {
          id: r.opportunity.id,
          title: r.opportunity.title,
          description: r.opportunity.description,
          category: r.opportunity.category.toLowerCase() as Opportunity["category"],
          location: r.opportunity.location,
          mode: r.opportunity.mode.toLowerCase() as Opportunity["mode"],
          startDate: r.opportunity.startDate.slice(0, 10),
          endDate: r.opportunity.endDate?.slice(0, 10),
          registrationDeadline: r.opportunity.registrationDeadline.slice(0, 10),
          organizer: r.opportunity.organizer,
          eligibility: r.opportunity.eligibility,
          tags: r.opportunity.tags,
          featured: r.opportunity.featured,
          relevanceScore: r.opportunity.relevanceScore,
        } as Opportunity,
        score: r.score,
        reason: r.reason,
        breakdown: r.breakdown,
      }));
    }
    if (!allOpps.length) return [];
    return allOpps
      .map((opp) => ({ opp, ...scoreOpportunity(opp, user), breakdown: null }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [apiRecommendations, allOpps, user]);

  const deadlines = useMemo(() => {
    return allOpps
      .map((opp) => ({ opp, days: daysUntil(opp.registrationDeadline) }))
      .filter(({ days }) => days >= 0 && days <= 14)
      .sort((a, b) => a.days - b.days)
      .slice(0, 6);
  }, [allOpps]);

  const deadlinesThisWeek = deadlines.filter((d) => d.days <= 7).length;

  // Saved opps from real API bookmarks
  const savedOpps = savedBookmarks;

  // "Don't miss" — 3 nearest deadlines from saved + recommended opps combined
  const dontMiss = useMemo(() => {
    const pool = new Map<string, { title: string; deadline: string; id: string }>();
    // Add saved bookmarks
    savedBookmarks.forEach((o) => pool.set(o.id, { id: o.id, title: o.title, deadline: o.registrationDeadline }));
    // Add recommended
    recommended.forEach(({ opp }) => {
      if (!pool.has(opp.id)) pool.set(opp.id, { id: opp.id, title: opp.title, deadline: opp.registrationDeadline });
    });
    return Array.from(pool.values())
      .map((o) => ({ ...o, dl: calculateDeadline(o.deadline) }))
      .filter((o) => o.dl.daysRemaining >= 0)
      .sort((a, b) => a.dl.daysRemaining - b.dl.daysRemaining)
      .slice(0, 3);
  }, [savedBookmarks, recommended]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    try { localStorage.setItem("recent_searches", JSON.stringify(updated)); } catch { /* ignore */ }
    setRecentSearches(updated);
    router.push(`/discover?q=${encodeURIComponent(q)}`);
  }, [searchQuery, recentSearches, router]);

  const handleSearchFromHistory = (q: string) => {
    router.push(`/discover?q=${encodeURIComponent(q)}`);
  };

  const removeSearch = (q: string) => {
    const updated = recentSearches.filter((s) => s !== q);
    setRecentSearches(updated);
    try { localStorage.setItem("recent_searches", JSON.stringify(updated)); } catch { /* ignore */ }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const firstName = user?.name?.split(" ")[0] ?? "Student";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ═══ Mobile sidebar overlay ═══════════════════════════════════════════ */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            aria-hidden
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden shadow-xl">
            <Sidebar user={user} onLogout={logout} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* ═══ Desktop sidebar ══════════════════════════════════════════════════ */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <Sidebar user={user} onLogout={logout} />
      </aside>

      {/* ═══ Main content ═════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">

        {/* ── Mobile top bar ────────────────────────────────────────────────── */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="font-semibold text-slate-900 text-[15px]">Dashboard</span>
          <div className="w-9" />
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-7 max-w-5xl w-full mx-auto">

          {/* Welcome header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              {authLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                  <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-slate-500 animate-fade-in-up">{getGreeting()},</p>
                  <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight mt-0.5 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
                    {firstName}! 👋
                  </h1>
                  <p className="text-[13px] text-slate-500 mt-1 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
                    Here&rsquo;s what&rsquo;s worth your attention today.
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user && !user.onboardingCompleted && (
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  ✨ Complete profile
                </Link>
              )}
              <Link
                href="/discover"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-xl shadow-md shadow-violet-200 transition-transform active:scale-95"
                style={{ background: "var(--ai-gradient)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
                Discover all
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              value={recommended.length}
              label="Recommended"
              color="bg-indigo-50"
              icon={<svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
            />
            <StatCard
              value={savedOpps.length}
              label="Saved"
              color="bg-amber-50"
              icon={<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>}
            />
            <StatCard
              value={deadlinesThisWeek}
              label="Deadlines this week"
              color="bg-rose-50"
              icon={<svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>

          {/* AI Assistant */}
          <AIAssistantCard
            query={searchQuery}
            setQuery={setSearchQuery}
            onSearch={handleSearch}
          />

          {/* Main content grid: Recommended + Deadlines */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Recommended for you */}
            <div className="xl:col-span-2">
              <Section
                title="Recommended for you"
                subtitle={
                  user?.interests?.length
                    ? `Based on your interests in ${user.interests.slice(0, 2).join(", ")}`
                    : "Top opportunities for students"
                }
                action={
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      AI Match
                    </span>
                    <Link href="/discover" className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                      View all →
                    </Link>
                  </div>
                }
              >
              {oppsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                  </div>
                ) : recommended.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-xl p-8 text-center space-y-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <p className="text-[14px] font-semibold text-slate-700">No strong matches yet.</p>
                    <p className="text-[12px] text-slate-500">Try exploring more opportunities or updating your interests.</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                      <Link href="/discover" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                        Discover Opportunities
                      </Link>
                      <Link href="/onboarding" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                        Update Interests
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {recommended.slice(0, 6).map(({ opp, score, reason }) => (
                        <DashboardOppCard key={opp.id} opp={opp} score={score} reason={reason} />
                      ))}
                    </div>
                    {/* Transparency note */}
                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                      ✦ AI Match is based on your interests, eligibility, preferred location, skills and opportunity types. Scores are indicative.
                    </p>
                  </>
                )}
              </Section>
            </div>

            {/* Upcoming deadlines */}
            <div className="xl:col-span-1">
              <Section
                title="Upcoming Deadlines"
                subtitle="Registration closing soon"
              >
                {oppsLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-white border border-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : deadlines.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-xl p-5 text-center">
                    <p className="text-[13px] text-slate-500">No upcoming deadlines.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deadlines.map(({ opp, days }) => {
                      const dl = deadlineColor(days);
                      return (
                        <Link key={opp.id} href={`/opportunities/${opp.id}`} className="group block">
                          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 hover:border-slate-200 hover:shadow-sm transition-all flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dl.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-slate-900 leading-snug line-clamp-1 group-hover:text-indigo-700 transition-colors">
                                {opp.title}
                              </p>
                              <p className={`text-[11px] font-medium mt-0.5 ${days <= 3 ? "text-rose-600" : days <= 7 ? "text-amber-600" : "text-emerald-600"}`}>
                                {deadlineLabel(days)}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                📍 {opp.location}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Section>
            </div>
          </div>

          {/* Don't miss these deadlines */}
          {dontMiss.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-[14px] font-bold text-slate-900">Don&apos;t miss these deadlines</h2>
                </div>
                <Link href="/saved" className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  View saved →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {dontMiss.map(({ id, title, dl }) => {
                  const dlStyle = DEADLINE_STYLES[dl.urgency];
                  return (
                    <Link
                      key={id}
                      href={`/opportunities/${id}`}
                      className="group bg-white border border-slate-100 rounded-xl p-4 hover:border-indigo-100 hover:shadow-sm transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${dlStyle.text}`}>
                          {dl.label}
                        </span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dlStyle.dot}`} />
                      </div>
                      <p className="text-[13px] font-semibold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
                        {title}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recently viewed — small, only shown once there's something to show */}
          {recentViews.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-[14px] font-bold text-slate-900">Recently viewed</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                {recentViews.map((o) => (
                  <Link
                    key={o.id}
                    href={`/opportunities/${o.id}`}
                    className="group flex-shrink-0 w-56 bg-white border border-slate-100 rounded-xl p-3.5 hover:border-indigo-100 hover:shadow-sm transition-all"
                  >
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded capitalize mb-1.5 ${CAT_STYLE[o.category.toLowerCase()] ?? "bg-slate-50 text-slate-600"}`}>
                      {o.category.toLowerCase()}
                    </span>
                    <p className="text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                      {o.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{o.location}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Bottom grid: Saved + Recent Searches */}
          <div id="saved" className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 lg:pb-6">

            {/* Saved opportunities */}
            <Section
              title="Saved Opportunities"
              subtitle="Your bookmarked opportunities"
              action={
                savedOpps.length > 0 ? (
                  <Link href="/saved" className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                    View all saved →
                  </Link>
                ) : undefined
              }
            >
              {savedOpps.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-xl p-8 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-slate-700 mb-1">No saved opportunities yet</p>
                  <p className="text-[12px] text-slate-400 mb-4 max-w-[200px]">
                    Save opportunities you&apos;re interested in and they&apos;ll appear here.
                  </p>
                  <Link
                    href="/discover"
                    className="px-4 py-2 text-[12px] font-semibold bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    Browse opportunities →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedOpps.slice(0, 4).map((opp) => {
                    const dl = calculateDeadline(opp.registrationDeadline);
                    const dlStyle = DEADLINE_STYLES[dl.urgency];
                    return (
                      <Link key={opp.id} href={`/opportunities/${opp.id}`} className="group block">
                        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 hover:border-slate-200 hover:shadow-sm transition-all flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dlStyle.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-700 transition-colors">{opp.title}</p>
                            <p className={`text-[11px] font-medium mt-0.5 ${dlStyle.text}`}>{dl.label}</p>
                          </div>
                          <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Recent searches */}
            <Section
              title="Recent Searches"
              subtitle="Your previous queries"
              action={
                recentSearches.length > 0 ? (
                  <button
                    onClick={() => {
                      setRecentSearches([]);
                      try { localStorage.removeItem("recent_searches"); } catch { /* ignore */ }
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Clear all
                  </button>
                ) : undefined
              }
            >
              {recentSearches.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-xl p-8 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-slate-700 mb-1">No recent searches</p>
                  <p className="text-[12px] text-slate-400">
                    Your search history will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentSearches.map((q) => (
                    <div key={q} className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-3 group hover:border-slate-200 hover:shadow-sm transition-all">
                      <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
                      <button
                        onClick={() => handleSearchFromHistory(q)}
                        className="flex-1 text-left text-[13px] text-slate-700 hover:text-indigo-700 transition-colors truncate"
                      >
                        &ldquo;{q}&rdquo;
                      </button>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSearchFromHistory(q)}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          Search
                        </button>
                        <button
                          onClick={() => removeSearch(q)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-colors rounded"
                          aria-label="Remove search"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </main>

      {/* ═══ Mobile bottom navigation ═════════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 px-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-14">
          {[
            { label: "Home", href: "/dashboard", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg> },
            { label: "Discover", href: "/discover", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg> },
            { label: "Saved", href: "/dashboard#saved", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg> },
            { label: "Profile", href: "/onboarding", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
          ].map(({ label, href, icon }) => {
            const isActive = href === "/dashboard" && typeof window !== "undefined" && window.location.pathname === "/dashboard";
            return (
              <Link
                key={label}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-700"}`}
              >
                {icon}
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
