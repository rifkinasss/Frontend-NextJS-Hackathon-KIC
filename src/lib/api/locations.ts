import type { MonitoringLocation } from "@/types/location";
import { API_BASE_URL } from "@/lib/api/client";

export async function fetchLocations(
  signal?: AbortSignal,
): Promise<MonitoringLocation[]> {
  const response = await fetch(`${API_BASE_URL}/locations`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil lokasi monitoring (${response.status})`);
  }

  return response.json();
}
