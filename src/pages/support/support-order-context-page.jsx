import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { formatDate, labelize, money } from "./support-utils";

export function SupportOrderContextPage() {
    const { orderId } = useParams();
    const query = useQuery({
        queryKey: ["support", "orderContext", orderId],
        queryFn: () => SupportService.orderContext(orderId),
    });

    if (query.isLoading) return <Card className="p-6">Loading order context…</Card>;
    if (query.isError) return <Card className="p-6 text-red-600">Unable to load order context.</Card>;

    const order = query.data?.order || {};

    return (
        <div>
            <PageHeader title={order.order_number || "Order Context"} subtitle={`${labelize(order.status)} • ${labelize(order.payment_status)} • ${money(order.totals?.grand_total_paise)}`} />
            <div className="grid gap-5 lg:grid-cols-3">
                <Panel title="Order">
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
