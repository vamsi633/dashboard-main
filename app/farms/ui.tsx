"use client";

import React, { useEffect, useState, useCallback } from "react";
import FarmCreateForm from "@/components/FarmCreateForm";
import Link from "next/link";

type Farm = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function FarmsUI() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/farms", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErr(json.error ?? "Failed to load farms");
        setFarms([]);
        return;
      }

      setFarms(json.farms ?? []);
    } catch {
      setErr("Network error");
      setFarms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Farms</h1>
          <p className="text-gray-400 text-sm">
            Create farms and later claim devices into a farm.
          </p>
        </div>

        <Link
          href="/"
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          Back to Home
        </Link>
      </div>

      <FarmCreateForm onCreated={load} />

      <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Your Farms</div>
          <button
            onClick={load}
            className="text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="text-gray-400 text-sm">Loading farms...</p>}
        {err && <p className="text-red-400 text-sm">{err}</p>}

        {!loading && !err && farms.length === 0 && (
          <p className="text-gray-400 text-sm">
            No farms yet. Create your first farm above.
          </p>
        )}

        {!loading && !err && farms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {farms.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-gray-700 bg-gray-900 p-4"
              >
                <Link
                  href={`/farms/${f.id}`}
                  className="text-white font-semibold underline"
                >
                  {f.name}
                </Link>

                {f.location && (
                  <div className="text-xs text-gray-400 mt-1">
                    📍 {f.location}
                  </div>
                )}

                {f.description && (
                  <div className="text-sm text-gray-300 mt-2">
                    {f.description}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-3">
                  Farm ID: {f.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
