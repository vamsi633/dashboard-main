export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { redirect } from "next/navigation";
import { verifyInvite } from "@/lib/invites";
import RegisterClient from "./register.client";

export default async function InviteRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp?.token ?? "").trim();
  const email = (sp?.email ?? "").trim().toLowerCase();

  if (!token || !email) redirect("/auth/error?error=InviteLinkInvalid");

  const invite = await verifyInvite(token, email);
  if (!invite) redirect("/auth/error?error=InviteNotValid");

  return <RegisterClient token={token} email={email} />;
}
