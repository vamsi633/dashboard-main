// components/admin/InviteButton.tsx
"use client";

import { useState } from "react";

export default function InviteButton({
  defaultEmail,
}: {
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    inviteUrl?: string;
    error?: string;
  }>(null);

  const createInvite = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, expiresInDays: 7 }),
      });
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setResult({ error: "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="invitee@example.com"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={createInvite}
          disabled={loading || !email}
          className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Invite"}
        </button>
      </div>

      {result?.inviteUrl && (
        <div className="text-sm">
          <div className="font-medium text-green-700">Invite created!</div>
          <div className="mt-1 break-all">
            <span className="text-gray-600">Link: </span>
            <a
              className="text-blue-600 underline"
              href={result.inviteUrl}
              target="_blank"
            >
              {result.inviteUrl}
            </a>
          </div>
        </div>
      )}

      {result?.error && (
        <div className="text-sm text-red-600">Error: {result.error}</div>
      )}
    </div>
  );
}
