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
  dictionaries,
  LANGUAGE_STORAGE_KEY,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "id";

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "en" ? "en" : "id";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const storedLocale = getStoredLocale();

      document.documentElement.lang = storedLocale;
      setLocaleState(storedLocale);
    });
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey) => dictionaries[locale][key],
    }),
    [locale, setLocale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage harus dipakai di dalam LanguageProvider");
  }

  return context;
}
