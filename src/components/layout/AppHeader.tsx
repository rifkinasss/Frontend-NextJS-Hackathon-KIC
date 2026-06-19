"use client";

import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SidebarTrigger } from "@/components/layout/SidebarTrigger";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function AppHeader() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-8 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {t("appTitle")}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-sm italic text-slate-500 dark:text-slate-400">
            {t("dataSource")}
          </span>
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <LanguageToggle compact />
        <ThemeToggle compact />
      </div>
    </header>
  );
}
