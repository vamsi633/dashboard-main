// app/api/dashboard/devices/route.ts - Updated for Arduino data structure
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 
import { WithId, Document } from "mongodb";

// Updated interfaces to match Arduino data structure
interface IoTDevice extends Document {
  deviceId: string;
  name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isOnline?: boolean;
  lastSeen?: string;
  userId: string;
  apiKey?: string;
  createdAt?: Date;
}

interface SensorReading extends Document {
  deviceId: string;
  userId: string;
  timestamp: Date;
  moisture: number; // Overall moisture reading (NEW)
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  humidity: number; // Humidity reading
  temperature: number;
  lipVoltage: number; // LiPo battery voltage (was battery1)
  rtcBattery: number; // RTC battery voltage (was battery2)
  dataPoints: number; // Number of data points (NEW)
  createdAt?: Date;
  rawTimestamp?: string;
}

interface CurrentReadings {
  moisture: number; // Overall moisture reading (NEW)
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  humidity: number; // Humidity reading
  temperature: number;
  lipVoltage: number; // Updated from battery1
  rtcBattery: number; // Updated from battery2
  dataPoints: number; // NEW field
}

interface Reading {
  moisture: number; // Overall moisture reading (NEW)
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  humidity: number; // Humidity reading
  temperature: number;
  lipVoltage: number; // Updated from battery1
  rtcBattery: number; // Updated from battery2
  dataPoints: number; // NEW field
  timestamp: string;
}

interface BoxData {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen: string;
  currentReadings: CurrentReadings | null;
  readings: Reading[];
}

interface ApiResponse {
  success: boolean;
  boxes: BoxData[];
}

interface ErrorResponse {
  success: false;
  error: string;
}

export async function GET(): Promise<
  NextResponse<ApiResponse | ErrorResponse>
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Authentication required",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    console.log("📊 Dashboard devices request started");
    console.log("👤 Session found for user:", session.user.email);

    const client = await clientPromise;
    const db = client.db("epiciot");

    console.log("🔌 Connecting to MongoDB...");

    // Get all devices for this user
    console.log("📱 Fetching devices...");
    const devices: WithId<IoTDevice>[] = await db
      .collection<IoTDevice>("iot_devices")
      .find({ userId: session.user.id })
      .toArray();

    console.log(`📱 Found devices: ${devices.length}`);

    const boxesWithReadings: BoxData[] = [];

    for (const device of devices) {
      console.log(`🔍 Processing device: ${device.deviceId}`);

      // Get recent readings for this device (last 100 readings)
      const readings: WithId<SensorReading>[] = await db
        .collection<SensorReading>("sensor_readings")
        .find({
          deviceId: device.deviceId,
          userId: session.user.id,
        })
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();

      console.log(`📊 Readings for ${device.deviceId}: ${readings.length}`);

      // Get current reading (most recent)
      const currentReading = readings[0];

      // Use actual coordinates from database
      const boxData: BoxData = {
        box_id: device.deviceId,
        name: device.name || device.deviceId,
        location: device.location || "Unknown Location",
        latitude: device.latitude || 0,
        longitude: device.longitude || 0,
        isOnline: device.isOnline || false,
        lastSeen: device.lastSeen || new Date().toISOString(),
        currentReadings: currentReading
          ? {
              moisture: currentReading.moisture || 0, // NEW field
              moisture1: currentReading.moisture1 || 0,
              moisture2: currentReading.moisture2 || 0,
              moisture3: currentReading.moisture3 || 0,
              moisture4: currentReading.moisture4 || 0,
              humidity: currentReading.humidity || 0, // Humidity field
              temperature: currentReading.temperature || 0,
              lipVoltage: currentReading.lipVoltage || 0, // Updated from battery1
              rtcBattery: currentReading.rtcBattery || 0, // Updated from battery2
              dataPoints: currentReading.dataPoints || 0, // NEW field
            }
          : null,
        readings: readings.map(
          (reading): Reading => ({
            moisture: reading.moisture || 0, // NEW field
            moisture1: reading.moisture1 || 0,
            moisture2: reading.moisture2 || 0,
            moisture3: reading.moisture3 || 0,
            moisture4: reading.moisture4 || 0,
            humidity: reading.humidity || 0, // Humidity field
            temperature: reading.temperature || 0,
            lipVoltage: reading.lipVoltage || 0, // Updated from battery1
            rtcBattery: reading.rtcBattery || 0, // Updated from battery2
            dataPoints: reading.dataPoints || 0, // NEW field
            timestamp: reading.timestamp.toISOString(),
          })
        ),
      };

      // Debug coordinates
      console.log(`📍 Device ${device.deviceId} coordinates:`, {
        lat: device.latitude,
        lng: device.longitude,
        hasValidCoords: !!(
          device.latitude &&
          device.longitude &&
          device.latitude !== 0 &&
          device.longitude !== 0
        ),
      });

      boxesWithReadings.push(boxData);
    }

    console.log("✅ Dashboard devices response ready");

    const successResponse: ApiResponse = {
      success: true,
      boxes: boxesWithReadings,
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Error fetching dashboard devices:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
