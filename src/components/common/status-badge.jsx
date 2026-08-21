import { Badge } from "../ui/badge";

export function StatusBadge({ value, label, className }) {
  const v = String(value || "").toLowerCase();

  let badgeClass = "";
  if (v === "payment_pending") {
    badgeClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60";
  } else if (v === "placed") {
    badgeClass = "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60";
  } else if (v === "confirmed") {
    badgeClass = "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60";
  } else if (v === "locked") {
    badgeClass = "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60";
  } else if (v === "accepted") {
    badgeClass = "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/60";
  } else if (v === "packed") {
    badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60";
  } else if (v === "out_for_delivery") {
    badgeClass = "bg-teal-50 text-teal-850 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/60";
  } else if (v === "delivered") {
    badgeClass = "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-sm";
  } else if (v === "delivery_failed" || v === "failed") {
    badgeClass = "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60";
  } else if (v === "cancelled") {
    badgeClass = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60";
  } else if (v === "refunded") {
    badgeClass = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800";
  } else if (v === "not_required" || v === "covered_from_fresh_stock" || v === "covered_from_stock" || v === "covered") {
    badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
  } else if (v === "active" || v === "true" || v === "in_stock") {
    badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60";
  } else if (v === "inactive" || v === "false" || v === "out_of_stock") {
    badgeClass = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800";
  } else if (v.includes("pending") || v === "refund_pending") {
    badgeClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60";
  } else {
    badgeClass = "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
  }

  return (
    <Badge
      variant="outline"
      className={`${badgeClass} font-bold capitalize px-2 py-0.5 rounded-md ${className || ""}`}
    >
      {label || String(value || "").replace(/_/g, " ")}
    </Badge>
  );
}

