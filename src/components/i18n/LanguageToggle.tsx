"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n/dictionaries";

const OPTIONS: Array<{
  label: string;
  shortLabel: string;
  value: Locale;
}> = [
  { label: "Indonesia", shortLabel: "ID", value: "id" },
  { label: "English", shortLabel: "EN", value: "en" },
];

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      aria-label={t("chooseLanguage")}
      className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      role="radiogroup"
    >
      {!compact && (
        <span className="flex h-8 items-center gap-2 px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Languages size={15} />
          {t("language")}
        </span>
      )}
      {OPTIONS.map((option) => {
        const active = locale === option.value;

        return (
          <button
            aria-checked={active}
            className={`inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-bold transition ${
              active
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
            key={option.value}
            onClick={() => setLocale(option.value)}
            role="radio"
            title={option.label}
            type="button"
          >
            {compact ? option.shortLabel : option.label}
          </button>
        );
      })}
    </div>
  );
}
