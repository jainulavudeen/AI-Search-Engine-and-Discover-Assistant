import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/onboarding", "/admin"];
const AUTH_ONLY = ["/login", "/register"]; // redirect away if already logged in

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  // Guard protected routes
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  if (AUTH_ONLY.some((p) => pathname === p) && token) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/admin/:path*", "/login", "/register"],
};
