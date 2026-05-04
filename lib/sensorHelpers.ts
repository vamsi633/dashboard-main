import type { Box, ApiBox, LegacyBox, SensorData } from "@/types/sensors";

export const convertBoxForSensorGraph = (box: Box): LegacyBox => ({
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

export const convertApiDataToBoxFormat = (apiBoxes: ApiBox[]): SensorData => {
  const boxes: Box[] = apiBoxes.map((apiBox) => {
    const sensor = {
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

export const toDateKey = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
