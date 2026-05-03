import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Skip login page itself
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("dashboard-auth");
  if (authCookie?.value === "authenticated") {
    return NextResponse.next();
  }

  // Check Basic Auth header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6));
    const [user, pass] = decoded.split(":");
    const expectedUser = process.env.DASHBOARD_USER;
    const expectedPass = process.env.DASHBOARD_PASS;
    if (expectedUser && expectedPass && user === expectedUser && pass === expectedPass) {
      const response = NextResponse.next();
      response.cookies.set("dashboard-auth", "authenticated", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 86400, // 24 hours
      });
      return response;
    }
  }

  // Redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
