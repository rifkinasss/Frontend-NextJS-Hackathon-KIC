"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Expand,
  Flame,
  Info,
  Loader2,
  MapPin,
  RadioTower,
  RefreshCcw,
  Search,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { fetchAnalysis } from "@/lib/api/analysis";
import { fetchLocations } from "@/lib/api/locations";
import { cn } from "@/lib/utils";
import type { AnalysisResponse } from "@/types/analysis";
import type { MonitoringLocation, MonitoringLocationType } from "@/types/location";

type StatusFilter = "Semua" | "AMAN" | "WASPADA" | "BAHAYA";
type TypeFilter = "Semua" | MonitoringLocationType;

const MapComponent = dynamic(() => import("@/components/map/MapComponent"), {
  loading: () => <MapLoading />,
  ssr: false,
});

export function MapPageClient() {
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Semua");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("Semua");
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<MonitoringLocation[]>([]);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const [locationResult, analysisResult] = await Promise.all([
        fetchLocations(signal),
        fetchAnalysis({ mode: "realtime" }, signal),
      ]);

      setLocations(locationResult);
      setAnalysisData(analysisResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Gagal memuat data GIS");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadData(controller.signal));

    return () => controller.abort();
  }, [loadData]);

  const filteredLocations = useMemo(
    () => filterLocations(locations, analysisData, query, typeFilter, statusFilter),
    [analysisData, locations, query, statusFilter, typeFilter],
  );
  const stats = useMemo(() => getMapStats(filteredLocations), [filteredLocations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <MapCommandHeader
        error={error}
        loading={loading}
        onRefresh={() => void loadData()}
        stats={stats}
      />

      {error && <ErrorNotice message={error} onRetry={() => void loadData()} />}

      <section className="space-y-6">
          <MapFilterPanel
            query={query}
            resultCount={filteredLocations.length}
            setQuery={setQuery}
            setStatusFilter={setStatusFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            totalCount={locations.length}
            typeFilter={typeFilter}
          />
          {loading && locations.length === 0 ? (
            <MapLoading />
          ) : (
            <div className={cn(mapFullscreen && "fixed inset-4 z-50 rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-950")}>
              <MapToolbarOverlay
                fullscreen={mapFullscreen}
                onToggleFullscreen={() => setMapFullscreen((value) => !value)}
              />
              <MapComponent
                analysisData={analysisData}
                fullscreen={mapFullscreen}
                locations={filteredLocations}
              />
            </div>
          )}
          <GisFooter />
      </section>
    </div>
  );
}

function MapToolbarOverlay({
  fullscreen,
  onToggleFullscreen,
}: {
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "mb-3 flex justify-end",
        !fullscreen && "absolute right-4 top-4 z-[1001] mb-0",
      )}
    >
      <Button
        className="h-10 rounded-xl bg-white/95 shadow-sm backdrop-blur hover:bg-white dark:bg-slate-950/95 dark:hover:bg-slate-900"
        onClick={onToggleFullscreen}
        type="button"
        variant="outline"
      >
        <Expand size={16} />
        {fullscreen ? t("exitFullscreen") : t("fullscreen")}
      </Button>
    </div>
  );
}

function filterLocations(
  locations: MonitoringLocation[],
  analysisData: AnalysisResponse | null,
  query: string,
  typeFilter: TypeFilter,
  statusFilter: StatusFilter,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return locations.filter((location) => {
    const sensor = getSensorData(analysisData, location.id);
    const status = getSensorStatus(sensor);
    const matchesQuery =
      normalizedQuery.length === 0 ||
      location.id.toLowerCase().includes(normalizedQuery) ||
      location.name.toLowerCase().includes(normalizedQuery) ||
      location.type.toLowerCase().includes(normalizedQuery);
    const matchesType = typeFilter === "Semua" || location.type === typeFilter;
    const matchesStatus =
      statusFilter === "Semua" || status === statusFilter;

    return matchesQuery && matchesType && matchesStatus;
  });
}

function getSensorData(analysisData: AnalysisResponse | null, sensorId: string) {
  if (!analysisData) return null;

  for (const sensors of Object.values(analysisData)) {
    const sensor = sensors?.find((item) => item.sensor_id === sensorId);
    if (sensor) return sensor;
  }

  return null;
}

function getSensorStatus(sensor: ReturnType<typeof getSensorData>) {
  if (!sensor) return "AMAN";
  if (sensor.status.includes("BAHAYA")) return "BAHAYA";
  if (sensor.status.includes("WASPADA")) return "WASPADA";
  return "AMAN";
}

function getMapStats(locations: MonitoringLocation[]) {
  return {
    Debu: locations.filter((location) => location.type === "Debu").length,
    Emisi: locations.filter((location) => location.type === "Emisi").length,
    Gas: locations.filter((location) => location.type === "Gas").length,
    total: locations.length,
  };
}

function MapCommandHeader({
  error,
  loading,
  onRefresh,
  stats,
}: {
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  stats: ReturnType<typeof getMapStats>;
}) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[0_22px_70px_-46px_rgba(15,23,42,0.9)]">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px]">
          <div className="p-7 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <MapPin className="text-sky-500" size={14} />
              {t("gisCommandCenter")}
            </div>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t("sensorDistributionMap")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              {t("mapDescription")}
            </p>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-950/60 xl:border-l xl:border-t-0">
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t("gisSync")}
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      error ? "bg-red-500" : "bg-emerald-500",
                    )}
                  />
                  {error ? t("connectionProblem") : t("engineActive")}
                </div>
              </div>
              <Button
                className="h-12 w-full rounded-xl"
                onClick={onRefresh}
                type="button"
                variant="outline"
              >
                <RefreshCcw className={loading ? "animate-spin" : ""} size={16} />
                {t("syncData")}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
          <HeaderFact icon={RadioTower} label={t("totalPoints")} value={`${stats.total}`} />
          <HeaderFact icon={Wind} label={t("mineDust")} value={`${stats.Debu}`} />
          <HeaderFact icon={Flame} label={t("mineGas")} value={`${stats.Gas}`} />
          <HeaderFact icon={Activity} label={t("heavyEquipmentEmission")} value={`${stats.Emisi}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-300">
          <Icon size={17} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {value} {t("points")}
          </p>
        </div>
      </div>
    </div>
  );
}

function MapLoading() {
  const { t } = useLanguage();

  return (
    <div className="flex h-[560px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900">
      <Loader2 className="mb-4 animate-spin text-sky-600" size={34} />
      <span className="text-sm font-bold uppercase tracking-widest">
        {t("preparingMap")}
      </span>
    </div>
  );
}

function MapFilterPanel({
  query,
  resultCount,
  setQuery,
  setStatusFilter,
  setTypeFilter,
  statusFilter,
  totalCount,
  typeFilter,
}: {
  query: string;
  resultCount: number;
  setQuery: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
  setTypeFilter: (value: TypeFilter) => void;
  statusFilter: StatusFilter;
  totalCount: number;
  typeFilter: TypeFilter;
}) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(240px,1fr)_auto_auto_auto] xl:items-center">
          <label className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-950/70">
          <Search size={17} className="text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            value={query}
          />
          </label>

          <FilterButtonGroup
            label={t("sensorType")}
            options={["Semua", "Debu", "Gas", "Emisi"]}
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as TypeFilter)}
          />

          <FilterButtonGroup
            label={t("status")}
            options={["Semua", "AMAN", "WASPADA", "BAHAYA"]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
          />

          <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
            <span className="font-bold text-slate-950 dark:text-white">
              {resultCount}
            </span>
            <span className="ml-1">/ {totalCount} {t("points")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterButtonGroup({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option === value;

          return (
            <button
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                active
                  ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
              key={option}
              onClick={() => onChange(option)}
              type="button"
            >
              {formatFilterOption(option, t)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatFilterOption(
  option: string,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (option === "Semua") return t("all");
  if (option === "Debu") return t("mineDust");
  if (option === "Gas") return t("mineGas");
  if (option === "Emisi") return t("heavyEquipmentEmission");
  if (option === "AMAN") return t("safe");
  if (option === "WASPADA") return t("alert");
  if (option === "BAHAYA") return t("danger");
  return option;
}

function GisFooter() {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl border-sky-200 bg-sky-50/70 dark:border-sky-900/70 dark:bg-sky-950/20">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
          <Info size={22} />
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-sky-900 dark:text-sky-100">
            {t("gisInfo")}
          </h4>
          <p className="mt-2 text-sm font-medium leading-6 text-sky-800/80 dark:text-sky-100/75">
            {t("gisInfoDescription")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle size={18} />
          <p className="text-sm font-semibold">{message}</p>
        </div>
        <Button onClick={onRetry} type="button" variant="secondary">
          <RefreshCcw size={14} />
          {t("tryAgain")}
        </Button>
      </CardContent>
    </Card>
  );
}
