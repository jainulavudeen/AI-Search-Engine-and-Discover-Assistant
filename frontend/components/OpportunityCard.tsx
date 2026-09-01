"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Opportunity } from "@/lib/mockData";
import { CATEGORY_LABELS, CATEGORY_BADGE_CLASS, MODE_LABELS } from "@/lib/mockData";
import BookmarkButton from "@/components/BookmarkButton";
import { calculateDeadline, DEADLINE_STYLES, type DeadlineInfo } from "@/lib/api";

// ── Stable date formatter (avoids locale hydration mismatches) ─────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDateStable(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// A "benefit" chip (prize/stipend/cash) is only shown when the opportunity's
// own tags already say so — never invented.
function extractBenefit(tags: string[]): string | null {
  return tags.find((t) => /₹|\$|prize|stipend|cash|reward|scholarship/i.test(t)) ?? null;
}

interface Props {
  opportunity: Opportunity;
  /** Show the AI match score badge when a search/recommendation context is active */
  showRelevance?: boolean;
}

export default function OpportunityCard({ opportunity: o, showRelevance = false }: Props) {
  // Clamp score defensively on the display side
  const displayScore = Math.min(Math.max(Math.round(o.relevanceScore), 0), 100);
  const benefit = extractBenefit(o.tags);
  const domainTags = o.tags.filter((t) => t !== benefit).slice(0, 2);

  // ── Deadline: computed client-side only to avoid SSR/hydration mismatch ───────
  const [dl, setDl] = useState<DeadlineInfo | null>(null);

  useEffect(() => {
    setDl(calculateDeadline(o.registrationDeadline));
  }, [o.registrationDeadline]);

  const dlStyle = dl ? DEADLINE_STYLES[dl.urgency] : DEADLINE_STYLES["comfortable"];

  return (
    <article className="relative bg-white rounded-2xl border border-slate-100 shadow-sm card-lift overflow-hidden group h-full flex flex-col">
      {/* Clickable body */}
      <Link href={`/opportunities/${o.id}`} className="flex flex-col gap-3 p-5 flex-1">

        {/* Organization identity + save */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate min-w-0">
            {o.organizer}
          </p>
          <BookmarkButton opportunityId={o.id} variant="icon" className="flex-shrink-0" />
        </div>

        {/* Title */}
        <h3 className="text-[16px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
          {o.title}
        </h3>

        {/* Category · domain tags · location · mode */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide flex-shrink-0 ${CATEGORY_BADGE_CLASS[o.category]}`}>
            {CATEGORY_LABELS[o.category]}
          </span>
          {domainTags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded-full text-[11px] font-medium">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 -mt-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span className="truncate">{o.location}</span>
          <span className="text-slate-300">·</span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
              o.mode === "online" ? "bg-sky-50 text-sky-700" : o.mode === "hybrid" ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {MODE_LABELS[o.mode]}
          </span>
        </div>

        {/* Description */}
        <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2 flex-1">
          {o.description}
        </p>

        {/* Deadline + benefit row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-50">
          {dl ? (
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border w-fit ${dlStyle.pill}`}>
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{dl.label}</span>
            </div>
          ) : (
            <div className="h-6 w-28 bg-slate-100 rounded-lg animate-pulse" />
          )}
          {benefit && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 flex-shrink-0">
              <span aria-hidden="true">🏆</span>
              <span className="truncate max-w-[90px]">{benefit}</span>
            </span>
          )}
        </div>

        {/* Event date + eligibility (compact metadata) */}
        <div className="flex flex-col gap-1 text-[11.5px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
            </svg>
            <span suppressHydrationWarning>
              {formatDateStable(o.startDate)}
              {o.endDate ? ` – ${formatDateStable(o.endDate)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="truncate">{o.eligibility}</span>
          </div>
        </div>

        {/* AI Match — the signature badge, centered for emphasis */}
        {showRelevance && displayScore >= 60 && (
          <div className="flex justify-center pt-0.5">
            <span className="ai-match-pill px-3 py-1 rounded-full text-[11.5px]">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {displayScore}% AI Match
            </span>
          </div>
        )}
      </Link>

      {/* View details CTA footer */}
      <div className="px-5 pb-5">
        <Link
          href={`/opportunities/${o.id}`}
          className="w-full py-2.5 text-[13px] font-semibold text-violet-700 border border-violet-100 bg-violet-50/60 rounded-xl hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all block text-center"
          tabIndex={-1}
          aria-hidden="true"
        >
          View Opportunity →
        </Link>
      </div>
    </article>
  );
}
