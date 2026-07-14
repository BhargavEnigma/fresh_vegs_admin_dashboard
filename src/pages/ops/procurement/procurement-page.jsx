import { useEffect, useMemo, useState } from "react";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import {
    AlertTriangle,
    CalendarCheck,
    CheckCircle2,
    ClipboardList,
    PackageCheck,
    Printer,
    RefreshCw,
    ShoppingBasket,
} from "lucide-react";

import { OpsReportsService } from "../../../api/services/ops-reports.service";
import { OpsOrdersService } from "../../../api/services/ops-orders.service";

import { PageHeader } from "../../../components/common/page-header";
import { DataTable } from "../../../components/common/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
// import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function toYyyyMmDd(date) {
    if (!date) return "";

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
}

function parseYyyyMmDd(value) {
    if (!value) return null;

    const [yyyy, mm, dd] = String(value).split("-").map(Number);
    if (!yyyy || !mm || !dd) return null;

    return new Date(yyyy, mm - 1, dd);
}

function formatCount(value) {
    return Number(value || 0).toLocaleString("en-IN");
}

function formatMoneyPaise(value) {
    return `₹${(Number(value || 0) / 100).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
    })}`;
}

function formatDateLabel(value) {
    return formatIndianDateTime(value);
}

function addDays(dateString, days) {
    const [y, m, d] = String(dateString).split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + Number(days || 0));

    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");

    return `${yy}-${mm}-${dd}`;
}

function SummaryStat({ title, value, subtitle, icon: Icon, tone = "default" }) {
    return (
        <Card
            className={cn(
                "overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950",
                tone === "success" && "border-dailyveg-200 bg-dailyveg-50/50 dark:border-dailyveg-900 dark:bg-dailyveg-950/20",
                tone === "warning" && "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
            )}
        >
            <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardDescription className="text-xs sm:text-sm">{title}</CardDescription>
                        <CardTitle className="mt-1 break-words text-2xl sm:text-3xl">{value}</CardTitle>
                    </div>
                    {Icon ? (
                        <div className="rounded-2xl bg-white/80 p-2 text-dailyveg-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950/80 dark:text-dailyveg-300 dark:ring-slate-800">
                            <Icon className="h-5 w-5" />
                        </div>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function ReadinessBanner({ procurementState, summary, date, totalQty }) {
    const formattedDate = formatDateLabel(date);
    
    // Status counts
    const ignoredOrders = Number(summary.ignored_orders || 0);
    const deliveredOrders = Number(summary.delivered_orders || 0);
    const actionableOrders = Number(summary.actionable_procurement_orders || 0);

    let title = "";
    let desc = "";
    let iconColor = "bg-amber-500 text-white";
    let Icon = AlertTriangle;
    let cardClass = "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25";

    if (procurementState === "completed") {
        title = "Procurement completed";
        desc = `All orders for ${formattedDate} have completed fulfilment. No products need to be purchased or prepared again.`;
        iconColor = "bg-dailyveg-500 text-white";
        Icon = CheckCircle2;
        cardClass = "border-dailyveg-200 bg-dailyveg-50 dark:border-dailyveg-900 dark:bg-dailyveg-950/25";
    } else if (procurementState === "no_orders") {
        title = "No orders for this delivery date";
        desc = "There are no customer orders requiring procurement for the selected date.";
        iconColor = "bg-slate-400 text-white";
        Icon = CalendarCheck;
        cardClass = "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/25";
    } else if (procurementState === "draft") {
        title = "Procurement list is still a draft";
        desc = "Orders may still change. Finalize purchasing only after eligible orders are locked.";
        iconColor = "bg-amber-500 text-white";
        Icon = AlertTriangle;
        cardClass = "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25";
    } else if (procurementState === "ready") {
        title = "Ready to prepare purchase list";
        desc = "Eligible orders are locked and the purchase list can be finalized.";
        iconColor = "bg-dailyveg-500 text-white";
        Icon = CheckCircle2;
        cardClass = "border-dailyveg-200 bg-dailyveg-50 dark:border-dailyveg-900 dark:bg-dailyveg-950/25";
    } else if (procurementState === "in_progress") {
        title = "Fulfilment is in progress";
        desc = "Some orders have already moved to packing or delivery. Only the remaining actionable quantities are shown below.";
        iconColor = "bg-blue-500 text-white";
        Icon = PackageCheck;
        cardClass = "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/25";
    } else if (procurementState === "exceptions") {
        title = "Operational exceptions need review";
        desc = "No normal purchase is required, but one or more failed or unresolved orders need manual review.";
        iconColor = "bg-rose-500 text-white";
        Icon = AlertTriangle;
        cardClass = "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/25";
    }

    return (
        <Card className={cn("overflow-hidden border shadow-sm", cardClass)}>
            <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-3">
                        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", iconColor)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-base font-semibold text-slate-950 dark:text-slate-50">
                                {title}
                            </div>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {desc}
                            </p>
                        </div>
                    </div>

                    {procurementState === "completed" ? (
                        <div className="flex flex-wrap gap-4 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                            <div>
                                <div className="text-xs font-medium uppercase text-slate-500">Delivered Orders</div>
                                <div className="mt-1 font-semibold text-slate-950 dark:text-slate-50">{formatCount(deliveredOrders)}</div>
                            </div>
                            <div className="w-[1px] bg-slate-200 dark:bg-slate-800 my-1"></div>
                            <div>
                                <div className="text-xs font-medium uppercase text-slate-500">Completed</div>
                                <div className="mt-1 font-semibold text-slate-950 dark:text-slate-50">{formatCount(deliveredOrders)}</div>
                            </div>
                            <div className="w-[1px] bg-slate-200 dark:bg-slate-800 my-1"></div>
                            <div>
                                <div className="text-xs font-medium uppercase text-slate-500">Remaining Actionable</div>
                                <div className="mt-1 font-semibold text-slate-950 dark:text-slate-50">{formatCount(actionableOrders)}</div>
                            </div>
                            <div className="w-[1px] bg-slate-200 dark:bg-slate-800 my-1"></div>
                            <div>
                                <div className="text-xs font-medium uppercase text-slate-500">Actionable Packs</div>
                                <div className="mt-1 font-semibold text-slate-950 dark:text-slate-50">{formatCount(totalQty)}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                            <div className="text-xs font-medium uppercase text-slate-500">Needs attention</div>
                            <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">
                                {formatCount(ignoredOrders)} ignored {ignoredOrders === 1 ? 'order' : 'orders'}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function MiniBreakdown({ title, items }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
                {items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                            {item.label}
                        </span>
                        <span className="font-semibold">{item.value}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function FarmPurchaseList({ rows, date, procurementState }) {
    const purchaseText = useMemo(() => {
        if (!rows.length) return "";

        return rows
            .map((item) => {
                const product = item?.product_name || "Unknown Product";
                const pack = item?.pack_label || "No Pack";
                const qty = formatCount(item?.total_quantity);

                return `${product} - ${pack} - ${qty} packs`;
            })
            .join("\n");
    }, [rows]);

    async function handleCopy() {
        if (!purchaseText) return;

        await navigator.clipboard.writeText(
            `Daily Purchase List - ${formatDateLabel(date)}\n\n${purchaseText}`
        );
    }

    const isDisabled = !rows.length || procurementState === "completed" || procurementState === "no_orders" || procurementState === "exceptions";

    return (
        <Card className="mb-6 overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Daily Purchase List</CardTitle>
                        <CardDescription>
                            Simple list for farm, market, or warehouse preparation for {formatDateLabel(date)}.
                        </CardDescription>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Button
                            variant="outline"
                            onClick={handleCopy}
                            disabled={isDisabled}
                            className="w-full sm:w-auto"
                        >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Copy List
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                            disabled={isDisabled}
                            className="w-full sm:w-auto"
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {procurementState === "completed" && "Nothing needs to be purchased for this date. All applicable orders have completed fulfilment."}
                        {procurementState === "no_orders" && "No purchase list is available because no orders exist for this delivery date."}
                        {procurementState === "exceptions" && "No products were automatically added. Review operational exceptions before taking further action."}
                        {procurementState !== "completed" && procurementState !== "no_orders" && procurementState !== "exceptions" && "No items need to be prepared for the selected date."}
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 md:hidden">
                            {rows.map((item, index) => (
                                <div
                                    key={`${item.product_id}-${item.product_pack_id}-${index}`}
                                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                                >
                                    <div className="font-semibold">{item.product_name || "—"}</div>
                                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {item.pack_label || "—"}
                                    </div>
                                    <div className="mt-3 text-lg font-bold">
                                        Prepare {formatCount(item.total_quantity)} packs
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
                            <div className="grid grid-cols-[1fr_130px_120px] bg-slate-50 px-4 py-3 text-sm font-semibold dark:bg-slate-900/40">
                                <div>Product to prepare</div>
                                <div>Pack size</div>
                                <div className="text-right">Need</div>
                            </div>

                            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                {rows.map((item, index) => (
                                    <div
                                        key={`${item.product_id}-${item.product_pack_id}-${index}`}
                                        className="grid grid-cols-[1fr_130px_120px] px-4 py-3 text-sm"
                                    >
                                        <div className="font-medium">{item.product_name || "—"}</div>
                                        <div className="text-slate-600 dark:text-slate-400">
                                            {item.pack_label || "—"}
                                        </div>
                                        <div className="text-right font-semibold">
                                            {formatCount(item.total_quantity)} packs
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function RequirementCard({ item, index }) {
    return (
        <div
            key={`${item.product_id}-${item.product_pack_id}-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-dailyveg-300 hover:shadow-lg hover:shadow-dailyveg-900/10 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-dailyveg-800"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="line-clamp-2 font-semibold text-slate-950 dark:text-slate-50">
                        {item.product_name || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Pack: {item.pack_label || "No pack"}
                    </div>
                </div>

                <div className="shrink-0 rounded-full bg-dailyveg-50 px-3 py-1 text-sm font-semibold text-dailyveg-700 dark:bg-dailyveg-950/60 dark:text-dailyveg-300">
                    {formatCount(item.total_quantity)} packs
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-xs text-slate-500">Customer Orders</div>
                    <div className="mt-1 font-semibold">
                        {formatCount(item.order_count)}
                    </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-xs text-slate-500">Sales Value</div>
                    <div className="mt-1 font-semibold">
                        {formatMoneyPaise(item.total_sales_paise)}
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800">
                Prepare this quantity before packing starts.
            </div>
        </div>
    );
}

function ProcurementMobileList({ rows }) {
    if (!rows.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                No items need to be prepared.
            </div>
        );
    }

    return (
        <div className="grid gap-3 lg:hidden">
            {rows.map((item, index) => (
                <RequirementCard
                    key={`${item.product_id}-${item.product_pack_id}-${index}`}
                    item={item}
                    index={index}
                />
            ))}
        </div>
    );
}

export function ProcurementPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [date, setDate] = useState(searchParams.get("delivery_date") || todayISO());

    useEffect(() => {
        const qpDate = searchParams.get("delivery_date");
        if (qpDate && qpDate !== date) {
            setDate(qpDate);
        }
    }, [searchParams, date]);

    const procurementQuery = useQuery({
        queryKey: ["procurement", date],
        queryFn: () => OpsReportsService.procurement({ delivery_date: date }),
        enabled: !!date,
    });

    const rows = procurementQuery.data?.items || [];
    const backendSummary = procurementQuery.data?.summary || {};
    const backendStatusBreakdown = procurementQuery.data?.status_breakdown || [];

    const totalQty = useMemo(() => {
        return rows.reduce((sum, row) => sum + Number(row?.total_quantity || 0), 0);
    }, [rows]);

    const uniqueProducts = useMemo(() => {
        const set = new Set(rows.map((row) => row?.product_id).filter(Boolean));
        return set.size;
    }, [rows]);

    const topItems = useMemo(() => {
        return [...rows]
            .sort((a, b) => Number(b?.total_quantity || 0) - Number(a?.total_quantity || 0))
            .slice(0, 8);
    }, [rows]);

    const orderSummary = useMemo(() => {
        return {
            totalOrders: Number(backendSummary.total_orders || 0),
            validProcurementOrders: Number(backendSummary.valid_procurement_orders || 0),
            ignoredOrders: Number(backendSummary.ignored_orders || 0),
            codOrders: Number(backendSummary.cod_orders || 0),
            paidOnlineOrders: Number(backendSummary.paid_online_orders || 0),
            paymentPendingOrders: Number(backendSummary.payment_pending_orders || 0),
            cancelledOrders: Number(backendSummary.cancelled_orders || 0),
            unassignedDeliveryOrders: Number(backendSummary.unassigned_delivery_orders || 0),
            validOrderValuePaise: Number(backendSummary.valid_order_value_paise || 0),
            isFullyLocked: Boolean(backendSummary.is_fully_locked),
        };
    }, [backendSummary]);

    const statusBreakdown = useMemo(() => {
        return backendStatusBreakdown.map((item) => ({
            label: item.label,
            value: formatCount(item.value),
        }));
    }, [backendStatusBreakdown]);

    const paymentBreakdown = useMemo(() => {
        return [
            {
                label: "COD",
                value: formatCount(orderSummary.codOrders),
            },
            {
                label: "Paid Online",
                value: formatCount(orderSummary.paidOnlineOrders),
            },
            {
                label: "Payment Pending",
                value: formatCount(orderSummary.paymentPendingOrders),
            },
            {
                label: "Cancelled / Refunded",
                value: formatCount(orderSummary.cancelledOrders),
            },
        ];
    }, [orderSummary]);

    const fallbackDerivedState = useMemo(() => {
        if (procurementQuery.isLoading) return "loading";
        if (procurementQuery.isError) return "error";

        const totalOrders = Number(backendSummary.total_orders || 0);
        if (totalOrders === 0) {
            return "no_orders";
        }

        const unlockedOrders = Number(backendSummary.unlocked_orders || 0);
        const paymentPending = Number(backendSummary.payment_pending_orders || 0);
        const cancelled = Number(backendSummary.cancelled_orders || 0);

        if (paymentPending + cancelled === totalOrders) {
            return "exceptions";
        }

        if (unlockedOrders > 0) {
            return "draft";
        }

        const validProcurementOrders = Number(backendSummary.valid_procurement_orders || 0);
        const itemsCount = rows.length;

        if (validProcurementOrders > 0 && itemsCount === 0) {
            const statusCounts = {};
            (backendStatusBreakdown || []).forEach((item) => {
                statusCounts[item.label] = Number(item.value || 0);
            });

            const activeFulfilment = (statusCounts["packed"] || 0) + (statusCounts["out_for_delivery"] || 0);
            const completed = statusCounts["delivered"] || 0;
            const failed = statusCounts["delivery_failed"] || 0;

            if (activeFulfilment > 0) {
                return "in_progress";
            } else if (completed > 0 && failed === 0) {
                return "completed";
            } else if (failed > 0) {
                return "exceptions";
            } else {
                return "completed";
            }
        }

        if (itemsCount > 0) {
            const statusCounts = {};
            (backendStatusBreakdown || []).forEach((item) => {
                statusCounts[item.label] = Number(item.value || 0);
            });
            const progressed =
                (statusCounts["packed"] || 0) +
                (statusCounts["out_for_delivery"] || 0) +
                (statusCounts["delivered"] || 0) +
                (statusCounts["delivery_failed"] || 0);

            if (progressed > 0) {
                return "in_progress";
            } else {
                return "ready";
            }
        }

        return "no_orders";
    }, [procurementQuery.isLoading, procurementQuery.isError, backendSummary, rows, backendStatusBreakdown]);

    const procurementState = backendSummary.procurement_state || fallbackDerivedState;

    const columns = useMemo(
        () => [
            {
                accessorKey: "product_name",
                header: "Product to Prepare",
            },
            {
                accessorKey: "pack_label",
                header: "Pack Size",
                cell: ({ row }) => row.original?.pack_label || "—",
            },
            {
                accessorKey: "total_quantity",
                header: "Need to Prepare",
                cell: ({ row }) => formatCount(row.original?.total_quantity),
            },
            {
                accessorKey: "order_count",
                header: "Customer Orders",
                cell: ({ row }) => formatCount(row.original?.order_count),
            },
            {
                accessorKey: "total_sales_paise",
                header: "Order Value",
                cell: ({ row }) => formatMoneyPaise(row.original?.total_sales_paise),
            },
        ],
        []
    );

    const actions = (
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button
                variant="outline"
                onClick={() => {
                    procurementQuery.refetch();
                }}
                disabled={procurementQuery.isFetching}
            >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
            </Button>

            <Button variant="outline" asChild>
                <Link to={`/ops/orders?delivery_date=${date}`}>View Orders</Link>
            </Button>
        </div>
    );

    const isCompletedState = procurementState === "completed";

    return (
        <div className="min-w-0 space-y-4 sm:space-y-6">
            <PageHeader
                title="Daily Procurement"
                subtitle="Simple preparation list: what products to buy, collect, or prepare for the selected delivery date."
                actions={actions}
            />

            <Card className="mb-6 overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarCheck className="h-4 w-4 text-dailyveg-600 dark:text-dailyveg-300" />
                        Select Delivery Date
                    </CardTitle>
                    <CardDescription>
                        Choose the day you want to prepare products for.
                    </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="procurement-date">Delivery Date</Label>
                        <DatePicker
                            selected={parseYyyyMmDd(date)}
                            onChange={(selectedDate) => {
                                const nextDate = selectedDate ? toYyyyMmDd(selectedDate) : "";
                                setDate(nextDate);

                                if (nextDate) {
                                    setSearchParams({ delivery_date: nextDate });
                                } else {
                                    setSearchParams({});
                                }
                            }}
                            dateFormat="dd-MM-yyyy"
                            id="procurement-date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            isClearable
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                        <Button
                            variant="outline"
                            onClick={() => setSearchParams({ delivery_date: date })}
                        >
                            Apply
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                const today = todayISO();
                                setDate(today);
                                setSearchParams({ delivery_date: today });
                            }}
                        >
                            Today
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                const tomorrow = addDays(todayISO(), 1);
                                setDate(tomorrow);
                                setSearchParams({ delivery_date: tomorrow });
                            }}
                        >
                            Tomorrow
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {procurementQuery.isLoading ? (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                    <RefreshCw className="h-8 w-8 animate-spin text-dailyveg-600" />
                    <p className="text-sm text-slate-500">Loading procurement details...</p>
                </div>
            ) : procurementQuery.isError ? (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
                    <AlertTriangle className="h-8 w-8 text-rose-500" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Failed to load procurement details</h3>
                    <p className="text-sm text-slate-500 max-w-md">
                        {procurementQuery.error?.response?.data?.error?.message || procurementQuery.error?.message || "An error occurred while fetching the procurement data."}
                    </p>
                    <Button variant="outline" onClick={() => procurementQuery.refetch()} className="mt-2 bg-white">
                        <RefreshCw className="mr-2 h-4 w-4" /> Retry
                    </Button>
                </div>
            ) : (
                <>
                    <ReadinessBanner
                        procurementState={procurementState}
                        summary={backendSummary}
                        date={date}
                        totalQty={isCompletedState ? 0 : totalQty}
                    />

                    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <SummaryStat
                            title="Items Still to Procure"
                            value={formatCount(isCompletedState ? 0 : rows.length)}
                            subtitle="Product-pack lines remaining to prepare."
                            icon={ShoppingBasket}
                        />

                        <SummaryStat
                            title="Different Products Remaining"
                            value={formatCount(isCompletedState ? 0 : uniqueProducts)}
                            subtitle="Unique products remaining."
                            icon={PackageCheck}
                        />

                        <SummaryStat
                            title="Total Packs Remaining"
                            value={formatCount(isCompletedState ? 0 : totalQty)}
                            subtitle="Packs remaining to prepare."
                            icon={ClipboardList}
                        />

                        <SummaryStat
                            title="Actionable Orders"
                            value={formatCount(isCompletedState ? 0 : (backendSummary.actionable_procurement_orders || 0))}
                            subtitle="Locked/accepted orders requiring procurement."
                            icon={CheckCircle2}
                            tone={procurementState === "ready" || procurementState === "in_progress" ? "success" : "default"}
                        />
                    </div>

                    <div className="mb-6 grid gap-4 lg:grid-cols-4">
                        <SummaryStat
                            title="Delivered Orders"
                            value={formatCount(backendSummary.delivered_orders || 0)}
                            subtitle="Successfully completed orders."
                            icon={CheckCircle2}
                            tone={isCompletedState ? "success" : "default"}
                        />

                        <SummaryStat
                            title="Packed Orders"
                            value={formatCount(backendSummary.packed_orders || 0)}
                            subtitle="Orders ready at warehouse."
                        />

                        <SummaryStat
                            title="Out for Delivery"
                            value={formatCount(backendSummary.out_for_delivery_orders || 0)}
                            subtitle="Orders in transit to customers."
                        />

                        <SummaryStat
                            title="Exceptions"
                            value={formatCount((backendSummary.delivery_failed_orders || 0) + (backendSummary.payment_pending_orders || 0))}
                            subtitle="Failed deliveries or pending payments."
                            icon={AlertTriangle}
                            tone={((backendSummary.delivery_failed_orders || 0) + (backendSummary.payment_pending_orders || 0)) > 0 ? "warning" : "default"}
                        />
                    </div>

                    {Number(backendSummary.delivered_orders || 0) > 0 ? (
                        <Card className="mb-6 overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold">Completed Fulfilment Summary</CardTitle>
                                <CardDescription>
                                    Historical summary of successfully completed orders for this date.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                                        <div className="text-xs text-slate-500 uppercase font-medium">Delivered Orders</div>
                                        <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                                            {formatCount(backendSummary.delivered_orders)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                                        <div className="text-xs text-slate-500 uppercase font-medium">Delivered Packs</div>
                                        <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                                            {formatCount(backendSummary.delivered_packs)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                                        <div className="text-xs text-slate-500 uppercase font-medium">Total Delivered Order Value</div>
                                        <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                                            {formatMoneyPaise(backendSummary.delivered_order_value_paise)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    <div className="mb-6 grid gap-4 lg:grid-cols-2">
                        <MiniBreakdown title="Payment Summary" items={paymentBreakdown} />

                        <MiniBreakdown
                            title="Order Status Summary"
                            items={
                                statusBreakdown.length > 0
                                    ? statusBreakdown
                                    : [{ label: "No orders", value: "0" }]
                            }
                        />
                    </div>

                    <FarmPurchaseList rows={rows} date={date} procurementState={procurementState} />

                    <div className="mb-6 grid gap-4 xl:grid-cols-3">
                        <Card className="overflow-hidden xl:col-span-2 xl:h-[600px] xl:overflow-y-auto thin-scrollbar">
                            <CardHeader>
                                <CardTitle>Product Preparation Checklist</CardTitle>
                                <CardDescription>
                                    Buy or prepare these quantities for {formatDateLabel(date)}.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                {rows.length === 0 ? (
                                    procurementState === "completed" ? (
                                        <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                            <CheckCircle2 className="h-10 w-10 text-dailyveg-500 mb-3" />
                                            <div className="text-base font-semibold">Preparation complete</div>
                                            <p className="text-sm text-slate-500 max-w-sm mt-1">
                                                All required products for this delivery date have already moved through fulfilment. Do not purchase them again.
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                <Button variant="outline" asChild size="sm">
                                                    <Link to={`/ops/orders?delivery_date=${date}&queue=delivered`}>
                                                        View Completed Orders
                                                    </Link>
                                                </Button>
                                                <Button variant="outline" asChild size="sm">
                                                    <Link to={`/ops/orders?delivery_date=${date}&queue=exceptions`}>
                                                        Review Failed Deliveries
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : procurementState === "no_orders" ? (
                                        <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                            <CalendarCheck className="h-10 w-10 text-slate-400 mb-3" />
                                            <div className="text-base font-semibold">No orders</div>
                                            <p className="text-sm text-slate-500 max-w-sm mt-1">
                                                There are no customer orders requiring procurement for the selected date.
                                            </p>
                                        </div>
                                    ) : procurementState === "exceptions" ? (
                                        <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                            <AlertTriangle className="h-10 w-10 text-rose-500 mb-3" />
                                            <div className="text-base font-semibold">Exceptions require review</div>
                                            <p className="text-sm text-slate-500 max-w-sm mt-1">
                                                Operational exceptions require attention. Check orders with failed delivery or pending payment.
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                <Button variant="outline" asChild size="sm">
                                                    <Link to={`/ops/orders?delivery_date=${date}&queue=exceptions`}>
                                                        Review Failed Deliveries
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                                            No items need to be prepared.
                                        </div>
                                    )
                                ) : (
                                    <>
                                        <ProcurementMobileList rows={rows} />

                                        <div className="hidden lg:block">
                                            <DataTable
                                                columns={columns}
                                                data={rows}
                                                searchPlaceholder="Search product to prepare…"
                                                initialPageSize={20}
                                            />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden xl:h-[600px] xl:overflow-y-auto thin-scrollbar">
                            <CardHeader>
                                <CardTitle>Highest Quantity Items</CardTitle>
                                <CardDescription>
                                    Start with these products first when buying or preparing.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                {topItems.length === 0 ? (
                                    <div className="text-sm text-slate-500">
                                        {procurementState === "completed" && "All required items have already completed fulfilment."}
                                        {procurementState === "no_orders" && "No ordered items exist for this date."}
                                        {procurementState === "exceptions" && "No standard procurement items remain. Review exceptions."}
                                        {procurementState !== "completed" && procurementState !== "no_orders" && procurementState !== "exceptions" && "No items need preparation."}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {topItems.map((item, index) => (
                                            <div
                                                key={`${item.product_id}-${item.product_pack_id}-${index}`}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                                            >
                                                <div className="min-w-0">
                                                    <div className="font-medium">{item.product_name || "—"}</div>
                                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {item.pack_label || "No pack label"}
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-lg font-semibold">
                                                        {formatCount(item.total_quantity)}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatCount(item.total_quantity) > 1 ? "Packs" : "Pack"}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                    <Button variant="outline" asChild size="sm" className="w-full justify-start text-xs sm:w-auto">
                                        <Link to={`/ops/orders?delivery_date=${date}`}>View Orders</Link>
                                    </Button>

                                    <Button variant="outline" asChild size="sm" className="w-full justify-start text-xs sm:w-auto">
                                        <Link to={`/ops/orders?delivery_date=${date}&queue=delivered`}>View Delivered Orders</Link>
                                    </Button>

                                    <Button variant="outline" asChild size="sm" className="w-full justify-start text-xs sm:w-auto">
                                        <Link to={`/ops/orders?delivery_date=${date}&queue=exceptions`}>Review Failed Deliveries</Link>
                                    </Button>

                                    <Button variant="outline" asChild size="sm" className="w-full justify-start text-xs sm:w-auto">
                                        <Link to={`/ops/orders?delivery_date=${date}&queue=to_pack`}>View Remaining Orders</Link>
                                    </Button>

                                    <Button variant="outline" asChild size="sm" className="w-full justify-start text-xs sm:w-auto">
                                        <Link to="/ops/jobs">Lock Jobs</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
