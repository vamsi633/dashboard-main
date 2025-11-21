"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (!email || !password) return setErr("Email and password are required");
    if (password.length < 8)
      return setErr("Password must be at least 8 characters");
    if (password !== confirm) return setErr("Passwords do not match");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        return setErr(json.error ?? "Registration failed");

      const login = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/",
      });

      if (login?.error) setOkMsg("Account created. Please sign in.");
      else window.location.href = "/";
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-white flex items-center justify-center px-4 overflow-hidden">
      {/* Decorative stems */}
      <Image
        src="/stems/top-left.svg"
        alt=""
        width={640}
        height={640}
        priority
        className="pointer-events-none select-none absolute -top-8 -left-10 w-[45vw] max-w-[520px] opacity-80"
      />
      <Image
        src="/stems/bottom-right.svg"
        alt=""
        width={640}
        height={640}
        priority
        className="pointer-events-none select-none absolute -bottom-10 -right-8 w-[48vw] max-w-[560px] opacity-80"
      />

      <div className="relative z-10 bg-white border border-gray-200 rounded-2xl p-8 shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Create account
        </h1>
        <p className="text-gray-500 text-center mb-6">
          Sign up with email and password
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="sr-only" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Full name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-full px-4 py-3 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30"
          />
          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-full px-4 py-3 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30"
          />
          <label className="sr-only" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-full px-4 py-3 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30"
          />
          <label className="sr-only" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            placeholder="Confirm your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-full px-4 py-3 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30"
          />

          {err && <p className="text-red-500 text-sm">{err}</p>}
          {okMsg && <p className="text-green-600 text-sm">{okMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full px-4 py-3 font-medium text-white bg-[#2F4358] hover:opacity-95 disabled:opacity-50 transition"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Already have an account?{" "}
          <Link href="/auth/signin" className="underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
