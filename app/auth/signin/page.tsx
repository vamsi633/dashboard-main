"use client";
import React, { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

// Separate component for search params logic
function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F111A] via-[#121624] to-[#121624] flex items-center justify-center">
      <div className="bg-[#0F111A] border border-gray-500 rounded-lg p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to access your dashboard</p>
        </div>
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
        <p className="text-center text-gray-500 text-sm mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

// Loading fallback component
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
        <p className="text-center text-gray-500 text-sm mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

// Main sign in page with Suspense wrapper
export default function SignIn() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}
