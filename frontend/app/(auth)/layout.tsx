import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="border-b border-slate-100 bg-white px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-slate-800 hover:opacity-80 transition-opacity">
          <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">C</span>
          <span className="font-semibold text-[15px]">CampusFind AI</span>
        </Link>
        <Link href="/" className="text-[13px] text-slate-500 hover:text-slate-800 transition-colors">
          ← Back to home
        </Link>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-[11px] text-slate-400">
        © 2026 CampusFind AI · For student hackathon demonstration
      </div>
    </div>
  );
}
