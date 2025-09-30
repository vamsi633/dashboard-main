// app/api/dashboard/devices/route.ts - Updated for Arduino data structure
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Document as MongoDocument } from "mongodb";

// Updated interfaces to match Arduino data structure
interface IoTDevice extends MongoDocument {
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

// ...imports stay the same...

export async function GET(): Promise<
  NextResponse<ApiResponse | ErrorResponse>
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("epiciot");
    const email = session.user.email.toLowerCase();

    // ✅ 1) Broaden device lookup to handle old records
    const devices = await db
      .collection<IoTDevice>("iot_devices")
      .find({
        $or: [
          { userId: session.user.id }, // new/normal path
          { claimedBy: email }, // older devices linked by email
        ],
      })
      .toArray();

    const boxesWithReadings: BoxData[] = [];

    for (const device of devices) {
      // ✅ 2) Do NOT filter readings by userId (legacy records may carry old userId)
      const readings = await db
        .collection<SensorReading>("sensor_readings")
        .find({ deviceId: device.deviceId }) // <- only by deviceId
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();

      const currentReading = readings[0];

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
              moisture: currentReading.moisture || 0,
              moisture1: currentReading.moisture1 || 0,
              moisture2: currentReading.moisture2 || 0,
              moisture3: currentReading.moisture3 || 0,
              moisture4: currentReading.moisture4 || 0,
              humidity: currentReading.humidity || 0,
              temperature: currentReading.temperature || 0,
              lipVoltage: currentReading.lipVoltage || 0,
              rtcBattery: currentReading.rtcBattery || 0,
              dataPoints: currentReading.dataPoints || 0,
            }
          : null,
        readings: readings.map(
          (reading): Reading => ({
            moisture: reading.moisture || 0,
            moisture1: reading.moisture1 || 0,
            moisture2: reading.moisture2 || 0,
            moisture3: reading.moisture3 || 0,
            moisture4: reading.moisture4 || 0,
            humidity: reading.humidity || 0,
            temperature: reading.temperature || 0,
            lipVoltage: reading.lipVoltage || 0,
            rtcBattery: reading.rtcBattery || 0,
            dataPoints: reading.dataPoints || 0,
            timestamp: reading.timestamp.toISOString(),
          })
        ),
      };

      boxesWithReadings.push(boxData);
    }

    return NextResponse.json({ success: true, boxes: boxesWithReadings });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Error fetching dashboard devices:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
