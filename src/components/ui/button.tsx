import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "secondary" | "destructive";
type ButtonSize = "default" | "sm" | "icon";

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-slate-950 text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white",
  destructive:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  ghost:
    "hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50",
  outline:
    "border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  icon: "h-10 w-10",
  sm: "h-9 px-3",
};

type ButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

function Button({
  asChild = false,
  className,
  size = "default",
  variant = "default",
  ...props
}: ButtonProps) {
  const computedClassName = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<{
      className?: string;
    }>;

    return React.cloneElement(child, {
      className: cn(computedClassName, child.props.className),
    });
  }

  return (
    <button
      className={computedClassName}
      data-slot="button"
      {...props}
    />
  );
}

export { Button };
