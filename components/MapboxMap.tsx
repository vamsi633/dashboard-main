"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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

// Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAP_BOX_ACCESS_KEY || "";

const SOURCE_ID = "sensors";
const LAYER_ID = "sensor-circles";

const MapboxMap: React.FC<MapboxMapProps> = ({
  sensors = [],
  center,
  zoom = 15,
  height = "500px",
  showLabels = false,
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const labelMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const handlersBoundRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const initialCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (sensors.length > 0) return sensors[0].coordinates;
    return [-121.901782, 36.837007];
  }, [center, sensors]);

  const createPopupContent = useCallback((sensor: SensorMarker): string => {
    const d = sensor.data;
    return `
      <div style="
        color: white;
        padding: 12px 16px;
        font-family: Arial, sans-serif;
        border-radius: 8px;
        max-width: 320px;
        background: #0f111a;
      ">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #3B82F6;">
          ${sensor.name}
        </h3>

        ${
          d
            ? `
          <div style="margin: 8px 0;">
            ${
              d.moisture !== undefined
                ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#D1D5DB;font-size:12px;">💧 Overall Moisture:</span>
                    <span style="color:#10B981;font-weight:600;font-size:12px;">${d.moisture.toFixed(
                      1
                    )}%</span>
                  </div>`
                : ""
            }

            ${
              d.moisture1 !== undefined
                ? `
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="color:#D1D5DB;font-size:12px;">💧 Moisture 1:</span>
                  <span style="color:#10B981;font-weight:600;font-size:12px;">${d.moisture1.toFixed(
                    1
                  )}%</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="color:#D1D5DB;font-size:12px;">💧 Moisture 2:</span>
                  <span style="color:#10B981;font-weight:600;font-size:12px;">${(
                    d.moisture2 ?? 0
                  ).toFixed(1)}%</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="color:#D1D5DB;font-size:12px;">💧 Moisture 3:</span>
                  <span style="color:#10B981;font-weight:600;font-size:12px;">${(
                    d.moisture3 ?? 0
                  ).toFixed(1)}%</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="color:#D1D5DB;font-size:12px;">💧 Moisture 4:</span>
                  <span style="color:#10B981;font-weight:600;font-size:12px;">${(
                    d.moisture4 ?? 0
                  ).toFixed(1)}%</span>
                </div>
              `
                : ""
            }

            ${
              d.temperature !== undefined
                ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#D1D5DB;font-size:12px;">🌡️ Temperature:</span>
                    <span style="color:#F59E0B;font-weight:600;font-size:12px;">${d.temperature}°C</span>
                  </div>`
                : ""
            }

            ${
              d.humidity !== undefined
                ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#D1D5DB;font-size:12px;">💨 Humidity:</span>
                    <span style="color:#06B6D4;font-weight:600;font-size:12px;">${d.humidity}%</span>
                  </div>`
                : ""
            }

            ${
              d.lipVoltage !== undefined
                ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#D1D5DB;font-size:12px;">🔋 LiPo Battery:</span>
                    <span style="color:#8B5CF6;font-weight:600;font-size:12px;">${d.lipVoltage}V</span>
                  </div>`
                : ""
            }

            ${
              d.rtcBattery !== undefined
                ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#D1D5DB;font-size:12px;">🔋 RTC Battery:</span>
                    <span style="color:#8B5CF6;font-weight:600;font-size:12px;">${d.rtcBattery}V</span>
                  </div>`
                : ""
            }

            ${
              d.dataPoints !== undefined
                ? `<div style="display:flex;justify-content:space-between;">
                    <span style="color:#D1D5DB;font-size:12px;">📊 Data Points:</span>
                    <span style="color:#06B6D4;font-weight:600;font-size:12px;">${d.dataPoints}</span>
                  </div>`
                : ""
            }
          </div>
        `
            : `<div style="color:#EF4444;">No data available</div>`
        }
      </div>
    `;
  }, []);

  const clearLabelMarkers = useCallback(() => {
    for (const m of labelMarkersRef.current) {
      m.remove();
    }
    labelMarkersRef.current = [];
  }, []);

  const setGeoJsonData = useCallback(
    (map: mapboxgl.Map) => {
      // if no sensors -> remove layers/source
      if (!sensors || sensors.length === 0) {
        clearLabelMarkers();

        if (map.getLayer(LAYER_ID)) {
          map.removeLayer(LAYER_ID);
        }
        if (map.getSource(SOURCE_ID)) {
          map.removeSource(SOURCE_ID);
        }
        return;
      }

      const features: GeoJSONFeature[] = sensors.map((sensor) => ({
        type: "Feature",
        properties: {
          description: createPopupContent(sensor),
          markerType: "sensor",
        },
        geometry: { type: "Point", coordinates: sensor.coordinates },
      }));

      const data: GeoJSONData = { type: "FeatureCollection", features };

      const existingSource = map.getSource(SOURCE_ID);
      if (existingSource) {
        (existingSource as mapboxgl.GeoJSONSource).setData(data);
      } else {
        map.addSource(SOURCE_ID, { type: "geojson", data });

        map.addLayer({
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": 10,
            "circle-color": "#3B82F6",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#FFFFFF",
          },
        });
      }

      // bind hover handlers once
      if (!handlersBoundRef.current) {
        handlersBoundRef.current = true;

        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
        });

        map.on("mouseenter", LAYER_ID, (e) => {
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features?.[0];
          if (!feature) return;

          if (feature.geometry?.type !== "Point") return;

          const coords = feature.geometry.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) return;

          const coordinates: [number, number] = [coords[0], coords[1]];
          const description =
            typeof feature.properties?.description === "string"
              ? feature.properties.description
              : "";

          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          popupRef.current
            ?.setLngLat(coordinates)
            .setHTML(description)
            .addTo(map);
        });

        map.on("mouseleave", LAYER_ID, () => {
          map.getCanvas().style.cursor = "";
          popupRef.current?.remove();
        });
      }

      // labels (safe remove via marker.remove)
      clearLabelMarkers();
      if (showLabels) {
        for (const sensor of sensors) {
          const el = document.createElement("div");
          el.innerHTML = `
            <div style="
              background-color:#3B82F6;
              color:white;
              padding:4px 8px;
              border-radius:4px;
              font-size:12px;
              font-weight:bold;
              white-space:nowrap;
              transform: translateY(-100%);
              margin-bottom: 5px;
            ">
              ${sensor.id}
            </div>
          `;

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(sensor.coordinates)
            .addTo(map);

          labelMarkersRef.current.push(marker);
        }
      }

      // fit bounds if multiple
      if (sensors.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        for (const s of sensors) bounds.extend(s.coordinates);
        map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    },
    [sensors, showLabels, createPopupContent, clearLabelMarkers]
  );

  // ✅ init map ONCE (no sensors dependency)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    if (!mapboxgl.accessToken) {
      setMapError(
        "Missing Mapbox access token (NEXT_PUBLIC_MAP_BOX_ACCESS_KEY)."
      );
      return;
    }

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: initialCenter,
        zoom,
        antialias: true,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        setMapLoaded(true);
        // add first dataset after load
        setGeoJsonData(map);
      });

      map.on("error", (e) => {
        console.error("❌ Map error:", e);
        // don't hard-fail for tile hiccups; only set if it becomes unusable
      });

      mapRef.current = map;
    } catch (err) {
      console.error("❌ Failed to initialize map:", err);
      setMapError("Failed to initialize map");
    }

    return () => {
      // cleanup (important for React dev double-mount)
      clearLabelMarkers();
      popupRef.current?.remove();
      popupRef.current = null;
      handlersBoundRef.current = false;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // ✅ critical: ensure container is empty after remove
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ no deps

  // update markers when sensors/labels change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // if style not ready yet, wait for it
    const map = mapRef.current;
    if (!map.isStyleLoaded()) {
      const onStyle = () => {
        if (mapRef.current && mapRef.current.isStyleLoaded()) {
          setGeoJsonData(mapRef.current);
          mapRef.current.off("styledata", onStyle);
        }
      };
      map.on("styledata", onStyle);
      return () => {
        map.off("styledata", onStyle);
      };
    }

    setGeoJsonData(map);
  }, [sensors, showLabels, mapLoaded, setGeoJsonData]);

  // center updates
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !center) return;
    mapRef.current.flyTo({ center, zoom, duration: 900 });
  }, [center, zoom, mapLoaded]);

  if (mapError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800 rounded-lg ${className}`}
        style={{ width: "100%", height }}
      >
        <div className="text-center p-4">
          <p className="text-yellow-400 mb-2">⚠️ Map Loading Issue</p>
          <p className="text-gray-400 text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height }}
      className={`map-container rounded-lg overflow-hidden ${className}`}
    >
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2" />
            <p className="text-gray-300 text-sm">Loading map...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .mapboxgl-popup {
          max-width: 420px;
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
