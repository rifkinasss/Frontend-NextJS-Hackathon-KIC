import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ComponentProps<"button">, "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

function Switch({
  checked = false,
  className,
  disabled,
  onCheckedChange,
  onClick,
  ...props
}: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-emerald-600 dark:bg-emerald-500"
          : "bg-slate-200 dark:bg-slate-800",
        className,
      )}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange?.(!checked);
      }}
      role="switch"
      type="button"
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
        data-state={checked ? "checked" : "unchecked"}
      />
    </button>
  );
}

export { Switch };
