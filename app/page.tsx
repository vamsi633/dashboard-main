"use client";

import Navbar from "@/components/Navbar";
import MapboxMap from "@/components/MapboxMap";
import Weather from "@/components/Weather";
import SensorGraph from "@/components/SensorGraph";
import { useState, useRef, useEffect, useCallback } from "react";
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
import Link from "next/link";

// -------- Types --------
interface IoTDevice {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen: string;

  farmId?: string | null;
  farmName?: string | null;

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

type Farm = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ListFarmsOk = { ok: true; farms: Farm[] };
type ListFarmsErr = { ok: false; error: string };
type ListFarmsResponse = ListFarmsOk | ListFarmsErr;

type CreateFarmOk = { ok: true; farm: Farm };
type CreateFarmErr = { ok: false; error: string };
type CreateFarmResponse = CreateFarmOk | CreateFarmErr;

type AssignFarmOk = { ok: true };
type AssignFarmErr = { ok: false; error: string };
type AssignFarmResponse = AssignFarmOk | AssignFarmErr;

interface UseIoTDevicesReturn {
  devices: IoTDevice[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

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

const NEW_FARM_VALUE = "__new_farm__";
const FILTER_ALL = "__all__";
const FILTER_UNASSIGNED = "__none__";

export default function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [claiming, setClaiming] = useState(false);

  // Farms state (for modal + filter)
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmsErr, setFarmsErr] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");

  // Dashboard filter
  const [farmFilter, setFarmFilter] = useState<string>(FILTER_ALL);

  // Inline create farm (modal)
  const [creatingFarm, setCreatingFarm] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmLocation, setNewFarmLocation] = useState("");
  const [newFarmDescription, setNewFarmDescription] = useState("");

  // Assign existing device to farm
  const [assigningDeviceId, setAssigningDeviceId] = useState<string | null>(
    null
  );

  const { data: session, status } = useSession();

  // -------- Devices hook (now respects farmFilter) --------
  const useIoTDevices = (): UseIoTDevicesReturn => {
    const [devices, setDevices] = useState<IoTDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDevices = async () => {
      try {
        setError(null);

        const url =
          farmFilter === FILTER_ALL
            ? "/api/dashboard/devices"
            : `/api/dashboard/devices?farmId=${encodeURIComponent(farmFilter)}`;

        const res = await fetch(url, { cache: "no-store" });
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [farmFilter]);

    return { devices, loading, error, refetch: fetchDevices };
  };

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

  const loadFarms = useCallback(async () => {
    setFarmsErr(null);
    setFarmsLoading(true);
    try {
      const res = await fetch("/api/farms", { cache: "no-store" });
      const json: ListFarmsResponse = await res.json();

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error : "Failed to load farms";
        setFarmsErr(msg);
        setFarms([]);
        setSelectedFarmId("");
        return;
      }

      setFarms(json.farms ?? []);
      if ((json.farms ?? []).length > 0) {
        setSelectedFarmId((prev) => prev || json.farms[0].id);
      } else {
        setSelectedFarmId(NEW_FARM_VALUE);
      }
    } catch {
      setFarmsErr("Network error while loading farms");
      setFarms([]);
      setSelectedFarmId("");
    } finally {
      setFarmsLoading(false);
    }
  }, []);

  // Load farms once for the dashboard filter
  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  const openClaimModal = async () => {
    setShowClaimModal(true);
    await loadFarms();
  };

  const resetNewFarmFields = () => {
    setNewFarmName("");
    setNewFarmLocation("");
    setNewFarmDescription("");
  };

  const handleCreateFarmInline = async () => {
    const name = newFarmName.trim();
    if (name.length < 2) {
      alert("Farm name must be at least 2 characters");
      return;
    }

    setCreatingFarm(true);
    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location: newFarmLocation.trim() || undefined,
          description: newFarmDescription.trim() || undefined,
        }),
      });

      const json: CreateFarmResponse = await res.json();

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error : "Failed to create farm";
        alert(`❌ ${msg}`);
        return;
      }

      setFarms((prev) => [json.farm, ...prev]);
      setSelectedFarmId(json.farm.id);
      resetNewFarmFields();

      // If user had "unassigned" selected, keep it. Otherwise switch to new farm is optional.
    } catch {
      alert("❌ Network error while creating farm");
    } finally {
      setCreatingFarm(false);
    }
  };

  const handleClaimDevice = async () => {
    if (!deviceId.trim()) return alert("Please enter a device ID");
    if (!selectedFarmId) return alert("Please select a farm");
    if (selectedFarmId === NEW_FARM_VALUE) {
      return alert("Please create a farm first (or select an existing one).");
    }

    setClaiming(true);
    try {
      const res = await fetch("/api/devices/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceId.trim(),
          farmId: selectedFarmId,
        }),
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

  const handleAssignExistingDeviceToFarm = async (
    deviceIdToAssign: string,
    farmIdToAssign: string
  ) => {
    if (!farmIdToAssign) return;

    setAssigningDeviceId(deviceIdToAssign);
    try {
      const res = await fetch("/api/devices/assign-farm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceIdToAssign,
          farmId: farmIdToAssign,
        }),
      });

      const json: AssignFarmResponse = await res.json();
      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error : "Failed to assign farm";
        alert(`❌ ${msg}`);
        return;
      }

      // Refresh devices so farmName appears
      await refetch();
    } catch {
      alert("❌ Network error while assigning farm");
    } finally {
      setAssigningDeviceId(null);
    }
  };

  if (status === "loading" || loading) return <WaterDropLoader />;
  if (!session) return null;

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
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6 p-3">
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="font-lato text-[#254e3f] ">
                Welcome {session.user?.name || "User"}
              </span>
            </h1>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* Farm filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#254e3f]">
                  Filter:
                </span>
                <select
                  value={farmFilter}
                  onChange={(e) => {
                    setFarmFilter(e.target.value);
                    setScrollPosition(0);
                  }}
                  className="px-3 py-2 bg-white border border-[#D9E6E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2F6F5A]"
                >
                  <option value={FILTER_ALL}>All farms</option>
                  <option value={FILTER_UNASSIGNED}>Unassigned devices</option>
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>

                {/* <Link
                  href="/farms"
                  className="text-sm underline text-[#2F6F5A]"
                >
                  Manage farms
                </Link> */}
              </div>

              {/* Add Device */}
              <button
                onClick={openClaimModal}
                className="flex items-center justify-center space-x-2 bg-[#2F6F5A] hover:bg-[#275e4c] text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Device</span>
              </button>
            </div>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

                        const needsFarm = !device.farmId;

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
                              <span className="font-medium">Farm:</span>{" "}
                              {device.farmName ? device.farmName : "—"}
                            </p>

                            {/* Assign farm for existing claimed devices (missing farmId) */}
                            {needsFarm && farms.length > 0 && (
                              <div className="mt-2">
                                <label className="block text-xs font-medium mb-1">
                                  Assign to farm
                                </label>
                                <select
                                  disabled={assigningDeviceId === device.box_id}
                                  defaultValue=""
                                  onChange={(e) => {
                                    const farmIdToAssign = e.target.value;
                                    if (!farmIdToAssign) return;
                                    handleAssignExistingDeviceToFarm(
                                      device.box_id,
                                      farmIdToAssign
                                    );
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-[#D9E6E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2F6F5A]"
                                >
                                  <option value="">Select a farm…</option>
                                  {farms.map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name}
                                    </option>
                                  ))}
                                </select>
                                {assigningDeviceId === device.box_id && (
                                  <p className="text-xs text-[#5a786c] mt-1">
                                    Assigning…
                                  </p>
                                )}
                              </div>
                            )}

                            <p className="text-sm mt-3 mb-1">
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

              {/* Graph */}
              {/* Graph */}
              <section className="rounded-2xl bg-[#f0f7f3] border border-[#C4D7CD] p-6">
                <h2 className="mb-4 text-xl font-lato font-bold text-[#0B1B18]">
                  Graph
                </h2>

                {devices.length > 0 && (
                  <SensorGraph
                    selectedBox={{
                      // keep the "box" metadata stable (use the first device just as a container)
                      box_id: "ALL_DEVICES",
                      name: "All Sensors",
                      location: "All Farms",
                      latitude: devices[0].latitude,
                      longitude: devices[0].longitude,
                      isOnline: devices.some((d) => d.isOnline),
                      lastSeen: new Date(
                        Math.max(
                          ...devices.map((d) => new Date(d.lastSeen).getTime())
                        )
                      ).toISOString(),

                      // ✅ THIS is the important part: build sensors[] from ALL devices
                      sensors: devices.map((d) => ({
                        su_id: d.box_id, // one sensor-series per device (box)
                        readings: d.currentReadings
                          ? [
                              {
                                moisture1: d.currentReadings.moisture1,
                                moisture2: d.currentReadings.moisture2,
                                moisture3: d.currentReadings.moisture3,
                                moisture4: d.currentReadings.moisture4,
                                temperature: d.currentReadings.temperature,
                                humidity: d.currentReadings.humidity,
                                battery1: d.currentReadings.lipVoltage,
                                battery2: d.currentReadings.rtcBattery,
                                timestamp:
                                  d.lastSeen || new Date().toISOString(),
                              },
                            ]
                          : [],
                      })),
                    }}
                  />
                )}
              </section>

              {error && (
                <div className="rounded-2xl bg-[#FDECEC] border border-[#F6CACA] text-[#7A1F1F] px-4 py-3">
                  Error loading device data: {error}
                </div>
              )}
              {devices.length === 0 && !error && (
                <div className="rounded-2xl bg-[#F4F7F6] border border-[#E7EEEB] p-8 text-center">
                  No devices for this filter. Use “Add Device” to claim one.
                </div>
              )}
            </div>

            {/* RIGHT */}
            <aside className="lg:col-span-1 space-y-6">
              <section className="rounded-2xl bg-[#f0f7f3] border border-[#E0EBE6] p-5">
                <h3 className="text-lg font-lato font-bold mb-4 text-[#0B1B18]">
                  Analytics
                </h3>

                <div className="space-y-4">
                  <div className="relative rounded-2xl bg-white border border-[#E6EFEA] shadow-sm p-5">
                    <h4 className="font-lato text-2xl font-bold text-[#2E2F32] tracking-wide">
                      Total Devices
                    </h4>
                    <p className="mt-2 text-[#4B4F54]">
                      Count of devices connected to your workspace
                    </p>
                    <div className="mt-4 text-4xl font-lato font-bold text-[#1E6650]">
                      {total}
                    </div>
                    <div className="mt-5 h-[3px] rounded-full bg-gradient-to-r from-[#F05A28] via-[#7B61FF] to-[#1E40FF]" />
                  </div>

                  <div className="relative rounded-2xl bg-white border border-[#E6EFEA] shadow-sm p-5">
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

                  <div className="relative rounded-2xl bg-white border border-[#E6EFEA] shadow-sm p-5">
                    <h4 className="font-lato text-2xl font-bold text-[#2E2F32]">
                      Offline
                    </h4>
                    <p className="mt-2 text-[#4B4F54]">Devices not reporting</p>
                    <div className="mt-4 text-4xl font-lato font-bold text-[#C14C4C]">
                      {offline}
                    </div>
                    <div className="mt-5 h-[3px] rounded-full bg-gradient-to-r from-[#C14C4C] via-[#F05A28] to-[#7B61FF]" />
                  </div>

                  <div className="relative rounded-2xl bg-white border border-[#E6EFEA] shadow-sm p-5">
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
              <h3 className="text-2xl font-semibold">Add Device</h3>
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setDeviceId("");
                }}
                className="text-[#536E65] hover:text-[#0B1B18]"
                aria-label="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {farmsLoading && (
              <p className="text-sm text-[#5a786c] mb-3">Loading farms…</p>
            )}
            {farmsErr && (
              <p className="text-sm text-red-600 mb-3">{farmsErr}</p>
            )}

            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">Farm</label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#D9E6E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2F6F5A]"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                <option value={NEW_FARM_VALUE}>➕ Create new farm…</option>
              </select>

              <div className="mt-2 text-xs text-[#5a786c]">
                Manage farms in{" "}
                <Link href="/farms" className="underline text-[#2F6F5A]">
                  /farms
                </Link>
              </div>
            </div>

            {selectedFarmId === NEW_FARM_VALUE && (
              <div className="mb-5 rounded-xl border border-[#D9E6E0] bg-[#F4F7F6] p-4">
                <div className="text-sm font-semibold mb-3">
                  Create a new farm
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Farm Name *
                    </label>
                    <input
                      value={newFarmName}
                      onChange={(e) => setNewFarmName(e.target.value)}
                      placeholder="e.g., Veggielution Community Farm"
                      className="w-full px-3 py-2 bg-white border border-[#D9E6E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2F6F5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Location (optional)
                    </label>
                    <input
                      value={newFarmLocation}
                      onChange={(e) => setNewFarmLocation(e.target.value)}
                      placeholder="e.g., San Jose, CA"
                      className="w-full px-3 py-2 bg-white border border-[#D9E6E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2F6F5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={newFarmDescription}
                      onChange={(e) => setNewFarmDescription(e.target.value)}
                      placeholder="Short notes about this farm…"
                      className="w-full px-3 py-2 bg-white border border-[#D9E6E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2F6F5A]"
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={handleCreateFarmInline}
                    disabled={creatingFarm}
                    className="w-full px-4 py-2 bg-[#2F6F5A] hover:bg-[#275e4c] disabled:opacity-50 text-white rounded-md transition-colors"
                  >
                    {creatingFarm ? "Creating..." : "Create Farm"}
                  </button>
                </div>
              </div>
            )}

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
                disabled={claiming || selectedFarmId === NEW_FARM_VALUE}
                className="flex-1 px-4 py-2 bg-[#2F6F5A] hover:bg-[#275e4c] disabled:opacity-50 text-white rounded-md transition-colors"
              >
                {claiming ? "Adding..." : "Add Device"}
              </button>
            </div>

            {selectedFarmId === NEW_FARM_VALUE && (
              <p className="mt-3 text-xs text-[#5a786c]">
                Create the farm first, then you can claim the device into it.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
