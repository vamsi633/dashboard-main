export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markInviteUsed, verifyInvite } from "@/lib/invites";
import clientPromise from "@/lib/mongodb";
import { ObjectId, type Filter, type Document } from "mongodb";

export default async function ConsumeInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp?.token ?? "").trim();
  const emailParam = (sp?.email ?? "").trim().toLowerCase();

  if (!token || !emailParam) redirect("/auth/error?error=InviteLinkInvalid");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    redirect(`/auth/invite?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailParam)}`);

  const sessionEmail = session.user.email.toLowerCase();

  const invite = await verifyInvite(token, emailParam);
  if (!invite) redirect("/auth/error?error=InviteNotValid");
  if (sessionEmail !== emailParam) redirect("/auth/error?error=InviteEmailMismatch");

  await markInviteUsed(invite._id);

  if (invite.role && session.user?.id) {
    try {
      const db = (await clientPromise).db(process.env.MONGODB_DB ?? "epiciot");
      let filter: Filter<Document>;
      try {
        filter = { _id: new ObjectId(session.user.id) };
      } catch {
        filter = { _id: session.user.id as unknown as ObjectId };
      }
      await db.collection("users").updateOne(filter, { $set: { role: invite.role } });
    } catch {}
  }

  redirect("/");
}
