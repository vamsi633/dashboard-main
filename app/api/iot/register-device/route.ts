// app/api/iot/register-device/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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
  userId: string; // UNASSIGNED by default (claim later)
  apiKey: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt?: Date;
  status: "auto-registered" | "registered" | "claimed";
  currentReadings: null; // stays null here (ingestion fills it)
}

interface ApiResponse {
  success: boolean;
  message: string;
  deviceId?: string;
  apiKey?: string;
  insertedId?: string;
  deviceStatus?: "unclaimed" | "claimed";
  assignedTo?: string | null;
  error?: string;
}

/** ————— POST: manual/admin provisioning ————— */
export async function POST(request: NextRequest) {
  console.log("🆕 Register Device: request received");

  try {
    // Parse & validate
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
    const collection = db.collection<DeviceDocument>("iot_devices"); // ✅ underscore, consistent

    // Prevent duplicates (keep behavior consistent with upload-json flow)
    const existing = await collection.findOne({ deviceId: cleanDeviceId });

    if (existing) {
      // If it already exists and is claimed, tell caller who owns it
      const isClaimed =
        existing.userId && existing.userId !== "UNASSIGNED" ? true : false;

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: isClaimed
            ? `Device "${cleanDeviceId}" is already registered and claimed.`
            : `Device "${cleanDeviceId}" is already registered.`,
          message: "Device already exists",
          deviceId: cleanDeviceId,
          deviceStatus: isClaimed ? "claimed" : "unclaimed",
          assignedTo: isClaimed ? existing.userId : null,
        },
        { status: 409 }
      );
    }

    // Generate an API key if not provided (same pattern)
    const generatedApiKey = apiKey || `key_${cleanDeviceId}_${Date.now()}`;

    // Insert with UNASSIGNED status to mirror upload-json behavior
    const doc: DeviceDocument = {
      deviceId: cleanDeviceId,
      name: name.trim(),
      location: location.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      apiKey: generatedApiKey,
      userId: "UNASSIGNED", // 🎯 claimable later
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
      status: "auto-registered", // same as upload-json path
      currentReadings: null,
    };

    const result = await collection.insertOne(doc);

    console.log("✅ Register Device: inserted", {
      deviceId: cleanDeviceId,
      insertedId: result.insertedId?.toString?.(),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message:
        "Device registered successfully. It is currently UNASSIGNED and ready to be claimed.",
      deviceId: cleanDeviceId,
      apiKey: generatedApiKey,
      insertedId: result.insertedId.toString(),
      deviceStatus: "unclaimed",
      assignedTo: null,
    });
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

/** ————— Optional quick GET for smoke test ————— */
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
