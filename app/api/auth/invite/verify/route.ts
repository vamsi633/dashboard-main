// app/api/auth/invite/verify/route.ts
import { NextResponse } from "next/server";
import { verifyInvite } from "@/lib/invites";

export async function POST(req: Request) {
  const { token, email } = await req.json();
  if (!token || !email) {
    return NextResponse.json(
      { ok: false, error: "Missing token or email" },
      { status: 400 }
    );
  }

  const invite = await verifyInvite(token, email);
  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired invite" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      email: invite.email,
      expiresAt: invite.expiresAt,
      role: invite.role ?? "user",
      inviteId: invite._id.toString(),
    },
  });
}
