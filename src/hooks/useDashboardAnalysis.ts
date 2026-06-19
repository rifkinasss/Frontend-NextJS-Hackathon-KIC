"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalysis } from "@/lib/api/analysis";
import type { AnalysisMode, AnalysisResponse } from "@/types/analysis";

const DEFAULT_START_DATE = "2026-06-05T08:00";
const DEFAULT_END_DATE = "2026-06-05T10:00";

export function useDashboardAnalysis() {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AnalysisMode>("realtime");
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);

  const query = useMemo(
    () => ({
      mode,
      startDate,
      endDate,
    }),
    [endDate, mode, startDate],
  );

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchAnalysis(query, signal);
        setData(result);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        const message =
          err instanceof Error ? err.message : "Gagal mengambil data analisis";
        setError(message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => refresh(controller.signal));

    return () => controller.abort();
  }, [refresh]);

  return {
    data,
    error,
    loading,
    mode,
    startDate,
    endDate,
    isRealtime: mode === "realtime",
    setStartDate,
    setEndDate,
    setHistoricalMode: () => setMode("historical"),
    setRealtimeMode: () => setMode("realtime"),
    refresh: () => refresh(),
  };
}
