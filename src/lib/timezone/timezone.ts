export const DEFAULT_TIME_ZONE = "Asia/Makassar";
export const TIME_ZONE_STORAGE_KEY = "simosi-timezone";

const FALLBACK_TIME_ZONES = [
  "Asia/Makassar",
  "Asia/Jakarta",
  "Asia/Jayapura",
  "UTC",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Perth",
  "Europe/London",
  "Europe/Amsterdam",
  "America/New_York",
  "America/Los_Angeles",
];

export function getSupportedTimeZones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }

  return FALLBACK_TIME_ZONES;
}

export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function getTimeZoneLabel(timeZone: string, locale = "id-ID"): string {
  const now = new Date();
  const timeZoneName = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;

  return timeZoneName ? `${timeZone} (${timeZoneName})` : timeZone;
}
