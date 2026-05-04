"use client";

import { useState, useEffect } from "react";
import type { SensorData, ApiSensorResponse, UseSensorDataReturn } from "@/types/sensors";
import { convertApiDataToBoxFormat } from "@/lib/sensorHelpers";

export function useSensorData(enabled: boolean, farmId: string): UseSensorDataReturn {
  const [sensorData, setSensorData] = useState<SensorData>({ boxes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (): Promise<void> => {
    if (!enabled) return;
    try {
      setError(null);
      const url =
        farmId && farmId !== "__all__"
          ? `/api/dashboard/devices?farmId=${encodeURIComponent(farmId)}`
          : "/api/dashboard/devices";

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data: ApiSensorResponse = await response.json();
      if (data.success && data.boxes) {
        setSensorData(convertApiDataToBoxFormat(data.boxes));
      } else {
        setError(data.error || "Failed to fetch sensor data");
        setSensorData({ boxes: [] });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error occurred";
      setError("Network error while fetching sensor data: " + msg);
      setSensorData({ boxes: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [enabled, farmId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { sensorData, loading, error };
}
