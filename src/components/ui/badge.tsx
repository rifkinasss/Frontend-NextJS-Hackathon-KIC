import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "success" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  danger:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300",
  default:
    "border-transparent bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950",
  outline:
    "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
};

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
        variants[variant],
        className,
      )}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge };
