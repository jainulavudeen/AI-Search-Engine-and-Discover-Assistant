"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { onboardingApi } from "@/lib/authClient";
import { useAuth } from "@/contexts/AuthContext";

// ── Data ───────────────────────────────────────────────────────────────────────

const COURSES = [
  "Computer Science", "Information Technology", "Electronics",
  "Mechanical", "Civil", "Other",
];

const YEARS = [
  { label: "1st Year", value: 1 },
  { label: "2nd Year", value: 2 },
  { label: "3rd Year", value: 3 },
  { label: "4th Year", value: 4 },
  { label: "Postgraduate", value: 5 },
];

const INTERESTS = [
  "Artificial Intelligence", "Machine Learning", "Web Development",
  "Cloud Computing", "Cybersecurity", "Data Science",
  "Mobile Development", "IoT", "Blockchain",
];

const LOCATIONS = ["Chennai", "Bangalore", "Hyderabad", "Online", "Anywhere"];

const OPP_TYPES = [
  "Hackathons", "Internships", "Workshops", "Competitions", "Conferences", "Scholarships",
];

// ── Chip selector ──────────────────────────────────────────────────────────────

function ChipGroup({
  options, selected, onToggle, single = false,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium border transition-all ${
              active
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Step progress ──────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${i <= current ? "bg-indigo-600" : "bg-slate-200"} ${i === current ? "w-8" : "w-4"}`} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingClient() {
  const router = useRouter();
  const { setUser, refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [course, setCourse] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [oppTypes, setOppTypes] = useState<string[]>([]);

  function toggleOne(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function selectSingle(current: string, setter: (v: string) => void, val: string) {
    setter(current === val ? "" : val);
  }

  const steps = [
    {
      title: "What are you studying?",
      subtitle: "This helps us match opportunities to your background.",
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Degree / Course</p>
            <ChipGroup
              options={COURSES}
              selected={course ? [course] : []}
              onToggle={(v) => selectSingle(course, setCourse, v)}
              single
            />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Current Year</p>
            <ChipGroup
              options={YEARS.map((y) => y.label)}
              selected={year !== null ? [YEARS.find((y) => y.value === year)?.label ?? ""] : []}
              onToggle={(v) => {
                const found = YEARS.find((y) => y.label === v);
                if (found) setYear(year === found.value ? null : found.value);
              }}
              single
            />
          </div>
        </div>
      ),
    },
    {
      title: "What are you interested in?",
      subtitle: "Select all that apply — we'll personalise results for you.",
      content: (
        <div>
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Technology Interests</p>
          <ChipGroup
            options={INTERESTS}
            selected={interests}
            onToggle={(v) => toggleOne(interests, setInterests, v)}
          />
        </div>
      ),
    },
    {
      title: "Where do you want to explore?",
      subtitle: "Pick your preferred locations and opportunity types.",
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Preferred Locations</p>
            <ChipGroup
              options={LOCATIONS}
              selected={locations}
              onToggle={(v) => toggleOne(locations, setLocations, v)}
            />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Opportunity Types</p>
            <ChipGroup
              options={OPP_TYPES}
              selected={oppTypes}
              onToggle={(v) => toggleOne(oppTypes, setOppTypes, v)}
            />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    setError("");
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    setError("");
    setIsLoading(true);
    try {
      const res = await onboardingApi({
        course: course || undefined,
        year: year ?? undefined,
        interests,
        preferredLocations: locations,
        opportunityTypes: oppTypes,
      });
      if (res.data.user) {
        setUser(res.data.user);
        localStorage.setItem("auth_user", JSON.stringify(res.data.user));
      }
      await refreshUser();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await onboardingApi({});
      await refreshUser();
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--ai-gradient)" }}>C</span>
          <span className="font-semibold text-[15px] text-slate-800">CampusFind AI</span>
        </div>
        <button
          onClick={handleSkip}
          className="text-[13px] text-slate-400 hover:text-slate-700 transition-colors"
        >
          Skip for now
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Step progress */}
          <div className="flex items-center justify-between mb-8">
            <StepIndicator current={step} total={steps.length} />
            <span className="text-[12px] text-slate-400 font-medium">
              Step {step + 1} of {steps.length}
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-slate-900 leading-tight">
                {step === 0 && "Help us find better opportunities for you."}
              </h1>
              <h2 className={`font-bold text-slate-900 leading-tight ${step === 0 ? "text-lg mt-2" : "text-[22px]"}`}>
                {current.title}
              </h2>
              <p className="text-[14px] text-slate-500 mt-1.5">{current.subtitle}</p>
            </div>

            {/* Step content */}
            {current.content}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-[13px] text-rose-700">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                id={isLast ? "onboarding-finish" : "onboarding-next"}
                onClick={isLast ? handleFinish : handleNext}
                disabled={isLoading}
                className="flex items-center gap-2 px-7 py-2.5 text-white text-[14px] font-semibold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-95 shadow-md shadow-violet-200"
                style={{ background: "var(--ai-gradient)" }}
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    Saving…
                  </>
                ) : isLast ? (
                  <>
                    Finish setup
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </>
                ) : (
                  <>
                    Continue
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer hint */}
          <p className="text-center text-[12px] text-slate-400 mt-5">
            You can update your preferences anytime from your profile.
          </p>
        </div>
      </div>
    </div>
  );
}
