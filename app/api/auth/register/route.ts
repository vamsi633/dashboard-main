import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name }: RegisterBody = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    const emailNorm = email.toLowerCase().trim();
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("epiciot");
    const users = db.collection("users");

    const existing = await users.findOne({ email: emailNorm });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const doc = {
      email: emailNorm,
      name: name?.trim() || emailNorm.split("@")[0],
      image: null,
      emailVerified: null,
      createdAt: now,
      updatedAt: now,
      // custom field for credentials auth
      passwordHash,
    };

    const result = await users.insertOne(doc);

    return NextResponse.json({
      success: true,
      userId: result.insertedId,
      message: "Registration successful. You can now sign in.",
    });
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
