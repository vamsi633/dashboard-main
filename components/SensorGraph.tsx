// components/SensorGraph.tsx
// FIXED for new box structure
"use client";
import React, { useState, useMemo } from "react";
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

// Updated interfaces to match your sensors page structure
interface Reading {
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  temperature: number;
  humidity: number;
  battery1: number;
  battery2: number;
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

// Types for tooltip payload
interface TooltipPayload {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

export default function SensorGraph({ selectedBox }: SensorGraphProps) {
  // State for controlling what data to show
  const [selectedMetrics, setSelectedMetrics] = useState({
    moisture1: true,
    moisture2: true,
    moisture3: true,
    moisture4: true,
    moistureAvg: true,
    temperature: true,
    humidity: true,
    battery1: false, // Start with batteries hidden
    battery2: false,
  });

  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Process data for the graph - FIXED to use sensors[0].readings
  const processedData = useMemo(() => {
    if (!selectedBox?.sensors?.[0]?.readings) return [];

    const readings = selectedBox.sensors[0].readings;
    let filteredReadings = readings;

    // Apply date filter if set
    if (dateRange.start) {
      filteredReadings = filteredReadings.filter(
        (reading) => new Date(reading.timestamp) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filteredReadings = filteredReadings.filter(
        (reading) => new Date(reading.timestamp) <= new Date(dateRange.end)
      );
    }

    // Sort by timestamp
    filteredReadings.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return filteredReadings.map((reading) => {
      const moistureAvg =
        (reading.moisture1 +
          reading.moisture2 +
          reading.moisture3 +
          reading.moisture4) /
        4;
      const batteryAvg = (reading.battery1 + reading.battery2) / 2;

      return {
        timestamp: new Date(reading.timestamp).toLocaleDateString(),
        time: new Date(reading.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        moisture1: reading.moisture1,
        moisture2: reading.moisture2,
        moisture3: reading.moisture3,
        moisture4: reading.moisture4,
        moistureAvg: moistureAvg,
        temperature: reading.temperature,
        humidity: reading.humidity,
        battery1: reading.battery1,
        battery2: reading.battery2,
        batteryAvg: batteryAvg,
      };
    });
  }, [selectedBox, dateRange]);

  // Custom tooltip with proper TypeScript types
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`Time: ${label}`}</p>
          {payload.map((entry: TooltipPayload, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value.toFixed(1)}${
                entry.name.includes("Temperature")
                  ? "°C"
                  : entry.name.includes("Battery")
                  ? "%"
                  : "%"
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Clear date range
  const clearDateRange = () => {
    setDateRange({ start: "", end: "" });
  };

  // FIXED: Check if we have readings data
  if (!selectedBox || !selectedBox.sensors?.[0]?.readings?.length) {
    return (
      <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-8 text-center">
        <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
        <p className="text-gray-400">
          No sensor readings available for graphing.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F111A] border border-gray-600 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">
        {selectedBox.name || selectedBox.box_id} - Sensor Data Analysis
      </h2>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Metric Selection */}
        <div>
          <h3 className="text-lg font-medium mb-3">
            Select Metrics to Display
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Moisture Sensors */}
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.moisture1}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moisture1: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-blue-400">Moisture 1</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.moisture2}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moisture2: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-blue-300">Moisture 2</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.moisture3}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moisture3: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-blue-500">Moisture 3</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.moisture4}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moisture4: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-blue-600">Moisture 4</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.moistureAvg}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    moistureAvg: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-cyan-400 font-medium">Moisture Avg</span>
            </label>

            {/* Environment Sensors */}
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.temperature}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    temperature: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-orange-400">Temperature</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.humidity}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    humidity: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-green-400">Humidity</span>
            </label>

            {/* Battery Sensors */}
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.battery1}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    battery1: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-purple-400">Battery 1</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMetrics.battery2}
                onChange={(e) =>
                  setSelectedMetrics((prev) => ({
                    ...prev,
                    battery2: e.target.checked,
                  }))
                }
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-pink-400">Battery 2</span>
            </label>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            />
          </div>
          <button
            onClick={clearDateRange}
            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm mt-6"
          >
            Clear
          </button>
          <div className="text-sm text-gray-400 mt-6">
            Showing {processedData.length} readings
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Moisture Lines */}
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
                name="Moisture Average"
                dot={false}
              />
            )}

            {/* Environment Lines */}
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

            {/* Battery Lines */}
            {selectedMetrics.battery1 && (
              <Line
                type="monotone"
                dataKey="battery1"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Battery 1"
                dot={false}
              />
            )}
            {selectedMetrics.battery2 && (
              <Line
                type="monotone"
                dataKey="battery2"
                stroke="#A855F7"
                strokeWidth={2}
                name="Battery 2"
                dot={false}
              />
            )}

            <Brush dataKey="timestamp" height={30} stroke="#4B5563" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-800 rounded p-3">
          <h4 className="text-blue-400 font-medium">Moisture Range</h4>
          <p>
            {processedData.length > 0 ? (
              <>
                {Math.min(...processedData.map((d) => d.moistureAvg)).toFixed(
                  1
                )}
                % -
                {Math.max(...processedData.map((d) => d.moistureAvg)).toFixed(
                  1
                )}
                %
              </>
            ) : (
              "No data"
            )}
          </p>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <h4 className="text-orange-400 font-medium">Temp Range</h4>
          <p>
            {processedData.length > 0 ? (
              <>
                {Math.min(...processedData.map((d) => d.temperature)).toFixed(
                  1
                )}
                °C -
                {Math.max(...processedData.map((d) => d.temperature)).toFixed(
                  1
                )}
                °C
              </>
            ) : (
              "No data"
            )}
          </p>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <h4 className="text-green-400 font-medium">Humidity Range</h4>
          <p>
            {processedData.length > 0 ? (
              <>
                {Math.min(...processedData.map((d) => d.humidity)).toFixed(1)}%
                -{Math.max(...processedData.map((d) => d.humidity)).toFixed(1)}%
              </>
            ) : (
              "No data"
            )}
          </p>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <h4 className="text-purple-400 font-medium">Data Points</h4>
          <p>{processedData.length} readings</p>
        </div>
      </div>
    </div>
  );
}
