"use client";

// Updated interfaces to match Arduino data structure while preserving UI structure
interface Reading {
  moisture: number; // Overall moisture reading (NEW)
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  temperature: number;
  humidity: number;
  lipVoltage: number; // Updated from battery1
  rtcBattery: number; // Updated from battery2
  dataPoints: number; // NEW field
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

// Legacy interfaces for SensorGraph component compatibility
interface LegacyReading {
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  temperature: number;
  humidity: number;
  battery1: number; // Legacy field
  battery2: number; // Legacy field
  timestamp: string;
}

interface LegacySensor {
  su_id: string;
  readings: LegacyReading[];
}

interface LegacyBox {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  sensors: LegacySensor[];
  isOnline: boolean;
  lastSeen: string;
}

interface SensorData {
  boxes: Box[];
}

interface ApiResponse {
  success: boolean;
  boxes?: ApiBox[];
  error?: string;
}

interface ApiBox {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen: string;
  readings: Reading[];
}

interface UseSensorDataReturn {
  sensorData: SensorData;
  loading: boolean;
  error: string | null;
}

// Adapter function to convert new Box format to legacy format for SensorGraph
const convertBoxForSensorGraph = (box: Box): LegacyBox => {
  return {
    box_id: box.box_id,
    name: box.name,
    location: box.location,
    latitude: box.latitude,
    longitude: box.longitude,
    isOnline: box.isOnline,
    lastSeen: box.lastSeen,
    sensors: box.sensors.map(
      (sensor): LegacySensor => ({
        su_id: sensor.su_id,
        readings: sensor.readings.map(
          (reading): LegacyReading => ({
            moisture1: reading.moisture1,
            moisture2: reading.moisture2,
            moisture3: reading.moisture3,
            moisture4: reading.moisture4,
            temperature: reading.temperature,
            humidity: reading.humidity,
            battery1: reading.lipVoltage, // Map lipVoltage to battery1
            battery2: reading.rtcBattery, // Map rtcBattery to battery2
            timestamp: reading.timestamp,
          })
        ),
      })
    ),
  };
};

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import WaterDropLoader from "@/components/WaterDropLoader";
import MapboxMap from "@/components/MapboxMap";
import SensorGraph from "@/components/SensorGraph";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

// Function to convert API data to your existing UI format (updated for Arduino structure)
const convertApiDataToBoxFormat = (apiBoxes: ApiBox[]): SensorData => {
  const boxes: Box[] = apiBoxes.map((apiBox) => {
    // Create a single sensor object per box (since each box is one unit now)
    const sensor: Sensor = {
      su_id: `${apiBox.box_id}_main_sensor`,
      readings: apiBox.readings.map((reading) => ({
        moisture: reading.moisture || 0, // Overall moisture (NEW)
        moisture1: reading.moisture1 || 0,
        moisture2: reading.moisture2 || 0,
        moisture3: reading.moisture3 || 0,
        moisture4: reading.moisture4 || 0,
        temperature: reading.temperature || 0,
        humidity: reading.humidity || 0,
        lipVoltage: reading.lipVoltage || 0, // Updated from battery1
        rtcBattery: reading.rtcBattery || 0, // Updated from battery2
        dataPoints: reading.dataPoints || 0, // NEW field
        timestamp: reading.timestamp,
      })),
    };

    return {
      box_id: apiBox.box_id,
      name: apiBox.name || apiBox.box_id,
      location: apiBox.location || "Unknown Location",
      latitude: apiBox.latitude,
      longitude: apiBox.longitude,
      sensors: [sensor], // Single sensor per box
      isOnline: apiBox.isOnline,
      lastSeen: apiBox.lastSeen,
    };
  });

  return { boxes };
};

// Hook to fetch data from API
const useSensorData = (): UseSensorDataReturn => {
  const [sensorData, setSensorData] = useState<SensorData>({ boxes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (): Promise<void> => {
    try {
      setError(null);
      const response = await fetch("/api/dashboard/devices");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.boxes) {
        const convertedData = convertApiDataToBoxFormat(data.boxes);
        setSensorData(convertedData);
      } else {
        setError(data.error || "Failed to fetch sensor data");
        setSensorData({ boxes: [] });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError("Network error while fetching sensor data: " + errorMessage);
      console.error("Error fetching sensor data:", err);
      setSensorData({ boxes: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return { sensorData, loading, error };
};

export default function SensorsPage() {
  const { data: session, status } = useSession();
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Use API data instead of static JSON
  const {
    sensorData,
    loading: dataLoading,
    error: dataError,
  } = useSensorData();

  // Set the first box as default when component mounts, but preserve user selection
  useEffect(() => {
    if (sensorData.boxes && sensorData.boxes.length > 0) {
      // Only set default if no box is selected or if the selected box no longer exists
      if (
        !selectedBox ||
        !sensorData.boxes.find((box) => box.box_id === selectedBox.box_id)
      ) {
        setSelectedBox(sensorData.boxes[0]);
      } else {
        // Update the selected box with fresh data while preserving the selection
        const updatedSelectedBox = sensorData.boxes.find(
          (box) => box.box_id === selectedBox.box_id
        );
        if (updatedSelectedBox) {
          setSelectedBox(updatedSelectedBox);
        }
      }
    }
  }, [sensorData, selectedBox]);

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      redirect("/auth/signin");
    }
  }, [session, status]);

  // Process data to organize by date - Updated for Arduino structure
  const processedData = useMemo(() => {
    if (!selectedBox) return null;

    // Get all unique dates from all sensors
    const allDates = new Set<string>();
    selectedBox.sensors.forEach((sensor) => {
      sensor.readings.forEach((reading) => {
        const date = new Date(reading.timestamp).toLocaleDateString();
        allDates.add(date);
      });
    });

    // Sort dates
    const sortedDates = Array.from(allDates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    // Organize data by individual sensor type and date (updated for Arduino structure)
    const dataByMetric: Record<
      string,
      Record<string, Record<string, number>>
    > = {
      moisture1: {},
      moisture2: {},
      moisture3: {},
      moisture4: {},
      humidity: {},
      temperature: {},
      lipVoltage: {}, // Updated from battery1
      rtcBattery: {}, // Updated from battery2
    };

    selectedBox.sensors.forEach((sensor) => {
      // Initialize each sensor type
      dataByMetric.moisture1[`${sensor.su_id}_M1`] = {};
      dataByMetric.moisture2[`${sensor.su_id}_M2`] = {};
      dataByMetric.moisture3[`${sensor.su_id}_M3`] = {};
      dataByMetric.moisture4[`${sensor.su_id}_M4`] = {};
      dataByMetric.humidity[`${sensor.su_id}_HUM`] = {};
      dataByMetric.temperature[`${sensor.su_id}_TEMP`] = {};
      dataByMetric.lipVoltage[`${sensor.su_id}_LIPO`] = {}; // Updated
      dataByMetric.rtcBattery[`${sensor.su_id}_RTC`] = {}; // Updated

      sensor.readings.forEach((reading) => {
        const date = new Date(reading.timestamp).toLocaleDateString();

        // Store individual sensor values (updated for Arduino structure)
        dataByMetric.moisture1[`${sensor.su_id}_M1`][date] = reading.moisture1;
        dataByMetric.moisture2[`${sensor.su_id}_M2`][date] = reading.moisture2;
        dataByMetric.moisture3[`${sensor.su_id}_M3`][date] = reading.moisture3;
        dataByMetric.moisture4[`${sensor.su_id}_M4`][date] = reading.moisture4;
        dataByMetric.humidity[`${sensor.su_id}_HUM`][date] = reading.humidity;
        dataByMetric.temperature[`${sensor.su_id}_TEMP`][date] =
          reading.temperature;
        dataByMetric.lipVoltage[`${sensor.su_id}_LIPO`][date] =
          reading.lipVoltage; // Updated
        dataByMetric.rtcBattery[`${sensor.su_id}_RTC`][date] =
          reading.rtcBattery; // Updated
      });
    });

    return { dates: sortedDates, dataByMetric };
  }, [selectedBox]);

  // Calculate stats for selected box (updated for Arduino structure)
  const boxStats = useMemo(() => {
    if (!selectedBox) return null;

    let totalMoisture = 0;
    let totalHumidity = 0;
    let totalTemperature = 0;
    let count = 0;

    selectedBox.sensors.forEach((sensor) => {
      sensor.readings.forEach((reading) => {
        // Calculate average moisture from all 4 sensors
        const avgMoisture =
          (reading.moisture1 +
            reading.moisture2 +
            reading.moisture3 +
            reading.moisture4) /
          4;
        totalMoisture += avgMoisture;
        totalHumidity += reading.humidity;
        totalTemperature += reading.temperature;
        count++;
      });
    });

    return {
      avgMoisture: count > 0 ? (totalMoisture / count).toFixed(1) : "0.0",
      avgHumidity: count > 0 ? (totalHumidity / count).toFixed(1) : "0.0",
      avgTemperature: count > 0 ? (totalTemperature / count).toFixed(1) : "0.0",
      sensorCount: selectedBox.sensors.length,
      readingCount: count,
    };
  }, [selectedBox]);

  // Show loader while checking authentication or loading data
  if (status === "loading" || dataLoading) {
    return <WaterDropLoader />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F111A] via-[#121624] to-[#121624] text-white">
      <div className="px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mx-auto w-full max-w-[1600px]">
        <Navbar />
        <main className="py-4 pt-[90px]">
          <div className="p-6">
            <h1 className="text-4xl font-bold text-white mb-8">Sensors</h1>

            {/* Error Display */}
            {dataError && (
              <div className="mb-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                <p>Error loading sensor data: {dataError}</p>
              </div>
            )}

            {/* No Data Message */}
            {sensorData.boxes.length === 0 && !dataLoading && (
              <div className="mb-8 bg-gray-800 border border-gray-600 rounded-lg p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">
                  No sensor boxes found
                </h2>
                <p className="text-gray-400 mb-4">
                  Sensor boxes will appear here once they start sending data.
                </p>
                <a
                  href="/api/add-dummy-data"
                  target="_blank"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg inline-block"
                >
                  Add Test Box Data
                </a>
              </div>
            )}

            {/* Dropdown for box selection (same UI) */}
            {sensorData.boxes.length > 0 && (
              <div className="mb-8">
                <div className="relative w-64">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-[#0F111A] border border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-blue-400 transition-colors"
                  >
                    <span>
                      {selectedBox ? selectedBox.box_id : "Select a Box"}
                    </span>
                    <ChevronDownIcon
                      className={`h-5 w-5 transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-[#0F111A] border border-gray-600 rounded-lg shadow-lg">
                      {sensorData.boxes.map((box) => (
                        <button
                          key={box.box_id}
                          onClick={() => {
                            setSelectedBox(box);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          <div className="flex flex-col">
                            <span>{box.box_id}</span>
                            <span className="text-xs text-gray-400">
                              {box.location} •{" "}
                              {box.isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedBox && (
              <>
                {/* Stats Cards (same UI) */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-1">Avg Moisture</h3>
                    <p className="text-2xl font-bold text-blue-400">
                      {boxStats?.avgMoisture}%
                    </p>
                  </div>
                  <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-1">Avg Humidity</h3>
                    <p className="text-2xl font-bold text-green-400">
                      {boxStats?.avgHumidity}%
                    </p>
                  </div>
                  <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-1">
                      Avg Temperature
                    </h3>
                    <p className="text-2xl font-bold text-orange-400">
                      {boxStats?.avgTemperature}°C
                    </p>
                  </div>
                  <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-1">
                      Total Sensors
                    </h3>
                    <p className="text-2xl font-bold text-purple-400">
                      {boxStats?.sensorCount}
                    </p>
                  </div>
                  <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4">
                    <h3 className="text-gray-400 text-sm mb-1">
                      Total Readings
                    </h3>
                    <p className="text-2xl font-bold text-pink-400">
                      {boxStats?.readingCount}
                    </p>
                  </div>
                </div>

                {/* Main Content Grid (same UI) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Map Section (same UI, updated for Arduino data) */}
                  <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-4">
                      Sensor Locations
                    </h2>
                    <MapboxMap
                      sensors={selectedBox.sensors.map((sensor, index) => ({
                        id: sensor.su_id,
                        name: sensor.su_id,
                        coordinates: [
                          selectedBox.longitude + index * 0.001,
                          selectedBox.latitude + index * 0.001,
                        ] as [number, number],
                        data: sensor.readings[sensor.readings.length - 1]
                          ? {
                              moisture:
                                sensor.readings[sensor.readings.length - 1]
                                  .moisture,
                              moisture1:
                                sensor.readings[sensor.readings.length - 1]
                                  .moisture1,
                              moisture2:
                                sensor.readings[sensor.readings.length - 1]
                                  .moisture2,
                              moisture3:
                                sensor.readings[sensor.readings.length - 1]
                                  .moisture3,
                              moisture4:
                                sensor.readings[sensor.readings.length - 1]
                                  .moisture4,
                              humidity:
                                sensor.readings[sensor.readings.length - 1]
                                  .humidity,
                              temperature:
                                sensor.readings[sensor.readings.length - 1]
                                  .temperature,
                              lipVoltage:
                                sensor.readings[sensor.readings.length - 1]
                                  .lipVoltage,
                              rtcBattery:
                                sensor.readings[sensor.readings.length - 1]
                                  .rtcBattery,
                              dataPoints:
                                sensor.readings[sensor.readings.length - 1]
                                  .dataPoints,
                            }
                          : undefined,
                      }))}
                      center={
                        [selectedBox.longitude, selectedBox.latitude] as [
                          number,
                          number
                        ]
                      }
                      zoom={15}
                      height="500px"
                      showLabels={true}
                    />
                  </div>

                  {/* Data Table Section - Same complex multi-table UI, updated for Arduino */}
                  <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-4">
                      Individual Sensor Data by Date
                    </h2>
                    <div className="overflow-x-auto">
                      <div className="min-w-full">
                        {/* Table for Moisture Sensors (4 individual sensors) */}
                        <div className="mb-6">
                          <h3 className="text-lg font-medium text-blue-300 mb-2">
                            Moisture Sensors (%)
                          </h3>
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr>
                                <th className="border border-gray-600 px-2 py-2 text-left bg-gray-800 w-32 sticky left-0 z-10">
                                  Sensor
                                </th>
                                {processedData?.dates.slice(-10).map((date) => (
                                  <th
                                    key={date}
                                    className="border border-gray-600 px-2 py-2 text-center bg-gray-800 text-xs min-w-[80px]"
                                  >
                                    {new Date(date).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                      }
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                "moisture1",
                                "moisture2",
                                "moisture3",
                                "moisture4",
                              ].map((moistureType) => (
                                <tr
                                  key={moistureType}
                                  className="hover:bg-gray-700"
                                >
                                  <td className="border border-gray-600 px-2 py-2 font-medium text-blue-400 sticky left-0 bg-[#0F111A] z-10">
                                    {moistureType === "moisture1" && "M1"}
                                    {moistureType === "moisture2" && "M2"}
                                    {moistureType === "moisture3" && "M3"}
                                    {moistureType === "moisture4" && "M4"}
                                  </td>
                                  {processedData?.dates
                                    .slice(-10)
                                    .map((date) => {
                                      const sensorKey = Object.keys(
                                        processedData.dataByMetric[moistureType]
                                      )[0];
                                      const value =
                                        processedData.dataByMetric[
                                          moistureType
                                        ][sensorKey]?.[date];
                                      return (
                                        <td
                                          key={date}
                                          className="border border-gray-600 px-2 py-2 text-center text-xs"
                                        >
                                          {value ? value.toFixed(1) : "-"}
                                        </td>
                                      );
                                    })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Table for Environmental Sensors */}
                        <div className="mb-6">
                          <h3 className="text-lg font-medium text-green-300 mb-2">
                            Environmental Sensors
                          </h3>
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr>
                                <th className="border border-gray-600 px-2 py-2 text-left bg-gray-800 w-32 sticky left-0 z-10">
                                  Sensor
                                </th>
                                {processedData?.dates.slice(-10).map((date) => (
                                  <th
                                    key={date}
                                    className="border border-gray-600 px-2 py-2 text-center bg-gray-800 text-xs min-w-[80px]"
                                  >
                                    {new Date(date).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                      }
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-gray-700">
                                <td className="border border-gray-600 px-2 py-2 font-medium text-orange-400 sticky left-0 bg-[#0F111A] z-10">
                                  Temp
                                </td>
                                {processedData?.dates.slice(-10).map((date) => {
                                  const sensorKey = Object.keys(
                                    processedData.dataByMetric.temperature
                                  )[0];
                                  const value =
                                    processedData.dataByMetric.temperature[
                                      sensorKey
                                    ]?.[date];
                                  return (
                                    <td
                                      key={date}
                                      className="border border-gray-600 px-2 py-2 text-center text-xs"
                                    >
                                      {value ? value.toFixed(1) : "-"}
                                    </td>
                                  );
                                })}
                              </tr>
                              <tr className="hover:bg-gray-700">
                                <td className="border border-gray-600 px-2 py-2 font-medium text-green-400 sticky left-0 bg-[#0F111A] z-10">
                                  Humid
                                </td>
                                {processedData?.dates.slice(-10).map((date) => {
                                  const sensorKey = Object.keys(
                                    processedData.dataByMetric.humidity
                                  )[0];
                                  const value =
                                    processedData.dataByMetric.humidity[
                                      sensorKey
                                    ]?.[date];
                                  return (
                                    <td
                                      key={date}
                                      className="border border-gray-600 px-2 py-2 text-center text-xs"
                                    >
                                      {value ? value.toFixed(1) : "-"}
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Table for Battery Sensors - Updated for Arduino (LiPo/RTC) */}
                        <div className="mb-6">
                          <h3 className="text-lg font-medium text-purple-300 mb-2">
                            Battery Status (V)
                          </h3>
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr>
                                <th className="border border-gray-600 px-2 py-2 text-left bg-gray-800 w-32 sticky left-0 z-10">
                                  Battery
                                </th>
                                {processedData?.dates.slice(-10).map((date) => (
                                  <th
                                    key={date}
                                    className="border border-gray-600 px-2 py-2 text-center bg-gray-800 text-xs min-w-[80px]"
                                  >
                                    {new Date(date).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                      }
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {["lipVoltage", "rtcBattery"].map(
                                (batteryType) => (
                                  <tr
                                    key={batteryType}
                                    className="hover:bg-gray-700"
                                  >
                                    <td className="border border-gray-600 px-2 py-2 font-medium text-purple-400 sticky left-0 bg-[#0F111A] z-10">
                                      {batteryType === "lipVoltage" && "LiPo"}
                                      {batteryType === "rtcBattery" && "RTC"}
                                    </td>
                                    {processedData?.dates
                                      .slice(-10)
                                      .map((date) => {
                                        const sensorKey = Object.keys(
                                          processedData.dataByMetric[
                                            batteryType
                                          ]
                                        )[0];
                                        const value =
                                          processedData.dataByMetric[
                                            batteryType
                                          ][sensorKey]?.[date];
                                        return (
                                          <td
                                            key={date}
                                            className="border border-gray-600 px-2 py-2 text-center text-xs"
                                          >
                                            {value ? value.toFixed(2) : "-"}
                                          </td>
                                        );
                                      })}
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Graph Section (same UI) */}
                <div className="mt-8">
                  <SensorGraph
                    selectedBox={convertBoxForSensorGraph(selectedBox)}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
