// app/auth/invite/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { verifyInvite } from "@/lib/invites";
import Link from "next/link";
import InviteClient from "./InviteClient";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp?.token ?? "").trim();
  const email = (sp?.email ?? "").trim().toLowerCase();

  if (!token || !email) {
    return (
      <main className="min-h-screen grid place-items-center bg-white">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid invite link</h1>
          <p className="text-gray-600">Missing token or email.</p>
          <div className="mt-6">
            <Link
              href="/auth/signin"
              className="rounded-full px-4 py-2 bg-gray-900 text-white"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const invite = await verifyInvite(token, email);
  if (!invite) {
    return (
      <main className="min-h-screen grid place-items-center bg-white">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-2">Invite not valid</h1>
          <p className="text-gray-600">
            This invite is expired, used, revoked, or the email doesn’t match.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/signin"
              className="rounded-full px-4 py-2 bg-gray-900 text-white"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <InviteClient email={email} token={token} />;
}
