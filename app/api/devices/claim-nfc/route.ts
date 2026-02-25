// app/api/devices/claim-nfc/route.ts
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
  accuracyM?: number; // ✅ optional (keep for future)
};

type FarmSelection =
  | { mode: "existing"; farmId: string }
  | { mode: "create"; name: string };

type ClaimNfcBody = {
  deviceId: string; // ✅ required
  farm: FarmSelection; // ✅ required
  installLocation?: InstallLocation; // ✅ optional
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: ClaimNfcBody;
  try {
    body = (await req.json()) as ClaimNfcBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const deviceId = (body.deviceId ?? "").trim();
  if (!deviceId) {
    return NextResponse.json(
      { ok: false, error: "deviceId is required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db("epiciot");

  const devices = db.collection("iot_devices");
  const farms = db.collection("farms");
  const readings = db.collection("sensor_readings");

  // 1) Find device
  const device = await devices.findOne({ deviceId });
  if (!device) {
    return NextResponse.json(
      { ok: false, error: "Device not found" },
      { status: 404 }
    );
  }

  // 2) Ensure not already claimed
  const isUnassigned =
    !device.userId || device.userId === "UNASSIGNED" || device.userId === null;

  if (!isUnassigned) {
    return NextResponse.json(
      { ok: false, error: "Device already claimed" },
      { status: 409 }
    );
  }

  // 3) Resolve farm (existing or create)
  let farmIdToUse: string;

  if (body.farm?.mode === "existing") {
    const farmId = (body.farm.farmId ?? "").trim();
    if (!ObjectId.isValid(farmId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid farmId" },
        { status: 400 }
      );
    }

    const farmDoc = await farms.findOne({
      _id: new ObjectId(farmId),
      ownerId: session.user.id,
    });

    if (!farmDoc) {
      return NextResponse.json(
        { ok: false, error: "Farm not found or not owned by user" },
        { status: 403 }
      );
    }

    farmIdToUse = farmId;
  } else if (body.farm?.mode === "create") {
    const name = (body.farm.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Farm name required" },
        { status: 400 }
      );
    }

    const insertFarm = await farms.insertOne({
      name,
      ownerId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    farmIdToUse = insertFarm.insertedId.toHexString();
  } else {
    return NextResponse.json(
      { ok: false, error: "farm selection required" },
      { status: 400 }
    );
  }

  // 4) Validate installLocation (optional)
  const loc = body.installLocation;

  const installLocation =
    loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
      ? {
          lat: Number(loc.lat),
          lng: Number(loc.lng),
          accuracyM:
            loc.accuracyM !== undefined ? Number(loc.accuracyM) : undefined,
          source: "mobile",
          capturedAt: new Date(),
        }
      : undefined;

  // 5) Atomic claim update (same concurrency safety)
  const updateResult = await devices.updateOne(
    {
      deviceId,
      $or: [
        { userId: "UNASSIGNED" },
        { userId: null },
        { userId: { $exists: false } },
      ],
    },
    {
      $set: {
        userId: session.user.id,
        claimedBy: session.user.email.toLowerCase(),
        claimedAt: new Date(),
        status: "claimed",
        farmId: farmIdToUse,
        updatedAt: new Date(),
        ...(installLocation ? { installLocation } : {}),
      },
    }
  );

  if (updateResult.modifiedCount === 0) {
    return NextResponse.json(
      { ok: false, error: "Device was claimed concurrently" },
      { status: 409 }
    );
  }

  // 6) Transfer ownership on existing readings (optional but useful)
  await readings.updateMany(
    { deviceId },
    { $set: { userId: session.user.id, transferredAt: new Date() } }
  );

  return NextResponse.json({
    ok: true,
    deviceId,
    farmId: farmIdToUse,
    installLocation: installLocation ?? null,
  });
}
