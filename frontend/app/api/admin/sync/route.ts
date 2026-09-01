/**
 * Next.js API Route — server-side proxy for admin sync.
 *
 * This route runs on the Next.js server, NOT in the browser.
 * It reads ADMIN_SYNC_SECRET from server env and forwards it
 * to the backend. The secret is NEVER sent to or visible in the browser.
 *
 * Usage: POST /api/admin/sync   (from frontend fetch calls)
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
// ADMIN_SYNC_SECRET is a server-only env var (no NEXT_PUBLIC_ prefix)
const ADMIN_SECRET = process.env.ADMIN_SYNC_SECRET ?? "";

export async function POST(req: NextRequest) {
  if (!ADMIN_SECRET) {
    return NextResponse.json(
      { error: "ADMIN_SYNC_SECRET is not configured on the Next.js server. Add it to frontend/.env.local" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${BACKEND_URL}/admin/events/sync`, {
      method: "POST",
      headers: {
        "x-admin-secret": ADMIN_SECRET,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Backend unreachable: ${message}` },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!ADMIN_SECRET) {
    return NextResponse.json(
      { error: "ADMIN_SYNC_SECRET not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${BACKEND_URL}/admin/events/stats`, {
      headers: { "x-admin-secret": ADMIN_SECRET },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Backend unreachable: ${message}` },
      { status: 502 }
    );
  }
}
