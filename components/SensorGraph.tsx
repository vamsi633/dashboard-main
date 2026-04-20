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

interface Reading {
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  temperature: number;
  humidity: number;
  lipVoltage?: number;
  rtcBattery?: number;
  battery1?: number;
  battery2?: number;
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
}

interface SensorGraphProps {
  selectedBox: Box;
}

interface ChartRow {
  ts: number;
  xLabel: string;
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
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

/* ── Earthy color palette for chart lines ── */
const COLORS = {
  moisture1: "#6B95AE",
  moisture2: "#4A7A8F",
  moisture3: "#3A6A7F",
  moisture4: "#2A5A6F",
  moistureAvg: "#3D6B3D",
  temperature: "#B5452D",
  humidity: "#D98A2B",
  battery1: "#7B6B8D",
  battery2: "#9B8BAD",
};

export default function SensorGraph({ selectedBox }: SensorGraphProps) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    moisture1: true,
    moisture2: true,
    moisture3: true,
    moisture4: true,
    moistureAvg: true,
    temperature: true,
    humidity: true,
    battery1: false,
    battery2: false,
  });

  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const processedData = useMemo<ChartRow[]>(() => {
    const sensors = selectedBox?.sensors ?? [];
    if (sensors.length === 0) return [];
    const flat = sensors.flatMap((s) =>
      (s.readings ?? []).map((r) => ({ su_id: s.su_id, ...r }))
    );
    if (flat.length === 0) return [];

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

    filtered.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const buckets = new Map<number, { rows: typeof filtered }>();
    for (const r of filtered) {
      const ts = new Date(r.timestamp).getTime();
      const bucket = Math.floor(ts / 60000);
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
        <div
          className="rounded-xl p-3.5 shadow-lg text-sm"
          style={{
            background: "#FDFBF5",
            border: "1px solid #E5DBC6",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <p
            className="font-semibold mb-1.5"
            style={{ color: "#1E2A1F", fontFamily: "'Fraunces', serif" }}
          >
            {label}
          </p>
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
              <p
                key={index}
                className="flex items-center gap-2 py-0.5"
                style={{ color: entry.color }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: entry.color }}
                />
                <span style={{ color: "#4A5A4C" }}>{entry.name}:</span>
                <span className="font-medium" style={{ color: "#1E2A1F" }}>
                  {formatted}
                  {unit}
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const clearDateRange = () => setDateRange({ start: "", end: "" });

  const totalReadings = (selectedBox?.sensors ?? []).reduce(
    (acc, s) => acc + (s.readings?.length ?? 0),
    0
  );

  if (!selectedBox || totalReadings === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "#F3EDE1", border: "1px dashed #E5DBC6" }}
      >
        <h3
          className="text-lg font-semibold mb-2"
          style={{ color: "#1E2A1F", fontFamily: "'Fraunces', serif" }}
        >
          No Data Available
        </h3>
        <p style={{ color: "#7A8579" }}>
          No sensor readings available for graphing.
        </p>
      </div>
    );
  }

  const metrics = [
    { key: "moisture1", label: "Moisture 1" },
    { key: "moisture2", label: "Moisture 2" },
    { key: "moisture3", label: "Moisture 3" },
    { key: "moisture4", label: "Moisture 4" },
    { key: "moistureAvg", label: "Moisture Avg", bold: true },
    { key: "temperature", label: "Temperature" },
    { key: "humidity", label: "Humidity" },
    { key: "battery1", label: "Battery 1 (LiPo)" },
    { key: "battery2", label: "Battery 2 (RTC)" },
  ];

  return (
    <div>
      {/* ── Controls ── */}
      <div className="mb-5 space-y-4">
        {/* Metric toggles */}
        <div>
          <h3
            className="text-[11px] font-medium uppercase tracking-[0.1em] mb-3"
            style={{ color: "#7A8579" }}
          >
            Select Metrics to Display
          </h3>
          <div className="flex flex-wrap gap-2">
            {metrics.map((m) => {
              const checked =
                selectedMetrics[m.key as keyof typeof selectedMetrics];
              const color = COLORS[m.key as keyof typeof COLORS] || "#7A8579";
              return (
                <label
                  key={m.key}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] cursor-pointer transition-all"
                  style={{
                    background: checked ? color + "18" : "#F3EDE1",
                    border: `1.5px solid ${checked ? color : "#E5DBC6"}`,
                    color: checked ? color : "#7A8579",
                    fontWeight: m.bold ? 600 : 400,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedMetrics((prev) => ({
                        ...prev,
                        [m.key]: e.target.checked,
                      }))
                    }
                    className="sr-only"
                  />
                  <span
                    className="w-3 h-3 rounded-sm flex items-center justify-center flex-shrink-0"
                    style={{
                      background: checked ? color : "transparent",
                      border: `1.5px solid ${checked ? color : "#B8BFBA"}`,
                    }}
                  >
                    {checked && (
                      <svg
                        className="w-2 h-2 text-white"
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
                  {m.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              className="block text-[11px] font-medium uppercase tracking-wider mb-1"
              style={{ color: "#7A8579" }}
            >
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
              style={{
                background: "#F3EDE1",
                border: "1px solid #E5DBC6",
                color: "#1E2A1F",
              }}
            />
          </div>
          <div>
            <label
              className="block text-[11px] font-medium uppercase tracking-wider mb-1"
              style={{ color: "#7A8579" }}
            >
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
              style={{
                background: "#F3EDE1",
                border: "1px solid #E5DBC6",
                color: "#1E2A1F",
              }}
            />
          </div>
          <button
            onClick={clearDateRange}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:-translate-y-px"
            style={{
              background: "#F3EDE1",
              border: "1px solid #E5DBC6",
              color: "#1E2A1F",
            }}
          >
            Clear
          </button>
          <div
            className="text-xs px-3 py-2 rounded-xl"
            style={{ background: "#D8E2CC", color: "#25421F" }}
          >
            Showing{" "}
            <span className="font-semibold">{processedData.length}</span> points
            (avg across sensors)
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="2 3" stroke="#E5DBC6" />
            <XAxis
              dataKey="xLabel"
              stroke="#7A8579"
              fontSize={11}
              minTickGap={20}
              fontFamily="'DM Sans', sans-serif"
            />
            <YAxis
              stroke="#7A8579"
              fontSize={11}
              fontFamily="'DM Sans', sans-serif"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                paddingTop: 8,
              }}
              iconType="circle"
              iconSize={8}
            />

            {selectedMetrics.moisture1 && (
              <Line
                type="monotone"
                dataKey="moisture1"
                stroke={COLORS.moisture1}
                strokeWidth={1.5}
                name="Moisture 1"
                dot={false}
              />
            )}
            {selectedMetrics.moisture2 && (
              <Line
                type="monotone"
                dataKey="moisture2"
                stroke={COLORS.moisture2}
                strokeWidth={1.5}
                name="Moisture 2"
                dot={false}
              />
            )}
            {selectedMetrics.moisture3 && (
              <Line
                type="monotone"
                dataKey="moisture3"
                stroke={COLORS.moisture3}
                strokeWidth={1.5}
                name="Moisture 3"
                dot={false}
              />
            )}
            {selectedMetrics.moisture4 && (
              <Line
                type="monotone"
                dataKey="moisture4"
                stroke={COLORS.moisture4}
                strokeWidth={1.5}
                name="Moisture 4"
                dot={false}
              />
            )}
            {selectedMetrics.moistureAvg && (
              <Line
                type="monotone"
                dataKey="moistureAvg"
                stroke={COLORS.moistureAvg}
                strokeWidth={3}
                name="Moisture Avg"
                dot={false}
              />
            )}
            {selectedMetrics.temperature && (
              <Line
                type="monotone"
                dataKey="temperature"
                stroke={COLORS.temperature}
                strokeWidth={2}
                name="Temperature"
                dot={false}
              />
            )}
            {selectedMetrics.humidity && (
              <Line
                type="monotone"
                dataKey="humidity"
                stroke={COLORS.humidity}
                strokeWidth={2}
                name="Humidity"
                dot={false}
              />
            )}
            {selectedMetrics.battery1 && (
              <Line
                type="monotone"
                dataKey="lipVoltage"
                stroke={COLORS.battery1}
                strokeWidth={2}
                name="LiPo (V)"
                dot={false}
              />
            )}
            {selectedMetrics.battery2 && (
              <Line
                type="monotone"
                dataKey="rtcBattery"
                stroke={COLORS.battery2}
                strokeWidth={2}
                name="RTC (V)"
                dot={false}
              />
            )}

            <Brush
              dataKey="xLabel"
              height={28}
              stroke="#B8BFBA"
              fill="#F3EDE1"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Summary Stats ── */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Moisture Avg Range",
            value:
              processedData.length > 0
                ? `${Math.min(
                    ...processedData.map((d) => d.moistureAvg)
                  ).toFixed(1)}% – ${Math.max(
                    ...processedData.map((d) => d.moistureAvg)
                  ).toFixed(1)}%`
                : "No data",
            color: "#3D6B3D",
          },
          {
            label: "Temperature Range",
            value:
              processedData.length > 0
                ? `${Math.min(
                    ...processedData.map((d) => d.temperature)
                  ).toFixed(1)}°C – ${Math.max(
                    ...processedData.map((d) => d.temperature)
                  ).toFixed(1)}°C`
                : "No data",
            color: "#B5452D",
          },
          {
            label: "Humidity Range",
            value:
              processedData.length > 0
                ? `${Math.min(...processedData.map((d) => d.humidity)).toFixed(
                    1
                  )}% – ${Math.max(
                    ...processedData.map((d) => d.humidity)
                  ).toFixed(1)}%`
                : "No data",
            color: "#D98A2B",
          },
          {
            label: "Data Points",
            value: `${processedData.length}`,
            color: "#6B95AE",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{ background: "#F3EDE1", border: "1px solid #E5DBC6" }}
          >
            <h4
              className="text-[11px] font-medium uppercase tracking-wider mb-1"
              style={{ color: "#7A8579" }}
            >
              {s.label}
            </h4>
            <p
              className="text-sm font-medium"
              style={{ color: s.color, fontFamily: "'Fraunces', serif" }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
