// app/api/auth/invite/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { verifyInvite, markInviteUsed } from "@/lib/invites";
import { ObjectId } from "mongodb";

type Role = "admin" | "user";

interface UserDoc {
  _id: ObjectId;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  passwordHash?: string;
  role?: Role;
}

function dbName() {
  return process.env.MONGODB_DB ?? "epiciot";
}

function isMongoDupError(
  err: unknown
): err is { code: number; keyPattern?: Record<string, unknown> } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "number" &&
    (err as { code: number }).code === 11000
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      email?: string;
      name?: string;
      password?: string;
    };

    const token = (body.token ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const name = (body.name ?? "").trim();
    const password = body.password ?? "";

    if (!token || !email || !password) {
      return NextResponse.json(
        { ok: false, error: "Missing token, email, or password." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // 1) invite must be valid for THIS email
    const invite = await verifyInvite(token, email);
    if (!invite) {
      return NextResponse.json(
        { ok: false, error: "Invite not valid or expired." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName());
    const users = db.collection<UserDoc>("users");

    // 2) prevent duplicate email
    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 3) hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 4) create user
    const role: Role = invite.role ?? "user";
    const insert = await users.insertOne({
      _id: new ObjectId(),
      email,
      name: name || null,
      image: null,
      emailVerified: null,
      passwordHash,
      role,
    });

    // 5) mark invite used
    await markInviteUsed(invite._id);

    return NextResponse.json({
      ok: true,
      createdUserId: insert.insertedId.toHexString(),
      role,
      message: "Account created. You can now sign in with email and password.",
    });
  } catch (err: unknown) {
    if (isMongoDupError(err)) {
      return NextResponse.json(
        { ok: false, error: "Email is already registered." },
        { status: 409 }
      );
    }

    console.error("Invite register error:", err);
    return NextResponse.json(
      { ok: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
