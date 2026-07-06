import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { TicketPriorityBadge, TicketStatusBadge, formatDate, labelize, money } from "./support-utils";

export function SupportCustomerContextPage() {
    const { userId } = useParams();
    const query = useQuery({
        queryKey: ["support", "customerContext", userId],
        queryFn: () => SupportService.customerContext(userId),
    });

    if (query.isLoading) return <Card className="p-6">Loading customer context…</Card>;
    if (query.isError) return <Card className="p-6 text-red-600">Unable to load customer context.</Card>;

    const data = query.data || {};
    const customer = data.customer || {};

    return (
        <div>
            <PageHeader title={customer.full_name || "Customer Context"} subtitle={`${customer.phone_masked || "—"} • ${customer.email_masked || "—"}`} />
            <div className="grid gap-5 lg:grid-cols-3">
                <Card>
                    <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div>Status: {labelize(customer.status)}</div>
                        <div>Created: {formatDate(customer.created_at)}</div>
                        <div>Last login: {formatDate(customer.last_login_at)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {(data.addresses || []).map((address) => <div key={address.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">{address.label || "Address"} • {address.area}, {address.city} {address.pincode}</div>)}
                        {!data.addresses?.length ? "No addresses returned." : null}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {(data.devices || []).map((device) => <div key={device.id}>{labelize(device.platform)} • {device.is_active ? "Active" : "Inactive"} • {formatDate(device.last_seen_at)}</div>)}
                        {!data.devices?.length ? "No devices returned." : null}
                    </CardContent>
                </Card>
            </div>
            <ContextLists data={data} />
        </div>
    );
}

function ContextLists({ data }) {
    return (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Card>
                <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {(data.recent_orders || []).map((order) => (
                        <div key={order.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="font-semibold">{order.order_number || order.id}</div>
                            <div className="text-slate-500">{labelize(order.status)} • {money(order.grand_total_paise)}</div>
                            <Button asChild className="mt-2" size="sm" variant="outline"><Link to={`/support/orders/${order.id}`}>Open</Link></Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Recent Tickets</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {(data.recent_tickets || []).map((ticket) => (
                        <div key={ticket.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="font-semibold">{ticket.ticket_number}</div>
                            <div className="mt-1 flex gap-2"><TicketStatusBadge value={ticket.status} /><TicketPriorityBadge value={ticket.priority} /></div>
                            <Button asChild className="mt-2" size="sm" variant="outline"><Link to={`/support/tickets/${ticket.id}`}>Open</Link></Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Recent Refunds</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {(data.recent_refunds || []).map((refund) => <div key={refund.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">{labelize(refund.status)} • {money(refund.amount_paise)}</div>)}
                </CardContent>
            </Card>
        </div>
    );
}
