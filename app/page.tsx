"use client";

import Navbar from "@/components/Navbar";
import MapboxMap from "@/components/MapboxMap";
import Weather from "@/components/Weather";
import SensorGraph from "@/components/SensorGraph";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import WaterDropLoader from "@/components/WaterDropLoader";

// -------- Types (same as before) --------
interface IoTDevice {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen: string;
  currentReadings: {
    moisture: number;
    moisture1: number;
    moisture2: number;
    moisture3: number;
    moisture4: number;
    humidity: number;
    temperature: number;
    lipVoltage: number;
    rtcBattery: number;
    dataPoints: number;
  } | null;
}
interface SensorMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  data?: {
    moisture?: number;
    moisture1?: number;
    moisture2?: number;
    moisture3?: number;
    moisture4?: number;
    temperature?: number;
    humidity?: number;
    lipVoltage?: number;
    rtcBattery?: number;
    dataPoints?: number;
  };
}
interface ApiResponse {
  success: boolean;
  boxes?: IoTDevice[];
  error?: string;
}
interface ClaimResponse {
  success: boolean;
  message?: string;
  error?: string;
  device?: {
    deviceId: string;
    name: string;
    location: string;
    historicalReadings: number;
    claimedAt: string;
  };
}
interface UseIoTDevicesReturn {
  devices: IoTDevice[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// -------- Data hook (unchanged) --------
const useIoTDevices = (): UseIoTDevicesReturn => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard/devices");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: ApiResponse = await res.json();
      if (data.success) setDevices(data.boxes || []);
      else {
        setError(data.error || "Failed to fetch device data");
        setDevices([]);
      }
    } catch (e) {
      setError(
        "Network error while fetching device data: " + (e as Error).message
      );
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const i = setInterval(fetchDevices, 30000);
    return () => clearInterval(i);
  }, []);

  return { devices, loading, error, refetch: fetchDevices };
};

// -------- Helpers --------
const toMarkers = (devices: IoTDevice[]): SensorMarker[] =>
  devices.map((d) => ({
    id: d.box_id,
    name: d.name || d.box_id,
    coordinates: [d.longitude, d.latitude],
    data: d.currentReadings
      ? {
          moisture: d.currentReadings.moisture,
          moisture1: d.currentReadings.moisture1,
          moisture2: d.currentReadings.moisture2,
          moisture3: d.currentReadings.moisture3,
          moisture4: d.currentReadings.moisture4,
          temperature: d.currentReadings.temperature,
          humidity: d.currentReadings.humidity,
          lipVoltage: d.currentReadings.lipVoltage,
          rtcBattery: d.currentReadings.rtcBattery,
          dataPoints: d.currentReadings.dataPoints,
        }
      : undefined,
  }));

export default function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [claiming, setClaiming] = useState(false);

  const { data: session, status } = useSession();
  const { devices, loading, error, refetch } = useIoTDevices();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) redirect("/auth/signin");
  }, [session, status]);

  useEffect(() => {
    const calc = () => {
      if (!scrollRef.current) return;
      const el = scrollRef.current.querySelector(".device-card");
      if (el)
        setCardWidth((el as HTMLElement).getBoundingClientRect().width + 16);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [devices]);

  const handleClaimDevice = async () => {
    if (!deviceId.trim()) return alert("Please enter a device ID");
    setClaiming(true);
    try {
      const res = await fetch("/api/devices/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: deviceId.trim() }),
      });
      const data: ClaimResponse = await res.json();
      if (data.success) {
        alert(`✅ Device claimed successfully!\n\n${data.message}`);
        setShowClaimModal(false);
        setDeviceId("");
        refetch();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch {
      alert("❌ Error claiming device. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (status === "loading" || loading) return <WaterDropLoader />;
  if (!session) return null;

  // metrics for Analytics card
  const total = devices.length;
  const online = devices.filter((d) => d.isOnline).length;
  const offline = total - online;
  const moistureDevices = devices.filter((d) => d.currentReadings);
  const avgMoisture =
    moistureDevices.length === 0
      ? 0
      : moistureDevices.reduce((sum, d) => {
          const r = d.currentReadings!;
          const val =
            typeof r.moisture === "number"
              ? r.moisture
              : (r.moisture1 + r.moisture2 + r.moisture3 + r.moisture4) / 4;
          return sum + val;
        }, 0) / moistureDevices.length;

  const markers = toMarkers(devices);

  const isAtStart = scrollPosition === 0;
  const isAtEnd = scrollPosition === Math.max(0, devices.length - 1);

  return (
    <div className="min-h-screen bg-white text-[#0B1B18]">
      <div className="px-4 sm:px-6 lg:px-10 xl:px-12 mx-auto w-full max-w-[1500px]">
        <Navbar />

        <main className="py-4 pt-[90px]">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 p-3 ">
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="font-lato text-[#254e3f] ">
                Welcome {session.user?.name || "User"}
              </span>
            </h1>

            <button
              onClick={() => setShowClaimModal(true)}
              className="flex items-center space-x-2 bg-[#2F6F5A] hover:bg-[#275e4c] text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Device</span>
            </button>
          </div>

          {/* GRID: left content (2 cols) + right sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT (2 cols): devices → map → graph */}
            <div className="lg:col-span-2 space-y-6">
              {/* Device carousel */}
              {devices.length > 0 && (
                <section className="relative">
                  <button
                    onClick={() => setScrollPosition((p) => Math.max(p - 1, 0))}
                    disabled={isAtStart}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 bg-white/70 text-[#0B1B18] p-2 rounded-full z-10 border border-[#E1EAE6] ${
                      isAtStart
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-white"
                    }`}
                    aria-label="Scroll Left"
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </button>

                  <div className="overflow-x-hidden">
                    <motion.div
                      ref={scrollRef}
                      className="flex space-x-4 will-change-transform"
                      style={{ transform: "translate3d(0,0,0)" }}
                      animate={{ x: -scrollPosition * cardWidth }}
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 20,
                        mass: 1,
                      }}
                    >
                      {devices.map((device) => {
                        const r = device.currentReadings;
                        const individualAvg = r
                          ? (
                              (r.moisture1 +
                                r.moisture2 +
                                r.moisture3 +
                                r.moisture4) /
                              4
                            ).toFixed(1)
                          : "N/A";
                        return (
                          <div
                            key={device.box_id}
                            className="device-card flex-shrink-0 w-80 rounded-2xl bg-[#f0f7f3] border border-[#C4D7CD] p-4 shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-lg font-semibold">
                                {device.name || device.box_id}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  device.isOnline
                                    ? "bg-[#E5F5EB] text-[#236E4E] border border-[#CBE9D6]"
                                    : "bg-[#FDECEC] text-[#7A1F1F] border border-[#F6CACA]"
                                }`}
                              >
                                {device.isOnline ? "Online" : "Offline"}
                              </span>
                            </div>
                            <p className="text-sm mb-1">
                              <span className="font-medium">Location:</span>{" "}
                              {device.location}
                            </p>
                            {r ? (
                              <>
                                {typeof r.moisture === "number" && (
                                  <p className="text-sm mb-1">
                                    <span className="font-medium">
                                      Overall Moisture:
                                    </span>{" "}
                                    {r.moisture.toFixed(1)}%
                                  </p>
                                )}
                                <p className="text-sm mb-1">
                                  <span className="font-medium">
                                    Avg Individual:
                                  </span>{" "}
                                  {individualAvg}%
                                </p>
                                <p className="text-sm mb-1">
                                  <span className="font-medium">
                                    Temperature:
                                  </span>{" "}
                                  {r.temperature.toFixed(1)}°C
                                </p>
                                <p className="text-sm mb-1">
                                  <span className="font-medium">Humidity:</span>{" "}
                                  {r.humidity.toFixed(1)}%
                                </p>
                                <p className="text-sm mb-1">
                                  <span className="font-medium">
                                    LiPo Battery:
                                  </span>{" "}
                                  {r.lipVoltage.toFixed(2)}V
                                </p>
                                <p className="text-sm mb-1">
                                  <span className="font-medium">
                                    RTC Battery:
                                  </span>{" "}
                                  {r.rtcBattery.toFixed(2)}V
                                </p>
                                {"dataPoints" in r && (
                                  <p className="text-sm">
                                    <span className="font-medium">
                                      Data Points:
                                    </span>{" "}
                                    {r.dataPoints}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-[#5a786c]">
                                No recent sensor data
                              </p>
                            )}
                            <p className="text-xs text-[#5a786c] mt-2">
                              Last seen:{" "}
                              {new Date(device.lastSeen).toLocaleString()}
                            </p>
                          </div>
                        );
                      })}
                    </motion.div>
                  </div>

                  <button
                    onClick={() =>
                      setScrollPosition((p) =>
                        Math.min(p + 1, Math.max(0, devices.length - 1))
                      )
                    }
                    disabled={isAtEnd}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 bg-white/70 text-[#0B1B18] p-2 rounded-full z-10 border border-[#E1EAE6] ${
                      isAtEnd
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-white"
                    }`}
                    aria-label="Scroll Right"
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </button>
                </section>
              )}

              {/* Map */}
              <section className="rounded-2xl bg-[#f0f7f3] border border-[#B6C9BF] p-4">
                <h2 className="text-xl font-semibold mb-3 text-[#0B1B18]">
                  Map
                </h2>
                {devices.length > 0 ? (
                  <MapboxMap sensors={markers} showLabels height="560px" />
                ) : (
                  <div className="rounded-xl bg-white/60 border border-[#E1EAE6] p-8 text-center">
                    <h3 className="text-lg font-semibold mb-2">Map View</h3>
                    <p className="text-[#5a786c]">
                      Map will show device locations once devices are added
                    </p>
                  </div>
                )}
              </section>

              {/* Graph / Analytics (chart area) */}
              <section className="rounded-2xl bg-[#f0f7f3] border border-[#C4D7CD] p-6">
                <h2 className="mb-4 text-xl font-lato font-bold text-[#0B1B18]">
                  Graph
                </h2>
                {devices.length > 0 && (
                  <SensorGraph
                    selectedBox={{
                      box_id: devices[0].box_id,
                      name: devices[0].name,
                      location: devices[0].location,
                      latitude: devices[0].latitude,
                      longitude: devices[0].longitude,
                      isOnline: devices[0].isOnline,
                      lastSeen: devices[0].lastSeen,
                      sensors: [
                        {
                          su_id: `${devices[0].box_id}_main_sensor`,
                          readings: devices[0].currentReadings
                            ? [
                                {
                                  moisture1:
                                    devices[0].currentReadings.moisture1,
                                  moisture2:
                                    devices[0].currentReadings.moisture2,
                                  moisture3:
                                    devices[0].currentReadings.moisture3,
                                  moisture4:
                                    devices[0].currentReadings.moisture4,
                                  temperature:
                                    devices[0].currentReadings.temperature,
                                  humidity: devices[0].currentReadings.humidity,
                                  battery1:
                                    devices[0].currentReadings.lipVoltage,
                                  battery2:
                                    devices[0].currentReadings.rtcBattery,
                                  timestamp: new Date().toISOString(),
                                },
                              ]
                            : [],
                        },
                      ],
                    }}
                  />
                )}
              </section>

              {/* Error / Empty states (optional) */}
              {error && (
                <div className="rounded-2xl bg-[#FDECEC] border border-[#F6CACA] text-[#7A1F1F] px-4 py-3">
                  Error loading device data: {error}
                </div>
              )}
              {devices.length === 0 && !error && (
                <div className="rounded-2xl bg-[#F4F7F6] border border-[#E7EEEB] p-8 text-center">
                  No devices yet. Use “Add Device” to claim one.
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: Weather + NEW Analytics card */}
            {/* RIGHT SIDEBAR: Weather + NEW Analytics cards */}
            <aside className="lg:col-span-1 space-y-6">
              {/* Analytics panel with card-style items */}
              <section className="rounded-2xl bg-[#f0f7f3] border border-[#E0EBE6] p-5">
                <h3 className="text-lg font-lato font-bold mb-4 text-[#0B1B18]">
                  Analytics
                </h3>

                <div className="space-y-4">
                  {/* Card 1: Total Devices */}
                  <div className="relative rounded-2xl bg-white border border-[#E6EFEA] shadow-sm p-5">
                    {/* icon */}
                    <div className="absolute right-4 top-4">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        className="text-transparent"
                        style={{
                          background:
                            "linear-gradient(90deg, #F05A28 0%, #7B61FF 50%, #1E40FF 100%)",
                          WebkitBackgroundClip: "text",
                        }}
                        fill="currentColor"
                      >
                        <path d="M7 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm5 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm5 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM7 13a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm5 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm5 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                      </svg>
                    </div>

                    <h4 className="font-lato text-2xl font-bold text-[#2E2F32] tracking-wide">
                      Total Devices
                    </h4>
                    <p className="mt-2 text-[#4B4F54]">
                      Count of devices connected to your workspace
                    </p>
                    <div className="mt-4 text-4xl font-lato font-bold text-[#1E6650]">
                      {total}
                    </div>

                    {/* gradient bar */}
                    <div className="mt-5 h-[3px] rounded-full bg-gradient-to-r from-[#F05A28] via-[#7B61FF] to-[#1E40FF]" />
                  </div>

                  {/* Card 2: Online */}
                  <div className="relative rounded-2xl bg-white border border-[#E6EFEA] shadow-sm p-5">
                    <div className="absolute right-4 top-4">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        className="text-transparent"
                        style={{
                          background:
                            "linear-gradient(90deg, #2F8F5A 0%, #7B61FF 60%, #1E40FF 100%)",
                          WebkitBackgroundClip: "text",
                        }}
                        fill="currentColor"
                      >
                        <path d="M12 3a9 9 0 1 0 .001 18.001A9 9 0 0 0 12 3Zm-1 13-4-4 1.414-1.414L11 12.172l4.586-4.586L17 9l-6 7z" />
                      </svg>
                    </div>

                    <h4 className="font-lato text-2xl font-bold text-[#2E2F32]">
                      Online
                    </h4>
                    <p className="mt-2 text-[#4B4F54]">
                      Devices currently reporting
                    </p>
                    <div className="mt-4 text-4xl font-lato font-bold text-[#2F8F5A]">
                      {online}
                    </div>

                    <div className="mt-5 h-[3px] rounded-full bg-gradient-to-r from-[#2F8F5A] via-[#7B61FF] to-[#1E40FF]" />
                  </div>

                  {/* Card 3: Offline */}
                  <div className="relative rounded-2xl bg-white border border-[#E6EFEA] shadow-sm p-5">
                    <div className="absolute right-4 top-4">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        className="text-transparent"
                        style={{
                          background:
                            "linear-gradient(90deg, #C14C4C 0%, #F05A28 50%, #7B61FF 100%)",
                          WebkitBackgroundClip: "text",
                        }}
                        fill="currentColor"
                      >
                        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Zm4.95 14.536-1.414 1.414L12 13.414l-3.536 3.536-1.414-1.414L10.586 12 7.05 8.464 8.464 7.05 12 10.586l3.536-3.536 1.414 1.414L13.414 12l3.536 3.536Z" />
                      </svg>
                    </div>

                    <h4 className="font-lato text-2xl font-bold text-[#2E2F32]">
                      Offline
                    </h4>
                    <p className="mt-2 text-[#4B4F54]">Devices not reporting</p>
                    <div className="mt-4 text-4xl font-lato font-bold text-[#C14C4C]">
                      {offline}
                    </div>

                    <div className="mt-5 h-[3px] rounded-full bg-gradient-to-r from-[#C14C4C] via-[#F05A28] to-[#7B61FF]" />
                  </div>

                  {/* Card 4: Avg Moisture */}
                  <div className="relative rounded-2xl bg-white border border-[#E6EFEA] shadow-sm p-5">
                    <div className="absolute right-4 top-4">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        className="text-transparent"
                        style={{
                          background:
                            "linear-gradient(90deg, #0FA3B1 0%, #7B61FF 60%, #1E40FF 100%)",
                          WebkitBackgroundClip: "text",
                        }}
                        fill="currentColor"
                      >
                        <path d="M12 2c3.5 3.9 7 7.6 7 11a7 7 0 1 1-14 0c0-3.4 3.5-7.1 7-11Zm0 18a5 5 0 0 0 5-5c0-2.2-2.2-4.9-5-8.1C9.2 10.1 7 12.8 7 15a5 5 0 0 0 5 5Z" />
                      </svg>
                    </div>

                    <h4 className="font-lato text-2xl font-bold text-[#2E2F32]">
                      Avg Moisture
                    </h4>
                    <p className="mt-2 text-[#4B4F54]">
                      Across reporting devices
                    </p>
                    <div className="mt-4 text-4xl font-lato font-bold text-[#0FA3B1]">
                      {Math.round(avgMoisture)}%
                    </div>

                    <div className="mt-5 h-[3px] rounded-full bg-gradient-to-r from-[#0FA3B1] via-[#7B61FF] to-[#1E40FF]" />
                  </div>
                </div>
              </section>

              {/* Weather panel (unchanged, already styled) */}
              <Weather />
            </aside>
          </div>
        </main>
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white text-[#0B1B18] border border-[#E1EAE6] rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Add Device</h3>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-[#536E65] hover:text-[#0B1B18]"
                aria-label="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">
                Device ID
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Enter device ID (e.g., GREENHOUSE_BOX_001)"
                className="w-full px-3 py-2 bg-white border border-[#D9E6E0] rounded-md placeholder-[#94A89F] focus:outline-none focus:ring-2 focus:ring-[#2F6F5A]"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowClaimModal(false)}
                className="flex-1 px-4 py-2 bg-[#EAF3EE] hover:bg-[#E4EFEA] text-[#0B1B18] border border-[#D7E7E0] rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimDevice}
                disabled={claiming}
                className="flex-1 px-4 py-2 bg-[#2F6F5A] hover:bg-[#275e4c] disabled:opacity-50 text-white rounded-md transition-colors"
              >
                {claiming ? "Adding..." : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
