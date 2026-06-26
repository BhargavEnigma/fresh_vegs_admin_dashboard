import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../../auth/auth-context";
import { useToast } from "../../../components/toast/toast-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { AdminOrdersService } from "../../../api/services/admin-orders.service";
import { OpsOrdersService } from "../../../api/services/ops-orders.service";
import { Link, useParams } from "react-router-dom";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { DataTable } from "../../../components/common/data-table";
import { StatusBadge } from "../../../components/common/status-badge";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { OpsOrderPdf } from "./ops-order-pdf";
import { Label } from "../../../components/ui/label";

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
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} [order_number]
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
        onSuccess: () => {
            toast.push({
                variant: "success",
                title: "Refund initiated",
                description: "Refund request sent successfully.",
            });
            setRefundOpen(false);
            setRefundReason("");
            paymentAuditQuery.refetch();
            query.refetch();
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
        onSuccess: () => {
            toast.push({
                variant: "success",
                title: "Order cancelled",
                description: "Order cancellation completed successfully.",
            });
            setCancelOpen(false);
            setCancelReason("");
            paymentAuditQuery.refetch();
            query.refetch();
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
                cell: ({ row }) => <span className="font-medium">{row.original.quantity}</span>,
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
            <div>
                <PageHeader title="Order Details" subtitle="Loading..." />
                <Card className="p-4">Loading order…</Card>
            </div>
        );
    }

    if (!order) {
        return (
            <div>
                <PageHeader
                    title="Order Details"
                    subtitle="Order not found"
                    actions={
                        <Button variant="secondary" asChild>
                            <Link to="/ops/orders">Back</Link>
                        </Button>
                    }
                />
                <Card className="p-4">No order data available.</Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={`Order ${order.order_number || order.id}`}
                subtitle={`Delivery: ${order.delivery_date || "—"} · Warehouse: ${order.warehouse?.name || "—"}`}
                actions={
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <PDFDownloadLink
                            document={<OpsOrderPdf order={order} />}
                            fileName={`order_${order.order_number || order.id}.pdf`}
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
                        <div>
                            <div className="text-sm text-slate-500">Status</div>
                            <div className="mt-1">
                                <StatusBadge value={order.status} />
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
                                            Assigned at: {order.delivery_assigned_at || "—"}
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
                                <div><span className="font-medium text-slate-700 dark:text-slate-200">Locked:</span> {order.is_locked ? "Yes" : "No"}</div>
                                <div><span className="font-medium text-slate-700 dark:text-slate-200">Created:</span> {order.created_at}</div>
                                <div><span className="font-medium text-slate-700 dark:text-slate-200">Updated:</span> {order.updated_at}</div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-2 text-sm">
                        <div className="font-medium">{order.user?.full_name || "—"}</div>
                        <div className="text-slate-500">{order.user?.phone || "—"}</div>
                    </div>

                    <h3 className="mt-5 text-sm font-semibold">Delivery Address</h3>
                    <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                        <div className="font-medium">{order.address?.label || "—"}</div>
                        <div>{order.address?.name || "—"} · {order.address?.phone || "—"}</div>
                        <div className="mt-1 text-slate-500 dark:text-slate-400">
                            {order.address?.address_line1 || ""}{order.address?.address_line2 ? `, ${order.address.address_line2}` : ""}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                            {order.address?.area || ""}{order.address?.landmark ? `, ${order.address.landmark}` : ""}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                            {order.address?.city || ""}, {order.address?.state || ""} {order.address?.pincode || ""}
                        </div>
                    </div>

                    <h3 className="mt-5 text-sm font-semibold">Delivery Partner</h3>
                    <div className="mt-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                        {order.delivery_partner ? (
                            <>
                                <div className="font-medium">{order.delivery_partner.full_name || "—"}</div>
                                <div className="text-slate-500">{order.delivery_partner.phone || "—"}</div>
                                <div className="mt-2 text-xs text-slate-500">
                                    Assigned at: {order.delivery_assigned_at || "—"}
                                </div>
                            </>
                        ) : (
                            <div className="text-slate-500">Not assigned</div>
                        )}
                    </div>

                    <h3 className="mt-5 text-sm font-semibold">Meta</h3>
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <div><span className="font-medium text-slate-700 dark:text-slate-200">Locked:</span> {order.is_locked ? "Yes" : "No"}</div>
                        <div><span className="font-medium text-slate-700 dark:text-slate-200">Created:</span> {order.created_at}</div>
                        <div><span className="font-medium text-slate-700 dark:text-slate-200">Updated:</span> {order.updated_at}</div>
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
