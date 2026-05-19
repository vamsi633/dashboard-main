"use client";

import { useState, useEffect } from "react";
import type { IoTDevice, ApiResponse } from "@/types/iot";

export interface UseIoTDevicesReturn {
  devices: IoTDevice[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useIoTDevices(farmFilter: string): UseIoTDevicesReturn {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setError(null);
      const url =
        farmFilter === "__all__"
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
    setLoading(true);
    fetchDevices();
    const i = setInterval(fetchDevices, 30000);
    return () => clearInterval(i);
  }, [farmFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return { devices, loading, error, refetch: fetchDevices };
}
