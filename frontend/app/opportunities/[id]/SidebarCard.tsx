"use client";

import { useEffect, useState } from "react";
import type { Opportunity } from "@/lib/mockData";
import { formatDate } from "@/lib/mockData";
import BookmarkButton from "@/components/BookmarkButton";
import { calculateDeadline, trackRegisterClick } from "@/lib/api";

interface Props {
  opportunity: Opportunity;
  registrationUrl: string;
}

function getDaysRemaining(deadline: string): number {
  const now = new Date();
  const d = new Date(deadline);
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function DaysRemaining({ deadline }: { deadline: string }) {
  const [info, setInfo] = useState<{ label: string; urgency: string } | null>(null);

  useEffect(() => {
    // Client-only: calculate from actual current time
    const dl = calculateDeadline(deadline);
    setInfo({ label: dl.label, urgency: dl.urgency });
  }, [deadline]);

  if (!info) return <span className="text-white/70 text-[13px]">--</span>;

  // Rendered on the gradient header strip — always white text for guaranteed
  // contrast, with urgency conveyed by a small dot instead of dark text color.
  const dotClass =
    info.urgency === "passed" ? "bg-white/40" :
    info.urgency === "critical" || info.urgency === "urgent" ? "bg-amber-300" :
    "bg-emerald-300";
  return (
    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white mt-1">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
      {info.label}
    </p>
  );
}

// ── Register modal ─────────────────────────────────────────────────────────────
function RegisterModal({
  opportunity,
  registrationUrl,
  onClose,
}: {
  opportunity: Opportunity;
  registrationUrl: string;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="modal-title"
          aria-modal="true"
        >
          {/* Close */}
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 text-2xl">
            🚀
          </div>

          {/* Title */}
          <h2 id="modal-title" className="text-lg font-bold text-slate-900 mb-1">
            You&rsquo;re one step away!
          </h2>
          <p className="text-[13px] text-slate-500 mb-4">
            You&rsquo;re about to register for{" "}
            <span className="font-semibold text-slate-700">{opportunity.title}</span>.
            Registration is handled on the organiser&rsquo;s platform.
          </p>

          {/* Details recap */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">Deadline</span>
              <span className="font-medium text-slate-800">{formatDate(opportunity.registrationDeadline)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">Location</span>
              <span className="font-medium text-slate-800">{opportunity.location}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">Eligibility</span>
              <span className="font-medium text-slate-800 text-right max-w-[180px]">{opportunity.eligibility}</span>
            </div>
          </div>

          {/* CTA */}
          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackRegisterClick(opportunity.id)}
            className="flex items-center justify-center gap-2 w-full py-3 text-white text-sm font-semibold rounded-xl shadow-md shadow-violet-200 transition-transform active:scale-[0.98] mb-2"
            style={{ background: "var(--ai-gradient)" }}
          >
            Go to registration page
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main sidebar card ──────────────────────────────────────────────────────────

const MODE_COLOR: Record<string, string> = {
  online: "bg-sky-50 text-sky-700",
  offline: "bg-slate-100 text-slate-700",
  hybrid: "bg-purple-50 text-purple-700",
};
const MODE_LABEL: Record<string, string> = {
  online: "Online",
  offline: "In-Person",
  hybrid: "Hybrid",
};

export default function SidebarCard({ opportunity: o, registrationUrl }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(""), 2000);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        {/* Header strip */}
        <div className="px-5 py-4" style={{ background: "var(--ai-gradient)" }}>
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-0.5">
            Registration deadline
          </p>
          <p className="text-white font-bold text-lg">{formatDate(o.registrationDeadline)}</p>
          <DaysRemaining deadline={o.registrationDeadline} />
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Meta rows */}
          {[
            {
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                </svg>
              ),
              label: "Eligibility",
              value: o.eligibility,
            },
            {
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                </svg>
              ),
              label: "Location",
              value: o.location,
            },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 font-medium">{label}</p>
                <p className="text-[13px] text-slate-800 font-medium leading-tight">{value}</p>
              </div>
            </div>
          ))}

          {/* Mode */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Mode</p>
              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${MODE_COLOR[o.mode] ?? "bg-slate-100 text-slate-700"}`}>
                {MODE_LABEL[o.mode] ?? o.mode}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            {/* Register Now — the ONE primary action on this page */}
            <button
              id="register-now-btn"
              onClick={() => setModalOpen(true)}
              className="w-full py-3 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-200 transition-transform active:scale-[0.98] hover:shadow-lg"
              style={{ background: "var(--ai-gradient)" }}
            >
              Register Now
            </button>

            {/* Save + Share */}
              <div className="grid grid-cols-2 gap-2">
                <BookmarkButton
                  opportunityId={o.id}
                  variant="pill"
                  className="w-full justify-center"
                />

                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                  </svg>
                  {shareMsg || "Share"}
                </button>
              </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <RegisterModal
          opportunity={o}
          registrationUrl={registrationUrl}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
