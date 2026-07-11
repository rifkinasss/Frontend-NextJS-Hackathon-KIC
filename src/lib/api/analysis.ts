import type { AnalysisQuery, AnalysisResponse } from "@/types/analysis";
import { API_BASE_URL } from "@/lib/api/client";

function toBackendDate(value: string) {
  return value.replace("T", " ");
}

export async function fetchAnalysis(
  query: AnalysisQuery,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  const url = new URL(`${API_BASE_URL}/api/v1/analysis`);

  if (query.mode === "historical" && query.startDate && query.endDate) {
    url.searchParams.set("start", toBackendDate(query.startDate));
    url.searchParams.set("end", toBackendDate(query.endDate));
  }

  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil data analisis (${response.status})`);
  }

  return response.json();
}
