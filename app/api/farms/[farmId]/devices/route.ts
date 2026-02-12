// app/api/farms/[farmId]/devices/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeviceOut = {
  deviceId: string;
  name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  lastSeen?: string;
  isOnline?: boolean;
  farmId?: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { farmId } = await params;

  if (!ObjectId.isValid(farmId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid farm id" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db("epiciot");

  // 1) Farm must belong to user (unless admin)
  const isAdmin = session.user.role === "admin";
  const farm = await db
    .collection("farms")
    .findOne({ _id: new ObjectId(farmId) });

  if (!farm) {
    return NextResponse.json(
      { ok: false, error: "Farm not found" },
      { status: 404 }
    );
  }

  if (!isAdmin && farm.ownerId !== session.user.id) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  // 2) List devices in that farm
  const devices = await db
    .collection("iot_devices")
    .find({ farmId })
    .project({
      _id: 0,
      deviceId: 1,
      name: 1,
      location: 1,
      latitude: 1,
      longitude: 1,
      lastSeen: 1,
      isOnline: 1,
      farmId: 1,
    })
    .toArray();

  return NextResponse.json({ ok: true, devices: devices as DeviceOut[] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { farmId } = await params;

  if (!ObjectId.isValid(farmId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid farm id" },
      { status: 400 }
    );
  }

  const body = (await req.json()) as { deviceId?: string };
  const deviceId = (body.deviceId ?? "").trim();
  if (!deviceId) {
    return NextResponse.json(
      { ok: false, error: "deviceId is required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db("epiciot");

  // 1) Farm must belong to user (unless admin)
  const isAdmin = session.user.role === "admin";
  const farm = await db
    .collection("farms")
    .findOne({ _id: new ObjectId(farmId) });

  if (!farm) {
    return NextResponse.json(
      { ok: false, error: "Farm not found" },
      { status: 404 }
    );
  }

  if (!isAdmin && farm.ownerId !== session.user.id) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  // 2) Device must exist
  const existing = await db.collection("iot_devices").findOne({ deviceId });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Device not found" },
      { status: 404 }
    );
  }

  // 3) Must already be owned by this user (or admin can override)
  const ownedByUser =
    existing.userId === session.user.id ||
    (session.user.email &&
      existing.claimedBy?.toLowerCase?.() === session.user.email.toLowerCase());

  if (!isAdmin && !ownedByUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "You can only add your own claimed devices to a farm.",
      },
      { status: 403 }
    );
  }

  // 4) Assign farmId
  await db
    .collection("iot_devices")
    .updateOne({ deviceId }, { $set: { farmId, updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
