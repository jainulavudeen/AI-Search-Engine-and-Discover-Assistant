"use client";

import { useState, useEffect } from "react";
import { fetchOpportunityMatch } from "@/lib/api";
import type { RecommendationItem, MatchedFactor, ScoreBreakdown } from "@/lib/api";

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  const color =
    score >= 80
      ? "text-emerald-500 stroke-emerald-500"
      : score >= 60
      ? "text-indigo-500 stroke-indigo-500"
      : "text-amber-500 stroke-amber-500";

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[13px] font-bold leading-none ${color.split(" ")[0]}`}>
          {score}%
        </span>
      </div>
    </div>
  );
}

// ── Factor row ─────────────────────────────────────────────────────────────────

const FACTOR_ICONS: Record<MatchedFactor["factor"], React.ReactNode> = {
  interest: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  category: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
    </svg>
  ),
  location: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
    </svg>
  ),
  eligibility: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  skill: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  ),
  mode: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.129V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  ),
  deadline: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  engagement: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  similarity: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
};

const FACTOR_COLORS: Record<MatchedFactor["factor"], string> = {
  interest: "bg-violet-100 text-violet-600",
  category: "bg-indigo-100 text-indigo-600",
  location: "bg-sky-100 text-sky-600",
  eligibility: "bg-emerald-100 text-emerald-600",
  skill: "bg-amber-100 text-amber-600",
  mode: "bg-teal-100 text-teal-600",
  deadline: "bg-rose-100 text-rose-600",
  engagement: "bg-fuchsia-100 text-fuchsia-600",
  similarity: "bg-purple-100 text-purple-600",
};

// Mirrors WEIGHTS in backend/src/services/recommendationService.ts — keep in sync.
function BreakdownBar({ breakdown, total }: { breakdown: ScoreBreakdown; total: number }) {
  const bars = [
    { label: "Interest", key: "interest", value: breakdown.interest, max: 25, color: "bg-violet-400" },
    { label: "Category", key: "category", value: breakdown.category, max: 20, color: "bg-indigo-400" },
    { label: "Eligibility", key: "eligibility", value: breakdown.eligibility, max: 20, color: "bg-emerald-400" },
    { label: "Location", key: "location", value: breakdown.location, max: 15, color: "bg-sky-400" },
    { label: "Skills", key: "skill", value: breakdown.skill, max: 10, color: "bg-amber-400" },
    { label: "Mode", key: "mode", value: breakdown.mode, max: 5, color: "bg-teal-400" },
    { label: "Deadline", key: "deadline", value: breakdown.deadline, max: 5, color: "bg-rose-400" },
  ] as const;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Score breakdown
      </p>
      {bars.map((bar) => (
        <div key={bar.key} className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 w-20 flex-shrink-0">{bar.label}</span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
              style={{ width: `${bar.value > 0 ? (bar.value / bar.max) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-600 w-10 text-right flex-shrink-0">
            {bar.value}/{bar.max}
          </span>
        </div>
      ))}
      {breakdown.similarity !== null && (
        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-100">
          <span className="text-[11px] text-slate-500 w-20 flex-shrink-0">Similarity</span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-purple-400"
              style={{ width: `${breakdown.similarity}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-600 w-10 text-right flex-shrink-0">
            {breakdown.similarity}/100
          </span>
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between">
        <span className="text-[11px] font-bold text-slate-600">Total AI Match</span>
        <span className="text-[11px] font-bold text-indigo-600">{total}/100</span>
      </div>
      {breakdown.similarity !== null && (
        <p className="text-[10px] text-slate-400 leading-snug">
          60% from the factors above, 40% from neural similarity between your profile
          (interests, saves, views, searches) and this opportunity.
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AIMatchPanel({ opportunityId }: { opportunityId: string }) {
  const [match, setMatch] = useState<RecommendationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    fetchOpportunityMatch(opportunityId)
      .then((m) => setMatch(m))
      .finally(() => setLoading(false));
  }, [opportunityId]);

  if (loading) {
    return (
      <div id="ai-match" className="scroll-mt-24 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-slate-200 rounded-lg" />
          <div className="flex-1">
            <div className="h-3 bg-slate-200 rounded w-16 mb-1" />
            <div className="h-4 bg-slate-200 rounded w-40" />
          </div>
          <div className="w-14 h-14 bg-slate-200 rounded-full" />
        </div>
        <div className="h-3 bg-slate-200 rounded w-full mb-2" />
        <div className="h-3 bg-slate-200 rounded w-3/4" />
      </div>
    );
  }

  // Not logged in — invite them in rather than silently hiding the feature,
  // so the AI Match capability stays visible even to anonymous visitors.
  if (!match) {
    return (
      <section id="ai-match" className="scroll-mt-24">
        <div className="rounded-2xl border border-violet-100 p-6 text-center" style={{ background: "var(--ai-gradient-soft)" }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm"
            style={{ background: "var(--ai-gradient)" }}
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h3 className="text-[15px] font-bold text-slate-900 mb-1">See your AI Match score</h3>
          <p className="text-[13px] text-slate-500 mb-4 max-w-sm mx-auto">
            Log in to see how well this opportunity fits your interests, eligibility, and preferences.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-xl transition-transform active:scale-95"
            style={{ background: "var(--ai-gradient)" }}
          >
            Log in to see your match
          </a>
        </div>
      </section>
    );
  }

  const { score, reason, breakdown, matchedFactors } = match!;

  return (
    <section id="ai-match" className="scroll-mt-24">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-6 shadow-sm">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">AI Match</p>
            <h3 className="text-[15px] font-bold text-slate-900">Why this matches you</h3>
          </div>
          <ScoreRing score={score} />
        </div>

        {/* Reason */}
        <p className="text-[13px] text-slate-700 leading-relaxed mb-4 bg-white border border-indigo-100 rounded-xl px-4 py-3">
          {reason}
        </p>

        {/* Matched factors */}
        {matchedFactors.length > 0 ? (
          <ul className="space-y-2.5 mb-4">
            {matchedFactors.map((f) => (
              <li key={f.factor} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${FACTOR_COLORS[f.factor]}`}>
                  {FACTOR_ICONS[f.factor]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-slate-700">{f.label}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      +{f.points}/{f.maxPoints}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-[12px] text-amber-700 leading-relaxed">
              <span className="font-semibold">Profile incomplete.</span>{" "}
              <a href="/onboarding" className="underline hover:text-amber-900 transition-colors">Complete your profile</a>{" "}
              to see personalised match factors for your course, interests, and preferred locations.
            </p>
          </div>
        )}

        {/* Breakdown toggle */}
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="w-full text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1.5 pt-3 border-t border-indigo-100 transition-colors"
        >
          {showBreakdown ? "Hide" : "Show"} score breakdown
          <svg
            className={`w-3.5 h-3.5 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {showBreakdown && (
          <div className="mt-4 pt-4 border-t border-indigo-100">
            <BreakdownBar breakdown={breakdown} total={score} />
            <div className="mt-4 bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">How this score is calculated</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This is a <span className="font-semibold text-slate-500">rule-based matching score</span>, not a machine-learning prediction.
                It uses 10 signals from your student profile: interests, preferred opportunity types, course, year of study,
                preferred locations, previous searches, saved opportunities, and this opportunity&apos;s category, eligibility, and skills.
                Treat it as a helpful guide — apply if the opportunity looks right for you.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
