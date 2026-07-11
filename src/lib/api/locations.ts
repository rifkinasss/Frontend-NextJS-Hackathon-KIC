import type { MonitoringLocation } from "@/types/location";
import { API_BASE_URL } from "@/lib/api/client";

function getDeviceType(deviceCode: string): "Debu" | "Gas" | "Emisi" {
  const code = deviceCode.toUpperCase();
  if (code.startsWith("DB") || code.includes("DEBU")) return "Debu";
  if (code.startsWith("GS") || code.includes("GAS")) return "Gas";
  if (code.startsWith("EM") || code.includes("EMISI")) return "Emisi";
  return "Debu";
}

export async function fetchLocations(
  signal?: AbortSignal,
): Promise<MonitoringLocation[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/locations`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil lokasi monitoring (${response.status})`);
  }

  const result = await response.json();
  const rawData = result.data || [];

  return rawData.map((loc: any) => ({
    id: loc.id,
    name: loc.name || loc.device_code || "",
    type: loc.type || getDeviceType(loc.device_code || ""),
    lat: loc.lat || 0,
    lng: loc.lng || 0,
  }));
}
