"use client";

import { useState, type ReactNode } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

const inputCls = "w-full rounded-full px-4 py-3 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30";
const disabledCls = "w-full rounded-full px-4 py-3 text-sm border border-transparent bg-gray-100 text-gray-900";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-sm mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function RegisterClient({ token, email }: { token: string; email: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    if (password !== confirm) return setErr("Passwords do not match.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/invite/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, name, password }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) return setErr(json.error || "Registration failed.");

      const signInRes = await signIn("credentials", { redirect: false, email, password });
      window.location.href = signInRes?.error ? "/auth/signin" : "/";
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-4">Create your account</h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          You were invited as <span className="font-semibold">{email}</span>
        </p>

        <Field label="Email">
          <input type="email" value={email} disabled className={disabledCls} />
        </Field>
        <Field label="Name (optional)">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" className={inputCls} />
        </Field>
        <Field label="Confirm password">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm your password" className={inputCls} />
        </Field>

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

        <button onClick={onSubmit} disabled={loading}
          className="w-full rounded-full px-4 py-3 font-medium text-white bg-[#2F4358] hover:opacity-95 disabled:opacity-50 transition">
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/auth/signin" className="underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
