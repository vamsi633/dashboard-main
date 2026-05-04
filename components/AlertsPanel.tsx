"use client";

import { motion } from "framer-motion";
import type { IoTDevice } from "@/types/iot";
import {timeAgo, batteryLabel, getMoistureVal} from "@/lib/deviceHelpers";

function AlertsPanel({ devices }: { devices: IoTDevice[] }) {
  const alerts: {
    type: "warn" | "danger" | "info" | "ok";
    title: string;
    body: string;
    time: string;
    icon: React.ReactNode;
  }[] = [];
  devices
    .filter((d) => !d.isOnline)
    .forEach((d) => {
      alerts.push({
        type: "danger",
        title: `${d.name || d.box_id} hasn't checked in`,
        body: `${d.farmName || d.location} · Last heard ${timeAgo(
          d.lastSeen
        )}. Could be antenna or battery.`,
        time: `Silent ${timeAgo(d.lastSeen)}`,
        icon: (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        ),
      });
    });
  devices
    .filter(
      (d) =>
        d.currentReadings && batteryLabel(d.currentReadings.lipVoltage).pct < 30
    )
    .forEach((d) => {
      const bl = batteryLabel(d.currentReadings!.lipVoltage);
      alerts.push({
        type: "warn",
        title: `${d.name || d.box_id} battery is low`,
        body: `${d.farmName || d.location} · ~${Math.round(
          bl.pct
        )}% left. Swap soon.`,
        time: `${d.currentReadings!.lipVoltage.toFixed(2)}V`,
        icon: (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="6" width="18" height="12" rx="2" />
            <line x1="23" y1="13" x2="23" y2="11" />
          </svg>
        ),
      });
    });
  devices
    .filter((d) => d.currentReadings && getMoistureVal(d.currentReadings) < 25)
    .forEach((d) => {
      alerts.push({
        type: "info",
        title: `${d.name || d.box_id} soil is drying out`,
        body: `Moisture at ${getMoistureVal(d.currentReadings).toFixed(
          1
        )}%. Irrigation would help.`,
        time: `Current`,
        icon: (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2.5s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z" />
          </svg>
        ),
      });
    });
  const ok = devices.filter(
    (d) =>
      d.isOnline &&
      d.currentReadings &&
      batteryLabel(d.currentReadings.lipVoltage).pct >= 30 &&
      getMoistureVal(d.currentReadings) >= 25
  ).length;
  if (ok > 0)
    alerts.push({
      type: "ok",
      title: `${ok} station${ok > 1 ? "s" : ""} running well`,
      body: `Sensors reporting, batteries healthy, moisture good.`,
      time: `Updated just now`,
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
    });

  const bg: Record<string, string> = {
    warn: "rgba(249,225,192,0.5)",
    danger: "rgba(240,209,197,0.5)",
    info: "rgba(213,226,234,0.5)",
    ok: "rgba(216,226,204,0.3)",
  };
  const bd: Record<string, string> = {
    warn: "#F0DBB4",
    danger: "#E8C3B5",
    info: "#C9D6DF",
    ok: "#E5DBC6",
  };
  const ibg: Record<string, string> = {
    warn: "#F6E1C0",
    danger: "#F0D1C5",
    info: "#D5E2EA",
    ok: "#D8E2CC",
  };
  const ic: Record<string, string> = {
    warn: "#D98A2B",
    danger: "#B5452D",
    info: "#6B95AE",
    ok: "#25421F",
  };

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex gap-3.5 p-4 rounded-2xl"
          style={{ background: bg[a.type], border: `1px solid ${bd[a.type]}` }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: ibg[a.type], color: ic[a.type] }}
          >
            {a.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm" style={{ color: "#1E2A1F" }}>
              {a.title}
            </div>
            <div
              className="text-[13px] mt-0.5 leading-relaxed"
              style={{ color: "#4A5A4C" }}
            >
              {a.body}
            </div>
            <div className="text-[11px] mt-1" style={{ color: "#7A8579" }}>
              {a.time}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default AlertsPanel;