import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    IndianRupee,
    LockKeyhole,
    PackageCheck,
    RefreshCw,
    Settings2,
    ShoppingBasket,
    Truck,
} from "lucide-react";

import { AdminDashboardService } from "../../api/services/admin-dashboard.service";
import { OpsOrdersService } from "../../api/services/ops-orders.service";
import { OpsReportsService } from "../../api/services/ops-reports.service";
import { OpsJobsService } from "../../api/services/ops-jobs.service";

import { PageHeader } from "../../components/common/page-header";
import { StatusBadge } from "../../components/common/status-badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { useToast } from "../../components/toast/toast-context";
import { useAuth } from "../../auth/auth-context";
import { cn } from "../../lib/utils";

function formatCurrencyFromPaise(paise) {
    const value = Number(paise || 0) / 100;
    return value.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    });
}

function formatCount(value) {
    return Number(value || 0).toLocaleString("en-IN");
}

function todayIstYyyyMmDd(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;

    return `${y}-${m}-${d}`;
}

function addDaysYyyyMmDd(yyyyMmDd, days) {
    const [y, m, d] = String(yyyyMmDd).split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + Number(days || 0));

    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");

    return `${yy}-${mm}-${dd}`;
}

function formatDateLabel(value) {
    if (!value) return "—";

    const [y, m, d] = String(value).split("-").map(Number);
    if (!y || !m || !d) return value;

    const dt = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(dt);
}

function formatDateTimeIst(value) {
    if (!value) return "—";

    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "—";

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(dt);
}

function getApiErrorMessage(error) {
    return (
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong"
    );
}

function getExceptionOrders(orders) {
    return (orders || []).filter((order) => {
        const paymentStatus = String(order?.payment_status || "").toLowerCase();
        const refundStatus = String(order?.refund_status || "").toLowerCase();
        const status = String(order?.status || "").toLowerCase();

        if (paymentStatus === "verification_pending") return true;
        if (paymentStatus === "failed") return true;
        if (paymentStatus === "refund_failed") return true;
        if (refundStatus === "failed") return true;
        if (status === "cancelled" && paymentStatus === "paid") return true;
        if (status === "payment_pending") return true;

        return false;
    });
}

function QueueCard({ title, value, subtitle, icon: Icon, tone = "slate" }) {
    const toneClass = {
        green: "border-dailyveg-200 bg-dailyveg-50 text-dailyveg-700 dark:border-dailyveg-800 dark:bg-dailyveg-950/50 dark:text-dailyveg-300",
        amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
        blue: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
        rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
        slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
    }[tone];

    return (
        <Card className="min-w-0 overflow-hidden border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-950">
            <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-start justify-between gap-3">
                    <CardDescription className="line-clamp-2 text-xs font-medium sm:text-sm">{title}</CardDescription>
                    {Icon ? (
                        <div className={cn("rounded-xl border p-2", toneClass)}>
                            <Icon className="h-4 w-4" />
                        </div>
                    ) : null}
                </div>
                <CardTitle className="text-2xl sm:text-3xl">{formatCount(value)}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function StatCard({ title, value, subtitle, icon: Icon, tone = "slate" }) {
    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <CardDescription className="text-xs font-medium">{title}</CardDescription>
                    {Icon ? (
                        <div
                            className={cn(
                                "rounded-xl border p-2",
                                tone === "green" &&
                                "border-dailyveg-200 bg-dailyveg-50 text-dailyveg-700 dark:border-dailyveg-800 dark:bg-dailyveg-950/50 dark:text-dailyveg-300",
                                tone === "amber" &&
                                "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
                                tone === "rose" &&
                                "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
                                tone === "slate" &&
                                "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                        </div>
                    ) : null}
                </div>
                <CardTitle className="break-words text-xl sm:text-2xl">{value}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function QuickLinkCard({ title, subtitle, to, buttonLabel, icon: Icon }) {
    return (
        <Card className="transition hover:-translate-y-0.5 hover:border-dailyveg-200 hover:shadow-md hover:shadow-dailyveg-900/5 dark:hover:border-dailyveg-800">
            <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                    {Icon ? (
                        <div className="rounded-xl border border-dailyveg-200 bg-dailyveg-50 p-2 text-dailyveg-700 dark:border-dailyveg-800 dark:bg-dailyveg-950/50 dark:text-dailyveg-300">
                            <Icon className="h-4 w-4" />
                        </div>
                    ) : null}
                    <div className="min-w-0">
                        <CardTitle className="text-base leading-5">{title}</CardTitle>
                        <CardDescription className="mt-1">{subtitle}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button className="w-full justify-between sm:w-auto" variant="outline" asChild>
                    <Link to={to}>
                        {buttonLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function SimpleEmptyState({ title, subtitle }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm dark:border-slate-800 dark:bg-slate-900/30">
            <div className="font-medium text-slate-700 dark:text-slate-200">{title}</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
    );
}

function GuidanceCard({ title, subtitle, icon: Icon, children }) {
    return (
        <Card className="overflow-hidden border-dailyveg-200/80 bg-gradient-to-br from-white to-dailyveg-50/70 dark:border-dailyveg-900/80 dark:from-slate-950 dark:to-dailyveg-950/30">
            <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-dailyveg-200 bg-white p-2 text-dailyveg-700 shadow-sm dark:border-dailyveg-800 dark:bg-slate-950 dark:text-dailyveg-300">
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-base leading-5">{title}</CardTitle>
                        <CardDescription className="mt-1">{subtitle}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export function DashboardPage() {
    const toast = useToast();
    const { roles } = useAuth();
    const isAdmin = roles.includes("admin");

    const [selectedDate, setSelectedDate] = useState(todayIstYyyyMmDd());

    const kpisQuery = useQuery({
        queryKey: ["adminDashboardKpis", selectedDate],
        queryFn: () =>
            AdminDashboardService.getKpis({
                start_date: selectedDate,
                end_date: selectedDate,
            }),
        staleTime: 15 * 1000,
    });

    const procurementQuery = useQuery({
        queryKey: ["dashboardProcurement", selectedDate],
        queryFn: () => OpsReportsService.procurement({ delivery_date: selectedDate }),
        enabled: !!selectedDate,
        staleTime: 15 * 1000,
    });

    const ordersQuery = useQuery({
        queryKey: ["dashboardOpsOrders", selectedDate],
        queryFn: () =>
            OpsOrdersService.list({
                page: 1,
                limit: 100,
                delivery_date: selectedDate,
            }),
        enabled: !!selectedDate,
        staleTime: 15 * 1000,
    });

    const scheduleQuery = useQuery({
        queryKey: ["dashboardLockOrdersSchedule"],
        queryFn: () => OpsJobsService.getLockOrdersSchedule(),
        enabled: isAdmin,
        staleTime: 15 * 1000,
    });

    const runsQuery = useQuery({
        queryKey: ["dashboardJobRunsLockOrders"],
        queryFn: () =>
            OpsJobsService.listJobRuns({
                job_name: "lock_orders",
                limit: 10,
                offset: 0,
            }),
        enabled: isAdmin,
        staleTime: 15 * 1000,
    });

    const lockOrdersMut = useMutation({
        mutationFn: () => OpsJobsService.lockOrders({ delivery_date: selectedDate }),
        onSuccess: () => {
            toast.success("Lock orders job completed");
            ordersQuery.refetch();
            procurementQuery.refetch();
            kpisQuery.refetch();
            if (isAdmin) {
                runsQuery.refetch();
            }
        },
        onError: (error) => {
            toast.error("Failed to lock orders", getApiErrorMessage(error));
        },
    });

    const kpis = kpisQuery.data || null;

    const procurementItems = procurementQuery.data?.items || [];
    const orders = ordersQuery.data?.orders || [];
    const exceptionOrders = useMemo(() => getExceptionOrders(orders), [orders]);

    const schedule = isAdmin ? scheduleQuery.data?.data || scheduleQuery.data || null : null;
    const jobRuns = isAdmin
        ? runsQuery.data?.rows ||
        runsQuery.data?.job_runs ||
        runsQuery.data?.items ||
        runsQuery.data?.data?.rows ||
        []
        : [];

    const totalProcurementQty = useMemo(() => {
        return procurementItems.reduce((sum, item) => sum + Number(item?.total_quantity || 0), 0);
    }, [procurementItems]);

    const orderStatusMap = kpis?.orders_by_status || {};
    const latestOrders = orders.slice(0, 8);
    const latestProcurementItems = procurementItems.slice(0, 8);

    const hasAnyError =
        kpisQuery.isError ||
        procurementQuery.isError ||
        ordersQuery.isError ||
        (isAdmin && scheduleQuery.isError) ||
        (isAdmin && runsQuery.isError);

    const actions = (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => {
                    kpisQuery.refetch();
                    procurementQuery.refetch();
                    ordersQuery.refetch();
                    if (isAdmin) {
                        scheduleQuery.refetch();
                        runsQuery.refetch();
                    }
                }}
                disabled={
                    kpisQuery.isFetching ||
                    procurementQuery.isFetching ||
                    ordersQuery.isFetching ||
                    (isAdmin && scheduleQuery.isFetching) ||
                    (isAdmin && runsQuery.isFetching)
                }
            >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
            </Button>

            {isAdmin ? (
                <Button
                    className="w-full sm:w-auto"
                    onClick={() => lockOrdersMut.mutate()}
                    disabled={lockOrdersMut.isPending || !selectedDate}
                >
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    {lockOrdersMut.isPending ? "Locking..." : "Lock Orders"}
                </Button>
            ) : null}
        </div>
    );

    return (
        <div className="min-w-0 space-y-4 sm:space-y-6">
            <PageHeader
                title="Today at a Glance"
                subtitle={`Simple overview for ${formatDateLabel(selectedDate)}. Start with anything marked attention, then continue with orders and procurement.`}
                actions={actions}
            />

            {hasAnyError ? (
                <div className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <div className="font-semibold">Some information could not load.</div>
                        <p className="mt-1 text-xs">Please refresh once. If it still fails, check the backend response.</p>
                    </div>
                </div>
            ) : null}

            <Card className="overflow-hidden border-dailyveg-200/80 bg-gradient-to-br from-white via-white to-dailyveg-50/80 dark:border-dailyveg-900/80 dark:from-slate-950 dark:via-slate-950 dark:to-dailyveg-950/30">
                <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(220px,280px)_1fr] sm:items-end sm:p-5">
                    <div className="grid gap-1.5">
                        <Label htmlFor="dashboard-date" className="flex items-center gap-2 text-sm font-semibold">
                            <CalendarDays className="h-4 w-4 text-dailyveg-600 dark:text-dailyveg-300" />
                            Delivery Date
                        </Label>
                        <DatePicker
                            selected={selectedDate ? new Date(selectedDate) : null}
                            onChange={(date) =>
                                setSelectedDate(date ? todayIstYyyyMmDd(date) : null)
                            }
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Select date"
                            id="dashboard-date"
                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dailyveg-500/35 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400"
                            isClearable
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            All numbers below are for <span className="font-semibold text-slate-900 dark:text-slate-50">{formatDateLabel(selectedDate)}</span>.
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                            <Button variant="outline" onClick={() => setSelectedDate(todayIstYyyyMmDd())} className="w-full sm:w-auto">
                                Today
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setSelectedDate(addDaysYyyyMmDd(todayIstYyyyMmDd(), 1))}
                                className="w-full sm:w-auto"
                            >
                                Tomorrow
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setSelectedDate(addDaysYyyyMmDd(todayIstYyyyMmDd(), -1))}
                                className="w-full sm:w-auto"
                            >
                                Yesterday
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
                <GuidanceCard
                    title={exceptionOrders.length ? "Needs Attention" : "Everything Looks Clear"}
                    subtitle={
                        exceptionOrders.length
                            ? "Review these before packing or delivery starts."
                            : "No payment or cancelled-paid issues found for this date."
                    }
                    icon={exceptionOrders.length ? AlertTriangle : CheckCircle2}
                >
                    <div className="space-y-3">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <div className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                                    {formatCount(exceptionOrders.length)}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">orders need manual checking</p>
                            </div>
                            <Button variant={exceptionOrders.length ? "default" : "outline"} asChild>
                                <Link to={`/ops/orders?delivery_date=${selectedDate}`}>
                                    Open Orders
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <p className="rounded-2xl border border-white/80 bg-white/70 p-3 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                            Check failed payments, pending verification, refunds, and cancelled orders that were already paid.
                        </p>
                    </div>
                </GuidanceCard>

                <GuidanceCard
                    title="Orders to Handle"
                    subtitle="Use this to understand today's workload."
                    icon={ClipboardList}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/75 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                            <div className="text-2xl font-bold">{formatCount(kpis?.orders_for_delivery)}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">total orders</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/75 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                            <div className="text-2xl font-bold">{formatCount(kpis?.packing_queue)}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">ready for packing</div>
                        </div>
                    </div>
                </GuidanceCard>

                <GuidanceCard
                    title="Procurement Work"
                    subtitle="What buying or packing teams need to prepare."
                    icon={ShoppingBasket}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/75 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                            <div className="text-2xl font-bold">{formatCount(procurementItems.length)}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">items</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/75 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                            <div className="text-2xl font-bold">{formatCount(totalProcurementQty)}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">total quantity</div>
                        </div>
                    </div>
                </GuidanceCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Order Progress</CardTitle>
                        <CardDescription>Plain view of where today's orders currently stand.</CardDescription>
                    </CardHeader>

                    <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                        <QueueCard
                            title="Total Delivery Orders"
                            value={kpis?.orders_for_delivery}
                            subtitle="All orders planned for this delivery date."
                            icon={Truck}
                            tone="blue"
                        />
                        <QueueCard
                            title="Ready for Packing"
                            value={kpis?.packing_queue}
                            subtitle="Orders that can move through packing."
                            icon={PackageCheck}
                            tone="green"
                        />
                        <QueueCard
                            title="Payment Issues"
                            value={kpis?.payment_pending}
                            subtitle="Payments pending, failed, or waiting for check."
                            icon={AlertTriangle}
                            tone="amber"
                        />
                        <QueueCard
                            title="Locked"
                            value={orderStatusMap.locked}
                            subtitle="Orders frozen for the delivery workflow."
                            icon={LockKeyhole}
                            tone="slate"
                        />
                        <QueueCard
                            title="Accepted"
                            value={orderStatusMap.accepted}
                            subtitle="Accepted by operations or warehouse."
                            icon={CheckCircle2}
                            tone="green"
                        />
                        <QueueCard
                            title="Packed"
                            value={orderStatusMap.packed}
                            subtitle="Packed and ready for the next step."
                            icon={PackageCheck}
                            tone="blue"
                        />
                    </CardContent>
                </Card>

                {isAdmin ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Lock Control</CardTitle>
                            <CardDescription>Admin-only controls for closing orders for the day.</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Delivery Date</span>
                                <span className="font-medium">{formatDateLabel(selectedDate)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Auto Lock</span>
                                <StatusBadge value={schedule?.is_enabled ? "active" : "inactive"} />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Timezone</span>
                                <span className="font-medium">{schedule?.timezone || "Asia/Kolkata"}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Schedule Rule</span>
                                <span className="font-medium">{schedule?.cron_expr || "—"}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Days Ahead</span>
                                <span className="font-medium">{schedule?.days_ahead ?? "—"}</span>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Last Lock Run
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className="text-slate-500 dark:text-slate-400">Status</span>
                                    <StatusBadge value={jobRuns?.[0]?.status || "—"} />
                                </div>
                                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    {jobRuns?.[0]?.started_at
                                        ? `Started: ${formatDateTimeIst(jobRuns[0].started_at)}`
                                        : "No recent run found"}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                                <Button variant="outline" asChild>
                                    <Link to="/ops/jobs">Job History</Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link to={`/ops/orders?delivery_date=${selectedDate}`}>Open Orders</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>What You Can Open</CardTitle>
                            <CardDescription>Quick paths for daily warehouse work.</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Delivery Date</span>
                                <span className="font-medium">{formatDateLabel(selectedDate)}</span>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                    <Settings2 className="h-3.5 w-3.5" />
                                    Access
                                </div>
                                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Order locking and job history are available only for admin users.
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                                <Button variant="outline" asChild>
                                    <Link to={`/ops/orders?delivery_date=${selectedDate}`}>Open Orders</Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link to={`/ops/procurement?delivery_date=${selectedDate}`}>Open Procurement</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4">
                <StatCard
                    title="Today's Paid Sales"
                    value={formatCurrencyFromPaise(kpis?.revenue_paid_paise)}
                    subtitle="Money collected for this delivery date."
                    icon={IndianRupee}
                    tone="green"
                />
                <StatCard
                    title="All Delivered Sales"
                    value={formatCurrencyFromPaise(kpis?.total_delivered_revenue_paid_paise)}
                    subtitle="Lifetime paid revenue from delivered orders."
                    icon={IndianRupee}
                    tone="slate"
                />
                <StatCard
                    title="Procurement Items"
                    value={formatCount(procurementItems.length)}
                    subtitle="Unique product rows to prepare."
                    icon={ShoppingBasket}
                    tone="green"
                />
                <StatCard
                    title="Total Quantity"
                    value={formatCount(totalProcurementQty)}
                    subtitle="Combined quantity across procurement."
                    icon={PackageCheck}
                    tone="slate"
                />
                <StatCard
                    title="Attention Orders"
                    value={formatCount(exceptionOrders.length)}
                    subtitle="Orders that need a human review."
                    icon={AlertTriangle}
                    tone={exceptionOrders.length ? "rose" : "green"}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
                <Card className="h-auto overflow-hidden xl:col-span-2 xl:h-[520px]">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>Latest orders for the selected delivery date.</CardDescription>
                    </CardHeader>

                    <CardContent className="max-h-[420px] overflow-y-auto pr-1 sm:pr-2 thin-scrollbar xl:h-[410px]">
                        {ordersQuery.isLoading ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400">Loading orders...</div>
                        ) : latestOrders.length === 0 ? (
                            <SimpleEmptyState title="No orders yet" subtitle="Nothing is scheduled for this delivery date." />
                        ) : (
                            <div className="space-y-3">
                                {latestOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/60 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-medium">{order.order_number || order.id}</div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                {order.user?.full_name || "Customer"} • {order.user?.phone || "—"}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                Payment: {order.payment_method || "—"} / {order.payment_status || "—"}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge value={order.status || "—"} />
                                            <StatusBadge value={order.is_locked ? "locked" : "unlocked"} />
                                            <Button variant="outline" size="sm" asChild>
                                                <Link to={`/ops/orders/${order.id}`}>View</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="h-auto overflow-hidden xl:h-[520px]">
                    <CardHeader>
                        <CardTitle>Top Procurement Items</CardTitle>
                        <CardDescription>Items the team should prepare first.</CardDescription>
                    </CardHeader>

                    <CardContent className="max-h-[420px] overflow-y-auto pr-1 sm:pr-2 thin-scrollbar xl:h-[410px]">
                        {procurementQuery.isLoading ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400">Loading procurement...</div>
                        ) : latestProcurementItems.length === 0 ? (
                            <SimpleEmptyState title="No procurement items" subtitle="There are no locked items to prepare for this date." />
                        ) : (
                            <div className="space-y-3">
                                {latestProcurementItems.map((item, index) => (
                                    <div
                                        key={item.product_pack_id || item.product_id || index}
                                        className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <div className="font-medium">
                                                {item.product_name || "Unknown Product"}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {item.pack_name || item.pack_label || "—"}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-sm">
                                            Qty: <span className="font-semibold">{formatCount(item.total_quantity)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Orders Needing Attention</CardTitle>
                        <CardDescription>Review these before the day moves forward.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        {exceptionOrders.length === 0 ? (
                            <SimpleEmptyState title="No attention orders" subtitle="No payment or refund issues found for this date." />
                        ) : (
                            <div className="space-y-3">
                                {exceptionOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/20 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div>
                                            <div className="font-medium">{order.order_number || order.id}</div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                Status: {order.status || "—"} • Payment: {order.payment_status || "—"}
                                            </div>
                                        </div>

                                        <Button variant="outline" size="sm" asChild>
                                            <Link to={`/ops/orders/${order.id}`}>Review</Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    <QuickLinkCard
                        title="Orders Queue"
                        subtitle="Open the full list to check customers, payments, and order status."
                        to={`/ops/orders?delivery_date=${selectedDate}`}
                        buttonLabel="Open Orders"
                        icon={ClipboardList}
                    />

                    <QuickLinkCard
                        title="Procurement Summary"
                        subtitle="Open the item-wise quantity list for buying and packing."
                        to={`/ops/procurement?delivery_date=${selectedDate}`}
                        buttonLabel="Open Procurement"
                        icon={ShoppingBasket}
                    />
                </div>
            </div>
        </div>
    );
}
