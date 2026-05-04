"use client";

import { motion } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { Farm } from "@/types/iot";
import { NEW_FARM_VALUE } from "@/lib/deviceHelpers";

interface ClaimModalProps {
  farms: Farm[];
  farmsLoading: boolean;
  farmsErr: string | null;
  selectedFarmId: string;
  setSelectedFarmId: (id: string) => void;
  deviceId: string;
  setDeviceId: (id: string) => void;
  newFarmName: string;
  setNewFarmName: (v: string) => void;
  newFarmLocation: string;
  setNewFarmLocation: (v: string) => void;
  newFarmDescription: string;
  setNewFarmDescription: (v: string) => void;
  creatingFarm: boolean;
  claiming: boolean;
  onClose: () => void;
  onClaim: () => void;
  onCreateFarm: () => void;
}

export default function ClaimModal({
  farms,
  farmsLoading,
  farmsErr,
  selectedFarmId,
  setSelectedFarmId,
  deviceId,
  setDeviceId,
  newFarmName,
  setNewFarmName,
  newFarmLocation,
  setNewFarmLocation,
  newFarmDescription,
  setNewFarmDescription,
  creatingFarm,
  claiming,
  onClose,
  onClaim,
  onCreateFarm,
}: ClaimModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: "rgba(30,42,31,0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md mx-4 rounded-2xl p-6"
        style={{
          background: "#FDFBF5",
          border: "1px solid #E5DBC6",
          boxShadow: "0 24px 48px -12px rgba(30,42,31,0.25)",
          color: "#1E2A1F",
        }}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-display text-2xl tracking-tight">Add Device</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "#F3EDE1", color: "#7A8579" }}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        {farmsLoading && (
          <p className="text-sm mb-3" style={{ color: "#7A8579" }}>
            Loading…
          </p>
        )}
        {farmsErr && (
          <p className="text-sm mb-3" style={{ color: "#B5452D" }}>
            {farmsErr}
          </p>
        )}
        <div className="mb-5">
          <label
            className="block text-[11px] font-medium uppercase tracking-wider mb-2"
            style={{ color: "#7A8579" }}
          >
            Farm
          </label>
          <select
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
            style={{ background: "#F3EDE1", border: "1px solid #E5DBC6" }}
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            <option value={NEW_FARM_VALUE}>+ Create new farm…</option>
          </select>
          <div className="mt-2 text-[11px]" style={{ color: "#7A8579" }}>
            Manage in{" "}
            <Link href="/farms" className="underline" style={{ color: "#3D6B3D" }}>
              /farms
            </Link>
          </div>
        </div>
        {selectedFarmId === NEW_FARM_VALUE && (
          <div
            className="mb-5 rounded-xl p-4"
            style={{ background: "#F3EDE1", border: "1px solid #E5DBC6" }}
          >
            <div className="text-sm font-semibold mb-3" style={{ color: "#25421F" }}>
              New farm
            </div>
            <div className="space-y-3">
              <div>
                <label
                  className="block text-[11px] font-medium uppercase tracking-wider mb-1"
                  style={{ color: "#7A8579" }}
                >
                  Name *
                </label>
                <input
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  placeholder="Farm name"
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                  style={{ background: "#FDFBF5", border: "1px solid #E5DBC6" }}
                />
              </div>
              <div>
                <label
                  className="block text-[11px] font-medium uppercase tracking-wider mb-1"
                  style={{ color: "#7A8579" }}
                >
                  Location
                </label>
                <input
                  value={newFarmLocation}
                  onChange={(e) => setNewFarmLocation(e.target.value)}
                  placeholder="City, State"
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                  style={{ background: "#FDFBF5", border: "1px solid #E5DBC6" }}
                />
              </div>
              <div>
                <label
                  className="block text-[11px] font-medium uppercase tracking-wider mb-1"
                  style={{ color: "#7A8579" }}
                >
                  Description
                </label>
                <textarea
                  value={newFarmDescription}
                  onChange={(e) => setNewFarmDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
                  style={{ background: "#FDFBF5", border: "1px solid #E5DBC6" }}
                />
              </div>
              <button
                onClick={onCreateFarm}
                disabled={creatingFarm}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: "#25421F", color: "#FDFBF5" }}
              >
                {creatingFarm ? "Creating..." : "Create Farm"}
              </button>
            </div>
          </div>
        )}
        <div className="mb-5">
          <label
            className="block text-[11px] font-medium uppercase tracking-wider mb-2"
            style={{ color: "#7A8579" }}
          >
            Device ID
          </label>
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="GREENHOUSE_BOX_001"
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B3D]"
            style={{ background: "#F3EDE1", border: "1px solid #E5DBC6" }}
          />
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "#F3EDE1", border: "1px solid #E5DBC6" }}
          >
            Cancel
          </button>
          <button
            onClick={onClaim}
            disabled={claiming || selectedFarmId === NEW_FARM_VALUE}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ background: "#25421F", color: "#FDFBF5" }}
          >
            {claiming ? "Adding..." : "Add Device"}
          </button>
        </div>
        {selectedFarmId === NEW_FARM_VALUE && (
          <p className="mt-3 text-[11px]" style={{ color: "#7A8579" }}>
            Create farm first, then claim device.
          </p>
        )}
      </motion.div>
    </div>
  );
}
