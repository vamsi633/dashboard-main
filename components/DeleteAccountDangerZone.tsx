"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function DeleteAccountDangerZone() {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;

    const confirmed = window.confirm(
      "This will permanently delete your account, farms, sensor history, and account data. Devices will be reset to UNASSIGNED. Continue?",
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to delete account");
        return;
      }

      await signOut({ callbackUrl: "/auth/signin" });
    } catch {
      setError("Network error while deleting account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-xl font-bold text-red-700">Danger Zone</h2>

      <p className="mt-2 text-sm text-red-700">
        Delete your account permanently. This removes your farms, old sensor
        readings, sessions, and account data. Physical devices are not deleted;
        they will be reset to UNASSIGNED.
      </p>

      <div className="mt-5">
        <label className="block text-sm font-medium text-red-800">
          Type DELETE to confirm
        </label>

        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="mt-2 w-full max-w-sm rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <button
        onClick={handleDelete}
        disabled={!canDelete || deleting}
        className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete My Account"}
      </button>
    </section>
  );
}
