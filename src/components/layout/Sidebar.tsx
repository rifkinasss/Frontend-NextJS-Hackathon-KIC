"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Activity,
  Flame,
  LayoutDashboard,
  Map as MapIcon,
  RadioTower,
  Settings,
  Wind,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  Sidebar as SidebarShell,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  { titleKey: "dashboard", icon: LayoutDashboard, href: "/" },
  { titleKey: "mineDust", icon: Wind, href: "/kategori/debu" },
  { titleKey: "mineGas", icon: Flame, href: "/kategori/gas" },
  {
    titleKey: "heavyEquipmentEmission",
    icon: Activity,
    href: "/kategori/emisi",
  },
  { titleKey: "monitoringMap", icon: MapIcon, href: "/peta" },
  { titleKey: "sensorStatus", icon: RadioTower, href: "/sensor-status" },
] as const;

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const { t } = useLanguage();

  return (
    <SidebarShell>
      <SidebarHeader
        className={cn(
          "justify-between",
          collapsed && "justify-center px-0",
        )}
      >
        <Link
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-xl",
            collapsed && "justify-center",
          )}
          href="/"
          title="SIMOSI"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl dark:bg-white/90 dark:shadow-[0_0_18px_4px_rgba(255,255,255,0.35)]">
            <Image
              alt="Logo SIMOSI"
              className="h-9 w-9 object-contain"
              height={500}
              priority
              src="/simosi-logo.png"
              width={500}
            />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-slate-950 dark:text-white">
                SIMOSI
              </span>
            </span>
          )}
        </Link>

      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("menuMain")}</SidebarGroupLabel>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);
            const title = t(item.titleKey);

            return (
              <SidebarMenuButton
                active={active}
                asChild
                key={item.href}
                title={title}
              >
                <Link href={item.href}>
                  <Icon className="shrink-0" size={20} />
                  {!collapsed && (
                    <span className="truncate">{title}</span>
                  )}
                </Link>
              </SidebarMenuButton>
            );
          })}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenuButton
          active={isActiveRoute(pathname, "/settings")}
          asChild
          title={t("settings")}
        >
          <Link href="/settings">
            <Settings className="shrink-0" size={20} />
            {!collapsed && <span className="truncate">{t("settings")}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </SidebarShell>
  );
}
