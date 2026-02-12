"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import WaterDropLoader from "@/components/WaterDropLoader";
import MapboxMap from "@/components/MapboxMap";
import SensorGraph from "@/components/SensorGraph";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

// ---------------- Types ----------------
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
interface Sensor {
  su_id: string;
  readings: Reading[];
}
interface Box {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  sensors: Sensor[];
  isOnline: boolean;
  lastSeen: string;

  farmId?: string | null;
  farmName?: string | null;
}
interface SensorData {
  boxes: Box[];
}
interface ApiResponse {
  success: boolean;
  boxes?: ApiBox[];
  error?: string;
}
interface ApiBox {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen: string;

  farmId?: string | null;
  farmName?: string | null;

  readings: Reading[];
}
interface UseSensorDataReturn {
  sensorData: SensorData;
  loading: boolean;
  error: string | null;
}

// Legacy for SensorGraph compatibility
interface LegacyReading {
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  temperature: number;
  humidity: number;
  battery1: number;
  battery2: number;
  timestamp: string;
}
interface LegacySensor {
  su_id: string;
  readings: LegacyReading[];
}
interface LegacyBox {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  sensors: LegacySensor[];
  isOnline: boolean;
  lastSeen: string;
}

const convertBoxForSensorGraph = (box: Box): LegacyBox => ({
  box_id: box.box_id,
  name: box.name,
  location: box.location,
  latitude: box.latitude,
  longitude: box.longitude,
  isOnline: box.isOnline,
  lastSeen: box.lastSeen,
  sensors: box.sensors.map((sensor) => ({
    su_id: sensor.su_id,
    readings: sensor.readings.map((r) => ({
      moisture1: r.moisture1,
      moisture2: r.moisture2,
      moisture3: r.moisture3,
      moisture4: r.moisture4,
      temperature: r.temperature,
      humidity: r.humidity,
      battery1: r.lipVoltage,
      battery2: r.rtcBattery,
      timestamp: r.timestamp,
    })),
  })),
});

// ---------------- Helpers ----------------
const convertApiDataToBoxFormat = (apiBoxes: ApiBox[]): SensorData => {
  const boxes: Box[] = apiBoxes.map((apiBox) => {
    const sensor: Sensor = {
      su_id: `${apiBox.box_id}_main_sensor`,
      readings: apiBox.readings.map((r) => ({
        moisture: r.moisture || 0,
        moisture1: r.moisture1 || 0,
        moisture2: r.moisture2 || 0,
        moisture3: r.moisture3 || 0,
        moisture4: r.moisture4 || 0,
        temperature: r.temperature || 0,
        humidity: r.humidity || 0,
        lipVoltage: r.lipVoltage || 0,
        rtcBattery: r.rtcBattery || 0,
        dataPoints: r.dataPoints || 0,
        timestamp: r.timestamp,
      })),
    };

    return {
      box_id: apiBox.box_id,
      name: apiBox.name || apiBox.box_id,
      location: apiBox.location || "Unknown Location",
      latitude: apiBox.latitude || 0,
      longitude: apiBox.longitude || 0,
      sensors: [sensor],
      isOnline: !!apiBox.isOnline,
      lastSeen: apiBox.lastSeen,
      farmId: apiBox.farmId ?? null,
      farmName: apiBox.farmName ?? null,
    };
  });

  return { boxes };
};

const toDateKey = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

type DailyAvgRow = {
  dateKey: string;
  displayDate: string;
  avgMoisture: number;
  avgTemp: number;
  avgHum: number;
  avgLiPo: number;
  avgRTC: number;
  count: number;
};

type FarmOption = {
  id: string;
  name: string;
};

// ---------------- Hook: fetch ----------------
const useSensorData = (
  enabled: boolean,
  farmId: string
): UseSensorDataReturn => {
  const [sensorData, setSensorData] = useState<SensorData>({ boxes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (): Promise<void> => {
    if (!enabled) return;
    try {
      setError(null);

      const url =
        farmId && farmId !== "__all__"
          ? `/api/dashboard/devices?farmId=${encodeURIComponent(farmId)}`
          : "/api/dashboard/devices";

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data: ApiResponse = await response.json();
      if (data.success && data.boxes) {
        setSensorData(convertApiDataToBoxFormat(data.boxes));
      } else {
        setError(data.error || "Failed to fetch sensor data");
        setSensorData({ boxes: [] });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error occurred";
      setError("Network error while fetching sensor data: " + msg);
      setSensorData({ boxes: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [enabled, farmId]);

  return { sensorData, loading, error };
};

// ---------------- Page ----------------
export default function SensorsPage() {
  const { data: session, status } = useSession();

  const [selectedFarmId, setSelectedFarmId] = useState<string>("__all__");
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState(false);

  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [isBoxDropdownOpen, setIsBoxDropdownOpen] = useState(false);

  const {
    sensorData,
    loading: dataLoading,
    error: dataError,
  } = useSensorData(status === "authenticated", selectedFarmId);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) redirect("/auth/signin");
  }, [session, status]);

  const farmOptions = useMemo<FarmOption[]>(() => {
    const opts: FarmOption[] = [{ id: "__all__", name: "All farms" }];
    opts.push({ id: "__none__", name: "Unassigned" });

    const map = new Map<string, string>();
    for (const b of sensorData.boxes) {
      if (b.farmId && b.farmName) map.set(b.farmId, b.farmName);
      else if (b.farmId && !b.farmName) map.set(b.farmId, "Unnamed farm");
    }

    const farmList = Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...opts, ...farmList];
  }, [sensorData.boxes]);

  const selectedFarmLabel =
    farmOptions.find((f) => f.id === selectedFarmId)?.name ?? "All farms";

  useEffect(() => {
    const boxes = sensorData.boxes;
    if (!boxes || boxes.length === 0) {
      setSelectedBox(null);
      return;
    }

    if (!selectedBox || !boxes.find((b) => b.box_id === selectedBox.box_id)) {
      setSelectedBox(boxes[0]);
    } else {
      const updated = boxes.find((b) => b.box_id === selectedBox.box_id);
      if (updated) setSelectedBox(updated);
    }
  }, [sensorData.boxes, selectedBox]);

  useEffect(() => {
    setIsBoxDropdownOpen(false);
  }, [selectedFarmId]);

  const dailyAverages = useMemo<DailyAvgRow[]>(() => {
    const readings = selectedBox?.sensors?.[0]?.readings ?? [];
    if (readings.length === 0) return [];

    type Agg = {
      sumMoist: number;
      sumTemp: number;
      sumHum: number;
      sumLiPo: number;
      sumRTC: number;
      count: number;
      anyTs: string;
    };

    const byDay: Record<string, Agg> = {};

    for (const r of readings) {
      const key = toDateKey(r.timestamp);
      if (!byDay[key]) {
        byDay[key] = {
          sumMoist: 0,
          sumTemp: 0,
          sumHum: 0,
          sumLiPo: 0,
          sumRTC: 0,
          count: 0,
          anyTs: r.timestamp,
        };
      }

      const avgMoist =
        (r.moisture1 + r.moisture2 + r.moisture3 + r.moisture4) / 4;

      byDay[key].sumMoist += avgMoist;
      byDay[key].sumTemp += r.temperature;
      byDay[key].sumHum += r.humidity;
      byDay[key].sumLiPo += r.lipVoltage;
      byDay[key].sumRTC += r.rtcBattery;
      byDay[key].count += 1;
      byDay[key].anyTs = r.timestamp;
    }

    return Object.entries(byDay)
      .map(([dateKey, agg]) => ({
        dateKey,
        displayDate: new Date(agg.anyTs).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        avgMoisture: agg.count ? agg.sumMoist / agg.count : 0,
        avgTemp: agg.count ? agg.sumTemp / agg.count : 0,
        avgHum: agg.count ? agg.sumHum / agg.count : 0,
        avgLiPo: agg.count ? agg.sumLiPo / agg.count : 0,
        avgRTC: agg.count ? agg.sumRTC / agg.count : 0,
        count: agg.count,
      }))
      .sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  }, [selectedBox]);

  const boxStats = useMemo(() => {
    if (!selectedBox) return null;

    let totalMoisture = 0;
    let totalHumidity = 0;
    let totalTemperature = 0;
    let count = 0;

    for (const sensor of selectedBox.sensors) {
      for (const r of sensor.readings) {
        const avgMoist =
          (r.moisture1 + r.moisture2 + r.moisture3 + r.moisture4) / 4;
        totalMoisture += avgMoist;
        totalHumidity += r.humidity;
        totalTemperature += r.temperature;
        count += 1;
      }
    }

    return {
      avgMoisture: count ? (totalMoisture / count).toFixed(1) : "0.0",
      avgHumidity: count ? (totalHumidity / count).toFixed(1) : "0.0",
      avgTemperature: count ? (totalTemperature / count).toFixed(1) : "0.0",
      sensorCount: selectedBox.sensors.length,
      readingCount: count,
    };
  }, [selectedBox]);

  const mapSensors = useMemo(() => {
    if (!selectedBox) return [];
    const readings = selectedBox.sensors[0]?.readings ?? [];
    const latest = readings.length ? readings[readings.length - 1] : null;

    return [
      {
        id: selectedBox.box_id,
        name: selectedBox.name || selectedBox.box_id,
        coordinates: [selectedBox.longitude, selectedBox.latitude] as [
          number,
          number
        ],
        data: latest
          ? {
              moisture: latest.moisture || 0,
              moisture1: latest.moisture1 || 0,
              moisture2: latest.moisture2 || 0,
              moisture3: latest.moisture3 || 0,
              moisture4: latest.moisture4 || 0,
              humidity: latest.humidity || 0,
              temperature: latest.temperature || 0,
              lipVoltage: latest.lipVoltage || 0,
              rtcBattery: latest.rtcBattery || 0,
              dataPoints: latest.dataPoints || 0,
            }
          : undefined,
      },
    ];
  }, [selectedBox]);

  if (status === "loading" || dataLoading) return <WaterDropLoader />;
  if (!session) return null;

  // ---------------- LIGHT UI ----------------
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mx-auto w-full max-w-[1600px]">
        {/* Navbar should also be light — see section 2 below */}
        <Navbar />

        <main className="py-6 pt-[90px]">
          <div className="p-2 sm:p-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold">Sensors</h1>

              {selectedBox && (
                <Link
                  href={`/sensors/${encodeURIComponent(
                    selectedBox.box_id
                  )}/readings`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
                >
                  See all data
                </Link>
              )}
            </div>

            {dataError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p>Error loading sensor data: {dataError}</p>
              </div>
            )}

            {sensorData.boxes.length === 0 && !dataLoading && (
              <div className="mb-8 bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
                <h2 className="text-xl font-semibold mb-2">
                  No sensor boxes found
                </h2>
                <p className="text-gray-600 mb-4">
                  Sensor boxes will appear here once they start sending data.
                </p>
                <p className="text-gray-500 text-sm">
                  Use the &quot;Add Device&quot; button on the home page to
                  claim devices.
                </p>
              </div>
            )}

            {/* Farm + Box dropdown row */}
            {farmOptions.length > 0 && (
              <div className="mb-8 flex flex-col sm:flex-row gap-4">
                {/* Farm dropdown */}
                <div className="relative w-80 max-w-full">
                  <button
                    onClick={() => setIsFarmDropdownOpen((v) => !v)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  >
                    <span className="font-medium text-gray-800">
                      {selectedFarmLabel}
                    </span>
                    <ChevronDownIcon
                      className={`h-5 w-5 text-gray-500 transition-transform ${
                        isFarmDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isFarmDropdownOpen && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {farmOptions.map((farm) => (
                        <button
                          key={farm.id}
                          onClick={() => {
                            setSelectedFarmId(farm.id);
                            setIsFarmDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition"
                        >
                          {farm.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Box dropdown */}
                {sensorData.boxes.length > 0 && (
                  <div className="relative w-80 max-w-full">
                    <button
                      onClick={() => setIsBoxDropdownOpen((v) => !v)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    >
                      <span className="font-medium text-gray-800">
                        {selectedBox ? selectedBox.box_id : "Select a Box"}
                      </span>
                      <ChevronDownIcon
                        className={`h-5 w-5 text-gray-500 transition-transform ${
                          isBoxDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isBoxDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {sensorData.boxes.map((box) => (
                          <button
                            key={box.box_id}
                            onClick={() => {
                              setSelectedBox(box);
                              setIsBoxDropdownOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {box.box_id}
                              </span>
                              <span className="text-xs text-gray-500">
                                {box.location} •{" "}
                                <span
                                  className={
                                    box.isOnline
                                      ? "text-green-700"
                                      : "text-gray-500"
                                  }
                                >
                                  {box.isOnline ? "Online" : "Offline"}
                                </span>
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedBox && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                  {[
                    {
                      label: "Avg Moisture",
                      value: `${boxStats?.avgMoisture}%`,
                    },
                    {
                      label: "Avg Humidity",
                      value: `${boxStats?.avgHumidity}%`,
                    },
                    {
                      label: "Avg Temperature",
                      value: `${boxStats?.avgTemperature}°C`,
                    },
                    {
                      label: "Total Sensors",
                      value: `${boxStats?.sensorCount}`,
                    },
                    {
                      label: "Total Readings",
                      value: `${boxStats?.readingCount}`,
                    },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                    >
                      <h3 className="text-gray-500 text-sm mb-1">{c.label}</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        {c.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Map */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Device Location</h2>
                      <div className="text-xs text-gray-500">
                        Last seen:{" "}
                        {selectedBox.lastSeen
                          ? new Date(selectedBox.lastSeen).toLocaleString()
                          : "-"}
                      </div>
                    </div>

                    {selectedBox.latitude !== 0 &&
                    selectedBox.longitude !== 0 ? (
                      <MapboxMap
                        sensors={mapSensors}
                        center={[selectedBox.longitude, selectedBox.latitude]}
                        zoom={15}
                        height="500px"
                        showLabels={true}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          Invalid Coordinates
                        </h3>
                        <p className="text-gray-600 mb-2">
                          ({selectedBox.latitude}, {selectedBox.longitude})
                        </p>
                        <p className="text-gray-500 text-sm">
                          Device needs valid GPS coordinates to show on map.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Daily average tables */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Daily averages</h2>
                      <Link
                        href={`/sensors/${encodeURIComponent(
                          selectedBox.box_id
                        )}/readings`}
                        className="text-sm text-blue-700 hover:text-blue-800 underline"
                      >
                        See all data
                      </Link>
                    </div>

                    {dailyAverages.length === 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-600">
                        No readings yet.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Moisture table */}
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <div className="px-3 py-2 bg-gray-50 text-sm font-semibold text-gray-900">
                            Avg Moisture (%)
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white">
                                  <th className="text-left px-3 py-2 border-b border-gray-200 min-w-[160px] text-gray-600 font-medium">
                                    Date
                                  </th>
                                  <th className="text-right px-3 py-2 border-b border-gray-200 text-gray-600 font-medium">
                                    Avg
                                  </th>
                                  <th className="text-right px-3 py-2 border-b border-gray-200 text-gray-600 font-medium">
                                    Points
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {dailyAverages.slice(-10).map((row) => (
                                  <tr
                                    key={row.dateKey}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                  >
                                    <td className="px-3 py-2 text-gray-900">
                                      {row.displayDate}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                      {row.avgMoisture.toFixed(1)}%
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">
                                      {row.count}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Temp/Hum/LiPo/RTC */}
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <div className="px-3 py-2 bg-gray-50 text-sm font-semibold text-gray-900">
                            Temp (°C) • Hum (%) • LiPo (V) • RTC (V)
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white">
                                  <th className="text-left px-3 py-2 border-b border-gray-200 min-w-[160px] text-gray-600 font-medium">
                                    Date
                                  </th>
                                  <th className="text-right px-3 py-2 border-b border-gray-200 text-gray-600 font-medium">
                                    Temp
                                  </th>
                                  <th className="text-right px-3 py-2 border-b border-gray-200 text-gray-600 font-medium">
                                    Hum
                                  </th>
                                  <th className="text-right px-3 py-2 border-b border-gray-200 text-gray-600 font-medium">
                                    LiPo
                                  </th>
                                  <th className="text-right px-3 py-2 border-b border-gray-200 text-gray-600 font-medium">
                                    RTC
                                  </th>
                                  <th className="text-right px-3 py-2 border-b border-gray-200 text-gray-600 font-medium">
                                    Points
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {dailyAverages.slice(-10).map((row) => (
                                  <tr
                                    key={row.dateKey}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                  >
                                    <td className="px-3 py-2 text-gray-900">
                                      {row.displayDate}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-900">
                                      {row.avgTemp.toFixed(1)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-900">
                                      {row.avgHum.toFixed(1)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-900">
                                      {row.avgLiPo.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-900">
                                      {row.avgRTC.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">
                                      {row.count}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Showing last 10 days. Use{" "}
                          <span className="text-blue-700">See all data</span>{" "}
                          for every datapoint.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Graph */}
                <div className="mt-8 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <SensorGraph
                    selectedBox={convertBoxForSensorGraph(selectedBox)}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
