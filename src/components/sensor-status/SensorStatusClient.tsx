"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Power,
  RadioTower,
  RefreshCcw,
  Search,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAnalysis } from "@/lib/api/analysis";
import { fetchDeviceStates, sendDeviceCommand } from "@/lib/api/devices";
import { fetchLocations } from "@/lib/api/locations";
import { cn } from "@/lib/utils";
import type { AnalysisResponse, SensorAnalysis } from "@/types/analysis";
import type { DeviceCommandName, DeviceState } from "@/types/device";
import type { MonitoringLocation, MonitoringLocationType } from "@/types/location";

type SensorConnection = "online" | "offline";
type ConnectionFilter = "all" | SensorConnection;
type PowerFilter = "all" | "on" | "off";
type TypeFilter = "all" | MonitoringLocationType;

type SensorStatusRow = {
  connection: SensorConnection;
  latestWindow: string;
  location: MonitoringLocation;
  sensor: SensorAnalysis | null;
  state: DeviceState | null;
};

export function SensorStatusClient() {
  const { t } = useLanguage();
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [commandLoadingId, setCommandLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<MonitoringLocation[]>([]);
  const [powerFilter, setPowerFilter] = useState<PowerFilter>("all");
  const [query, setQuery] = useState("");
  const [states, setStates] = useState<DeviceState[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const [locationResult, analysisResult, stateResult] = await Promise.all([
        fetchLocations(signal),
        fetchAnalysis({ mode: "realtime" }, signal),
        fetchDeviceStates(signal),
      ]);

      setLocations(locationResult);
      setAnalysisData(analysisResult);
      setStates(stateResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Gagal memuat status sensor");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const handleCommand = useCallback(
    async (deviceId: string, command: DeviceCommandName) => {
      setCommandLoadingId(deviceId);
      setError(null);
      setFeedback(null);

      try {
        await sendDeviceCommand(deviceId, command);
        setFeedback(`${t("commandSent")}: ${deviceId}`);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengirim command");
      } finally {
        setCommandLoadingId(null);
      }
    },
    [loadData, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadData(controller.signal));

    return () => controller.abort();
  }, [loadData]);

  const rows = useMemo(
    () => buildSensorRows(locations, analysisData, states),
    [analysisData, locations, states],
  );
  const filteredRows = useMemo(
    () => filterRows(rows, query, typeFilter, connectionFilter, powerFilter),
    [connectionFilter, powerFilter, query, rows, typeFilter],
  );
  const onlineCount = rows.filter((row) => row.connection === "online").length;
  const offlineCount = rows.length - onlineCount;

  if (loading && rows.length === 0) {
    return <SensorStatusLoading />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="overflow-hidden rounded-2xl shadow-[0_22px_70px_-46px_rgba(15,23,42,0.9)]">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px]">
            <div className="p-7 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <RadioTower className="text-sky-500" size={14} />
                {t("sensorConnectivity")}
              </div>
              <h2 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("sensorStatusOverview")}
              </h2>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {t("sensorStatusDescription")}
              </p>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-950/60 xl:border-l xl:border-t-0">
              <div className="flex h-full flex-col justify-between gap-5">
                <p className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                  {t("sensorConnectivityDescription")}
                </p>
                <Button
                  className="h-12 w-full rounded-xl"
                  onClick={() => void loadData()}
                  type="button"
                  variant="outline"
                >
                  <RefreshCcw
                    className={loading ? "animate-spin" : ""}
                    size={16}
                  />
                  {t("refreshStatus")}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
            <StatusFact
              icon={RadioTower}
              label={t("totalSensors")}
              value={`${rows.length}`}
            />
            <StatusFact
              icon={CheckCircle2}
              label={t("online")}
              tone="success"
              value={`${onlineCount}`}
            />
            <StatusFact
              icon={AlertCircle}
              label={t("offline")}
              tone="danger"
              value={`${offlineCount}`}
            />
          </div>
        </CardContent>
      </Card>

      {error && <ErrorNotice message={error} onRetry={() => void loadData()} />}
      {feedback && (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 size={18} />
            <p className="text-sm font-semibold">{feedback}</p>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
        <CardHeader className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60">
          <CardDescription className="text-xs font-bold uppercase tracking-widest">
            {t("sensorConnectivity")}
          </CardDescription>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <CardTitle className="mt-2 text-2xl text-slate-950 dark:text-white">
              {t("sensorStatus")}
            </CardTitle>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("showingRows")} {filteredRows.length} / {rows.length}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DeviceTableFilters
            connectionFilter={connectionFilter}
            powerFilter={powerFilter}
            query={query}
            setConnectionFilter={setConnectionFilter}
            setPowerFilter={setPowerFilter}
            setQuery={setQuery}
            setTypeFilter={setTypeFilter}
            typeFilter={typeFilter}
          />
          <Table>
            <TableHeader className="text-xs">
              <TableRow>
                <TableHead>{t("device")}</TableHead>
                <TableHead>{t("location")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("connection")}</TableHead>
                <TableHead>{t("powerState")}</TableHead>
                <TableHead>{t("latestCondition")}</TableHead>
                <TableHead className="text-right">{t("lastReading")}</TableHead>
                <TableHead className="text-right">{t("commandAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.location.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Power size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-950 dark:text-white">
                          {row.location.id}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {row.location.name}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={14} />
                      {row.location.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatType(row.location.type, t)}
                  </TableCell>
                  <TableCell>
                    <ConnectionBadge connection={row.connection} />
                  </TableCell>
                  <TableCell>
                    <PowerBadge powerState={row.state?.power_state ?? "on"} />
                  </TableCell>
                  <TableCell>
                    {row.sensor ? (
                      <Badge variant={getStatusVariant(row.sensor.status)}>
                        {formatAnalysisStatus(row.sensor.status, t)}
                      </Badge>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">
                        {t("noRealtimeData")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {formatLastReading(row)}
                  </TableCell>
                  <TableCell className="text-right">
                    <CommandButtons
                      disabled={commandLoadingId === row.location.id}
                      onCommand={(command) =>
                        void handleCommand(row.location.id, command)
                      }
                      powerState={row.state?.power_state ?? "on"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function buildSensorRows(
  locations: MonitoringLocation[],
  analysisData: AnalysisResponse | null,
  states: DeviceState[],
): SensorStatusRow[] {
  const stateByDeviceId = new Map(states.map((state) => [state.device_id, state]));

  return locations.map((location) => {
    const sensor = getSensorData(analysisData, location.id);
    const state = stateByDeviceId.get(location.id) ?? null;

    return {
      connection: state ? (state.is_online ? "online" : "offline") : sensor ? "online" : "offline",
      latestWindow: sensor?.latest_window ?? "-",
      location,
      sensor,
      state,
    };
  });
}

function filterRows(
  rows: SensorStatusRow[],
  query: string,
  typeFilter: TypeFilter,
  connectionFilter: ConnectionFilter,
  powerFilter: PowerFilter,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return rows.filter((row) => {
    const powerState = row.state?.power_state ?? "on";
    const matchesQuery =
      normalizedQuery.length === 0 ||
      row.location.id.toLowerCase().includes(normalizedQuery) ||
      row.location.name.toLowerCase().includes(normalizedQuery) ||
      row.location.type.toLowerCase().includes(normalizedQuery);
    const matchesType =
      typeFilter === "all" || row.location.type === typeFilter;
    const matchesConnection =
      connectionFilter === "all" || row.connection === connectionFilter;
    const matchesPower = powerFilter === "all" || powerState === powerFilter;

    return matchesQuery && matchesType && matchesConnection && matchesPower;
  });
}

function getSensorData(
  analysisData: AnalysisResponse | null,
  sensorId: string,
): SensorAnalysis | null {
  if (!analysisData) return null;

  for (const sensors of Object.values(analysisData)) {
    const sensor = sensors?.find((item) => item.sensor_id === sensorId);
    if (sensor) return sensor;
  }

  return null;
}

function SensorStatusLoading() {
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

function StatusFact({
  icon: Icon,
  label,
  tone = "default",
  value,
}: {
  icon: typeof RadioTower;
  label: string;
  tone?: "default" | "danger" | "success";
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900",
            tone === "success" && "text-emerald-600 dark:text-emerald-300",
            tone === "danger" && "text-red-600 dark:text-red-300",
            tone === "default" && "text-sky-600 dark:text-sky-300",
          )}
        >
          <Icon size={17} />
        </div>
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

function DeviceTableFilters({
  connectionFilter,
  powerFilter,
  query,
  setConnectionFilter,
  setPowerFilter,
  setQuery,
  setTypeFilter,
  typeFilter,
}: {
  connectionFilter: ConnectionFilter;
  powerFilter: PowerFilter;
  query: string;
  setConnectionFilter: (value: ConnectionFilter) => void;
  setPowerFilter: (value: PowerFilter) => void;
  setQuery: (value: string) => void;
  setTypeFilter: (value: TypeFilter) => void;
  typeFilter: TypeFilter;
}) {
  const { t } = useLanguage();

  return (
    <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(320px,1fr)_160px_160px_160px] xl:items-end">
        <label className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-950/70 xl:mb-0">
          <Search size={17} className="text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchDevicePlaceholder")}
            value={query}
          />
        </label>

        <SelectFilter
          label={t("type")}
          onChange={(value) => setTypeFilter(value as TypeFilter)}
          options={["all", "Debu", "Gas", "Emisi"]}
          value={typeFilter}
        />

        <SelectFilter
          label={t("connection")}
          onChange={(value) => setConnectionFilter(value as ConnectionFilter)}
          options={["all", "online", "offline"]}
          value={connectionFilter}
        />

        <SelectFilter
          label={t("powerState")}
          onChange={(value) => setPowerFilter(value as PowerFilter)}
          options={["all", "on", "off"]}
          value={powerFilter}
        />
      </div>
    </div>
  );
}

function SelectFilter({
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
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <select
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition-colors hover:bg-white focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-900 dark:focus:border-slate-600 dark:focus:bg-slate-900 dark:focus:ring-slate-800"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => {
          return (
            <option key={option} value={option}>
              {formatFilterOption(option, t)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function ConnectionBadge({ connection }: { connection: SensorConnection }) {
  const { t } = useLanguage();

  return (
    <Badge variant={connection === "online" ? "success" : "danger"}>
      {connection === "online" ? t("online") : t("offline")}
    </Badge>
  );
}

function PowerBadge({ powerState }: { powerState: "on" | "off" }) {
  return (
    <Badge variant={powerState === "on" ? "success" : "danger"}>
      {powerState.toUpperCase()}
    </Badge>
  );
}

function CommandButtons({
  disabled,
  onCommand,
  powerState,
}: {
  disabled: boolean;
  onCommand: (command: DeviceCommandName) => void;
  powerState: "on" | "off";
}) {
  const { t } = useLanguage();
  const isOn = powerState === "on";

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="flex min-w-16 items-center justify-end gap-2">
        {disabled ? <Loader2 className="animate-spin text-slate-400" size={14} /> : null}
        <Switch
        aria-label={isOn ? t("turnOff") : t("turnOn")}
          checked={isOn}
        disabled={disabled}
          onCheckedChange={() => onCommand(isOn ? "turn_off" : "turn_on")}
        />
      </div>
      <Button
        aria-label={t("restart")}
        className="h-8 w-8 rounded-full p-0"
        disabled={disabled}
        onClick={() => onCommand("restart")}
        size="icon"
        title={t("restart")}
        type="button"
        variant="secondary"
      >
        {disabled ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <RefreshCcw size={14} />
        )}
      </Button>
    </div>
  );
}

function formatLastReading(row: SensorStatusRow) {
  const value = row.state?.last_seen_at ?? row.latestWindow;
  if (!value || value === "-") return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Asia/Makassar",
    year: "numeric",
  }).format(date) + " WITA";
}

function getStatusVariant(status: string) {
  if (status.includes("BAHAYA")) return "danger";
  if (status.includes("WASPADA")) return "warning";
  return "success";
}

function formatAnalysisStatus(
  status: string,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (status.includes("BAHAYA")) return t("danger");
  if (status.includes("WASPADA")) return t("alert");
  return t("safe");
}

function formatType(
  type: MonitoringLocationType,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (type === "Debu") return t("mineDust");
  if (type === "Gas") return t("mineGas");
  return t("heavyEquipmentEmission");
}

function formatFilterOption(
  option: string,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (option === "all") return t("all");
  if (option === "Debu") return t("mineDust");
  if (option === "Gas") return t("mineGas");
  if (option === "Emisi") return t("heavyEquipmentEmission");
  if (option === "online") return t("online");
  if (option === "offline") return t("offline");
  if (option === "on") return "ON";
  if (option === "off") return "OFF";
  return option;
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
