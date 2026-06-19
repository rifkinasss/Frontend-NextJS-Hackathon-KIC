"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Flame,
  Gauge,
  Info,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  SlidersHorizontal,
  Wind,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import FuzzyCurve from "@/components/fuzzy/FuzzyCurve";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchAnalysis } from "@/lib/api/analysis";
import { fetchFuzzyConfig } from "@/lib/api/config";
import { cn } from "@/lib/utils";
import type {
  AnalysisCategoryName,
  AnalysisHistoryPoint,
  AnalysisMode,
  DashboardStatus,
  SensorAnalysis,
} from "@/types/analysis";
import type { FuzzyConfigResponse } from "@/types/fuzzy-config";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type CategoryType = "debu" | "gas" | "emisi";

type CategoryMeta = {
  accent: string;
  categoryName: AnalysisCategoryName;
  descriptionKey: TranslationKey;
  icon: typeof Wind;
  keys: string[];
  labelKey: TranslationKey;
  shortLabelKey: TranslationKey;
  softClass: string;
};

const DEFAULT_START_DATE = "2026-06-05T08:00";
const DEFAULT_END_DATE = "2026-06-05T10:00";

const CATEGORY_META: Record<CategoryType, CategoryMeta> = {
  debu: {
    accent: "from-sky-500 to-cyan-400",
    categoryName: "DEBU TAMBANG",
    descriptionKey: "mineDustDescription",
    icon: Wind,
    keys: ["pm25", "pm10", "suhu", "kelembaban"],
    labelKey: "mineDust",
    shortLabelKey: "particulate",
    softClass: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
  },
  gas: {
    accent: "from-amber-500 to-orange-400",
    categoryName: "GAS TAMBANG",
    descriptionKey: "mineGasDescription",
    icon: Flame,
    keys: ["ch4", "h2s", "suhu", "kelembaban"],
    labelKey: "mineGas",
    shortLabelKey: "gasArea",
    softClass:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  },
  emisi: {
    accent: "from-emerald-500 to-teal-400",
    categoryName: "EMISI ALAT BERAT",
    descriptionKey: "heavyEquipmentEmissionDescription",
    icon: Activity,
    keys: ["co", "co2", "suhu", "kelembaban"],
    labelKey: "heavyEquipmentEmission",
    shortLabelKey: "machineEmission",
    softClass:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
};

export function CategoryDetailClient({ type }: { type: string }) {
  const categoryType = normalizeCategoryType(type);
  const meta = CATEGORY_META[categoryType];
  const [data, setData] = useState<SensorAnalysis[]>([]);
  const [config, setConfig] = useState<FuzzyConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AnalysisMode>("realtime");
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);

  const isRealtime = mode === "realtime";
  const Icon = meta.icon;
  const status = getWorstStatus(data);
  const trendData = data[0]?.history ?? [];

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const [configResult, analysisResult] = await Promise.all([
          fetchFuzzyConfig(signal),
          fetchAnalysis(
            {
              mode,
              startDate,
              endDate,
            },
            signal,
          ),
        ]);

        setConfig(configResult);
        setData(analysisResult[meta.categoryName] ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "API gagal terhubung");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [endDate, meta.categoryName, mode, startDate],
  );

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadData(controller.signal));

    return () => controller.abort();
  }, [loadData]);

  const visualizerItems = useMemo(() => {
    if (!config) return [];

    return meta.keys
      .map((key) => [key, config[key]] as const)
      .filter(([, item]) => Boolean(item));
  }, [config, meta.keys]);

  if (loading && data.length === 0) {
    return <CategoryLoading />;
  }

  return (
    <div
      className={cn(
        "space-y-6 animate-in fade-in duration-500",
        loading && "opacity-80 transition-opacity",
      )}
    >
      {loading && data.length > 0 && <LoadingBar />}

      <CategoryCommandHeader
        endDate={endDate}
        error={error}
        icon={Icon}
        isRealtime={isRealtime}
        loading={loading}
        meta={meta}
        onRefresh={() => void loadData()}
        onReset={() => setMode("realtime")}
        onSetHistorical={() => setMode("historical")}
        sensorCount={data.length}
        setEndDate={setEndDate}
        setStartDate={setStartDate}
        startDate={startDate}
        status={status}
      />

      {error && <ErrorNotice message={error} onRetry={() => void loadData()} />}

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <CategoryMetrics data={data} status={status} />
          <TrendPanel data={trendData} isRealtime={isRealtime} />
          <SensorAnalysisPanel data={data} isRealtime={isRealtime} />
        </div>

        <aside className="space-y-6">
          <OperationalSummary data={data} status={status} />
          <LogicVisualizer
            categoryName={meta.categoryName}
            items={visualizerItems}
          />
        </aside>
      </div>

      <SystemInfo isRealtime={isRealtime} />
    </div>
  );
}

function normalizeCategoryType(type: string): CategoryType {
  if (type === "gas" || type === "emisi" || type === "debu") return type;
  return "debu";
}

function getWorstStatus(data: SensorAnalysis[]): DashboardStatus {
  if (data.some((sensor) => sensor.status.includes("BAHAYA"))) return "BAHAYA";
  if (data.some((sensor) => sensor.status.includes("WASPADA"))) return "WASPADA";
  return "AMAN";
}

function getStatusVariant(status: DashboardStatus) {
  if (status === "BAHAYA") return "danger";
  if (status === "WASPADA") return "warning";
  return "success";
}

function formatStatus(
  status: DashboardStatus,
  t: (key: TranslationKey) => string,
) {
  if (status === "BAHAYA") return t("danger");
  if (status === "WASPADA") return t("alert");
  return t("safe");
}

function CategoryLoading() {
  const { t } = useLanguage();

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="animate-spin text-sky-600" size={38} />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest">
        {t("initializingFuzzy")}
      </p>
    </div>
  );
}

function LoadingBar() {
  return (
    <div className="fixed left-0 top-0 z-50 h-1 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
      <div className="h-full w-full animate-pulse bg-sky-600" />
    </div>
  );
}

function CategoryCommandHeader({
  endDate,
  error,
  icon: Icon,
  isRealtime,
  loading,
  meta,
  onRefresh,
  onReset,
  onSetHistorical,
  sensorCount,
  setEndDate,
  setStartDate,
  startDate,
  status,
}: {
  endDate: string;
  error: string | null;
  icon: typeof Wind;
  isRealtime: boolean;
  loading: boolean;
  meta: CategoryMeta;
  onRefresh: () => void;
  onReset: () => void;
  onSetHistorical: () => void;
  sensorCount: number;
  setEndDate: (value: string) => void;
  setStartDate: (value: string) => void;
  startDate: string;
  status: DashboardStatus;
}) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[0_22px_70px_-46px_rgba(15,23,42,0.9)]">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          <div className="p-7 md:p-8">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <SlidersHorizontal size={14} className="text-sky-500" />
                {t("commandCenter")}
              </div>
              <Badge
                className="px-3 py-1 text-[11px] uppercase tracking-widest"
                variant={getStatusVariant(status)}
              >
                {status}
              </Badge>
            </div>

            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div
                className={cn(
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-8 ring-slate-50 dark:ring-slate-950",
                  meta.softClass,
                )}
              >
                <Icon size={30} />
              </div>
              <div>
                <h2 className="text-4xl font-bold uppercase tracking-tight text-slate-950 dark:text-white">
                  {t(meta.labelKey)}
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                  {t(meta.descriptionKey)}
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <HeaderFact
                icon={Gauge}
                label={t("status")}
                value={formatStatus(status, t)}
              />
              <HeaderFact
                icon={Activity}
                label={t("sensor")}
                value={`${sensorCount || 0} unit`}
              />
              <HeaderFact
                icon={RefreshCcw}
                label={t("mode")}
                value={isRealtime ? t("realtime") : t("historical")}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-950/60 lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t("analysisControl")}
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      error
                        ? "bg-red-500"
                        : isRealtime
                          ? "bg-emerald-500"
                          : "bg-amber-500",
                    )}
                  />
                  {error
                    ? t("apiConnectionProblem")
                    : isRealtime
                      ? t("realtimeSnapshot")
                      : t("historicalFilterMode")}
                </div>
              </div>

              {isRealtime ? (
                <Button
                  className="h-12 w-full rounded-xl"
                  onClick={onSetHistorical}
                  type="button"
                  variant="outline"
                >
                  <Calendar size={17} />
                  {t("timeRangeFilter")}
                </Button>
              ) : (
                <div className="space-y-3">
                  <DateInput
                    label={t("start")}
                    onChange={setStartDate}
                    value={startDate}
                  />
                  <DateInput
                    label={t("end")}
                    onChange={setEndDate}
                    value={endDate}
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Button onClick={onRefresh} type="button">
                      <RefreshCcw
                        className={loading ? "animate-spin" : ""}
                        size={17}
                      />
                      {t("apply")}
                    </Button>
                    <Button onClick={onReset} type="button" variant="secondary">
                      {t("reset")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type IconComponent = React.ComponentType<{ className?: string; size?: number }>;

function HeaderFact({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-center gap-3">
        <Icon className="text-sky-600 dark:text-sky-300" size={18} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DateInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
      <span className="w-12 text-[10px] font-bold uppercase text-slate-400">
        {label}
      </span>
      <input
        className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none dark:text-slate-100"
        onChange={(event) => onChange(event.target.value)}
        type="datetime-local"
        value={value}
      />
    </label>
  );
}

function CategoryMetrics({
  data,
  status,
}: {
  data: SensorAnalysis[];
  status: DashboardStatus;
}) {
  const { t } = useLanguage();
  const warningCount = data.filter((sensor) =>
    sensor.status.includes("WASPADA"),
  ).length;
  const dangerCount = data.filter((sensor) =>
    sensor.status.includes("BAHAYA"),
  ).length;
  const safeCount = Math.max(data.length - warningCount - dangerCount, 0);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <MetricCard
        icon={CheckCircle2}
        label={t("safe")}
        tone="success"
        value={safeCount}
      />
      <MetricCard
        icon={ShieldAlert}
        label={t("alert")}
        tone="warning"
        value={warningCount}
      />
      <MetricCard
        icon={AlertTriangle}
        label={t("danger")}
        tone="danger"
        value={dangerCount}
      />
      <MetricCard
        icon={Gauge}
        label={t("finalStatus")}
        textValue={formatStatus(status, t)}
        tone={status === "AMAN" ? "success" : status === "WASPADA" ? "warning" : "danger"}
      />
    </section>
  );
}

type MetricTone = "success" | "warning" | "danger";

const metricToneClass: Record<
  MetricTone,
  {
    border: string;
    icon: string;
    ring: string;
    soft: string;
    text: string;
  }
> = {
  danger: {
    border: "border-red-200/80 hover:border-red-300 dark:border-red-900/50 dark:hover:border-red-800",
    icon: "text-red-600 dark:text-red-300",
    ring: "ring-red-50 dark:ring-red-950/40",
    soft: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
  },
  success: {
    border: "border-emerald-200/80 hover:border-emerald-300 dark:border-emerald-900/50 dark:hover:border-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-50 dark:ring-emerald-950/40",
    soft: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    border: "border-amber-200/80 hover:border-amber-300 dark:border-amber-900/50 dark:hover:border-amber-800",
    icon: "text-amber-600 dark:text-amber-300",
    ring: "ring-amber-50 dark:ring-amber-950/40",
    soft: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
  },
};

function MetricCard({
  icon: Icon,
  label,
  textValue,
  tone,
  value,
}: {
  icon: IconComponent;
  label: string;
  textValue?: string;
  tone: MetricTone;
  value?: number;
}) {
  const toneClass = metricToneClass[tone];

  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-2xl shadow-[0_14px_45px_-36px_rgba(15,23,42,0.9)] transition-colors",
        toneClass.border,
      )}
    >
      <CardHeader className="pb-4">
        <div
          className={cn(
            "mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ring-8 transition-transform group-hover:scale-105",
            toneClass.soft,
            toneClass.ring,
          )}
        >
          <Icon className={toneClass.icon} size={19} />
        </div>
        <CardDescription className="text-[11px] font-bold uppercase tracking-widest">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "text-2xl leading-none text-slate-950 dark:text-white",
            textValue && "text-xl",
            textValue && toneClass.text,
          )}
        >
          {textValue ?? value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function TrendPanel({
  data,
  isRealtime,
}: {
  data: AnalysisHistoryPoint[];
  isRealtime: boolean;
}) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardDescription className="text-xs font-bold uppercase tracking-widest">
            {t("defuzzificationTrend")}
          </CardDescription>
          <CardTitle className="mt-2 text-2xl text-slate-950 dark:text-white">
            {t("fuzzyInferenceResult")}
          </CardTitle>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("method")}: {isRealtime ? "30m rolling window" : t("filterRange")}.
          </p>
        </div>
        <Badge variant="outline">Tsukamoto</Badge>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          {data.length > 0 ? (
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="categoryTrend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  vertical={false}
                  className="text-slate-100 dark:text-slate-800"
                />
                <XAxis
                  axisLine={false}
                  dataKey="timestamp"
                  fontSize={10}
                  stroke="#94a3b8"
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  domain={[0, 100]}
                  fontSize={10}
                  stroke="#94a3b8"
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "1rem",
                    boxShadow: "0 18px 40px -24px rgb(15 23 42 / 0.55)",
                  }}
                />
                <Area
                  dataKey="crisp"
                  fill="url(#categoryTrend)"
                  fillOpacity={1}
                  name="Status Result"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Info className="mb-4 text-slate-300 dark:text-slate-700" size={42} />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {t("noTrendData")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SensorAnalysisPanel({
  data,
  isRealtime,
}: {
  data: SensorAnalysis[];
  isRealtime: boolean;
}) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
      <CardHeader className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardDescription className="text-xs font-bold uppercase tracking-widest">
              {t("sensorDecisionMatrix")}
            </CardDescription>
            <CardTitle className="mt-2 text-2xl text-slate-950 dark:text-white">
              {t("sensorAnalysisResults")}
            </CardTitle>
          </div>
          <Badge variant="outline">
            {isRealtime ? t("liveDataset") : t("filteredData")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-800">
                <th className="px-6 py-4">{t("sensor")}</th>
                <th className="px-6 py-4">{t("membershipDegree")}</th>
                <th className="px-6 py-4">{t("decision")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((sensor) => (
                <tr
                  className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                  key={sensor.sensor_id}
                >
                  <td className="px-6 py-6 align-top">
                    <div className="font-bold uppercase text-slate-950 dark:text-white">
                      {sensor.sensor_id}
                    </div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      {sensor.lokasi}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      <Activity size={12} />
                      Window: {sensor.latest_window ?? "-"}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {(sensor.params ?? []).map((param) => (
                        <ParameterCard
                          isRealtime={isRealtime}
                          key={param.param}
                          param={param}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-6 align-top">
                    <SensorStatus status={sensor.status} />
                    <p className="mt-3 max-w-[220px] text-[10px] font-bold uppercase leading-5 tracking-wide text-slate-400">
                      {t("fuzzySnapshotResult")} {sensor.latest_window ?? "-"}.
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ParameterCard({
  isRealtime,
  param,
}: {
  isRealtime: boolean;
  param: NonNullable<SensorAnalysis["params"]>[number];
}) {
  const { t } = useLanguage();
  const degrees = param.derajat ?? {};
  const degreeLabels = [
    { source: "Rendah", label: t("low") },
    { source: "Sedang", label: t("medium") },
    { source: "Tinggi", label: t("high") },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {param.param}
        </span>
        <span className="text-sm font-bold text-slate-950 dark:text-white">
          {param.nilai}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {degreeLabels.map((item) => (
          <DegreeBar
            key={item.source}
            label={item.label}
            sourceLabel={item.source}
            value={Number(degrees[item.source] ?? 0)}
          />
        ))}
      </div>
      <p className="mt-3 text-[9px] font-semibold uppercase text-slate-400">
        {param.info ||
          (isRealtime
            ? t("lastThirtyAverage")
            : t("matchingTimeFilter"))}
      </p>
    </div>
  );
}

function DegreeBar({
  label,
  sourceLabel,
  value,
}: {
  label: string;
  sourceLabel: string;
  value: number;
}) {
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn(
            "h-full rounded-full",
            sourceLabel === "Rendah" && "bg-sky-500",
            sourceLabel === "Sedang" && "bg-emerald-500",
            sourceLabel === "Tinggi" && "bg-red-500",
          )}
          style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
        />
      </div>
      <div className="mt-1 text-center text-[8px] font-bold uppercase text-slate-400">
        {label[0]}: {value}
      </div>
    </div>
  );
}

function SensorStatus({ status }: { status: string }) {
  const { t } = useLanguage();
  const normalized: DashboardStatus = status.includes("BAHAYA")
    ? "BAHAYA"
    : status.includes("WASPADA")
      ? "WASPADA"
      : "AMAN";

  return (
    <Badge
      className="gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest"
      variant={getStatusVariant(normalized)}
    >
      {normalized === "BAHAYA" && <AlertTriangle size={12} />}
      {formatStatus(normalized, t)}
    </Badge>
  );
}

function OperationalSummary({
  data,
  status,
}: {
  data: SensorAnalysis[];
  status: DashboardStatus;
}) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
      <CardHeader>
        <CardDescription className="text-xs font-bold uppercase tracking-widest">
          {t("operationalSnapshot")}
        </CardDescription>
        <CardTitle className="mt-2 text-2xl text-slate-950 dark:text-white">
          {t("healthCommand")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {t("categoryStatus")}
            </span>
            <Badge variant={getStatusVariant(status)}>
              {formatStatus(status, t)}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {status === "AMAN"
              ? t("categorySafeDescription")
              : t("categoryPriorityDescription")}
          </p>
        </div>

        <SummaryRow
          icon={Gauge}
          label={t("sensorsRead")}
          value={`${data.length} unit`}
        />
        <SummaryRow
          icon={BarChart3}
          label={t("inferenceMethod")}
          value="Tsukamoto"
        />
        <SummaryRow
          icon={RefreshCcw}
          label={t("refreshMode")}
          value={t("onDemand")}
        />
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon size={17} />
        </div>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </span>
      </div>
      <span className="text-sm font-bold text-slate-950 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function LogicVisualizer({
  categoryName,
  items,
}: {
  categoryName: AnalysisCategoryName;
  items: Array<readonly [string, NonNullable<FuzzyConfigResponse[string]>]>;
}) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)] dark:border-slate-800 dark:bg-slate-950 dark:text-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
            <Activity size={18} />
          </div>
          <div>
            <CardDescription className="text-xs font-bold uppercase tracking-widest">
              {t("logicVisualizer")}
            </CardDescription>
            <CardTitle className="mt-1 text-lg text-slate-950 dark:text-white">
              {t("membershipFunctions")}
            </CardTitle>
          </div>
        </div>
        <p className="pt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          {t("fuzzyMapping")} {categoryName}.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(([key, item]) => (
          <FuzzyCurve data={item.mf} key={key} title={item.nama} />
        ))}
      </CardContent>
    </Card>
  );
}

function SystemInfo({ isRealtime }: { isRealtime: boolean }) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-[0_14px_45px_-36px_rgba(15,23,42,0.9)] dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
              <Info size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                {t("systemInfo")}
              </p>
              <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                {t("systemInfoDescription")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:min-w-[560px]">
            <FooterFact label={t("engine")} value={t("active")} />
            <FooterFact label={t("method")} value="Tsukamoto" />
            <FooterFact
              label={t("mode")}
              value={isRealtime ? t("realtime") : t("historical")}
            />
            <FooterFact label={t("source")} value="PostgreSQL" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FooterFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
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
        <p className="text-sm font-semibold">{message}</p>
        <Button onClick={onRetry} type="button" variant="secondary">
          <RefreshCcw size={14} />
          {t("tryAgain")}
        </Button>
      </CardContent>
    </Card>
  );
}
