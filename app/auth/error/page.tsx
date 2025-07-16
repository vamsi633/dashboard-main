"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Separate component for search params logic
function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in.";
      case "Verification":
        return "The verification link was invalid or has expired.";
      case "Default":
        return "An error occurred during authentication.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const getErrorTitle = (errorType: string | null) => {
    switch (errorType) {
      case "Configuration":
        return "Configuration Error";
      case "AccessDenied":
        return "Access Denied";
      case "Verification":
        return "Verification Failed";
      case "Default":
        return "Authentication Error";
      default:
        return "Authentication Error";
    }
  };

  return (
    <div className="min-h-screen bg-[#0F111A] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-lg text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <span className="text-3xl">⚠️</span>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            {getErrorTitle(error)}
          </h1>

          {/* Error Message */}
          <p className="text-gray-300 mb-6 leading-relaxed">
            {getErrorMessage(error)}
          </p>

          {/* Error Code */}
          {error && (
            <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-400">
                Error Code: <span className="font-mono text-red-400">{error}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/api/auth/signin"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 inline-block"
            >
              Try Again
            </Link>
            
            <Link
              href="/"
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-3 px-4 rounded-lg transition-colors duration-200 inline-block"
            >
              Go to Home
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              If this problem persists, please contact support or try a different browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function ErrorLoading() {
  return (
    <div className="min-h-screen bg-[#0F111A] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading error details...</p>
        </div>
      </div>
    </div>
  );
}

// Main error page with Suspense wrapper
export default function AuthErrorPage() {
  return (
    <Suspense fallback={<ErrorLoading />}>
      <ErrorContent />
    </Suspense>
  );
}
