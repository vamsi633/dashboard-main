"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface SensorMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  data?: {
    moisture?: number;
    moisture1?: number; moisture2?: number; moisture3?: number; moisture4?: number;
    humidity?: number; temperature?: number;
    lipVoltage?: number; rtcBattery?: number; dataPoints?: number;
  };
}

interface MapboxMapProps {
  sensors?: SensorMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showLabels?: boolean;
  className?: string;
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAP_BOX_ACCESS_KEY || "";

const SOURCE_ID = "sensors";
const LAYER_ID  = "sensor-circles";

const row = (label: string, val: string | number, color: string) =>
  `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">
    <span style="color:#D1D5DB;font-size:12px;">${label}</span>
    <span style="color:${color};font-weight:600;font-size:12px;">${val}</span>
  </div>`;

export default function MapboxMap({
  sensors = [], center, zoom = 15, height = "500px", showLabels = false, className = "",
}: MapboxMapProps) {
  const mapContainerRef  = useRef<HTMLDivElement | null>(null);
  const mapRef           = useRef<mapboxgl.Map | null>(null);
  const popupRef         = useRef<mapboxgl.Popup | null>(null);
  const labelMarkersRef  = useRef<mapboxgl.Marker[]>([]);
  const handlersBoundRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError]   = useState<string | null>(null);

  const initialCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (sensors.length > 0) return sensors[0].coordinates;
    return [-121.901782, 36.837007];
  }, [center, sensors]);

  const createPopupContent = useCallback((sensor: SensorMarker): string => {
    const d = sensor.data;
    const body = !d
      ? `<div style="color:#EF4444;">No data available</div>`
      : [
          d.moisture  !== undefined ? row("💧 Overall Moisture:", `${d.moisture.toFixed(1)}%`,         "#10B981") : "",
          d.moisture1 !== undefined ? row("💧 Moisture 1:",       `${d.moisture1.toFixed(1)}%`,        "#10B981") : "",
          d.moisture1 !== undefined ? row("💧 Moisture 2:",       `${(d.moisture2 ?? 0).toFixed(1)}%`, "#10B981") : "",
          d.moisture1 !== undefined ? row("💧 Moisture 3:",       `${(d.moisture3 ?? 0).toFixed(1)}%`, "#10B981") : "",
          d.moisture1 !== undefined ? row("💧 Moisture 4:",       `${(d.moisture4 ?? 0).toFixed(1)}%`, "#10B981") : "",
          d.temperature !== undefined ? row("🌡️ Temperature:",    `${d.temperature}°C`,               "#F59E0B") : "",
          d.humidity    !== undefined ? row("💨 Humidity:",        `${d.humidity}%`,                   "#06B6D4") : "",
          d.lipVoltage  !== undefined ? row("🔋 LiPo Battery:",   `${d.lipVoltage}V`,                 "#8B5CF6") : "",
          d.rtcBattery  !== undefined ? row("🔋 RTC Battery:",    `${d.rtcBattery}V`,                 "#8B5CF6") : "",
          d.dataPoints  !== undefined ? row("📊 Data Points:",     d.dataPoints,                       "#06B6D4") : "",
        ].join("");
    return `<div style="color:white;padding:12px 16px;font-family:Arial,sans-serif;border-radius:8px;max-width:320px;background:#0f111a;">
      <h3 style="margin:0 0 8px 0;font-size:16px;color:#3B82F6;">${sensor.name}</h3>
      <div style="margin:8px 0;">${body}</div>
    </div>`;
  }, []);

  const clearLabelMarkers = useCallback(() => {
    labelMarkersRef.current.forEach((m) => m.remove());
    labelMarkersRef.current = [];
  }, []);

  const setGeoJsonData = useCallback((map: mapboxgl.Map) => {
    if (!sensors?.length) {
      clearLabelMarkers();
      if (map.getLayer(LAYER_ID))  map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      return;
    }

    const features = sensors.map((sensor) => ({
      type: "Feature" as const,
      properties: { description: createPopupContent(sensor), markerType: "sensor" },
      geometry: { type: "Point" as const, coordinates: sensor.coordinates },
    }));
    const data = { type: "FeatureCollection" as const, features };

    const existing = map.getSource(SOURCE_ID);
    if (existing) {
      (existing as mapboxgl.GeoJSONSource).setData(data);
    } else {
      map.addSource(SOURCE_ID, { type: "geojson", data });
      map.addLayer({
        id: LAYER_ID, type: "circle", source: SOURCE_ID,
        paint: { "circle-radius": 10, "circle-color": "#3B82F6", "circle-stroke-width": 2, "circle-stroke-color": "#FFFFFF" },
      });
    }

    if (!handlersBoundRef.current) {
      handlersBoundRef.current = true;
      popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

      map.on("mouseenter", LAYER_ID, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = e.features?.[0];
        if (!feature || feature.geometry?.type !== "Point") return;
        const coords = feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return;
        const coordinates: [number, number] = [coords[0], coords[1]];
        const description = typeof feature.properties?.description === "string" ? feature.properties.description : "";
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180)
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        popupRef.current?.setLngLat(coordinates).setHTML(description).addTo(map);
      });

      map.on("mouseleave", LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
    }

    clearLabelMarkers();
    if (showLabels) {
      for (const sensor of sensors) {
        const el = document.createElement("div");
        el.innerHTML = `<div style="background-color:#3B82F6;color:white;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;white-space:nowrap;transform:translateY(-100%);margin-bottom:5px;">${sensor.id}</div>`;
        labelMarkersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat(sensor.coordinates).addTo(map));
      }
    }

    if (sensors.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      for (const s of sensors) bounds.extend(s.coordinates);
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [sensors, showLabels, createPopupContent, clearLabelMarkers]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;
    if (!mapboxgl.accessToken) {
      setMapError("Missing Mapbox access token (NEXT_PUBLIC_MAP_BOX_ACCESS_KEY).");
      return;
    }
    try {
      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/streets-v12",
        center: initialCenter, zoom, antialias: true,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.on("load", () => { setMapLoaded(true); setGeoJsonData(map); });
      map.on("error", (e) => console.error("Map error:", e));
      mapRef.current = map;
    } catch (err) {
      console.error("Failed to initialize map:", err);
      setMapError("Failed to initialize map");
    }
    return () => {
      clearLabelMarkers();
      popupRef.current?.remove();
      popupRef.current = null;
      handlersBoundRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
      if (container) container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) {
      const onStyle = () => { if (mapRef.current?.isStyleLoaded()) { setGeoJsonData(mapRef.current); mapRef.current.off("styledata", onStyle); } };
      map.on("styledata", onStyle);
      return () => { map.off("styledata", onStyle); };
    }
    setGeoJsonData(map);
  }, [sensors, showLabels, mapLoaded, setGeoJsonData]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !center) return;
    mapRef.current.flyTo({ center, zoom, duration: 900 });
  }, [center, zoom, mapLoaded]);

  if (mapError) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 rounded-lg ${className}`} style={{ width: "100%", height }}>
        <div className="text-center p-4">
          <p className="text-yellow-400 mb-2">⚠️ Map Loading Issue</p>
          <p className="text-gray-400 text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%" }}
        className={`map-container rounded-lg overflow-hidden ${className}`}
      />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2" />
            <p className="text-gray-300 text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
