// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// Only export HTTP method handlers - required for Next.js App Router
export { handler as GET, handler as POST };
