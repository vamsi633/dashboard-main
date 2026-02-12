"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type DeviceOut = {
  deviceId: string;
  name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  lastSeen?: string;
  isOnline?: boolean;
  farmId?: string;
};

type GetResp =
  | { ok: true; devices: DeviceOut[] }
  | { ok: false; error: string };

type PostResp = { ok: true } | { ok: false; error: string };

export default function FarmDetailsUI() {
  const params = useParams<{ farmId: string }>();
  const farmId = params.farmId;

  const [devices, setDevices] = useState<DeviceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/devices`, {
        cache: "no-store",
      });
      const json: GetResp = await res.json();

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error : "Failed to load farm devices";
        setErr(msg);
        setDevices([]);
        return;
      }

      setDevices(json.devices ?? []);
    } catch {
      setErr("Network error");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async () => {
    const id = deviceId.trim();
    if (!id) return alert("Enter a device id");

    setAssigning(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: id }),
      });

      const json: PostResp = await res.json();

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error : "Failed to assign device";
        alert(`❌ ${msg}`);
        return;
      }

      alert("✅ Device assigned to farm");
      setDeviceId("");
      load();
    } catch {
      alert("❌ Network error");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Farm Devices</h1>
          <p className="text-gray-400 text-sm">Farm ID: {farmId}</p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/farms"
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Back to Farms
          </Link>
          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Home
          </Link>
        </div>
      </div>

      {/* Assign existing claimed device */}
      <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-5">
        <div className="text-lg font-semibold mb-2">
          Add existing claimed device
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Enter a Device ID that you already claimed. This will set{" "}
          <code>iot_devices.farmId</code>.
        </p>

        <div className="flex gap-3">
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g., GREENHOUSE_BOX_001"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
          />
          <button
            onClick={assign}
            disabled={assigning}
            className="px-4 py-2 rounded-md bg-[#2F6F5A] hover:bg-[#275e4c] disabled:opacity-50"
          >
            {assigning ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {/* Devices list */}
      <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Devices in this farm</div>
          <button
            onClick={load}
            className="text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="text-gray-400 text-sm">Loading…</p>}
        {err && <p className="text-red-400 text-sm">{err}</p>}

        {!loading && !err && devices.length === 0 && (
          <p className="text-gray-400 text-sm">
            No devices assigned to this farm yet.
          </p>
        )}

        {!loading && !err && devices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map((d) => (
              <div
                key={d.deviceId}
                className="rounded-lg border border-gray-700 bg-gray-900 p-4"
              >
                <div className="text-white font-semibold">
                  {d.name || d.deviceId}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Device ID: {d.deviceId}
                </div>
                {d.location && (
                  <div className="text-xs text-gray-400 mt-1">
                    📍 {d.location}
                  </div>
                )}
                {typeof d.isOnline === "boolean" && (
                  <div className="text-xs text-gray-400 mt-1">
                    Status:{" "}
                    <span
                      className={d.isOnline ? "text-green-400" : "text-red-400"}
                    >
                      {d.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                )}
                {d.lastSeen && (
                  <div className="text-xs text-gray-500 mt-2">
                    Last seen: {d.lastSeen}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
