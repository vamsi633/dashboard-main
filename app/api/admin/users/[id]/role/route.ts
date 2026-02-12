// app/api/admin/users/[id]/role/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setUserRole, type Role } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing user id" },
      { status: 400 }
    );
  }

  let body: { role?: Role };
  try {
    body = (await req.json()) as { role?: Role };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { role } = body;
  if (!role || (role !== "admin" && role !== "user")) {
    return NextResponse.json(
      { ok: false, error: "Invalid role" },
      { status: 400 }
    );
  }

  try {
    await setUserRole(userId, role);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update role" },
      { status: 500 }
    );
  }
}
