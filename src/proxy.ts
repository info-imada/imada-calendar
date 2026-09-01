import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(request) {
    if (request.nextauth.token?.accessDecision === "PENDING" && request.nextUrl.pathname !== "/access-pending") {
      return NextResponse.redirect(new URL("/access-pending", request.url));
    }
    if (request.nextauth.token?.mustChangePassword && request.nextUrl.pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: { authorized: ({ token }) => Boolean(token) },
  },
);

export const config = {
  matcher: ["/((?!api/auth|api/health|login|access-pending|change-password|_next|favicon.ico|.*\\.[^/]+$).*)"],
};
