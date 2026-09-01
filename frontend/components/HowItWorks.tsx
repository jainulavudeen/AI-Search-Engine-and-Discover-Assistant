const steps = [
  {
    number: "01",
    title: "Ask naturally",
    desc: 'Type something like "Find AI hackathons for engineering students in Chennai this month" — just like texting a friend.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.275 2.903 2.875 2.903h.11l2.262 2.263a.75.75 0 001.06 0l2.262-2.263h.11c1.6 0 2.875-1.302 2.875-2.903V6.75A2.25 2.25 0 0015 4.5H9A2.25 2.25 0 006.75 6.75v6.51z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "AI understands your needs",
    desc: "Our AI extracts category, location, dates, and eligibility from your query and finds the best matches.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Discover the right opportunities",
    desc: "Browse ranked results tailored to you — complete with deadlines, eligibility, and registration links.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 bg-slate-50/60 border-y border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[12px] font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            Simple by design
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            How it works
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-slate-200 z-0" />

          {steps.map(({ number, title, desc, icon }) => (
            <div key={number} className="relative flex flex-col items-center text-center gap-4 z-10">
              {/* Step circle */}
              <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-0.5">
                <span className="text-[10px] font-bold text-indigo-400 tracking-widest">{number}</span>
                <div className="text-indigo-600">{icon}</div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-[15px] mb-1.5">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
