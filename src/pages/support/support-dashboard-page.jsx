import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Plus, Ticket, ShieldCheck, Clock, Headset } from "lucide-react";

import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { TicketPriorityBadge, TicketStatusBadge, labelize } from "./support-utils";

function countFor(rows = [], key, value) {
    return rows.find((row) => row[key] === value)?.count || 0;
}

function MetricCard({ icon: Icon, label, value, to }) {
    const content = (
        <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</CardTitle>
                <Icon className="h-4 w-4 text-dailyveg-600 dark:text-dailyveg-300" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-slate-950 dark:text-slate-50">{value ?? 0}</div>
            </CardContent>
        </Card>
    );
    return to ? <Link to={to}>{content}</Link> : content;
}

export function SupportDashboardPage() {
    const dashboardQuery = useQuery({
        queryKey: ["support", "dashboard"],
        queryFn: () => SupportService.dashboard(),
    });
    const settingsQuery = useQuery({
        queryKey: ["support", "settings"],
        queryFn: () => SupportService.settings(),
    });

    const data = dashboardQuery.data || {};
    const settings = settingsQuery.data?.settings || {};

    return (
        <div>
            <PageHeader
                title="Customer Support"
                subtitle="Operational support queues, customer context, and sensitive action authorization."
                actions={
                    <>
                        <Button variant="outline" onClick={() => dashboardQuery.refetch()} disabled={dashboardQuery.isFetching}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button asChild>
                            <Link to="/support/tickets?create=1">
                                <Plus className="mr-2 h-4 w-4" />
                                Create Ticket
                            </Link>
                        </Button>
                    </>
                }
            />

            {dashboardQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
                </div>
            ) : dashboardQuery.isError ? (
                <Card className="p-6">
                    <div className="text-sm font-semibold text-red-600">Unable to load support dashboard.</div>
                    <Button className="mt-4" variant="outline" onClick={() => dashboardQuery.refetch()}>Retry</Button>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <MetricCard icon={Ticket} label="New" value={countFor(data.by_status, "status", "new")} to="/support/tickets?status=new" />
                        <MetricCard icon={Headset} label="Open" value={countFor(data.by_status, "status", "open")} to="/support/tickets?status=open" />
                        <MetricCard icon={Clock} label="Assigned to Me" value={data.assigned_to_me} to="/support/tickets?assigned_to_me=true" />
                        <MetricCard icon={Ticket} label="Unassigned" value={countFor(data.by_status, "status", "new") + countFor(data.by_status, "status", "open")} to="/support/tickets?unassigned=true" />
                        <MetricCard icon={ShieldCheck} label="Pending Actions" value={data.pending_sensitive_action_requests ?? "—"} to="/support/action-requests?status=pending" />
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Status Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {(data.by_status || []).map((row) => (
                                    <div key={row.status} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                                        <TicketStatusBadge value={row.status} />
                                        <span className="font-semibold">{row.count}</span>
                                    </div>
                                ))}
                                {!data.by_status?.length ? <div className="text-sm text-slate-500">No visible ticket status counts yet.</div> : null}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Priority Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {(data.by_priority || []).map((row) => (
                                    <div key={row.priority} className="flex items-center justify-between">
                                        <TicketPriorityBadge value={row.priority} />
                                        <span className="font-semibold">{row.count}</span>
                                    </div>
                                ))}
                                {!data.by_priority?.length ? <div className="text-sm text-slate-500">No priority data returned.</div> : null}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Support Settings</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-3">
                    {[
                        ["WhatsApp", settings.support_whatsapp_number],
                        ["Call", settings.support_call_number],
                        ["Email", settings.support_email],
                        ["Hours", `${settings.support_hours_start || "—"} to ${settings.support_hours_end || "—"}`],
                        ["Timezone", settings.support_timezone],
                        ["Enabled", labelize(settings.support_is_enabled)],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">{label}</div>
                            <div className="mt-1 font-medium">{value || "—"}</div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
