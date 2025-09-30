// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs"; // ✅ run on Node (not Edge)
export const dynamic = "force-dynamic"; // ✅ ensure dynamic route

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
