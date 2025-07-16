import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import Papa from "papaparse";

// Updated interfaces to match Arduino data structure
interface ArduinoSensorReading {
  scu_id: string;
  moisture: number; // Overall moisture reading
  moisture1: number; // Individual moisture sensors
  moisture2: number;
  moisture3: number;
  moisture4: number;
  humidity: number; // Humidity reading
  temperature: number;
  lipVoltage: number; // LiPo battery voltage (was battery1)
  rtcBattery: number; // RTC battery voltage (was battery2)
  dataPoints: number; // Number of data points collected
  timestamp: string; // ISO timestamp
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
  deviceId: string; // Mapped from scu_id
  userId: string; // Added from device registration
  moisture: number; // Overall moisture reading
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  humidity: number; // Humidity reading
  temperature: number;
  lipVoltage: number; // Updated field name
  rtcBattery: number; // Updated field name
  dataPoints: number; // New field
  timestamp: Date;
  createdAt: Date;
  rawTimestamp: string; // Original timestamp string
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
    console.log("📤 CSV Upload request received");

    const formData = await request.formData();
    const deviceId = formData.get("deviceId") as string;
    const apiKey = formData.get("apiKey") as string;
    const csvFile = formData.get("csvFile") as File;

    // Validation
    if (!deviceId || !apiKey || !csvFile) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing required fields: deviceId, apiKey, or csvFile",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log(`📱 Processing upload for device: ${deviceId}`);
    console.log(`📁 CSV file size: ${csvFile.size} bytes`);

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
        latitude: 37.3541, // Default coordinates (Santa Clara area)
        longitude: -121.9552,
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
      // 🔐 STEP 2: Device exists - verify API key matches
      if (device.apiKey !== apiKey) {
        console.log(`❌ API key mismatch for device: ${deviceId}`);
        const errorResponse: ErrorResponse = {
          success: false,
          error: "Invalid API key for this device",
        };
        return NextResponse.json(errorResponse, { status: 401 });
      }
      console.log(
        `✅ Device authenticated: ${deviceId} (User: ${device.userId})`
      );
    }

    // 📊 STEP 3: Parse CSV data (always succeeds)
    const csvText = await csvFile.text();
    console.log(`📄 CSV content preview: ${csvText.substring(0, 200)}...`);

    // Parse CSV with updated structure and proper typing
    const parseResult = Papa.parse<ArduinoSensorReading>(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter: ",",
      transformHeader: (header: string): string => header.trim(), // Clean headers
    });

    if (parseResult.errors.length > 0) {
      console.log("❌ CSV parsing errors:", parseResult.errors);
      const errorResponse: ErrorResponse = {
        success: false,
        error: `CSV parsing failed: ${parseResult.errors[0].message}`,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const csvData = parseResult.data;
    console.log(`📊 Parsed ${csvData.length} rows from CSV`);

    if (csvData.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "CSV file contains no valid data rows",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate required Arduino fields
    const requiredFields: (keyof ArduinoSensorReading)[] = [
      "scu_id",
      "moisture",
      "moisture1",
      "moisture2",
      "moisture3",
      "moisture4",
      "humidity",
      "temperature",
      "lipVoltage",
      "rtcBattery",
      "dataPoints",
      "timestamp",
    ];

    const firstRow = csvData[0];
    const missingFields = requiredFields.filter(
      (field) => !(field in firstRow)
    );

    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(", ")}`);
      const errorResponse: ErrorResponse = {
        success: false,
        error: `Missing required CSV columns: ${missingFields.join(", ")}`,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 💾 STEP 4: Convert Arduino data to database format
    const sensorReadings: DatabaseSensorReading[] = csvData.map(
      (row: ArduinoSensorReading): DatabaseSensorReading => {
        const timestamp = new Date(row.timestamp);

        return {
          deviceId: deviceId, // Use the authenticated deviceId, not scu_id from CSV
          userId: device.userId, // 🎯 Could be "UNASSIGNED" or actual user ID
          moisture: Number(row.moisture) || 0,
          moisture1: Number(row.moisture1) || 0,
          moisture2: Number(row.moisture2) || 0,
          moisture3: Number(row.moisture3) || 0,
          moisture4: Number(row.moisture4) || 0,
          humidity: Number(row.humidity) || 0,
          temperature: Number(row.temperature) || 0,
          lipVoltage: Number(row.lipVoltage) || 0,
          rtcBattery: Number(row.rtcBattery) || 0,
          dataPoints: Number(row.dataPoints) || 0,
          timestamp: timestamp,
          createdAt: new Date(),
          rawTimestamp: row.timestamp,
        };
      }
    );

    // 💾 STEP 5: Insert sensor readings into database (always succeeds)
    console.log(`💾 Inserting ${sensorReadings.length} sensor readings...`);
    const insertResult = await db
      .collection("sensor_readings")
      .insertMany(sensorReadings);
    console.log(`✅ Inserted ${insertResult.insertedCount} sensor readings`);

    // 🔄 STEP 6: Update device status
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

    // 📊 STEP 7: Return appropriate response
    const isUnassigned = device.userId === "UNASSIGNED";

    const successResponse: ApiResponse = {
      success: true,
      message: isUnassigned
        ? "Data uploaded successfully. Device is available for user claiming."
        : "CSV data uploaded successfully",
      deviceId: deviceId,
      recordsProcessed: insertResult.insertedCount,
      deviceStatus: isUnassigned ? "unclaimed" : "claimed",
      assignedTo: isUnassigned ? null : device.userId,
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Error processing CSV upload:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: `Upload failed: ${errorMessage}`,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(): Promise<
  NextResponse<{ message: string; example: ArduinoSensorReading }>
> {
  return NextResponse.json({
    message: "CSV Upload endpoint - POST method required",
    example: {
      scu_id: "sensor123",
      moisture: 30.0,
      moisture1: 1856.1,
      moisture2: 4095.0,
      moisture3: 1465.2,
      moisture4: 4095.0,
      humidity: 19.78,
      temperature: 19.78,
      lipVoltage: 3.93,
      rtcBattery: 12.85,
      dataPoints: 10,
      timestamp: "2025-07-10T03:15:29Z",
    },
  });
}
