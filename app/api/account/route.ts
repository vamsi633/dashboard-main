// app/api/account/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteUserAndDevices, isLastAdmin } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Could not resolve user id from session" },
      { status: 400 }
    );
  }

  // Prevent the last admin from deleting their account so the system always
  // has at least one admin.
  if (await isLastAdmin(userId)) {
    return NextResponse.json(
      { ok: false, error: "Cannot delete the only admin account" },
      { status: 403 }
    );
  }

  try {
    const result = await deleteUserAndDevices(userId);

    if (!result.deletedUser) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
