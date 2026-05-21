import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dailyveg-500/35 disabled:pointer-events-none disabled:opacity-50 ring-offset-white dark:ring-offset-dailyveg-950",
  {
    variants: {
      variant: {
        default:
          "bg-dailyveg-500 text-white shadow-brand hover:bg-dailyveg-600 dark:bg-dailyveg-600 dark:hover:bg-dailyveg-500",
        outline:
          "border border-slate-200 bg-white text-slate-800 hover:border-dailyveg-300 hover:bg-dailyveg-50 hover:text-dailyveg-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-dailyveg-800 dark:hover:bg-dailyveg-950/70 dark:hover:text-dailyveg-300",
        ghost:
          "text-slate-700 hover:bg-dailyveg-50 hover:text-dailyveg-800 dark:text-slate-200 dark:hover:bg-dailyveg-950/70 dark:hover:text-dailyveg-300",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/35",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
