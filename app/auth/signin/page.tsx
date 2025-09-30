"use client";
import React, { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F111A] via-[#121624] to-[#121624] flex items-center justify-center">
      <div className="bg-[#0F111A] border border-gray-500 rounded-lg p-8 shadow-2xl max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to access your dashboard</p>
        </div>

        {/* Credentials form */}
        <div className="space-y-3">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
          <button
            onClick={onCredentialsSignIn}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium transition-colors"
          >
            {loading ? "Signing in..." : "Sign in with Email"}
          </button>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          {/* helper links */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span />
            <Link
              href="/auth/register"
              className="text-blue-400 hover:underline"
            >
              Don’t have an account? Create one
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px bg-gray-600 flex-1" />
          <span className="text-gray-400 text-xs">OR</span>
          <div className="h-px bg-gray-600 flex-1" />
        </div>

        {/* Google */}
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-lg px-4 py-3 font-medium hover:bg-gray-100 transition-colors"
        >
          <Image
            src="https://www.google.com/favicon.ico"
            alt="Google"
            width={20}
            height={20}
          />
          Continue with Google
        </button>

        <p className="text-center text-gray-500 text-sm">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

function SignInLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F111A] via-[#121624] to-[#121624] flex items-center justify-center">
      <div className="bg-[#0F111A] border border-gray-500 rounded-lg p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
        <div className="w-full flex items-center justify-center gap-3 bg-gray-200 text-gray-500 rounded-lg px-4 py-3 font-medium">
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
