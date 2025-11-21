// middleware.ts
import { withAuth } from "next-auth/middleware";
import type { JWT } from "next-auth/jwt";

export default withAuth(() => {}, {
  pages: { signIn: "/auth/signin" },
  callbacks: {
    authorized: ({ token }: { token?: JWT | null }) => !!token, // require auth for matched routes
  },
});

// Protect everything except auth endpoints, device ingest, assets, AND /admin/**
export const config = {
  matcher: [
    "/((?!api/auth|api/iot|auth|_next/|stems/|images/|fonts/|favicon.ico|robots.txt|sitemap.xml|admin).*)",
  ],
};
