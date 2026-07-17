"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  Eye,
  Loader2,
  MapPin,
  Plus,
  Power,
  RadioTower,
  RefreshCcw,
  Search,
  Trash2,
  Cpu,
  BookOpen,
  Info,
  Calendar,
  Hash,
  Network,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useTimezone } from "@/components/timezone/TimezoneProvider";
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
import { fetchDeviceStates, sendDeviceCommand, createDevice, updateDevice, deleteDevice } from "@/lib/api/devices";
import { fetchLocations } from "@/lib/api/locations";
import {
  fetchSensorDefinitions,
  createSensorDefinition,
  deleteSensorDefinition,
  fetchDeviceSensors,
  mapSensorToDevice,
  unmapSensorFromDevice,
} from "@/lib/api/sensors";
import { cn } from "@/lib/utils";
import type { AnalysisResponse, SensorAnalysis } from "@/types/analysis";
import type { DeviceCommandName, DeviceState } from "@/types/device";
import type { MonitoringLocation, MonitoringLocationType } from "@/types/location";
import type { SensorDefinition, DeviceSensorMapping } from "@/types/sensor";

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
  const { timeZone } = useTimezone();
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

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [deviceType, setDeviceType] = useState<MonitoringLocationType>("Debu");

  // Sensor Management States
  const [detailTab, setDetailTab] = useState<"info" | "sensors">("info");
  const [mappedSensors, setMappedSensors] = useState<DeviceSensorMapping[]>([]);
  const [loadingMapped, setLoadingMapped] = useState(false);
  const [sensorCatalog, setSensorCatalog] = useState<SensorDefinition[]>([]);
  
  // Catalog Modal States
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isCatalogSubmitting, setIsCatalogSubmitting] = useState(false);
  
  // New Sensor Definition Form States
  const [catalogCode, setCatalogCode] = useState("");
  const [catalogName, setCatalogName] = useState("");
  const [catalogMfg, setCatalogMfg] = useState("");
  const [catalogInterface, setCatalogInterface] = useState("analog");
  const [catalogDesc, setCatalogDesc] = useState("");
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Map Sensor to Device Form States
  const [mapSensorDefId, setMapSensorDefId] = useState<string>("");
  const [mapGpio, setMapGpio] = useState("");
  const [mapI2c, setMapI2c] = useState("");
  const [mapNotes, setMapNotes] = useState("");
  const [isMappingSubmitting, setIsMappingSubmitting] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const loadSensorCatalog = useCallback(async () => {
    try {
      const data = await fetchSensorDefinitions();
      setSensorCatalog(data);
    } catch (err) {
      console.error("Gagal memuat katalog sensor:", err);
    }
  }, []);

  const handleCreateSensorDefinition = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!catalogCode.trim() || !catalogName.trim()) {
        setCatalogError("Kode Sensor dan Nama Sensor wajib diisi");
        return;
      }

      setIsCatalogSubmitting(true);
      setCatalogError(null);

      try {
        await createSensorDefinition({
          sensor_code: catalogCode.trim(),
          sensor_name: catalogName.trim(),
          manufacturer: catalogMfg.trim() || undefined,
          interface_type: catalogInterface,
          description: catalogDesc.trim() || undefined,
        });

        // Reset catalog form
        setCatalogCode("");
        setCatalogName("");
        setCatalogMfg("");
        setCatalogInterface("analog");
        setCatalogDesc("");
        
        await loadSensorCatalog();
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : "Gagal membuat tipe sensor");
      } finally {
        setIsCatalogSubmitting(false);
      }
    },
    [catalogCode, catalogName, catalogMfg, catalogInterface, catalogDesc, loadSensorCatalog]
  );

  const handleDeleteSensorDefinition = useCallback(
    async (id: number) => {
      if (!confirm("Apakah Anda yakin ingin menghapus tipe sensor ini dari katalog?")) return;
      try {
        await deleteSensorDefinition(id);
        await loadSensorCatalog();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Gagal menghapus sensor dari katalog");
      }
    },
    [loadSensorCatalog]
  );

  const handleMapSensor = useCallback(
    async (e: React.FormEvent, deviceId: string) => {
      e.preventDefault();
      if (!mapSensorDefId) {
        setMappingError("Silakan pilih sensor dari katalog");
        return;
      }

      setIsMappingSubmitting(true);
      setMappingError(null);

      try {
        await mapSensorToDevice(deviceId, {
          sensor_def_id: parseInt(mapSensorDefId),
          gpio_pin: mapGpio.trim() || undefined,
          i2c_address: mapI2c.trim() || undefined,
          notes: mapNotes.trim() || undefined,
        });

        // Reset form
        setMapSensorDefId("");
        setMapGpio("");
        setMapI2c("");
        setMapNotes("");

        // Refresh device sensors
        const updated = await fetchDeviceSensors(deviceId);
        setMappedSensors(updated);
      } catch (err) {
        setMappingError(err instanceof Error ? err.message : "Gagal memasang sensor");
      } finally {
        setIsMappingSubmitting(false);
      }
    },
    [mapSensorDefId, mapGpio, mapI2c, mapNotes]
  );

  const handleUnmapSensor = useCallback(
    async (mappingId: number, deviceId: string) => {
      if (!confirm("Apakah Anda yakin ingin mencopot sensor ini dari device?")) return;
      try {
        await unmapSensorFromDevice(mappingId);
        // Refresh device sensors
        const updated = await fetchDeviceSensors(deviceId);
        setMappedSensors(updated);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Gagal mencopot sensor");
      }
    },
    []
  );

  const generateDeviceCode = useCallback((type: MonitoringLocationType) => {
    const prefixes = { Debu: "DB", Gas: "GS", Emisi: "EM", Campuran: "CP" };
    const prefix = prefixes[type];
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setFormCode(`${prefix}-${randomSuffix}`);
  }, []);

  const openAddModal = useCallback(() => {
    setDeviceType("Debu");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setFormCode(`DB-${randomSuffix}`);
    setIsAddModalOpen(true);
  }, []);

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

  const handleAddDevice = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formCode.trim() || !formName.trim()) {
        setSubmitError("Kode Alat dan Nama Alat wajib diisi");
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        await createDevice({
          device_code: formCode.trim(),
          device_name: formName.trim(),
          location: formLocation.trim() || undefined,
          latitude: formLat ? parseFloat(formLat) : undefined,
          longitude: formLng ? parseFloat(formLng) : undefined,
          description: formDesc.trim() || undefined,
        });

        setFeedback(`Alat ${formCode.trim()} berhasil ditambahkan!`);
        setIsAddModalOpen(false);

        // Reset form
        setFormCode("");
        setFormName("");
        setFormLocation("");
        setFormLat("");
        setFormLng("");
        setFormDesc("");

        // Reload data
        await loadData();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Gagal menambahkan alat");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formCode, formName, formLocation, formLat, formLng, formDesc, loadData]
  );

  const handleGetCurrentLocation = useCallback((target: "add" | "edit") => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung layanan geolokasi.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);

        if (target === "add") {
          setFormLat(lat);
          setFormLng(lng);
        } else {
          setEditLat(lat);
          setEditLng(lng);
        }
        setIsLocating(false);
      },
      (error) => {
        let errMsg = "Gagal mengambil lokasi Anda.";
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = "Izin geolokasi ditolak oleh browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errMsg = "Informasi lokasi tidak tersedia.";
        } else if (error.code === error.TIMEOUT) {
          errMsg = "Waktu pengambilan lokasi habis.";
        }
        alert(errMsg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const [selectedRow, setSelectedRow] = useState<SensorStatusRow | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // States for Edit Form
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const openDetailModal = useCallback((row: SensorStatusRow) => {
    setSelectedRow(row);
    setDetailTab("info");
    setIsDetailModalOpen(true);
    setLoadingMapped(true);
    fetchDeviceSensors(row.location.id)
      .then((data) => setMappedSensors(data))
      .catch((err) => console.error("Gagal memuat sensor terpasang:", err))
      .finally(() => setLoadingMapped(false));
    loadSensorCatalog();
  }, [loadSensorCatalog]);

  const openEditModal = useCallback((row: SensorStatusRow) => {
    setSelectedRow(row);
    setEditName(row.location.name || "");
    setEditLocation(row.location.location || row.location.name || "");
    setEditLat(row.location.lat ? String(row.location.lat) : "");
    setEditLng(row.location.lng ? String(row.location.lng) : "");
    setEditDesc(row.location.description || "");
    setIsEditModalOpen(true);
  }, []);

  const openDeleteConfirm = useCallback((row: SensorStatusRow) => {
    setSelectedRow(row);
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleEditDeviceSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRow) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        await updateDevice(selectedRow.location.id, {
          device_name: editName.trim(),
          location: editLocation.trim() || undefined,
          latitude: editLat ? parseFloat(editLat) : undefined,
          longitude: editLng ? parseFloat(editLng) : undefined,
        });

        setFeedback(`Alat ${selectedRow.location.id} berhasil diperbarui!`);
        setIsEditModalOpen(false);
        setSelectedRow(null);
        await loadData();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Gagal memperbarui alat");
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedRow, editName, editLocation, editLat, editLng, loadData]
  );

  const handleDeleteDeviceSubmit = useCallback(async () => {
    if (!selectedRow) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteDevice(selectedRow.location.id, true); // hard delete
      setFeedback(`Alat ${selectedRow.location.id} berhasil dihapus!`);
      setIsDeleteConfirmOpen(false);
      setSelectedRow(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus alat");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRow, loadData]);


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

    const refreshInterval = window.setInterval(() => {
      void loadData();
    }, 30_000);

    return () => {
      controller.abort();
      window.clearInterval(refreshInterval);
    };
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
                <div className="flex flex-col gap-2">
                  <Button
                    className="h-12 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-500 border-none"
                    onClick={openAddModal}
                    type="button"
                  >
                    <Plus size={16} />
                    {t("addDevice") || "Tambah Alat"}
                  </Button>
                  <Button
                    className="h-12 w-full rounded-xl border border-slate-200 hover:bg-slate-100 bg-white text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 gap-2 flex items-center justify-center font-bold"
                    onClick={() => {
                      loadSensorCatalog();
                      setIsCatalogModalOpen(true);
                    }}
                    type="button"
                  >
                    <BookOpen size={16} />
                    Katalog Sensor
                  </Button>
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
                <TableHead className="text-right">{t("action") || "Aksi"}</TableHead>
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
                    {formatLastReading(row, timeZone)}
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full"
                        onClick={() => openDetailModal(row)}
                        title="Detail"
                        type="button"
                      >
                        <Eye size={13} />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full"
                        onClick={() => openEditModal(row)}
                        title="Edit"
                        type="button"
                      >
                        <Edit size={13} />
                      </Button>
                      <Button
                        size="icon"
                        className="h-8 w-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none"
                        onClick={() => openDeleteConfirm(row)}
                        title="Hapus"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-slate-200 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <CardTitle className="text-xl font-bold text-slate-950 dark:text-white">
                Tambah Alat Baru
              </CardTitle>
              <CardDescription>
                Daftarkan perangkat ESP32 baru ke dalam sistem monitoring.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAddDevice}>
              <CardContent className="p-6 space-y-4">
                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {submitError}
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Tipe Alat *
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                      value={deviceType}
                      onChange={(e) => {
                        const type = e.target.value as MonitoringLocationType;
                        setDeviceType(type);
                        generateDeviceCode(type);
                      }}
                    >
                      <option value="Debu">Debu (DB)</option>
                      <option value="Gas">Gas (GS)</option>
                      <option value="Emisi">Emisi (EM)</option>
                      <option value="Campuran">Campuran (CP)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="flex text-[10px] font-bold uppercase tracking-widest text-slate-400 items-center justify-between">
                      <span>Kode Alat *</span>
                      <button
                        type="button"
                        onClick={() => generateDeviceCode(deviceType)}
                        className="text-[9px] text-sky-500 hover:text-sky-600 font-bold lowercase tracking-normal"
                      >
                        (Auto)
                      </button>
                    </label>
                    <input
                      required
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="Contoh: DB-7A2B"
                      value={formCode}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Nama Alat *
                    </label>
                    <input
                      required
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Contoh: Sensor Debu Pit 2"
                      value={formName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Lokasi Penempatan
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Contoh: Area Tambang Utama - Pit 2"
                    value={formLocation}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Latitude (Garis Lintang)
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                      onChange={(e) => setFormLat(e.target.value)}
                      placeholder="Contoh: -1.8542"
                      value={formLat}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Longitude (Garis Bujur)
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                      onChange={(e) => setFormLng(e.target.value)}
                      placeholder="Contoh: 116.2156"
                      value={formLng}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 text-xs rounded-xl flex items-center justify-center gap-1.5 border-dashed"
                  onClick={() => handleGetCurrentLocation("add")}
                  disabled={isLocating}
                >
                  <MapPin size={14} className={isLocating ? "animate-bounce" : ""} />
                  {isLocating ? "Mendapatkan Lokasi..." : "Gunakan Lokasi Saya"}
                </Button>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Deskripsi Perangkat
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700 resize-none"
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Tulis penjelasan singkat mengenai peran atau penempatan alat..."
                    value={formDesc}
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-white border-none"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Daftarkan Alat"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-slate-200 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Eye size={20} className="text-sky-500" />
                  Detail Perangkat
                </CardTitle>
                <div className="flex bg-slate-200/60 dark:bg-slate-800 rounded-xl p-1 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDetailTab("info")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
                      detailTab === "info"
                        ? "bg-white dark:bg-slate-950 shadow-sm text-slate-950 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    <Info size={12} />
                    Informasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab("sensors")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
                      detailTab === "sensors"
                        ? "bg-white dark:bg-slate-950 shadow-sm text-slate-950 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    <Cpu size={12} />
                    Sensor ({mappedSensors.length})
                  </button>
                </div>
              </div>
              <CardDescription>
                Kelola informasi dan sensor terpasang pada perangkat: <span className="font-bold">{selectedRow.location.id}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {detailTab === "info" ? (
                <div className="space-y-4 text-xs font-semibold">
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-slate-400">ID / KODE ALAT</span>
                    <span className="col-span-2 text-slate-800 dark:text-slate-200 font-bold">{selectedRow.location.id}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-slate-400">NAMA ALAT</span>
                    <span className="col-span-2 text-slate-800 dark:text-slate-200 font-bold">{selectedRow.location.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-slate-400">TIPE ALAT</span>
                    <span className="col-span-2 text-slate-800 dark:text-slate-200">
                      <Badge variant="outline">{formatType(selectedRow.location.type, t)}</Badge>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-slate-400">LOKASI</span>
                    <span className="col-span-2 text-slate-800 dark:text-slate-200">{selectedRow.location.location || selectedRow.location.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-slate-400">KOORDINAT GPS</span>
                    <span className="col-span-2 text-slate-800 dark:text-slate-200 font-bold">
                      Lat: {selectedRow.location.lat}, Lng: {selectedRow.location.lng}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-slate-400">STATUS DAYA</span>
                    <span className="col-span-2 text-slate-800 dark:text-slate-200 uppercase">{selectedRow.state?.power_state || "ON"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-slate-400">KONEKTIVITAS</span>
                    <span className="col-span-2">
                      <ConnectionBadge connection={selectedRow.connection} />
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <span className="text-slate-400">BATERAI & RSSI</span>
                    <span className="col-span-2 text-slate-800 dark:text-slate-200">
                      Volt: {selectedRow.state?.battery_voltage != null ? `${selectedRow.state.battery_voltage} V` : "-"}, RSSI: {selectedRow.state?.wifi_rssi != null ? `${selectedRow.state.wifi_rssi} dBm` : "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-400">DESKRIPSI</span>
                    <span className="col-span-2 text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {selectedRow.location.description || "-"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* List of Mapped Sensors */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Daftar Sensor Terpasang
                    </h4>
                    {loadingMapped ? (
                      <div className="flex justify-center py-6 text-slate-400">
                        <Loader2 className="animate-spin" size={20} />
                      </div>
                    ) : mappedSensors.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-950/20">
                        Belum ada sensor yang dikaitkan ke device ini.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mappedSensors.map((mapping) => (
                          <div
                            key={mapping.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {mapping.sensor_name}
                                </span>
                                 <Badge variant="outline" className="text-[9px] uppercase font-black px-1.5 py-0 bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                                   {mapping.sensor_code}
                                 </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-3 text-[10px] text-slate-400 font-bold">
                                {mapping.gpio_pin && (
                                  <span className="flex items-center gap-1">
                                    <Network size={10} /> {mapping.gpio_pin}
                                  </span>
                                )}
                                {mapping.i2c_address && (
                                  <span className="flex items-center gap-1">
                                    <Hash size={10} /> {mapping.i2c_address}
                                  </span>
                                )}
                                {mapping.install_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={10} /> {mapping.install_date}
                                  </span>
                                )}
                              </div>
                              {mapping.notes && (
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                                  Note: {mapping.notes}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              className="h-8 w-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none shrink-0"
                              onClick={() => handleUnmapSensor(mapping.id, selectedRow.location.id)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form to Map New Sensor */}
                  <form
                    onSubmit={(e) => handleMapSensor(e, selectedRow.location.id)}
                    className="border-t border-slate-200 pt-4 space-y-3 dark:border-slate-800"
                  >
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Pasang Sensor Baru
                    </h4>
                    {mappingError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                        {mappingError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Pilih Sensor *
                        </label>
                        <select
                          required
                          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                          value={mapSensorDefId}
                          onChange={(e) => setMapSensorDefId(e.target.value)}
                        >
                          <option value="">-- Pilih Sensor Katalog --</option>
                          {sensorCatalog.map((def) => (
                            <option key={def.id} value={def.id}>
                              {def.sensor_name} ({def.sensor_code}) - {def.interface_type || "N/A"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          GPIO Pin (Opsional)
                        </label>
                        <input
                          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                          value={mapGpio}
                          onChange={(e) => setMapGpio(e.target.value)}
                          placeholder="Contoh: GPIO4"
                        />
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-medium mt-1">
                          Pin jalur data digital/analog pada ESP32.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          I2C Address (Opsional)
                        </label>
                        <input
                          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                          value={mapI2c}
                          onChange={(e) => setMapI2c(e.target.value)}
                          placeholder="Contoh: 0x68"
                        />
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-medium mt-1">
                          Alamat I2C jika memakai modul addressable.
                        </p>
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Catatan
                        </label>
                        <input
                          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                          value={mapNotes}
                          onChange={(e) => setMapNotes(e.target.value)}
                          placeholder="Catatan penempatan pin, kalibrasi, dll."
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isMappingSubmitting}
                      className="w-full h-10 bg-sky-600 hover:bg-sky-500 text-white border-none mt-2"
                    >
                      {isMappingSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Memasang...
                        </>
                      ) : (
                        "Pasang Sensor ke Alat"
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
            <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <Button type="button" onClick={() => setIsDetailModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-slate-200 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <CardTitle className="text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Edit size={20} className="text-sky-500" />
                Edit Informasi Alat
              </CardTitle>
              <CardDescription>
                Perbarui detail penempatan dan koordinat untuk alat: <span className="font-bold">{selectedRow.location.id}</span>
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEditDeviceSubmit}>
              <CardContent className="p-6 space-y-4">
                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {submitError}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Nama Alat *
                  </label>
                  <input
                    required
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Contoh: Sensor Debu Pit 2"
                    value={editName}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Lokasi Penempatan
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Contoh: Area Tambang Utama - Pit 2"
                    value={editLocation}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Latitude (Garis Lintang)
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                      onChange={(e) => setEditLat(e.target.value)}
                      placeholder="Contoh: -1.8542"
                      value={editLat}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Longitude (Garis Bujur)
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700"
                      onChange={(e) => setEditLng(e.target.value)}
                      placeholder="Contoh: 116.2156"
                      value={editLng}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 text-xs rounded-xl flex items-center justify-center gap-1.5 border-dashed"
                  onClick={() => handleGetCurrentLocation("edit")}
                  disabled={isLocating}
                >
                  <MapPin size={14} className={isLocating ? "animate-bounce" : ""} />
                  {isLocating ? "Mendapatkan Lokasi..." : "Gunakan Lokasi Saya"}
                </Button>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Deskripsi Perangkat
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-700 resize-none"
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Deskripsi peran/penempatan alat..."
                    value={editDesc}
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedRow(null);
                  }}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-white border-none"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {isDeleteConfirmOpen && selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm overflow-hidden rounded-2xl border-slate-200 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <CardTitle className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 size={20} />
                Hapus Perangkat?
              </CardTitle>
              <CardDescription>
                Tindakan ini permanen dan tidak dapat dibatalkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Apakah Anda yakin ingin menghapus alat <span className="font-bold text-slate-950 dark:text-white">{selectedRow.location.name} ({selectedRow.location.id})</span> secara permanen dari sistem?
              </p>
            </CardContent>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setSelectedRow(null);
                }}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-500 text-white border-none"
                onClick={handleDeleteDeviceSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  "Ya, Hapus"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Katalog Sensor Modal */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border-slate-200 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <BookOpen size={20} className="text-sky-500" />
                  Katalog Sensor Pendukung
                </CardTitle>
                <CardDescription>
                  Daftarkan dan kelola tipe-tipe sensor yang didukung oleh sistem.
                </CardDescription>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full border-none"
                onClick={() => setIsCatalogModalOpen(false)}
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Form Tambah Sensor Baru */}
              <form onSubmit={handleCreateSensorDefinition} className="bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Tambah Tipe Sensor Baru ke Katalog
                </h4>
                {catalogError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {catalogError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Kode Sensor *
                    </label>
                    <input
                      required
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-700"
                      value={catalogCode}
                      onChange={(e) => setCatalogCode(e.target.value)}
                      placeholder="Contoh: DS3231"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Nama Sensor *
                    </label>
                    <input
                      required
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-700"
                      value={catalogName}
                      onChange={(e) => setCatalogName(e.target.value)}
                      placeholder="Contoh: DS3231 Real-Time Clock"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Antarmuka / Interface
                    </label>
                    <select
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={catalogInterface}
                      onChange={(e) => setCatalogInterface(e.target.value)}
                    >
                      <option value="analog">Analog (GPIO ADC Pin)</option>
                      <option value="digital">Digital (GPIO I/O Pin)</option>
                      <option value="i2c">I2C (SDA/SCL Bus)</option>
                      <option value="spi">SPI Bus</option>
                      <option value="uart">UART (TX/RX Serial)</option>
                      <option value="onewire">OneWire</option>
                    </select>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-medium mt-1">
                      Jenis jalur komunikasi sensor ke mikrokontroler.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Produsen / Manufacturer
                    </label>
                    <input
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-700"
                      value={catalogMfg}
                      onChange={(e) => setCatalogMfg(e.target.value)}
                      placeholder="Contoh: Maxim Integrated"
                    />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-medium mt-1">
                      Nama perusahaan pembuat sensor (opsional).
                    </p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Deskripsi Sensor
                    </label>
                    <input
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-700"
                      value={catalogDesc}
                      onChange={(e) => setCatalogDesc(e.target.value)}
                      placeholder="Contoh: Modul I2C RTC dengan akurasi sangat tinggi."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={isCatalogSubmitting}
                    className="bg-sky-600 hover:bg-sky-500 text-white border-none h-9 text-xs px-4"
                  >
                    {isCatalogSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Mendaftarkan...
                      </>
                    ) : (
                      "Tambah ke Katalog"
                    )}
                  </Button>
                </div>
              </form>

              {/* Daftar Sensor Katalog */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Daftar Tipe Sensor Pendukung
                </h4>
                {sensorCatalog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-950/20">
                    Katalog sensor kosong. Silakan tambah sensor baru.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden dark:border-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Kode</TableHead>
                          <TableHead>Nama Sensor</TableHead>
                          <TableHead className="w-24 text-center">Interface</TableHead>
                          <TableHead className="w-32">Produsen</TableHead>
                          <TableHead className="w-16 text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs font-semibold">
                        {sensorCatalog.map((def) => (
                          <TableRow key={def.id}>
                            <TableCell className="font-bold text-slate-900 dark:text-white">
                              <Badge variant="outline">{def.sensor_code}</Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{def.sensor_name}</p>
                                {def.description && (
                                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">{def.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center capitalize text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                              {def.interface_type || "N/A"}
                            </TableCell>
                            <TableCell className="text-slate-500 font-medium">{def.manufacturer || "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                className="h-7 w-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none animate-in fade-in"
                                onClick={() => handleDeleteSensorDefinition(def.id)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
            <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <Button type="button" onClick={() => setIsCatalogModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}
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
          options={["all", "Debu", "Gas", "Emisi", "Campuran"]}
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

function formatLastReading(row: SensorStatusRow, timeZone: string) {
  const value = row.state?.last_seen_at ?? row.latestWindow;
  if (!value || value === "-") return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone,
    year: "numeric",
  }).format(date);
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
  if (type === "Emisi") return t("heavyEquipmentEmission");
  return "Campuran";
}

function formatFilterOption(
  option: string,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (option === "all") return t("all");
  if (option === "Debu") return t("mineDust");
  if (option === "Gas") return t("mineGas");
  if (option === "Emisi") return t("heavyEquipmentEmission");
  if (option === "Campuran") return "Campuran";
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
