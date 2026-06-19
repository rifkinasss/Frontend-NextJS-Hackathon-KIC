"use client";

import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  Flame,
  Gauge,
  Loader2,
  MapPin,
  MessageCircle,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wind,
} from "lucide-react";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardAnalysis } from "@/hooks/useDashboardAnalysis";
import {
  ANALYSIS_CATEGORIES,
  getAreaStatus,
  getCategoryStatus,
  getCriticalSensors,
  getSensors,
} from "@/lib/dashboard/analysis-summary";
import { cn } from "@/lib/utils";
import { formatParameterValue } from "@/lib/parameter-units";
import type {
  AnalysisCategoryName,
  AnalysisResponse,
  DashboardStatus,
  SensorAnalysis,
} from "@/types/analysis";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type TFunction = (key: TranslationKey) => string;

const CATEGORY_META = {
  debu: {
    icon: Wind,
    label: "Partikulat",
    panelClass: "from-sky-500 to-cyan-400",
    ringClass: "ring-sky-100 dark:ring-sky-950/70",
    softClass: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
  },
  gas: {
    icon: Flame,
    label: "Gas Area",
    panelClass: "from-amber-500 to-orange-400",
    ringClass: "ring-amber-100 dark:ring-amber-950/70",
    softClass:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  },
  emisi: {
    icon: Activity,
    label: "Emisi Mesin",
    panelClass: "from-emerald-500 to-teal-400",
    ringClass: "ring-emerald-100 dark:ring-emerald-950/70",
    softClass:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
};

type ActiveWarning = {
  category: string;
  categoryHref: string;
  cause: string;
  location: string;
  sensorId: string;
  status: DashboardStatus;
  whatsappStatus: string;
};

export function DashboardHome() {
  const { t } = useLanguage();
  const {
    data,
    error,
    loading,
    isRealtime,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    setHistoricalMode,
    setRealtimeMode,
    refresh,
  } = useDashboardAnalysis();

  if (loading && !data) {
    return <DashboardLoading />;
  }

  const areaStatus = getAreaStatus(data);
  const sensors = getSensors(data);
  const criticalSensors = getCriticalSensors(data);
  const activeWarnings = getActiveWarnings(data, t);

  return (
    <div
      className={cn(
        "space-y-6 animate-in fade-in duration-500",
        loading && "opacity-80 transition-opacity",
      )}
    >
      {loading && <LoadingBar />}

      <DashboardHeader
        areaStatus={areaStatus}
        endDate={endDate}
        isRealtime={isRealtime}
        loading={loading}
        onRefresh={refresh}
        onReset={setRealtimeMode}
        onSetHistorical={setHistoricalMode}
        sensorCount={sensors.length}
        setEndDate={setEndDate}
        setStartDate={setStartDate}
        startDate={startDate}
      />

      {error && <ErrorNotice message={error} onRetry={refresh} />}

      <MetricGrid
        areaStatus={areaStatus}
        dataAvailable={Boolean(data)}
        sensorCount={sensors.length}
      />

      <EarlyWarningCard warnings={activeWarnings} />

      <AiDecisionSupport areaStatus={areaStatus} warnings={activeWarnings} />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_380px]">
        <CategoryGrid data={data} />
        <OperationalPanel
          areaStatus={areaStatus}
          criticalCount={criticalSensors.length}
          data={data}
          sensorCount={sensors.length}
        />
      </div>

      {criticalSensors.length > 0 && (
        <CriticalAlert criticalCount={criticalSensors.length} />
      )}
    </div>
  );
}

function getActiveWarnings(
  data: AnalysisResponse | null,
  t: TFunction,
): ActiveWarning[] {
  if (!data) return [];

  return ANALYSIS_CATEGORIES.flatMap((category) => {
    const sensors = data[category.name] ?? [];

    return sensors
      .filter(
        (sensor) =>
          sensor.status.includes("BAHAYA") ||
          sensor.status.includes("WASPADA"),
      )
      .map((sensor) => ({
        category: formatCategoryId(category.id, t),
        categoryHref: `/kategori/${category.id}`,
        cause: getWarningCause(sensor),
        location: sensor.lokasi,
        sensorId: sensor.sensor_id,
        status: sensor.status.includes("BAHAYA") ? "BAHAYA" : "WASPADA",
        whatsappStatus: t("readyOpenClaw"),
      }));
  });
}

function formatStatus(status: DashboardStatus, t: TFunction) {
  if (status === "BAHAYA") return t("danger");
  if (status === "WASPADA") return t("alert");
  return t("safe");
}

function formatCategoryId(
  id: "debu" | "gas" | "emisi",
  t: TFunction,
) {
  if (id === "debu") return t("mineDust");
  if (id === "gas") return t("mineGas");
  return t("heavyEquipmentEmission");
}

function formatCategoryMetaLabel(
  id: "debu" | "gas" | "emisi",
  t: TFunction,
) {
  if (id === "debu") return t("particulate");
  if (id === "gas") return t("gasArea");
  return t("machineEmission");
}

function getWarningCause(sensor: SensorAnalysis) {
  const params = sensor.params ?? [];

  if (params.length === 0) return sensor.status;

  return params
    .slice(0, 2)
    .map((param) => `${param.param}: ${formatParameterValue(param.param, param.nilai)}`)
    .join(", ");
}

function DashboardLoading() {
  const { t } = useLanguage();

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="animate-spin text-sky-600" size={38} />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest">
        {t("loadingFuzzy")}
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

type DashboardHeaderProps = {
  areaStatus: DashboardStatus;
  endDate: string;
  isRealtime: boolean;
  loading: boolean;
  onRefresh: () => void;
  onReset: () => void;
  onSetHistorical: () => void;
  sensorCount: number;
  setEndDate: (value: string) => void;
  setStartDate: (value: string) => void;
  startDate: string;
};

function DashboardHeader({
  areaStatus,
  endDate,
  isRealtime,
  loading,
  onRefresh,
  onReset,
  onSetHistorical,
  sensorCount,
  setEndDate,
  setStartDate,
  startDate,
}: DashboardHeaderProps) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-[0_22px_70px_-46px_rgba(15,23,42,0.9)] dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="p-0">
        <div className="grid min-h-[220px] grid-cols-1 lg:grid-cols-[1fr_360px]">
          <div className="p-7 md:p-8">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <ShieldCheck size={14} className="text-emerald-500" />
                {t("operationalSummary")}
              </div>
              <StatusBadge status={areaStatus} />
            </div>

            <h2 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 dark:text-white md:text-5xl">
              {t("mainDashboard")}
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-500 dark:text-slate-400">
              {t("dashboardDescription")}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <HeroFact
                icon={RadioTower}
                label={t("mode")}
                value={isRealtime ? t("realtime") : t("historical")}
              />
              <HeroFact
                icon={Cpu}
                label={t("activeSensors")}
                value={`${sensorCount || 12}`}
              />
              <HeroFact
                icon={Clock3}
                label={t("window")}
                value={isRealtime ? t("thirtyMinutes") : t("filter")}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-950/60 lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t("dataControl")}
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      isRealtime ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  {isRealtime
                    ? t("realtimeAverage")
                    : t("historicalRangeActive")}
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
                        size={17}
                        className={loading ? "animate-spin" : ""}
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

function HeroFact({
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

type DateInputProps = {
  label: string;
  onChange: (value: string) => void;
  value: string;
};

function DateInput({ label, onChange, value }: DateInputProps) {
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

type MetricGridProps = {
  areaStatus: DashboardStatus;
  dataAvailable: boolean;
  sensorCount: number;
};

function MetricGrid({
  areaStatus,
  dataAvailable,
  sensorCount,
}: MetricGridProps) {
  const { t } = useLanguage();
  const metrics = [
    {
      title: t("monitoringPoints"),
      value: t("locations3"),
      subtitle: t("dustGasEmission"),
      icon: MapPin,
      iconClass: "text-sky-600 dark:text-sky-300",
      level: 74,
      progressClass: "from-sky-500 to-cyan-400",
      softClass: "bg-sky-50 dark:bg-sky-950/40",
    },
    {
      title: t("totalParameters"),
      value: `${sensorCount || 12} ${t("sensor")}`,
      subtitle: t("fuzzificationActive"),
      icon: Database,
      iconClass: "text-violet-600 dark:text-violet-300",
      level: 88,
      progressClass: "from-violet-500 to-fuchsia-400",
      softClass: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      title: t("areaStatus"),
      value: formatStatus(areaStatus, t),
      subtitle: dataAvailable ? t("apiDataActive") : t("waitingData"),
      icon: AlertCircle,
      iconClass:
        areaStatus === "BAHAYA"
          ? "text-red-600 dark:text-red-300"
          : "text-emerald-600 dark:text-emerald-300",
      level: areaStatus === "AMAN" ? 92 : areaStatus === "WASPADA" ? 62 : 24,
      progressClass:
        areaStatus === "BAHAYA"
          ? "from-red-500 to-rose-400"
          : areaStatus === "WASPADA"
            ? "from-amber-500 to-orange-400"
            : "from-emerald-500 to-teal-400",
      softClass:
        areaStatus === "BAHAYA"
          ? "bg-red-50 dark:bg-red-950/40"
          : "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: t("incomingData"),
      value: "+142",
      subtitle: t("last24Hours"),
      icon: TrendingUp,
      iconClass: "text-teal-600 dark:text-teal-300",
      level: 81,
      progressClass: "from-teal-500 to-emerald-400",
      softClass: "bg-teal-50 dark:bg-teal-950/40",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <Card
            className="group overflow-hidden rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)] hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_70px_-44px_rgba(15,23,42,0.95)] dark:hover:border-slate-700"
            key={metric.title}
          >
            <CardHeader className="pb-3">
              <div
                className={cn(
                  "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ring-8 transition-transform group-hover:scale-105",
                  metric.softClass,
                  "ring-slate-50 dark:ring-slate-950",
                )}
              >
                <Icon className={metric.iconClass} size={22} />
              </div>
              <CardDescription className="text-xs font-bold uppercase tracking-wide">
                {metric.title}
              </CardDescription>
              <CardTitle className="text-3xl text-slate-950 dark:text-white">
                {metric.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {metric.subtitle}
              </p>
              <MetricBar colorClass={metric.progressClass} value={metric.level} />
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function MetricBar({
  colorClass,
  value,
}: {
  colorClass: string;
  value: number;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>{t("readiness")}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r shadow-sm", colorClass)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function EarlyWarningCard({ warnings }: { warnings: ActiveWarning[] }) {
  const { t } = useLanguage();
  const highestStatus: DashboardStatus = warnings.some(
    (warning) => warning.status === "BAHAYA",
  )
    ? "BAHAYA"
    : warnings.length > 0
      ? "WASPADA"
      : "AMAN";
  const primaryWarning = warnings[0];

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]",
        warnings.length > 0
          ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20"
          : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20",
      )}
    >
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_auto]">
          <div
            className={cn(
              "p-6 text-white",
              warnings.length > 0
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gradient-to-br from-emerald-500 to-teal-600",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white ring-8 ring-white/10">
                <BellRing size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">
                  {t("activeEarlyWarning")}
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {warnings.length} {t("warning")}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <span className="text-sm font-semibold text-white/80">
                {t("highestLevel")}
              </span>
              <span className="text-sm font-bold">
                {formatStatus(highestStatus, t)}
              </span>
            </div>
          </div>

          <div className="p-6">
            {primaryWarning ? (
              <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={primaryWarning.status} />
                    <Badge variant="outline">{primaryWarning.category}</Badge>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {primaryWarning.sensorId} {t("needsAttention")}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                    {primaryWarning.location} {t("detectedCondition")}{" "}
                    <strong>{formatStatus(primaryWarning.status, t)}</strong>.{" "}
                    {t("initialCause")}:{" "}
                    {primaryWarning.cause}.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        OpenClaw WA
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {primaryWarning.whatsappStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-600" size={26} />
                  <h3 className="text-2xl font-bold text-slate-950 dark:text-white">
                    {t("noActiveWarning")}
                  </h3>
                </div>
                <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                  {t("noActiveWarningDescription")}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center border-t border-slate-200 p-6 dark:border-slate-800 lg:border-l lg:border-t-0">
            <Button asChild className="h-11 rounded-xl" variant="default">
              <Link href={primaryWarning ? primaryWarning.categoryHref : "/settings"}>
                {primaryWarning ? t("monitorDetail") : t("configureNotification")}
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AiDecisionSupport({
  areaStatus,
  warnings,
}: {
  areaStatus: DashboardStatus;
  warnings: ActiveWarning[];
}) {
  const { t } = useLanguage();
  const actions = getDashboardRecommendations(warnings, t);

  return (
    <Card className="overflow-hidden rounded-2xl border-violet-200 bg-gradient-to-br from-white via-white to-violet-50/80 shadow-[0_20px_65px_-42px_rgba(109,40,217,0.75)] dark:border-violet-900/70 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr]">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-8 ring-white/10">
                <BrainCircuit size={25} />
              </div>
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
                <Sparkles size={12} />
                Gemini 2.5 Flash
              </Badge>
            </div>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-100">
              {t("aiDecisionSupport")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              {t("operationalRecommendation")}
            </h2>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
              <span className="text-sm font-medium text-violet-100">
                {t("fuzzyStatus")}
              </span>
              <span className="text-sm font-bold">
                {formatStatus(areaStatus, t)}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                {t("summary")}
              </p>
              <p className="mt-3 text-base font-semibold leading-7 text-slate-700 dark:text-slate-200">
                {getDashboardSummary(warnings, t)}
              </p>
              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("openCategoryForDetails")}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-white/80 p-4 dark:border-violet-900/60 dark:bg-slate-950/60">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                {t("recommendedSteps")}
              </p>
              <ol className="mt-4 space-y-3">
                {actions.map((action, index) => (
                  <li className="flex gap-3" key={action}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                      {action}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDashboardSummary(warnings: ActiveWarning[], t: TFunction) {
  if (warnings.length === 0) return t("allMonitoringSafeSummary");

  const affectedAreas = warnings.slice(0, 3).map((warning) => {
    const parameters = warning.cause
      .split(",")
      .map((item) => item.split(":")[0].trim())
      .join("/");

    return `${warning.location} (${parameters})`;
  });

  return `${t("mostlySafeSummary")} ${t("attentionAtAreas")} ${affectedAreas.join(", ")}.`;
}

function getDashboardRecommendations(
  warnings: ActiveWarning[],
  t: TFunction,
) {
  if (warnings.length === 0) {
    return [t("keepMonitoring"), t("verifySensor"), t("documentCondition")];
  }

  const causes = warnings.map((warning) => warning.cause.toUpperCase()).join(" ");
  const categories = warnings.map((warning) => warning.category.toLowerCase()).join(" ");
  const recommendations: string[] = [];

  if (causes.includes("PM10") || causes.includes("PM25")) {
    recommendations.push(t("waterHaulingRoad"));
  }
  if (causes.includes("CO") || categories.includes("emisi")) {
    recommendations.push(t("inspectHeavyEquipmentEmission"));
  }
  if (causes.includes("H2S") || causes.includes("CH4") || categories.includes("gas")) {
    recommendations.push(t("inspectVentilationAndGas"));
  }

  recommendations.push(t("monitorRiskAreasAgain"));

  return [...new Set(recommendations)].slice(0, 3);
}

function CategoryGrid({ data }: { data: AnalysisResponse | null }) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
      <CardHeader className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60">
        <CardDescription className="text-xs font-bold uppercase tracking-widest">
          {t("categoryMatrix")}
        </CardDescription>
        <CardTitle className="mt-2 text-2xl text-slate-950 dark:text-white">
          {t("monitoringAnalysisSummary")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("category")}</TableHead>
              <TableHead className="text-center">{t("sensor")}</TableHead>
              <TableHead className="text-center">{t("safe")}</TableHead>
              <TableHead className="text-center">{t("alert")}</TableHead>
              <TableHead className="text-center">{t("danger")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-right">{t("action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ANALYSIS_CATEGORIES.map((category) => {
              const status = getCategoryStatus(data, category.name);
              const meta = CATEGORY_META[category.id];
              const Icon = meta.icon;
              const sensors = data?.[category.name] ?? [];
              const sensorTotal = sensors.length;
              const dangerCount = sensors.filter((sensor) =>
                sensor.status.includes("BAHAYA"),
              ).length;
              const warningCount = sensors.filter((sensor) =>
                sensor.status.includes("WASPADA"),
              ).length;
              const safeCount = getSafeCount(
                sensorTotal,
                dangerCount,
                warningCount,
              );

              return (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                  <div
                    className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl ring-4",
                      meta.softClass,
                      meta.ringClass,
                    )}
                  >
                          <Icon size={19} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {formatCategoryMetaLabel(category.id, t)}
                    </p>
                          <p className="mt-1 font-bold text-slate-950 dark:text-white">
                      {formatCategoryId(category.id, t)}
                          </p>
                  </div>
                </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-900 dark:text-white">
                    {sensorTotal || "-"}
                  </TableCell>
                  <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-300">
                    {safeCount}
                  </TableCell>
                  <TableCell className="text-center font-bold text-amber-600 dark:text-amber-300">
                    {warningCount}
                  </TableCell>
                  <TableCell className="text-center font-bold text-red-600 dark:text-red-300">
                    {dangerCount}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/kategori/${category.id}`}>
                        {t("detail")}
                        <ArrowUpRight size={14} />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getSafeCount(total: number, danger: number, warning: number) {
  return Math.max(total - danger - warning, 0);
}

function OperationalPanel({
  areaStatus,
  criticalCount,
  data,
  sensorCount,
}: {
  areaStatus: DashboardStatus;
  criticalCount: number;
  data: AnalysisResponse | null;
  sensorCount: number;
}) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardDescription className="text-xs font-bold uppercase tracking-widest">
              {t("operationalCondition")}
            </CardDescription>
            <CardTitle className="mt-2 text-2xl text-slate-950 dark:text-white">
              {t("healthOverview")}
            </CardTitle>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
            <Gauge size={22} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {t("areaStatus")}
            </span>
            <StatusBadge status={areaStatus} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {criticalCount > 0
              ? `${criticalCount} ${t("prioritySensors")}`
              : t("controlledCategories")}
          </p>
        </div>

        <Table>
          <TableBody>
            <OperationalRow
              icon={CheckCircle2}
              label={t("sensorActive")}
              value={`${sensorCount || 12} unit`}
            />
            <OperationalRow
              icon={BarChart3}
              label={t("analysisCategory")}
              value={t("module3")}
            />
            <OperationalRow
              icon={Clock3}
              label={t("dataRefresh")}
              value={t("onDemand")}
            />
          </TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-right">{t("score")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ANALYSIS_CATEGORIES.map((category) => (
              <CategoryStatusLine
                category={category.name}
                data={data}
                key={category.id}
                label={formatCategoryId(category.id, t)}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function OperationalRow({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent;
  label: string;
  value: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon size={17} />
        </div>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </span>
      </div>
      </TableCell>
      <TableCell className="text-right text-sm font-bold text-slate-950 dark:text-white">
        {value}
      </TableCell>
    </TableRow>
  );
}

function CategoryStatusLine({
  category,
  data,
  label,
}: {
  category: AnalysisCategoryName;
  data: AnalysisResponse | null;
  label: string;
}) {
  const status = getCategoryStatus(data, category);
  const score = status === "AMAN" ? 24 : status === "WASPADA" ? 58 : 92;

  return (
    <TableRow>
      <TableCell className="font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </TableCell>
      <TableCell>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="ml-auto w-24">
          <div className="mb-1 text-xs font-bold text-slate-950 dark:text-white">
            {score}%
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn(
                "h-full rounded-full",
                score <= 33 && "bg-emerald-500",
                score > 33 && score <= 66 && "bg-amber-500",
                score > 66 && "bg-red-500",
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }: { status: DashboardStatus }) {
  const { t } = useLanguage();
  const variant =
    status === "BAHAYA" ? "danger" : status === "WASPADA" ? "warning" : "success";

  return (
    <Badge
      className="px-3 py-1 text-[11px] uppercase tracking-widest"
      variant={variant}
    >
      {formatStatus(status, t)}
    </Badge>
  );
}

function CriticalAlert({ criticalCount }: { criticalCount: number }) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl border-red-200 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100">
      <CardContent className="flex items-start gap-4 p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="font-bold uppercase tracking-wide">
            {t("criticalWarning")}
          </h4>
          <p className="mt-2 text-sm font-medium leading-6 text-red-900/80 dark:text-red-100/80">
            {t("criticalWarningDescription").replace(
              "sensors",
              `${criticalCount} sensors`,
            )}
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
        <p className="text-sm font-semibold">{message}</p>
        <Button onClick={onRetry} type="button" variant="secondary">
          <RefreshCcw size={14} />
          {t("tryAgain")}
        </Button>
      </CardContent>
    </Card>
  );
}
