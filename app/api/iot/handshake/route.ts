import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HandshakeRequest {
  uid?: string;
  baseStationId?: string;
}

interface BaseStationDocument {
  baseStationId: string;
  uid: string;
}

interface HandshakeResponse {
  success: boolean;
  message: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<HandshakeResponse>> {
  try {
    const body: HandshakeRequest = await request.json();

    const uid = (body.uid ?? "").trim();
    const baseStationId = (body.baseStationId ?? "").trim();

    if (!uid || !baseStationId) {
      return NextResponse.json(
        {
          success: false,
          message: "uid and baseStationId are required",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("epiciot");

    const baseStations = db.collection<BaseStationDocument>("base_stations");

    const station = await baseStations.findOne({
      uid,
      baseStationId,
    });

    if (!station) {
      return NextResponse.json(
        {
          success: false,
          message: "Handshake failed",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Handshake successful",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Handshake error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to process handshake",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Handshake endpoint is live. Use POST with uid and baseStationId.",
  });
}
