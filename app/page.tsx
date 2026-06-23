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
  ChevronDownIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import WaterDropLoader from "@/components/WaterDropLoader";
import Link from "next/link";

// -------- Types (unchanged) --------
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

// -------- Helpers (unchanged) --------
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function batteryLabel(v: number): { text: string; color: string; pct: number } {
  const pct = Math.max(0, Math.min(100, ((v - 3.0) / 1.2) * 100));
  if (pct > 60) return { text: "Good", color: "#3D6B3D", pct };
  if (pct > 25) return { text: "Fair", color: "#D98A2B", pct };
  return { text: "Low", color: "#B5452D", pct };
}
function getMoistureVal(r: IoTDevice["currentReadings"]): number {
  if (!r) return 0;
  return typeof r.moisture === "number"
    ? r.moisture
    : (r.moisture1 + r.moisture2 + r.moisture3 + r.moisture4) / 4;
}

/* ═══ ALERTS PANEL ═══ */
function AlertsPanel({ devices }: { devices: IoTDevice[] }) {
  const alerts: {
    type: "warn" | "danger" | "info" | "ok";
    title: string;
    body: string;
    time: string;
    icon: React.ReactNode;
  }[] = [];
  devices
    .filter((d) => !d.isOnline)
    .forEach((d) => {
      alerts.push({
        type: "danger",
        title: `${d.name || d.box_id} hasn't checked in`,
        body: `${d.farmName || d.location} · Last heard ${timeAgo(
          d.lastSeen
        )}. Could be antenna or battery.`,
        time: `Silent ${timeAgo(d.lastSeen)}`,
        icon: (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        ),
      });
    });
  devices
    .filter(
      (d) =>
        d.currentReadings && batteryLabel(d.currentReadings.lipVoltage).pct < 30
    )
    .forEach((d) => {
      const bl = batteryLabel(d.currentReadings!.lipVoltage);
      alerts.push({
        type: "warn",
        title: `${d.name || d.box_id} battery is low`,
        body: `${d.farmName || d.location} · ~${Math.round(
          bl.pct
        )}% left. Swap soon.`,
        time: `${d.currentReadings!.lipVoltage.toFixed(2)}V`,
        icon: (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="6" width="18" height="12" rx="2" />
            <line x1="23" y1="13" x2="23" y2="11" />
          </svg>
        ),
      });
    });
  devices
    .filter((d) => d.currentReadings && getMoistureVal(d.currentReadings) < 25)
    .forEach((d) => {
      alerts.push({
        type: "info",
        title: `${d.name || d.box_id} soil is drying out`,
        body: `Moisture at ${getMoistureVal(d.currentReadings).toFixed(
          1
        )}%. Irrigation would help.`,
        time: `Current`,
        icon: (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2.5s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z" />
          </svg>
        ),
      });
    });
  const ok = devices.filter(
    (d) =>
      d.isOnline &&
      d.currentReadings &&
      batteryLabel(d.currentReadings.lipVoltage).pct >= 30 &&
      getMoistureVal(d.currentReadings) >= 25
  ).length;
  if (ok > 0)
    alerts.push({
      type: "ok",
      title: `${ok} station${ok > 1 ? "s" : ""} running well`,
      body: `Sensors reporting, batteries healthy, moisture good.`,
      time: `Updated just now`,
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
    });

  const bg: Record<string, string> = {
    warn: "rgba(240,223,202,0.7)",
    danger: "rgba(240,212,212,0.7)",
    info: "rgba(208,222,232,0.7)",
    ok: "rgba(208,224,228,0.5)",
  };
  const bd: Record<string, string> = {
    warn: "#F0DBB4",
    danger: "#E8C3B5",
    info: "#B8D4E8",
    ok: "#E5DBC6",
  };
  const ibg: Record<string, string> = {
    warn: "#F6E1C0",
    danger: "#F0D1C5",
    info: "#D5E5F0",
    ok: "#D4EDDA",
  };
  const ic: Record<string, string> = {
    warn: "#D98A2B",
    danger: "#B5452D",
    info: "#4A7FA5",
    ok: "#3D6B3D",
  };

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex gap-3.5 p-4 rounded-2xl"
          style={{ background: bg[a.type], border: `1px solid ${bd[a.type]}` }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: ibg[a.type], color: ic[a.type] }}
          >
            {a.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm" style={{ color: "#1E2A1F" }}>
              {a.title}
            </div>
            <div
              className="text-[13px] mt-0.5 leading-relaxed"
              style={{ color: "#4A5A4C" }}
            >
              {a.body}
            </div>
            <div className="text-[11px] mt-1" style={{ color: "#88968C" }}>
              {a.time}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════ MAIN ═══════════════════════ */
export default function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmsErr, setFarmsErr] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [farmFilter, setFarmFilter] = useState<string>(FILTER_ALL);
  const [creatingFarm, setCreatingFarm] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmLocation, setNewFarmLocation] = useState("");
  const [newFarmDescription, setNewFarmDescription] = useState("");
  const [assigningDeviceId, setAssigningDeviceId] = useState<string | null>(
    null
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();

  // ── Devices hook ──
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiResponse = await res.json();
        if (data.success) setDevices(data.boxes || []);
        else {
          setError(data.error || "Failed");
          setDevices([]);
        }
      } catch (e) {
        setError("Network error: " + (e as Error).message);
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      fetchDevices();
      const i = setInterval(fetchDevices, 30000);
      return () => clearInterval(i);
    }, [farmFilter]); // eslint-disable-line
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
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadFarms = useCallback(async () => {
    setFarmsErr(null);
    setFarmsLoading(true);
    try {
      const res = await fetch("/api/farms", { cache: "no-store" });
      const json: ListFarmsResponse = await res.json();
      if (!res.ok || !json.ok) {
        setFarmsErr(!json.ok ? json.error : "Failed");
        setFarms([]);
        setSelectedFarmId("");
        return;
      }
      setFarms(json.farms ?? []);
      if ((json.farms ?? []).length > 0)
        setSelectedFarmId((p) => p || json.farms[0].id);
      else setSelectedFarmId(NEW_FARM_VALUE);
    } catch {
      setFarmsErr("Network error");
      setFarms([]);
      setSelectedFarmId("");
    } finally {
      setFarmsLoading(false);
    }
  }, []);
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
        alert(`Error: ${!json.ok ? json.error : "Failed"}`);
        return;
      }
      setFarms((p) => [json.farm, ...p]);
      setSelectedFarmId(json.farm.id);
      resetNewFarmFields();
    } catch {
      alert("Network error");
    } finally {
      setCreatingFarm(false);
    }
  };
  const handleClaimDevice = async () => {
    if (!deviceId.trim()) return alert("Enter a device ID");
    if (!selectedFarmId) return alert("Select a farm");
    if (selectedFarmId === NEW_FARM_VALUE) return alert("Create farm first.");
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
        alert(`Claimed!\n\n${data.message}`);
        setShowClaimModal(false);
        setDeviceId("");
        refetch();
      } else alert(`Error: ${data.error}`);
    } catch {
      alert("Error claiming.");
    } finally {
      setClaiming(false);
    }
  };
  const handleAssignExistingDeviceToFarm = async (did: string, fid: string) => {
    if (!fid) return;
    setAssigningDeviceId(did);
    try {
      const res = await fetch("/api/devices/assign-farm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: did, farmId: fid }),
      });
      const json: AssignFarmResponse = await res.json();
      if (!res.ok || !json.ok) {
        alert(`Error: ${!json.ok ? json.error : "Failed"}`);
        return;
      }
      await refetch();
    } catch {
      alert("Network error");
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
      : moistureDevices.reduce(
          (s, d) => s + getMoistureVal(d.currentReadings),
          0
        ) / moistureDevices.length;
  const avgTemp =
    moistureDevices.length === 0
      ? 0
      : moistureDevices.reduce(
          (s, d) => s + d.currentReadings!.temperature,
          0
        ) / moistureDevices.length;
  const avgHumidity =
    moistureDevices.length === 0
      ? 0
      : moistureDevices.reduce((s, d) => s + d.currentReadings!.humidity, 0) /
        moistureDevices.length;
  const markers = toMarkers(devices);
  const isAtStart = scrollPosition === 0;
  const isAtEnd = scrollPosition === Math.max(0, devices.length - 1);

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon "
      : "Good evening ";
  const tips: string[] = [];
  if (avgMoisture > 0 && avgMoisture < 30)
    tips.push("Soil moisture is low — run irrigation today.");
  if (avgTemp > 35) tips.push("Temps are high — open greenhouse vents.");
  if (offline > 0)
    tips.push(
      `${offline} station${offline > 1 ? "s" : ""} offline — worth a check.`
    );
  const lowBat = devices.filter(
    (d) =>
      d.currentReadings && batteryLabel(d.currentReadings.lipVoltage).pct < 30
  );
  if (lowBat.length > 0)
    tips.push(
      `${lowBat[0].name || lowBat[0].box_id} battery is low — swap soon.`
    );
  if (tips.length === 0) tips.push("All sensors healthy and readings normal.");

  return (
    <div className="min-h-screen" style={{ background: "#F2F5F3" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=DM+Sans:opsz,wght@9..40,300..700&display=swap');
        .font-display { font-family: 'Fraunces', serif; font-variation-settings: 'opsz' 144, 'SOFT' 30; }
        .font-display-soft { font-family: 'Fraunces', serif; font-variation-settings: 'opsz' 144, 'SOFT' 60; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(2); opacity: 0; } }
        .pulse-ring::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid currentColor; animation: pulse-ring 2s ease-out infinite; }
        .grain-bg { background-image: radial-gradient(circle at 15% 10%, rgba(181,69,45,0.03), transparent 40%), radial-gradient(circle at 85% 90%, rgba(61,107,61,0.05), transparent 40%), radial-gradient(circle at 60% 40%, rgba(74,127,165,0.03), transparent 45%); }
        .battery-fill-animate { transition: width 0.8s ease; }
        .card-base { background: #FDFBF5; border: 1px solid #E5DBC6; box-shadow: 0 1px 0 rgba(30,42,31,0.04), 0 8px 24px -12px rgba(30,42,31,0.1); }
      `}</style>

      <div className="px-4 sm:px-6 lg:px-10 xl:px-12 mx-auto w-full max-w-[1500px] grain-bg font-body">
        <Navbar />
        <main className="py-4 pt-[84px]" style={{ color: "#1E2A1F" }}>
          {/* ═══ 1. HERO + ADVICE ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-3 rounded-3xl p-8 sm:p-10 card-base relative"
            >
              <div
                className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(208,224,228,0.4) 0%, transparent 70%)",
                }}
              />
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-5 relative"
                style={{
                  background: online === total ? "#D4EDDA" : "#F6E1C0",
                  color: online === total ? "#276838" : "#D98A2B",
                }}
              >
                <span
                  className="relative w-2 h-2 rounded-full pulse-ring"
                  style={{
                    background: "currentColor",
                    color: online === total ? "#3D6B3D" : "#D98A2B",
                  }}
                />
                {online === total
                  ? "All stations reporting in"
                  : `${offline} station${
                      offline > 1 ? "s" : ""
                    } need attention`}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-[44px] leading-[1.1] tracking-tight mb-4">
                {greeting},{" "}
                <span
                  className="italic font-display-soft"
                  style={{ color: "#25421F" }}
                >
                  {session.user?.name || "User"}
                </span>
                .
                <br />
                <span className="text-[0.85em]">
                  {online === total ? (
                    <>
                      Your fields are{" "}
                      <em
                        className="font-display-soft"
                        style={{ color: "#3D6B3D" }}
                      >
                        looking happy
                      </em>{" "}
                      today.
                    </>
                  ) : (
                    <>
                      A few things need your{" "}
                      <em
                        className="font-display-soft"
                        style={{ color: "#D98A2B" }}
                      >
                        attention
                      </em>
                      .
                    </>
                  )}
                </span>
              </h1>
              <p
                className="text-sm leading-relaxed max-w-xl relative"
                style={{ color: "#4A5A4C" }}
              >
                {online} of {total} stations online
                {offline > 0 ? `. ${offline} need a check.` : " and healthy."}
                {avgMoisture > 0 &&
                  ` Avg soil moisture ${Math.round(avgMoisture)}%.`}
              </p>
              <div className="flex gap-3 mt-6 flex-wrap relative">
                {/* Custom filter dropdown */}
                <div className="flex items-center gap-2" ref={filterRef}>
                  <span
                    className="text-[11px] font-medium uppercase tracking-[0.1em]"
                    style={{ color: "#88968C" }}
                  >
                    Filter
                  </span>
                  <div className="relative z-40">
                    <button
                      onClick={() => setFilterOpen((v) => !v)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:-translate-y-px"
                      style={{
                        background: "#FDFBF5",
                        border: "1px solid #E5DBC6",
                        color: "#1E2A1F",
                        minWidth: 160,
                      }}
                    >
                      <span className="truncate">
                        {farmFilter === FILTER_ALL
                          ? "All farms"
                          : farmFilter === FILTER_UNASSIGNED
                          ? "Unassigned"
                          : farms.find((f) => f.id === farmFilter)?.name ||
                            "All farms"}
                      </span>
                      <ChevronDownIcon
                        className="h-3.5 w-3.5 ml-auto flex-shrink-0 transition-transform"
                        style={{
                          color: "#88968C",
                          transform: filterOpen ? "rotate(180deg)" : "",
                        }}
                      />
                    </button>

                    {filterOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 top-full mt-2 w-56 rounded-xl py-1 z-30"
                        style={{
                          background: "#FDFBF5",
                          border: "1px solid #E5DBC6",
                          boxShadow: "0 12px 32px -8px rgba(26,43,58,0.2)",
                        }}
                      >
                        {[
                          { value: FILTER_ALL, label: "All farms" },
                          {
                            value: FILTER_UNASSIGNED,
                            label: "Unassigned devices",
                          },
                          ...farms.map((f) => ({ value: f.id, label: f.name })),
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setFarmFilter(opt.value);
                              setScrollPosition(0);
                              setFilterOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#F2F5F3]"
                            style={{
                              color:
                                farmFilter === opt.value
                                  ? "#25421F"
                                  : "#4A5A4C",
                              fontWeight: farmFilter === opt.value ? 500 : 400,
                            }}
                          >
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                border: `1.5px solid ${
                                  farmFilter === opt.value
                                    ? "#3D6B3D"
                                    : "#E5DBC6"
                                }`,
                                background:
                                  farmFilter === opt.value
                                    ? "#3D6B3D"
                                    : "transparent",
                              }}
                            >
                              {farmFilter === opt.value && (
                                <svg
                                  className="w-2.5 h-2.5 text-white"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M2 6l3 3 5-5" />
                                </svg>
                              )}
                            </span>
                            <span className="truncate">{opt.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>
                <button
                  onClick={openClaimModal}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all hover:-translate-y-px"
                  style={{
                    background: "#88968C",
                    color: "#FDFBF5",
                    boxShadow: "0 4px 12px -4px rgba(136,150,140,0.4)",
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Device
                </button>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="lg:col-span-2 rounded-3xl p-7 relative overflow-hidden"
              style={{ background: "#1E3A2F", color: "#FDFBF5" }}
            >
              <div
                className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(193,122,53,0.12) 0%, transparent 70%)",
                }}
              />
              <div
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] mb-4 relative"
                style={{ color: "#E6B325" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
                </svg>
                Today&apos;s advice
              </div>
              <ul className="space-y-4 relative">
                {tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[13.5px] leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                      style={{
                        background: "rgba(193,122,53,0.15)",
                        color: "#E6B325",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* ═══ 2. SUMMARY STATS ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "Avg. Temperature",
                value: avgTemp.toFixed(1),
                unit: "°C",
                desc:
                  moistureDevices.length > 0
                    ? `Across ${moistureDevices.length} stations`
                    : "No data",
                color: "#B5452D",
                bg: "#F0D1C5",
                icon: (
                  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                ),
              },
              {
                label: "Avg. Humidity",
                value: `${Math.round(avgHumidity)}`,
                unit: "%",
                desc:
                  avgHumidity > 70
                    ? "High"
                    : avgHumidity < 30
                    ? "Low"
                    : "Comfortable range",
                color: "#4A7FA5",
                bg: "#D5E5F0",
                icon: (
                  <path d="M12 2c3 4 6 8 6 12a6 6 0 1 1-12 0c0-4 3-8 6-12z" />
                ),
              },
              {
                label: "Avg. Soil Moisture",
                value: `${Math.round(avgMoisture)}`,
                unit: "%",
                desc: avgMoisture < 30 ? "Dry — irrigate" : "Healthy",
                color: "#88968C",
                bg: "#D8E2CC",
                icon: <path d="M3 17h18M5 13h14M7 9h10M9 5h6" />,
              },
              {
                label: "Stations Online",
                value: `${online}`,
                unit: `/${total}`,
                desc:
                  offline === 0 ? "All healthy" : `${offline} need attention`,
                color: "#D98A2B",
                bg: "#F6E1C0",
                icon: <path d="M2 12h4M10 6v12M14 3v18M18 9v6" />,
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04 }}
                className="rounded-2xl p-5 card-base"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: s.bg, color: s.color }}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {s.icon}
                  </svg>
                </div>
                <div
                  className="text-[10px] uppercase tracking-[0.1em] mb-1"
                  style={{ color: "#88968C" }}
                >
                  {s.label}
                </div>
                <div className="font-display text-4xl tracking-tight">
                  {s.value}
                  <span
                    className="text-lg ml-0.5"
                    style={{ color: "#88968C", fontFamily: "'DM Sans'" }}
                  >
                    {s.unit}
                  </span>
                </div>
                <p className="mt-2 text-xs" style={{ color: "#4A5A4C" }}>
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* ═══ 3. STATION CARDS (full width) ═══ */}
          {devices.length > 0 ? (
            <section className="relative mb-6">
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <h2 className="font-display text-2xl tracking-tight">
                    Each{" "}
                    <span
                      className="italic font-display-soft"
                      style={{ color: "#3D6B3D" }}
                    >
                      station
                    </span>
                    , up close
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "#88968C" }}>
                    Live readings from across the farm
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScrollPosition((p) => Math.max(p - 1, 0))}
                    disabled={isAtStart}
                    className={`w-9 h-9 flex items-center justify-center rounded-full ${
                      isAtStart
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:-translate-y-px"
                    }`}
                    style={{
                      background: "#FDFBF5",
                      border: "1px solid #E5DBC6",
                    }}
                    aria-label="Left"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setScrollPosition((p) =>
                        Math.min(p + 1, Math.max(0, devices.length - 1))
                      )
                    }
                    disabled={isAtEnd}
                    className={`w-9 h-9 flex items-center justify-center rounded-full ${
                      isAtEnd
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:-translate-y-px"
                    }`}
                    style={{
                      background: "#FDFBF5",
                      border: "1px solid #E5DBC6",
                    }}
                    aria-label="Right"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
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
                    const moistureVal = r
                      ? typeof r.moisture === "number"
                        ? r.moisture
                        : (r.moisture1 +
                            r.moisture2 +
                            r.moisture3 +
                            r.moisture4) /
                          4
                      : 0;
                    const moistureStatus =
                      moistureVal < 25
                        ? "Dry — irrigate"
                        : moistureVal < 40
                        ? "Moderate"
                        : "Healthy";
                    const moistureColor =
                      moistureVal < 25
                        ? "#B5452D"
                        : moistureVal < 40
                        ? "#D98A2B"
                        : "#3D6B3D";
                    const needsFarm = !device.farmId;
                    const bat = r ? batteryLabel(r.lipVoltage) : null;
                    return (
                      <div
                        key={device.box_id}
                        className="device-card flex-shrink-0 w-72 rounded-2xl relative overflow-hidden transition-all hover:-translate-y-1 cursor-pointer card-base"
                        style={{
                          borderLeftWidth: 3,
                          borderLeftColor: device.isOnline
                            ? "#3D6B3D"
                            : "#B5452D",
                        }}
                      >
                        {/* Header */}
                        <div className="flex justify-between items-start p-4 pb-2">
                          <div className="min-w-0">
                            <h3 className="font-display text-[17px] font-medium tracking-tight truncate">
                              {device.name || device.box_id}
                            </h3>
                            <p
                              className="text-[11px] mt-0.5 truncate"
                              style={{ color: "#88968C" }}
                            >
                              {device.farmName || "No farm"} · {device.location}
                            </p>
                          </div>
                          <span
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0 ml-2"
                            style={{
                              background: device.isOnline
                                ? "#D4EDDA"
                                : "#F0D1C5",
                              color: device.isOnline ? "#276838" : "#B5452D",
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block"
                              style={{
                                background: device.isOnline
                                  ? "#3D6B3D"
                                  : "#B5452D",
                              }}
                            />
                            {device.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>

                        {needsFarm && farms.length > 0 && (
                          <div
                            className="mx-4 mb-2 p-3 rounded-xl"
                            style={{
                              background: "#F2F5F3",
                              border: "1px solid #E5DBC6",
                            }}
                          >
                            <label
                              className="block text-[11px] font-medium uppercase tracking-wider mb-1.5"
                              style={{ color: "#88968C" }}
                            >
                              Assign to farm
                            </label>
                            <select
                              disabled={assigningDeviceId === device.box_id}
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value)
                                  handleAssignExistingDeviceToFarm(
                                    device.box_id,
                                    e.target.value
                                  );
                              }}
                              className="w-full px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                              style={{
                                background: "#FDFBF5",
                                border: "1px solid #E5DBC6",
                              }}
                            >
                              <option value="">Select…</option>
                              {farms.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                            {assigningDeviceId === device.box_id && (
                              <p
                                className="text-[11px] mt-1"
                                style={{ color: "#88968C" }}
                              >
                                Assigning…
                              </p>
                            )}
                          </div>
                        )}

                        {r ? (
                          <>
                            {/* Moisture hero */}
                            <div className="text-center px-4 pt-2 pb-3">
                              <div
                                className="text-[10px] uppercase tracking-[0.12em] mb-1"
                                style={{ color: "#88968C" }}
                              >
                                Soil Moisture
                              </div>
                              <div
                                className="font-display text-[42px] leading-none tracking-tight"
                                style={{ color: "#1E2A1F" }}
                              >
                                {typeof r.moisture === "number"
                                  ? r.moisture.toFixed(1)
                                  : individualAvg}
                                <span
                                  className="text-lg"
                                  style={{
                                    color: "#88968C",
                                    fontFamily: "'DM Sans'",
                                  }}
                                >
                                  %
                                </span>
                              </div>
                              <div
                                className="text-[12px] font-medium mt-1"
                                style={{ color: moistureColor }}
                              >
                                {moistureStatus}
                              </div>
                              <div
                                className="mt-2 h-2 rounded-full overflow-hidden mx-auto max-w-[200px]"
                                style={{ background: "#E5DBC6" }}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(moistureVal, 100)}%`,
                                    background: moistureColor,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Temp + Humidity grid */}
                            <div className="grid grid-cols-2 gap-2 mx-4 mb-3">
                              <div
                                className="rounded-xl px-3 py-2.5"
                                style={{
                                  background: "#F3EDE1",
                                  border: "1px solid #E5DBC6",
                                }}
                              >
                                <div
                                  className="text-[10px] uppercase tracking-wider mb-0.5"
                                  style={{ color: "#88968C" }}
                                >
                                  Temperature
                                </div>
                                <div className="font-display text-xl tracking-tight">
                                  {r.temperature.toFixed(1)}
                                  <span
                                    className="text-xs ml-0.5"
                                    style={{
                                      color: "#88968C",
                                      fontFamily: "'DM Sans'",
                                    }}
                                  >
                                    °C
                                  </span>
                                </div>
                              </div>
                              <div
                                className="rounded-xl px-3 py-2.5"
                                style={{
                                  background: "#F3EDE1",
                                  border: "1px solid #E5DBC6",
                                }}
                              >
                                <div
                                  className="text-[10px] uppercase tracking-wider mb-0.5"
                                  style={{ color: "#88968C" }}
                                >
                                  Humidity
                                </div>
                                <div className="font-display text-xl tracking-tight">
                                  {r.humidity.toFixed(1)}
                                  <span
                                    className="text-xs ml-0.5"
                                    style={{
                                      color: "#88968C",
                                      fontFamily: "'DM Sans'",
                                    }}
                                  >
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Battery + time footer */}
                            <div
                              className="flex items-center justify-between px-4 py-2.5"
                              style={{ borderTop: "1px solid #E5DBC6" }}
                            >
                              {bat ? (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-7 h-2.5 rounded-sm relative"
                                    style={{
                                      border: "1.5px solid #4A5A4C",
                                      padding: 1,
                                    }}
                                  >
                                    <div
                                      className="h-full rounded-[1px] battery-fill-animate"
                                      style={{
                                        width: `${bat.pct}%`,
                                        background: bat.color,
                                      }}
                                    />
                                    <div
                                      className="absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-1.5 rounded-r-sm"
                                      style={{ background: "#4A5A4C" }}
                                    />
                                  </div>
                                  <span
                                    className="text-[11px]"
                                    style={{ color: "#4A5A4C" }}
                                  >
                                    {r!.lipVoltage.toFixed(2)}V
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className="text-[11px]"
                                  style={{ color: "#88968C" }}
                                >
                                  —
                                </span>
                              )}
                              <span
                                className="text-[11px]"
                                style={{ color: "#88968C" }}
                              >
                                Last seen {timeAgo(device.lastSeen)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div
                            className="py-8 text-center mx-4 mb-3 rounded-xl"
                            style={{ background: "#F2F5F3" }}
                          >
                            <p className="text-sm" style={{ color: "#88968C" }}>
                              No sensor data
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              </div>
            </section>
          ) : (
            !error && (
              <div className="rounded-2xl p-10 text-center card-base mb-6">
                <p style={{ color: "#88968C" }}>
                  No devices. Use &ldquo;Add Device&rdquo; to get started.
                </p>
              </div>
            )
          )}
          {error && (
            <div
              className="rounded-2xl px-5 py-4 text-sm mb-6"
              style={{
                background: "#F7E3DC",
                border: "1px solid #E8C3B5",
                color: "#B5452D",
              }}
            >
              Error: {error}
            </div>
          )}

          {/* ═══ 3b. BATTERY + MOISTURE + WEATHER (3 equal columns) ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {/* Battery Fleet Health */}
            {devices.filter((d) => d.currentReadings).length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ background: "#1E3545", color: "#FDFBF5" }}
              >
                <p
                  className="text-[10px] uppercase tracking-widest mb-4"
                  style={{ color: "#7BBAD4" }}
                >
                  Battery Fleet Health
                </p>
                <div className="space-y-3">
                  {devices
                    .filter((d) => d.currentReadings)
                    .sort(
                      (a, b) =>
                        a.currentReadings!.lipVoltage -
                        b.currentReadings!.lipVoltage
                    )
                    .slice(0, 8)
                    .map((d) => {
                      const bl = batteryLabel(d.currentReadings!.lipVoltage);
                      return (
                        <div key={d.box_id} className="flex items-center gap-2">
                          <span className="text-[11px] w-28 truncate opacity-80">
                            {d.name || d.box_id}
                          </span>
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.15)" }}
                          >
                            <div
                              className="h-full rounded-full battery-fill-animate"
                              style={{
                                width: `${bl.pct}%`,
                                background: bl.color,
                              }}
                            />
                          </div>
                          <span className="text-[11px] w-12 text-right opacity-70">
                            {d.currentReadings!.lipVoltage.toFixed(2)}V
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Moisture by Station */}
            {moistureDevices.length > 0 && (
              <div className="rounded-2xl p-5 card-base">
                <p
                  className="text-[10px] uppercase tracking-[0.1em] mb-3"
                  style={{ color: "#88968C" }}
                >
                  Moisture by Station
                </p>
                <div className="space-y-3">
                  {[...moistureDevices]
                    .sort(
                      (a, b) =>
                        getMoistureVal(b.currentReadings) -
                        getMoistureVal(a.currentReadings)
                    )
                    .slice(0, 8)
                    .map((d) => {
                      const val = getMoistureVal(d.currentReadings);
                      const bc =
                        val < 30 ? "#D98A2B" : val > 70 ? "#4A7FA5" : "#3D6B3D";
                      return (
                        <div key={d.box_id}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span style={{ color: "#4A5A4C" }}>
                              {d.name || d.box_id}
                            </span>
                            <span className="font-display font-medium">
                              {val.toFixed(1)}%
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: "#E5DBC6" }}
                          >
                            <div
                              className="h-full rounded-full battery-fill-animate"
                              style={{
                                width: `${Math.min(val, 100)}%`,
                                background: bc,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Weather */}
            <div className="rounded-2xl card-base overflow-hidden">
              <Weather />
            </div>
          </div>

          {/* ═══ 4. MAP + ALERTS ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            <div className="lg:col-span-3 rounded-2xl p-5 card-base">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl tracking-tight">
                    Your fields at a glance
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "#88968C" }}>
                    Tap any marker for details
                  </p>
                </div>
                <div className="flex gap-3">
                  <div
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: "#4A5A4C" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#3D6B3D" }}
                    />
                    Online
                  </div>
                  <div
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: "#4A5A4C" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#B5452D" }}
                    />
                    Offline
                  </div>
                </div>
              </div>
              {devices.length > 0 ? (
                <div className="rounded-xl overflow-hidden">
                  <MapboxMap sensors={markers} showLabels height="480px" />
                </div>
              ) : (
                <div
                  className="rounded-xl p-10 text-center"
                  style={{
                    background: "#F2F5F3",
                    border: "1px dashed #E5DBC6",
                  }}
                >
                  <p style={{ color: "#88968C" }}>Add devices to see the map</p>
                </div>
              )}
            </div>
            <div className="lg:col-span-2 rounded-2xl p-5 card-base">
              <div className="mb-4">
                <h2 className="font-display text-xl tracking-tight">
                  Things to check on
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "#88968C" }}>
                  What needs you today
                </p>
              </div>
              <AlertsPanel devices={devices} />
            </div>
          </div>

          {/* ═══ 5. SENSOR GRAPH ═══ */}
          {devices.length > 0 && (
            <div className="rounded-2xl p-6 card-base mb-6">
              <div className="mb-4">
                <h2 className="font-display text-2xl tracking-tight">
                  Sensor{" "}
                  <span
                    className="italic font-display-soft"
                    style={{ color: "#4A7FA5" }}
                  >
                    trends
                  </span>
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "#88968C" }}>
                  Historical readings with date range & metric toggles
                </p>
              </div>
              <SensorGraph
                selectedBox={{
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
                  sensors: devices.map((d) => ({
                    su_id: d.box_id,
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
                            timestamp: d.lastSeen || new Date().toISOString(),
                          },
                        ]
                      : [],
                  })),
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* ═══ CLAIM MODAL ═══ */}
      {showClaimModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: "rgba(30,42,31,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md mx-4 rounded-2xl p-6"
            style={{
              background: "#FDFBF5",
              border: "1px solid #E5DBC6",
              boxShadow: "0 24px 48px -12px rgba(26,43,58,0.25)",
              color: "#1E2A1F",
            }}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display text-2xl tracking-tight">
                Add Device
              </h3>
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setDeviceId("");
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: "#F2F5F3", color: "#88968C" }}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            {farmsLoading && (
              <p className="text-sm mb-3" style={{ color: "#88968C" }}>
                Loading…
              </p>
            )}
            {farmsErr && (
              <p className="text-sm mb-3" style={{ color: "#B5452D" }}>
                {farmsErr}
              </p>
            )}
            <div className="mb-5">
              <label
                className="block text-[11px] font-medium uppercase tracking-wider mb-2"
                style={{ color: "#88968C" }}
              >
                Farm
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                style={{ background: "#F2F5F3", border: "1px solid #E5DBC6" }}
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                <option value={NEW_FARM_VALUE}>+ Create new farm…</option>
              </select>
              <div className="mt-2 text-[11px]" style={{ color: "#88968C" }}>
                Manage in{" "}
                <Link
                  href="/farms"
                  className="underline"
                  style={{ color: "#3D6B3D" }}
                >
                  /farms
                </Link>
              </div>
            </div>
            {selectedFarmId === NEW_FARM_VALUE && (
              <div
                className="mb-5 rounded-xl p-4"
                style={{ background: "#F2F5F3", border: "1px solid #E5DBC6" }}
              >
                <div
                  className="text-sm font-semibold mb-3"
                  style={{ color: "#25421F" }}
                >
                  New farm
                </div>
                <div className="space-y-3">
                  <div>
                    <label
                      className="block text-[11px] font-medium uppercase tracking-wider mb-1"
                      style={{ color: "#88968C" }}
                    >
                      Name *
                    </label>
                    <input
                      value={newFarmName}
                      onChange={(e) => setNewFarmName(e.target.value)}
                      placeholder="Farm name"
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                      style={{
                        background: "#FDFBF5",
                        border: "1px solid #E5DBC6",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-medium uppercase tracking-wider mb-1"
                      style={{ color: "#88968C" }}
                    >
                      Location
                    </label>
                    <input
                      value={newFarmLocation}
                      onChange={(e) => setNewFarmLocation(e.target.value)}
                      placeholder="City, State"
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                      style={{
                        background: "#FDFBF5",
                        border: "1px solid #E5DBC6",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-medium uppercase tracking-wider mb-1"
                      style={{ color: "#88968C" }}
                    >
                      Description
                    </label>
                    <textarea
                      value={newFarmDescription}
                      onChange={(e) => setNewFarmDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                      style={{
                        background: "#FDFBF5",
                        border: "1px solid #E5DBC6",
                      }}
                    />
                  </div>
                  <button
                    onClick={handleCreateFarmInline}
                    disabled={creatingFarm}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                    style={{ background: "#25421F", color: "#FDFBF5" }}
                  >
                    {creatingFarm ? "Creating..." : "Create Farm"}
                  </button>
                </div>
              </div>
            )}
            <div className="mb-5">
              <label
                className="block text-[11px] font-medium uppercase tracking-wider mb-2"
                style={{ color: "#88968C" }}
              >
                Device ID
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="GREENHOUSE_BOX_001"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                style={{ background: "#F2F5F3", border: "1px solid #E5DBC6" }}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClaimModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "#F2F5F3", border: "1px solid #E5DBC6" }}
              >
                Cancel
              </button>
              <button
                onClick={handleClaimDevice}
                disabled={claiming || selectedFarmId === NEW_FARM_VALUE}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: "#25421F", color: "#FDFBF5" }}
              >
                {claiming ? "Adding..." : "Add Device"}
              </button>
            </div>
            {selectedFarmId === NEW_FARM_VALUE && (
              <p className="mt-3 text-[11px]" style={{ color: "#88968C" }}>
                Create farm first, then claim device.
              </p>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
