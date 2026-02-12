// app/api/devices/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

interface ClaimDeviceRequest {
  deviceId: string;
  farmId: string;
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
    // 1) Auth
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === "admin";

    // 2) Body
    const body = (await request.json()) as Partial<ClaimDeviceRequest>;
    const deviceId = (body.deviceId ?? "").trim();
    const farmId = (body.farmId ?? "").trim();

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "Device ID is required" },
        { status: 400 }
      );
    }

    if (!farmId) {
      return NextResponse.json(
        { success: false, error: "Farm ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(farmId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Farm ID" },
        { status: 400 }
      );
    }

    // 3) DB
    const client = await clientPromise;
    const db = client.db("epiciot");

    const devicesCollection = db.collection("iot_devices");
    const usersCollection = db.collection("users");
    const farmsCollection = db.collection("farms"); // assumes your farms are stored here

    const currentUserId = session.user.id;

    // 4) Validate farm ownership
    // Admin note: you can decide if admins can claim into ANY farm.
    // For now: require the farm to belong to the user even for admin.
    const farm = await farmsCollection.findOne({
      _id: new ObjectId(farmId),
      ownerId: currentUserId,
    });

    if (!farm) {
      return NextResponse.json(
        {
          success: false,
          error: "Farm not found or you do not own this farm.",
        },
        { status: 403 }
      );
    }

    // 5) Find device
    const device = await devicesCollection.findOne({ deviceId });

    if (!device) {
      return NextResponse.json(
        {
          success: false,
          error: `Device "${deviceId}" does not exist in our system. Please verify the device ID.`,
        },
        { status: 404 }
      );
    }

    // 6) Assignment logic (same idea as your current code)
    const isUnassigned =
      !device.userId ||
      device.userId === "UNASSIGNED" ||
      device.userId === null;

    const isOwnedByCurrent = device.userId === currentUserId;
    const isOwnedByOther = !isUnassigned && !isOwnedByCurrent;

    if (isOwnedByCurrent) {
      return NextResponse.json(
        {
          success: false,
          error: `You have already added device "${deviceId}" to your dashboard.`,
        },
        { status: 409 }
      );
    }

    if (isOwnedByOther && !isAdmin) {
      try {
        let assignedUser = await usersCollection.findOne({
          _id: device.userId,
        });

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
            error: `Device "${deviceId}" is already registered with ${assignedUserInfo}. Contact support if this is incorrect.`,
          },
          { status: 409 }
        );
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: `Device "${deviceId}" is already registered with another user.`,
          },
          { status: 409 }
        );
      }
    }

    // 7) Claim update (atomic)
    const claimFilter = isUnassigned
      ? {
          deviceId,
          $or: [
            { userId: "UNASSIGNED" },
            { userId: null },
            { userId: { $exists: false } },
          ],
        }
      : {
          deviceId, // admin takeover path
        };

    const updateResult = await devicesCollection.updateOne(claimFilter, {
      $set: {
        userId: currentUserId,
        farmId, // ✅ NEW
        claimedAt: new Date(),
        claimedBy: session.user.email,
        updatedAt: new Date(),
        status: "claimed",
      },
    });

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Device was claimed or changed while you were submitting. Please try again or choose a different device.",
        },
        { status: 409 }
      );
    }

    // 8) Transfer readings (keep as-is)
    const sensorUpdateResult = await db
      .collection("sensor_readings")
      .updateMany(
        { deviceId },
        {
          $set: {
            userId: currentUserId,
            transferredAt: new Date(),
          },
        }
      );

    // 9) Response
    const updatedDevice = await devicesCollection.findOne({ deviceId });

    return NextResponse.json({
      success: true,
      message: `Device "${deviceId}" successfully added to your dashboard!`,
      device: {
        deviceId: updatedDevice?.deviceId || deviceId,
        name: updatedDevice?.name || deviceId,
        location: updatedDevice?.location || "Unknown Location",
        historicalReadings: sensorUpdateResult.modifiedCount,
        claimedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error claiming device:", error);
    return NextResponse.json(
      { success: false, error: "Failed to claim device. Please try again." },
      { status: 500 }
    );
  }
}

// Simple GET for testing
export async function GET(): Promise<
  NextResponse<{ message: string; timestamp: string }>
> {
  return NextResponse.json({
    message: "Device claiming API is working",
    timestamp: new Date().toISOString(),
  });
}
