import { API_BASE_URL } from "@/lib/api/client";
import type { DeviceCommand, DeviceCommandName, DeviceState, RegisteredDevice } from "@/types/device";

export async function fetchDevices(signal?: AbortSignal): Promise<RegisteredDevice[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/devices`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil perangkat (${response.status})`);
  }

  const result = (await response.json()) as { data?: RegisteredDevice[] };
  return result.data ?? [];
}

export async function approveDevice(deviceId: string): Promise<RegisteredDevice> {
  const response = await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}/provisioning`, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });

  if (!response.ok) throw new Error(`Gagal menyetujui perangkat (${response.status})`);
  const result = (await response.json()) as { data: RegisteredDevice };
  return result.data;
}

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

export async function updateDevice(
  deviceId: string,
  data: {
    device_name?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    is_active?: boolean;
  }
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Gagal memperbarui data device (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

export async function createDevice(
  data: {
    device_code: string;
    device_name: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    firmware_ver?: string;
  }
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/v1/devices`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Gagal mendaftarkan device (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteDevice(
  deviceId: string,
  hard = true
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}?hard=${hard}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal menghapus device (${response.status})`);
  }

  return response.json();
}
