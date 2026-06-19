"use client";

import * as React from "react";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_STORAGE_KEY,
} from "@/lib/sidebar/sidebar-script";
import { cn } from "@/lib/utils";

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function applySidebarState(collapsed: boolean) {
  const root = document.documentElement;
  root.dataset.sidebarState = collapsed ? "collapsed" : "expanded";
  root.style.setProperty(
    "--sidebar-width",
    collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
  );
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = React.useState(false);

  const setCollapsed = React.useCallback((nextCollapsed: boolean) => {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      nextCollapsed ? "collapsed" : "expanded",
    );
    applySidebarState(nextCollapsed);
    setCollapsedState(nextCollapsed);
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(() => {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      const nextCollapsed = stored === "collapsed";
      applySidebarState(nextCollapsed);
      setCollapsedState(nextCollapsed);
    });
  }, []);

  const value = React.useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleSidebar: () => setCollapsed(!collapsed),
    }),
    [collapsed, setCollapsed],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar harus dipakai di dalam SidebarProvider");
  }

  return context;
}

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  const { collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-[var(--sidebar-width)] flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur transition-[width] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950/95",
        collapsed && "items-center",
        className,
      )}
      data-collapsed={collapsed}
      data-slot="sidebar"
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex h-16 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800",
        className,
      )}
      data-slot="sidebar-header"
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto p-3", className)}
      data-slot="sidebar-content"
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-t border-slate-200 p-3 dark:border-slate-800", className)}
      data-slot="sidebar-footer"
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("space-y-1", className)} data-slot="sidebar-group" {...props} />
  );
}

function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { collapsed } = useSidebar();

  if (collapsed) return null;

  return (
    <p
      className={cn(
        "px-3 pb-2 pt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500",
        className,
      )}
      data-slot="sidebar-group-label"
      {...props}
    />
  );
}

function SidebarMenuButton({
  active,
  asChild = false,
  className,
  ...props
}: React.ComponentProps<"a"> & { active?: boolean; asChild?: boolean }) {
  const { collapsed } = useSidebar();
  const computedClassName = cn(
    "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
    collapsed && "w-11 justify-center px-0",
    active &&
      "bg-slate-950 text-white shadow-sm hover:bg-slate-900 hover:text-white dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white dark:hover:text-slate-950",
    className,
  );

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<{
      className?: string;
      "data-active"?: boolean;
      "data-slot"?: string;
    }>;

    return React.cloneElement(child, {
      className: cn(computedClassName, child.props.className),
      "data-active": active,
      "data-slot": "sidebar-menu-button",
    });
  }

  return (
    <a
      className={computedClassName}
      data-active={active}
      data-slot="sidebar-menu-button"
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
  SidebarProvider,
  useSidebar,
};
