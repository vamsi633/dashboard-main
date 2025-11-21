// app/api/admin/invites/ensure-indexes/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureInviteIndexes } from "@/lib/invites";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const created = await ensureInviteIndexes();
  return NextResponse.json(created);
}
