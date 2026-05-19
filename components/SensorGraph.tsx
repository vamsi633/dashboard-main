"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts";

interface Reading {
  moisture1: number; moisture2: number; moisture3: number; moisture4: number;
  temperature: number; humidity: number;
  lipVoltage?: number; rtcBattery?: number; battery1?: number; battery2?: number;
  timestamp: string;
}
interface Sensor  { su_id: string; readings: Reading[]; }
interface Box     { box_id: string; name: string; location: string; latitude: number; longitude: number; sensors: Sensor[]; isOnline: boolean; lastSeen: string; }
interface ChartRow {
  ts: number; xLabel: string;
  moisture1: number; moisture2: number; moisture3: number; moisture4: number;
  moistureAvg: number; temperature: number; humidity: number;
  lipVoltage: number; rtcBattery: number; batteryAvg: number; sensorsCount: number;
}

const COLORS = {
  moisture1: "#6B95AE", moisture2: "#4A7A8F", moisture3: "#3A6A7F", moisture4: "#2A5A6F",
  moistureAvg: "#3D6B3D", temperature: "#B5452D", humidity: "#D98A2B",
  battery1: "#7B6B8D", battery2: "#9B8BAD",
};

const INITIAL_METRICS = { moisture1: true, moisture2: true, moisture3: true, moisture4: true, moistureAvg: true, temperature: true, humidity: true, battery1: false, battery2: false };

const LINES: { key: keyof typeof INITIAL_METRICS; dataKey: string; name: string; sw: number }[] = [
  { key: "moisture1",  dataKey: "moisture1",  name: "Moisture 1",   sw: 1.5 },
  { key: "moisture2",  dataKey: "moisture2",  name: "Moisture 2",   sw: 1.5 },
  { key: "moisture3",  dataKey: "moisture3",  name: "Moisture 3",   sw: 1.5 },
  { key: "moisture4",  dataKey: "moisture4",  name: "Moisture 4",   sw: 1.5 },
  { key: "moistureAvg",dataKey: "moistureAvg",name: "Moisture Avg", sw: 3   },
  { key: "temperature",dataKey: "temperature",name: "Temperature",  sw: 2   },
  { key: "humidity",   dataKey: "humidity",   name: "Humidity",     sw: 2   },
  { key: "battery1",   dataKey: "lipVoltage", name: "LiPo (V)",     sw: 2   },
  { key: "battery2",   dataKey: "rtcBattery", name: "RTC (V)",      sw: 2   },
];

const METRICS_CONFIG = [
  { key: "moisture1",  label: "Moisture 1" },     { key: "moisture2",   label: "Moisture 2" },
  { key: "moisture3",  label: "Moisture 3" },     { key: "moisture4",   label: "Moisture 4" },
  { key: "moistureAvg",label: "Moisture Avg", bold: true },
  { key: "temperature",label: "Temperature" },    { key: "humidity",    label: "Humidity" },
  { key: "battery1",   label: "Battery 1 (LiPo)" },{ key: "battery2",  label: "Battery 2 (RTC)" },
];

const startOfDay = (s: string) => { const d = new Date(s); d.setHours(0, 0, 0, 0);          return d; };
const endOfDay   = (s: string) => { const d = new Date(s); d.setHours(23, 59, 59, 999);      return d; };
const range      = (data: ChartRow[], key: keyof ChartRow, unit: string) =>
  data.length ? `${Math.min(...data.map(d => d[key] as number)).toFixed(1)}${unit} – ${Math.max(...data.map(d => d[key] as number)).toFixed(1)}${unit}` : "No data";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number; dataKey?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3.5 shadow-lg text-sm" style={{ background: "#FDFBF5", border: "1px solid #E5DBC6", fontFamily: "'DM Sans', sans-serif" }}>
      <p className="font-semibold mb-1.5" style={{ color: "#1E2A1F", fontFamily: "'Fraunces', serif" }}>{label}</p>
      {payload.map((entry, i) => {
        const isVolt = entry.dataKey === "lipVoltage" || entry.dataKey === "rtcBattery";
        const unit = isVolt ? " V" : entry.dataKey === "temperature" ? "°C" : "%";
        const val = Number(entry.value);
        return (
          <p key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: entry.color }} />
            <span style={{ color: "#4A5A4C" }}>{entry.name}:</span>
            <span className="font-medium" style={{ color: "#1E2A1F" }}>{Number.isFinite(val) ? val.toFixed(isVolt ? 2 : 1) : "—"}{unit}</span>
          </p>
        );
      })}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: "#7A8579" }}>{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
        style={{ background: "#F3EDE1", border: "1px solid #E5DBC6", color: "#1E2A1F" }} />
    </div>
  );
}

export default function SensorGraph({ selectedBox }: { selectedBox: Box }) {
  const [selectedMetrics, setSelectedMetrics] = useState(INITIAL_METRICS);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const processedData = useMemo<ChartRow[]>(() => {
    const sensors = selectedBox?.sensors ?? [];
    if (!sensors.length) return [];
    let flat = sensors.flatMap((s) => (s.readings ?? []).map((r) => ({ su_id: s.su_id, ...r })));
    if (!flat.length) return [];

    if (dateRange.start) flat = flat.filter(r => new Date(r.timestamp) >= startOfDay(dateRange.start));
    if (dateRange.end)   flat = flat.filter(r => new Date(r.timestamp) <= endOfDay(dateRange.end));
    if (!flat.length) return [];

    flat.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const buckets = new Map<number, typeof flat>();
    for (const r of flat) {
      const bucket = Math.floor(new Date(r.timestamp).getTime() / 60000);
      const b = buckets.get(bucket);
      if (b) b.push(r); else buckets.set(bucket, [r]);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([bucket, rows]) => {
        const n = rows.length;
        const avg = (key: keyof Reading, fb?: keyof Reading) =>
          rows.reduce((acc, r) => acc + (typeof r[key] === "number" ? (r[key] as number) : fb && typeof r[fb] === "number" ? (r[fb] as number) : 0), 0) / n;
        const m1 = avg("moisture1"), m2 = avg("moisture2"), m3 = avg("moisture3"), m4 = avg("moisture4");
        const lipVoltage = avg("lipVoltage", "battery1"), rtcBattery = avg("rtcBattery", "battery2");
        const d = new Date(bucket * 60000);
        return {
          ts: bucket * 60000,
          xLabel: `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          moisture1: m1, moisture2: m2, moisture3: m3, moisture4: m4,
          moistureAvg: (m1 + m2 + m3 + m4) / 4,
          temperature: avg("temperature"), humidity: avg("humidity"),
          lipVoltage, rtcBattery, batteryAvg: (lipVoltage + rtcBattery) / 2, sensorsCount: n,
        };
      });
  }, [selectedBox, dateRange]);

  const totalReadings = (selectedBox?.sensors ?? []).reduce((acc, s) => acc + (s.readings?.length ?? 0), 0);

  if (!selectedBox || totalReadings === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: "#F3EDE1", border: "1px dashed #E5DBC6" }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: "#1E2A1F", fontFamily: "'Fraunces', serif" }}>No Data Available</h3>
        <p style={{ color: "#7A8579" }}>No sensor readings available for graphing.</p>
      </div>
    );
  }

  const axisProps = { stroke: "#7A8579", fontSize: 11, fontFamily: "'DM Sans', sans-serif" };

  return (
    <div>
      <div className="mb-5 space-y-4">
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: "#7A8579" }}>Select Metrics to Display</h3>
          <div className="flex flex-wrap gap-2">
            {METRICS_CONFIG.map((m) => {
              const checked = selectedMetrics[m.key as keyof typeof selectedMetrics];
              const color = COLORS[m.key as keyof typeof COLORS] || "#7A8579";
              return (
                <label key={m.key} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] cursor-pointer transition-all"
                  style={{ background: checked ? color + "18" : "#F3EDE1", border: `1.5px solid ${checked ? color : "#E5DBC6"}`, color: checked ? color : "#7A8579", fontWeight: m.bold ? 600 : 400 }}>
                  <input type="checkbox" checked={checked} onChange={(e) => setSelectedMetrics(prev => ({ ...prev, [m.key]: e.target.checked }))} className="sr-only" />
                  <span className="w-3 h-3 rounded-sm flex items-center justify-center flex-shrink-0"
                    style={{ background: checked ? color : "transparent", border: `1.5px solid ${checked ? color : "#B8BFBA"}` }}>
                    {checked && (
                      <svg className="w-2 h-2 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    )}
                  </span>
                  {m.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <DateField label="Start Date" value={dateRange.start} onChange={(v) => setDateRange(p => ({ ...p, start: v }))} />
          <DateField label="End Date"   value={dateRange.end}   onChange={(v) => setDateRange(p => ({ ...p, end: v }))} />
          <button onClick={() => setDateRange({ start: "", end: "" })} className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:-translate-y-px" style={{ background: "#F3EDE1", border: "1px solid #E5DBC6", color: "#1E2A1F" }}>Clear</button>
          <div className="text-xs px-3 py-2 rounded-xl" style={{ background: "#D8E2CC", color: "#25421F" }}>
            Showing <span className="font-semibold">{processedData.length}</span> points (avg across sensors)
          </div>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="2 3" stroke="#E5DBC6" />
            <XAxis dataKey="xLabel" {...axisProps} minTickGap={20} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
            {LINES.filter(l => selectedMetrics[l.key]).map(l => (
              <Line key={l.key} type="monotone" dataKey={l.dataKey} stroke={COLORS[l.key]} strokeWidth={l.sw} name={l.name} dot={false} />
            ))}
            <Brush dataKey="xLabel" height={28} stroke="#B8BFBA" fill="#F3EDE1" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Moisture Avg Range", value: range(processedData, "moistureAvg", "%"),  color: "#3D6B3D" },
          { label: "Temperature Range",  value: range(processedData, "temperature",  "°C"), color: "#B5452D" },
          { label: "Humidity Range",     value: range(processedData, "humidity",     "%"),  color: "#D98A2B" },
          { label: "Data Points",        value: `${processedData.length}`,                  color: "#6B95AE" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#F3EDE1", border: "1px solid #E5DBC6" }}>
            <h4 className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: "#7A8579" }}>{s.label}</h4>
            <p className="text-sm font-medium" style={{ color: s.color, fontFamily: "'Fraunces', serif" }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
