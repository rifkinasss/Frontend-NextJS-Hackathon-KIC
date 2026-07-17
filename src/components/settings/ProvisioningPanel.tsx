"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LocateFixed, RadioTower, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveDevice, fetchDevices, updateDevice } from "@/lib/api/devices";
import { fetchDeviceSensors } from "@/lib/api/sensors";
import type { DeviceSensorMapping } from "@/types/sensor";
import type { RegisteredDevice } from "@/types/device";

type FormValues = { device_name: string; location: string; latitude: string; longitude: string };

export function ProvisioningPanel() {
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [forms, setForms] = useState<Record<string, FormValues>>({});
  const [sensors, setSensors] = useState<Record<string, DeviceSensorMapping[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pending = (await fetchDevices()).filter((device) => device.provisioning_status === "pending");
      setDevices(pending);
      setForms(Object.fromEntries(pending.map((device) => [device.id, {
        device_name: device.device_name,
        location: device.location ?? "",
        latitude: device.latitude?.toString() ?? "",
        longitude: device.longitude?.toString() ?? "",
      }])));
      const mapped = await Promise.all(pending.map(async (device) => [device.id, await fetchDeviceSensors(device.id)] as const));
      setSensors(Object.fromEntries(mapped));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memuat perangkat baru");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const setField = (deviceId: string, field: keyof FormValues, value: string) => {
    setForms((current) => ({ ...current, [deviceId]: { ...current[deviceId], [field]: value } }));
  };

  const applyCurrentLocation = (deviceId: string) => {
    if (!navigator.geolocation) return setError("Browser tidak mendukung geolokasi.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setField(deviceId, "latitude", coords.latitude.toFixed(6));
        setField(deviceId, "longitude", coords.longitude.toFixed(6));
      },
      () => setError("Lokasi tidak dapat diambil. Periksa izin lokasi browser."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const approve = async (device: RegisteredDevice) => {
    const values = forms[device.id];
    if (!values?.device_name.trim() || !values.location.trim() || !values.latitude || !values.longitude) {
      setError("Nama alat, lokasi, latitude, dan longitude wajib diisi sebelum disetujui.");
      return;
    }
    setSavingId(device.id);
    setError(null);
    try {
      await updateDevice(device.id, {
        device_name: values.device_name.trim(),
        location: values.location.trim(),
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
      });
      await approveDevice(device.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyetujui perangkat");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
      <CardHeader className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Provisioning IoT</p>
            <CardTitle className="mt-2 text-2xl text-slate-950 dark:text-white">Perangkat Baru Terdeteksi</CardTitle>
          </div>
          <Button disabled={loading} onClick={() => void load()} size="icon" title="Muat ulang" type="button" variant="secondary">
            <RefreshCcw className={loading ? "animate-spin" : ""} size={16} />
          </Button>
        </div>
        <p className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">Lengkapi lokasi dan setujui perangkat sebelum data sensor diterima.</p>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        {!loading && devices.length === 0 && <p className="text-sm font-medium text-slate-500">Belum ada perangkat yang menunggu aktivasi.</p>}
        {devices.map((device) => {
          const values = forms[device.id];
          return <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/15" key={device.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="flex items-center gap-2 font-bold text-slate-950 dark:text-white"><RadioTower size={17} />{device.device_code}</p><p className="mt-1 text-xs text-slate-500">{device.hardware_id} · Firmware {device.firmware_ver ?? "-"}</p></div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Menunggu aktivasi</span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">Sensor: {(sensors[device.id] ?? []).map((sensor) => sensor.sensor_code).join(", ") || "memuat..."}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className={inputClass} onChange={(event) => setField(device.id, "device_name", event.target.value)} placeholder="Nama alat" value={values?.device_name ?? ""} />
              <input className={inputClass} onChange={(event) => setField(device.id, "location", event.target.value)} placeholder="Lokasi pemasangan" value={values?.location ?? ""} />
              <input className={inputClass} inputMode="decimal" onChange={(event) => setField(device.id, "latitude", event.target.value)} placeholder="Latitude" value={values?.latitude ?? ""} />
              <input className={inputClass} inputMode="decimal" onChange={(event) => setField(device.id, "longitude", event.target.value)} placeholder="Longitude" value={values?.longitude ?? ""} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => applyCurrentLocation(device.id)} type="button" variant="secondary"><LocateFixed size={16} /> Gunakan lokasi saya</Button>
              <Button disabled={savingId === device.id} onClick={() => void approve(device)} type="button"><CheckCircle2 size={16} /> {savingId === device.id ? "Menyimpan..." : "Setujui & aktifkan"}</Button>
            </div>
          </div>;
        })}
      </CardContent>
    </Card>
  );
}

const inputClass = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
