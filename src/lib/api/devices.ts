import { API_BASE_URL } from "@/lib/api/client";
import type { DeviceCommand, DeviceCommandName, DeviceState } from "@/types/device";

export async function fetchDeviceStates(
  signal?: AbortSignal,
): Promise<DeviceState[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/devices/states`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil status device (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

export async function sendDeviceCommand(
  deviceId: string,
  command: DeviceCommandName,
): Promise<DeviceCommand> {
  const response = await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}/commands`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      command,
      requested_by: "dashboard",
    }),
  });

  if (!response.ok) {
    throw new Error(`Gagal mengirim command device (${response.status})`);
  }

  const result = (await response.json()) as { data: DeviceCommand };
  return result.data;
}
