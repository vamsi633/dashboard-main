// app/api/farms/[farmId]/devices/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InstallLocation = {
  lat: number;
  lng: number;
  accuracyM?: number;
  source?: string;
  capturedAt?: string | Date;
};

type DeviceDoc = {
  deviceId: string;
  name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  lastSeen?: string;
  isOnline?: boolean;
  farmId?: string;
  userId?: string;
  claimedBy?: string;
  installLocation?: InstallLocation;
};

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

type GetResp =
  | { ok: true; devices: DeviceOut[] }
  | { ok: false; error: string };
type PostResp = { ok: true } | { ok: false; error: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
): Promise<NextResponse<GetResp>> {
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

  const isAdmin = session.user.role === "admin";

  // 1) Farm must exist
  const farm = await db
    .collection("farms")
    .findOne({ _id: new ObjectId(farmId) });
  if (!farm) {
    return NextResponse.json(
      { ok: false, error: "Farm not found" },
      { status: 404 }
    );
  }

  // 2) Ownership check (non-admin)
  if (!isAdmin && farm.ownerId !== session.user.id) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  // 3) SAFE device query
  const email = (session.user.email ?? "").toLowerCase();

  const deviceQuery: Record<string, unknown> = isAdmin
    ? { farmId }
    : { farmId, $or: [{ userId: session.user.id }, { claimedBy: email }] };

  const devices = await db
    .collection<DeviceDoc>("iot_devices")
    .find(deviceQuery)
    .project<DeviceDoc>({
      _id: 0,
      deviceId: 1,
      name: 1,
      location: 1,
      latitude: 1,
      longitude: 1,
      lastSeen: 1,
      isOnline: 1,
      farmId: 1,
      installLocation: 1,
    })
    .toArray();

  // Prefer installLocation if present (typed, no any)
  const out: DeviceOut[] = devices.map((d) => ({
    deviceId: d.deviceId,
    name: d.name,
    location: d.location,
    latitude: d.installLocation?.lat ?? d.latitude,
    longitude: d.installLocation?.lng ?? d.longitude,
    lastSeen: d.lastSeen,
    isOnline: d.isOnline,
    farmId: d.farmId,
  }));

  return NextResponse.json({ ok: true, devices: out }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
): Promise<NextResponse<PostResp>> {
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

  const isAdmin = session.user.role === "admin";

  // Farm must exist
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

  // Device must exist
  const existing = await db
    .collection<DeviceDoc>("iot_devices")
    .findOne({ deviceId });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Device not found" },
      { status: 404 }
    );
  }

  // Must already be owned by this user (or admin can override)
  const ownedByUser =
    existing.userId === session.user.id ||
    (!!session.user.email &&
      (existing.claimedBy ?? "").toLowerCase() ===
        session.user.email.toLowerCase());

  if (!isAdmin && !ownedByUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "You can only add your own claimed devices to a farm.",
      },
      { status: 403 }
    );
  }

  // Assign farmId
  await db
    .collection("iot_devices")
    .updateOne({ deviceId }, { $set: { farmId, updatedAt: new Date() } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
