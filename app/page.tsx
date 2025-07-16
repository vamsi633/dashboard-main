"use client";
import Navbar from "@/components/Navbar";
import MapboxMap from "@/components/MapboxMap";
import Weather from "@/components/Weather";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import WaterDropLoader from "@/components/WaterDropLoader";

// Updated interfaces to match Arduino data structure
interface IoTDevice {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen: string;
  currentReadings: {
    moisture: number; // Overall moisture reading (NEW)
    moisture1: number;
    moisture2: number;
    moisture3: number;
    moisture4: number;
    humidity: number;
    temperature: number;
    lipVoltage: number; // Updated from battery1
    rtcBattery: number; // Updated from battery2
    dataPoints: number; // NEW field
  } | null;
}

// Interface for sensor markers (for MapboxMap)
interface SensorMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  data?: {
    moisture?: number; // Overall moisture (NEW)
    moisture1?: number;
    moisture2?: number;
    moisture3?: number;
    moisture4?: number;
    temperature?: number;
    humidity?: number;
    lipVoltage?: number; // Updated from battery1
    rtcBattery?: number; // Updated from battery2
    dataPoints?: number; // NEW field
  };
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  boxes?: IoTDevice[];
  error?: string;
}

// Interface for device claim response
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

// Interface for hook return type
interface UseIoTDevicesReturn {
  devices: IoTDevice[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Hook to fetch IoT device data
const useIoTDevices = (): UseIoTDevicesReturn => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async (): Promise<void> => {
    try {
      setError(null);
      const response = await fetch("/api/dashboard/devices");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        setDevices(data.boxes || []);
      } else {
        setError(data.error || "Failed to fetch device data");
        setDevices([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError("Network error while fetching device data: " + errorMessage);
      console.error("Error fetching IoT devices:", err);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  return { devices, loading, error, refetch: fetchDevices };
};

// Convert IoT devices to sensor markers for detailed popup data
const convertToSensorMarkers = (iotDevices: IoTDevice[]): SensorMarker[] => {
  return iotDevices.map((device) => ({
    id: device.box_id,
    name: device.name || device.box_id,
    coordinates: [device.longitude, device.latitude] as [number, number],
    data: device.currentReadings
      ? {
          moisture: device.currentReadings.moisture, // NEW: Overall moisture
          moisture1: device.currentReadings.moisture1,
          moisture2: device.currentReadings.moisture2,
          moisture3: device.currentReadings.moisture3,
          moisture4: device.currentReadings.moisture4,
          temperature: device.currentReadings.temperature,
          humidity: device.currentReadings.humidity,
          lipVoltage: device.currentReadings.lipVoltage, // Updated from battery1
          rtcBattery: device.currentReadings.rtcBattery, // Updated from battery2
          dataPoints: device.currentReadings.dataPoints, // NEW field
        }
      : undefined,
  }));
};

export default function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [claiming, setClaiming] = useState(false);

  const { data: session, status } = useSession();

  // Fetch real IoT device data
  const {
    devices: iotDevices,
    loading: devicesLoading,
    error: devicesError,
    refetch: refetchDevices,
  } = useIoTDevices();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      redirect("/auth/signin");
    }
  }, [session, status]);

  // Calculate card width on mount and resize
  useEffect(() => {
    const updateCardWidth = (): void => {
      if (scrollContainerRef.current) {
        const firstCard =
          scrollContainerRef.current.querySelector(".device-card");
        if (firstCard) {
          const width = firstCard.getBoundingClientRect().width + 16;
          setCardWidth(width);
        }
      }
    };

    updateCardWidth();
    window.addEventListener("resize", updateCardWidth);
    return () => window.removeEventListener("resize", updateCardWidth);
  }, [iotDevices]);

  // Handle device claiming
  const handleClaimDevice = async () => {
    if (!deviceId.trim()) {
      alert("Please enter a device ID");
      return;
    }

    setClaiming(true);
    try {
      const response = await fetch("/api/devices/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: deviceId.trim() }),
      });

      const data: ClaimResponse = await response.json();

      if (data.success) {
        alert(
          `✅ Device claimed successfully!\n\n${data.message}\n\nThe device will now appear in your dashboard with all historical data.`
        );
        setShowClaimModal(false);
        setDeviceId("");
        refetchDevices(); // Refresh device list
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (claimError) {
      console.error("Error claiming device:", claimError);
      alert("❌ Error claiming device. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (status === "loading" || devicesLoading) {
    return <WaterDropLoader />;
  }

  if (!session) {
    return null;
  }

  // Convert IoT devices for display
  const sensorMarkers = convertToSensorMarkers(iotDevices);

  const handleScroll = (direction: "left" | "right"): void => {
    setScrollPosition((prev) => {
      if (direction === "right") {
        return Math.min(prev + 1, Math.max(0, iotDevices.length - 1));
      } else {
        return Math.max(prev - 1, 0);
      }
    });
  };

  const isAtStart = scrollPosition === 0;
  const isAtEnd = scrollPosition === Math.max(0, iotDevices.length - 1);
  const scrollX = -scrollPosition * cardWidth;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F111A] via-[#121624] to-[#121624] text-white">
      <div className="px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mx-auto w-full max-w-[1600px]">
        <Navbar />
        <main className="py-4 pt-[90px]">
          <div className="flex justify-between items-center mb-4 p-6">
            <h1 className="text-4xl font-bold text-white">
              Welcome to the Dashboard{" "}
              <span className="text-[#9ba8f4]">
                {session.user?.name || "User"}
              </span>
            </h1>

            {/* 🆕 Add Device Button */}
            <button
              onClick={() => setShowClaimModal(true)}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Device</span>
            </button>
          </div>

          {/* Device Status Summary */}
          {iotDevices.length > 0 && (
            <div className="mb-6 px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {iotDevices.length}
                  </div>
                  <div className="text-sm text-gray-400">Total Devices</div>
                </div>
                <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {iotDevices.filter((d) => d.isOnline).length}
                  </div>
                  <div className="text-sm text-gray-400">Online</div>
                </div>
                <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {iotDevices.filter((d) => !d.isOnline).length}
                  </div>
                  <div className="text-sm text-gray-400">Offline</div>
                </div>
                <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {iotDevices.filter((d) => d.currentReadings).length > 0
                      ? Math.round(
                          iotDevices
                            .filter((d) => d.currentReadings)
                            .reduce((sum, d) => {
                              // Use overall moisture if available, otherwise calculate average
                              const avgMoisture =
                                d.currentReadings?.moisture !== undefined
                                  ? d.currentReadings.moisture
                                  : d.currentReadings
                                  ? (d.currentReadings.moisture1 +
                                      d.currentReadings.moisture2 +
                                      d.currentReadings.moisture3 +
                                      d.currentReadings.moisture4) /
                                    4
                                  : 0;
                              return sum + avgMoisture;
                            }, 0) /
                            iotDevices.filter((d) => d.currentReadings).length
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-gray-400">Avg Moisture</div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {devicesError && (
            <div className="mb-6 mx-6 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              <p>Error loading device data: {devicesError}</p>
            </div>
          )}

          {/* 🆕 No Devices Message with Add Device CTA */}
          {iotDevices.length === 0 && !devicesLoading && !devicesError && (
            <div className="mb-6 mx-6 bg-gray-800 border border-gray-600 rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">
                No IoT Devices Found
              </h2>
              <p className="text-gray-400 mb-4">
                Click &quot;Add Device&quot; to claim a device using its Device
                ID.
              </p>
              <button
                onClick={() => setShowClaimModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Your First Device</span>
              </button>
            </div>
          )}

          {/* Horizontal Scroll Device Cards Section */}
          {iotDevices.length > 0 && (
            <div className="relative mb-6 pb-6">
              {/* Left Arrow */}
              <button
                onClick={() => handleScroll("left")}
                disabled={isAtStart}
                className={`absolute left-0 top-1/2 transform -translate-y-1/2 bg-[#0F111A] bg-opacity-50 text-white p-2 rounded-full z-10 ${
                  isAtStart
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-opacity-75"
                }`}
                aria-label="Scroll Left"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>

              {/* Scroll Container */}
              <div className="overflow-x-hidden">
                <motion.div
                  ref={scrollContainerRef}
                  className="flex space-x-4 will-change-transform"
                  style={{ transform: "translate3d(0, 0, 0)" }}
                  animate={{ x: scrollX }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    mass: 1,
                  }}
                >
                  {iotDevices.map((device) => {
                    // Calculate average moisture from individual sensors
                    const individualAvgMoisture = device.currentReadings
                      ? (
                          (device.currentReadings.moisture1 +
                            device.currentReadings.moisture2 +
                            device.currentReadings.moisture3 +
                            device.currentReadings.moisture4) /
                          4
                        ).toFixed(1)
                      : "N/A";

                    return (
                      <div
                        key={device.box_id}
                        className="device-card flex-shrink-0 w-80 bg-[#0F111A] border-[0.5px] ring-1 ring-blue-400 bg-dark-300 bg-card bg-cover rounded-lg p-4 shadow-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {device.name || device.box_id}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              device.isOnline
                                ? "bg-green-900 text-green-300"
                                : "bg-red-900 text-red-300"
                            }`}
                          >
                            {device.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-1">
                          <span className="font-medium">Location:</span>{" "}
                          {device.location}
                        </p>
                        {device.currentReadings && (
                          <>
                            {/* Show overall moisture if available */}
                            {device.currentReadings.moisture !== undefined && (
                              <p className="text-sm text-gray-300 mb-1">
                                <span className="font-medium">
                                  Overall Moisture:
                                </span>{" "}
                                {device.currentReadings.moisture.toFixed(1)}%
                              </p>
                            )}
                            <p className="text-sm text-gray-300 mb-1">
                              <span className="font-medium">
                                Avg Individual:
                              </span>{" "}
                              {individualAvgMoisture}%
                            </p>
                            <p className="text-sm text-gray-300 mb-1">
                              <span className="font-medium">Temperature:</span>{" "}
                              {device.currentReadings.temperature.toFixed(1)}°C
                            </p>
                            <p className="text-sm text-gray-300 mb-1">
                              <span className="font-medium">Humidity:</span>{" "}
                              {device.currentReadings.humidity.toFixed(1)}%
                            </p>
                            <p className="text-sm text-gray-300 mb-1">
                              <span className="font-medium">LiPo Battery:</span>{" "}
                              {device.currentReadings.lipVoltage.toFixed(2)}V
                            </p>
                            <p className="text-sm text-gray-300 mb-1">
                              <span className="font-medium">RTC Battery:</span>{" "}
                              {device.currentReadings.rtcBattery.toFixed(2)}V
                            </p>
                            {/* Show data points if available */}
                            {device.currentReadings.dataPoints !==
                              undefined && (
                              <p className="text-sm text-gray-300">
                                <span className="font-medium">
                                  Data Points:
                                </span>{" "}
                                {device.currentReadings.dataPoints}
                              </p>
                            )}
                          </>
                        )}
                        {!device.currentReadings && (
                          <p className="text-sm text-gray-500">
                            No recent sensor data
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Last seen:{" "}
                          {new Date(device.lastSeen).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </motion.div>
              </div>

              {/* Right Arrow */}
              <button
                onClick={() => handleScroll("right")}
                disabled={isAtEnd}
                className={`absolute right-0 top-1/2 transform -translate-y-1/2 bg-[#0F111A] bg-opacity-50 text-white p-2 rounded-full z-10 ${
                  isAtEnd
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-opacity-75"
                }`}
                aria-label="Scroll Right"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </div>
          )}

          {/* Weather Cards Section */}
          <Weather />
          <br />
          <br />

          {/* Map Section with Real IoT Device Data */}
          {iotDevices.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-4 px-6">
                Device Locations
              </h2>
              <MapboxMap
                sensors={sensorMarkers}
                showLabels={true}
                height="600px"
              />
            </div>
          ) : (
            <div className="mb-6 bg-gray-800 border border-gray-600 rounded-lg p-8 text-center mx-6">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                Map View
              </h3>
              <p className="text-gray-400">
                Map will show device locations once devices are added
              </p>
            </div>
          )}
        </main>
      </div>

      {/* 🆕 Device Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Add Device</h3>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Device ID
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Enter device ID (e.g., GREENHOUSE_BOX_001)"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-2">
                💡 Enter the unique ID of the device you want to add to your
                dashboard. You can find this ID on the device label or from your
                field technician.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowClaimModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimDevice}
                disabled={claiming}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-md transition-colors"
              >
                {claiming ? "Adding..." : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
