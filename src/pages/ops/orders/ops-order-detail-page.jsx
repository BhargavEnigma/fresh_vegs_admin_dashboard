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
import { RefreshCw, AlertTriangle, Copy } from "lucide-react";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { DataTable } from "../../../components/common/data-table";
import { StatusBadge } from "../../../components/common/status-badge";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { OpsOrderPdf } from "./ops-order-pdf";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { OrderStatusTimeline } from "../../../components/orders/order-status-timeline";
import { getOrderStatusLabel } from "../../../utils/order-status-timeline";
import { cn, formatQuantity } from "../../../lib/utils";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../utils/order-identifier";

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

    const items = order?.items || [];

    const itemColumns = useMemo(
        () => [
            {
                id: "product",
                header: "Product",
                cell: ({ row }) => {
                    const it = row.original;
                    const img = pickFirstImageUrl(it);
                    return (
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                {img ? (
                                    <img src={img} alt={it.product_name} className="h-full w-full object-cover" />
                                ) : null}
                            </div>
                            <div>
                                <div className="font-medium">{it.product_name}</div>
                                <div className="text-xs text-slate-500">
                                    Pack: {it.pack_label || "—"} · Unit: {it.unit || "—"}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: "quantity",
                header: "Qty",
                cell: ({ row }) => <span className="font-medium">{formatQuantity(row.original.quantity)}</span>,
            },
            {
                id: "unit_price_paise",
                header: "Unit Price",
                cell: ({ row }) => money(row.original.unit_price_paise),
            },
            {
                id: "line_total_paise",
                header: "Line Total",
                cell: ({ row }) => <span className="font-medium">{money(row.original.line_total_paise)}</span>,
            },
        ],
        []
    );

    if (query.isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-28" />
                        <Skeleton className="h-10 w-20" />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="p-4 space-y-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-10 w-32" />
                                <Skeleton className="h-10 w-24" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Skeleton className="h-28 w-full" />
                                <Skeleton className="h-28 w-full" />
                            </div>
                        </Card>
                        
                        <Card className="p-4">
                            <Skeleton className="h-6 w-40 mb-4" />
                            <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </Card>
                    </div>

                    <Card className="p-4 space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (query.isError) {
        const errorMsg = getApiErrorMessage(query.error);
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Order Details"
                    subtitle="Error loading order"
                    actions={
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <Button onClick={() => query.refetch()} disabled={query.isRefetching}>
                                {query.isRefetching ? "Retrying..." : "Retry"}
                            </Button>
                            <Button variant="secondary" asChild>
                                <Link to="/ops/orders">Back to Orders</Link>
                            </Button>
                        </div>
                    }
                />
                <Card className="p-6 border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 text-center flex flex-col items-center">
                    <AlertTriangle className="h-12 w-12 text-red-650 dark:text-red-400 mb-2" aria-hidden="true" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Unable to load order details.
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-md">
                        {errorMsg}
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={
                    getDailyOrderLabel(order)
                        ? `Order ${getDailyOrderLabel(order)}`
                        : `Order ${getPrimaryOrderLabel(order)}`
                }
                subtitle={
                    getDailyOrderLabel(order)
                        ? `${getPrimaryOrderLabel(order)} · Delivery: ${formatIndianDateTime(order.delivery_date)} · Warehouse: ${order.warehouse?.name || "—"}`
                        : `Delivery: ${formatIndianDateTime(order.delivery_date)} · Warehouse: ${order.warehouse?.name || "—"}`
                }
                actions={
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <Button
                            className="w-full sm:w-auto gap-2"
                            variant="outline"
                            onClick={() => query.refetch()}
                            disabled={query.isRefetching}
                        >
                            <RefreshCw className={cn("h-4 w-4", query.isRefetching && "animate-spin")} />
                            Refresh
                        </Button>

                        <PDFDownloadLink
                            document={<OpsOrderPdf order={order} />}
                            fileName={
                                order.operational_order_code
                                    ? `order_${order.operational_order_code}.pdf`
                                    : `order_${order.order_number || order.id}.pdf`
                            }
                        >
                            {({ loading }) => (
                                <Button className="w-full sm:w-auto" variant="default" disabled={loading}>
                                    {loading ? "Preparing..." : "Download PDF"}
                                </Button>
                            )}
                        </PDFDownloadLink>

                        <Button className="w-full sm:w-auto" variant="secondary" asChild>
                            <Link to="/ops/orders">Back</Link>
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="p-4 lg:col-span-2 min-w-0 max-w-full">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
                            <div>
                                <div className="text-sm text-slate-500">Current status</div>
                                <div className="mt-1">
                                    <StatusBadge value={order.status} label={getOrderStatusLabel(order.status)} />
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">Last changed</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {order.current_status_at ? formatOrderStatusDateTime(order.current_status_at) : "Time unavailable"}
                                </div>
                            </div>
                        </div>

                        <div className="text-left sm:text-right">
                            <div className="text-sm text-slate-500">Total</div>
                            <div className="mt-1 text-lg font-semibold">{money(order.total_paise)}</div>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 min-w-0">
                            <div className="text-xs text-slate-500">Payment</div>
                            <div className="mt-1 text-sm space-y-2">
                                <div><span className="font-medium">Method:</span> {order.payment_method || "—"}</div>
                                <div><span className="font-medium">Status:</span> {order.payment_status || "—"}</div>
                                {isOnlinePaymentMethod(order.payment_method) ? (
                                    <>
                                        <div><span className="font-medium">Refund Status:</span> {getRefundStatusDisplay(paymentAudit.refund_status || order.refund_status)}</div>
                                        <div><span className="font-medium">Refund ID:</span> {paymentAudit.refund_id || paymentAudit.refunds?.[0]?.refund_id || paymentAudit.refunds?.[0]?.id || "—"}</div>
                                        <div><span className="font-medium">Refund Failure:</span> {paymentAudit.refund_failure_reason || paymentAudit.refunds?.[0]?.failure_reason || "—"}</div>
                                    </>
                                ) : (
                                    <div className="text-slate-600 dark:text-slate-400">Refund not required for COD orders.</div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 min-w-0">
                            <div className="text-xs text-slate-500">Charges</div>
                            <div className="mt-1 text-sm space-y-2">
                                <div><span className="font-medium">Subtotal:</span> {money(order.subtotal_paise)}</div>
                                <div><span className="font-medium">Delivery Fee:</span> {money(order.delivery_fee_paise)}</div>
                                <div><span className="font-medium">Discount:</span> {money(order.discount_paise)}</div>
                                <div><span className="font-medium">GST:</span> {money(order.gst_amount_paise)} ({order.gst_rate_bps || 0} bps)</div>
                                <div><span className="font-medium">Grand Total:</span> {money(order.grand_total_paise || order.total_paise)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 min-w-0">
                        {isAdmin && canCancelOrder(order) ? (
                            <div className="flex flex-col gap-3">
                                <div className="text-sm font-semibold">Admin Actions</div>
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
                                    <div className="font-medium">Cancel Order</div>
                                    <div className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                                        Cancelling will follow backend validation rules. For online paid orders, refund will be initiated automatically if eligible.
                                    </div>
                                    <div className="mt-3">
                                        <Button
                                            variant="destructive"
                                            onClick={() => setCancelOpen(true)}
                                            disabled={cancelMut.isPending}
                                        >
                                            {cancelMut.isPending ? "Cancelling..." : "Cancel Order"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="mt-6">
                        <OrderStatusTimeline
                            items={order.status_timeline}
                            currentStatus={order.status}
                            currentStatusAt={order.current_status_at}
                            isLoading={query.isLoading}
                        />
                    </div>

                    <div className="mt-6">
                        <h3 className="mb-2 text-sm font-semibold">Items</h3>
                        <DataTable
                            columns={itemColumns}
                            data={items}
                            searchPlaceholder="Search items…"
                            initialPageSize={10}
                        />
                    </div>

                    <div className="mt-6">
                        <h3 className="mb-2 text-sm font-semibold">
                            Delivery Proof Image
                        </h3>

                        {order.delivery_proof_image_url ? (
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                                <img
                                    src={order.delivery_proof_image_url}
                                    alt="Delivery Proof"
                                    className="w-full max-w-full object-contain rounded-md"
                                />
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">
                                No delivery proof image available.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-4 min-w-0 max-w-full">
                    <div className="space-y-5">
                        <div>
                            <h3 className="text-sm font-semibold">Customer</h3>
                            <div className="mt-2 space-y-2 text-sm">
                                <div className="font-medium">{order.user?.full_name || "—"}</div>
                                <div className="text-slate-500">{order.user?.phone || "—"}</div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold">Delivery Address</h3>
                            <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                <div className="font-medium">{order.address?.label || "—"}</div>
                                <div>{order.address?.name || "—"} · {order.address?.phone || "—"}</div>
                                <div className="text-slate-500 dark:text-slate-400">
                                    {order.address?.address_line1 || ""}{order.address?.address_line2 ? `, ${order.address.address_line2}` : ""}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">
                                    {order.address?.area || ""}{order.address?.landmark ? `, ${order.address.landmark}` : ""}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">
                                    {order.address?.city || ""}, {order.address?.state || ""} {order.address?.pincode || ""}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold">Delivery Partner</h3>
                            <div className="mt-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                                {order.delivery_partner ? (
                                    <div className="space-y-2">
                                        <div className="font-medium">{order.delivery_partner.full_name || "—"}</div>
                                        <div className="text-slate-500">{order.delivery_partner.phone || "—"}</div>
                                        <div className="text-xs text-slate-500">
                                            Assigned at: {formatIndianDateTime(order.delivery_assigned_at)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-500">Not assigned</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold">Meta</h3>
                            <div className="mt-2 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                                {order.operational_order_code && (
                                    <div>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">Operational code:</span>{" "}
                                        <span className="font-mono text-slate-800 dark:text-slate-200">{order.operational_order_code}</span>
                                    </div>
                                )}
                                {order.daily_order_number !== null && order.daily_order_number !== undefined && (
                                    <div>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">Daily number:</span>{" "}
                                        <span className="font-bold text-dailyveg-700 dark:text-dailyveg-300">{getDailyOrderLabel(order)}</span>
                                    </div>
                                )}
                                {order.order_number && (
                                    <div>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">Customer order reference:</span>{" "}
                                        <span className="font-mono text-slate-800 dark:text-slate-200">{order.order_number}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-700 dark:text-slate-200">Internal order ID:</span>{" "}
                                    <span className="font-mono text-xs truncate max-w-[150px]">{order.id}</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(order.id);
                                            toast.push({
                                                variant: "success",
                                                title: "Internal ID copied",
                                                description: "The order's internal ID has been copied to clipboard.",
                                            });
                                        }}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        title="Copy Internal ID"
                                    >
                                        <Copy className="h-3.5 w-3.5 inline-block" />
                                    </button>
                                </div>
                                <div><span className="font-medium text-slate-700 dark:text-slate-200">Locked:</span> {order.is_locked ? "Yes" : "No"}</div>
                                <div><span className="font-medium text-slate-700 dark:text-slate-200">Created:</span> {formatIndianDateTime(order.created_at)}</div>
                                <div><span className="font-medium text-slate-700 dark:text-slate-200">Record updated:</span> {formatIndianDateTime(order.updated_at)}</div>
                                <div><span className="font-medium text-slate-700 dark:text-slate-200">Current status since:</span> {order.current_status_at ? formatOrderStatusDateTime(order.current_status_at) : "Time unavailable"}</div>
                            </div>
                        </div>
                    </div>

                    {isAdmin ? (
                        <div className="mt-5">
                            <h3 className="text-sm font-semibold">Payment Audit</h3>

                            {paymentAuditQuery.isLoading ? (
                                <div className="mt-2 text-sm text-slate-500">Loading payment audit…</div>
                            ) : paymentAuditQuery.data ? (
                                <div className="mt-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                                    <div><span className="font-medium">Payment Status:</span> {paymentAudit.payment_status || order.payment_status || "—"}</div>
                                    <div><span className="font-medium">Refund Status:</span> {getRefundStatusDisplay(paymentAudit.refund_status || order.refund_status)}</div>
                                    <div><span className="font-medium">Refund ID:</span> {paymentAudit.refund_id || paymentAudit.refunds?.[0]?.refund_id || paymentAudit.refunds?.[0]?.id || "—"}</div>
                                    <div><span className="font-medium">Refund Failure:</span> {paymentAudit.refund_failure_reason || paymentAudit.refunds?.[0]?.failure_reason || "—"}</div>
                                    <div><span className="font-medium">Retry Allowed:</span> {paymentAudit.retry_allowed ? "Yes" : "No"}</div>
                                    <div><span className="font-medium">Attempts:</span> {(paymentAudit.payment_attempts || []).length}</div>
                                    <div><span className="font-medium">Refund Rows:</span> {(paymentAudit.refunds || []).length}</div>

                                    {(paymentAudit.latest_payment_attempt || null) ? (
                                        <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900">
                                            <div className="font-semibold">Latest Attempt</div>
                                            <pre className="mt-2 overflow-auto whitespace-pre-wrap thin-scrollbar">
                                                {JSON.stringify(paymentAudit.latest_payment_attempt, null, 2)}
                                            </pre>
                                        </div>
                                    ) : null}

                                    {canRetryRefund(order, paymentAudit) ? (
                                        <div className="mt-3">
                                            <Button onClick={() => setRefundOpen(true)} disabled={refundMut.isPending}>
                                                {refundMut.isPending ? "Processing refund..." : "Initiate / Retry Refund"}
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </Card>
            </div>

            <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Initiate Refund</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                            This will send a refund request to the backend. If refund is already pending or failed, this retries the process.
                        </div>
                        <Label>Reason (optional)</Label>
                        <Input
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="Customer cancellation approved"
                        />
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => setRefundOpen(false)} disabled={refundMut.isPending}>
                            Close
                        </Button>
                        <Button onClick={() => refundMut.mutate()} disabled={refundMut.isPending}>
                            {refundMut.isPending ? "Processing..." : "Confirm Refund"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Order</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                            Cancelling the order will update its status. For online paid orders, refund will be initiated automatically when eligible.
                        </div>
                        <Label>Cancellation Reason / Note</Label>
                        <Input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Customer requested cancellation"
                        />
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={cancelMut.isPending}>
                            Close
                        </Button>
                        <Button variant="destructive" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
                            {cancelMut.isPending ? "Cancelling..." : "Confirm Cancel"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
