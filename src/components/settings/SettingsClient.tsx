"use client";

import {
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  HardDrive,
  Palette,
  Server,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type IconComponent = React.ComponentType<{ className?: string; size?: number }>;

type SettingsClientProps = {
  apiBaseUrl: string;
};

export function SettingsClient({ apiBaseUrl }: SettingsClientProps) {
  const { t } = useLanguage();
  const configRows = [
    {
      icon: Server,
      label: t("apiEndpoint"),
      status: t("connected"),
      tone: "success",
      value: apiBaseUrl,
    },
    {
      icon: Database,
      label: t("databaseEngine"),
      status: t("active"),
      tone: "info",
      value: "PostgreSQL",
    },
    {
      icon: Clock3,
      label: t("timezone"),
      status: "WITA",
      tone: "warning",
      value: t("operationalTimezone"),
    },
    {
      icon: HardDrive,
      label: t("browserStorage"),
      status: t("configured"),
      tone: "violet",
      value: t("localPreference"),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="overflow-hidden rounded-2xl shadow-[0_22px_70px_-46px_rgba(15,23,42,0.9)]">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px]">
            <div className="p-7 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <SlidersHorizontal className="text-sky-500" size={14} />
                {t("preferences")}
              </div>
              <h2 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("systemSettings")}
              </h2>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {t("settingsDescription")}
              </p>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-950/60 xl:border-l xl:border-t-0">
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {t("runtimeMode")}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    {t("productionReady")}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} />
                    <p className="text-sm font-bold">{t("connected")}</p>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-emerald-800/80 dark:text-emerald-100/75">
                    {t("activeConnection")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PreferenceCard
          description={t("themePreferenceDescription")}
          icon={Palette}
          title={t("displayMode")}
        >
          <ThemeToggle />
        </PreferenceCard>

        <PreferenceCard
          description={t("languagePreferenceDescription")}
          icon={Globe2}
          title={t("languagePreference")}
        >
          <LanguageToggle />
        </PreferenceCard>
      </section>

      <Card className="overflow-hidden rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
        <CardHeader className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {t("systemConfiguration")}
              </p>
              <CardTitle className="mt-2 text-2xl text-slate-950 dark:text-white">
                {t("dataConnection")}
              </CardTitle>
            </div>
            <Badge variant="success">{t("configured")}</Badge>
          </div>
          <p className="max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            {t("systemConfigurationDescription")}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="text-xs">
              <TableRow>
                <TableHead>{t("setting")}</TableHead>
                <TableHead>{t("value")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <row.icon size={17} />
                      </div>
                      <span className="text-sm font-bold text-slate-950 dark:text-white">
                        {row.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[420px] truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {row.value}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={row.tone}>{row.status}</StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
      : tone === "info"
        ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function PreferenceCard({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: IconComponent;
  title: string;
}) {
  return (
    <Card className="rounded-2xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.95)]">
      <CardContent className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Icon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 max-w-xl text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          </div>
          <CheckCircle2 className="hidden text-emerald-500 sm:block" size={20} />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
