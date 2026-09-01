import Link from "next/link";

const links = {
  Product: [
    { label: "Discover", href: "/discover" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Saved", href: "/saved" },
  ],
  Account: [
    { label: "Sign up", href: "/register" },
    { label: "Log in", href: "/login" },
    { label: "Preferences", href: "/onboarding" },
  ],
  Legal: [
    { label: "Privacy policy", href: "#" },
    { label: "Terms of use", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                C
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                CampusFind<span className="text-indigo-600">AI</span>
              </span>
            </Link>
            <p className="text-[13px] text-slate-500 leading-relaxed max-w-[200px]">
              AI-powered opportunity discovery for college students across India.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider mb-3">
                {group}
              </p>
              <ul className="flex flex-col gap-2">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-slate-400">
            © {new Date().getFullYear()} CampusFind AI · Built for the hackathon demo.
          </p>
          <div className="flex items-center gap-1 text-[12px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
