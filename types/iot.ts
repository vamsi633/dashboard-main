export interface IoTDevice {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen: string;
  farmId?: string | null;
  farmName?: string | null;
  currentReadings: {
    moisture: number;
    moisture1: number;
    moisture2: number;
    moisture3: number;
    moisture4: number;
    humidity: number;
    temperature: number;
    lipVoltage: number;
    rtcBattery: number;
    dataPoints: number;
  } | null;
}

export interface SensorMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  data?: {
    moisture?: number;
    moisture1?: number;
    moisture2?: number;
    moisture3?: number;
    moisture4?: number;
    temperature?: number;
    humidity?: number;
    lipVoltage?: number;
    rtcBattery?: number;
    dataPoints?: number;
  };
}

export interface ApiResponse {
  success: boolean;
  boxes?: IoTDevice[];
  error?: string;
}

export interface ClaimResponse {
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

export type Farm = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListFarmsOk = { ok: true; farms: Farm[] };
export type ListFarmsErr = { ok: false; error: string };
export type ListFarmsResponse = ListFarmsOk | ListFarmsErr;

export type CreateFarmOk = { ok: true; farm: Farm };
export type CreateFarmErr = { ok: false; error: string };
export type CreateFarmResponse = CreateFarmOk | CreateFarmErr;

export type AssignFarmOk = { ok: true };
export type AssignFarmErr = { ok: false; error: string };
export type AssignFarmResponse = AssignFarmOk | AssignFarmErr;
