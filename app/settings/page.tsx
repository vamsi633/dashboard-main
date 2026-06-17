"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace("/auth/signin");
    }
  }, [status, session, router]);

  if (status === "loading" || !session) return null;

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Failed to delete account");
        setDeleting(false);
        setShowConfirm(false);
        return;
      }
      await signOut({ redirect: false });
      router.replace("/auth/signin");
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const userName = session.user?.name || "User";
  const userEmail = session.user?.email || "";

  return (
    <div className="min-h-screen font-body" style={{ background: "#F3EDE1" }}>
      <Navbar />
      <main className="pt-[88px] pb-12 px-4 sm:px-6 lg:px-10 xl:px-12 mx-auto max-w-2xl">

        <h1 className="font-display text-3xl tracking-tight mb-8" style={{ color: "#1E2A1F" }}>
          Settings
        </h1>

        {/* Account info */}
        <section className="rounded-2xl p-6 mb-5 card-base">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#7A8579" }}>Account</h2>
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium" style={{ color: "#1E2A1F" }}>{userName}</p>
            <p className="text-sm" style={{ color: "#7A8579" }}>{userEmail}</p>
          </div>
        </section>

        {/* Change password */}
        <section className="rounded-2xl p-6 mb-5 card-base">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#7A8579" }}>Change Password</h2>
          <ChangePasswordForm />
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl p-6" style={{ background: "#FDF3F1", border: "1px solid #F0C8BF" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#B5452D" }}>Danger Zone</h2>
          <p className="text-sm mb-4" style={{ color: "#7A8579" }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </p>

          {error && (
            <p className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: "#F7E3DC", color: "#B5452D" }}>
              {error}
            </p>
          )}

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "#B5452D", color: "#FDFBF5" }}
            >
              Delete Account
            </button>
          ) : (
            <div className="rounded-xl p-4" style={{ background: "#F0D1C5", border: "1px solid #E8B9AA" }}>
              <p className="text-sm font-medium mb-3" style={{ color: "#7A2018" }}>
                Are you sure? This will permanently delete your account and cannot be reversed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ background: "#B5452D", color: "#FDFBF5" }}
                >
                  {deleting ? "Deleting..." : "Yes, delete my account"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="px-5 py-2 rounded-full text-sm font-medium transition-all hover:bg-opacity-80"
                  style={{ background: "#FDFBF5", color: "#4A5A4C", border: "1px solid #E5DBC6" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
