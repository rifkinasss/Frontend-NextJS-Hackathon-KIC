import type { FuzzyConfigResponse } from "@/types/fuzzy-config";
import { API_BASE_URL } from "@/lib/api/client";

export async function fetchFuzzyConfig(
  signal?: AbortSignal,
): Promise<FuzzyConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/config`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil konfigurasi fuzzy (${response.status})`);
  }

  return response.json();
}
