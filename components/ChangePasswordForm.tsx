"use client";
import React, { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (newPassword.length < 8) {
      setErr("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      setErr("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErr(json.error ?? "Failed to change password");
        return;
      }
      setOk("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="password"
        placeholder="Current password (leave blank if none)"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
      />
      <input
        type="password"
        placeholder="New password (min 8 chars)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
        minLength={8}
        required
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
        minLength={8}
        required
      />
      {err && <p className="text-red-400 text-sm">{err}</p>}
      {ok && <p className="text-green-400 text-sm">{ok}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium transition-colors"
      >
        {loading ? "Updating..." : "Change password"}
      </button>
    </form>
  );
}
