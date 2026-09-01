"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAdminDashboardStats,
  fetchAdminOpportunities,
  updateAdminOpportunity,
  setAdminOpportunityStatus,
  triggerAdminSync,
  fetchAdminAnalytics,
  AdminApiError,
  type AdminDashboardStats,
  type AdminOpportunity,
  type AdminOpportunityStatus,
  type UpdateOpportunityInput,
  type AdminSyncResult,
  type AdminAnalytics,
} from "@/lib/adminApi";

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const CATEGORY_OPTIONS = ["HACKATHON", "INTERNSHIP", "WORKSHOP", "COMPETITION", "CONFERENCE", "SCHOLARSHIP"] as const;
const MODE_OPTIONS = ["ONLINE", "OFFLINE", "HYBRID"] as const;
const PAGE_SIZE = 20;

const STATUS_STYLES: Record<AdminOpportunityStatus, string> = {
  LIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
  CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
  EXPIRED: "bg-rose-50 text-rose-600 border-rose-100",
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, ISO strings are UTC
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ══════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, icon, tone }: { label: string; value: string | number; icon: string; tone: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{icon}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${tone}`} />
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EDIT MODAL
// ══════════════════════════════════════════════════════════════════════════════

function EditOpportunityModal({
  opportunity,
  onClose,
  onSaved,
}: {
  opportunity: AdminOpportunity;
  onClose: () => void;
  onSaved: (updated: AdminOpportunity) => void;
}) {
  const [form, setForm] = useState<UpdateOpportunityInput>({
    title: opportunity.title,
    description: opportunity.description,
    category: opportunity.category,
    location: opportunity.location,
    mode: opportunity.mode,
    startDate: toDatetimeLocal(opportunity.startDate),
    endDate: toDatetimeLocal(opportunity.endDate),
    registrationDeadline: toDatetimeLocal(opportunity.registrationDeadline),
    organizer: opportunity.organizer,
    eligibility: opportunity.eligibility,
    skills: opportunity.skills,
    tags: opportunity.tags,
    registrationUrl: opportunity.registrationUrl,
    relevanceScore: opportunity.relevanceScore,
    featured: opportunity.featured,
    isFree: opportunity.isFree ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function set<K extends keyof UpdateOpportunityInput>(key: K, value: UpdateOpportunityInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      // datetime-local values are local time with no timezone — convert to ISO
      const payload: UpdateOpportunityInput = {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : form.endDate === "" ? null : undefined,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
      };
      const res = await updateAdminOpportunity(opportunity.id, payload);
      onSaved(res.data);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setFormError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full text-[13px] border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50";
  const labelClass = "text-[12px] font-semibold text-slate-600 mb-1 block";
  const errClass = "text-[11px] text-rose-600 mt-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" aria-hidden onClick={onClose} />
      <div role="dialog" aria-label="Edit opportunity" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-[15px] font-bold text-slate-900">Edit opportunity</h2>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" aria-label="Close">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {formError && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-[12px] text-rose-700">{formError}</div>
            )}

            <div>
              <label className={labelClass}>Title</label>
              <input className={inputClass} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} required minLength={3} />
              {fieldErrors.title && <p className={errClass}>{fieldErrors.title[0]}</p>}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea className={inputClass} rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} required minLength={10} />
              {fieldErrors.description && <p className={errClass}>{fieldErrors.description[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category</label>
                <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value as UpdateOpportunityInput["category"])}>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Mode</label>
                <select className={inputClass} value={form.mode} onChange={(e) => set("mode", e.target.value as UpdateOpportunityInput["mode"])}>
                  {MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Location</label>
                <input className={inputClass} value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} required />
                {fieldErrors.location && <p className={errClass}>{fieldErrors.location[0]}</p>}
              </div>
              <div>
                <label className={labelClass}>Organizer</label>
                <input className={inputClass} value={form.organizer ?? ""} onChange={(e) => set("organizer", e.target.value)} required />
                {fieldErrors.organizer && <p className={errClass}>{fieldErrors.organizer[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Start date</label>
                <input type="datetime-local" className={inputClass} value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} required />
                {fieldErrors.startDate && <p className={errClass}>{fieldErrors.startDate[0]}</p>}
              </div>
              <div>
                <label className={labelClass}>End date <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="datetime-local" className={inputClass} value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} />
                {fieldErrors.endDate && <p className={errClass}>{fieldErrors.endDate[0]}</p>}
              </div>
              <div>
                <label className={labelClass}>Registration deadline</label>
                <input type="datetime-local" className={inputClass} value={form.registrationDeadline ?? ""} onChange={(e) => set("registrationDeadline", e.target.value)} required />
                {fieldErrors.registrationDeadline && <p className={errClass}>{fieldErrors.registrationDeadline[0]}</p>}
              </div>
            </div>

            <div>
              <label className={labelClass}>Eligibility</label>
              <input className={inputClass} value={form.eligibility ?? ""} onChange={(e) => set("eligibility", e.target.value)} required />
              {fieldErrors.eligibility && <p className={errClass}>{fieldErrors.eligibility[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Skills <span className="text-slate-400 font-normal">(comma separated)</span></label>
                <input
                  className={inputClass}
                  value={(form.skills ?? []).join(", ")}
                  onChange={(e) => set("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                />
              </div>
              <div>
                <label className={labelClass}>Tags <span className="text-slate-400 font-normal">(comma separated)</span></label>
                <input
                  className={inputClass}
                  value={(form.tags ?? []).join(", ")}
                  onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Registration URL</label>
              <input className={inputClass} value={form.registrationUrl ?? ""} onChange={(e) => set("registrationUrl", e.target.value)} required />
              {fieldErrors.registrationUrl && <p className={errClass}>{fieldErrors.registrationUrl[0]}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className={labelClass}>Relevance score</label>
                <input type="number" min={0} max={100} className={inputClass} value={form.relevanceScore ?? 70} onChange={(e) => set("relevanceScore", Number(e.target.value))} />
              </div>
              <div>
                <label className={labelClass}>Registration</label>
                <select
                  className={inputClass}
                  value={form.isFree === null || form.isFree === undefined ? "unknown" : form.isFree ? "free" : "paid"}
                  onChange={(e) => set("isFree", e.target.value === "unknown" ? null : e.target.value === "free")}
                >
                  <option value="unknown">Unknown</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={!!form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600" />
                <span className="text-[13px] text-slate-600">Featured</span>
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function AdminEventsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Access gate — real enforcement is server-side (requireAdmin on every
  // admin API call); this only avoids flashing admin UI at a student.
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  // ── Dashboard stats ─────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setStatsError(null);
    try {
      setStats(await fetchAdminDashboardStats());
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Failed to load stats");
    }
  }, []);

  // ── Analytics ────────────────────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsError(null);
    try {
      setAnalytics(await fetchAdminAnalytics());
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : "Failed to load analytics");
    }
  }, []);

  // ── Sync ─────────────────────────────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<AdminSyncResult | null>(null);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await triggerAdminSync();
      setSyncResult(result);
      if (result.success) await loadStats();
    } catch (err) {
      setSyncResult({ success: false, error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSyncing(false);
    }
  };

  // ── Opportunity table ────────────────────────────────────────────────────────
  const [opps, setOpps] = useState<AdminOpportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [oppsLoading, setOppsLoading] = useState(true);
  const [oppsError, setOppsError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "live" | "closed" | "expired">("");
  const [sourceFilter, setSourceFilter] = useState<"" | "manual" | "external">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const [editingOpp, setEditingOpp] = useState<AdminOpportunity | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  const loadOpportunities = useCallback(async () => {
    setOppsLoading(true);
    setOppsError(null);
    try {
      const res = await fetchAdminOpportunities({
        search: search || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        category: categoryFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setOpps(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setOppsError(err instanceof Error ? err.message : "Failed to load opportunities");
    } finally {
      setOppsLoading(false);
    }
  }, [search, statusFilter, sourceFilter, categoryFilter, page]);

  // Initial load (once we know the user is a real admin)
  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      loadStats();
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.role]);

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      loadOpportunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.role, search, statusFilter, sourceFilter, categoryFilter, page]);

  // Reset to page 1 whenever a filter changes
  const handleFilterChange = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange(() => setSearch(searchInput.trim()));
  };

  const handleToggleStatus = async (opp: AdminOpportunity) => {
    const nextActive = opp.status === "CLOSED"; // reopen if currently closed, else close it
    const label = nextActive ? "reopen" : "deactivate";
    if (!window.confirm(`${nextActive ? "Reopen" : "Deactivate"} "${opp.title}"?`)) return;

    setStatusBusyId(opp.id);
    try {
      const res = await setAdminOpportunityStatus(opp.id, nextActive);
      setOpps((list) => list.map((o) => (o.id === opp.id ? res.data : o)));
      loadStats();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : `Failed to ${label} opportunity`);
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleSaved = (updated: AdminOpportunity) => {
    setOpps((list) => list.map((o) => (o.id === updated.id ? updated : o)));
    setEditingOpp(null);
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 results";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}–${end} of ${total}`;
  }, [page, total]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/40">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400">Loading…</div>
        <Footer />
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/40">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400">Redirecting…</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/40">
      <Navbar />

      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin — Event Management</h1>
              <p className="text-[13px] text-slate-500">Manage opportunity data, sourcing, and external sync</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* Dashboard stats */}
        <section>
          <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Dashboard</h2>
          {statsError ? (
            <p className="text-[13px] text-rose-600">{statsError}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total opportunities" value={stats?.total ?? "—"} icon="📊" tone="bg-slate-300" />
              <StatCard label="Active" value={stats?.active ?? "—"} icon="🟢" tone="bg-emerald-400" />
              <StatCard label="Expired" value={stats?.expired ?? "—"} icon="⏰" tone="bg-rose-400" />
              <StatCard label="External (Brabble)" value={stats?.external ?? "—"} icon="🔗" tone="bg-indigo-400" />
              <StatCard label="Manual / seeded" value={stats?.manual ?? "—"} icon="✍️" tone="bg-amber-400" />
              <StatCard label="Last sync" value={stats?.lastSyncAt ? formatDateTime(stats.lastSyncAt) : "Never"} icon="🕒" tone="bg-slate-300" />
            </div>
          )}
        </section>

        {/* Analytics — aggregate only, no per-student activity shown */}
        <section>
          <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Analytics</h2>
          {analyticsError ? (
            <p className="text-[13px] text-rose-600">{analyticsError}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard label="Total searches" value={analytics?.totalSearches ?? "—"} icon="🔍" tone="bg-indigo-400" />
                <StatCard label="Opportunity views" value={analytics?.totalViews ?? "—"} icon="👁️" tone="bg-sky-400" />
                <StatCard label="Bookmarks" value={analytics?.totalBookmarks ?? "—"} icon="🔖" tone="bg-amber-400" />
                <StatCard label="Registration clicks" value={analytics?.totalRegisterClicks ?? "—"} icon="🚀" tone="bg-emerald-400" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Most searched categories */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[12px] font-semibold text-slate-600 mb-3">Most searched categories</p>
                  {analytics?.mostSearchedCategories.length ? (
                    <ul className="space-y-2">
                      {analytics.mostSearchedCategories.map((c) => (
                        <li key={c.category} className="flex items-center justify-between text-[12px]">
                          <span className="text-slate-600 capitalize">{c.category.toLowerCase()}</span>
                          <span className="font-semibold text-slate-900">{c.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] text-slate-400">No search data yet.</p>
                  )}
                </div>

                {/* Most searched locations */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[12px] font-semibold text-slate-600 mb-3">Most searched locations</p>
                  {analytics?.mostSearchedLocations.length ? (
                    <ul className="space-y-2">
                      {analytics.mostSearchedLocations.map((l) => (
                        <li key={l.location} className="flex items-center justify-between text-[12px]">
                          <span className="text-slate-600">{l.location}</span>
                          <span className="font-semibold text-slate-900">{l.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] text-slate-400">No search data yet.</p>
                  )}
                </div>

                {/* Most popular opportunities */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[12px] font-semibold text-slate-600 mb-3">Most popular opportunities</p>
                  {analytics?.mostPopularOpportunities.length ? (
                    <ul className="space-y-2">
                      {analytics.mostPopularOpportunities.map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-2 text-[12px]">
                          <Link href={`/opportunities/${o.id}`} target="_blank" className="text-indigo-600 hover:text-indigo-800 truncate">
                            {o.title}
                          </Link>
                          <span className="font-semibold text-slate-900 flex-shrink-0">{o.viewCount} views</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] text-slate-400">No view data yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* External sync */}
        <section>
          <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest mb-3">External Sync</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-slate-900">Sync opportunities from Brabble AI</p>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Fetches hackathons, competitions, and workshops. Existing data is preserved — API keys never leave the backend.
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  syncing ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200"
                }`}
              >
                {syncing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Syncing…
                  </>
                ) : (
                  "Sync Opportunities"
                )}
              </button>
            </div>

            {syncResult && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                {syncResult.success ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                      <p className="text-[13px] font-semibold text-emerald-700">Sync completed successfully</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { label: "Fetched", value: syncResult.fetched ?? 0, color: "text-slate-700" },
                        { label: "New", value: syncResult.created ?? 0, color: "text-emerald-700" },
                        { label: "Duplicates (updated)", value: syncResult.updated ?? 0, color: "text-indigo-700" },
                        { label: "Skipped", value: syncResult.skipped ?? 0, color: "text-slate-500" },
                        { label: "Errors", value: syncResult.errors ?? 0, color: syncResult.errors ? "text-rose-700" : "text-slate-500" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className={`text-2xl font-bold ${color}`}>{value}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                    <p className="text-[13px] font-semibold text-rose-700 mb-1">Sync failed</p>
                    <p className="text-[12px] text-rose-600">{syncResult.error}</p>
                    {syncResult.hint && <p className="text-[12px] text-slate-500 mt-2">{syncResult.hint}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Opportunity management */}
        <section>
          <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Opportunity Management</h2>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Search + filters */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by title, organizer, source, category, location…"
                  className="flex-1 text-[13px] bg-transparent outline-none"
                />
              </form>

              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(() => setStatusFilter(e.target.value as typeof statusFilter))}
                className="text-[13px] border border-slate-200 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="">All statuses</option>
                <option value="live">Live</option>
                <option value="closed">Closed</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => handleFilterChange(() => setSourceFilter(e.target.value as typeof sourceFilter))}
                className="text-[13px] border border-slate-200 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="">All sources</option>
                <option value="manual">Manual / seeded</option>
                <option value="external">External</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => handleFilterChange(() => setCategoryFilter(e.target.value))}
                className="text-[13px] border border-slate-200 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {oppsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td colSpan={10} className="px-4 py-3"><div className="skeleton-shimmer h-4 bg-slate-100 rounded" /></td>
                      </tr>
                    ))
                  ) : oppsError ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-rose-600">{oppsError}</td></tr>
                  ) : opps.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No opportunities match these filters.</td></tr>
                  ) : (
                    opps.map((o) => (
                      <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[220px] truncate">{o.title}</td>
                        <td className="px-4 py-3 text-slate-500">{o.category}</td>
                        <td className="px-4 py-3 text-slate-500">{o.location}</td>
                        <td className="px-4 py-3 text-slate-500">{o.mode}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(o.registrationDeadline)}</td>
                        <td className="px-4 py-3 text-slate-500">{o.source ?? "manual"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDateTime(o.updatedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/opportunities/${o.id}`} target="_blank" className="text-indigo-600 hover:text-indigo-800 font-medium">View</Link>
                            <button onClick={() => setEditingOpp(o)} className="text-slate-600 hover:text-slate-900 font-medium">Edit</button>
                            <button
                              onClick={() => handleToggleStatus(o)}
                              disabled={statusBusyId === o.id}
                              className={`font-medium disabled:opacity-50 ${o.status === "CLOSED" ? "text-emerald-600 hover:text-emerald-800" : "text-rose-600 hover:text-rose-800"}`}
                            >
                              {statusBusyId === o.id ? "…" : o.status === "CLOSED" ? "Reopen" : "Deactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[12px] text-slate-400">{rangeLabel}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || oppsLoading}
                  className="px-3 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-[12px] text-slate-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || oppsLoading}
                  className="px-3 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {editingOpp && (
        <EditOpportunityModal opportunity={editingOpp} onClose={() => setEditingOpp(null)} onSaved={handleSaved} />
      )}

      <Footer />
    </div>
  );
}
