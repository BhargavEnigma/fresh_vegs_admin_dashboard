import React from "react";
import { Check, Clock, X, Circle, AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { formatOrderStatusDateTime } from "../../utils/date-formatter";
import {
    normalizeOrderStatusTimeline,
    getOrderStatusLabel,
    getOrderStatusTone,
    getOrderStatusSourceLabel,
} from "../../utils/order-status-timeline";

function getActorText(item) {
    if (item.actor?.full_name) {
        return `Updated by ${item.actor.full_name}`;
    }
    if (item.source === "scheduler") {
        return "Updated automatically by Scheduler";
    }
    if (item.source === "payment") {
        return "Updated automatically by Payment system";
    }
    const sourceLabel = getOrderStatusSourceLabel(item.source);
    if (sourceLabel && sourceLabel !== "System") {
        return `Updated automatically by ${sourceLabel}`;
    }
    return "Updated by System";
}

function getHumanizedNote(note) {
    if (!note) return null;
    const n = String(note).trim();
    if (!n) return null;

    const lower = n.toLowerCase();
    if (
        lower === "scheduler_lock" ||
        lower === "payment.captured" ||
        lower === "payment_captured" ||
        lower === "status_transition"
    ) {
        return null;
    }

    if (n.startsWith("{") && n.endsWith("}")) {
        return null;
    }

    return n;
}

function StatusIcon({ tone }) {
    const iconClass = "h-3.5 w-3.5";
    switch (tone) {
        case "green":
            return <Check className={iconClass} aria-hidden="true" />;
        case "amber":
            return <Clock className={iconClass} aria-hidden="true" />;
        case "red":
            return <X className={iconClass} aria-hidden="true" />;
        default:
            return <Circle className={cn(iconClass, "fill-current")} aria-hidden="true" />;
    }
}

export function OrderStatusTimeline({
    items,
    currentStatus,
    currentStatusAt,
    isLoading = false,
    errorMessage = null,
    onRetry = undefined,
    compact = false,
}) {
    if (isLoading) {
        return (
            <Card className="p-5">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="border-l border-slate-100 pl-6 dark:border-slate-800 space-y-6 ml-3">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="relative space-y-2">
                                <div className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    if (errorMessage) {
        return (
            <Card className="p-5 border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
                <div className="flex flex-col items-center justify-center text-center p-4">
                    <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400 mb-2" />
                    <h4 className="font-semibold text-slate-950 dark:text-slate-50">
                        Could not load the order status timeline.
                    </h4>
                    <p className="text-sm text-slate-500 mt-1 mb-4">{errorMessage}</p>
                    {onRetry && (
                        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
                            <RefreshCw className="h-3.5 w-3.5" /> Retry
                        </Button>
                    )}
                </div>
            </Card>
        );
    }

    const orderStub = { status_timeline: items };
    const normalizedItems = normalizeOrderStatusTimeline(orderStub);

    if (normalizedItems.length === 0) {
        const isHistorical = true; // safe default assumption
        return (
            <Card className="p-5">
                <h3 className="text-sm font-semibold mb-2">Order Status Timeline</h3>
                <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl dark:bg-slate-900/50">
                    <div>Status history is not available for this order.</div>
                    {isHistorical && (
                        <div className="text-xs text-slate-400 mt-1">
                            Some older order transition times may not have been recorded.
                        </div>
                    )}
                </div>
            </Card>
        );
    }

    const resolvedCurrentStatus = currentStatus || normalizedItems[normalizedItems.length - 1]?.status;
    const resolvedCurrentStatusAt = currentStatusAt || normalizedItems[normalizedItems.length - 1]?.occurred_at;

    return (
        <Card className={cn("p-5", compact ? "shadow-none border-0 p-0" : "")}>
            {!compact && (
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                            Order Status Timeline
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Real-time tracking of order lifecycle events
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="text-xs">
                            <span className="text-slate-500">Current status:</span>{" "}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {getOrderStatusLabel(resolvedCurrentStatus)}
                            </span>
                        </div>
                        {resolvedCurrentStatusAt && (
                            <div className="text-xs">
                                <span className="text-slate-500">Last changed:</span>{" "}
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {formatOrderStatusDateTime(resolvedCurrentStatusAt)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ol
                aria-label="Order status history"
                className="relative border-l-2 border-slate-100 pl-6 dark:border-slate-800/60 space-y-6 ml-3"
            >
                {normalizedItems.map((item, idx) => {
                    const isLast = idx === normalizedItems.length - 1;
                    const tone = getOrderStatusTone(item.status);
                    
                    const toneClasses = {
                        green: {
                            dot: "border-dailyveg-500 bg-dailyveg-50 text-dailyveg-600 dark:bg-dailyveg-950/40 dark:text-dailyveg-400",
                            card: isLast ? "bg-dailyveg-50/30 border-dailyveg-100 dark:bg-dailyveg-950/10 dark:border-dailyveg-900/40" : "",
                        },
                        amber: {
                            dot: "border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
                            card: isLast ? "bg-amber-50/30 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/40" : "",
                        },
                        red: {
                            dot: "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
                            card: isLast ? "bg-red-50/30 border-red-100 dark:bg-red-950/10 dark:border-red-900/40" : "",
                        },
                        slate: {
                            dot: "border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
                            card: isLast ? "bg-slate-50/30 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800" : "",
                        },
                    }[tone] || {
                        dot: "border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
                        card: "",
                    };

                    const actorText = getActorText(item);
                    const noteText = getHumanizedNote(item.note);

                    return (
                        <li key={item.id || idx} className="relative group">
                            {/* Connector dot */}
                            <div
                                className={cn(
                                    "absolute -left-[35px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-transform duration-200 group-hover:scale-110",
                                    toneClasses.dot
                                )}
                            >
                                <StatusIcon tone={tone} />
                            </div>

                            {/* Event content card */}
                            <div
                                className={cn(
                                    "rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50/50 dark:hover:border-slate-800 dark:hover:bg-slate-900/30",
                                    toneClasses.card
                                )}
                            >
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                                {getOrderStatusLabel(item.status)}
                                            </span>
                                            {isLast && (
                                                <Badge
                                                    variant={tone === "green" ? "default" : tone === "amber" ? "warning" : tone === "red" ? "danger" : "outline"}
                                                    className="h-4.5 px-1.5 py-0 text-[10px]"
                                                >
                                                    Current
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            {actorText}
                                        </div>
                                        {noteText && (
                                            <div className="text-xs bg-white border border-slate-100 rounded-lg p-2 mt-1.5 text-slate-600 dark:bg-slate-900 dark:border-slate-800/80 dark:text-slate-350 break-words max-w-full">
                                                {noteText}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 sm:text-right shrink-0 mt-0.5 font-medium">
                                        {item.occurred_at ? (
                                            <time dateTime={item.occurred_at}>
                                                {formatOrderStatusDateTime(item.occurred_at)}
                                            </time>
                                        ) : (
                                            "Time unavailable"
                                        )}
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </Card>
    );
}
