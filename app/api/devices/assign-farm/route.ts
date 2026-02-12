// app/api/devices/assign-farm/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

type AssignFarmBody = {
  deviceId?: string;
  farmId?: string;
};

type Ok = { ok: true };
type Err = { ok: false; error: string };
type Resp = Ok | Err;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest): Promise<NextResponse<Resp>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: AssignFarmBody;
  try {
    body = (await req.json()) as AssignFarmBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const deviceId = (body.deviceId ?? "").trim();
  const farmId = (body.farmId ?? "").trim();

  if (!deviceId) {
    return NextResponse.json(
      { ok: false, error: "deviceId is required" },
      { status: 400 }
    );
  }
  if (!farmId || !ObjectId.isValid(farmId)) {
    return NextResponse.json(
      { ok: false, error: "Valid farmId is required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db("epiciot");

  // ✅ Validate farm belongs to user (unless admin)
  const isAdmin = session.user.role === "admin";

  const farm = await db.collection("farms").findOne({
    _id: new ObjectId(farmId),
    ...(isAdmin ? {} : { ownerId: session.user.id }),
  });

  if (!farm) {
    return NextResponse.json(
      { ok: false, error: "Farm not found or not yours" },
      { status: 404 }
    );
  }

  // ✅ Ensure device is owned by user (unless admin)
  const email = (session.user.email ?? "").toLowerCase();

  const deviceQuery = isAdmin
    ? { deviceId }
    : {
        deviceId,
        $or: [{ userId: session.user.id }, { claimedBy: email }],
      };

  const update = await db.collection("iot_devices").updateOne(deviceQuery, {
    $set: { farmId, updatedAt: new Date() },
  });

  if (update.matchedCount === 0) {
    return NextResponse.json(
      { ok: false, error: "Device not found or not yours" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
