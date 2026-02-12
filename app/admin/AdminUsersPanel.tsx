// app/admin/AdminUsersPanel.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Role = "admin" | "user";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
}

interface PendingRoleChange {
  userId: string;
  previousRole: Role;
  newRole: Role;
}

interface PendingDelete {
  userId: string;
  email: string;
  name: string | null;
}

const PAGE_SIZE = 10;

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [pendingRoleChange, setPendingRoleChange] =
    useState<PendingRoleChange | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages =
    users.length === 0 ? 1 : Math.ceil(users.length / PAGE_SIZE);

  const pageUsers = users.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as {
        ok: boolean;
        users?: AdminUser[];
        error?: string;
      };
      if (!json.ok || !json.users) {
        throw new Error(json.error || "Failed to load users");
      }
      setUsers(json.users);
      setCurrentPage(1); // reset to first page on reload
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load users";
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /* ------------ Role change logic ------------ */

  const applyRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingId(userId);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update role");
      }
      // success: local state already updated optimistically
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update role";
      setErr(message);
      // reload from server so UI reflects real state
      void load();
    } finally {
      setUpdatingId(null);
    }
  };

  const onSelectChange = (user: AdminUser, newRole: Role) => {
    if (newRole === user.role) return;

    // Clear any pending delete dialog
    setPendingDelete(null);

    // Optimistically update UI
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    );

    setPendingRoleChange({
      userId: user.id,
      previousRole: user.role,
      newRole,
    });
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    const { userId, newRole } = pendingRoleChange;
    setPendingRoleChange(null);
    await applyRoleChange(userId, newRole);
  };

  const handleCancelRoleChange = () => {
    if (!pendingRoleChange) return;
    const { userId, previousRole } = pendingRoleChange;

    // Revert UI back to old role
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: previousRole,
            }
          : u
      )
    );
    setPendingRoleChange(null);
  };

  /* ------------ Delete user logic ------------ */

  const requestDeleteUser = (user: AdminUser) => {
    // clear pending role dialog if any
    setPendingRoleChange(null);
    setPendingDelete({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  };

  const applyDeleteUser = async (userId: string) => {
    setDeletingId(userId);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete user");
      }

      // remove user from local state and fix pagination based on UPDATED list
      setUsers((prevUsers) => {
        const updated = prevUsers.filter((u) => u.id !== userId);

        setCurrentPage((prevPage) => {
          const newTotalPages = Math.max(
            1,
            Math.ceil(updated.length / PAGE_SIZE)
          );
          return Math.min(prevPage, newTotalPages);
        });

        return updated;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      setErr(message);
      void load(); // fallback: reload
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const { userId } = pendingDelete;
    setPendingDelete(null);
    await applyDeleteUser(userId);
  };

  const handleCancelDelete = () => {
    setPendingDelete(null);
  };

  /* ------------ Pagination UI ------------ */

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handlePrev = () => {
    if (canPrev) setCurrentPage((p) => p - 1);
  };

  const handleNext = () => {
    if (canNext) setCurrentPage((p) => p + 1);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-slate-900">
            Access controls
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Configure who can view devices, edit configurations, or use admin
            tools.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
        >
          Refresh
        </button>
      </div>

      {/* Error */}
      {err && (
        <div className="mx-5 mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {err}
        </div>
      )}

      {/* Loading / empty */}
      {loading && (
        <div className="px-5 py-6 text-sm text-slate-500">Loading users…</div>
      )}

      {!loading && users.length === 0 && !err && (
        <div className="px-5 py-6 text-sm text-slate-500">No users found.</div>
      )}

      {/* Table */}
      {!loading && users.length > 0 && (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50/60">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-[0.18em]">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-[0.18em]">
                    Email
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-[0.18em]">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-[0.18em]">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    {/* User (avatar + name) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt={user.name ?? user.email}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                            {(user.name || user.email || "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <p className="font-medium text-slate-900">
                          {user.name || "Unnamed user"}
                        </p>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-slate-600">
                      <span className="block max-w-[220px] truncate text-xs sm:text-sm">
                        {user.email}
                      </span>
                    </td>

                    {/* Role selector */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <span className="hidden sm:inline text-xs text-slate-400">
                          Role
                        </span>
                        <select
                          value={user.role}
                          onChange={(event) =>
                            onSelectChange(user, event.target.value as Role)
                          }
                          disabled={updatingId === user.id}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 disabled:opacity-60"
                        >
                          <option value="user">User (view only)</option>
                          <option value="admin">Admin (full access)</option>
                        </select>
                      </div>
                    </td>

                    {/* Delete button */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => requestDeleteUser(user)}
                        disabled={deletingId === user.id}
                        className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 text-xs sm:text-sm">
              <span className="text-slate-500">
                Showing{" "}
                <span className="font-semibold">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                –{" "}
                <span className="font-semibold">
                  {Math.min(currentPage * PAGE_SIZE, users.length)}
                </span>{" "}
                of <span className="font-semibold">{users.length}</span> users
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className="h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const page = idx + 1;
                  const isCurrent = page === currentPage;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 w-8 rounded-full text-xs font-medium ${
                        isCurrent
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={handleNext}
                  disabled={!canNext}
                  className="h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer tip */}
      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="font-semibold text-sky-600">Tip:</span> Use{" "}
          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
            admin
          </span>{" "}
          role sparingly. Admins can invite teammates, change roles, delete
          users and remove claimed devices across the workspace.
        </p>
      </div>

      {/* Confirm role change modal */}
      {pendingRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Change user role?
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              You&apos;re about to change this user&apos;s role to{" "}
              <span className="font-semibold">
                {pendingRoleChange.newRole === "admin"
                  ? "Admin (full access)"
                  : "User (view only)"}
              </span>
              . This affects what they can see and do in the dashboard.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelRoleChange}
                className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRoleChange}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-xs font-medium text-white hover:bg-slate-800"
              >
                Confirm change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Delete user & claimed devices?
            </h3>
            <p className="text-xs text-slate-600 mb-2">
              You&apos;re about to permanently delete:
            </p>
            <p className="text-xs font-medium text-slate-900 mb-3">
              {pendingDelete.name || pendingDelete.email}
            </p>
            <p className="text-xs text-rose-700 mb-4">
              This will remove the user account and{" "}
              <span className="font-semibold">
                all devices they have claimed
              </span>{" "}
              from the workspace. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelDelete}
                className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 rounded-full bg-rose-600 text-xs font-medium text-white hover:bg-rose-700"
              >
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
