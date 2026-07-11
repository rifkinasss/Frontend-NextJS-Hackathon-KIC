"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Activity, Wind } from "lucide-react";
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  TileLayer,
} from "react-leaflet";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatParameterValue } from "@/lib/parameter-units";
import { cn } from "@/lib/utils";
import type { AnalysisResponse, SensorAnalysis } from "@/types/analysis";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { MonitoringLocation, MonitoringLocationType } from "@/types/location";

const markerColors: Record<MonitoringLocationType, string> = {
  Debu: "#0ea5e9",
  Emisi: "#10b981",
  Gas: "#f97316",
  Campuran: "#8b5cf6",
};

const icons = {
  Debu: createIcon(markerColors.Debu),
  Emisi: createIcon(markerColors.Emisi),
  Gas: createIcon(markerColors.Gas),
  Campuran: createIcon(markerColors.Campuran),
};

function createIcon(color: string) {
  return L.divIcon({
    className: "custom-icon",
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 16px 30px -18px rgb(15 23 42 / 0.9);">
      <div style="transform: rotate(45deg); width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
    </div>`,
    iconAnchor: [16, 32],
    iconSize: [32, 32],
    popupAnchor: [0, -32],
  });
}

type MapComponentProps = {
  analysisData: AnalysisResponse | null;
  fullscreen?: boolean;
  locations: MonitoringLocation[];
};

export default function MapComponent({
  analysisData,
  fullscreen = false,
  locations,
}: MapComponentProps) {
  return (
    <div
      className={cn(
        "relative z-0 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.9)] dark:border-slate-800",
        fullscreen ? "h-[calc(100vh-6rem)]" : "h-[560px]",
      )}
    >
      <MapOverlayLegend />
      <MapContainer
        center={[-1.8542, 116.2156]}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        zoom={14}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ScaleControl imperial={false} position="bottomright" />
        {locations.map((location) => {
          const sensor = getSensorData(analysisData, location.id);

          return (
            <Marker
              icon={icons[location.type]}
              key={location.id}
              position={[location.lat, location.lng]}
            >
              <Popup className="custom-popup" minWidth={320}>
                <LocationPopup location={location} sensor={sensor} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

function MapOverlayLegend() {
  const { t } = useLanguage();

  return (
    <div className="pointer-events-auto absolute bottom-8 left-4 z-[1000] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.9)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {t("sensorLegend")}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(markerColors).map(([type, color]) => (
          <div
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
            key={type}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {formatLocationType(type as MonitoringLocationType, t)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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

function LocationPopup({
  location,
  sensor,
}: {
  location: MonitoringLocation;
  sensor: SensorAnalysis | null;
}) {
  const { t } = useLanguage();

  return (
    <div className="p-1 font-sans">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="mb-1 text-lg font-black uppercase leading-none tracking-tight text-slate-900 dark:text-white">
            {location.id}
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {location.name}
          </p>
        </div>
        {sensor && <StatusPill status={sensor.status} />}
      </div>

      {sensor ? (
        <div className="space-y-4">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <Wind size={12} className="text-sky-500" />
              {t("membershipDegree")}
            </p>
            <div className="space-y-3">
              {(sensor.params ?? []).map((param) => (
                <div
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
                  key={param.param}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-white">
                      {param.param}
                    </span>
                    <span className="text-[10px] font-black text-sky-600 dark:text-sky-300">
                      {formatParameterValue(param.param, param.nilai)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {["Rendah", "Sedang", "Tinggi"].map((label) => (
                      <div className="flex-1" key={label}>
                        <div className="h-1 overflow-hidden rounded-full border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
                          <div
                            className={`h-full transition-all duration-500 ${
                              label === "Rendah"
                                ? "bg-sky-400"
                                : label === "Sedang"
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            }`}
                            style={{
                              width: `${Number(param.derajat?.[label] ?? 0) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="mt-1 text-center text-[7px] font-bold uppercase text-slate-400">
                          {formatDegreeLabel(label, t)[0]}:{" "}
                          {param.derajat?.[label] ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 text-white dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2 text-sky-300">
              <Activity size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {t("inferenceDecision")}
              </span>
            </div>
            <p className="text-[10px] font-medium leading-relaxed text-slate-300">
              {sensor.status}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[8px] font-black uppercase text-slate-500">
              <span>{t("ruleMethod")}: Tsukamoto</span>
              <span>Window: {sensor.latest_window}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-bold uppercase text-slate-400">
            {t("waitingSensorData")}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  const tone = status.includes("BAHAYA")
    ? "border-red-100 bg-red-50 text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
    : status.includes("WASPADA")
      ? "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300"
      : "border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300";

  return (
    <div
      className={`rounded-xl border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${tone}`}
    >
      {formatStatusText(status, t)}
    </div>
  );
}

function formatLocationType(
  type: MonitoringLocationType,
  t: (key: TranslationKey) => string,
) {
  if (type === "Debu") return t("mineDust");
  if (type === "Gas") return t("mineGas");
  if (type === "Emisi") return t("heavyEquipmentEmission");
  return "Campuran";
}

function formatDegreeLabel(label: string, t: (key: TranslationKey) => string) {
  if (label === "Rendah") return t("low");
  if (label === "Sedang") return t("medium");
  return t("high");
}

function formatStatusText(status: string, t: (key: TranslationKey) => string) {
  if (status.includes("BAHAYA")) return t("danger");
  if (status.includes("WASPADA")) return t("alert");
  return t("safe");
}
