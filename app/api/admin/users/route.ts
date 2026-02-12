// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listUsers();

  return NextResponse.json(
    {
      ok: true,
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name ?? null,
        image: u.image ?? null,
        role: u.role ?? "user",
      })),
    },
    { status: 200 }
  );
}
