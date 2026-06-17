"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_MAP: Record<string, { title: string; message: string }> = {
  Configuration:   { title: "Configuration Error",  message: "There is a problem with the server configuration." },
  AccessDenied:    { title: "Access Denied",         message: "Access denied. You do not have permission to sign in." },
  Verification:    { title: "Verification Failed",   message: "The verification link was invalid or has expired." },
  InviteRequired:  { title: "Invite Required",       message: "This app is invite-only. Ask an admin to invite you." },
  Default:         { title: "Authentication Error",  message: "An error occurred during authentication." },
};
const FALLBACK = { title: "Authentication Error", message: "An unexpected error occurred. Please try again." };

const btnCls = "w-full font-medium py-3 px-4 rounded-lg transition-colors duration-200 inline-block";

export function ErrorLoading() {
  return (
    <div className="min-h-screen bg-[#0F111A] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-lg text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
        <p className="text-gray-400">Loading error details...</p>
      </div>
    </div>
  );
}

export function ErrorContent() {
  const error = useSearchParams().get("error");
  const { title, message } = (error && ERROR_MAP[error]) || FALLBACK;

  return (
    <div className="min-h-screen bg-[#0F111A] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-lg text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-red-400 mb-4">{title}</h1>
        <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>

        {error && (
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 mb-6">
            <p className="text-sm text-gray-400">
              Error Code: <span className="font-mono text-red-400">{error}</span>
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link href="/auth/signin" className={`${btnCls} bg-blue-600 hover:bg-blue-700 text-white`}>Try Again</Link>
          <Link href="/" className={`${btnCls} bg-gray-700 hover:bg-gray-600 text-gray-200`}>Go to Home</Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400">If this problem persists, please contact support or try a different browser.</p>
        </div>
      </div>
    </div>
  );
}
