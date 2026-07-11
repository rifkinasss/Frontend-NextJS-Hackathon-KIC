export type MonitoringLocationType = "Debu" | "Gas" | "Emisi" | "Campuran";

export type MonitoringLocation = {
  id: string;
  name: string;
  device_code?: string;
  location?: string;
  type: MonitoringLocationType;
  lat: number;
  lng: number;
  description?: string;
};
