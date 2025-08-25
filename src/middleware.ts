import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/api/auth/signin",
  "/api/auth/error",
  "/auth/error",
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
];

export const config = {
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicRoute = publicRoutes.some((route) => route === pathname);

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access a protected route
  if (!req.auth?.user && !isPublicRoute) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated and trying to access signin page, redirect to dashboard
  if (req.auth?.user && pathname === "/api/auth/signin") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});
