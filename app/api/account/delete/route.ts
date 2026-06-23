// app/api/account/delete/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteUserAndDevices } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await deleteUserAndDevices(session.user.id);

    if (!result.deletedUser) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("Error deleting own account:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
