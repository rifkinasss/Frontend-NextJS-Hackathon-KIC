const PARAMETER_UNITS: Record<string, string> = {
  PM25: "µg/m³",
  PM10: "µg/m³",
  CO: "ppm",
  CO2: "ppm",
  H2S: "ppm",
  CH4: "ppm",
  H2: "ppm",
  SUHU: "°C",
  KELEMBABAN: "% RH",
};

function normalizeParameterName(parameter: string) {
  return parameter.toUpperCase().replaceAll(".", "").replaceAll("₂", "2").replaceAll("₄", "4");
}

export function getParameterUnit(parameter: string) {
  return PARAMETER_UNITS[normalizeParameterName(parameter)] ?? "";
}

export function formatParameterValue(
  parameter: string,
  value: number | string,
) {
  const unit = getParameterUnit(parameter);
  return unit ? `${value} ${unit}` : String(value);
}
