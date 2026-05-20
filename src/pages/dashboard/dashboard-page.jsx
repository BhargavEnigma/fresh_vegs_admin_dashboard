import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { AdminDashboardService } from "../../api/services/admin-dashboard.service";
import { OpsOrdersService } from "../../api/services/ops-orders.service";
import { OpsReportsService } from "../../api/services/ops-reports.service";
import { OpsJobsService } from "../../api/services/ops-jobs.service";

import { PageHeader } from "../../components/common/page-header";
import { StatusBadge } from "../../components/common/status-badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useToast } from "../../components/toast/toast-context";
import { useAuth } from "../../auth/auth-context";

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

function QueueCard({ title, value, subtitle }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-3xl">{formatCount(value)}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function QuickLinkCard({ title, subtitle, to, buttonLabel }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <Button variant="outline" asChild>
                    <Link to={to}>{buttonLabel}</Link>
                </Button>
            </CardContent>
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
    console.log("kpis : ", kpis);

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
        <>
            <Button
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
                Refresh
            </Button>

            {isAdmin ? (
                <Button
                    onClick={() => lockOrdersMut.mutate()}
                    disabled={lockOrdersMut.isPending || !selectedDate}
                >
                    {lockOrdersMut.isPending ? "Locking..." : "Run Lock Orders"}
                </Button>
            ) : null}
        </>
    );

    return (
        <div>
            <PageHeader
                title="Operations Dashboard"
                subtitle="Cutoff, lock, procurement, queue, and exception view for the selected operational date."
                actions={actions}
            />

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">Operational Date Control</CardTitle>
                    <CardDescription>
                        Select the delivery / operations date you want to monitor.
                    </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4 md:grid-cols-[220px_auto] md:items-end">
                    <div className="grid gap-1.5">
                        <Label htmlFor="dashboard-date">Selected Date</Label>
                        <Input
                            id="dashboard-date"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setSelectedDate(todayIstYyyyMmDd())}>
                            Today
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setSelectedDate(addDaysYyyyMmDd(todayIstYyyyMmDd(), 1))}
                        >
                            Tomorrow
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setSelectedDate(addDaysYyyyMmDd(todayIstYyyyMmDd(), -1))}
                        >
                            Yesterday
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {hasAnyError ? (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    One or more dashboard sections failed to load. Check backend response and try refresh.
                </div>
            ) : null}

            <div className="mb-6 grid gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Daily Ops Summary</CardTitle>
                        <CardDescription>Main counters for {formatDateLabel(selectedDate)}.</CardDescription>
                    </CardHeader>

                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <QueueCard
                            title="Orders For Delivery or Delivered"
                            value={kpis?.orders_for_delivery}
                            subtitle="Orders scheduled on selected date."
                        />
                        <QueueCard
                            title="Packing Queue"
                            value={kpis?.packing_queue}
                            subtitle="Locked / accepted / packed orders."
                        />
                        <QueueCard
                            title="Payment Pending"
                            value={kpis?.payment_pending}
                            subtitle="Online payment issues or pending verification."
                        />
                        <QueueCard
                            title="Locked"
                            value={orderStatusMap.locked}
                            subtitle="Ready and locked for operational flow."
                        />
                        <QueueCard
                            title="Accepted"
                            value={orderStatusMap.accepted}
                            subtitle="Acknowledged by ops / warehouse."
                        />
                        <QueueCard
                            title="Packed"
                            value={orderStatusMap.packed}
                            subtitle="Ready for dispatch or next stage."
                        />
                    </CardContent>
                </Card>

                {isAdmin ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Cutoff / Scheduler</CardTitle>
                            <CardDescription>Main lock-orders control summary.</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Selected Date</span>
                                <span className="font-medium">{formatDateLabel(selectedDate)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Scheduler</span>
                                <StatusBadge value={schedule?.is_enabled ? "active" : "inactive"} />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Timezone</span>
                                <span className="font-medium">{schedule?.timezone || "Asia/Kolkata"}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Cron</span>
                                <span className="font-medium">{schedule?.cron_expr || "—"}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Days Ahead</span>
                                <span className="font-medium">{schedule?.days_ahead ?? "—"}</span>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Latest Run
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
                                    <Link to="/ops/jobs">Open Jobs</Link>
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
                            <CardTitle>Operational Shortcuts</CardTitle>
                            <CardDescription>
                                Quick actions available to warehouse operations.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 dark:text-slate-400">Selected Date</span>
                                <span className="font-medium">{formatDateLabel(selectedDate)}</span>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Access Scope
                                </div>
                                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Scheduler, manual lock, and job history are admin-only.
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

            <div className="mb-6 grid gap-4 lg:grid-cols-5">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Revenue (Paid)</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCurrencyFromPaise(kpis?.revenue_paid_paise)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Paid order value for selected delivery date.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Revenue</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCurrencyFromPaise(kpis?.total_delivered_revenue_paid_paise)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            All-time revenue from paid and delivered orders.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Procurement SKUs</CardDescription>
                        <CardTitle className="text-2xl">{formatCount(procurementItems.length)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Distinct product-pack rows for procurement.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Procurement Qty</CardDescription>
                        <CardTitle className="text-2xl">{formatCount(totalProcurementQty)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Total summed quantity from locked operational orders.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Exceptions</CardDescription>
                        <CardTitle className="text-2xl">{formatCount(exceptionOrders.length)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Orders needing manual attention.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="mb-6 grid gap-4 xl:grid-cols-3 xl:items-start">
                <Card className="xl:col-span-2 h-[520px] overflow-hidden">
                    <CardHeader>
                        <CardTitle>Latest Orders For Selected Date</CardTitle>
                        <CardDescription>Quick operational queue preview.</CardDescription>
                    </CardHeader>

                    <CardContent className="h-[410px] overflow-y-auto pr-2 thin-scrollbar">
                        {ordersQuery.isLoading ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400">Loading orders...</div>
                        ) : latestOrders.length === 0 ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                No orders found for this date.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {latestOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between"
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

                <Card className="h-[520px] overflow-hidden">
                    <CardHeader>
                        <CardTitle>Latest Procurement Rows</CardTitle>
                        <CardDescription>Top procurement lines for the selected date.</CardDescription>
                    </CardHeader>

                    <CardContent className="h-[410px] overflow-y-auto pr-2 thin-scrollbar">
                        {procurementQuery.isLoading ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400">Loading procurement...</div>
                        ) : latestProcurementItems.length === 0 ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                No procurement items found for this date.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {latestProcurementItems.map((item, index) => (
                                    <div
                                        key={item.product_pack_id || item.product_id || index}
                                        className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                                    >
                                        <div className="font-medium">
                                            {item.product_name || "Unknown Product"}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {item.pack_name || item.pack_label || "—"}
                                        </div>
                                        <div className="mt-2 text-sm">
                                            Qty: <span className="font-semibold">{formatCount(item.total_quantity)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="mb-6 grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Exception Orders</CardTitle>
                        <CardDescription>Orders that may need manual operational review.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        {exceptionOrders.length === 0 ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                No exception orders found.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {exceptionOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between"
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
                        subtitle="Inspect the day-wise operational order queue."
                        to={`/ops/orders?delivery_date=${selectedDate}`}
                        buttonLabel="Open Orders"
                    />

                    <QuickLinkCard
                        title="Procurement Summary"
                        subtitle="Check farm / packing quantity summary for selected date."
                        to={`/ops/procurement?delivery_date=${selectedDate}`}
                        buttonLabel="Open Procurement"
                    />
                </div>
            </div>
        </div>
    );
}