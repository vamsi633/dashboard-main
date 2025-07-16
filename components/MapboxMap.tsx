"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Updated interfaces to match Arduino data structure
interface SensorMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  data?: {
    moisture?: number;
    moisture1?: number;
    moisture2?: number;
    moisture3?: number;
    moisture4?: number;
    humidity?: number;
    temperature?: number;
    lipVoltage?: number;
    rtcBattery?: number;
    dataPoints?: number;
  };
}

interface GeoJSONFeature {
  type: "Feature";
  properties: {
    description: string;
    status?: string;
    markerType?: "device" | "sensor";
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

interface GeoJSONData {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

interface MapboxMapProps {
  sensors?: SensorMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showLabels?: boolean;
  className?: string;
}

// Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAP_BOX_ACCESS_KEY || "";

const MapboxMap: React.FC<MapboxMapProps> = ({
  sensors,
  center,
  zoom = 15,
  height = "500px",
  showLabels = false,
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false); // ✅ Track style loading separately
  const [mapError, setMapError] = useState<string | null>(null);

  // Create popup content with updated Arduino data structure
  const createPopupContent = useCallback((sensor: SensorMarker): string => {
    return `
      <div style="
        color: white;
        padding: 12px 16px;
        font-family: Arial, sans-serif;
        border-radius: 8px;
        max-width: 300px;
        background: #0f111a;
      ">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #3B82F6;">${
          sensor.name
        }</h3>
        ${
          sensor.data
            ? `
            <div style="margin: 8px 0;">
              ${
                sensor.data.moisture !== undefined
                  ? `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">💧 Overall Moisture:</span>
                    <span style="color: #10B981; font-weight: 600; font-size: 12px;">${sensor.data.moisture.toFixed(
                      1
                    )}%</span>
                  </div>
                  `
                  : ""
              }
              ${
                sensor.data.moisture1 !== undefined
                  ? `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">💧 Moisture 1:</span>
                    <span style="color: #10B981; font-weight: 600; font-size: 12px;">${sensor.data.moisture1.toFixed(
                      1
                    )}%</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">💧 Moisture 2:</span>
                    <span style="color: #10B981; font-weight: 600; font-size: 12px;">${(
                      sensor.data.moisture2 || 0
                    ).toFixed(1)}%</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">💧 Moisture 3:</span>
                    <span style="color: #10B981; font-weight: 600; font-size: 12px;">${(
                      sensor.data.moisture3 || 0
                    ).toFixed(1)}%</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">💧 Moisture 4:</span>
                    <span style="color: #10B981; font-weight: 600; font-size: 12px;">${(
                      sensor.data.moisture4 || 0
                    ).toFixed(1)}%</span>
                  </div>
                  `
                  : ""
              }
              ${
                sensor.data.temperature !== undefined
                  ? `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">🌡️ Temperature:</span>
                    <span style="color: #F59E0B; font-weight: 600; font-size: 12px;">${sensor.data.temperature}°C</span>
                  </div>
                  `
                  : ""
              }
              ${
                sensor.data.humidity !== undefined
                  ? `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">💨 Humidity:</span>
                    <span style="color: #06B6D4; font-weight: 600; font-size: 12px;">${sensor.data.humidity}%</span>
                  </div>
                  `
                  : ""
              }
              ${
                sensor.data.lipVoltage !== undefined &&
                sensor.data.rtcBattery !== undefined
                  ? `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">🔋 LiPo Battery:</span>
                    <span style="color: #8B5CF6; font-weight: 600; font-size: 12px;">${sensor.data.lipVoltage}V</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #D1D5DB; font-size: 12px;">🔋 RTC Battery:</span>
                    <span style="color: #8B5CF6; font-weight: 600; font-size: 12px;">${sensor.data.rtcBattery}V</span>
                  </div>
                  `
                  : ""
              }
              ${
                sensor.data.dataPoints !== undefined
                  ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #D1D5DB; font-size: 12px;">📊 Data Points:</span>
                    <span style="color: #06B6D4; font-weight: 600; font-size: 12px;">${sensor.data.dataPoints}</span>
                  </div>
                  `
                  : ""
              }
            </div>
            `
            : '<div style="color: #EF4444;">No data available</div>'
        }
      </div>
    `;
  }, []);

  // ✅ FIXED: Only add markers when both map AND style are loaded
  const addMarkersToMap = useCallback(
    (map: mapboxgl.Map): void => {
      // ✅ Critical fix: Check if style is loaded before proceeding
      if (!map.isStyleLoaded()) {
        console.log("⏳ Style not loaded yet, waiting...");
        return;
      }

      if (!sensors || sensors.length === 0) {
        // Clear existing markers if no sensors
        if (map.getSource("sensors")) {
          try {
            map.removeLayer("sensor-circles");
            map.removeSource("sensors");
          } catch {
            console.log("No markers to remove");
          }
        }
        return;
      }

      console.log(`📍 Adding ${sensors.length} markers to map`);

      try {
        // Create GeoJSON features
        const features: GeoJSONFeature[] = sensors.map((sensor) => ({
          type: "Feature",
          properties: {
            description: createPopupContent(sensor),
            markerType: "sensor",
          },
          geometry: {
            type: "Point",
            coordinates: sensor.coordinates,
          },
        }));

        const geojsonData: GeoJSONData = {
          type: "FeatureCollection",
          features: features,
        };

        // Update existing source or create new one
        if (map.getSource("sensors")) {
          (map.getSource("sensors") as mapboxgl.GeoJSONSource).setData(
            geojsonData
          );
          console.log("🔄 Updated existing markers");
        } else {
          // First time - add source and layer
          map.addSource("sensors", {
            type: "geojson",
            data: geojsonData,
          });

          // Add circles for sensors
          map.addLayer({
            id: "sensor-circles",
            type: "circle",
            source: "sensors",
            paint: {
              "circle-radius": 10,
              "circle-color": "#3B82F6",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#FFFFFF",
            },
          });

          // Add popup on hover
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
          });

          map.on("mouseenter", "sensor-circles", (e) => {
            map.getCanvas().style.cursor = "pointer";
            if (e.features && e.features[0]) {
              const feature = e.features[0];
              if (feature.geometry && feature.geometry.type === "Point") {
                const pointCoords = feature.geometry.coordinates;
                if (Array.isArray(pointCoords) && pointCoords.length >= 2) {
                  const coordinates: [number, number] = [
                    pointCoords[0],
                    pointCoords[1],
                  ];
                  const description = feature.properties?.description || "";

                  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] +=
                      e.lngLat.lng > coordinates[0] ? 360 : -360;
                  }

                  popup.setLngLat(coordinates).setHTML(description).addTo(map);
                }
              }
            }
          });

          map.on("mouseleave", "sensor-circles", () => {
            map.getCanvas().style.cursor = "";
            popup.remove();
          });

          console.log("➕ Added new markers and event handlers");
        }

        // Fit bounds to show all sensors (only if more than one sensor)
        if (sensors.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          sensors.forEach((sensor) => {
            bounds.extend(sensor.coordinates);
          });
          map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }

        // Clear existing custom labels
        const existingLabels = document.querySelectorAll(
          ".sensor-label-marker"
        );
        existingLabels.forEach((label) => label.remove());

        // Add custom labels if requested
        if (showLabels) {
          sensors.forEach((sensor) => {
            const el = document.createElement("div");
            el.className = "sensor-label-marker";
            el.innerHTML = `
            <div style="
              background-color: #3B82F6;
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              white-space: nowrap;
              transform: translateY(-100%);
              margin-bottom: 5px;
            ">
              ${sensor.id}
            </div>
          `;
            new mapboxgl.Marker(el).setLngLat(sensor.coordinates).addTo(map);
          });
        }
      } catch (error) {
        console.error("❌ Error adding markers:", error);
      }
    },
    [sensors, showLabels, createPopupContent]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    console.log(
      "🗺️ Initializing map with token:",
      mapboxgl.accessToken ? "Token found" : "No token"
    );

    try {
      let mapCenter: [number, number] = center || [-121.901782, 36.837007];
      if (!center && sensors && sensors.length > 0) {
        mapCenter = sensors[0].coordinates;
      }

      console.log("📍 Map center:", mapCenter);

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: mapCenter,
        zoom: zoom,
        antialias: true,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // ✅ FIXED: Track both map load and style load separately
      map.on("load", () => {
        console.log("✅ Map loaded successfully!");
        setMapLoaded(true);
      });

      map.on("style.load", () => {
        console.log("🎨 Style loaded!");
        setStyleLoaded(true); // ✅ Track style loading
      });

      // ✅ FIXED: Only add markers when style is loaded
      map.on("styledata", () => {
        if (map.isStyleLoaded()) {
          console.log("🎨 Style fully loaded, safe to add markers");
          addMarkersToMap(map);
        }
      });

      map.on("error", (e) => {
        console.error("❌ Map error:", e);
        setMapError("Map tiles failed to load. Using fallback view.");
      });

      mapRef.current = map;
    } catch (error) {
      console.error("❌ Failed to initialize map:", error);
      setMapError("Failed to initialize map");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, addMarkersToMap]);

  // ✅ FIXED: Only update markers when both map and style are loaded
  useEffect(() => {
    if (mapRef.current && mapLoaded && styleLoaded) {
      console.log("🔄 Updating markers for new sensor data:", sensors?.length);
      addMarkersToMap(mapRef.current);
    }
  }, [sensors, mapLoaded, styleLoaded, showLabels, addMarkersToMap]);

  // Update map center when center prop changes
  useEffect(() => {
    if (mapRef.current && mapLoaded && center) {
      console.log("📍 Updating map center to:", center);
      mapRef.current.flyTo({
        center: center,
        zoom: zoom,
        duration: 1000,
      });
    }
  }, [center, zoom, mapLoaded]);

  if (mapError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800 rounded-lg ${className}`}
        style={{ width: "100%", height: height }}
      >
        <div className="text-center p-4">
          <p className="text-yellow-400 mb-2">⚠️ Map Loading Issue</p>
          <p className="text-gray-400 text-sm">{mapError}</p>
          <p className="text-xs text-gray-500 mt-2">
            Your token is working, but tiles may be slow to load
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: height }}
      className={`map-container rounded-lg overflow-hidden ${className}`}
    >
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
            <p className="text-gray-300 text-sm">Loading map...</p>
          </div>
        </div>
      )}
      <style jsx>{`
        .mapboxgl-popup {
          max-width: 400px;
          font: 12px/20px "Helvetica Neue", Arial, Helvetica, sans-serif;
        }
        .mapboxgl-popup-content {
          background: #0f111a;
          color: #ffffff;
          border: 1px solid #9ca3af;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default MapboxMap;
