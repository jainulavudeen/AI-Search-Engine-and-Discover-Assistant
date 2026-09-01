/**
 * Admin-only API client. Every call requires the logged-in user's JWT to
 * carry the ADMIN role — the backend enforces this independently
 * (requireAdmin middleware); this file just wires the requests up.
 */

import { getToken } from "./authClient";
import type { ApiOpportunity, ApiCategory, ApiMode } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export class AdminApiError extends Error {
  fieldErrors?: Record<string, string[] | undefined>;
  status: number;
  constructor(message: string, status: number, fieldErrors?: Record<string, string[] | undefined>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AdminApiError(
      body.message ?? body.error ?? `Request failed (${res.status})`,
      res.status,
      body.errors
    );
  }
  return body as T;
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  total: number;
  active: number;
  expired: number;
  closed: number;
  external: number;
  manual: number;
  lastSyncAt: string | null;
  lastSyncSource: string | null;
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  return adminFetch<AdminDashboardStats>("/api/admin/dashboard-stats", { cache: "no-store" });
}

// ── Opportunity list ───────────────────────────────────────────────────────────

export type AdminOpportunityStatus = "LIVE" | "CLOSED" | "EXPIRED";

export interface AdminOpportunity extends ApiOpportunity {
  status: AdminOpportunityStatus;
  source: string | null;
}

export interface AdminOpportunitiesParams {
  search?: string;
  status?: "live" | "closed" | "expired";
  source?: "manual" | "external";
  category?: string;
  page?: number;
  limit?: number;
}

export interface AdminOpportunitiesResponse {
  data: AdminOpportunity[];
  meta: { total: number; page: number; totalPages: number };
}

export async function fetchAdminOpportunities(
  params: AdminOpportunitiesParams = {}
): Promise<AdminOpportunitiesResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return adminFetch<AdminOpportunitiesResponse>(`/api/admin/opportunities${query}`, { cache: "no-store" });
}

// ── Edit ─────────────────────────────────────────────────────────────────────

export interface UpdateOpportunityInput {
  title?: string;
  description?: string;
  category?: ApiCategory;
  location?: string;
  mode?: ApiMode;
  startDate?: string;
  endDate?: string | null;
  registrationDeadline?: string;
  organizer?: string;
  eligibility?: string;
  skills?: string[];
  tags?: string[];
  registrationUrl?: string;
  relevanceScore?: number;
  featured?: boolean;
  isFree?: boolean | null;
}

export async function updateAdminOpportunity(
  id: string,
  data: UpdateOpportunityInput
): Promise<{ data: AdminOpportunity }> {
  return adminFetch(`/api/admin/opportunities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Deactivate / reactivate ───────────────────────────────────────────────────

export async function setAdminOpportunityStatus(
  id: string,
  isActive: boolean
): Promise<{ data: AdminOpportunity }> {
  return adminFetch(`/api/admin/opportunities/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// ── External sync (Phase 12 logic, unchanged — just now called with the
// admin's own JWT instead of the shared secret; the secret-based proxy
// route at /api/admin/sync still exists and works for scripts/ops) ──────────

export interface AdminSyncResult {
  success: boolean;
  fetched?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  durationMs?: number;
  lastSyncAt?: string;
  error?: string;
  hint?: string;
}

export async function triggerAdminSync(): Promise<AdminSyncResult> {
  return adminFetch<AdminSyncResult>("/api/admin/events/sync", { method: "POST" });
}

// ── Analytics (Phase 16) — every field is an aggregate count or group-by;
// nothing here identifies which student did what. ────────────────────────────

export interface AdminAnalytics {
  totalSearches: number;
  totalViews: number;
  totalBookmarks: number;
  totalRegisterClicks: number;
  totalRecommendationClicks: number;
  mostSearchedCategories: { category: ApiCategory; count: number }[];
  mostSearchedLocations: { location: string; count: number }[];
  mostPopularOpportunities: { id: string; title: string; category: ApiCategory; viewCount: number }[];
}

export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  return adminFetch<AdminAnalytics>("/api/admin/analytics", { cache: "no-store" });
}
