import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { OpsOrdersService } from "../../../api/services/ops-orders.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { DataTable } from "../../../components/common/data-table";
import { StatusBadge } from "../../../components/common/status-badge";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { OpsOrderPdf } from "./ops-order-pdf";

function money(paise) {
    const n = Number(paise || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "INR" });
}

function pickFirstImageUrl(item) {
    const images = item?.product?.images || [];
    return images.length ? images[0].image_url : null;
}

export function OpsOrderDetailPage() {
    const { orderId } = useParams();

    const query = useQuery({
        queryKey: ["opsOrder", orderId],
        queryFn: () => OpsOrdersService.getById(orderId),
        enabled: !!orderId,
    });

    const order = query.data?.order || null;

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
                    <div className="flex gap-2">
                        <PDFDownloadLink
                            document={<OpsOrderPdf order={order} />}
                            fileName={`order_${order.order_number || order.id}.pdf`}
                        >
                            {({ loading }) => (
                                <Button variant="default" disabled={loading}>
                                    {loading ? "Preparing..." : "Download PDF"}
                                </Button>
                            )}
                        </PDFDownloadLink>
                        
                        <Button variant="secondary" asChild>
                            <Link to="/ops/orders">Back</Link>
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="p-4 lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className="text-sm text-slate-500">Status</div>
                            <div className="mt-1">
                                <StatusBadge value={order.status} />
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm text-slate-500">Total</div>
                            <div className="mt-1 text-lg font-semibold">{money(order.total_paise)}</div>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Payment</div>
                            <div className="mt-1 text-sm">
                                <div><span className="font-medium">Method:</span> {order.payment_method || "—"}</div>
                                <div><span className="font-medium">Status:</span> {order.payment_status || "—"}</div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Charges</div>
                            <div className="mt-1 text-sm">
                                <div><span className="font-medium">Subtotal:</span> {money(order.subtotal_paise)}</div>
                                <div><span className="font-medium">Delivery Fee:</span> {money(order.delivery_fee_paise)}</div>
                                <div><span className="font-medium">Discount:</span> {money(order.discount_paise)}</div>
                                <div><span className="font-medium">GST:</span> {money(order.gst_amount_paise)} ({order.gst_rate_bps || 0} bps)</div>
                                <div><span className="font-medium">Grand Total:</span> {money(order.grand_total_paise || order.total_paise)}</div>
                            </div>
                        </div>
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
                </Card>

                <Card className="p-4">
                    <h3 className="text-sm font-semibold">Customer</h3>
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

                    <h3 className="mt-5 text-sm font-semibold">Meta</h3>
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <div><span className="font-medium text-slate-700 dark:text-slate-200">Locked:</span> {order.is_locked ? "Yes" : "No"}</div>
                        <div><span className="font-medium text-slate-700 dark:text-slate-200">Created:</span> {order.created_at}</div>
                        <div><span className="font-medium text-slate-700 dark:text-slate-200">Updated:</span> {order.updated_at}</div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
