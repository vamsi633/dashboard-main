import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

interface Body {
  currentPassword?: string; // required if user already has a password
  newPassword: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const { currentPassword, newPassword }: Body = await req.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("epiciot");
    const users = db.collection("users");

    // Look up by ObjectId (NextAuth adapter stores _id as ObjectId)
    let userDoc = await users.findOne<{ _id: ObjectId; passwordHash?: string }>(
      { _id: new ObjectId(session.user.id) }
    );

    if (!userDoc) {
      // Some setups store id as string; fallback attempt
      userDoc = await users.findOne<{ _id: ObjectId; passwordHash?: string }>(
        // @ts-expect-error: fallback for string ids
        { _id: session.user.id }
      );
    }

    if (!userDoc) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // If the user has an existing password, verify it first
    if (userDoc.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: "Current password required" },
          { status: 400 }
        );
      }
      const ok = await bcrypt.compare(currentPassword, userDoc.passwordHash);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await users.updateOne(
      { _id: userDoc._id },
      { $set: { passwordHash: newHash, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, message: "Password updated" });
  } catch (e) {
    console.error("Change password error:", e);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 }
    );
  }
}
