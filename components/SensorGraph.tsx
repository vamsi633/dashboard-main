"use client";

import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";

// Reading shape now supports both legacy and Arduino-native battery fields
interface Reading {
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  temperature: number;
  humidity: number;

  // Prefer Arduino names; keep legacy optional for backward compatibility
  lipVoltage?: number; // LiPo battery voltage (V)
  rtcBattery?: number; // RTC battery voltage (V)
  battery1?: number; // legacy alias of lipVoltage
  battery2?: number; // legacy alias of rtcBattery

  timestamp: string; // ISO string
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
}

interface SensorGraphProps {
  selectedBox: Box;
}

interface ChartRow {
  ts: number; // numeric time
  xLabel: string; // label shown on XAxis + Tooltip
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  moistureAvg: number;
  temperature: number;
  humidity: number;
  lipVoltage: number;
  rtcBattery: number;
  batteryAvg: number;
  sensorsCount: number;
}

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function startOfDay(dateStr: string) {
  // dateStr: YYYY-MM-DD
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr: string) {
  // inclusive end of day
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function SensorGraph({ selectedBox }: SensorGraphProps) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    moisture1: true,
    moisture2: true,
    moisture3: true,
    moisture4: true,
    moistureAvg: true,
    temperature: true,
    humidity: true,
    battery1: false, // toggles kept as-is
    battery2: false,
  });

  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  /**
   * ✅ Key upgrade:
   * - Uses ALL sensors (not just sensors[0])
   * - Fixes date filtering (end date inclusive)
   * - Aggregates readings across sensors by minute-bucket (safe + readable)
   */
  const processedData = useMemo<ChartRow[]>(() => {
    const sensors = selectedBox?.sensors ?? [];
    if (sensors.length === 0) return [];

    // Flatten readings across sensors
    const flat = sensors.flatMap((s) =>
      (s.readings ?? []).map((r) => ({
        su_id: s.su_id,
        ...r,
      }))
    );

    if (flat.length === 0) return [];

    // Apply date filtering (inclusive end-of-day)
    let filtered = flat;

    if (dateRange.start) {
      const start = startOfDay(dateRange.start).getTime();
      filtered = filtered.filter(
        (r) => new Date(r.timestamp).getTime() >= start
      );
    }
    if (dateRange.end) {
      const end = endOfDay(dateRange.end).getTime();
      filtered = filtered.filter((r) => new Date(r.timestamp).getTime() <= end);
    }

    if (filtered.length === 0) return [];

    // Sort by timestamp
    filtered.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group by minute bucket so multiple sensors at similar times become one "overall" point
    // Bucket format: YYYY-MM-DDTHH:MM (local-ish via Date -> ISO-like not guaranteed),
    // so use numeric bucket = floor(ts / 60000)
    const buckets = new Map<number, { rows: typeof filtered }>();

    for (const r of filtered) {
      const ts = new Date(r.timestamp).getTime();
      const bucket = Math.floor(ts / 60000); // per minute
      const existing = buckets.get(bucket);
      if (existing) existing.rows.push(r);
      else buckets.set(bucket, { rows: [r] });
    }

    const result: ChartRow[] = [];
    const sortedBuckets = Array.from(buckets.entries()).sort(
      (a, b) => a[0] - b[0]
    );

    for (const [bucket, { rows }] of sortedBuckets) {
      const ts = bucket * 60000;

      // average across sensors
      const sensorsCount = rows.length;

      const sum = (key: keyof Reading, fallbackKey?: keyof Reading) =>
        rows.reduce((acc, r) => {
          const v =
            typeof r[key] === "number"
              ? (r[key] as number)
              : fallbackKey && typeof r[fallbackKey] === "number"
              ? (r[fallbackKey] as number)
              : 0;
          return acc + v;
        }, 0);

      const m1 = sum("moisture1") / sensorsCount;
      const m2 = sum("moisture2") / sensorsCount;
      const m3 = sum("moisture3") / sensorsCount;
      const m4 = sum("moisture4") / sensorsCount;

      const moistureAvg = (m1 + m2 + m3 + m4) / 4;

      const temperature = sum("temperature") / sensorsCount;
      const humidity = sum("humidity") / sensorsCount;

      const lipVoltage = sum("lipVoltage", "battery1") / sensorsCount;
      const rtcBattery = sum("rtcBattery", "battery2") / sensorsCount;

      const d = new Date(ts);
      const xLabel = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      result.push({
        ts,
        xLabel,
        moisture1: m1,
        moisture2: m2,
        moisture3: m3,
        moisture4: m4,
        moistureAvg,
        temperature,
        humidity,
        lipVoltage,
        rtcBattery,
        batteryAvg: (lipVoltage + rtcBattery) / 2,
        sensorsCount,
      });
    }

    return result;
  }, [selectedBox, dateRange]);

  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-gray-900 font-semibold mb-1">{label}</p>
          {payload.map((entry, index) => {
            const key = entry?.dataKey ?? "";
            const isVolt = key === "lipVoltage" || key === "rtcBattery";
            const isTemp = key === "temperature";
            const unit = isVolt ? " V" : isTemp ? "°C" : "%";
            const val = Number(entry.value);
            const formatted = Number.isFinite(val)
              ? val.toFixed(isVolt ? 2 : 1)
              : "—";
            return (
              <p key={index} style={{ color: entry.color }}>
                {`${entry.name}: ${formatted}${unit}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const clearDateRange = () => setDateRange({ start: "", end: "" });

  // If no data at all
  const totalReadings = (selectedBox?.sensors ?? []).reduce(
    (acc, s) => acc + (s.readings?.length ?? 0),
    0
  );

  if (!selectedBox || totalReadings === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h3 className="text-xl font-semibold mb-2 text-gray-900">
          No Data Available
        </h3>
        <p className="text-gray-600">
          No sensor readings available for graphing.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-900">
        {selectedBox.name || selectedBox.box_id} - Sensor Data
      </h2>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Metric Selection */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-gray-800">
            Select Metrics to Display
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.moisture1}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moisture1: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span>Moisture 1</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.moisture2}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moisture2: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span>Moisture 2</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.moisture3}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moisture3: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span>Moisture 3</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.moisture4}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moisture4: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span>Moisture 4</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.moistureAvg}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moistureAvg: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span className="font-semibold">Moisture Avg</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.temperature}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    temperature: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span>Temperature</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.humidity}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    humidity: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span>Humidity</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.battery1}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    battery1: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span>Battery 1 (LiPo)</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedMetrics.battery2}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    battery2: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <span>Battery 2 (RTC)</span>
            </label>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
            />
          </div>

          <button
            onClick={clearDateRange}
            className="bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 px-3 py-2 rounded text-sm"
          >
            Clear
          </button>

          <div className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-semibold">{processedData.length}</span> points
            (avg across sensors)
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="xLabel"
              stroke="#6B7280"
              fontSize={12}
              minTickGap={20}
            />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {selectedMetrics.moisture1 && (
              <Line
                type="monotone"
                dataKey="moisture1"
                stroke="#3B82F6"
                strokeWidth={1}
                name="Moisture 1"
                dot={false}
              />
            )}
            {selectedMetrics.moisture2 && (
              <Line
                type="monotone"
                dataKey="moisture2"
                stroke="#1D4ED8"
                strokeWidth={1}
                name="Moisture 2"
                dot={false}
              />
            )}
            {selectedMetrics.moisture3 && (
              <Line
                type="monotone"
                dataKey="moisture3"
                stroke="#2563EB"
                strokeWidth={1}
                name="Moisture 3"
                dot={false}
              />
            )}
            {selectedMetrics.moisture4 && (
              <Line
                type="monotone"
                dataKey="moisture4"
                stroke="#1E40AF"
                strokeWidth={1}
                name="Moisture 4"
                dot={false}
              />
            )}
            {selectedMetrics.moistureAvg && (
              <Line
                type="monotone"
                dataKey="moistureAvg"
                stroke="#0EA5E9"
                strokeWidth={3}
                name="Moisture Avg"
                dot={false}
              />
            )}

            {selectedMetrics.temperature && (
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#F97316"
                strokeWidth={2}
                name="Temperature"
                dot={false}
              />
            )}
            {selectedMetrics.humidity && (
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="#10B981"
                strokeWidth={2}
                name="Humidity"
                dot={false}
              />
            )}

            {selectedMetrics.battery1 && (
              <Line
                type="monotone"
                dataKey="lipVoltage"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="LiPo (V)"
                dot={false}
              />
            )}
            {selectedMetrics.battery2 && (
              <Line
                type="monotone"
                dataKey="rtcBattery"
                stroke="#A855F7"
                strokeWidth={2}
                name="RTC (V)"
                dot={false}
              />
            )}

            <Brush dataKey="xLabel" height={30} stroke="#9CA3AF" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <h4 className="text-gray-900 font-semibold">Moisture Avg Range</h4>
          <p className="text-gray-700">
            {processedData.length > 0
              ? `${Math.min(...processedData.map((d) => d.moistureAvg)).toFixed(
                  1
                )}% - ${Math.max(
                  ...processedData.map((d) => d.moistureAvg)
                ).toFixed(1)}%`
              : "No data"}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <h4 className="text-gray-900 font-semibold">Temperature Range</h4>
          <p className="text-gray-700">
            {processedData.length > 0
              ? `${Math.min(...processedData.map((d) => d.temperature)).toFixed(
                  1
                )}°C - ${Math.max(
                  ...processedData.map((d) => d.temperature)
                ).toFixed(1)}°C`
              : "No data"}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <h4 className="text-gray-900 font-semibold">Humidity Range</h4>
          <p className="text-gray-700">
            {processedData.length > 0
              ? `${Math.min(...processedData.map((d) => d.humidity)).toFixed(
                  1
                )}% - ${Math.max(
                  ...processedData.map((d) => d.humidity)
                ).toFixed(1)}%`
              : "No data"}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <h4 className="text-gray-900 font-semibold">Points</h4>
          <p className="text-gray-700">{processedData.length}</p>
        </div>
      </div>
    </div>
  );
}
