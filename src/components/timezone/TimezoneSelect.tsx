"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useTimezone } from "@/components/timezone/TimezoneProvider";
import {
  getSupportedTimeZones,
  getTimeZoneLabel,
} from "@/lib/timezone/timezone";

export function TimezoneSelect() {
  const { locale, t } = useLanguage();
  const { setTimeZone, timeZone } = useTimezone();
  const timeZones = useMemo(() => getSupportedTimeZones(), []);

  return (
    <select
      aria-label={t("chooseTimezone")}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      onChange={(event) => setTimeZone(event.target.value)}
      value={timeZone}
    >
      {timeZones.map((zone) => (
        <option key={zone} value={zone}>
          {getTimeZoneLabel(zone, locale === "id" ? "id-ID" : "en-US")}
        </option>
      ))}
    </select>
  );
}
