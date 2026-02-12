// app/admin/AdminClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import AdminUsersPanel from "./AdminUsersPanel";

type Props = {
  signedInAs: string;
};

export default function AdminClient({ signedInAs }: Props) {
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
    inviteUrl?: string;
  }>({ type: null, message: "" });

  const handleSendInvite = async () => {
    setStatus({ type: null, message: "" });

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setStatus({ type: "error", message: "Please enter an email address." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          expiresInDays: Number(expiresInDays),
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        inviteUrl?: string;
      };

      if (!res.ok || !json.ok) {
        setStatus({
          type: "error",
          message: json.error || "Failed to create invite.",
          inviteUrl: json.inviteUrl,
        });
      } else {
        setStatus({
          type: "success",
          message: "Invite created and email sent (in production).",
          inviteUrl: json.inviteUrl,
        });
        setEmail("");
      }
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: "Something went wrong while creating the invite.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* top bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Admin
            </p>
            <h1 className="text-xl font-semibold text-slate-900">
              Control Center
            </h1>
            <p className="text-xs text-slate-500">
              Invite teammates, manage access and monitor your IoT platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 transition"
            >
              <span className="text-sm">🏠</span>
              <span>Home</span>
            </Link>

            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600 text-sm font-semibold">
                {signedInAs[0]?.toUpperCase() ?? "A"}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-slate-800">Signed in as</span>
                <span className="truncate text-[11px] text-slate-500 max-w-[180px]">
                  {signedInAs}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* INVITE CARD */}
        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400" />

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Invite a teammate
                </h2>
                <p className="text-sm text-slate-500 max-w-xl">
                  Send a secure invite link so new users can sign up with Google
                  or create a password account.
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Invites via email are live
              </span>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="w-full sm:w-40">
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Expires in
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>

              <button
                onClick={handleSendInvite}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-600 hover:to-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send invite"}
              </button>
            </div>

            {status.type && (
              <div
                className={`mt-2 rounded-2xl border px-4 py-3 text-xs ${
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                <p className="font-medium">{status.message}</p>
                {status.inviteUrl && (
                  <p className="mt-1 break-all text-[11px]">
                    Dev link:&nbsp;
                    <a
                      href={status.inviteUrl}
                      className="underline decoration-sky-500"
                    >
                      {status.inviteUrl}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FULL-WIDTH ACCESS CONTROLS TABLE */}
        {/* Access controls – full width */}
        <div className="mt-6">
          <AdminUsersPanel />
        </div>

        {/* Invite history + overview strip */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Coming soon: Invite history
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              View pending invites, revoke access, and resend links when users
              lose their emails.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Access controls
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Admins</p>
                <p className="text-xs text-slate-500">
                  Later this will read from your database.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-2 text-center">
                <div className="text-lg font-semibold text-slate-900">1</div>
                <div className="text-[11px] text-slate-500">You (for now)</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
