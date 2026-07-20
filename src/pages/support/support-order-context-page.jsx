import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { formatDate, labelize, money } from "./support-utils";
import { OrderStatusTimeline } from "../../components/orders/order-status-timeline";
import { formatOrderStatusDateTime } from "../../utils/date-formatter";
import { cn } from "../../lib/utils";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../utils/order-identifier";

export function SupportOrderContextPage() {
    const { orderId } = useParams();
    const query = useQuery({
        queryKey: ["support", "orderContext", orderId],
        queryFn: () => SupportService.orderContext(orderId),
    });

    if (query.isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="grid gap-5 lg:grid-cols-3">
                    <Card className="p-4"><Skeleton className="h-24 w-full" /></Card>
                    <Card className="p-4"><Skeleton className="h-24 w-full" /></Card>
                    <Card className="p-4"><Skeleton className="h-24 w-full" /></Card>
                </div>
                <Card className="p-4"><Skeleton className="h-40 w-full" /></Card>
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Order Context"
                    subtitle="Error loading order context"
                    actions={
                        <Button onClick={() => query.refetch()} disabled={query.isRefetching}>
                            {query.isRefetching ? "Retrying..." : "Retry"}
                        </Button>
                    }
                />
                <Card className="p-6 border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 text-center flex flex-col items-center">
                    <AlertTriangle className="h-12 w-12 text-red-650 dark:text-red-400 mb-2" aria-hidden="true" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Unable to load order context.
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Please try again or contact administration if the problem persists.
                    </p>
                </Card>
            </div>
        );
    }

    const order = query.data?.order || {};

    return (
        <div>
             <PageHeader
                title={getPrimaryOrderLabel(order) || "Order Context"}
                subtitle={
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm font-semibold text-slate-955 dark:text-slate-50">
                            <span>{labelize(order.status)}</span>
                            <span className="text-slate-455">•</span>
                            <span className="font-normal text-slate-500">Last changed: {order.current_status_at ? formatOrderStatusDateTime(order.current_status_at) : "Time unavailable"}</span>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Payment: {labelize(order.payment_status)} • Total: {money(order.totals?.grand_total_paise)}
                        </div>
                    </div>
                }
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => query.refetch()}
                        disabled={query.isRefetching}
                        className="gap-2"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", query.isRefetching && "animate-spin")} />
                        Refresh
                    </Button>
                }
            />
            
            <div className="grid gap-5 lg:grid-cols-3">
                <Panel title="Order">
                    {order.operational_order_code && (
                        <Line label="Operational Order" value={order.operational_order_code} />
                    )}
                    {order.daily_order_number !== null && order.daily_order_number !== undefined && (
                        <Line label="Daily Number" value={getDailyOrderLabel(order)} />
                    )}
                    {order.order_number && (
                        <Line label="Customer Reference" value={order.order_number} />
                    )}
                    <Line label="Internal ID" value={order.id} />
                    <Line label="Delivery Date" value={order.delivery_date || "—"} />
                    <Line label="Payment Method" value={labelize(order.payment_method)} />
                    <Line label="Refund Status" value={labelize(order.refund_status)} />
                    <Line label="Warehouse" value={order.warehouse?.name || "—"} />
                </Panel>
                <Panel title="Delivery">
                    <Line label="Partner" value={order.delivery_partner?.full_name || "—"} />
                    <Line label="Picked" value={formatDate(order.delivery?.picked_at)} />
                    <Line label="Delivered" value={formatDate(order.delivery?.delivered_at)} />
                    <Line label="Failure" value={order.delivery?.delivery_failure_reason || "—"} />
                </Panel>
                <Panel title="Address">
                    <Line label="Name" value={order.delivery_address?.name || "—"} />
                    <Line label="Phone" value={order.delivery_address?.phone_masked || "—"} />
                    <div className="text-sm">{[order.delivery_address?.address_line1, order.delivery_address?.address_line2, order.delivery_address?.area, order.delivery_address?.city, order.delivery_address?.pincode].filter(Boolean).join(", ") || "—"}</div>
                </Panel>
            </div>

            <div className="mt-5">
                <OrderStatusTimeline
                    items={order.status_timeline}
                    currentStatus={order.status}
                    currentStatusAt={order.current_status_at}
                    isLoading={query.isLoading}
                />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Panel title="Items">{(order.items || []).map((item) => <Line key={item.id} label={item.product_name || item.name || item.id} value={`${item.quantity || "—"} • ${money(item.line_total_paise || item.total_paise)}`} />)}</Panel>
                <Panel title="Payments">{(order.payments || []).map((payment) => <Line key={payment.id} label={labelize(payment.status)} value={`${money(payment.amount_paise)} • ${payment.provider_payment_id || "—"}`} />)}</Panel>
                <Panel title="Refunds">{(order.refunds || []).map((refund) => <Line key={refund.id} label={labelize(refund.status)} value={`${money(refund.amount_paise)} • ${refund.provider_refund_id || "—"}`} />)}</Panel>
                <Panel title="Related Support Tickets">{(order.support_tickets || []).map((ticket) => <Button key={ticket.id} asChild variant="outline" className="mr-2 mt-2"><Link to={`/support/tickets/${ticket.id}`}>{ticket.ticket_number}</Link></Button>)}</Panel>
            </div>
        </div>
    );
}

function Panel({ title, children }) {
    return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-2">{children || <div className="text-sm text-slate-500">No data returned.</div>}</CardContent></Card>;
}

function Line({ label, value }) {
    return <div className="flex justify-between gap-4 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-medium">{value || "—"}</span></div>;
}

