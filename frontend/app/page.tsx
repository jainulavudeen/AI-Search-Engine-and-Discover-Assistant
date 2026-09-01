import Navbar from "@/components/Navbar";
import HeroSearch from "@/components/HeroSearch";
import SuggestionChips from "@/components/SuggestionChips";
import FeatureCards from "@/components/FeatureCards";
import FeaturedOpportunities from "@/components/FeaturedOpportunities";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="flex-1">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-white">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
            aria-hidden="true"
          />

          {/* Soft AI-gradient glow blobs — the one place the signature gradient breathes freely */}
          <div className="ai-glow absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[24rem] rounded-full pointer-events-none" aria-hidden="true" />
          <div className="ai-glow absolute top-40 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-[0.15]" aria-hidden="true" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-16 sm:pb-20">
            <div className="text-center">
              {/* Label pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-100 bg-violet-50 text-violet-700 text-[12px] font-semibold mb-6 animate-fade-in-up">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500" />
                </span>
                AI-powered opportunity search for students
              </div>

              {/* Headline */}
              <h1
                className="text-[2.75rem] sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tighter leading-[1.02] mb-5 max-w-3xl mx-auto animate-fade-in-up"
                style={{ animationDelay: "60ms" }}
              >
                Find what&rsquo;s{" "}
                <span className="ai-gradient-text">next for you.</span>
              </h1>

              {/* Sub headline */}
              <p
                className="text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "120ms" }}
              >
                AI-powered discovery for students — hackathons, internships,
                workshops and competitions, matched to who you actually are.
              </p>

              {/* Search box */}
              <div className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
                <HeroSearch />
              </div>

              {/* Suggestion chips */}
              <div className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
                <SuggestionChips />
              </div>

              {/* Social proof */}
              <p className="mt-8 text-[13px] text-slate-400 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                Trusted by students from{" "}
                <span className="font-medium text-slate-600">IIT, NIT, VIT, Anna University</span> and more
              </p>
            </div>

            {/* Floating preview cards — visual storytelling around the AI search,
                tasteful and small, hidden on mobile so the search stays the focus */}
            <div className="hidden lg:block" aria-hidden="true">
              <div
                className="absolute top-16 left-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/60 p-3.5 animate-float-slow animate-fade-in-up"
                style={{ animationDelay: "500ms" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full badge-hackathon">Hackathon</span>
                  <span className="ai-match-pill px-1.5 py-0.5 rounded-full text-[9px]">
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                    96%
                  </span>
                </div>
                <p className="text-[12px] font-semibold text-slate-800 leading-snug mb-1">AI Innovation Hackathon</p>
                <p className="text-[10.5px] text-slate-400">Chennai · 3 days left</p>
              </div>

              <div
                className="absolute bottom-4 right-0 w-52 bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/60 p-3.5 animate-float-slow animate-fade-in-up"
                style={{ animationDelay: "650ms", animationDuration: "7s" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--ai-gradient)" }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-800">Picked for you</p>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-relaxed">Matches your AI/ML interests &amp; Chennai preference</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE CARDS ─────────────────────────────────────────── */}
        <FeatureCards />

        {/* ── FEATURED OPPORTUNITIES ───────────────────────────────── */}
        <FeaturedOpportunities />

        {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
        <HowItWorks />

        {/* ── BOTTOM CTA STRIP ─────────────────────────────────────── */}
        <section className="py-16 bg-white">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Ready to find your next opportunity?
            </h2>
            <p className="text-slate-500 text-[15px] mb-8">
              Join thousands of students already discovering opportunities with CampusFind AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/register"
                className="w-full sm:w-auto px-7 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Get started free
              </a>
              <a
                href="/discover"
                className="w-full sm:w-auto px-7 py-3 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Browse opportunities
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
