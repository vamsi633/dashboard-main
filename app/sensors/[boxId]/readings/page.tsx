"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import WaterDropLoader from "@/components/WaterDropLoader";
import Link from "next/link";

interface Reading {
  moisture: number;
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  temperature: number;
  humidity: number;
  lipVoltage: number;
  rtcBattery: number;
  dataPoints: number;
  timestamp: string;
}

interface ApiBox {
  box_id: string;
  readings: Reading[];
}

interface ApiResponse {
  success: boolean;
  boxes?: ApiBox[];
  error?: string;
}

export default function SensorsAllPage() {
  const params = useParams<{ boxId: string }>();
  const boxId = params?.boxId ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Reading[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!boxId) {
        setErr("Missing boxId");
        setLoading(false);
        return;
      }

      setErr(null);
      setLoading(true);

      try {
        const res = await fetch("/api/dashboard/devices", {
          cache: "no-store",
        });
        const json: ApiResponse = await res.json();

        if (!res.ok || !json.success || !json.boxes) {
          setErr(json.error ?? "Failed to load devices");
          setRows([]);
          return;
        }

        const found = json.boxes.find((b) => b.box_id === boxId);
        setRows(found?.readings ?? []);
      } catch {
        setErr("Network error");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [boxId]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [rows]);

  if (loading) return <WaterDropLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F111A] via-[#121624] to-[#121624] text-white">
      <div className="px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mx-auto w-full max-w-[1600px]">
        <Navbar />
        <main className="py-4 pt-[90px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">All Data</h1>
                <p className="text-gray-400 text-sm mt-1">Device: {boxId}</p>
              </div>
              <Link href="/sensors" className="text-sm underline text-blue-400">
                Back to Sensors
              </Link>
            </div>

            {err && (
              <div className="mb-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                {err}
              </div>
            )}

            {!err && sorted.length === 0 && (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-8 text-center text-gray-300">
                No readings found.
              </div>
            )}

            {!err && sorted.length > 0 && (
              <div className="bg-[#0F111A] border border-gray-600 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {[
                          "Timestamp",
                          "Temp",
                          "Hum",
                          "LiPo",
                          "RTC",
                          "Moisture",
                          "M1",
                          "M2",
                          "M3",
                          "M4",
                          "DataPoints",
                        ].map((h) => (
                          <th
                            key={h}
                            className="border border-gray-700 px-3 py-2 bg-gray-800 text-left whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-900">
                          <td className="border border-gray-700 px-3 py-2 whitespace-nowrap">
                            {new Date(r.timestamp).toLocaleString()}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.temperature ?? 0).toFixed(1)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.humidity ?? 0).toFixed(1)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.lipVoltage ?? 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.rtcBattery ?? 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.moisture ?? 0).toFixed(1)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.moisture1 ?? 0).toFixed(1)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.moisture2 ?? 0).toFixed(1)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.moisture3 ?? 0).toFixed(1)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {(r.moisture4 ?? 0).toFixed(1)}
                          </td>
                          <td className="border border-gray-700 px-3 py-2">
                            {r.dataPoints ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
