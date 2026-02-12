// app/api/devices/[id]/config/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const DB_NAME = process.env.MONGODB_DB ?? "epiciot";

// ⚠️ Next.js dynamic route params MUST be awaited
type RouteParams = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: RouteParams }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deviceId = id; // deviceId is a STRING (not ObjectId)

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const devices = db.collection("iot_devices");

  // find device by deviceId (string)
  const device = await devices.findOne({ deviceId });

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const currentUserId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const isOwner = device.userId === currentUserId;

  // Only admin or owner can update device config
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Validate config input if needed
  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json(
      { error: "Invalid config payload" },
      { status: 400 }
    );
  }

  await devices.updateOne(
    { deviceId },
    {
      $set: {
        config: body.config,
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}
