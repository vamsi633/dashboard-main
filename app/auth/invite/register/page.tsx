// app/auth/invite/register/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { redirect } from "next/navigation";
import { verifyInvite } from "@/lib/invites";
import RegisterClient from "./register.client";

type SP = { token?: string; email?: string };

export default async function InviteRegisterPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const token = (sp?.token ?? "").trim();
  const email = (sp?.email ?? "").trim().toLowerCase();

  if (!token || !email) {
    redirect("/auth/error?error=InviteLinkInvalid");
  }

  const invite = await verifyInvite(token, email);
  if (!invite) {
    redirect("/auth/error?error=InviteNotValid");
  }

  // Server validated: render client form (email is read-only)
  return <RegisterClient token={token} email={email} />;
}
