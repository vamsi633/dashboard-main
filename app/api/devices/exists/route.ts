// app/api/devices/exists/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExistsResponse =
  | {
      ok: true;
      exists: true;
      deviceId: string;
      claimed: boolean;
    }
  | {
      ok: true;
      exists: false;
      deviceId: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function GET(
  req: NextRequest
): Promise<NextResponse<ExistsResponse>> {
  const session = await getServerSession(authOptions);

  // 🔐 Must be logged in
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // 🔐 Must be admin
  if (session.user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const deviceId = (searchParams.get("deviceId") ?? "").trim();

  if (!deviceId) {
    return NextResponse.json(
      { ok: false, error: "deviceId query parameter is required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db("epiciot");

  const device = await db.collection("iot_devices").findOne({ deviceId });

  if (!device) {
    return NextResponse.json({
      ok: true,
      exists: false,
      deviceId,
    });
  }

  const isUnassigned =
    !device.userId || device.userId === "UNASSIGNED" || device.userId === null;

  return NextResponse.json({
    ok: true,
    exists: true,
    deviceId,
    claimed: !isUnassigned,
  });
}
