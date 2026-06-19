"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { ThemeMode } from "@/types/theme";

const OPTIONS: Array<{
  icon: typeof Sun;
  label: string;
  value: ThemeMode;
}> = [
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" },
  { icon: Monitor, label: "System", value: "system" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { setTheme, theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      role="radiogroup"
      aria-label={t("chooseTheme")}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            aria-checked={active}
            className={`inline-flex h-8 items-center justify-center gap-2 rounded-md px-2.5 text-xs font-bold transition ${
              active
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
            key={option.value}
            onClick={() => setTheme(option.value)}
            role="radio"
            title={option.label}
            type="button"
          >
            <Icon size={15} />
            {!compact && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
