import { useMemo, useState } from "react";
import { formatIndianDateTime, formatOrderStatusDateTime } from "../../../utils/date-formatter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../auth/auth-context";
import { useToast } from "../../../components/toast/toast-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { AdminOrdersService } from "../../../api/services/admin-orders.service";
import { OpsOrdersService } from "../../../api/services/ops-orders.service";
import { Link, useParams } from "react-router-dom";
import {
    RefreshCw,
    AlertTriangle,
    Copy,
    ExternalLink,
    FileText,
    FileDown,
    ArrowLeft,
    Package,
    CreditCard,
    IndianRupee,
    CalendarDays,
    Warehouse,
    User,
    Phone,
    MapPin,
    Truck,
    Hash,
    LockKeyhole,
    Unlock,
    Camera,
    ShieldAlert,
    Search,
    CheckCircle2,
    Ban,
    Receipt,
} from "lucide-react";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { StatusBadge } from "../../../components/common/status-badge";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { OpsOrderPdf } from "./ops-order-pdf";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { OrderStatusTimeline } from "../../../components/orders/order-status-timeline";
import { getOrderStatusLabel } from "../../../utils/order-status-timeline";
import { cn, formatQuantity, assetUrl } from "../../../lib/utils";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../utils/order-identifier";
import { DataTable } from "../../../components/common/data-table";
import { getCodCollection, getDeliveryQrAttempts } from "../../../utils/payment-collection";

function money(paise) {
    const n = Number(paise || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "INR" });
}

/**
 * @typedef {Object} RefundRecord
 * @property {string} [id]
 * @property {string} [refund_id]
 * @property {string} [status]
 * @property {string} [failure_reason]
 */
/**
 * @typedef {Object} PaymentAudit
 * @property {string} [payment_status]
 * @property {string} [refund_status]
 * @property {string} [refund_id]
 * @property {string} [refund_failure_reason]
 * @property {boolean} [retry_allowed]
 * @property {Array<any>} [payment_attempts]
 * @property {Array<RefundRecord>} [refunds]
 */
/**
 * @typedef {Object} OrderStatusActor
 * @property {string|null} [id]
 * @property {string|null} [full_name]
 */
/**
 * @typedef {Object} OrderStatusTimelineItem
 * @property {string|null} [id]
 * @property {string|null} [from_status]
 * @property {string} [status]
 * @property {string|null} [occurred_at]
 * @property {string} [source]
 * @property {string|null} [note]
 * @property {OrderStatusActor|null} [actor]
 */
/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} [order_number]
 * @property {number|null} [daily_order_number]
 * @property {string|null} [operational_order_code]
 * @property {string} [delivery_date]
 * @property {Object} [warehouse]
 * @property {string} [status]
 * @property {string} [payment_method]
 * @property {string} [payment_status]
 * @property {number} [total_paise]
 * @property {number} [subtotal_paise]
 * @property {number} [delivery_fee_paise]
 * @property {number} [discount_paise]
 * @property {number} [gst_amount_paise]
 * @property {number} [gst_rate_bps]
 * @property {number} [grand_total_paise]
 * @property {Array<any>} [items]
 * @property {string} [delivery_proof_image_url]
 * @property {Object} [user]
 * @property {Object} [address]
 * @property {Object} [delivery_partner]
 * @property {boolean} [is_locked]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 * @property {string|null} [current_status_at]
 * @property {Array<OrderStatusTimelineItem>} [status_timeline]
 * @property {Array<any>} [status_events]
 */

function pickFirstImageUrl(item) {
    const images = item?.product?.images || [];
    return images.length ? images[0].image_url : null;
}

function getApiErrorMessage(error) {
    return (
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong"
    );
}

function isOnlinePaymentMethod(method) {
    const paymentMethod = String(method || "").toLowerCase();
    return paymentMethod && paymentMethod !== "cod";
}

function getRefundStatusDisplay(refundStatus) {
    if (!refundStatus) return "—";
    const status = String(refundStatus).toLowerCase();
    if (status === "refunded" || status === "success" || status === "succeeded") return "Refunded";
    if (status === "refund_pending" || status === "pending") return "Refund Pending";
    if (status === "refund_failed" || status === "failed") return "Refund Failed";
    return String(refundStatus);
}

function canCancelOrder(order) {
    const status = String(order?.status || "").toLowerCase();
    return ["placed", "confirmed", "locked", "accepted", "packed"].includes(status);
}

function canRetryRefund(order, audit) {
    const paymentMethod = String(order?.payment_method || "").toLowerCase();
    const orderStatus = String(order?.status || "").toLowerCase();
    const paymentStatus = String(order?.payment_status || "").toLowerCase();
    const refundStatus = String(audit?.refund_status || "").toLowerCase();

    const isOnlinePayment = paymentMethod && paymentMethod !== "cod";
    const eligibleOrderStatus = ["cancelled", "delivery_failed"].includes(orderStatus);
    const alreadyFinal = ["refunded", "success", "succeeded"].includes(refundStatus);

    return (
        isOnlinePayment &&
        eligibleOrderStatus &&
        !alreadyFinal &&
        (paymentStatus === "paid" || refundStatus === "refund_pending" || refundStatus === "refund_failed")
    );
}

export function OpsOrderDetailPage() {

    const { orderId } = useParams();

    const { roles } = useAuth();
    const toast = useToast();
    const qc = useQueryClient();
    const isAdmin = roles.includes("admin");

    const [refundOpen, setRefundOpen] = useState(false);
    const [refundReason, setRefundReason] = useState("");
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [downloadingBill, setDownloadingBill] = useState(false);
    const [itemSearch, setItemSearch] = useState("");

    const copyToClipboard = (text, label = "Value") => {
        if (!text) return;
        navigator.clipboard.writeText(String(text));
        toast.push({
            variant: "success",
            title: `${label} copied`,
            description: `${label} has been copied to your clipboard.`,
        });
    };

    const handleDownloadBill = async () => {
        try {
            setDownloadingBill(true);
            const blob = await AdminOrdersService.downloadInvoice(orderId);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            const code = order?.operational_order_code || order?.order_number || orderId;
            link.download = `Invoice_${code}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.push({
                variant: "success",
                title: "Bill downloaded",
                description: "Tax invoice bill downloaded successfully.",
            });
        } catch (e) {
            const msg = getApiErrorMessage(e);
            toast.push({
                variant: "error",
                title: "Download failed",
                description: msg,
            });
        } finally {
            setDownloadingBill(false);
        }
    };

    const paymentAuditQuery = useQuery({
        queryKey: ["adminOrderPaymentAudit", orderId],
        queryFn: () => AdminOrdersService.getPaymentAudit(orderId),
        enabled: !!orderId && isAdmin,
    });

    const refundMut = useMutation({
        mutationFn: () => AdminOrdersService.initiateRefund(orderId, refundReason),
        meta: {
            globalLoaderMessage: "Refunding order...",
        },
        onSuccess: () => {
            toast.push({
                variant: "success",
                title: "Refund initiated",
                description: "Refund request sent successfully.",
            });
            setRefundOpen(false);
            setRefundReason("");
            qc.invalidateQueries({ queryKey: ["opsOrder", orderId] });
            paymentAuditQuery.refetch();
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
        onError: (e) => {
            const msg = getApiErrorMessage(e);
            toast.push({
                variant: "error",
                title: "Refund failed",
                description: msg,
            });
        },
    });
    const cancelMut = useMutation({
        mutationFn: () => OpsOrdersService.updateStatus(orderId, {
            to_status: "cancelled",
            note: cancelReason || null,
        }),
        meta: {
            globalLoaderMessage: "Cancelling order...",
        },
        onSuccess: () => {
            toast.push({
                variant: "success",
                title: "Order cancelled",
                description: "Order cancellation completed successfully.",
            });
            setCancelOpen(false);
            setCancelReason("");
            qc.invalidateQueries({ queryKey: ["opsOrder", orderId] });
            paymentAuditQuery.refetch();
            qc.invalidateQueries({ queryKey: ["procurement"] });
        },
        onError: (e) => {
            const msg = getApiErrorMessage(e);
            toast.push({
                variant: "error",
                title: "Cancellation failed",
                description: msg,
            });
        },
    });

    const query = useQuery({
        queryKey: ["opsOrder", orderId],
        queryFn: () => OpsOrdersService.getById(orderId),
        enabled: !!orderId,
    });

    const order = query.data?.order || null;
    const paymentAudit = paymentAuditQuery.data || {};
    const codCollection = getCodCollection(paymentAudit);
    const deliveryQrAttempts = getDeliveryQrAttempts(paymentAudit);

    const items = order?.items || [];

    const filteredItems = useMemo(() => {
        const q = itemSearch.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) => {
            const name = String(it?.product_name || "").toLowerCase();
            const pack = String(it?.pack_label || "").toLowerCase();
            const unit = String(it?.unit || "").toLowerCase();
            return name.includes(q) || pack.includes(q) || unit.includes(q);
        });
    }, [items, itemSearch]);

    const totalQuantitySum = useMemo(() => {
        return items.reduce((sum, it) => sum + Number(it?.quantity || 0), 0);
    }, [items]);

    const formattedFullAddress = useMemo(() => {
        if (!order?.address) return "";
        const parts = [
            order.address.label ? `[${order.address.label}]` : "",
            order.address.name,
            order.address.phone,
            order.address.address_line1,
            order.address.address_line2,
            order.address.area,
            order.address.landmark ? `Landmark: ${order.address.landmark}` : "",
            [order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(" "),
        ].filter(Boolean);
        return parts.join(", ");
    }, [order?.address]);

    if (query.isLoading) {
        return (
            <div className="space-y-5 pb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-52 rounded-xl" />
                        <Skeleton className="h-4 w-72 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Skeleton className="h-10 w-full sm:w-28 rounded-xl" />
                        <Skeleton className="h-10 w-full sm:w-28 rounded-xl" />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="p-4 sm:p-5 space-y-4 rounded-2xl">
                            <div className="flex justify-between">
                                <Skeleton className="h-10 w-32 rounded-xl" />
                                <Skeleton className="h-10 w-24 rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Skeleton className="h-36 w-full rounded-xl" />
                                <Skeleton className="h-36 w-full rounded-xl" />
                            </div>
                        </Card>

                        <Card className="p-4 sm:p-5 rounded-2xl">
                            <Skeleton className="h-6 w-40 mb-4 rounded-lg" />
                            <div className="space-y-3">
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card className="p-4 sm:p-5 space-y-4 rounded-2xl">
                            <Skeleton className="h-5 w-28 rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-xl" />
                        </Card>
                        <Card className="p-4 sm:p-5 space-y-4 rounded-2xl">
                            <Skeleton className="h-5 w-36 rounded-lg" />
                            <Skeleton className="h-28 w-full rounded-xl" />
                        </Card>
                        <Card className="p-4 sm:p-5 space-y-4 rounded-2xl">
                            <Skeleton className="h-5 w-32 rounded-lg" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    if (query.isError) {
        const errorMsg = getApiErrorMessage(query.error);
        return (
            <div className="space-y-6 pb-8">
                <PageHeader
                    title="Order Details"
                    subtitle="Error loading order"
                    actions={
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
                            <Button onClick={() => query.refetch()} disabled={query.isRefetching}>
                                <RefreshCw className={cn("mr-1.5 h-4 w-4", query.isRefetching && "animate-spin")} />
                                {query.isRefetching ? "Retrying..." : "Retry"}
                            </Button>
                            <Button variant="secondary" asChild>
                                <Link to="/ops/orders">
                                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                                    Back
                                </Link>
                            </Button>
                        </div>
                    }
                />
                <Card className="p-6 sm:p-8 rounded-2xl border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20 text-center flex flex-col items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-3">
                        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Unable to load order details
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                        {errorMsg}
                    </p>
                </Card>
            </div>
        );
    }

    const dailyLabel = getDailyOrderLabel(order);
    const primaryLabel = getPrimaryOrderLabel(order);

    return (
        <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-5 pb-10">
            {/* Top Navigation & Mobile-First Action Toolbar */}
            <PageHeader
                title={
                    <div className="flex flex-wrap items-center gap-2">
                        {dailyLabel && (
                            <span className="inline-flex items-center rounded-xl bg-dailyveg-500 px-2.5 py-1 text-xs sm:text-sm font-black tracking-wide text-white shadow-sm shadow-dailyveg-500/20">
                                {dailyLabel}
                            </span>
                        )}
                        <span className="truncate">{primaryLabel}</span>
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                                order.is_locked
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                            )}
                        >
                            {order.is_locked ? (
                                <>
                                    <LockKeyhole className="h-3 w-3" /> Locked
                                </>
                            ) : (
                                <>
                                    <Unlock className="h-3 w-3" /> Unlocked
                                </>
                            )}
                        </span>
                    </div>
                }
                subtitle={
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {order.order_number && (
                            <button
                                type="button"
                                onClick={() => copyToClipboard(order.order_number, "Customer Ref")}
                                className="inline-flex items-center gap-1 font-mono text-slate-700 hover:text-dailyveg-600 dark:text-slate-300 dark:hover:text-dailyveg-400"
                                title="Click to copy reference"
                            >
                                <span>Ref: {order.order_number}</span>
                                <Copy className="h-3 w-3 opacity-70" />
                            </button>
                        )}
                        <span>•</span>
                        <span>Delivery: {formatIndianDateTime(order.delivery_date) || "—"}</span>
                        <span>•</span>
                        <span>Warehouse: {order.warehouse?.name || "—"}</span>
                    </div>
                }
                actions={
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
                        <Button className="w-full sm:w-auto gap-1.5 h-9 text-xs sm:text-sm" variant="secondary" asChild>
                            <Link to="/ops/orders">
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back</span>
                            </Link>
                        </Button>

                        <Button
                            className="w-full sm:w-auto gap-1.5 h-9 text-xs sm:text-sm"
                            variant="outline"
                            onClick={() => query.refetch()}
                            disabled={query.isRefetching}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", query.isRefetching && "animate-spin")} />
                            <span>Refresh</span>
                        </Button>

                        {isAdmin ? (
                            <Button
                                className="w-full sm:w-auto gap-1.5 h-9 text-xs sm:text-sm"
                                variant="outline"
                                onClick={handleDownloadBill}
                                disabled={downloadingBill}
                            >
                                <FileText className="h-3.5 w-3.5 text-dailyveg-600 dark:text-dailyveg-400" />
                                <span className="truncate">{downloadingBill ? "Downloading..." : "Tax Invoice"}</span>
                            </Button>
                        ) : null}

                        <PDFDownloadLink
                            document={<OpsOrderPdf order={order} />}
                            fileName={
                                order.operational_order_code
                                    ? `order_${order.operational_order_code}.pdf`
                                    : `order_${order.order_number || order.id}.pdf`
                            }
                            className={cn("w-full sm:w-auto", !isAdmin && "col-span-2 sm:col-span-1")}
                        >
                            {({ loading }) => (
                                <Button className="w-full sm:w-auto gap-1.5 h-9 text-xs sm:text-sm shadow-sm" variant="default" disabled={loading}>
                                    <FileDown className="h-3.5 w-3.5" />
                                    <span className="truncate">{loading ? "Preparing..." : "Order Slip PDF"}</span>
                                </Button>
                            )}
                        </PDFDownloadLink>
                    </div>
                }
            />

            {/* Main 2-Column Responsive Layout */}
            <div className="grid gap-4 lg:grid-cols-3 items-start">
                {/* LEFT COLUMN: Hero Summary, Payment/Charges, Items, Timeline, Delivery Proof */}
                <div className="lg:col-span-2 space-y-4 min-w-0 max-w-full">
                    {/* Executive Hero Summary Card */}
                    <Card className="relative overflow-hidden rounded-2xl border-dailyveg-200/80 bg-gradient-to-br from-dailyveg-50/70 via-white to-slate-50/80 p-4 sm:p-5 shadow-sm dark:border-dailyveg-900/60 dark:from-dailyveg-950/40 dark:via-slate-950 dark:to-slate-900/90">
                        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-dailyveg-300/20 blur-3xl dark:bg-dailyveg-700/15" />

                        {/* Status + Timestamp Row */}
                        <div className="relative flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
                            <div className="flex items-center gap-2.5">
                                <StatusBadge value={order.status} label={getOrderStatusLabel(order.status)} />
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {order.current_status_at
                                        ? `Updated ${formatOrderStatusDateTime(order.current_status_at)}`
                                        : "Timestamp unavailable"}
                                </span>
                            </div>

                            {order.operational_order_code && (
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(order.operational_order_code, "Operational Code")}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 shadow-2xs transition hover:border-dailyveg-300 hover:text-dailyveg-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                                >
                                    <Hash className="h-3 w-3 text-dailyveg-600" />
                                    <span>{order.operational_order_code}</span>
                                    <Copy className="h-3 w-3 opacity-60" />
                                </button>
                            )}
                        </div>

                        {/* 4-Tile KPI Strip (2x2 on Mobile, 4 cols on Desktop) */}
                        <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            <div className="rounded-xl border border-dailyveg-200/70 bg-white/90 p-3 shadow-2xs dark:border-dailyveg-900/50 dark:bg-slate-900/80">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-dailyveg-700 dark:text-dailyveg-400">
                                    <IndianRupee className="h-3 w-3" /> Grand Total
                                </div>
                                <div className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                    {money(order.grand_total_paise || order.total_paise)}
                                </div>
                                <div className="mt-0.5 text-[11px] font-medium text-slate-500 capitalize">
                                    {order.payment_method || "—"} · {String(order.payment_status || "—").replaceAll("_", " ")}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <Package className="h-3 w-3 text-indigo-500" /> Basket Size
                                </div>
                                <div className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                    {items.length} <span className="text-xs font-semibold text-slate-500">{items.length === 1 ? "item" : "items"}</span>
                                </div>
                                <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                                    Total Qty: {formatQuantity(totalQuantitySum)}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <CalendarDays className="h-3 w-3 text-amber-500" /> Delivery Date
                                </div>
                                <div className="mt-1 text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                    {formatIndianDateTime(order.delivery_date) || "—"}
                                </div>
                                <div className="mt-0.5 text-[11px] font-medium text-slate-500 truncate">
                                    {order.address?.area || order.address?.city || "Standard Slot"}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <Warehouse className="h-3 w-3 text-cyan-600" /> Warehouse
                                </div>
                                <div className="mt-1 text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                    {order.warehouse?.name || "Unassigned"}
                                </div>
                                <div className="mt-0.5 text-[11px] font-medium text-slate-500 truncate">
                                    {order.delivery_partner?.full_name ? `Rider: ${order.delivery_partner.full_name}` : "No rider assigned"}
                                </div>
                            </div>
                        </div>

                        {/* Payment & Charges Side-by-Side Sub-Cards */}
                        <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
                            {/* Payment Details Card */}
                            <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white/90 p-3.5 sm:p-4 shadow-2xs backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 min-w-0">
                                <div>
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                                <CreditCard className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                                Payment Details
                                            </span>
                                        </div>
                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                            {order.payment_method || "—"}
                                        </span>
                                    </div>

                                    <div className="mt-3 space-y-2.5 text-xs sm:text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500 font-medium">Payment Status</span>
                                            <StatusBadge value={order.payment_status || "—"} />
                                        </div>

                                        {isOnlinePaymentMethod(order.payment_method) ? (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">Refund Status</span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {getRefundStatusDisplay(paymentAudit.refund_status || order.refund_status)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-slate-500 font-medium shrink-0">Refund ID</span>
                                                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                                                        {paymentAudit.refund_id || paymentAudit.refunds?.[0]?.refund_id || paymentAudit.refunds?.[0]?.id || "—"}
                                                    </span>
                                                </div>
                                                {paymentAudit.refund_failure_reason || paymentAudit.refunds?.[0]?.failure_reason ? (
                                                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/80 p-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                                                        <span className="font-bold">Refund Failure: </span>
                                                        {paymentAudit.refund_failure_reason || paymentAudit.refunds?.[0]?.failure_reason}
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : (
                                            <div className="mt-3 space-y-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                    <span>Checkout choice</span><span className="font-semibold text-slate-800 dark:text-slate-200">COD</span>
                                                    <span>Collection state</span><span className="font-semibold text-slate-800 dark:text-slate-200">{codCollection.state}</span>
                                                    {codCollection.payment ? <><span>Amount collected</span><span className="font-semibold text-slate-800 dark:text-slate-200">{money(codCollection.payment.amount_paise)}</span></> : null}
                                                    {codCollection.payment?.collected_at ? <><span>Collected at</span><span className="font-semibold text-slate-800 dark:text-slate-200">{formatIndianDateTime(codCollection.payment.collected_at)}</span></> : null}
                                                    {codCollection.payment?.collected_by_user_id ? <><span>Cash collector ID</span><span className="font-mono text-slate-800 dark:text-slate-200">{codCollection.payment.collected_by_user_id}</span></> : null}
                                                    {codCollection.payment?.provider_payment_id ? <><span>Razorpay payment ID</span><span className="font-mono text-slate-800 dark:text-slate-200 truncate">{codCollection.payment.provider_payment_id}</span></> : null}
                                                    {codCollection.payment?.payment_attempt_id ? <><span>Payment attempt ID</span><span className="font-mono text-slate-800 dark:text-slate-200 truncate">{codCollection.payment.payment_attempt_id}</span></> : null}
                                                </div>
                                                <p>COD checkout payment; gateway refund workflow is not available here.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Charges Breakdown Card */}
                            <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white/90 p-3.5 sm:p-4 shadow-2xs backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 min-w-0">
                                <div>
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                                                <Receipt className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                                Bill Summary
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-400">INR (₹)</span>
                                    </div>

                                    <div className="mt-3 space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-medium">Item Subtotal</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{money(order.subtotal_paise)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-medium">Delivery Partner Fee</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{money(order.delivery_fee_paise)}</span>
                                        </div>
                                        {Number(order.discount_paise || 0) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Discount Applied</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">-{money(order.discount_paise)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-medium">GST ({order.gst_rate_bps || 0} bps)</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{money(order.gst_amount_paise)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 flex justify-between items-center rounded-lg bg-dailyveg-50/90 px-3 py-2 border border-dailyveg-200/70 dark:bg-dailyveg-950/50 dark:border-dailyveg-900/60">
                                    <span className="text-xs font-bold uppercase tracking-wider text-dailyveg-800 dark:text-dailyveg-200">
                                        Grand Total
                                    </span>
                                    <span className="text-base font-black text-dailyveg-700 dark:text-dailyveg-300">
                                        {money(order.grand_total_paise || order.total_paise)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Admin Cancel Order Action Banner (Rendered ONLY when eligible) */}
                        {isAdmin && canCancelOrder(order) ? (
                            <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-rose-200/90 bg-gradient-to-r from-rose-50 via-rose-50/60 to-white p-3.5 sm:p-4 dark:border-rose-900/60 dark:from-rose-950/50 dark:via-rose-950/30 dark:to-slate-900">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
                                        <Ban className="h-4.5 w-4.5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-rose-900 dark:text-rose-200">
                                            Admin Order Cancellation
                                        </div>
                                        <div className="mt-0.5 text-xs text-rose-700/90 dark:text-rose-300/80">
                                            Cancelling updates order status immediately. Online paid orders automatically trigger a refund if eligible.
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full sm:w-auto shrink-0"
                                    onClick={() => setCancelOpen(true)}
                                    disabled={cancelMut.isPending}
                                >
                                    {cancelMut.isPending ? "Cancelling..." : "Cancel Order"}
                                </Button>
                            </div>
                        ) : null}
                    </Card>

                    {/* Order Items Card (Mobile Product Cards + Desktop Table) */}
                    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dailyveg-50 text-dailyveg-600 ring-1 ring-dailyveg-500/20 dark:bg-dailyveg-950/60 dark:text-dailyveg-400">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            Ordered Items
                                        </h3>
                                        <span className="rounded-full bg-dailyveg-100 px-2.5 py-0.5 text-xs font-extrabold text-dailyveg-800 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                            {filteredItems.length}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {items.length} line {items.length === 1 ? "item" : "items"} · Total Qty: {formatQuantity(totalQuantitySum)}
                                    </p>
                                </div>
                            </div>

                            {items.length > 2 && (
                                <div className="relative w-full sm:w-64">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={itemSearch}
                                        onChange={(e) => setItemSearch(e.target.value)}
                                        placeholder="Filter items by name or pack..."
                                        className="h-9 pl-9 text-xs sm:text-sm rounded-xl"
                                    />
                                </div>
                            )}
                        </div>

                        {filteredItems.length === 0 ? (
                            <div className="py-10 text-center text-sm text-slate-500">
                                No matching items found in this order.
                            </div>
                        ) : (
                            <>
                                {/* Mobile Product Cards (< md) */}
                                <div className="mt-4 space-y-2.5 md:hidden">
                                    {filteredItems.map((it, idx) => {
                                        const img = pickFirstImageUrl(it);
                                        return (
                                            <div
                                                key={it.id || idx}
                                                className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800/80 dark:bg-slate-900/40"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                                        {img ? (
                                                            <img
                                                                src={assetUrl(img)}
                                                                alt={it.product_name}
                                                                className="h-full w-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <Package className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                                                            {it.product_name || "Unnamed Product"}
                                                        </div>
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                            {it.pack_label && (
                                                                <span className="inline-flex items-center rounded-md bg-dailyveg-50 px-2 py-0.5 text-[11px] font-bold text-dailyveg-700 border border-dailyveg-200/60 dark:bg-dailyveg-950/60 dark:text-dailyveg-300 dark:border-dailyveg-800/60">
                                                                    Pack: {it.pack_label}
                                                                </span>
                                                            )}
                                                            {it.unit && (
                                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                    Unit: {it.unit}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200/60 dark:bg-slate-950/80 dark:border-slate-800/80">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                                            Qty: {formatQuantity(it.quantity)}
                                                        </span>
                                                        <span className="text-slate-400">×</span>
                                                        <span className="font-medium text-slate-600 dark:text-slate-400">
                                                            {money(it.unit_price_paise)}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-black text-dailyveg-700 dark:text-dailyveg-400">
                                                        {money(it.line_total_paise)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Clean Table (>= md) */}
                                <div className="mt-4 hidden md:block overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3">Product</th>
                                                <th className="px-4 py-3">Pack / Unit</th>
                                                <th className="px-4 py-3 text-center">Qty</th>
                                                <th className="px-4 py-3 text-right">Unit Price</th>
                                                <th className="px-4 py-3 text-right">Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                                            {filteredItems.map((it, idx) => {
                                                const img = pickFirstImageUrl(it);
                                                return (
                                                    <tr key={it.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                                                    {img ? (
                                                                        <img src={assetUrl(img)} alt={it.product_name} className="h-full w-full object-cover" loading="lazy" />
                                                                    ) : (
                                                                        <Package className="h-5 w-5 text-slate-300 dark:text-slate-700" />
                                                                    )}
                                                                </div>
                                                                <span className="font-bold text-slate-900 dark:text-white">
                                                                    {it.product_name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="rounded-md bg-dailyveg-50 px-2 py-0.5 text-xs font-semibold text-dailyveg-700 dark:bg-dailyveg-950/60 dark:text-dailyveg-300">
                                                                    {it.pack_label || "—"}
                                                                </span>
                                                                {it.unit && (
                                                                    <span className="text-xs text-slate-500">({it.unit})</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                                                {formatQuantity(it.quantity)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                                                            {money(it.unit_price_paise)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                                            {money(it.line_total_paise)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Order Status Timeline */}
                    <OrderStatusTimeline
                        items={order.status_timeline}
                        currentStatus={order.status}
                        currentStatusAt={order.current_status_at}
                        isLoading={query.isLoading}
                    />

                    {/* Delivery Proof Image Card */}
                    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                                    <Camera className="h-4.5 w-4.5" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                        Delivery Proof Image
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Photo verification uploaded at doorstep drop-off
                                    </p>
                                </div>
                            </div>
                            {order.delivery_proof_image_url ? (
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                                    <a
                                        href={assetUrl(order.delivery_proof_image_url)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        <span>Full Size</span>
                                    </a>
                                </Button>
                            ) : null}
                        </div>

                        <div className="mt-4">
                            {order.delivery_proof_image_url ? (
                                <div className="w-full sm:max-w-sm rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/60">
                                    <a
                                        href={assetUrl(order.delivery_proof_image_url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group relative block overflow-hidden rounded-xl"
                                        title="Tap to view original image"
                                    >
                                        <div className="flex h-60 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-950/60 p-1">
                                            <img
                                                src={assetUrl(order.delivery_proof_image_url)}
                                                alt="Delivery Proof"
                                                className="h-full w-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
                                            <span className="flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-sm">
                                                <ExternalLink className="h-3.5 w-3.5" /> Tap to enlarge
                                            </span>
                                        </div>
                                    </a>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 px-4 text-center dark:border-slate-800 dark:bg-slate-900/30">
                                    <Camera className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        No delivery proof uploaded yet
                                    </div>
                                    <div className="mt-0.5 text-xs text-slate-500 max-w-xs">
                                        Once the delivery partner uploads a proof photo, it will appear here automatically.
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Customer, Address, Delivery Partner, Metadata, Payment Audit */}
                <div className="space-y-4 min-w-0 max-w-full">
                    {/* Customer Card */}
                    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-dailyveg-50 text-dailyveg-600 dark:bg-dailyveg-950/60 dark:text-dailyveg-400">
                                    <User className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                    Customer Profile
                                </h3>
                            </div>
                        </div>

                        <div className="mt-3.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                                    {order.user?.full_name || "Guest Customer"}
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{order.user?.phone || "No phone"}</span>
                                </div>
                            </div>

                            {order.user?.phone && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl"
                                        onClick={() => copyToClipboard(order.user.phone, "Customer Phone")}
                                        title="Copy Phone"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="h-9 rounded-xl gap-1.5 bg-dailyveg-600 hover:bg-dailyveg-700 text-white"
                                        asChild
                                    >
                                        <a href={`tel:${order.user.phone}`}>
                                            <Phone className="h-3.5 w-3.5" />
                                            <span>Call</span>
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Delivery Address Card */}
                    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                    Delivery Address
                                </h3>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {order.address?.label && (
                                    <span className="rounded-lg bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50">
                                        {order.address.label}
                                    </span>
                                )}
                                {formattedFullAddress && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-500 hover:text-dailyveg-600"
                                        onClick={() => copyToClipboard(formattedFullAddress, "Delivery Address")}
                                        title="Copy Full Address"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="mt-3.5 space-y-2.5 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {order.address?.name || order.user?.full_name || "—"}
                                </span>
                                {order.address?.phone && (
                                    <a
                                        href={`tel:${order.address.phone}`}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-dailyveg-600 hover:underline dark:text-dailyveg-400"
                                    >
                                        <Phone className="h-3 w-3" />
                                        {order.address.phone}
                                    </a>
                                )}
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3 text-xs sm:text-sm leading-relaxed text-slate-600 border border-slate-200/60 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-300">
                                <div>
                                    {order.address?.address_line1 || "—"}
                                    {order.address?.address_line2 ? `, ${order.address.address_line2}` : ""}
                                </div>
                                {(order.address?.area || order.address?.landmark) && (
                                    <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                                        {order.address?.area || ""}
                                        {order.address?.landmark ? ` · Landmark: ${order.address.landmark}` : ""}
                                    </div>
                                )}
                                <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                                    {[order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(", ")}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Delivery Partner Card */}
                    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
                                    <Truck className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                    Delivery Partner
                                </h3>
                            </div>
                        </div>

                        <div className="mt-3.5">
                            {order.delivery_partner ? (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                            {order.delivery_partner.full_name || "Assigned Rider"}
                                        </div>
                                        <div className="mt-0.5 text-xs text-slate-500">
                                            {order.delivery_partner.phone || "No phone"}
                                        </div>
                                        {order.delivery_assigned_at && (
                                            <div className="mt-1 text-[11px] text-slate-400">
                                                Assigned: {formatIndianDateTime(order.delivery_assigned_at)}
                                            </div>
                                        )}
                                    </div>
                                    {order.delivery_partner.phone && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 rounded-xl gap-1.5 shrink-0"
                                            asChild
                                        >
                                            <a href={`tel:${order.delivery_partner.phone}`}>
                                                <Phone className="h-3.5 w-3.5 text-dailyveg-600" />
                                                <span>Call</span>
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/30">
                                    <Truck className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span>No delivery partner assigned to this order yet.</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Order Metadata Card */}
                    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                                    <Hash className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                    System Metadata
                                </h3>
                            </div>
                        </div>

                        <div className="mt-3.5 space-y-2.5 text-xs sm:text-sm">
                            {order.operational_order_code && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Operational Code</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(order.operational_order_code, "Operational Code")}
                                        className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-dailyveg-600 dark:text-slate-200"
                                    >
                                        <span>{order.operational_order_code}</span>
                                        <Copy className="h-3 w-3 opacity-60" />
                                    </button>
                                </div>
                            )}
                            {dailyLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Daily Sequence</span>
                                    <span className="rounded bg-dailyveg-100 px-2 py-0.5 text-xs font-extrabold text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                                        {dailyLabel}
                                    </span>
                                </div>
                            )}
                            {order.order_number && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 font-medium">Customer Ref</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(order.order_number, "Customer Ref")}
                                        className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800 hover:text-dailyveg-600 dark:text-slate-200"
                                    >
                                        <span>{order.order_number}</span>
                                        <Copy className="h-3 w-3 opacity-60" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium shrink-0">Internal UUID</span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(order.id, "Internal Order ID")}
                                    className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-dailyveg-600 dark:text-slate-400 truncate max-w-[165px]"
                                    title="Copy Internal UUID"
                                >
                                    <span className="truncate">{order.id}</span>
                                    <Copy className="h-3 w-3 shrink-0 opacity-70" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                                <span className="text-slate-500 font-medium">Created At</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {formatIndianDateTime(order.created_at) || "—"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium">Last Updated</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {formatIndianDateTime(order.updated_at) || "—"}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Payment Audit Card (Admin Only) */}
                    {isAdmin ? (
                        <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                                        <ShieldAlert className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                        Payment Audit
                                    </h3>
                                </div>
                            </div>

                            {paymentAuditQuery.isLoading ? (
                                <div className="mt-3 text-xs text-slate-500">Loading payment audit…</div>
                            ) : paymentAuditQuery.data ? (
                                <div className="mt-3.5 space-y-3 text-xs sm:text-sm">
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-200/60 dark:bg-slate-900/60 dark:border-slate-800">
                                            <div className="text-[10px] font-semibold uppercase text-slate-400">Retry</div>
                                            <div className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                                                {paymentAudit.retry_allowed ? "Allowed" : "No"}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-200/60 dark:bg-slate-900/60 dark:border-slate-800">
                                            <div className="text-[10px] font-semibold uppercase text-slate-400">Attempts</div>
                                            <div className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                                                {(paymentAudit.payment_attempts || []).length}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-200/60 dark:bg-slate-900/60 dark:border-slate-800">
                                            <div className="text-[10px] font-semibold uppercase text-slate-400">Refunds</div>
                                            <div className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                                                {(paymentAudit.refunds || []).length}
                                            </div>
                                        </div>
                                    </div>

                                    {String(order?.payment_method || "").toLowerCase() === "cod" && deliveryQrAttempts.map((attempt) => (
                                        <div key={attempt.id || attempt.payment_attempt_id || attempt.provider_qr_id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
                                            <div className="font-bold text-slate-700 dark:text-slate-300">Delivery UPI QR audit</div>
                                            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                                                <span>Status</span><span className="font-semibold">{attempt.status || "—"}</span>
                                                <span>QR ID</span><span className="font-mono truncate">{attempt.provider_qr_id || "—"}</span>
                                                <span>QR status</span><span>{attempt.provider_qr_status || "—"}</span>
                                                <span>QR expiry</span><span>{formatIndianDateTime(attempt.provider_qr_expires_at) || "—"}</span>
                                                <span>Payment ID</span><span className="font-mono truncate">{attempt.provider_payment_id || "—"}</span>
                                                <span>Amount</span><span>{money(attempt.amount_paise)} {attempt.currency || "INR"}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {canRetryRefund(order, paymentAudit) ? (
                                        <Button
                                            className="w-full"
                                            onClick={() => setRefundOpen(true)}
                                            disabled={refundMut.isPending}
                                        >
                                            {refundMut.isPending ? "Processing refund..." : "Initiate / Retry Refund"}
                                        </Button>
                                    ) : null}
                                </div>
                            ) : null}
                        </Card>
                    ) : null}
                </div>
            </div>

            {/* Initiate Refund Modal */}
            <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Initiate / Retry Refund</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-3">
                        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs sm:text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                            This sends a refund request to the payment gateway. If a refund is already pending or failed, this safely retries the process.
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Reason (optional)</Label>
                            <Input
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                placeholder="Customer cancellation approved"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                        <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setRefundOpen(false)} disabled={refundMut.isPending}>
                            Close
                        </Button>
                        <Button className="w-full sm:w-auto" onClick={() => refundMut.mutate()} disabled={refundMut.isPending}>
                            {refundMut.isPending ? "Processing..." : "Confirm Refund"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Order Modal */}
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Order {dailyLabel || primaryLabel}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-3">
                        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs sm:text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                            Cancelling this order will immediately mark it as Cancelled. For online paid orders, an automatic refund will be initiated if eligible.
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Cancellation Reason / Note</Label>
                            <Input
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Customer requested cancellation"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                        <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setCancelOpen(false)} disabled={cancelMut.isPending}>
                            Keep Order
                        </Button>
                        <Button className="w-full sm:w-auto" variant="destructive" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
                            {cancelMut.isPending ? "Cancelling..." : "Confirm Cancel"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
