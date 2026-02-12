"use client";

import React, { useState } from "react";

export default function FarmCreateForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErr("Farm name must be at least 2 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErr(json.error ?? "Failed to create farm");
        return;
      }

      setOk("Farm created!");
      setName("");
      setDescription("");
      setLocation("");
      onCreated?.();
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-[#0F111A] border border-gray-600 rounded-lg p-5 space-y-3"
    >
      <div className="text-lg font-semibold">Create a Farm</div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Farm name (required)"
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
        required
        minLength={2}
      />

      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (optional)"
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white min-h-[90px]"
      />

      {err && <p className="text-red-400 text-sm">{err}</p>}
      {ok && <p className="text-green-400 text-sm">{ok}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium transition-colors"
      >
        {loading ? "Creating..." : "Create Farm"}
      </button>
    </form>
  );
}
