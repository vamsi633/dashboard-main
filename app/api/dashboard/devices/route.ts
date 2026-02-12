// app/api/dashboard/devices/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import type { Document as MongoDocument } from "mongodb";

interface IoTDevice extends MongoDocument {
  deviceId: string;
  name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isOnline?: boolean;
  lastSeen?: string;

  userId?: string;
  claimedBy?: string;

  farmId?: string; // string form of farm _id
  apiKey?: string;
  createdAt?: Date;
}

interface SensorReading extends MongoDocument {
  deviceId: string;
  userId?: string;
  timestamp: Date;
  moisture: number;
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  humidity: number;
  temperature: number;
  lipVoltage: number;
  rtcBattery: number;
  dataPoints: number;
  createdAt?: Date;
  rawTimestamp?: string;
}

interface CurrentReadings {
  moisture: number;
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  humidity: number;
  temperature: number;
  lipVoltage: number;
  rtcBattery: number;
  dataPoints: number;
}

interface Reading {
  moisture: number;
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  humidity: number;
  temperature: number;
  lipVoltage: number;
  rtcBattery: number;
  dataPoints: number;
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

  farmId?: string | null;
  farmName?: string | null;

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

type FarmDoc = {
  _id: ObjectId;
  name: string;
  ownerId: string;
};

export async function GET(
  req: Request
): Promise<NextResponse<ApiResponse | ErrorResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const farmIdParam = url.searchParams.get("farmId")?.trim() || "";

    const client = await clientPromise;
    const db = client.db("epiciot");

    const email = session.user.email.toLowerCase();
    const isAdmin = session.user.role === "admin";

    const baseQuery: Record<string, unknown> = isAdmin
      ? {}
      : {
          $or: [{ userId: session.user.id }, { claimedBy: email }],
        };

    // Optional farm filter:
    // farmId="__all__" => no filter
    // farmId="__none__" => devices with no farmId
    // farmId="<id>" => devices in that farm
    let farmFilter: Record<string, unknown> = {};
    if (farmIdParam && farmIdParam !== "__all__") {
      if (farmIdParam === "__none__") {
        farmFilter = {
          $or: [
            { farmId: { $exists: false } },
            { farmId: null },
            { farmId: "" },
          ],
        };
      } else {
        farmFilter = { farmId: farmIdParam };
      }
    }

    const query = { ...baseQuery, ...farmFilter };

    const devices = await db
      .collection<IoTDevice>("iot_devices")
      .find(query)
      .toArray();

    // Fetch farm names for devices with farmId
    const farmObjectIds = Array.from(
      new Set(
        devices
          .map((d) => (typeof d.farmId === "string" ? d.farmId : ""))
          .filter((id) => id && ObjectId.isValid(id))
      )
    ).map((id) => new ObjectId(id));

    const farmNameById = new Map<string, string>();

    if (farmObjectIds.length > 0) {
      const farmsCollection = db.collection<FarmDoc>("farms");

      const farmsQuery: Record<string, unknown> = isAdmin
        ? { _id: { $in: farmObjectIds } }
        : { _id: { $in: farmObjectIds }, ownerId: session.user.id };

      const farms = await farmsCollection.find(farmsQuery).toArray();
      for (const f of farms) {
        farmNameById.set(f._id.toHexString(), f.name);
      }
    }

    const boxesWithReadings: BoxData[] = [];

    for (const device of devices) {
      const readings = await db
        .collection<SensorReading>("sensor_readings")
        .find({ deviceId: device.deviceId })
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();

      const currentReading = readings[0];

      const farmId = typeof device.farmId === "string" ? device.farmId : null;
      const farmName = farmId ? farmNameById.get(farmId) ?? null : null;

      boxesWithReadings.push({
        box_id: device.deviceId,
        name: device.name || device.deviceId,
        location: device.location || "Unknown Location",
        latitude: device.latitude || 0,
        longitude: device.longitude || 0,
        isOnline: device.isOnline || false,
        lastSeen: device.lastSeen || new Date().toISOString(),

        farmId,
        farmName,

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

        readings: readings.map((r) => ({
          moisture: r.moisture || 0,
          moisture1: r.moisture1 || 0,
          moisture2: r.moisture2 || 0,
          moisture3: r.moisture3 || 0,
          moisture4: r.moisture4 || 0,
          humidity: r.humidity || 0,
          temperature: r.temperature || 0,
          lipVoltage: r.lipVoltage || 0,
          rtcBattery: r.rtcBattery || 0,
          dataPoints: r.dataPoints || 0,
          timestamp: r.timestamp.toISOString(),
        })),
      });
    }

    return NextResponse.json({ success: true, boxes: boxesWithReadings });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Error fetching dashboard devices:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
