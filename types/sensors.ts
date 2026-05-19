export interface Reading {
  moisture: number;
  moisture1: number;
  moisture2: number;
  moisture3: number;
  moisture4: number;
  temperature: number;
  humidity: number;
  lipVoltage: number;
  rtcBattery: number;
  dataPoints: number;
  timestamp: string;
}

export interface Sensor {
  su_id: string;
  readings: Reading[];
}

export interface Box {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  sensors: Sensor[];
  isOnline: boolean;
  lastSeen: string;
  farmId?: string | null;
  farmName?: string | null;
}

export interface SensorData {
  boxes: Box[];
}

export interface ApiBox {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastSeen: string;
  farmId?: string | null;
  farmName?: string | null;
  readings: Reading[];
}

export interface ApiSensorResponse {
  success: boolean;
  boxes?: ApiBox[];
  error?: string;
}

export interface UseSensorDataReturn {
  sensorData: SensorData;
  loading: boolean;
  error: string | null;
}

export interface LegacyReading {
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

export interface LegacySensor {
  su_id: string;
  readings: LegacyReading[];
}

export interface LegacyBox {
  box_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  sensors: LegacySensor[];
  isOnline: boolean;
  lastSeen: string;
}

export type DailyAvgRow = {
  dateKey: string;
  displayDate: string;
  avgMoisture: number;
  avgTemp: number;
  avgHum: number;
  avgLiPo: number;
  avgRTC: number;
  count: number;
};

export type FarmOption = {
  id: string;
  name: string;
};
