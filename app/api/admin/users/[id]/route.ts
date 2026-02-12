// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteUserAndDevices } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
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

  try {
    const { deletedUser, deletedDevices } = await deleteUserAndDevices(userId);

    if (!deletedUser) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, deletedUser, deletedDevices },
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
