import type {
  AnalysisCategoryName,
  AnalysisResponse,
  DashboardStatus,
  SensorAnalysis,
} from "@/types/analysis";

export const ANALYSIS_CATEGORIES: Array<{
  id: "debu" | "gas" | "emisi";
  name: AnalysisCategoryName;
  label: string;
  accentClass: string;
}> = [
  {
    id: "debu",
    name: "DEBU TAMBANG",
    label: "Debu Tambang",
    accentClass: "bg-sky-500",
  },
  {
    id: "gas",
    name: "GAS TAMBANG",
    label: "Gas Tambang",
    accentClass: "bg-amber-500",
  },
  {
    id: "emisi",
    name: "EMISI ALAT BERAT",
    label: "Emisi Alat Berat",
    accentClass: "bg-emerald-500",
  },
];

export function getCategoryStatus(
  data: AnalysisResponse | null,
  category: AnalysisCategoryName,
): DashboardStatus {
  const sensors = data?.[category] ?? [];

  if (sensors.some((sensor) => sensor.status.includes("BAHAYA"))) {
    return "BAHAYA";
  }

  if (sensors.some((sensor) => sensor.status.includes("WASPADA"))) {
    return "WASPADA";
  }

  return "AMAN";
}

export function getAreaStatus(data: AnalysisResponse | null): DashboardStatus {
  const statuses = ANALYSIS_CATEGORIES.map((category) =>
    getCategoryStatus(data, category.name),
  );

  if (statuses.includes("BAHAYA")) return "BAHAYA";
  if (statuses.includes("WASPADA")) return "WASPADA";
  return "AMAN";
}

export function getSensors(data: AnalysisResponse | null): SensorAnalysis[] {
  return ANALYSIS_CATEGORIES.flatMap((category) => data?.[category.name] ?? []);
}

export function getCriticalSensors(data: AnalysisResponse | null) {
  return getSensors(data).filter((sensor) => sensor.status.includes("BAHAYA"));
}

export function getStatusTone(status: DashboardStatus) {
  if (status === "BAHAYA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "WASPADA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}
