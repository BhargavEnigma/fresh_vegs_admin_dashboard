import { useEffect, useMemo, useState } from "react";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { useMutation, useQuery } from "@tanstack/react-query";

import { OpsJobsService } from "../../../api/services/ops-jobs.service";

import { PageHeader } from "../../../components/common/page-header";
import { DataTable } from "../../../components/common/data-table";
import { StatusBadge } from "../../../components/common/status-badge";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/toast/toast-context";
import { PremiumSelect } from "../../../components/ui/premium-select";

// ---- helpers ----
function getApiErrorMessage(e) {
    return (
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        "Something went wrong"
    );
}

// Build YYYY-MM-DD in Asia/Kolkata without relying on browser locale.
function formatIstDateYyyyMmDd(date = new Date()) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return fmt.format(date); // en-CA gives YYYY-MM-DD
}

function addDaysYyyyMmDd(yyyyMmDd, days) {
    // yyyyMmDd: "2026-02-06"
    const [y, m, d] = yyyyMmDd.split("-").map((v) => parseInt(v, 10));
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
    // return in IST date format
    return formatIstDateYyyyMmDd(dt);
}

// Parse "m h * * *" -> "HH:MM" (only for daily cron)
function cronToTime(cronExpr) {
    if (!cronExpr) return null;
    const parts = String(cronExpr).trim().split(/\s+/);
    if (parts.length !== 5) return null;

    const [minStr, hourStr, dom, mon, dow] = parts;

    // only support daily pattern for this UI
    if (dom !== "*" || mon !== "*" || dow !== "*") return null;

    const m = parseInt(minStr, 10);
    const h = parseInt(hourStr, 10);
    if (!Number.isFinite(m) || !Number.isFinite(h)) return null;
    if (m < 0 || m > 59 || h < 0 || h > 23) return null;

    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
}

// Convert "HH:MM" -> "m h * * *"
function timeToDailyCron(timeHHmm) {
    if (!timeHHmm) return "0 0 * * *";
    const [hhStr, mmStr] = String(timeHHmm).split(":");
    const h = parseInt(hhStr, 10);
    const m = parseInt(mmStr, 10);

    if (!Number.isFinite(h) || !Number.isFinite(m)) return "0 0 * * *";
    const hour = Math.min(23, Math.max(0, h));
    const min = Math.min(59, Math.max(0, m));

    // cron format: minute hour * * *
    return `${min} ${hour} * * *`;
}

function formatIstDateTime(isoString) {
    return formatIndianDateTime(isoString);
}

function safeJson(val) {
    try {
        return JSON.stringify(val, null, 2);
    } catch {
        return String(val);
    }
}

export function OpsJobsPage() {
    const toast = useToast();

    // -----------------------------
    // State
    // -----------------------------
    const [result, setResult] = useState(null);

    // cronExpr is what we send to server (e.g. "0 0 * * *")
    const [cronExpr, setCronExpr] = useState("0 0 * * *");

    // Friendly UI time (HH:MM)
    const [dailyTime, setDailyTime] = useState("00:00");

    // Advanced toggle (optional)
    const [advancedCron, setAdvancedCron] = useState(false);

    // Presets dropdown
    const [selectedPresetKey, setSelectedPresetKey] = useState("");

    const [daysAhead, setDaysAhead] = useState("0"); // keep as string for input
    const [enabled, setEnabled] = useState(true);

    const [runDate, setRunDate] = useState(formatIstDateYyyyMmDd(new Date())); // YYYY-MM-DD

    const daysAheadInt = useMemo(() => {
        const n = parseInt(String(daysAhead), 10);
        return Number.isFinite(n) ? n : 0;
    }, [daysAhead]);

    const derivedDeliveryDate = useMemo(() => {
        // For manual runs, default date = today IST + daysAhead
        const todayIst = formatIstDateYyyyMmDd(new Date());
        return addDaysYyyyMmDd(todayIst, daysAheadInt);
    }, [daysAheadInt]);

    // -----------------------------
    // Fetch current scheduler config
    // -----------------------------
    const scheduleQuery = useQuery({
        queryKey: ["ops", "lock-orders-schedule"],
        queryFn: () => OpsJobsService.getLockOrdersSchedule(),
    });

    const presetsQuery = useQuery({
        queryKey: ["ops", "lock-orders-schedule-presets"],
        queryFn: () => OpsJobsService.getLockOrdersSchedulePresets(),
    });

    const runsQuery = useQuery({
        queryKey: ["ops", "job-runs", "lock_orders"],
        queryFn: () =>
            OpsJobsService.listJobRuns({
                job_name: "lock_orders",
                limit: 200,
                offset: 0,
            }),
    });

    useEffect(() => {
        // support both envelopes: {success,data} or raw
        const schedule = scheduleQuery.data?.data || scheduleQuery.data;

        if (schedule) {
            const serverCron = schedule.cron_expr || "0 0 * * *";
            setCronExpr(serverCron);

            // Reset preset selection if server cron doesn't match any preset
            const presets = presetsQuery.data?.data?.presets || presetsQuery.data?.presets || [];
            const matched = presets.find((p) => p.cron_expr === serverCron);
            setSelectedPresetKey(matched?.key || "");

            // If it's a daily cron, derive time, else force advanced mode
            const t = cronToTime(serverCron);
            if (t) {
                setDailyTime(t);
                setAdvancedCron(false);
            } else {
                // cron is not a simple daily pattern; keep advanced visible
                setAdvancedCron(true);
            }

            setDaysAhead(String(schedule.days_ahead ?? 0));
            setEnabled(schedule.is_enabled ?? true);

            // also update runDate suggestion
            const todayIst = formatIstDateYyyyMmDd(new Date());
            const suggested = addDaysYyyyMmDd(todayIst, schedule.days_ahead ?? 0);
            setRunDate(suggested);
        }
    }, [scheduleQuery.data, presetsQuery.data]);

    // -----------------------------
    // Keep cronExpr synced from friendly time (when NOT advanced)
    // -----------------------------
    useEffect(() => {
        if (!advancedCron) {
            setCronExpr(timeToDailyCron(dailyTime));
        }
    }, [dailyTime, advancedCron]);

    // When preset changes, update cronExpr (and friendly time if possible)
    useEffect(() => {
        const presets = presetsQuery.data?.data?.presets || presetsQuery.data?.presets || [];
        const preset = presets.find((p) => p.key === selectedPresetKey);
        if (!preset) {
            return;
        }

        const expr = preset.cron_expr || "0 0 * * *";
        setCronExpr(expr);

        const t = cronToTime(expr);
        if (t) {
            setDailyTime(t);
            setAdvancedCron(false);
        } else {
            setAdvancedCron(true);
        }
    }, [selectedPresetKey, presetsQuery.data]);

    // -----------------------------
    // Manual Run (Run Now)
    // -----------------------------
    const lockMut = useMutation({
        mutationFn: async () => {
            // backend validates delivery_date, so we send it always
            return OpsJobsService.lockOrders({ delivery_date: runDate });
        },
        meta: {
            globalLoaderMessage: "Executing lock orders job...",
        },
        onSuccess: (data) => {
            setResult(data?.data || data);
            toast.success("Lock orders job executed");
            runsQuery.refetch();
        },
        onError: (e) => toast.error(getApiErrorMessage(e)),
    });

    // -----------------------------
    // Save & Apply Scheduler Config
    // -----------------------------
    const saveScheduleMut = useMutation({
        mutationFn: async () => {
            const payload = {
                cron_expr: cronExpr,
                timezone: "Asia/Kolkata",
                is_enabled: enabled,
                days_ahead: daysAheadInt,
            };
            return OpsJobsService.updateLockOrdersSchedule(payload);
        },
        meta: {
            globalLoaderMessage: "Saving schedule config...",
        },
        onSuccess: () => {
            toast.success("Scheduler updated & applied");
            scheduleQuery.refetch();
        },
        onError: (e) => toast.error(getApiErrorMessage(e)),
    });

    // Keep runDate in sync with daysAhead suggestion unless user changed it manually.
    useEffect(() => {
        setRunDate(derivedDeliveryDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [derivedDeliveryDate]);

    return (
        <div>
            <PageHeader
                title="Ops Jobs"
                subtitle="Run operational jobs and configure schedulers."
            />

            {/* ============================= */}
            {/* Scheduler Configuration */}
            {/* ============================= */}
            <Card className="mb-4 p-4">
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="font-medium">Lock Orders Scheduler</p>
                        <p className="text-sm text-slate-500">
                            Configure when orders should be locked automatically (daily).
                            <br />
                            <span className="text-xs">
                                Timezone: <span className="font-medium">Asia/Kolkata</span>
                            </span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {/* Presets dropdown */}
                        <div>
                            <div className="mb-1 text-xs text-slate-500">Cron Preset</div>
                            <PremiumSelect
                                value={selectedPresetKey}
                                onChange={(value) => setSelectedPresetKey(value || "")}
                                options={[
                                    { value: "", label: "Custom" },

                                    ...(
                                        presetsQuery.data?.data?.presets ||
                                        presetsQuery.data?.presets ||
                                        []
                                    ).map((preset) => ({
                                        value: preset.key,
                                        label: preset.label,
                                    })),
                                ]}
                                placeholder="Select preset"
                            />
                            <div className="mt-1 text-xs text-slate-500">
                                {presetsQuery.isLoading
                                    ? "Loading presets…"
                                    : selectedPresetKey
                                        ? (presetsQuery.data?.data?.presets || presetsQuery.data?.presets || []).find(
                                            (p) => p.key === selectedPresetKey
                                        )?.description || ""
                                        : "Choose a preset or use custom cron"}
                            </div>
                        </div>

                        {/* Friendly time picker */}
                        <div>
                            <div className="mb-1 text-xs text-slate-500">
                                Daily Time (IST)
                            </div>

                            <input
                                type="time"
                                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                value={dailyTime}
                                onChange={(e) => setDailyTime(e.target.value)}
                                disabled={advancedCron}
                            />

                            <div className="mt-1 text-xs text-slate-500">
                                Runs every day at{" "}
                                <span className="font-medium">{dailyTime}</span>
                                {" "}IST
                            </div>
                        </div>

                        <div>
                            <div className="mb-1 text-xs text-slate-500">Days Ahead</div>
                            <input
                                type="number"
                                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                value={daysAhead}
                                onChange={(e) => setDaysAhead(e.target.value)}
                                placeholder="0"
                                min="0"
                            />
                            <div className="mt-1 text-xs text-slate-500">
                                delivery_date = today(IST) + days_ahead
                            </div>
                        </div>
                    </div>

                    {/* Scheduler status + preview + pause info */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                            <div className="mb-1 text-xs text-slate-500">Scheduler Status</div>
                            <PremiumSelect
                                value={enabled ? "true" : "false"}
                                onChange={(value) => setEnabled(value === "true")}
                                options={[
                                    { value: "true", label: "Enabled" },
                                    { value: "false", label: "Disabled" },
                                ]}
                                placeholder="Select status"
                            />
                        </div>

                        <div>
                            <div className="mb-1 text-xs text-slate-500">Next Run (IST)</div>
                            <div className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm leading-10 dark:border-slate-800 dark:bg-slate-900/30">
                                {(() => {
                                    const schedule = scheduleQuery.data?.data || scheduleQuery.data;
                                    const nextRun = schedule?.next_run_at || null;
                                    if (!enabled) return "-";
                                    return nextRun ? formatIstDateTime(nextRun) : "-";
                                })()}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                Uses server cron preview (Asia/Kolkata)
                            </div>
                        </div>

                        <div>
                            <div className="mb-1 text-xs text-slate-500">Health</div>
                            {(() => {
                                const schedule = scheduleQuery.data?.data || scheduleQuery.data;
                                const pausedAt = schedule?.paused_at || null;
                                const pauseReason = schedule?.pause_reason || null;
                                const cf = schedule?.consecutive_failures ?? 0;
                                const mf = schedule?.max_consecutive_failures ?? 3;

                                const isPaused = !!pausedAt && !(schedule?.is_enabled ?? true);
                                return (
                                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-800 dark:bg-slate-900/30">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs text-slate-500">Consecutive failures</div>
                                            <div className="font-medium">
                                                {cf}/{mf}
                                            </div>
                                        </div>
                                        {isPaused ? (
                                            <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                                Paused: {pauseReason || "Paused by failure policy"}
                                                <div className="text-[11px] text-slate-500">
                                                    {pausedAt ? `Paused at: ${formatIstDateTime(pausedAt)}` : ""}
                                                </div>
                                            </div>
                                        ) : null}
                                        {schedule?.last_error_message ? (
                                            <div className="mt-1 text-[11px] text-slate-500">
                                                Last error: {String(schedule.last_error_message).slice(0, 140)}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Show cron that will be sent to server */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/30">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <div className="text-xs text-slate-500">Cron (sent to server)</div>
                                <div className="font-mono text-sm">{cronExpr}</div>
                            </div>

                            <button
                                type="button"
                                className="text-xs text-slate-600 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                onClick={() => setAdvancedCron((v) => !v)}
                            >
                                {advancedCron ? "Hide Advanced" : "Advanced"}
                            </button>
                        </div>

                        {advancedCron ? (
                            <div className="mt-3">
                                <div className="mb-1 text-xs text-slate-500">
                                    Advanced Cron Expression (daily/weekly/custom)
                                </div>
                                <input
                                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-mono dark:border-slate-800 dark:bg-slate-950"
                                    value={cronExpr}
                                    onChange={(e) => setCronExpr(e.target.value)}
                                    placeholder="0 0 * * *"
                                    spellCheck={false}
                                />
                                <div className="mt-1 text-xs text-slate-500">
                                    Tip: For daily at 12:00 AM → <span className="font-mono">0 0 * * *</span>
                                </div>
                            </div>
                        ) : null}

                        {/* Server-side validation (from API) */}
                        {(() => {
                            const schedule = scheduleQuery.data?.data || scheduleQuery.data;
                            const ok = schedule?.validation?.ok;
                            const err = schedule?.validation?.error;
                            if (ok === false) {
                                return (
                                    <div className="mt-2 text-xs text-red-600 dark:text-red-300">
                                        Server says cron is invalid: {err || "Invalid cron"}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => saveScheduleMut.mutate()}
                            disabled={saveScheduleMut.isPending || scheduleQuery.isLoading}
                        >
                            {saveScheduleMut.isPending ? "Saving..." : "Save Schedule"}
                        </Button>

                        {scheduleQuery.isLoading ? (
                            <span className="text-sm text-slate-500">
                                Loading current schedule…
                            </span>
                        ) : null}
                    </div>
                </div>
            </Card>

            {/* ============================= */}
            {/* Manual Job Execution */}
            {/* ============================= */}
            <Card className="p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="font-medium">Lock Orders (Manual)</p>
                            <p className="text-sm text-slate-500">
                                Immediately locks eligible orders for a specific delivery date.
                            </p>
                        </div>
                        <Button onClick={() => lockMut.mutate()} disabled={lockMut.isPending}>
                            {lockMut.isPending ? "Running..." : "Run Now"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                            <div className="mb-1 text-xs text-slate-500">
                                Delivery Date (YYYY-MM-DD)
                            </div>
                            <input
                                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                value={runDate}
                                onChange={(e) => setRunDate(e.target.value)}
                                placeholder="2026-02-06"
                                spellCheck={false}
                            />
                            <div className="mt-1 text-xs text-slate-500">
                                Suggested:{" "}
                                <span className="font-medium">{derivedDeliveryDate}</span>
                            </div>
                        </div>
                    </div>

                    {result ? (
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/30">
                            <p className="font-medium">Result</p>
                            <pre className="mt-2 overflow-auto text-xs">
                                {safeJson(result)}
                            </pre>
                        </div>
                    ) : null}
                </div>
            </Card>

            {/* ============================= */}
            {/* Job Runs History */}
            {/* ============================= */}
            <div className="mt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="font-medium">Job Runs History</p>
                        <p className="text-sm text-slate-500">Latest lock_orders executions</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => runsQuery.refetch()}
                        disabled={runsQuery.isFetching}
                    >
                        {runsQuery.isFetching ? "Refreshing..." : "Refresh"}
                    </Button>
                </div>

                <DataTable
                    searchPlaceholder="Search runs…"
                    initialPageSize={10}
                    data={runsQuery.data?.items || []}
                    columns={[
                        {
                            accessorKey: "started_at",
                            header: "Started (IST)",
                            cell: ({ row }) => formatIstDateTime(row.original.started_at),
                        },
                        {
                            accessorKey: "run_key",
                            header: "Run Key",
                            cell: ({ row }) => row.original.run_key,
                        },
                        {
                            accessorKey: "status",
                            header: "Status",
                            cell: ({ row }) => <StatusBadge value={row.original.status} />,
                        },
                        {
                            accessorKey: "trigger_source",
                            header: "Trigger",
                            cell: ({ row }) => row.original.trigger_source || "-",
                        },
                        {
                            id: "locked",
                            header: "Locked",
                            cell: ({ row }) => row.original?.meta?.locked_count ?? "-",
                        },
                        {
                            id: "candidates",
                            header: "Candidates",
                            cell: ({ row }) => row.original?.meta?.total_candidates ?? "-",
                        },
                        {
                            accessorKey: "error_message",
                            header: "Error",
                            cell: ({ row }) =>
                                row.original.error_message
                                    ? String(row.original.error_message).slice(0, 80)
                                    : "-",
                        },
                    ]}
                />

                {runsQuery.isLoading ? (
                    <div className="mt-2 text-sm text-slate-500">Loading history…</div>
                ) : null}
            </div>
        </div>
    );
}