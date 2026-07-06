import { useQuery } from "@tanstack/react-query";

import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { labelize } from "./support-utils";

export function SupportAnalyticsPage() {
    const query = useQuery({
        queryKey: ["support", "analytics"],
        queryFn: () => SupportService.analytics(),
    });
    const data = query.data || {};
    const resolutionRate = data.total_tickets ? Math.round((Number(data.resolved_tickets || 0) / Number(data.total_tickets)) * 100) : 0;

    return (
        <div>
            <PageHeader title="Support Analytics" subtitle="Basic backend-provided support analytics. SLA, overdue, agent performance, and satisfaction metrics are not implemented by the current backend." />
            {query.isError ? <Card className="p-6 text-red-600">Unable to load analytics.</Card> : null}
            <div className="grid gap-4 md:grid-cols-3">
                <Metric title="Total Tickets" value={data.total_tickets || 0} />
                <Metric title="Resolved Tickets" value={data.resolved_tickets || 0} />
                <Metric title="Resolution %" value={`${resolutionRate}%`} />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Bars title="Tickets by Category" rows={(data.tickets_by_category || []).map((row) => ({ label: labelize(row.category), count: row.count }))} total={data.total_tickets} />
                <Bars title="Tickets by Warehouse" rows={(data.tickets_by_warehouse || []).map((row) => ({ label: row.warehouse_id || "No Warehouse", count: row.count }))} total={data.total_tickets} />
            </div>
        </div>
    );
}

function Metric({ title, value }) {
    return <Card><CardHeader><CardTitle className="text-sm text-slate-500">{title}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{value}</div></CardContent></Card>;
}

function Bars({ title, rows, total }) {
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
                {rows.length ? rows.map((row) => {
                    const pct = total ? Math.round((Number(row.count || 0) / Number(total)) * 100) : 0;
                    return (
                        <div key={row.label}>
                            <div className="mb-1 flex justify-between text-sm"><span>{row.label}</span><span>{row.count}</span></div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-900"><div className="h-2 rounded-full bg-dailyveg-500" style={{ width: `${pct}%` }} /></div>
                        </div>
                    );
                }) : <div className="text-sm text-slate-500">No rows returned.</div>}
            </CardContent>
        </Card>
    );
}
