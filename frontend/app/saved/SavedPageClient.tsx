"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookmarkButton from "@/components/BookmarkButton";
import {
  fetchBookmarks,
  calculateDeadline,
  DEADLINE_STYLES,
  type ApiOpportunity,
} from "@/lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

const CAT_STYLE: Record<string, string> = {
  HACKATHON: "bg-indigo-50 text-indigo-700",
  INTERNSHIP: "bg-blue-50 text-blue-700",
  WORKSHOP: "bg-amber-50 text-amber-700",
  COMPETITION: "bg-rose-50 text-rose-700",
  CONFERENCE: "bg-violet-50 text-violet-700",
  SCHOLARSHIP: "bg-emerald-50 text-emerald-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Saved card ────────────────────────────────────────────────────────────────

function SavedCard({ opp, onRemove }: { opp: ApiOpportunity; onRemove: (id: string) => void }) {
  const dl = calculateDeadline(opp.registrationDeadline);
  const dlStyle = DEADLINE_STYLES[dl.urgency];

  return (
    <article className="group bg-white border border-slate-100 rounded-2xl shadow-sm card-lift hover:border-violet-100 overflow-hidden">
      <Link href={`/opportunities/${opp.id}`} className="block p-5">
        {/* Top row: category + deadline */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full capitalize ${CAT_STYLE[opp.category] ?? "bg-slate-100 text-slate-600"}`}>
            {opp.category.toLowerCase()}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${dlStyle.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dlStyle.dot}`} />
            {dl.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-slate-900 leading-snug mb-1 group-hover:text-violet-700 transition-colors line-clamp-2">
          {opp.title}
        </h3>
        <p className="text-[12px] text-slate-500 mb-3">{opp.organizer}</p>

        {/* Description */}
        <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2 mb-4">
          {opp.description}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
            </svg>
            {opp.location}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5" />
            </svg>
            Deadline: {formatDate(opp.registrationDeadline)}
          </span>
        </div>
      </Link>

      {/* Action footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 border-t border-slate-100">
        <Link
          href={`/opportunities/${opp.id}`}
          className="text-[12px] font-semibold text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1"
        >
          View details
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <BookmarkButton
          opportunityId={opp.id}
          variant="icon"
        />
      </div>
    </article>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between mb-3">
        <div className="skeleton-shimmer h-5 w-20 bg-slate-100 rounded-full" />
        <div className="skeleton-shimmer h-5 w-24 bg-slate-100 rounded-full" />
      </div>
      <div className="skeleton-shimmer h-5 bg-slate-100 rounded mb-2 w-3/4" />
      <div className="skeleton-shimmer h-3 bg-slate-100 rounded mb-3 w-1/3" />
      <div className="space-y-1.5 mb-4">
        <div className="skeleton-shimmer h-3 bg-slate-100 rounded w-full" />
        <div className="skeleton-shimmer h-3 bg-slate-100 rounded w-4/5" />
      </div>
      <div className="flex gap-4">
        <div className="skeleton-shimmer h-3 w-24 bg-slate-100 rounded" />
        <div className="skeleton-shimmer h-3 w-32 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

// ── Sort options ──────────────────────────────────────────────────────────────

type SortKey = "deadline" | "category" | "recent";

function sortOpportunities(opps: ApiOpportunity[], sort: SortKey): ApiOpportunity[] {
  return [...opps].sort((a, b) => {
    if (sort === "deadline") {
      return new Date(a.registrationDeadline).getTime() - new Date(b.registrationDeadline).getTime();
    }
    if (sort === "category") {
      return a.category.localeCompare(b.category);
    }
    // recent — use relevanceScore as proxy (most relevant first)
    return b.relevanceScore - a.relevanceScore;
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SavedPageClient() {
  const [bookmarks, setBookmarks] = useState<ApiOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("deadline");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  useEffect(() => {
    fetchBookmarks()
      .then((data) => {
        if (data) setBookmarks(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = (id: string) => {
    setBookmarks((prev) => prev.filter((o) => o.id !== id));
  };

  // Derived: filter + sort
  const categories = ["ALL", ...Array.from(new Set(bookmarks.map((o) => o.category)))];
  const filtered = filterCategory === "ALL"
    ? bookmarks
    : bookmarks.filter((o) => o.category === filterCategory);
  const sorted = sortOpportunities(filtered, sort);

  // Deadline-sorted upcoming for the "Don't miss" banner
  const upcoming = [...bookmarks]
    .filter((o) => calculateDeadline(o.registrationDeadline).daysRemaining >= 0)
    .sort((a, b) => new Date(a.registrationDeadline).getTime() - new Date(b.registrationDeadline).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/40">
      <Navbar />

      {/* Hero header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shadow-violet-200" style={{ background: "var(--ai-gradient)" }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saved Opportunities</h1>
              <p className="text-[14px] text-slate-500 mt-0.5">Keep track of opportunities you want to explore.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* Upcoming deadlines banner */}
        {!loading && upcoming.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-[14px] font-bold text-slate-900">Don&apos;t miss these deadlines</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {upcoming.map((opp) => {
                const dl = calculateDeadline(opp.registrationDeadline);
                const dlStyle = DEADLINE_STYLES[dl.urgency];
                return (
                  <Link
                    key={opp.id}
                    href={`/opportunities/${opp.id}`}
                    className="group bg-white border border-slate-100 rounded-xl p-4 hover:border-violet-100 hover:shadow-sm transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${dlStyle.text}`}>
                        {dl.label}
                      </span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dlStyle.dot}`} />
                    </div>
                    <p className="text-[13px] font-semibold text-slate-900 leading-snug group-hover:text-violet-700 transition-colors line-clamp-2">
                      {opp.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(opp.registrationDeadline)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && bookmarks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--ai-gradient-soft)" }}
            >
              <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </div>
            <h2 className="text-[18px] font-bold text-slate-900 mb-2">Your next opportunity could be here.</h2>
            <p className="text-[13px] text-slate-500 max-w-sm leading-relaxed mb-6">
              Save opportunities you&apos;re interested in and they&apos;ll appear here so you can track deadlines and apply.
            </p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-md shadow-violet-200 transition-transform active:scale-95"
              style={{ background: "var(--ai-gradient)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Explore opportunities
            </Link>
          </div>
        )}

        {/* Filter + Sort toolbar */}
        {!loading && bookmarks.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    id={`filter-${cat.toLowerCase()}`}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border transition-all capitalize ${
                      filterCategory === cat
                        ? "text-white border-transparent shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-violet-200 hover:text-violet-700"
                    }`}
                    style={filterCategory === cat ? { background: "var(--ai-gradient)" } : undefined}
                  >
                    {cat === "ALL" ? "All" : cat.toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-slate-500">Sort by:</span>
                <select
                  id="saved-sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="text-[12px] font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="deadline">Nearest deadline</option>
                  <option value="category">Category</option>
                  <option value="recent">Most relevant</option>
                </select>
              </div>
            </div>

            {/* Cards grid */}
            {sorted.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-[13px]">
                No opportunities in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sorted.map((opp) => (
                  <SavedCard key={opp.id} opp={opp} onRemove={handleRemove} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
