// app/api/iot/register-device/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateClaimToken } from "@/lib/claimToken";

/** ————— Types aligned with /api/upload-json ————— */

interface RegisterDeviceRequest {
  deviceId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  apiKey?: string;
}

interface DeviceDocument {
  deviceId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  userId: string; // "UNASSIGNED" until claimed
  apiKey: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt?: Date;
  status: "auto-registered" | "registered" | "claimed";
  currentReadings: null;

  // ✅ NFC claim support
  claimToken?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  deviceId?: string;
  apiKey?: string;
  insertedId?: string;
  deviceStatus?: "unclaimed" | "claimed";
  assignedTo?: string | null;

  // ✅ return token for provisioning tools (admin / flutter admin mode)
  claimToken?: string;

  error?: string;
}

export async function POST(request: NextRequest) {
  console.log("🆕 Register Device: request received");

  try {
    const body: RegisterDeviceRequest = await request.json();
    const { deviceId, name, location, latitude, longitude, apiKey } = body;

    if (
      !deviceId?.trim() ||
      !name?.trim() ||
      !location?.trim() ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            "Missing required fields: deviceId, name, location, latitude, longitude",
          message: "Validation failed",
        },
        { status: 400 }
      );
    }

    const cleanDeviceId = deviceId.trim();

    const client = await clientPromise;
    const db = client.db("epiciot");
    const collection = db.collection<DeviceDocument>("iot_devices");

    const existing = await collection.findOne({ deviceId: cleanDeviceId });

    // ---------------- Existing device path ----------------
    if (existing) {
      const isClaimed = !!existing.userId && existing.userId !== "UNASSIGNED";

      if (isClaimed) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: `Device "${cleanDeviceId}" is already registered and claimed.`,
            message: "Device already exists",
            deviceId: cleanDeviceId,
            deviceStatus: "claimed",
            assignedTo: existing.userId ?? null,
          },
          { status: 409 }
        );
      }

      // ✅ unclaimed: ensure claimToken exists (backfill)
      let tokenToReturn = existing.claimToken;

      if (!tokenToReturn) {
        tokenToReturn = generateClaimToken();
        await collection.updateOne(
          { deviceId: cleanDeviceId },
          { $set: { claimToken: tokenToReturn, updatedAt: new Date() } }
        );
      }

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message:
            "Device already exists (unclaimed). Ready for NFC provisioning / claiming.",
          deviceId: cleanDeviceId,
          apiKey: existing.apiKey,
          deviceStatus: "unclaimed",
          assignedTo: null,
          claimToken: tokenToReturn, // ✅ important
        },
        { status: 200 }
      );
    }

    // ---------------- New device insert path ----------------
    const generatedApiKey = apiKey || `key_${cleanDeviceId}_${Date.now()}`;
    const claimToken = generateClaimToken();

    const doc: DeviceDocument = {
      deviceId: cleanDeviceId,
      name: name.trim(),
      location: location.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      apiKey: generatedApiKey,
      userId: "UNASSIGNED",
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
      status: "auto-registered",
      currentReadings: null,
      claimToken, // ✅ Step 0
    };

    const result = await collection.insertOne(doc);

    console.log("✅ Register Device: inserted", {
      deviceId: cleanDeviceId,
      insertedId: result.insertedId?.toString?.(),
    });

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message:
          "Device registered successfully. It is UNASSIGNED and ready to be claimed.",
        deviceId: cleanDeviceId,
        apiKey: generatedApiKey,
        insertedId: result.insertedId.toString(),
        deviceStatus: "unclaimed",
        assignedTo: null,
        claimToken, // ✅ return for provisioning
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Register Device error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Failed to register device",
        message: `Register error: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Register Device endpoint - POST required",
    example: {
      deviceId: "SU4_250719_154003",
      name: "Field Node 01",
      location: "Orchard A - North",
      latitude: 37.3541,
      longitude: -121.9552,
      apiKey: "optional-custom-key",
    } as RegisterDeviceRequest,
  });
}
