import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

interface ClaimDeviceRequest {
  deviceId: string;
}

interface ClaimResponse {
  success: boolean;
  message?: string;
  error?: string;
  device?: {
    deviceId: string;
    name: string;
    location: string;
    historicalReadings: number;
    claimedAt: string;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ClaimResponse>> {
  console.log("📞 Device claim request received");

  try {
    // Step 1: Authenticate user
    console.log("🔐 Checking user authentication...");
    const session = await getServerSession(authOptions);
    console.log("Session data:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    if (!session?.user?.id) {
      console.log("❌ Authentication failed - no session or user ID");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Step 2: Get device ID from request
    const body: ClaimDeviceRequest = await request.json();
    const { deviceId } = body;

    if (!deviceId?.trim()) {
      return NextResponse.json(
        { success: false, error: "Device ID is required" },
        { status: 400 }
      );
    }

    const cleanDeviceId = deviceId.trim();
    console.log(
      `🔍 User ${session.user.email} attempting to claim device: ${cleanDeviceId}`
    );

    // Step 3: Connect to database
    console.log("💾 Connecting to database...");
    const client = await clientPromise;
    const db = client.db("epiciot");
    const devicesCollection = db.collection("iot_devices");
    const usersCollection = db.collection("users");
    console.log("✅ Database connection established");

    // Step 4: Check if device exists in database
    console.log(`🔍 Looking for device: ${cleanDeviceId}`);
    const device = await devicesCollection.findOne({ deviceId: cleanDeviceId });
    console.log("Device lookup result:", {
      found: !!device,
      deviceId: device?.deviceId,
      userId: device?.userId,
      name: device?.name,
    });

    if (!device) {
      console.log(`❌ Device not found: ${cleanDeviceId}`);
      return NextResponse.json(
        {
          success: false,
          error: `Device "${cleanDeviceId}" does not exist in our system. Please verify the device ID.`,
        },
        { status: 404 }
      );
    }

    console.log(`✅ Device found: ${cleanDeviceId}`);
    console.log(`📋 Current device status: userId = "${device.userId}"`);

    // Step 5: 🔒 STRICT ASSIGNMENT CHECKS

    // Case A: Device already assigned to CURRENT user
    if (device.userId === session.user.id) {
      console.log(`⚠️ Device already owned by current user`);
      return NextResponse.json(
        {
          success: false,
          error: `You have already added device "${cleanDeviceId}" to your dashboard.`,
        },
        { status: 409 }
      );
    }

    // Case B: Device assigned to ANOTHER user
    if (
      device.userId &&
      device.userId !== "UNASSIGNED" &&
      device.userId !== null
    ) {
      console.log(`❌ Device assigned to another user: ${device.userId}`);

      // Get the other user's info for better error message
      try {
        // Try to find user by string ID first, then try ObjectId if needed
        let assignedUser = await usersCollection.findOne({
          _id: device.userId,
        });

        // If not found and userId looks like ObjectId, try with ObjectId
        if (!assignedUser && ObjectId.isValid(device.userId)) {
          assignedUser = await usersCollection.findOne({
            _id: new ObjectId(device.userId),
          });
        }

        const assignedUserInfo =
          assignedUser?.name || assignedUser?.email || "another user";

        return NextResponse.json(
          {
            success: false,
            error: `Device "${cleanDeviceId}" is already registered with ${assignedUserInfo}. Contact support if this is incorrect.`,
          },
          { status: 409 }
        );
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: `Device "${cleanDeviceId}" is already registered with another user.`,
          },
          { status: 409 }
        );
      }
    }

    // Case C: Device is UNASSIGNED - Safe to claim! ✅
    if (
      device.userId === "UNASSIGNED" ||
      device.userId === null ||
      device.userId === undefined
    ) {
      console.log(`✅ Device is available for claiming`);

      // Step 6: 🔄 ATOMIC ASSIGNMENT OPERATION
      // Use atomic update to prevent race conditions if multiple users try to claim simultaneously
      const updateResult = await devicesCollection.updateOne(
        {
          deviceId: cleanDeviceId,
          // Double-check it's still unassigned at time of update
          $or: [
            { userId: "UNASSIGNED" },
            { userId: null },
            { userId: { $exists: false } },
          ],
        },
        {
          $set: {
            userId: session.user.id,
            claimedAt: new Date(),
            claimedBy: session.user.email,
            updatedAt: new Date(),
            status: "claimed",
          },
        }
      );

      // Step 7: Check if update was successful
      if (updateResult.modifiedCount === 0) {
        console.log(
          `❌ Failed to claim device - may have been claimed by another user`
        );
        return NextResponse.json(
          {
            success: false,
            error:
              "Device was claimed by another user while you were submitting. Please try a different device.",
          },
          { status: 409 }
        );
      }

      // Step 8: 📊 Transfer ALL historical sensor data to the claiming user
      const sensorUpdateResult = await db
        .collection("sensor_readings")
        .updateMany(
          { deviceId: cleanDeviceId },
          {
            $set: {
              userId: session.user.id,
              transferredAt: new Date(),
            },
          }
        );

      console.log(`🎉 Device successfully claimed!`);
      console.log(`   Device: ${cleanDeviceId}`);
      console.log(`   New Owner: ${session.user.email} (${session.user.id})`);
      console.log(
        `   Historical readings transferred: ${sensorUpdateResult.modifiedCount}`
      );

      // Step 9: Get updated device info for response
      const updatedDevice = await devicesCollection.findOne({
        deviceId: cleanDeviceId,
      });

      return NextResponse.json({
        success: true,
        message: `Device "${cleanDeviceId}" successfully added to your dashboard!`,
        device: {
          deviceId: updatedDevice?.deviceId || cleanDeviceId,
          name: updatedDevice?.name || cleanDeviceId,
          location: updatedDevice?.location || "Unknown Location",
          historicalReadings: sensorUpdateResult.modifiedCount,
          claimedAt: new Date().toISOString(),
        },
      });
    }

    // Step 10: Fallback case (shouldn't reach here)
    console.log(`⚠️ Unexpected device state: ${device.userId}`);
    return NextResponse.json(
      {
        success: false,
        error: "Device is in an unexpected state. Please contact support.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("❌ Error claiming device:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to claim device. Please try again.",
      },
      { status: 500 }
    );
  }
}

// Add a simple GET method for testing
export async function GET(): Promise<
  NextResponse<{ message: string; timestamp: string }>
> {
  return NextResponse.json({
    message: "Device claiming API is working",
    timestamp: new Date().toISOString(),
  });
}
