import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    console.log("Middleware - token:", req.nextauth.token);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log(
          "Authorized check - token:",
          !!token,
          "path:",
          req.nextUrl.pathname
        );
        return !!token;
      },
    },
  }
);

// Updated matcher to exclude IoT endpoints
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api/auth/* (auth endpoints)
     * - /api/iot/* (IoT endpoints) ← ADDED THIS
     * - /auth/* (auth pages)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     */
    "/((?!api/auth|api/iot|auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
