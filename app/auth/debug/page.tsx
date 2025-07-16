"use client";

import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function DebugAuth() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl mb-4">Auth Debug Page</h1>

      <div className="bg-gray-800 p-4 rounded mb-4">
        <h2 className="text-xl mb-2">Session Status</h2>
        <p>
          Status: <span className="font-bold">{status}</span>
        </p>
        <p>
          Authenticated:{" "}
          <span className="font-bold">{session ? "Yes" : "No"}</span>
        </p>
        {session && (
          <>
            <p>User: {session.user?.email}</p>
            <p>Name: {session.user?.name}</p>
            <p>ID: {session.user?.id}</p>
          </>
        )}
      </div>

      <div className="space-y-2">
        {session ? (
          <>
            <button
              onClick={() => signOut()}
              className="bg-red-500 px-4 py-2 rounded mr-2"
            >
              Sign Out
            </button>
            <Link
              href="/"
              className="bg-blue-500 px-4 py-2 rounded inline-block"
            >
              Go to Dashboard
            </Link>
          </>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="bg-green-500 px-4 py-2 rounded"
          >
            Sign In with Google
          </button>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl mb-2">Session Data (Raw)</h2>
        <pre className="bg-gray-800 p-4 rounded overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  );
}
