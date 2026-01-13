import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900", className)} {...props} />
  );
}
