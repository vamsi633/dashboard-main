// app/api/test/route.ts - Simple test endpoint
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API is working!",
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "POST method works!",
    timestamp: new Date().toISOString(),
  });
}
