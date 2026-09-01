import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SidebarCard from "./SidebarCard";
import AIMatchPanel from "./AIMatchPanel";
import { OPPORTUNITIES, CATEGORY_LABELS, formatDate, type Opportunity } from "@/lib/mockData";
import { getOpportunityExtra } from "@/lib/opportunityDetails";
import { fetchOpportunityById, trackView } from "@/lib/api";
import { adaptApiOpportunity } from "@/lib/adapt";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end?: string) {
  const s = formatDate(start);
  if (!end) return s;
  const sDate = new Date(start);
  const eDate = new Date(end);
  if (
    sDate.getMonth() === eDate.getMonth() &&
    sDate.getFullYear() === eDate.getFullYear()
  ) {
    return `${sDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}-${eDate.toLocaleDateString("en-IN", { day: "numeric", year: "numeric" })}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
}

// Live backend data first (this is what Discover/Dashboard actually link
// to), falling back to the bundled demo dataset — same resilience pattern
// used everywhere else in the app when the backend is unreachable.
async function getOpportunity(id: string): Promise<Opportunity | null> {
  const res = await fetchOpportunityById(id);
  if (res?.data) return adaptApiOpportunity(res.data);
  return OPPORTUNITIES.find((o) => o.id === id) ?? null;
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) return { title: "Opportunity not found" };
  return {
    title: `${opp.title} | CampusFind AI`,
    description: opp.description,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) notFound();

  // Server-side view tracking — works for anonymous visitors too (reads the
  // same auth_token cookie the middleware uses, if present). Not awaited:
  // must never delay rendering the page the student actually asked for.
  const token = (await cookies()).get("auth_token")?.value;
  trackView(opp.id, token);

  const extra = getOpportunityExtra(opp.id, opp);
  const dateRange = formatDateRange(opp.startDate, opp.endDate);
  const categoryLabel = CATEGORY_LABELS[opp.category];

  const MODE_LABEL: Record<string, string> = {
    online: "Online",
    offline: "In-Person",
    hybrid: "Hybrid",
  };

  const CAT_COLOR: Record<string, string> = {
    hackathon: "bg-indigo-50 text-indigo-700 border-indigo-100",
    internship: "bg-blue-50 text-blue-700 border-blue-100",
    workshop: "bg-amber-50 text-amber-700 border-amber-100",
    competition: "bg-rose-50 text-rose-700 border-rose-100",
    conference: "bg-violet-50 text-violet-700 border-violet-100",
    scholarship: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  const MODE_COLOR: Record<string, string> = {
    online: "bg-sky-50 text-sky-700 border-sky-100",
    offline: "bg-slate-100 text-slate-700 border-slate-200",
    hybrid: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <Link href="/" className="hover:text-slate-800 transition-colors">Home</Link>
            <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            <Link href="/discover" className="hover:text-slate-800 transition-colors">Discover</Link>
            <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            <Link href={`/discover?category=${opp.category}`} className="hover:text-slate-800 transition-colors">{categoryLabel}s</Link>
            <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            <span className="text-slate-800 truncate max-w-[200px]">{opp.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10">

            {/* Left: main hero content */}
            <div className="flex-1 min-w-0">
              {/* Category + mode badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 text-[12px] font-semibold rounded-full border capitalize ${CAT_COLOR[opp.category] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  {categoryLabel}
                </span>
                <span className={`px-3 py-1 text-[12px] font-semibold rounded-full border ${MODE_COLOR[opp.mode] ?? "bg-slate-100 text-slate-700"}`}>
                  {MODE_LABEL[opp.mode] ?? opp.mode}
                </span>
                {/* Points to the real, data-backed AI Match panel below — never a
                    decorative/fabricated score here in the hero. */}
                <a
                  href="#ai-match"
                  className="ai-match-pill px-3 py-1 rounded-full text-[12px]"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  See your AI Match
                </a>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-3">
                {opp.title}
              </h1>

              {/* Organizer */}
              <p className="text-slate-500 text-[15px] mb-4">
                Organised by <span className="font-semibold text-slate-700">{opp.organizer}</span>
              </p>

              {/* Quick info chips */}
              <div className="flex flex-wrap gap-3">
                {[
                  {
                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" /></svg>,
                    text: opp.location,
                  },
                  {
                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5" /></svg>,
                    text: dateRange,
                  },
                  ...(extra.teamSize ? [{
                    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
                    text: `Team: ${extra.teamSize}`,
                  }] : []),
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[13px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                    <span className="text-slate-400">{icon}</span>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: mobile register button */}
            <div className="lg:hidden">
              <SidebarCard opportunity={opp} registrationUrl={extra.registrationUrl} />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8 items-start">

          {/* LEFT: Main content */}
          <main className="flex-1 min-w-0 space-y-8">

            {/* 1. About */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">About this opportunity</h2>
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <p className="text-[14px] text-slate-700 leading-relaxed">{extra.detailedDescription}</p>
              </div>
            </section>

            {/* 2. Eligibility */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Eligibility</h2>
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <ul className="space-y-2.5">
                  {extra.eligibilityDetails.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-slate-700">
                      <svg className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 3. What you can gain */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">What you can gain</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {extra.gains.map(({ icon, title, desc }) => (
                  <div key={title} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3 hover:border-indigo-100 hover:shadow-md transition-all">
                    <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{icon}</span>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900 mb-0.5">{title}</p>
                      <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Timeline */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Timeline</h2>
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <ol className="relative space-y-0">
                  {extra.timeline.map(({ label, date, highlight }, i) => (
                    <li key={label} className="flex gap-4 pb-5 last:pb-0">
                      {/* Dot + line */}
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${highlight ? "bg-rose-500 ring-4 ring-rose-100" : "bg-indigo-500"}`} />
                        {i < extra.timeline.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 mt-1 mb-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-1">
                        <p className={`text-[13px] font-semibold ${highlight ? "text-rose-600" : "text-slate-800"}`}>
                          {label}
                          {highlight && <span className="ml-2 text-[11px] font-bold text-rose-500 uppercase tracking-wider">Deadline</span>}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-0.5">{formatDate(date)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* 5. Skills & Topics */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Skills &amp; Topics</h2>
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {extra.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3.5 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-100 rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* 6. AI Match - personalised, fetched client-side */}
            <AIMatchPanel opportunityId={opp.id} />
          </main>

          {/* RIGHT: Sticky sidebar (desktop only) */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24">
              <SidebarCard opportunity={opp} registrationUrl={extra.registrationUrl} />

              {/* Back to discover */}
              <Link
                href="/discover"
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to discover
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
