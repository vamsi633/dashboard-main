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
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import WaterDropLoader from "@/components/WaterDropLoader";
import { useIoTDevices } from "@/hooks/useIoTDevices";
import type { IoTDevice, SensorMarker, Farm, ApiResponse, ClaimResponse,
   ListFarmsOk, ListFarmsErr, ListFarmsResponse, CreateFarmOk,
    CreateFarmErr, CreateFarmResponse, AssignFarmOk,
     AssignFarmErr, AssignFarmResponse } from "@/types/iot";
import  { batteryLabel, timeAgo, getMoistureVal,
  toMarkers, NEW_FARM_VALUE, FILTER_ALL, FILTER_UNASSIGNED
 } from "@/lib/deviceHelpers";
import AlertsPanel from "@/components/AlertsPanel";
import ClaimModal from "@/components/ClaimModal";


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

  const { devices, loading, error, refetch } = useIoTDevices(farmFilter);

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
    <div className="min-h-screen" style={{ background: "#F3EDE1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=DM+Sans:opsz,wght@9..40,300..700&display=swap');
        .font-display { font-family: 'Fraunces', serif; font-variation-settings: 'opsz' 144, 'SOFT' 30; }
        .font-display-soft { font-family: 'Fraunces', serif; font-variation-settings: 'opsz' 144, 'SOFT' 60; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(2); opacity: 0; } }
        .pulse-ring::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid currentColor; animation: pulse-ring 2s ease-out infinite; }
        .grain-bg { background-image: radial-gradient(circle at 15% 10%, rgba(181,69,45,0.04), transparent 40%), radial-gradient(circle at 85% 90%, rgba(61,107,61,0.05), transparent 40%); }
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
                    "radial-gradient(circle, rgba(216,226,204,0.6) 0%, transparent 70%)",
                }}
              />
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-5 relative"
                style={{
                  background: online === total ? "#D8E2CC" : "#F6E1C0",
                  color: online === total ? "#25421F" : "#D98A2B",
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
                      <em style={{ color: "#25421F" }}>looking happy</em> &nbsp;
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
                    style={{ color: "#7A8579" }}
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
                          color: "#7A8579",
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
                          boxShadow: "0 12px 32px -8px rgba(30,42,31,0.2)",
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
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#F3EDE1]"
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
                                    : "#D5DBC6"
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
                    background: "#25421F",
                    color: "#FDFBF5",
                    boxShadow: "0 4px 12px -4px rgba(37,66,31,0.4)",
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
              style={{ background: "#25421F", color: "#FDFBF5" }}
            >
              <div
                className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(230,179,37,0.12) 0%, transparent 70%)",
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
                    style={{ color: "rgba(253,251,245,0.85)" }}
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                      style={{
                        background: "rgba(230,179,37,0.15)",
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
                color: "#6B95AE",
                bg: "#D5E2EA",
                icon: (
                  <path d="M12 2c3 4 6 8 6 12a6 6 0 1 1-12 0c0-4 3-8 6-12z" />
                ),
              },
              {
                label: "Avg. Soil Moisture",
                value: `${Math.round(avgMoisture)}`,
                unit: "%",
                desc: avgMoisture < 30 ? "Dry — irrigate" : "Healthy",
                color: "#25421F",
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
                  style={{ color: "#7A8579" }}
                >
                  {s.label}
                </div>
                <div className="font-display text-4xl tracking-tight">
                  {s.value}
                  <span
                    className="text-lg ml-0.5"
                    style={{ color: "#7A8579", fontFamily: "'DM Sans'" }}
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
                      style={{ color: "#25421F" }}
                    >
                      station
                    </span>
                    , up close
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "#7A8579" }}>
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
                    const needsFarm = !device.farmId;
                    const bat = r ? batteryLabel(r.lipVoltage) : null;
                    return (
                      <div
                        key={device.box_id}
                        className="device-card flex-shrink-0 w-80 rounded-2xl p-5 relative overflow-hidden transition-all hover:-translate-y-1 cursor-pointer card-base"
                        style={{
                          borderLeftWidth: device.isOnline ? 1 : 3,
                          borderLeftColor: device.isOnline
                            ? "#E5DBC6"
                            : "#B5452D",
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-display text-lg font-medium tracking-tight">
                              {device.name || device.box_id}
                            </h3>
                            <p
                              className="flex items-center gap-1.5 text-xs mt-0.5"
                              style={{ color: "#7A8579" }}
                            >
                              <svg
                                className="w-3 h-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              {device.farmName || "No farm"} · {device.location}
                            </p>
                          </div>
                          <span
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                            style={{
                              background: device.isOnline
                                ? "#D8E2CC"
                                : "#F0D1C5",
                              color: device.isOnline ? "#25421F" : "#B5452D",
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
                            className="mb-3 p-3 rounded-xl"
                            style={{
                              background: "#F3EDE1",
                              border: "1px solid #E5DBC6",
                            }}
                          >
                            <label
                              className="block text-[11px] font-medium uppercase tracking-wider mb-1.5"
                              style={{ color: "#7A8579" }}
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
                                style={{ color: "#7A8579" }}
                              >
                                Assigning…
                              </p>
                            )}
                          </div>
                        )}
                        {r ? (
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {[
                              {
                                l: "Moisture",
                                v:
                                  typeof r.moisture === "number"
                                    ? r.moisture.toFixed(1)
                                    : individualAvg,
                                u: "%",
                                c: "#6B95AE",
                                d: "M12 2.5s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z",
                              },
                              {
                                l: "Temperature",
                                v: r.temperature.toFixed(1),
                                u: "°C",
                                c: "#B5452D",
                                d: "M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z",
                              },
                              {
                                l: "Humidity",
                                v: r.humidity.toFixed(1),
                                u: "%",
                                c: "#6B95AE",
                                d: "M12 2c3 4 6 8 6 12a6 6 0 1 1-12 0c0-4 3-8 6-12z",
                              },
                              {
                                l: "Readings",
                                v: `${r.dataPoints}`,
                                u: "",
                                c: "#D98A2B",
                                d: "M12 6v6l4 2",
                              },
                            ].map((m) => (
                              <div key={m.l} className="flex flex-col gap-0.5">
                                <span
                                  className="text-[10px] uppercase tracking-wider flex items-center gap-1"
                                  style={{ color: "#7A8579" }}
                                >
                                  <svg
                                    className="w-2.5 h-2.5"
                                    style={{ color: m.c }}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    {m.l === "Readings" ? (
                                      <>
                                        <circle cx="12" cy="12" r="10" />
                                        <path d={m.d} />
                                      </>
                                    ) : (
                                      <path d={m.d} />
                                    )}
                                  </svg>
                                  {m.l}
                                </span>
                                <span className="font-display text-xl tracking-tight">
                                  {m.v}
                                  <span
                                    className="text-xs ml-0.5"
                                    style={{
                                      color: "#7A8579",
                                      fontFamily: "'DM Sans'",
                                    }}
                                  >
                                    {m.u}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className="py-6 text-center rounded-xl mb-3"
                            style={{ background: "#F3EDE1" }}
                          >
                            <p className="text-sm" style={{ color: "#7A8579" }}>
                              No sensor data
                            </p>
                          </div>
                        )}
                        <div
                          className="flex items-center justify-between pt-3"
                          style={{ borderTop: "1px dashed #E5DBC6" }}
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
                                {r!.lipVoltage.toFixed(2)}V · {bat.text}
                              </span>
                            </div>
                          ) : (
                            <span
                              className="text-[11px]"
                              style={{ color: "#7A8579" }}
                            >
                              —
                            </span>
                          )}
                          <span
                            className="text-[11px]"
                            style={{ color: "#7A8579" }}
                          >
                            {timeAgo(device.lastSeen)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </div>
            </section>
          ) : (
            !error && (
              <div className="rounded-2xl p-10 text-center card-base mb-6">
                <p style={{ color: "#7A8579" }}>
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
                style={{ background: "#25421F", color: "#FDFBF5" }}
              >
                <p
                  className="text-[10px] uppercase tracking-widest mb-4"
                  style={{ color: "#E6B325" }}
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
                            style={{ background: "rgba(253,251,245,0.15)" }}
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
                  style={{ color: "#7A8579" }}
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
                        val < 30 ? "#D98A2B" : val > 70 ? "#6B95AE" : "#3D6B3D";
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
                  <p className="text-xs mt-0.5" style={{ color: "#7A8579" }}>
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
                    background: "#F3EDE1",
                    border: "1px dashed #E5DBC6",
                  }}
                >
                  <p style={{ color: "#7A8579" }}>Add devices to see the map</p>
                </div>
              )}
            </div>
            <div className="lg:col-span-2 rounded-2xl p-5 card-base">
              <div className="mb-4">
                <h2 className="font-display text-xl tracking-tight">
                  Things to check on
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "#7A8579" }}>
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
                    style={{ color: "#25421F" }}
                  >
                    trends
                  </span>
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "#7A8579" }}>
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

      {showClaimModal && (
        <ClaimModal
          farms={farms}
          farmsLoading={farmsLoading}
          farmsErr={farmsErr}
          selectedFarmId={selectedFarmId}
          setSelectedFarmId={setSelectedFarmId}
          deviceId={deviceId}
          setDeviceId={setDeviceId}
          newFarmName={newFarmName}
          setNewFarmName={setNewFarmName}
          newFarmLocation={newFarmLocation}
          setNewFarmLocation={setNewFarmLocation}
          newFarmDescription={newFarmDescription}
          setNewFarmDescription={setNewFarmDescription}
          creatingFarm={creatingFarm}
          claiming={claiming}
          onClose={() => { setShowClaimModal(false); setDeviceId(""); }}
          onClaim={handleClaimDevice}
          onCreateFarm={handleCreateFarmInline}
        />
      )}
    </div>
  );
}
