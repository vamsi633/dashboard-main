"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterClient({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);

    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/invite/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, name, password }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setErr(json.error || "Registration failed.");
        setLoading(false);
        return;
      }

      // auto sign-in with credentials
      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      setLoading(false);

      if (signInRes?.error) {
        window.location.href = "/auth/signin";
        return;
      }

      window.location.href = "/";
    } catch {
      // we intentionally ignore the actual error object
      setLoading(false);
      setErr("Something went wrong. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-4">
          Create your account
        </h1>

        <p className="text-sm text-gray-600 mb-4 text-center">
          You were invited as <span className="font-semibold">{email}</span>
        </p>

        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-full px-4 py-3 mb-3 text-sm border border-transparent bg-gray-100 text-gray-900"
        />

        <label className="block text-sm mb-1">Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          placeholder="Your name"
          className="w-full rounded-full px-4 py-3 mb-3 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30"
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          placeholder="Create a password"
          className="w-full rounded-full px-4 py-3 mb-3 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30"
        />

        <label className="block text-sm mb-1">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(ev) => setConfirm(ev.target.value)}
          placeholder="Confirm your password"
          className="w-full rounded-full px-4 py-3 mb-4 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30"
        />

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded-full px-4 py-3 font-medium text-white bg-[#2F4358] hover:opacity-95 disabled:opacity-50 transition"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/auth/signin" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
