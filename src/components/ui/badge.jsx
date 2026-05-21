import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-dailyveg-500 text-white dark:bg-dailyveg-600",
        secondary:
          "border-dailyveg-200 bg-dailyveg-50 text-dailyveg-800 dark:border-dailyveg-800/60 dark:bg-dailyveg-950/70 dark:text-dailyveg-300",
        outline:
          "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200",
        success:
          "border-transparent bg-dailyveg-500 text-white dark:bg-dailyveg-600",
        warning:
          "border-transparent bg-amber-500 text-white",
        danger:
          "border-transparent bg-red-600 text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className, "truncate")} {...props} />;
}

export { Badge, badgeVariants };
