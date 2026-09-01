"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// ── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" aria-label="CampusFind AI home">
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white select-none shadow-sm shadow-violet-200/70"
        style={{ background: "var(--ai-gradient)" }}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
      </span>
      <span className="font-bold text-slate-900 tracking-tight text-[15px]">
        CampusFind<span className="ai-gradient-text">AI</span>
      </span>
    </Link>
  );
}

// ── User dropdown ─────────────────────────────────────────────────────────────

function UserMenu({ name, role, onLogout }: { name: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
          {initials}
        </div>
        <span className="text-[13px] font-medium text-slate-700 hidden sm:block max-w-[100px] truncate">
          {name.split(" ")[0]}
        </span>
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50"
        >
          {/* User info header */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-[13px] font-semibold text-slate-900 truncate">{name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{role === "ADMIN" ? "Admin account" : "Student account"}</p>
          </div>

          <div className="py-1">
            {role === "ADMIN" && (
              <Link
                href="/admin/events"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Admin panel
              </Link>
            )}
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              Dashboard
            </Link>
            <Link
              href="/saved"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>
              Saved
            </Link>
            <Link
              href="/onboarding"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Preferences
            </Link>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────

function MobileMenu({
  user,
  navLinks,
  onLogout,
  onClose,
  pathname,
}: {
  user: { name: string; role: string } | null;
  navLinks: { label: string; href: string }[];
  onLogout: () => void;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Navigation menu"
        className="fixed inset-y-0 right-0 w-72 z-50 bg-white shadow-xl md:hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <Logo />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map(({ label, href }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Auth footer */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-2">
          {user ? (
            <>
              <div className="px-4 py-2 mb-1">
                <p className="text-[13px] font-semibold text-slate-900">{user.name}</p>
                <p className="text-[11px] text-slate-400">{user.role === "ADMIN" ? "Admin account" : "Student account"}</p>
              </div>
              <button
                onClick={() => { onClose(); onLogout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={onClose}
                className="block w-full px-4 py-2.5 text-center text-[14px] font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="block w-full px-4 py-2.5 text-center text-[14px] font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { label: "Discover", href: "/discover" },
    ...(user ? [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Saved", href: "/saved" },
    ] : []),
    ...(user?.role === "ADMIN" ? [{ label: "Admin", href: "/admin/events" }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <Logo />

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {navLinks.map(({ label, href }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? "text-indigo-700 bg-indigo-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop auth area */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {isLoading ? (
              <div className="w-24 h-8 bg-slate-100 rounded-lg animate-pulse" />
            ) : user ? (
              <UserMenu name={user.name} role={user.role} onLogout={logout} />
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </nav>
      </header>

      {/* Mobile drawer (rendered outside header to cover full screen) */}
      {mobileOpen && (
        <MobileMenu
          user={user}
          navLinks={navLinks}
          onLogout={logout}
          onClose={() => setMobileOpen(false)}
          pathname={pathname}
        />
      )}
    </>
  );
}
