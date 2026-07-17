"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_TIME_ZONE,
  isSupportedTimeZone,
  TIME_ZONE_STORAGE_KEY,
} from "@/lib/timezone/timezone";

type TimezoneContextValue = {
  setTimeZone: (timeZone: string) => void;
  timeZone: string;
};

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

function getStoredTimeZone(): string {
  if (typeof window === "undefined") return DEFAULT_TIME_ZONE;

  const stored = window.localStorage.getItem(TIME_ZONE_STORAGE_KEY);
  return stored && isSupportedTimeZone(stored) ? stored : DEFAULT_TIME_ZONE;
}

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timeZone, setTimeZoneState] = useState(DEFAULT_TIME_ZONE);

  const setTimeZone = useCallback((nextTimeZone: string) => {
    if (!isSupportedTimeZone(nextTimeZone)) return;

    window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, nextTimeZone);
    setTimeZoneState(nextTimeZone);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => setTimeZoneState(getStoredTimeZone()));
  }, []);

  const value = useMemo(
    () => ({ setTimeZone, timeZone }),
    [setTimeZone, timeZone],
  );

  return (
    <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);

  if (!context) {
    throw new Error("useTimezone harus dipakai di dalam TimezoneProvider");
  }

  return context;
}
