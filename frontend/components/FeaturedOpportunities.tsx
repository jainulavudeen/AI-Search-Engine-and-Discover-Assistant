import { OPPORTUNITIES } from "@/lib/mockData";
import OpportunityCard from "./OpportunityCard";

export default function FeaturedOpportunities() {
  const featured = OPPORTUNITIES.filter((o) => o.featured);

  return (
    <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[12px] font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            Curated for you
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Popular opportunities
          </h2>
          <p className="text-slate-500 mt-1.5 text-[14px]">
            Trending hackathons, internships and events for students this month.
          </p>
        </div>
        <a
          href="/discover"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex-shrink-0"
        >
          View all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featured.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>

      {/* Mobile "view all" */}
      <div className="sm:hidden mt-6 text-center">
        <a
          href="/discover"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View all opportunities
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </section>
  );
}
