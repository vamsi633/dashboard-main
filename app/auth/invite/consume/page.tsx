// app/auth/invite/consume/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markInviteUsed, verifyInvite } from "@/lib/invites";
import clientPromise from "@/lib/mongodb";
import { ObjectId, type Filter, type Document } from "mongodb";

/**
 * Finalizes an invite after Google OAuth:
 * - must have token & email in the URL
 * - must be signed in
 * - session.user.email must equal invite.email
 * - marks invite used
 * - (optional) applies invite.role to the user
 * - redirects to /dashboard
 */
export default async function ConsumeInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp?.token ?? "").trim();
  const emailParam = (sp?.email ?? "").trim().toLowerCase();

  if (!token || !emailParam) {
    redirect("/auth/error?error=InviteLinkInvalid");
  }

  // Must be signed in now (Google OAuth should have completed)
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    // Kick back to the invite landing so the user can press "Continue with Google"
    redirect(
      `/auth/invite?token=${encodeURIComponent(
        token
      )}&email=${encodeURIComponent(emailParam)}`
    );
  }

  const sessionEmail = session.user.email.toLowerCase();

  // Re-verify the invite against token+email
  const invite = await verifyInvite(token, emailParam);
  if (!invite) {
    redirect("/auth/error?error=InviteNotValid");
  }

  // Emails must match
  if (sessionEmail !== emailParam) {
    redirect("/auth/error?error=InviteEmailMismatch");
  }

  // All good → mark invite used
  await markInviteUsed(invite._id);

  // OPTIONAL: apply role from invite to the user (if present)
  if (invite.role && session.user?.id) {
    try {
      const client = await clientPromise;
      const dbName = process.env.MONGODB_DB ?? "epiciot";
      const db = client.db(dbName);
      const users = db.collection("users");

      // Build a filter that works for either ObjectId or string _id
      let filter: Filter<Document>;
      try {
        filter = { _id: new ObjectId(session.user.id) };
      } catch {
        // If your adapter stored _id as string
        filter = { _id: session.user.id as unknown as ObjectId };
      }

      await users.updateOne(filter, { $set: { role: invite.role } });
      // Your auth.ts refreshes role on next JWT refresh / reload.
    } catch {
      // If this fails, we still proceed; invite is already consumed.
    }
  }

  // Done
  redirect("/");
}
