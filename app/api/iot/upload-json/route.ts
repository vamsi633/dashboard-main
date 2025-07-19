import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Interfaces for JSON upload
interface JsonUploadRequest {
  data: string; // CSV string
  deviceId?: string; // Optional separate deviceId
  apiKey?: string; // Optional separate apiKey
}

interface DeviceDocument {
  deviceId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  userId: string;
  apiKey: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  status: string;
  currentReadings: null;
}

interface DatabaseSensorReading {
  deviceId: string;
  userId: string;
  moisture: number; // avg_temperature (mapped to moisture for compatibility)
  moisture1: number; // avg_moisture1
  moisture2: number; // avg_moisture2
  moisture3: number; // avg_moisture3
  moisture4: number; // avg_moisture4
  humidity: number; // avg_humidity
  temperature: number; // avg_temperature
  lipVoltage: number; // avg_lipo_voltage
  rtcBattery: number; // avg_rtc_battery
  dataPoints: number; // Default value
  timestamp: Date;
  createdAt: Date;
  rawTimestamp: string;
  receivedAt?: Date; // received_at from Arduino
}

interface ApiResponse {
  success: boolean;
  message: string;
  deviceId?: string;
  recordsProcessed?: number;
  deviceStatus?: string;
  assignedTo?: string | null;
  error?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse | ErrorResponse>> {
  try {
    console.log("📤 JSON Upload request received");

    // Parse JSON request body
    const body: JsonUploadRequest = await request.json();

    if (!body.data) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing required field: data",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log(`📄 Data received: ${body.data.substring(0, 100)}...`);

    // Parse CSV string from JSON data field
    // Format: su_id,avg_humidity,avg_temperature,avg_moisture1,avg_moisture2,avg_moisture3,avg_moisture4,avg_lipo_voltage,avg_rtc_battery,timestamp,received_at
    const csvData = body.data.trim();
    const parts = csvData.split(",");

    if (parts.length < 10) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: `Invalid data format. Expected at least 10 fields, got ${parts.length}`,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Extract data from CSV string
    const deviceId = body.deviceId || parts[0].trim(); // su_id
    const avgHumidity = parseFloat(parts[1]) || 0; // avg_humidity
    const avgTemperature = parseFloat(parts[2]) || 0; // avg_temperature
    const avgMoisture1 = parseFloat(parts[3]) || 0; // avg_moisture1
    const avgMoisture2 = parseFloat(parts[4]) || 0; // avg_moisture2
    const avgMoisture3 = parseFloat(parts[5]) || 0; // avg_moisture3
    const avgMoisture4 = parseFloat(parts[6]) || 0; // avg_moisture4
    const avgLipoVoltage = parseFloat(parts[7]) || 0; // avg_lipo_voltage
    const avgRtcBattery = parseFloat(parts[8]) || 0; // avg_rtc_battery
    const timestampStr = parts[9]?.trim() || new Date().toISOString(); // timestamp
    const receivedAtStr = parts[10]?.trim(); // received_at (optional)

    // Generate API key if not provided
    const apiKey = body.apiKey || `key_${deviceId}_${Date.now()}`;

    console.log(`📱 Processing upload for device: ${deviceId}`);
    console.log(
      `📊 Data: temp=${avgTemperature}, humidity=${avgHumidity}, moisture=[${avgMoisture1},${avgMoisture2},${avgMoisture3},${avgMoisture4}]`
    );

    // Connect to database
    const client = await clientPromise;
    const db = client.db("epiciot");

    // 🆕 STEP 1: Check if device exists, auto-register if not
    let device = await db.collection<DeviceDocument>("iot_devices").findOne({
      deviceId: deviceId,
    });

    if (!device) {
      console.log(`🆕 Device not found, auto-registering: ${deviceId}`);

      // Auto-register new device with UNASSIGNED status
      const newDevice: DeviceDocument = {
        deviceId: deviceId,
        name: `Auto-registered ${deviceId}`,
        location: "Field Location - Auto-registered",
        latitude: 37.4221, // Campbell, CA coordinates
        longitude: -121.9624,
        userId: "UNASSIGNED", // 🎯 Available for later claiming
        apiKey: apiKey, // Store the API key Arduino is using
        isOnline: false,
        lastSeen: new Date(),
        createdAt: new Date(),
        status: "auto-registered",
        currentReadings: null,
      };

      await db.collection("iot_devices").insertOne(newDevice);

      // Fetch the device again to get the _id field that MongoDB added
      device = await db.collection<DeviceDocument>("iot_devices").findOne({
        deviceId: deviceId,
      });

      if (!device) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: "Failed to auto-register device",
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }

      console.log(
        `✅ Auto-registered device: ${deviceId} with userId: UNASSIGNED`
      );
    } else {
      console.log(`✅ Device found: ${deviceId} (User: ${device.userId})`);
    }

    // 📊 STEP 2: Create sensor reading
    const timestamp = new Date(timestampStr);
    const receivedAt = receivedAtStr ? new Date(receivedAtStr) : new Date();

    // Calculate overall moisture average for compatibility
    const overallMoisture =
      (avgMoisture1 + avgMoisture2 + avgMoisture3 + avgMoisture4) / 4;

    const sensorReading: DatabaseSensorReading = {
      deviceId: deviceId,
      userId: device.userId, // 🎯 Could be "UNASSIGNED" or actual user ID
      moisture: overallMoisture, // Overall moisture average
      moisture1: avgMoisture1, // Individual moisture sensors
      moisture2: avgMoisture2,
      moisture3: avgMoisture3,
      moisture4: avgMoisture4,
      humidity: avgHumidity, // Humidity reading
      temperature: avgTemperature, // Temperature reading
      lipVoltage: avgLipoVoltage, // LiPo battery voltage
      rtcBattery: avgRtcBattery, // RTC battery voltage
      dataPoints: 1, // Single data point for JSON uploads
      timestamp: timestamp,
      createdAt: new Date(),
      rawTimestamp: timestampStr,
      receivedAt: receivedAt,
    };

    // 💾 STEP 3: Insert sensor reading into database
    console.log(`💾 Inserting sensor reading...`);
    const insertResult = await db
      .collection("sensor_readings")
      .insertOne(sensorReading);
    console.log(
      `✅ Inserted sensor reading with ID: ${insertResult.insertedId}`
    );

    // 🔄 STEP 4: Update device status
    await db.collection("iot_devices").updateOne(
      { deviceId: deviceId },
      {
        $set: {
          lastSeen: new Date(),
          isOnline: true,
          lastUpload: new Date(),
        },
      }
    );

    console.log(`🔄 Updated device status for: ${deviceId}`);

    // 📊 STEP 5: Return appropriate response
    const isUnassigned = device.userId === "UNASSIGNED";

    const successResponse: ApiResponse = {
      success: true,
      message: isUnassigned
        ? "Data uploaded successfully. Device is available for user claiming."
        : "JSON data uploaded successfully",
      deviceId: deviceId,
      recordsProcessed: 1,
      deviceStatus: isUnassigned ? "unclaimed" : "claimed",
      assignedTo: isUnassigned ? null : device.userId,
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Error processing JSON upload:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: `JSON upload failed: ${errorMessage}`,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(): Promise<
  NextResponse<{ message: string; example: JsonUploadRequest }>
> {
  return NextResponse.json({
    message: "JSON Upload endpoint - POST method required",
    example: {
      data: "SU4_250719_154003,58.90,31.20,4001,4095,3982,3900,3.812,3.951,2025-07-19T15:40:03Z,2025-07-19T16:02:18Z",
      deviceId: "SU4_250719_154003", // Optional - can be extracted from data
      apiKey: "key_su4_2025", // Optional - will be generated if not provided
    },
  });
}
