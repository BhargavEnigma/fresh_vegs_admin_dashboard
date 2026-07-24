import { useEffect, useMemo, useState } from "react";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { getIstYyyyMmDd, addDaysYyyyMmDd } from "../../../utils/date.util";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO, isValid, addDays } from "date-fns";
import DatePicker from "react-datepicker";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Eye, LayoutGrid, Table2, Truck, UserPlus, AlertTriangle, Check, CheckCircle2, Clock, Package, Box, CalendarDays, Search, Warehouse, SlidersHorizontal, FileDown, LockKeyhole, ArrowRight, ClipboardList, UsersRound, Hash, Copy, MapPin, IndianRupee, Phone, CreditCard, ExternalLink, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

import "react-datepicker/dist/react-datepicker.css";

import { useAuth } from "../../../auth/auth-context";
import { OpsOrdersService } from "../../../api/services/ops-orders.service";
import { OpsJobsService } from "../../../api/services/ops-jobs.service";
import { opsOrdersFilterSchema } from "../../../validations/ops-orders";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { StatusBadge } from "../../../components/common/status-badge";
import { useToast } from "../../../components/toast/toast-context";
import { useGlobalLoader } from "../../../components/common/global-loader-context";

import { OpsOrdersListPdf } from "./ops-orders-list-pdf";
import { exportOrdersCsv } from "./ops-orders-export";
import { downloadBlob } from "../../../utils/download";
import { PremiumSelect } from "../../../components/ui/premium-select";
import { RiResetLeftFill } from "react-icons/ri";
import { cn } from "../../../lib/utils";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../utils/order-identifier";


const VIEW_MODES = {
    table: "table",
    grid: "grid",
};
const OPS_ORDERS_VIEW_MODE_KEY = "freshveg_admin_ops_orders_view_mode";

function getSavedViewMode(storageKey) {
    if (typeof window === "undefined") return VIEW_MODES.table;
    const saved = window.localStorage.getItem(storageKey);
    return Object.values(VIEW_MODES).includes(saved) ? saved : VIEW_MODES.table;
}

function money(paise) {
    const n = Number(paise || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "INR" });
}

function toYyyyMmDd(date) {
    return format(date, "yyyy-MM-dd");
}

// Date helper functions todayDate and tomorrowDate are replaced by central imports

function parseDateValue(value) {
    if (!value) return null;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
}

function queueToStatusFilter(queueKey) {
    switch (queueKey) {
        case "before_lock":
            return "placed";
        case "packed":
            return "packed";
        case "out_for_delivery":
            return "out_for_delivery";
        case "delivered":
            return "delivered";
        case "locked":
        case "to_pack":
        case "exceptions":
        case "assigned":
        case "unassigned":
        case "all":
        default:
            return "";
    }
}

function queueToAssignedFilter(queueKey) {
    if (queueKey === "assigned") return true;
    if (queueKey === "unassigned") return false;
    return undefined;
}

function isExceptionOrder(order) {
    const paymentStatus = String(order?.payment_status || "").toLowerCase();
    const paymentMethod = String(order?.payment_method || "").toLowerCase();
    const status = String(order?.status || "").toLowerCase();
    const refundStatus = String(order?.refund_status || "").toLowerCase();

    const isOnlinePayment = paymentMethod && paymentMethod !== "cod";

    return (
        (isOnlinePayment && paymentStatus === "pending") ||
        paymentStatus === "failed" ||
        paymentStatus === "verification_pending" ||
        paymentStatus === "refund_failed" ||
        refundStatus === "refund_failed" ||
        (status === "cancelled" && paymentStatus === "paid") ||
        status === "delivery_failed" ||
        (status === "delivered" && paymentStatus !== "paid")
    );
}

function getQueueBadgeProps(q) {
    switch (q) {
        case "all":
            return {
                text: "All orders for this date",
                className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-800",
                icon: LayoutGrid,
            };
        case "before_lock":
            return {
                text: "Draft Stage: showing placed/confirmed orders that are not yet locked",
                className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50",
                icon: Clock,
            };
        case "locked":
            return {
                text: "Locked Stage: finalized procurement demand",
                className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50",
                icon: CheckCircle2,
            };
        case "to_pack":
            return {
                text: "To Pack: ready for warehouse packing and prep",
                className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/50",
                icon: Package,
            };
        case "packed":
            return {
                text: "Packed Stage: boxes ready at the warehouse loading dock",
                className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/50",
                icon: Box,
            };
        case "out_for_delivery":
            return {
                text: "In Transit: orders currently dispatched with riders",
                className: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-300 dark:border-cyan-900/50",
                icon: Truck,
            };
        case "delivered":
            return {
                text: "Delivered: completed orders successfully received by customers",
                className: "bg-dailyveg-50 text-dailyveg-700 border-dailyveg-200 dark:bg-dailyveg-950/20 dark:text-dailyveg-300 dark:border-dailyveg-900/50",
                icon: CheckCircle2,
            };
        case "exceptions":
            return {
                text: "Exceptions: unresolved payment errors, unpaid delivered orders, or failed deliveries",
                className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/25 dark:text-rose-300 dark:border-rose-900/50",
                icon: AlertTriangle,
            };
        default:
            return {
                text: "",
                className: "",
                icon: null,
            };
    }
}

function matchesQueue(order, queueKey) {
    const status = String(order?.status || "").toLowerCase();
    const isLocked = !!order?.is_locked;

    switch (queueKey) {
        case "all":
            return true;

        case "before_lock":
            return status === "placed" && !isLocked;

        case "locked":
            return status === "locked" || (status === "placed" && isLocked);

        case "to_pack":
            return status === "locked" || status === "accepted" || (status === "placed" && isLocked);

        case "packed":
            return status === "packed";

        case "out_for_delivery":
            return status === "out_for_delivery";

        case "delivered":
            return status === "delivered";

        case "exceptions":
            return isExceptionOrder(order);

        case "assigned":
            return !!order?.delivery_partner_user_id;

        case "unassigned":
            return !order?.delivery_partner_user_id;

        default:
            return true;
    }
}

function getNextActions(order) {
    const status = String(order?.status || "").toLowerCase();
    const isLocked = !!order?.is_locked;
    const isDeliveryAssigned = !!order?.delivery_partner_user_id;

    if (status === "locked" || (status === "placed" && isLocked)) {
        return [{ key: "accepted", label: "Accept" }];
    }

    if (status === "accepted") {
        return [{ key: "packed", label: "Mark Packed" }];
    }

    if (status === "packed") {
        return [{ key: "out_for_delivery", label: "Out for Delivery" }];
    }

    if (status === "out_for_delivery") {
        return [{ key: "delivered", label: "Mark Delivered" }];
    }

    return [];
}

function getOrderItemsCount(order) {
    if (typeof order?.item_count === "number") return order.item_count;
    if (typeof order?.items_count === "number") return order.items_count;
    if (typeof order?.total_items === "number") return order.total_items;
    if (Array.isArray(order?.items)) return order.items.length;
    return "—";
}

function getOrderArea(order) {
    return (
        order?.delivery_area ||
        order?.address?.area ||
        order?.delivery_city ||
        order?.address?.city ||
        order?.area ||
        "—"
    );
}

function getOrderTotal(order) {
    return order?.grand_total_paise ?? order?.total_paise ?? 0;
}

function getCustomerName(order) {
    return order?.user?.full_name || order?.delivery_name || "—";
}

function getCustomerPhone(order) {
    return order?.user?.phone || order?.delivery_phone || "—";
}

function getDeliveryPartnerName(order) {
    return order?.delivery_partner?.full_name || "—";
}

function getDeliveryPartnerPhone(order) {
    return order?.delivery_partner?.phone || "";
}

function canAssignDeliveryPartner(order) {
    const status = String(order?.status || "").toLowerCase();
    return !["delivered", "cancelled", "refunded"].includes(status);
}

function canUnassignDeliveryPartner(order) {
    const status = String(order?.status || "").toLowerCase();
    return !!order?.delivery_partner_user_id && !["out_for_delivery", "delivered"].includes(status);
}

const ALLOWED_TRANSITIONS = {
    payment_pending: ["placed", "cancelled"],
    placed: ["locked", "accepted", "cancelled"],
    confirmed: ["locked", "accepted", "cancelled"],
    locked: ["accepted", "cancelled"],
    accepted: ["packed", "cancelled"],
    packed: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
    refunded: [],
};

function canMoveOrderToStatus(order, toStatus) {
    const status = String(order?.status || "").toLowerCase();
    return ALLOWED_TRANSITIONS[status]?.includes(toStatus) || false;
}

function Filters({ value, onApply, deliveryPartners }) {
    const form = useForm({
        resolver: zodResolver(opsOrdersFilterSchema),
        defaultValues: {
            ...value,
            delivery_date: value.delivery_date ? parseDateValue(value.delivery_date) : null,
            delivery_partner_user_id: value.delivery_partner_user_id || "",
        },
    });

    useEffect(() => {
        form.reset({
            ...value,
            delivery_date: value.delivery_date ? parseDateValue(value.delivery_date) : null,
            delivery_partner_user_id: value.delivery_partner_user_id || "",
        });
    }, [value, form]);

    const submit = (v) => {
        onApply({
            warehouse_id: v.warehouse_id ?? "",
            delivery_partner_user_id: v.delivery_partner_user_id ?? "",
            q: (v.q ?? "").trim(),
            limit: v.limit ?? value.limit ?? 20,
            delivery_date: v.delivery_date ? toYyyyMmDd(v.delivery_date) : "",
        });
    };

    return (
        <form
            onSubmit={form.handleSubmit(submit)}
            className="grid gap-4 overflow-visible rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 dark:border-slate-800/80 dark:bg-slate-950 dark:shadow-brand-dark sm:p-5"
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-900">
                <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-dailyveg-50 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300"><SlidersHorizontal className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Refine orders</h3><p className="text-xs text-slate-500">Narrow the operations queue</p></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="grid min-w-0 gap-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Search</Label>
                    <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-10 pl-9" placeholder="Search operational code, daily no., order no. or phone" {...form.register("q")} /></div>
                </div>

                <div className="grid min-w-0 gap-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Warehouse ID</Label>
                    <div className="relative"><Warehouse className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-10 pl-9" placeholder="Warehouse UUID" {...form.register("warehouse_id")} /></div>
                </div>

                <div className="grid min-w-0 gap-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Delivery Date</Label>
                    <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" /><DatePicker
                        selected={form.watch("delivery_date")}
                        onChange={(date) => form.setValue("delivery_date", date, { shouldValidate: true })}
                        dateFormat="dd-MM-yyyy"
                        placeholderText="Select delivery date"
                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm ring-offset-white placeholder:text-slate-400 focus-visible:border-dailyveg-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dailyveg-500/25 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-dailyveg-950"
                        isClearable
                    /></div>
                </div>

                <div className="grid min-w-0 gap-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Page Size</Label>
                    <Input className="h-10" type="number" min={10} max={100} {...form.register("limit", { valueAsNumber: true })} />
                </div>

                <div className="grid min-w-0 gap-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Delivery Partner</Label>
                    <Controller
                        control={form.control}
                        name="delivery_partner_user_id"
                        render={({ field }) => (
                            <PremiumSelect
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="All partners"
                                isClearable
                                options={deliveryPartners.map((partner) => ({
                                    value: partner.id,
                                    label: `${partner.full_name || partner.phone || partner.id}${partner.phone ? ` (${partner.phone})` : ""
                                        }`,
                                }))}
                            />
                        )}
                    />
                </div>
            </div>
            <div className="flex items-end justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-900">
                <Button className="gap-2" type="submit"><SlidersHorizontal className="h-4 w-4" />Apply Filters</Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        form.reset({
                            warehouse_id: "",
                            delivery_partner_user_id: "",
                            q: "",
                            limit: 20,
                            delivery_date: null,
                        });

                        onApply({
                            warehouse_id: "",
                            delivery_partner_user_id: "",
                            q: "",
                            limit: 20,
                            delivery_date: "",
                        });
                    }}
                >
                    <RiResetLeftFill className="h-4 w-4" /><span className="sr-only">Reset filters</span>
                </Button>
            </div>
        </form>
    );
}

function SummaryCard({ title, value, active, onClick, icon: Icon = ClipboardList, accent = "dailyveg" }) {
    const accentClasses = {
        dailyveg: "bg-dailyveg-50 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300",
        amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
        cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
        rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
        slate: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
    };
    return (
        <button
            className={[
                "group relative min-w-0 overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 sm:rounded-2xl sm:p-4",
                "flex min-h-[100px] flex-col items-start justify-between gap-3 sm:min-h-[116px]",
                active
                    ? "border-dailyveg-500 bg-gradient-to-br from-dailyveg-500 to-dailyveg-600 text-white shadow-brand hover:-translate-y-0.5 dark:border-dailyveg-600"
                    : "border-slate-200/80 bg-white text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-dailyveg-300 hover:shadow-brand dark:border-slate-800/80 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-dailyveg-800 dark:shadow-brand-dark",
            ].join(" ")}
            type="button"
            onClick={onClick}
        >
            <div className="flex w-full items-start justify-between gap-2">
                <div className="line-clamp-2 text-xs font-medium leading-tight sm:text-sm">{title}</div>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105", active ? "bg-white/15 text-white" : accentClasses[accent])}><Icon className="h-3.5 w-3.5" /></span>
            </div>

            <div className="flex w-full items-end justify-between"><div className="text-xl font-bold leading-none sm:text-2xl">{value}</div><ArrowRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-0.5", active ? "text-white/70" : "text-slate-300 dark:text-slate-700")} /></div>
        </button>
    );
}

function QueueTabs({ value, onChange }) {
    const tabs = [
        { key: "all", label: "All" },
        { key: "before_lock", label: "Before Lock" },
        { key: "locked", label: "Locked" },
        { key: "to_pack", label: "To Pack" },
        { key: "packed", label: "Packed" },
        { key: "out_for_delivery", label: "Out for Delivery" },
        { key: "delivered", label: "Delivered" },
        { key: "exceptions", label: "Exceptions" },
        { key: "assigned", label: "Assigned" },
        { key: "unassigned", label: "Unassigned" },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
                const active = value === tab.key;

                return (
                    <Button
                        key={tab.key}
                        type="button"
                        variant={active ? "default" : "outline"}
                        onClick={() => onChange(tab.key)}
                    >
                        {tab.label}
                    </Button>
                );
            })}
        </div>
    );
}

function OrderPreviewDialog({
    order,
    open,
    onOpenChange,
    onViewDetails,
    onAssignClick,
    onUnassignClick,
    isAssignPending,
    isUnassignPending,
}) {
    if (!order) return null;

    const deliveryPartnerText = order.delivery_partner
        ? `${getDeliveryPartnerName(order)}${getDeliveryPartnerPhone(order) ? ` (${getDeliveryPartnerPhone(order)})` : ""}`
        : "Not assigned";

    const ORDER_STATUS_LABELS = {
        payment_pending: "Payment Pending",
        placed: "Order Placed",
        confirmed: "Order Confirmed",
        locked: "Order Locked",
        accepted: "Order Accepted",
        packed: "Order Packed",
        out_for_delivery: "Out for Delivery",
        delivered: "Delivered",
        delivery_failed: "Delivery Failed",
        cancelled: "Cancelled",
        refunded: "Refunded",
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Order Preview</DialogTitle>
                </DialogHeader>

                <div className="grid gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-slate-500">Operational Order</div>
                                <div className="font-semibold text-base text-slate-900 dark:text-white">{getPrimaryOrderLabel(order)}</div>
                            </div>
                            {getDailyOrderLabel(order) && (
                                <div className="rounded bg-dailyveg-100 dark:bg-dailyveg-950 px-2 py-1 text-sm font-bold text-dailyveg-700 dark:text-dailyveg-300">
                                    {getDailyOrderLabel(order)}
                                </div>
                            )}
                        </div>
                        {order.order_number && (
                            <div className="text-xs text-slate-500">
                                Customer Reference: <span className="font-mono text-slate-700 dark:text-slate-300">{order.order_number}</span>
                            </div>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-1">
                            <span>UUID: {order.id}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(order.id);
                                    toast.success("UUID copied to clipboard");
                                }}
                                className="hover:text-slate-600 dark:hover:text-slate-200"
                                title="Copy UUID"
                            >
                                <Copy className="h-3.5 w-3.5 inline-block" />
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Customer</div>
                            <div className="mt-1 font-medium">{getCustomerName(order)}</div>
                            <div className="text-slate-500 dark:text-slate-400">{getCustomerPhone(order)}</div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Delivery</div>
                            <div className="mt-1 font-medium">{formatIndianDateTime(order.delivery_date)}</div>
                            <div className="text-slate-500 dark:text-slate-400">{getOrderArea(order)}</div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Status</div>
                            <div className="mt-2">
                                <StatusBadge value={ORDER_STATUS_LABELS[order.status]} />
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Payment</div>
                            <div className="mt-1 font-medium">{order.payment_method || "—"}</div>
                            <div className="text-slate-500 dark:text-slate-400">{order.payment_status || "—"}</div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Total</div>
                            <div className="mt-1 font-medium">{money(getOrderTotal(order))}</div>
                            <div className="text-slate-500 dark:text-slate-400">Items: {getOrderItemsCount(order)}</div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <div className="text-xs text-slate-500">Delivery Partner</div>
                        <div className="mt-1 font-medium">{deliveryPartnerText}</div>
                        <div className="text-slate-500 dark:text-slate-400">
                            Assigned at: {order.delivery_assigned_at || "—"}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        {canAssignDeliveryPartner(order) ? (
                            <Button variant="outline" onClick={() => onAssignClick(order)} disabled={isAssignPending}>
                                {order.delivery_partner_user_id ? "Reassign Partner" : "Assign Partner"}
                            </Button>
                        ) : null}

                        {canUnassignDeliveryPartner(order) ? (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    onOpenChange(false);
                                    onUnassignClick(order);
                                }}
                                disabled={isUnassignPending}
                            >
                                {isUnassignPending ? "Removing..." : "Unassign"}
                            </Button>
                        ) : null}

                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>

                        <Button onClick={() => onViewDetails(order.id)}>View Full Details</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AssignDeliveryPartnerDialog({
    open,
    onOpenChange,
    order,
    deliveryPartners,
    selectedPartnerId,
    onChangePartner,
    onAssign,
    isPending,
}) {
    if (!order) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isPending) {
                    onOpenChange(nextOpen);
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {order.delivery_partner_user_id ? "Reassign Delivery Partner" : "Assign Delivery Partner"} to {getDailyOrderLabel(order) || getPrimaryOrderLabel(order)}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                        <div className="flex items-center justify-between font-semibold">
                            <span>{getPrimaryOrderLabel(order)}</span>
                            {getDailyOrderLabel(order) && (
                                <span className="rounded bg-dailyveg-100 dark:bg-dailyveg-950 px-2 py-0.5 text-xs text-dailyveg-700 dark:text-dailyveg-300">
                                    {getDailyOrderLabel(order)}
                                </span>
                            )}
                        </div>
                        {order.order_number && (
                            <div className="text-xs text-slate-500 mt-1">
                                Customer Reference: <span className="font-mono text-slate-700 dark:text-slate-300">{order.order_number}</span>
                            </div>
                        )}
                        <div className="mt-1 text-slate-550 dark:text-slate-400">
                            {getCustomerName(order)} · {getCustomerPhone(order)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Delivery Date: {formatIndianDateTime(order.delivery_date)} · Area: {getOrderArea(order)}
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Delivery Partner</Label>
                        <PremiumSelect
                            value={selectedPartnerId || ""}
                            onChange={onChangePartner}
                            placeholder="Select delivery partner"
                            isDisabled={isPending}
                            isClearable
                            menuPortalTarget={null}
                            menuPosition="absolute"
                            options={deliveryPartners.map((partner) => ({
                                value: partner.id,
                                label: `${partner.full_name || partner.phone || partner.id}${partner.phone ? ` (${partner.phone})` : ""}`,
                            }))}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Cancel
                        </Button>

                        <Button onClick={onAssign} disabled={!selectedPartnerId || isPending}>
                            {isPending ? "Saving..." : order.delivery_partner_user_id ? "Reassign" : "Assign"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}

function MobileOrderCard({
    order,
    selectedIds,
    onToggleSelect,
    onPreview,
    onAssign,
    onUnassign,
    onQuickAction,
    isAssignPending,
    isUnassignPending,
    isUpdatePending,
}) {
    const nextActions = getNextActions(order);
    const selected = selectedIds.includes(order.id);

    const ORDER_STATUS_LABELS = {
        payment_pending: "Payment Pending",
        placed: "Order Placed",
        confirmed: "Order Confirmed",
        locked: "Order Locked",
        accepted: "Order Accepted",
        packed: "Order Packed",
        out_for_delivery: "Out for Delivery",
        delivered: "Delivered",
        delivery_failed: "Delivery Failed",
        cancelled: "Cancelled",
        refunded: "Refunded",
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleSelect(order.id)}
                            className="shrink-0"
                            aria-label={`Select order ${getPrimaryOrderLabel(order)}`}
                        />
                        {getDailyOrderLabel(order) && (
                            <span className="shrink-0 rounded bg-dailyveg-100 dark:bg-dailyveg-950 px-2 py-0.5 text-xs font-extrabold text-dailyveg-700 dark:text-dailyveg-300">
                                {getDailyOrderLabel(order)}
                            </span>
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {getPrimaryOrderLabel(order)}
                        </span>
                    </div>
                    {order.order_number && (
                        <div className="mt-1 text-xs text-slate-500">
                            Ref: <span className="font-mono text-slate-700 dark:text-slate-300">{order.order_number}</span>
                        </div>
                    )}
                    <div className="mt-1 text-xs text-slate-500">
                        {getCustomerName(order)} · {getCustomerPhone(order)}
                    </div>
                </div>

                <StatusBadge value={ORDER_STATUS_LABELS[order.status]} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-xs text-slate-500">Delivery</div>
                    <div className="mt-1 font-medium">{formatIndianDateTime(order.delivery_date)}</div>
                    <div className="text-xs text-slate-500">{getOrderArea(order)}</div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-xs text-slate-500">Amount</div>
                    <div className="mt-1 font-semibold">{money(getOrderTotal(order))}</div>
                    <div className="text-xs text-slate-500">
                        Items: {getOrderItemsCount(order)}
                    </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-xs text-slate-500">Payment</div>
                    <div className="mt-1 font-medium">{order.payment_method || "—"}</div>
                    <div className="text-xs text-slate-500">{order.payment_status || "—"}</div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-xs text-slate-500">Rider</div>
                    <div className="mt-1 truncate font-medium">
                        {order.delivery_partner ? getDeliveryPartnerName(order) : "Not assigned"}
                    </div>
                    <div className="text-xs text-slate-500">
                        {order.delivery_partner ? getDeliveryPartnerPhone(order) || "—" : "—"}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onPreview(order)}>
                    Preview
                </Button>

                <Button variant="outline" size="sm" asChild>
                    <Link to={`/ops/orders/${order.id}`}>View</Link>
                </Button>

                {canAssignDeliveryPartner(order) ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAssign(order)}
                        disabled={isAssignPending}
                    >
                        {order.delivery_partner_user_id ? "Reassign" : "Assign"}
                    </Button>
                ) : null}

                {canUnassignDeliveryPartner(order) ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUnassign(order)}
                        disabled={isUnassignPending}
                    >
                        Unassign
                    </Button>
                ) : null}

                {nextActions.map((action) => (
                    <Button
                        key={action.key}
                        size="sm"
                        onClick={() => onQuickAction(order.id, action.key)}
                        disabled={isUpdatePending}
                    >
                        {action.label}
                    </Button>
                ))}
            </div>

            <div className="mt-3 text-xs text-slate-500">
                {order.is_locked ? "Locked" : "Not locked"}
            </div>
        </div>
    );
}

function OrderGridCard({
    order,
    selectedIds,
    onToggleSelect,
    onPreview,
    onAssign,
    onUnassign,
    onQuickAction,
    isAssignPending,
    isUnassignPending,
    isUpdatePending,
}) {
    const nextActions = getNextActions(order);
    const selected = selectedIds.includes(order.id);
    const deliveryPartner = order.delivery_partner ? getDeliveryPartnerName(order) : "Not assigned";
    const deliveryPartnerPhone = order.delivery_partner ? getDeliveryPartnerPhone(order) || "—" : "—";

    const ORDER_STATUS_LABELS = {
        payment_pending: "Payment Pending",
        placed: "Order Placed",
        confirmed: "Order Confirmed",
        locked: "Order Locked",
        accepted: "Order Accepted",
        packed: "Order Packed",
        out_for_delivery: "Out for Delivery",
        delivered: "Delivered",
        delivery_failed: "Delivery Failed",
        cancelled: "Cancelled",
        refunded: "Refunded",
    };

    return (
        <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-dailyveg-300 hover:shadow-xl hover:shadow-dailyveg-900/10 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-dailyveg-800 dark:hover:shadow-black/30">
            <div className="border-b border-slate-100 bg-dailyveg-50/70 p-4 dark:border-slate-900 dark:bg-dailyveg-950/30">
                <div className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 items-start gap-3 flex-1">
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleSelect(order.id)}
                            className="mt-1 shrink-0"
                            aria-label={`Select order ${getPrimaryOrderLabel(order)}`}
                        />
                        <span className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {getDailyOrderLabel(order) && (
                                    <span className="shrink-0 rounded bg-dailyveg-100 dark:bg-dailyveg-950 px-2 py-0.5 text-[11px] font-extrabold text-dailyveg-700 dark:text-dailyveg-300">
                                        {getDailyOrderLabel(order)}
                                    </span>
                                )}
                                <span className="block truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                                    {getPrimaryOrderLabel(order)}
                                </span>
                            </div>
                            {order.order_number && (
                                <span className="mt-1 block max-w-full truncate text-xs text-slate-500">
                                    Ref: <span className="font-mono text-slate-700 dark:text-slate-300">{order.order_number}</span>
                                </span>
                            )}
                            <span className="mt-0.5 block max-w-full truncate text-[10px] text-slate-400 font-mono" title={order.id}>
                                UUID: {order.id}
                            </span>
                        </span>
                    </label>

                    <div className="shrink-0">
                        <StatusBadge value={ORDER_STATUS_LABELS[order.status]} />
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {getCustomerName(order)}
                        </div>
                        <div className="text-xs text-slate-500">{getCustomerPhone(order)}</div>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="text-lg font-bold text-slate-950 dark:text-slate-50">
                            {money(getOrderTotal(order))}
                        </div>
                        <div className="text-xs text-slate-500">{getOrderItemsCount(order)} items</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
                        <div className="text-[11px] font-medium uppercase text-slate-500">Delivery</div>
                        <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {formatIndianDateTime(order.delivery_date)}
                        </div>
                        <div className="truncate text-xs text-slate-500">{getOrderArea(order)}</div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
                        <div className="text-[11px] font-medium uppercase text-slate-500">Payment</div>
                        <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {order.payment_method || "—"}
                        </div>
                        <div className="truncate text-xs text-slate-500">{order.payment_status || "—"}</div>
                    </div>

                    <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
                        <div className="flex items-start gap-2">
                            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-dailyveg-600 dark:text-dailyveg-300" />
                            <div className="min-w-0">
                                <div className="text-[11px] font-medium uppercase text-slate-500">Delivery Partner</div>
                                <div className="mt-1 truncate font-semibold text-slate-900 dark:text-slate-100">
                                    {deliveryPartner}
                                </div>
                                <div className="text-xs text-slate-500">{deliveryPartnerPhone}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        {order.is_locked ? "Locked" : "Not locked"}
                    </span>
                    {selected ? (
                        <span className="rounded-full bg-dailyveg-100 px-3 py-1 text-xs font-semibold text-dailyveg-800 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                            Selected
                        </span>
                    ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-900">
                    <Button variant="outline" size="sm" onClick={() => onPreview(order)}>
                        <Eye className="mr-1.5 h-4 w-4" />
                        Preview
                    </Button>

                    <Button variant="outline" size="sm" asChild>
                        <Link to={`/ops/orders/${order.id}`}>View</Link>
                    </Button>

                    {canAssignDeliveryPartner(order) ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAssign(order)}
                            disabled={isAssignPending}
                        >
                            <UserPlus className="mr-1.5 h-4 w-4" />
                            {order.delivery_partner_user_id ? "Reassign" : "Assign"}
                        </Button>
                    ) : null}

                    {canUnassignDeliveryPartner(order) ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUnassign(order)}
                            disabled={isUnassignPending}
                        >
                            Unassign
                        </Button>
                    ) : null}

                    {nextActions.map((action) => (
                        <Button
                            key={action.key}
                            size="sm"
                            onClick={() => onQuickAction(order.id, action.key)}
                            disabled={isUpdatePending}
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            </div>
        </article>
    );
}

export function OpsOrdersPage() {
    const toast = useToast();
    const { withLoader } = useGlobalLoader();
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { roles } = useAuth();
    const [searchParams] = useSearchParams();

    const isAdmin = roles.includes("admin");

    const paramDate = searchParams.get("delivery_date");
    const paramQueue = searchParams.get("queue");

    const [queue, setQueue] = useState(paramQueue || "all");
    const [previewOrder, setPreviewOrder] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignOrder, setAssignOrder] = useState(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState("");
    const [bulkPartnerId, setBulkPartnerId] = useState("");
    const [viewMode, setViewMode] = useState(() => getSavedViewMode(OPS_ORDERS_VIEW_MODE_KEY));

    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        warehouse_id: "",
        delivery_partner_user_id: "",
        delivery_date: paramDate || addDaysYyyyMmDd(getIstYyyyMmDd(), 1),
        q: "",
    });

    function formatDateLabel(value) {
        return formatIndianDateTime(value);
    }

    useEffect(() => {
        const d = searchParams.get("delivery_date");
        const q = searchParams.get("queue");
        if (d && d !== filters.delivery_date) {
            setFilters((prev) => ({ ...prev, delivery_date: d, page: 1 }));
        }
        if (q && q !== queue) {
            setQueue(q);
        }
    }, [searchParams]);

    const [bulkActionDialog, setBulkActionDialog] = useState({
        open: false,
        toStatus: null,
    });

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: "",
        description: "",
        confirmText: "Confirm",
        onConfirm: null,
        loading: false,
    });

    function updateViewMode(nextViewMode) {
        setViewMode(nextViewMode);
        window.localStorage.setItem(OPS_ORDERS_VIEW_MODE_KEY, nextViewMode);
    }

    const listQuery = useQuery({
        queryKey: ["opsOrders", filters, queue],
        queryFn: () =>
            OpsOrdersService.list({
                ...filters,
                status: queueToStatusFilter(queue),
                isOrderAssigned: queueToAssignedFilter(queue),
            }),
        keepPreviousData: true,
        refetchInterval: 20000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    const summaryQuery = useQuery({
        queryKey: ["opsOrdersSummaryBase", filters.delivery_date, filters.warehouse_id, filters.q],
        queryFn: () =>
            OpsOrdersService.list({
                page: 1,
                limit: 500,
                warehouse_id: filters.warehouse_id,
                delivery_date: filters.delivery_date,
                q: filters.q,
            }),
        keepPreviousData: true,
        refetchInterval: 10000,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    const deliveryPartnersQuery = useQuery({
        queryKey: ["opsDeliveryPartners", filters.warehouse_id],
        queryFn: () =>
            OpsOrdersService.listDeliveryPartners({
                warehouse_id: filters.warehouse_id || undefined,
            }),
        keepPreviousData: true,
    });

    const rows = listQuery.data?.orders || [];
    const summaryOrders = summaryQuery.data?.orders || listQuery.data?.orders || [];
    const deliveryPartners = deliveryPartnersQuery.data?.partners || [];
    const page = listQuery.data?.page || filters.page;
    const total = listQuery.data?.total || 0;
    const limit = listQuery.data?.limit || filters.limit;

    const visibleRows = useMemo(() => {
        return rows.filter((order) => matchesQueue(order, queue));
    }, [rows, queue]);

    const summary = useMemo(() => {
        return {
            total: summaryOrders.length,
            beforeLock: summaryOrders.filter((order) => matchesQueue(order, "before_lock")).length,
            locked: summaryOrders.filter((order) => matchesQueue(order, "locked")).length,
            toPack: summaryOrders.filter((order) => matchesQueue(order, "to_pack")).length,
            packed: summaryOrders.filter((order) => matchesQueue(order, "packed")).length,
            outForDelivery: summaryOrders.filter((order) => matchesQueue(order, "out_for_delivery")).length,
            delivered: summaryOrders.filter((order) => matchesQueue(order, "delivered")).length,
            exceptions: summaryOrders.filter((order) => matchesQueue(order, "exceptions")).length,
            assigned: summaryOrders.filter((order) => !!order.delivery_partner_user_id).length,
            unassigned: summaryOrders.filter((order) => !order.delivery_partner_user_id).length,
        };
    }, [summaryOrders]);

    const updateStatusMut = useMutation({
        mutationFn: ({ orderId, payload }) => OpsOrdersService.updateStatus(orderId, payload),
        meta: {
            globalLoaderMessage: "Updating order status...",
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
    });

    const assignDeliveryPartnerMut = useMutation({
        mutationFn: ({ orderId, payload }) => OpsOrdersService.assignDeliveryPartner(orderId, payload),
        meta: {
            globalLoaderMessage: "Assigning delivery partner...",
        },
        onSuccess: () => {
            toast.success("Delivery partner assigned successfully");
            setAssignDialogOpen(false);
            setAssignOrder(null);
            setSelectedPartnerId("");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Failed to assign delivery partner");
        },
    });

    const bulkAssignDeliveryPartnerMut = useMutation({
        mutationFn: (payload) => OpsOrdersService.bulkAssignDeliveryPartner(payload),
        meta: {
            globalLoaderMessage: "Bulk assigning delivery partners...",
        },
        onSuccess: (data) => {
            toast.success(`${data?.assigned_count || selectedIds.length} orders assigned successfully`);
            setSelectedIds([]);
            setBulkPartnerId("");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Bulk delivery partner assignment failed");
        },
    });

    const bulkUnassignDeliveryPartnerMut = useMutation({
        mutationFn: (payload) => OpsOrdersService.bulkUnassignDeliveryPartner(payload),
        meta: {
            globalLoaderMessage: "Bulk unassigning delivery partners...",
        },
        onSuccess: (data) => {
            toast.success(`${data?.unassigned_count || selectedIds.length} orders unassigned successfully`);
            setSelectedIds([]);
            setBulkPartnerId("");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Bulk delivery partner assignment failed");
        },
    });

    const unassignDeliveryPartnerMut = useMutation({
        mutationFn: ({ orderId, payload }) => OpsOrdersService.unassignDeliveryPartner(orderId, payload),
        meta: {
            globalLoaderMessage: "Removing delivery partner...",
        },
        onSuccess: () => {
            toast.success("Delivery partner removed successfully");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Failed to unassign delivery partner");
        },
    });

    const bulkUpdateMut = useMutation({
        mutationFn: ({ orderIds, toStatus, note }) =>
            OpsOrdersService.bulkUpdateStatus({
                orderIds: orderIds,
                toStatus: toStatus,
                note,
            }),
        meta: {
            globalLoaderMessage: "Bulk updating orders status...",
        },
        onSuccess: () => {
            toast.success("Bulk update completed");
            setSelectedIds([]);
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Bulk update failed");
        },
    });

    const lockOrdersMut = useMutation({
        mutationFn: () => OpsJobsService.lockOrders({ delivery_date: filters.delivery_date }),
        meta: {
            globalLoaderMessage: "Locking orders...",
        },
        onSuccess: () => {
            toast.success("Lock job executed successfully");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Failed to run lock job");
        },
    });

    const selectedOrders = useMemo(() => {
        const selectedSet = new Set(selectedIds);
        return visibleRows.filter((order) => selectedSet.has(order.id));
    }, [visibleRows, selectedIds]);

    const hasSelectedOrders = selectedOrders.length > 0;

    const disableBulkAssign =
        !hasSelectedOrders ||
        !bulkPartnerId ||
        bulkAssignDeliveryPartnerMut.isPending ||
        selectedOrders.some((order) => !!order.delivery_partner_user_id || !canAssignDeliveryPartner(order));

    const disableBulkUnassign =
        !hasSelectedOrders ||
        !bulkPartnerId ||
        bulkUnassignDeliveryPartnerMut.isPending ||
        selectedOrders.some((order) => !canUnassignDeliveryPartner(order));

    function disableBulkStatus(toStatus) {
        return (
            !hasSelectedOrders ||
            bulkUpdateMut.isPending ||
            selectedOrders.some((order) => !canMoveOrderToStatus(order, toStatus))
        );
    }

    function handleQueueChange(nextQueue) {
        setQueue(nextQueue);
        setSelectedIds([]);

        setFilters((prev) => ({
            ...prev,
            page: 1,
        }));
    }

    function handleApplyFilters(nextValues) {
        setFilters((prev) => ({
            ...prev,
            ...nextValues,
            page: 1,
        }));
        setSelectedIds([]);
    }

    function handleQuickDate(type) {
        const nextDateStr =
            type === "today"
                ? getIstYyyyMmDd()
                : type === "tomorrow"
                    ? addDaysYyyyMmDd(getIstYyyyMmDd(), 1)
                    : addDaysYyyyMmDd(getIstYyyyMmDd(), -1);

        setFilters((prev) => ({
            ...prev,
            page: 1,
            delivery_date: nextDateStr,
        }));

        if (type === "tomorrow") {
            handleQueueChange("before_lock");
        } else if (type === "today") {
            handleQueueChange("to_pack");
        } else {
            handleQueueChange("all");
        }
    }

    async function handleQuickAction(orderId, toStatus) {
        try {
            await updateStatusMut.mutateAsync({
                orderId,
                payload: { to_status: toStatus },
            });

            toast.success("Order updated");
        } catch (e) {
            toast.error(e?.message || "Failed to update order");
        }
    }

    function handleBulkAction(toStatus) {
        if (!selectedIds.length) {
            toast.warning("Please select at least one order");
            return;
        }

        setBulkActionDialog({
            open: true,
            toStatus,
        });
    }

    function confirmBulkAction() {
        if (!bulkActionDialog.toStatus) return;

        bulkUpdateMut.mutate({
            orderIds: selectedIds,
            toStatus: bulkActionDialog.toStatus,
            note: `Orders moved to ${bulkActionDialog.toStatus}`
        });

        setBulkActionDialog({
            open: false,
            toStatus: null,
        });
    }

    async function handleExportAllCsv() {
        try {
            const { blob, filename } = await withLoader(
                OpsOrdersService.exportAllCsv({
                    warehouse_id: filters.warehouse_id,
                    delivery_partner_user_id: filters.delivery_partner_user_id,
                    delivery_date: filters.delivery_date,
                    q: filters.q,
                    status: queueToStatusFilter(queue),
                    isOrderAssigned: queueToAssignedFilter(queue),
                }),
                "Exporting CSV..."
            );

            downloadBlob(blob, filename);
        } catch (e) {
            toast.error("Failed to export CSV");
        }
    }

    function isAllVisibleSelected() {
        if (!visibleRows.length) return false;
        return visibleRows.every((row) => selectedIds.includes(row.id));
    }

    function toggleSelectAllVisible() {
        if (!visibleRows.length) return;

        if (isAllVisibleSelected()) {
            setSelectedIds((prev) => prev.filter((id) => !visibleRows.some((row) => row.id === id)));
            return;
        }

        const next = new Set(selectedIds);
        visibleRows.forEach((row) => next.add(row.id));
        setSelectedIds(Array.from(next));
    }

    function toggleRowSelection(orderId) {
        setSelectedIds((prev) =>
            prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
        );
    }

    function openAssignDialog(order) {
        setAssignOrder(order);
        setSelectedPartnerId(order?.delivery_partner_user_id || "");
        setAssignDialogOpen(true);
    }

    async function handleAssignDeliveryPartner() {
        if (!assignOrder?.id) {
            toast.error("Order not found");
            return;
        }

        if (!selectedPartnerId) {
            toast.warning("Please select a delivery partner");
            return;
        }

        assignDeliveryPartnerMut.mutate({
            orderId: assignOrder.id,
            payload: {
                delivery_partner_user_id: selectedPartnerId,
            },
        });
    }

    async function handleUnassignDeliveryPartner(order) {
        if (!order?.id) {
            toast.error("Order not found");
            return;
        }

        setConfirmDialog({
            open: true,
            title: "Unassign Delivery Partner",
            description: "Are you sure you want to unassign this delivery partner?",
            confirmText: "Unassign",
            loading: unassignDeliveryPartnerMut.isPending,
            onConfirm: () => {
                unassignDeliveryPartnerMut.mutate({
                    orderId: order.id,
                    payload: {
                        // order_id: [order.id],
                        note: "Delivery partner unassigned from order",
                    },
                });

                setConfirmDialog((prev) => ({
                    ...prev,
                    open: false,
                }));
            },
        });
    }

    function handleBulkAssignDeliveryPartner() {
        const orderIds = selectedOrders.map((order) => order.id);

        if (!orderIds.length) {
            toast.warning("Please select at least one order");
            return;
        }

        if (!bulkPartnerId) {
            toast.warning("Please select a delivery partner");
            return;
        }

        const idsSummary = selectedOrders.slice(0, 5).map(o => getDailyOrderLabel(o) || getPrimaryOrderLabel(o)).join(", ");
        const suffix = selectedOrders.length > 5 ? ` and ${selectedOrders.length - 5} more` : "";
        const summary = `Selected: ${idsSummary}${suffix}`;

        setConfirmDialog({
            open: true,
            title: "Assign Delivery Partner",
            description: `Assign ${orderIds.length} selected orders to this delivery partner? (${summary})`,
            confirmText: "Assign",
            loading: bulkAssignDeliveryPartnerMut.isPending,
            onConfirm: () => {
                bulkAssignDeliveryPartnerMut.mutate({
                    order_ids: orderIds,
                    delivery_partner_user_id: bulkPartnerId,
                    note: "Orders assigned to delivery partner",
                });

                setConfirmDialog((prev) => ({
                    ...prev,
                    open: false,
                }));
            },
        });
    }

    function handleBulkUnassignDeliveryPartner() {
        const orderIds = selectedOrders.map((order) => order.id);

        if (!orderIds.length) {
            toast.warning("Please select at least one order");
            return;
        }

        if (!bulkPartnerId) {
            toast.warning("Please select a delivery partner");
            return;
        }

        const idsSummary = selectedOrders.slice(0, 5).map(o => getDailyOrderLabel(o) || getPrimaryOrderLabel(o)).join(", ");
        const suffix = selectedOrders.length > 5 ? ` and ${selectedOrders.length - 5} more` : "";
        const summary = `Selected: ${idsSummary}${suffix}`;

        setConfirmDialog({
            open: true,
            title: "Unassign Delivery Partner",
            description: `Unassign ${orderIds.length} selected orders from this delivery partner? (${summary})`,
            confirmText: "Unassign",
            loading: bulkUnassignDeliveryPartnerMut.isPending,
            onConfirm: () => {
                bulkUnassignDeliveryPartnerMut.mutate({
                    order_ids: orderIds,
                    delivery_partner_user_id: bulkPartnerId,
                    note: "Orders unassigned from delivery partner",
                });

                setConfirmDialog((prev) => ({
                    ...prev,
                    open: false,
                }));
            },
        });
    }

    const ORDER_STATUS_LABELS = {
        payment_pending: "Payment Pending",
        placed: "Order Placed",
        confirmed: "Order Confirmed",
        locked: "Order Locked",
        accepted: "Order Accepted",
        packed: "Order Packed",
        out_for_delivery: "Out for Delivery",
        delivered: "Delivered",
        delivery_failed: "Delivery Failed",
        cancelled: "Cancelled",
        refunded: "Refunded",
    };

    const badgeProps = useMemo(() => getQueueBadgeProps(queue), [queue]);
    const BadgeIcon = badgeProps.icon;

    return (
        <div className="min-w-0">
            <PageHeader
                title="Orders (Ops)"
                subtitle="Daily delivery operations workspace for admin and warehouse team."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => handleQuickDate("today")}>
                            <CalendarDays className="mr-2 h-4 w-4" />Today
                        </Button>

                        <Button variant="outline" onClick={() => handleQuickDate("tomorrow")}>
                            Tomorrow
                        </Button>

                        <Button variant="outline" onClick={() => handleQuickDate("yesterday")}>
                            Yesterday
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => navigate(`/ops/procurement?delivery_date=${filters.delivery_date}`)}
                            disabled={!filters.delivery_date}
                        >
                            <ClipboardList className="mr-2 h-4 w-4" />View Procurement
                        </Button>

                        {isAdmin ? (
                            <Button
                                onClick={() => lockOrdersMut.mutate()}
                                disabled={!filters.delivery_date || lockOrdersMut.isPending}
                            >
                                <LockKeyhole className="mr-2 h-4 w-4" />{lockOrdersMut.isPending ? "Running..." : "Run Lock Job"}
                            </Button>
                        ) : null}
                    </div>
                }
            />

            <Card className="relative max-w-full overflow-hidden border-dailyveg-200/70 bg-gradient-to-r from-dailyveg-50 via-white to-white p-5 dark:border-dailyveg-900/70 dark:from-dailyveg-950/60 dark:via-slate-950 dark:to-slate-950 sm:p-6">
                <div className="absolute -right-12 -top-20 h-44 w-44 rounded-full bg-dailyveg-200/30 blur-3xl dark:bg-dailyveg-800/20" />
                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dailyveg-500 text-white shadow-brand"><CalendarDays className="h-5 w-5" /></div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-dailyveg-700 dark:text-dailyveg-300">Operations snapshot</div>
                            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatDateLabel(filters.delivery_date) || "No delivery date"}</div>
                        </div>
                    </div>

                    <div className="grid max-w-full grid-cols-3 gap-2 overflow-hidden">
                        <div className="rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur dark:border-amber-900/60 dark:bg-slate-950/70">
                            Before Lock <span className="ml-1 text-base font-bold text-amber-700 dark:text-amber-300">{summary.beforeLock}</span>
                        </div>
                        <div className="rounded-xl border border-dailyveg-200/80 bg-white/80 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur dark:border-dailyveg-900/60 dark:bg-slate-950/70">
                            Locked <span className="ml-1 text-base font-bold text-dailyveg-700 dark:text-dailyveg-300">{summary.locked}</span>
                        </div>
                        <div className="rounded-xl border border-rose-200/80 bg-white/80 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur dark:border-rose-900/60 dark:bg-slate-950/70">
                            Exceptions <span className="ml-1 text-base font-bold text-rose-700 dark:text-rose-300">{summary.exceptions}</span>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="mt-4">
                <Filters value={filters} onApply={handleApplyFilters} deliveryPartners={deliveryPartners} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
                <SummaryCard title="Total Orders" value={summary.total} icon={ClipboardList} accent="slate" active={queue === "all"} onClick={() => handleQueueChange("all")} />
                <SummaryCard title="Before Lock" value={summary.beforeLock} icon={Clock} accent="amber" active={queue === "before_lock"} onClick={() => handleQueueChange("before_lock")} />
                <SummaryCard title="To Pack" value={summary.toPack} icon={Package} accent="amber" active={queue === "to_pack"} onClick={() => handleQueueChange("to_pack")} />
                <SummaryCard title="Packed" value={summary.packed} icon={Box} accent="blue" active={queue === "packed"} onClick={() => handleQueueChange("packed")} />
                <SummaryCard title="Out for Delivery" value={summary.outForDelivery} icon={Truck} accent="cyan" active={queue === "out_for_delivery"} onClick={() => handleQueueChange("out_for_delivery")} />
                <SummaryCard title="Delivered" value={summary.delivered} icon={CheckCircle2} active={queue === "delivered"} onClick={() => handleQueueChange("delivered")} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 xl:grid-cols-4">
                <SummaryCard title="Locked Queue" value={summary.locked} icon={LockKeyhole} active={queue === "locked"} onClick={() => handleQueueChange("locked")} />
                <SummaryCard title="Exceptions" value={summary.exceptions} icon={AlertTriangle} accent="rose" active={queue === "exceptions"} onClick={() => handleQueueChange("exceptions")} />
                <SummaryCard title="Assigned" value={summary.assigned} icon={UsersRound} accent="blue" active={queue === "assigned"} onClick={() => handleQueueChange("assigned")} />
                <SummaryCard title="Unassigned" value={summary.unassigned} icon={UserPlus} accent="slate" active={queue === "unassigned"} onClick={() => handleQueueChange("unassigned")} />
            </div>

            <div className="mt-4 min-w-0">
                <Card className="w-full overflow-hidden border-slate-200/80 p-3 shadow-sm shadow-slate-200/50 dark:border-slate-800/80 dark:shadow-brand-dark sm:p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        {/* <QueueTabs value={queue} onChange={handleQueueChange} /> */}

                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:w-auto xl:flex-wrap">
                            <PDFDownloadLink
                                document={<OpsOrdersListPdf orders={visibleRows} filters={{ ...filters, queue }} />}
                                fileName={`ops_orders_${filters.delivery_date || getIstYyyyMmDd()}.pdf`}
                            >
                                {({ loading }) => (
                                    <Button className="gap-2" variant="outline" disabled={loading || !visibleRows.length}>
                                        <FileDown className="h-4 w-4" />{loading ? "Preparing PDF..." : "Export PDF"}
                                    </Button>
                                )}
                            </PDFDownloadLink>

                            <Button className="gap-2"
                                variant="outline"
                                disabled={!visibleRows.length}
                                onClick={() => exportOrdersCsv({ orders: visibleRows, filters: { ...filters, queue } })}
                            >
                                <FileDown className="h-4 w-4" />Export Visible
                            </Button>

                            <Button className="gap-2" variant="outline" onClick={handleExportAllCsv}>
                                <FileDown className="h-4 w-4" />Export All
                            </Button>
                        </div>

                        <div className="grid h-10 w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/70 sm:w-[112px]">
                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-dailyveg-700 dark:text-slate-400 dark:hover:text-dailyveg-300",
                                    viewMode === VIEW_MODES.table &&
                                    "bg-white text-dailyveg-700 shadow-sm dark:bg-slate-950 dark:text-dailyveg-300"
                                )}
                                onClick={() => updateViewMode(VIEW_MODES.table)}
                                title="Table view"
                                aria-label="Table view"
                                aria-pressed={viewMode === VIEW_MODES.table}
                            >
                                <Table2 className="h-4 w-4" />
                            </button>

                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-dailyveg-700 dark:text-slate-400 dark:hover:text-dailyveg-300",
                                    viewMode === VIEW_MODES.grid &&
                                    "bg-white text-dailyveg-700 shadow-sm dark:bg-slate-950 dark:text-dailyveg-300"
                                )}
                                onClick={() => updateViewMode(VIEW_MODES.grid)}
                                title="Grid view"
                                aria-label="Grid view"
                                aria-pressed={viewMode === VIEW_MODES.grid}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex min-w-0 max-w-full flex-wrap items-center gap-2 overflow-hidden">
                        {/* <div className="min-w-[260px]"> */}
                        {/* <div> */}
                        <PremiumSelect
                            value={bulkPartnerId}
                            onChange={setBulkPartnerId}
                            placeholder="Select delivery partner"
                            isDisabled={bulkAssignDeliveryPartnerMut.isPending}
                            isClearable
                            options={deliveryPartners.map((partner) => ({
                                value: partner.id,
                                label: `${partner.full_name || partner.phone || partner.id}${partner.phone ? ` (${partner.phone})` : ""
                                    }`,
                            }))}
                        />
                        {/* </div> */}

                        <Button
                            variant="outline"
                            disabled={disableBulkAssign}
                            onClick={handleBulkAssignDeliveryPartner}
                        >
                            {bulkAssignDeliveryPartnerMut.isPending ? "Assigning..." : "Assign Selected Rider"}
                        </Button>

                        <Button
                            variant="outline"
                            disabled={disableBulkUnassign}
                            onClick={handleBulkUnassignDeliveryPartner}
                        >
                            {bulkUnassignDeliveryPartnerMut.isPending ? "Unassigning..." : "Unassign Selected Rider"}
                        </Button>

                        <Button variant="outline" disabled={disableBulkStatus("accepted")} onClick={() => handleBulkAction("accepted")}>
                            Bulk Accept
                        </Button>

                        <Button variant="outline" disabled={disableBulkStatus("packed")} onClick={() => handleBulkAction("packed")}>
                            Bulk Packed
                        </Button>

                        <Button variant="outline" disabled={disableBulkStatus("out_for_delivery")} onClick={() => handleBulkAction("out_for_delivery")}>
                            Bulk Out for Delivery
                        </Button>

                        <Button variant="outline" disabled={disableBulkStatus("delivered")} onClick={() => handleBulkAction("delivered")}>
                            Bulk Delivered
                        </Button>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Selected: {selectedIds.length}</span>
                            {badgeProps.text ? (
                                <>
                                    <span className="text-slate-300 dark:text-slate-700">|</span>
                                    <div className={cn(
                                        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm transition-all duration-300 hover:shadow-md",
                                        badgeProps.className
                                    )}>
                                        {BadgeIcon ? <BadgeIcon className="h-3.5 w-3.5 shrink-0" /> : null}
                                        <span>{badgeProps.text}</span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                        {/* </div> */}

                        <div className="mt-4 min-w-0 w-full">
                            <div className={cn("grid gap-3", viewMode === VIEW_MODES.table ? "lg:hidden" : "sm:grid-cols-2 xl:grid-cols-3")}>
                                {listQuery.isLoading ? (
                                    <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 sm:col-span-2 xl:col-span-3">
                                        Loading orders...
                                    </div>
                                ) : visibleRows.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 sm:col-span-2 xl:col-span-3">
                                        No orders found for this queue.
                                    </div>
                                ) : (
                                    visibleRows.map((order) =>
                                        viewMode === VIEW_MODES.grid ? (
                                            <OrderGridCard
                                                key={order.id}
                                                order={order}
                                                selectedIds={selectedIds}
                                                onToggleSelect={toggleRowSelection}
                                                onPreview={setPreviewOrder}
                                                onAssign={openAssignDialog}
                                                onUnassign={handleUnassignDeliveryPartner}
                                                onQuickAction={handleQuickAction}
                                                isAssignPending={assignDeliveryPartnerMut.isPending}
                                                isUnassignPending={unassignDeliveryPartnerMut.isPending}
                                                isUpdatePending={updateStatusMut.isPending}
                                            />
                                        ) : (
                                            <MobileOrderCard
                                                key={order.id}
                                                order={order}
                                                selectedIds={selectedIds}
                                                onToggleSelect={toggleRowSelection}
                                                onPreview={setPreviewOrder}
                                                onAssign={openAssignDialog}
                                                onUnassign={handleUnassignDeliveryPartner}
                                                onQuickAction={handleQuickAction}
                                                isAssignPending={assignDeliveryPartnerMut.isPending}
                                                isUnassignPending={unassignDeliveryPartnerMut.isPending}
                                                isUpdatePending={updateStatusMut.isPending}
                                            />
                                        )
                                    )
                                )}
                            </div>

                            <div className={cn("w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm thin-scrollbar dark:border-slate-800/80 dark:bg-slate-950", viewMode === VIEW_MODES.table ? "hidden lg:block" : "hidden")}>
                                <table className="premium-table min-w-[1280px] table-auto whitespace-nowrap">
                                    <thead className="sticky left-0 top-0 z-10 bg-gradient-to-r from-dailyveg-50 to-slate-50/80 text-left dark:from-dailyveg-950/70 dark:to-slate-900/60">
                                        <tr>
                                            <th className="w-10 px-4 py-3.5 text-left">
                                                <input aria-label="Select all visible orders" className="h-4 w-4 rounded border-slate-300 accent-dailyveg-500" type="checkbox" checked={isAllVisibleSelected()} onChange={toggleSelectAllVisible} />
                                            </th>
                                            {['Order', 'Customer', 'Delivery', 'Area', 'Items', 'Amount', 'Payment', 'Delivery Partner', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{heading}</th>)}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {listQuery.isLoading ? (
                                            <tr>
                                                <td colSpan={11} className="px-4 py-16 text-center text-slate-500">
                                                    <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-dailyveg-500" /><span className="font-medium">Loading orders…</span>
                                                </td>
                                            </tr>
                                        ) : visibleRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={11} className="px-4 py-16 text-center text-slate-500">
                                                    <Package className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" /><span className="font-semibold text-slate-700 dark:text-slate-200">No orders found</span><p className="mt-1 text-xs">This queue is clear for the selected filters.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            visibleRows.map((order) => {
                                                const nextActions = getNextActions(order);
                                                const selected = selectedIds.includes(order.id);

                                                return (
                                                    <tr key={order.id} className={cn("group border-t border-slate-100 transition-colors dark:border-slate-900", selected ? "bg-dailyveg-50/80 dark:bg-dailyveg-950/35" : "hover:bg-slate-50/80 dark:hover:bg-slate-900/35")}>
                                                        <td className="px-4 py-3 align-middle">
                                                            <input
                                                                aria-label={`Select order ${getPrimaryOrderLabel(order)}`}
                                                                className="h-4 w-4 rounded border-slate-300 accent-dailyveg-500"
                                                                type="checkbox"
                                                                checked={selected}
                                                                onChange={() => toggleRowSelection(order.id)}
                                                            />
                                                        </td>

                                                        <td className="px-4 py-3 align-middle">
                                                            <div className="flex items-center gap-3" aria-label={`Order ${getPrimaryOrderLabel(order)}`}>
                                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dailyveg-200 bg-dailyveg-50 text-dailyveg-700 dark:border-dailyveg-800 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                                                    {getDailyOrderLabel(order) ? (
                                                                        <span className="text-xs font-bold">{getDailyOrderLabel(order)}</span>
                                                                    ) : (
                                                                        <Hash className="h-4 w-4" />
                                                                    )}
                                                                </span>
                                                                <div>
                                                                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                        {getPrimaryOrderLabel(order)}
                                                                    </div>
                                                                    {order.order_number && (
                                                                        <div className="text-[10px] text-slate-500 font-mono">
                                                                            Ref: {order.order_number}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 align-middle">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-100">{getCustomerName(order)}</div>
                                                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Phone className="h-3 w-3" />{getCustomerPhone(order)}</div>
                                                        </td>

                                                        <td className="px-4 py-3 align-middle"><div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{formatDateLabel(order.delivery_date) || "—"}</div></td>
                                                        <td className="px-4 py-3 align-middle"><div className="flex max-w-[140px] items-center gap-2 truncate text-xs text-slate-600 dark:text-slate-300" title={getOrderArea(order)}><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{getOrderArea(order)}</span></div></td>
                                                        <td className="px-4 py-3 align-middle"><span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{getOrderItemsCount(order)}</span></td>

                                                        <td className="px-4 py-3 align-middle">
                                                            <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white"><IndianRupee className="h-3.5 w-3.5 text-dailyveg-600" />{money(getOrderTotal(order)).replace(/^₹\s?/, "")}</div>
                                                        </td>

                                                        <td className="px-4 py-3 align-middle">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-700 dark:text-slate-200"><CreditCard className="h-3.5 w-3.5 text-slate-400" />{order.payment_method || "—"}</div>
                                                            <div className="mt-1 text-[11px] capitalize text-slate-500">{String(order.payment_status || "—").replaceAll("_", " ")}</div>
                                                        </td>

                                                        <td className="px-4 py-3 align-middle">
                                                            {order.delivery_partner ? (
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100"><Truck className="h-3.5 w-3.5 text-dailyveg-600" />{getDeliveryPartnerName(order)}</div>
                                                                    <div className="mt-1 text-xs text-slate-500">
                                                                        {getDeliveryPartnerPhone(order) || "—"}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700">Unassigned</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 align-middle">
                                                            <div className="flex flex-col items-start gap-1.5">
                                                                <StatusBadge value={ORDER_STATUS_LABELS[order.status]} />
                                                                <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold", order.is_locked ? "text-dailyveg-700 dark:text-dailyveg-300" : "text-slate-400")}>
                                                                    <span className={cn("h-1.5 w-1.5 rounded-full", order.is_locked ? "bg-dailyveg-500" : "bg-slate-300 dark:bg-slate-700")} />{order.is_locked ? "Locked" : "Not locked"}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 align-middle">
                                                            <div className="flex flex-nowrap gap-1.5">
                                                                <Button className="gap-1.5" variant="ghost" size="sm" onClick={() => setPreviewOrder(order)}>
                                                                    <Eye className="h-3.5 w-3.5" />Preview
                                                                </Button>

                                                                <Button className="gap-1.5" variant="outline" size="sm" asChild>
                                                                    <Link to={`/ops/orders/${order.id}`}>View<ExternalLink className="h-3.5 w-3.5" /></Link>
                                                                </Button>

                                                                {canAssignDeliveryPartner(order) ? (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => openAssignDialog(order)}
                                                                        disabled={assignDeliveryPartnerMut.isPending}
                                                                    >
                                                                        {order.delivery_partner_user_id ? "Reassign Rider" : "Assign Rider"}
                                                                    </Button>
                                                                ) : null}

                                                                {canUnassignDeliveryPartner(order) ? (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleUnassignDeliveryPartner(order)}
                                                                        disabled={unassignDeliveryPartnerMut.isPending}
                                                                    >
                                                                        Unassign
                                                                    </Button>
                                                                ) : null}

                                                                {nextActions.map((action) => (
                                                                    <Button
                                                                        key={action.key}
                                                                        size="sm"
                                                                        onClick={() => handleQuickAction(order.id, action.key)}
                                                                        disabled={updateStatusMut.isPending}
                                                                    >
                                                                        {action.label}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Page {page} · Showing {rows.length} rows · Total {total}
                            </p>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    disabled={page <= 1 || listQuery.isLoading}
                                    onClick={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            page: Math.max(1, Number(prev.page || 1) - 1),
                                        }))
                                    }
                                >
                                    Prev
                                </Button>

                                <Button
                                    variant="outline"
                                    disabled={rows.length < limit || listQuery.isLoading}
                                    onClick={() =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            page: Number(prev.page || 1) + 1,
                                        }))
                                    }
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div >

            <OrderPreviewDialog
                order={previewOrder}
                open={!!previewOrder}
                onOpenChange={(open) => {
                    if (!open) setPreviewOrder(null);
                }}
                onViewDetails={(orderId) => {
                    setPreviewOrder(null);
                    navigate(`/ops/orders/${orderId}`);
                }}
                onAssignClick={(order) => {
                    setPreviewOrder(null);
                    openAssignDialog(order);
                }}
                onUnassignClick={handleUnassignDeliveryPartner}
                isAssignPending={assignDeliveryPartnerMut.isPending}
                isUnassignPending={unassignDeliveryPartnerMut.isPending}
            />

            <AssignDeliveryPartnerDialog
                open={assignDialogOpen}
                onOpenChange={(open) => {
                    setAssignDialogOpen(open);
                    if (!open && !assignDeliveryPartnerMut.isPending) {
                        setAssignOrder(null);
                        setSelectedPartnerId("");
                    }
                }}
                order={assignOrder}
                deliveryPartners={deliveryPartners}
                selectedPartnerId={selectedPartnerId}
                onChangePartner={setSelectedPartnerId}
                onAssign={handleAssignDeliveryPartner}
                isPending={assignDeliveryPartnerMut.isPending}
            />

            <Dialog
                open={bulkActionDialog.open}
                onOpenChange={(open) => {
                    setBulkActionDialog({
                        open,
                        toStatus: open ? bulkActionDialog.toStatus : null,
                    });
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Confirm Bulk Update
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to update{" "}
                            <span className="font-semibold text-foreground">
                                {selectedIds.length}
                            </span>{" "}
                            selected orders to{" "}
                            <span className="font-semibold text-foreground">
                                "{bulkActionDialog.toStatus}"
                            </span>
                            ?
                        </p>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setBulkActionDialog({
                                        open: false,
                                        toStatus: null,
                                    })
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={confirmBulkAction}
                                disabled={bulkUpdateMut.isPending}
                            >
                                {bulkUpdateMut.isPending
                                    ? "Updating..."
                                    : "Confirm"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={confirmDialog.open}
                onOpenChange={(open) => {
                    if (!confirmDialog.loading) {
                        setConfirmDialog((prev) => ({
                            ...prev,
                            open,
                        }));
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {confirmDialog.title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {confirmDialog.description}
                        </p>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setConfirmDialog((prev) => ({
                                        ...prev,
                                        open: false,
                                    }))
                                }
                                disabled={confirmDialog.loading}
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={() => {
                                    if (confirmDialog.onConfirm) {
                                        confirmDialog.onConfirm();
                                    }
                                }}
                                disabled={confirmDialog.loading}
                            >
                                {confirmDialog.loading
                                    ? "Processing..."
                                    : confirmDialog.confirmText}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
