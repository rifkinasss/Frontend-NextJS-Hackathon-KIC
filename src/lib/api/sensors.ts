import { API_BASE_URL } from "@/lib/api/client";
import type { SensorDefinition, DeviceSensorMapping } from "@/types/sensor";

export async function fetchSensorDefinitions(
  includeInactive: boolean = false,
  signal?: AbortSignal,
): Promise<SensorDefinition[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/sensors/definitions?include_inactive=${includeInactive}`,
    {
      signal,
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gagal mengambil katalog sensor (${response.status})`);
  }

  const result = await response.json();
  return result.data || [];
}

export async function createSensorDefinition(data: {
  sensor_code: string;
  sensor_name: string;
  manufacturer?: string;
  description?: string;
  interface_type?: string;
}): Promise<SensorDefinition> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sensors/definitions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Gagal mendaftarkan sensor ke katalog (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteSensorDefinition(sensorDefId: number): Promise<any> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/sensors/definitions/${sensorDefId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gagal menghapus sensor dari katalog (${response.status})`);
  }

  return response.json();
}

export async function fetchDeviceSensors(
  deviceId: string,
  signal?: AbortSignal,
): Promise<DeviceSensorMapping[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/devices/${deviceId}/sensors`,
    {
      signal,
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gagal mengambil sensor device (${response.status})`);
  }

  const result = await response.json();
  return result.data || [];
}

export async function mapSensorToDevice(
  deviceId: string,
  data: {
    sensor_def_id: number;
    gpio_pin?: string;
    i2c_address?: string;
    install_date?: string;
    notes?: string;
  }
): Promise<DeviceSensorMapping> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/devices/${deviceId}/sensors`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Gagal memasang sensor ke device (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

export async function unmapSensorFromDevice(mappingId: number): Promise<any> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/devices/sensors/${mappingId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gagal mencopot sensor (${response.status})`);
  }

  return response.json();
}
