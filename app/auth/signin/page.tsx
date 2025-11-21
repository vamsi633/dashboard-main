"use client";

import React, { Suspense, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function SignInContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const hasInvite = !!(searchParams.get("invite") || searchParams.get("token"));
  const allowOpenSignup =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_OPEN_SIGNUP === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState<"default" | "switch" | null>(null);

  const alreadyAuthed = useMemo(() => status === "authenticated", [status]);
  const authedEmail = session?.user?.email ?? "";

  const onCredentialsSignIn = async () => {
    setErr(null);
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setErr("Invalid email or password");
      return;
    }
    if (res?.ok) window.location.href = callbackUrl;
  };

  const onGoogle = async () => {
    setGLoading("default");
    await signIn("google", { callbackUrl, prompt: "select_account" });
    setGLoading(null);
  };

  // Clears NextAuth session first → guarantees Google shows the chooser
  const onGoogleSwitch = async () => {
    setGLoading("switch");
    await signOut({ redirect: false });
    // tiny delay to ensure cookie is cleared before re-opening Google
    setTimeout(() => {
      signIn("google", { callbackUrl, prompt: "select_account" });
      setGLoading(null);
    }, 75);
  };

  return (
    <div className="relative min-h-screen bg-white flex items-center justify-center overflow-hidden">
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

      {/* Card */}
      <div className="relative z-10 bg-white border border-gray-200 rounded-2xl p-8 shadow-lg w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500">
            {alreadyAuthed
              ? "You are currently signed in"
              : "Sign in to access your dashboard"}
          </p>
        </div>

        {/* If already authenticated, show “continue” + “switch account” */}
        {alreadyAuthed ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-[#F5F7F6] border border-[#E1EAE6] p-3 text-sm text-gray-700">
              Signed in as <span className="font-medium">{authedEmail}</span>
            </div>

            <button
              onClick={() => (window.location.href = callbackUrl)}
              className="w-full rounded-full px-4 py-3 font-medium text-white bg-[#2F4358] hover:opacity-95 transition"
            >
              Continue
            </button>

            <button
              onClick={onGoogleSwitch}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-full px-4 py-3 font-medium border border-gray-300 hover:bg-gray-50 transition"
            >
              <Image
                src="https://www.google.com/favicon.ico"
                alt="Google"
                width={20}
                height={20}
              />
              {gLoading === "switch"
                ? "Opening Google…"
                : "Sign in as another Google account"}
            </button>
          </div>
        ) : (
          <>
            {/* Credentials form */}
            <div className="space-y-3">
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                className="w-full rounded-full px-4 py-3 text-sm border border-transparent bg-[#C7D5CD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2F4358]/30"
              />
              <button
                onClick={onCredentialsSignIn}
                disabled={loading}
                className="w-full rounded-full px-4 py-3 font-medium text-white bg-[#2F4358] hover:opacity-95 disabled:opacity-50 transition"
              >
                {loading ? "Signing in..." : "Login"}
              </button>

              {/* Invite-only: hide Sign up unless invited or explicitly allowed */}
              {(allowOpenSignup || hasInvite) && (
                <div className="text-center text-sm text-gray-600 pt-1">
                  New User?{" "}
                  <Link
                    href="/auth/register"
                    className="underline underline-offset-2"
                  >
                    Sign up here
                  </Link>
                </div>
              )}

              {err && <p className="text-red-500 text-sm pt-1">{err}</p>}
            </div>

            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-gray-400 text-xs">OR</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            {/* Google (chooser; preserves callbackUrl e.g. /admin) */}
            <button
              onClick={onGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-full px-4 py-3 font-medium border border-gray-300 hover:bg-gray-50 transition"
            >
              <Image
                src="https://www.google.com/favicon.ico"
                alt="Google"
                width={20}
                height={20}
              />
              {gLoading === "default"
                ? "Opening Google…"
                : "Continue with Google"}
            </button>
          </>
        )}

        <p className="text-center text-gray-400 text-xs">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

function SignInLoading() {
  return (
    <div className="relative min-h-screen bg-white flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500">Loading...</p>
        </div>
        <div className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-500 rounded-full px-4 py-3 font-medium">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
          Loading sign in options...
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}
