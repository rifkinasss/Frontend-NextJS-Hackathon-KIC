export type DevicePowerState = "on" | "off";

export type DeviceCommandName = "turn_off" | "turn_on" | "restart";

export type DeviceState = {
  device_id: string;
  is_online: boolean;
  power_state: DevicePowerState;
  battery_voltage?: number | null;
  wifi_rssi?: number | null;
  uptime_seconds?: number | null;
  last_seen_at: string | null;
  last_command_at: string | null;
  updated_at: string | null;
};

export type DeviceCommand = {
  id: number;
  device_id: string;
  command: DeviceCommandName;
  status: "pending" | "sent" | "acknowledged" | "failed";
  requested_by: string | null;
  error_message: string | null;
  created_at: string | null;
  acknowledged_at: string | null;
};

export type RegisteredDevice = {
  id: string;
  device_code: string;
  device_name: string;
  hardware_id: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  firmware_ver: string | null;
  provisioning_status: "pending" | "approved" | "rejected";
};
