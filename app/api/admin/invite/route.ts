// app/api/admin/invite/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createInvite } from "@/lib/invites";
import { sendInviteEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Optional GET so hitting this in the browser gives instructions */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message:
        "POST to this endpoint with JSON { email: string, expiresInDays?: number } as an admin.",
      example: {
        email: "new.user@example.com",
        expiresInDays: 7,
      },
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  // 1) AuthZ: admin only
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Parse & validate input
  let email = "";
  let expiresInDays: number | undefined;

  try {
    const body = (await req.json()) as {
      email?: string;
      expiresInDays?: number;
      role?: "admin" | "user";
    };

    email = (body.email || "").trim().toLowerCase();
    expiresInDays = body.expiresInDays;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3) Create invite record
  const { token, expiresAt, role } = await createInvite({
    email,
    createdBy: session.user.id, // Mongo user id from session
    expiresInDays,
    role: "user", // or body.role if you later allow admin invites
  });

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://dashboard-main-nu.vercel.app";

  const inviteUrl = `${base}/auth/invite?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(email)}`;

  // 4) Send email through cPanel SMTP
  try {
    await sendInviteEmail(email, inviteUrl);
  } catch (err) {
    console.error("Email send failed:", err);
    // For local testing, also return the URL so you can click it manually
    return NextResponse.json(
      {
        ok: false,
        error: "Invite created but failed to send email.",
        inviteUrl,
      },
      { status: 500 }
    );
  }

  // 5) Success response (still return URL so you can click it in dev)
  return NextResponse.json(
    {
      ok: true,
      email,
      role,
      expiresAt,
      inviteUrl,
      sent: true,
    },
    { status: 201 }
  );
}
