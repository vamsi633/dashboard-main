"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function InviteClient({ email, token }: { email: string; token: string }) {
  const { data: session, status } = useSession();

  const invited = email.toLowerCase();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const signedInDifferent = status === "authenticated" && sessionEmail !== invited;

  const consumeUrl = `/auth/invite/consume?${new URLSearchParams({ token, email: invited })}`;

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">You&apos;re invited</h1>
          <p className="text-gray-600">
            Accept the invite for <span className="font-semibold">{invited}</span>
          </p>
        </div>

        {signedInDifferent && (
          <div className="space-y-3">
            <p className="text-sm text-red-600 text-center">
              You&apos;re currently signed in as <b>{sessionEmail}</b>. Please sign out to continue as <b>{invited}</b>.
            </p>
            <button
              onClick={() => signOut({ callbackUrl: window.location.href })}
              className="w-full rounded-full px-4 py-3 font-medium text-white bg-red-600 hover:bg-red-700 transition"
            >
              Sign out
            </button>
          </div>
        )}

        {!signedInDifferent && (
          <>
            <button
              onClick={() => signIn("google", { callbackUrl: consumeUrl, prompt: "select_account", login_hint: invited })}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-full px-4 py-3 font-medium border border-gray-300 hover:bg-gray-50 transition"
            >
              Continue with Google
            </button>
            <div className="mt-4 text-center">
              <a
                href={`/auth/invite/register?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`}
                className="text-sm underline text-[#2F4358] hover:opacity-80"
              >
                Prefer to create a password instead
              </a>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              Use the same email as the invite: <b>{invited}</b>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
