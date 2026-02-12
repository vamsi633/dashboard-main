// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setUserRole, deleteUserAndDevices, type Role } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users/:id/role
 * Body: { role: "admin" | "user" }
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const userId = params.id;
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
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/:id
 * Deletes the user + any devices they claimed.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const userId = params.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing user id" },
      { status: 400 }
    );
  }

  try {
    const { deletedUser, deletedDevices } = await deleteUserAndDevices(userId);

    if (!deletedUser) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        deletedUser,
        deletedDevices,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
