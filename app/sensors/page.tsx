"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Navbar from "@/components/Navbar";
import WaterDropLoader from "@/components/WaterDropLoader";
import MapboxMap from "@/components/MapboxMap";
import SensorGraph from "@/components/SensorGraph";
import { useSensorData } from "@/hooks/useSensorData";
import { convertBoxForSensorGraph, toDateKey } from "@/lib/sensorHelpers";
import type { Box, DailyAvgRow, FarmOption } from "@/types/sensors";

// ---- UI helpers ----

function SelectDropdown({
  label, open, onToggle, children, zIndex = "z-20",
}: {
  label: string; open: boolean; onToggle: () => void; children: ReactNode; zIndex?: string;
}) {
  return (
    <div className="relative w-80 max-w-full">
      <button
        onClick={onToggle}
        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
      >
        <span className="font-medium text-gray-800">{label}</span>
        <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute ${zIndex} w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden`}>
          {children}
        </div>
      )}
    </div>
  );
}

const thR = "text-right px-3 py-2 border-b border-gray-200 text-gray-600 font-medium";

function DailyTable({ title, headers, rows, renderCells }: {
  title: string; headers: string[]; rows: DailyAvgRow[];
  renderCells: (row: DailyAvgRow) => ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 text-sm font-semibold text-gray-900">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white">
              <th className="text-left px-3 py-2 border-b border-gray-200 min-w-[160px] text-gray-600 font-medium">Date</th>
              {headers.map((h) => <th key={h} className={thR}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.slice(-10).map((row) => (
              <tr key={row.dateKey} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900">{row.displayDate}</td>
                {renderCells(row)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Page ----

export default function SensorsPage() {
  const { data: session, status } = useSession();
  const [selectedFarmId, setSelectedFarmId] = useState("__all__");
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [isBoxDropdownOpen, setIsBoxDropdownOpen] = useState(false);

  const { sensorData, loading: dataLoading, error: dataError } = useSensorData(
    status === "authenticated",
    selectedFarmId
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session) redirect("/auth/signin");
  }, [session, status]);

  const farmOptions = useMemo<FarmOption[]>(() => {
    const opts: FarmOption[] = [{ id: "__all__", name: "All farms" }, { id: "__none__", name: "Unassigned" }];
    const map = new Map<string, string>();
    for (const b of sensorData.boxes) {
      if (b.farmId) map.set(b.farmId, b.farmName ?? "Unnamed farm");
    }
    const farms = Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...opts, ...farms];
  }, [sensorData.boxes]);

  const selectedFarmLabel = farmOptions.find((f) => f.id === selectedFarmId)?.name ?? "All farms";

  useEffect(() => {
    const boxes = sensorData.boxes;
    if (!boxes?.length) { setSelectedBox(null); return; }
    if (!selectedBox || !boxes.find((b) => b.box_id === selectedBox.box_id)) {
      setSelectedBox(boxes[0]);
    } else {
      const updated = boxes.find((b) => b.box_id === selectedBox.box_id);
      if (updated) setSelectedBox(updated);
    }
  }, [sensorData.boxes, selectedBox]);

  useEffect(() => { setIsBoxDropdownOpen(false); }, [selectedFarmId]);

  const dailyAverages = useMemo<DailyAvgRow[]>(() => {
    const readings = selectedBox?.sensors?.[0]?.readings ?? [];
    if (!readings.length) return [];

    type Agg = { sumMoist: number; sumTemp: number; sumHum: number; sumLiPo: number; sumRTC: number; count: number; anyTs: string };
    const byDay: Record<string, Agg> = {};

    for (const r of readings) {
      const key = toDateKey(r.timestamp);
      if (!byDay[key]) byDay[key] = { sumMoist: 0, sumTemp: 0, sumHum: 0, sumLiPo: 0, sumRTC: 0, count: 0, anyTs: r.timestamp };
      byDay[key].sumMoist += (r.moisture1 + r.moisture2 + r.moisture3 + r.moisture4) / 4;
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
        displayDate: new Date(agg.anyTs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
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
    let totalMoisture = 0, totalHumidity = 0, totalTemperature = 0, count = 0;
    for (const sensor of selectedBox.sensors) {
      for (const r of sensor.readings) {
        totalMoisture += (r.moisture1 + r.moisture2 + r.moisture3 + r.moisture4) / 4;
        totalHumidity += r.humidity;
        totalTemperature += r.temperature;
        count++;
      }
    }
    const fmt = (v: number) => (count ? v / count : 0).toFixed(1);
    return {
      avgMoisture: fmt(totalMoisture),
      avgHumidity: fmt(totalHumidity),
      avgTemperature: fmt(totalTemperature),
      sensorCount: selectedBox.sensors.length,
      readingCount: count,
    };
  }, [selectedBox]);

  const mapSensors = useMemo(() => {
    if (!selectedBox) return [];
    const readings = selectedBox.sensors[0]?.readings ?? [];
    const latest = readings.length ? readings[readings.length - 1] : null;
    return [{
      id: selectedBox.box_id,
      name: selectedBox.name || selectedBox.box_id,
      coordinates: [selectedBox.longitude, selectedBox.latitude] as [number, number],
      data: latest ? {
        moisture: latest.moisture || 0, moisture1: latest.moisture1 || 0,
        moisture2: latest.moisture2 || 0, moisture3: latest.moisture3 || 0,
        moisture4: latest.moisture4 || 0, humidity: latest.humidity || 0,
        temperature: latest.temperature || 0, lipVoltage: latest.lipVoltage || 0,
        rtcBattery: latest.rtcBattery || 0, dataPoints: latest.dataPoints || 0,
      } : undefined,
    }];
  }, [selectedBox]);

  if (status === "loading" || dataLoading) return <WaterDropLoader />;
  if (!session) return null;

  const tdR = "px-3 py-2 text-right text-gray-900";
  const readingsHref = selectedBox ? `/sensors/${encodeURIComponent(selectedBox.box_id)}/readings` : "#";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mx-auto w-full max-w-[1600px]">
        <Navbar />
        <main className="py-6 pt-[90px]">
          <div className="p-2 sm:p-4">

            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold">Sensors</h1>
              {selectedBox && (
                <Link href={readingsHref} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm">
                  See all data
                </Link>
              )}
            </div>

            {dataError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p>Error loading sensor data: {dataError}</p>
              </div>
            )}

            {!sensorData.boxes.length && !dataLoading && (
              <div className="mb-8 bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
                <h2 className="text-xl font-semibold mb-2">No sensor boxes found</h2>
                <p className="text-gray-600 mb-4">Sensor boxes will appear here once they start sending data.</p>
                <p className="text-gray-500 text-sm">Use the &quot;Add Device&quot; button on the home page to claim devices.</p>
              </div>
            )}

            {farmOptions.length > 0 && (
              <div className="mb-8 flex flex-col sm:flex-row gap-4">
                <SelectDropdown label={selectedFarmLabel} open={isFarmDropdownOpen} onToggle={() => setIsFarmDropdownOpen((v) => !v)}>
                  {farmOptions.map((farm) => (
                    <button key={farm.id} onClick={() => { setSelectedFarmId(farm.id); setIsFarmDropdownOpen(false); }} className="w-full px-4 py-3 text-left hover:bg-gray-50 transition">
                      {farm.name}
                    </button>
                  ))}
                </SelectDropdown>

                {sensorData.boxes.length > 0 && (
                  <SelectDropdown label={selectedBox ? selectedBox.box_id : "Select a Box"} open={isBoxDropdownOpen} onToggle={() => setIsBoxDropdownOpen((v) => !v)} zIndex="z-10">
                    {sensorData.boxes.map((box) => (
                      <button key={box.box_id} onClick={() => { setSelectedBox(box); setIsBoxDropdownOpen(false); }} className="w-full px-4 py-3 text-left hover:bg-gray-50 transition">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{box.box_id}</span>
                          <span className="text-xs text-gray-500">
                            {box.location} •{" "}
                            <span className={box.isOnline ? "text-green-700" : "text-gray-500"}>
                              {box.isOnline ? "Online" : "Offline"}
                            </span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </SelectDropdown>
                )}
              </div>
            )}

            {selectedBox && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                  {[
                    { label: "Avg Moisture", value: `${boxStats?.avgMoisture}%` },
                    { label: "Avg Humidity", value: `${boxStats?.avgHumidity}%` },
                    { label: "Avg Temperature", value: `${boxStats?.avgTemperature}°C` },
                    { label: "Total Sensors", value: `${boxStats?.sensorCount}` },
                    { label: "Total Readings", value: `${boxStats?.readingCount}` },
                  ].map((c) => (
                    <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <h3 className="text-gray-500 text-sm mb-1">{c.label}</h3>
                      <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Device Location</h2>
                      <div className="text-xs text-gray-500">
                        Last seen:{" "}{selectedBox.lastSeen ? new Date(selectedBox.lastSeen).toLocaleString() : "-"}
                      </div>
                    </div>
                    {selectedBox.latitude !== 0 && selectedBox.longitude !== 0 ? (
                      <MapboxMap sensors={mapSensors} center={[selectedBox.longitude, selectedBox.latitude]} zoom={15} height="500px" showLabels />
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Invalid Coordinates</h3>
                        <p className="text-gray-600 mb-2">({selectedBox.latitude}, {selectedBox.longitude})</p>
                        <p className="text-gray-500 text-sm">Device needs valid GPS coordinates to show on map.</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Daily averages</h2>
                      <Link href={readingsHref} className="text-sm text-blue-700 hover:text-blue-800 underline">See all data</Link>
                    </div>
                    {dailyAverages.length === 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-600">No readings yet.</div>
                    ) : (
                      <div className="space-y-5">
                        <DailyTable
                          title="Avg Moisture (%)"
                          headers={["Avg", "Points"]}
                          rows={dailyAverages}
                          renderCells={(row) => (
                            <>
                              <td className={`${tdR} font-semibold`}>{row.avgMoisture.toFixed(1)}%</td>
                              <td className="px-3 py-2 text-right text-gray-600">{row.count}</td>
                            </>
                          )}
                        />
                        <DailyTable
                          title="Temp (°C) • Hum (%) • LiPo (V) • RTC (V)"
                          headers={["Temp", "Hum", "LiPo", "RTC", "Points"]}
                          rows={dailyAverages}
                          renderCells={(row) => (
                            <>
                              <td className={tdR}>{row.avgTemp.toFixed(1)}</td>
                              <td className={tdR}>{row.avgHum.toFixed(1)}</td>
                              <td className={tdR}>{row.avgLiPo.toFixed(2)}</td>
                              <td className={tdR}>{row.avgRTC.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{row.count}</td>
                            </>
                          )}
                        />
                        <div className="text-xs text-gray-500">
                          Showing last 10 days. Use <span className="text-blue-700">See all data</span> for every datapoint.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <SensorGraph selectedBox={convertBoxForSensorGraph(selectedBox)} />
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
