export type MonitoringLocationType = "Debu" | "Gas" | "Emisi";

export type MonitoringLocation = {
  id: string;
  name: string;
  type: MonitoringLocationType;
  lat: number;
  lng: number;
};
