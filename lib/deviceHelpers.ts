import type { IoTDevice, SensorMarker } from "@/types/iot";

export const NEW_FARM_VALUE = "__new_farm__";
export const FILTER_ALL = "__all__";
export const FILTER_UNASSIGNED = "__none__";

export const toMarkers = (devices: IoTDevice[]): SensorMarker[] =>
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

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function batteryLabel(v: number): { text: string; color: string; pct: number } {
  const pct = Math.max(0, Math.min(100, ((v - 3.0) / 1.2) * 100));
  if (pct > 60) return { text: "Good", color: "#3D6B3D", pct };
  if (pct > 25) return { text: "Fair", color: "#D98A2B", pct };
  return { text: "Low", color: "#B5452D", pct };
}

export function getMoistureVal(r: IoTDevice["currentReadings"]): number {
  if (!r) return 0;
  return typeof r.moisture === "number"
    ? r.moisture
    : (r.moisture1 + r.moisture2 + r.moisture3 + r.moisture4) / 4;
}
