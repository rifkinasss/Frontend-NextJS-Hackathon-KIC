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
import { THEME_STORAGE_KEY } from "@/lib/theme/theme-script";
import type { ResolvedTheme, ThemeMode } from "@/types/theme";

type ThemeContextValue = {
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  theme: ThemeMode;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: ThemeMode, resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    const nextResolvedTheme = resolveTheme(nextTheme);

    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme, nextResolvedTheme);
    setThemeState(nextTheme);
    setResolvedTheme(nextResolvedTheme);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const storedTheme = getStoredTheme();
      const nextResolvedTheme = resolveTheme(storedTheme);

      applyTheme(storedTheme, nextResolvedTheme);
      setThemeState(storedTheme);
      setResolvedTheme(nextResolvedTheme);
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      setThemeState((currentTheme) => {
        if (currentTheme !== "system") return currentTheme;

        const nextResolvedTheme = getSystemTheme();
        applyTheme("system", nextResolvedTheme);
        setResolvedTheme(nextResolvedTheme);
        return currentTheme;
      });
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const value = useMemo(
    () => ({
      resolvedTheme,
      setTheme,
      theme,
    }),
    [resolvedTheme, setTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme harus dipakai di dalam ThemeProvider");
  }

  return context;
}
