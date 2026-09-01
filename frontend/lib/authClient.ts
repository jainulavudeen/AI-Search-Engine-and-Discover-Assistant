/**
 * Frontend auth client — wraps all /api/auth/* requests.
 * Stores JWT in both localStorage (for Authorization headers)
 * and a cookie (for Next.js middleware route protection).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  college?: string | null;
  course?: string | null;
  year?: number | null;
  interests: string[];
  preferredLocations: string[];
  opportunityTypes: string[];
  onboardingCompleted: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  status: "success" | "error";
  data: { user: AuthUser; token: string };
  meta: { redirectTo: string };
}

// ── Token storage ──────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function saveAuth(token: string, user: AuthUser): void {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
  // Cookie so Next.js middleware can check auth server-side
  document.cookie = `auth_token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAuth(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
}

export function getSavedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

// ── API calls ──────────────────────────────────────────────────────────────────

async function authFetch<T>(
  path: string,
  options: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export async function registerApi(data: {
  name: string;
  email: string;
  password: string;
  college?: string;
}): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function loginApi(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function onboardingApi(data: {
  course?: string;
  year?: number;
  interests?: string[];
  preferredLocations?: string[];
  opportunityTypes?: string[];
}): Promise<{ status: string; data: { user: AuthUser }; meta: { redirectTo: string } }> {
  const token = getToken();
  return authFetch("/api/auth/onboarding", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    } as HeadersInit,
    body: JSON.stringify(data),
  });
}

export async function getMeApi(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data.user as AuthUser;
  } catch {
    return null;
  }
}
