export type DashboardStatus = "AMAN" | "WASPADA" | "BAHAYA";

export type AnalysisCategoryName =
  | "DEBU TAMBANG"
  | "GAS TAMBANG"
  | "EMISI ALAT BERAT";

export type AnalysisParam = {
  param: string;
  nilai: number | string;
  derajat?: Record<string, number>;
  info?: string;
};

export type AnalysisHistoryPoint = {
  timestamp: string;
  crisp?: number;
  parameters?: Record<string, number>;
  is_averaged?: boolean;
};

export type SensorAnalysis = {
  sensor_id: string;
  lokasi: string;
  status: string;
  latest_window?: string;
  params?: AnalysisParam[];
  history?: AnalysisHistoryPoint[];
};

export type AnalysisResponse = Partial<
  Record<AnalysisCategoryName, SensorAnalysis[]>
>;

export type AnalysisMode = "realtime" | "historical";

export type AnalysisQuery = {
  mode: AnalysisMode;
  startDate?: string;
  endDate?: string;
};
