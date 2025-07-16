import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Types for the request body
interface RegisterDeviceRequest {
  deviceId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  apiKey?: string;
}

// Types for the device document
interface DeviceDocument {
  deviceId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  apiKey: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  currentReadings: null;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body with proper typing
    const body: RegisterDeviceRequest = await request.json();
    const { deviceId, name, location, latitude, longitude, apiKey } = body;

    // Validate required fields
    if (
      !deviceId ||
      !name ||
      !location ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: deviceId, name, location, latitude, longitude",
        },
        { status: 400 }
      );
    }

    // Connect to database - SAME PATTERN AS UPLOAD-CSV
    const client = await clientPromise;
    const db = client.db("epiciot");
    const collection = db.collection("iot-devices");

    // Check if device already exists
    const existingDevice = await collection.findOne({ deviceId });
    if (existingDevice) {
      return NextResponse.json(
        {
          success: false,
          error: "Device already registered",
        },
        { status: 409 }
      );
    }

    // Generate API key if not provided
    const generatedApiKey = apiKey || `key_${deviceId}_${Date.now()}`;

    // Create device document with proper typing
    const deviceDocument: DeviceDocument = {
      deviceId,
      name,
      location,
      latitude: Number(latitude),
      longitude: Number(longitude),
      apiKey: generatedApiKey,
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
      currentReadings: null,
    };

    // Insert device into database
    const result = await collection.insertOne(deviceDocument);

    return NextResponse.json({
      success: true,
      message: "Device registered successfully",
      deviceId,
      apiKey: generatedApiKey,
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error registering device:", error);

    // Proper error typing instead of 'any'
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to register device",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
