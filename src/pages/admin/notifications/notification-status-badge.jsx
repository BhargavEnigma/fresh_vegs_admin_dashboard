import { cn } from "../../../lib/utils";
import { formatStatus } from "./notification-utils";

const STATUS_CLASS = {
    draft: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700",
    scheduled: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800",
    sending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
    sent: "bg-dailyveg-50 text-dailyveg-800 ring-dailyveg-200 dark:bg-dailyveg-950/50 dark:text-dailyveg-300 dark:ring-dailyveg-800",
    partially_failed: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800",
    failed: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800",
    cancelled: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700",
};

export function NotificationStatusBadge({ status }) {
    const value = String(status || "draft").toLowerCase();

    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset",
            STATUS_CLASS[value] || STATUS_CLASS.draft
        )}>
            {formatStatus(value)}
        </span>
    );
}
