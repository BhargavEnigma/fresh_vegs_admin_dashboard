import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, CheckCircle2, Eye, Pencil, Plus, Send, Trash2, XCircle } from "lucide-react";

import { AdminNotificationsService } from "../../../api/services/admin-notifications.service";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { PremiumSelect } from "../../../components/ui/premium-select";
import { Skeleton } from "../../../components/ui/skeleton";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { useToast } from "../../../components/toast/toast-context";
import { NotificationStatusBadge } from "./notification-status-badge";
import {
    AUDIENCE_TYPES,
    campaignListFromResponse,
    CAMPAIGN_STATUSES,
    EDITABLE_STATUSES,
    formatDateTime,
    labelFor,
    NOTIFICATION_TYPES,
} from "./notification-utils";

function apiError(error) {
    return error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Something went wrong.";
}

function StatCard({ icon: Icon, label, value, tone = "green" }) {
    const toneClass = tone === "red" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : tone === "blue" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "bg-dailyveg-50 text-dailyveg-700 dark:bg-dailyveg-950/60 dark:text-dailyveg-300";
    return (
        <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </Card>
    );
}

function CampaignMobileCard({ campaign, onSend, onDelete }) {
    const editable = EDITABLE_STATUSES.has(String(campaign.status || "draft"));
    return (
        <Card className="overflow-hidden">
            {campaign.image_url ? <img src={campaign.image_url} alt="" className="h-36 w-full object-cover" /> : null}
            <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="line-clamp-1 font-semibold text-slate-950 dark:text-slate-50">{campaign.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{campaign.body}</p>
                    </div>
                    <NotificationStatusBadge status={campaign.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-900/70">
                    <div><p className="text-xs text-slate-500">Type</p><p className="mt-1 font-medium">{labelFor(NOTIFICATION_TYPES, campaign.type)}</p></div>
                    <div><p className="text-xs text-slate-500">Audience</p><p className="mt-1 font-medium">{labelFor(AUDIENCE_TYPES, campaign.audience_type)}</p></div>
                    <div><p className="text-xs text-slate-500">Targets</p><p className="mt-1 font-medium">{campaign.total_targets ?? 0}</p></div>
                    <div><p className="text-xs text-slate-500">Sent / Failed</p><p className="mt-1 font-medium">{campaign.sent_count ?? 0} / {campaign.failed_count ?? 0}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" asChild><Link to={`/notifications/${campaign.id}`}>View</Link></Button>
                    {editable ? <Button variant="outline" size="sm" asChild><Link to={`/notifications/${campaign.id}/edit`}>Edit</Link></Button> : null}
                    {editable ? <Button size="sm" onClick={() => onSend(campaign)}>Send</Button> : null}
                    {editable ? <Button variant="redoutline" size="sm" onClick={() => onDelete(campaign)}>Delete</Button> : null}
                </div>
            </div>
        </Card>
    );
}

export function NotificationsListPage() {
    const toast = useToast();
    const qc = useQueryClient();
    const [filters, setFilters] = React.useState({ search: "", status: "", type: "", audience_type: "" });
    const [confirm, setConfirm] = React.useState({ open: false, mode: "send", campaign: null });

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["notification-campaigns", filters],
        queryFn: () => AdminNotificationsService.list({
            search: filters.search || undefined,
            status: filters.status || undefined,
            type: filters.type || undefined,
            audience_type: filters.audience_type || undefined,
        }),
    });

    const campaigns = campaignListFromResponse(data);
    const stats = React.useMemo(() => ({
        total: campaigns.length,
        sent: campaigns.filter((c) => c.status === "sent").length,
        scheduled: campaigns.filter((c) => c.status === "scheduled").length,
        failed: campaigns.filter((c) => ["failed", "partially_failed"].includes(c.status)).length,
    }), [campaigns]);

    const sendMut = useMutation({
        mutationFn: (campaign) => AdminNotificationsService.send(campaign.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notification-campaigns"] });
            toast.push({ variant: "success", title: "Broadcast started", description: "Campaign is being sent to eligible customers." });
            setConfirm({ open: false, mode: "send", campaign: null });
        },
        onError: (e) => toast.push({ variant: "error", title: "Send failed", description: apiError(e) }),
    });

    const deleteMut = useMutation({
        mutationFn: (campaign) => AdminNotificationsService.remove(campaign.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notification-campaigns"] });
            toast.push({ variant: "success", title: "Campaign removed", description: "Draft/scheduled campaign was deleted or cancelled." });
            setConfirm({ open: false, mode: "delete", campaign: null });
        },
        onError: (e) => toast.push({ variant: "error", title: "Delete failed", description: apiError(e) }),
    });

    return (
        <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-dailyveg-200/70 bg-gradient-to-br from-dailyveg-500 via-dailyveg-600 to-dailyveg-800 p-6 text-white shadow-brand dark:border-dailyveg-900/60">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><Bell className="h-6 w-6" /></div>
                        <h1 className="mt-4 text-2xl font-bold tracking-tight">Notifications</h1>
                        <p className="mt-2 max-w-2xl text-sm text-white/80">Create, test, schedule, and send broadcast notifications with safe approvals and delivery tracking.</p>
                    </div>
                    <Button asChild className="bg-white text-dailyveg-800 hover:bg-dailyveg-50">
                        <Link to="/notifications/create"><Plus className="mr-2 h-4 w-4" /> Create Notification</Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Bell} label="Total Campaigns" value={stats.total} />
                <StatCard icon={CheckCircle2} label="Sent" value={stats.sent} />
                <StatCard icon={CalendarClock} label="Scheduled" value={stats.scheduled} tone="blue" />
                <StatCard icon={XCircle} label="Failed / Partial" value={stats.failed} tone="red" />
            </div>

            <Card className="p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_200px_220px]">
                    <Input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search title or body…" />
                    <PremiumSelect value={filters.status} onChange={(value) => setFilters((f) => ({ ...f, status: value }))} options={CAMPAIGN_STATUSES} />
                    <PremiumSelect value={filters.type} onChange={(value) => setFilters((f) => ({ ...f, type: value }))} options={[{ value: "", label: "All Types" }, ...NOTIFICATION_TYPES]} />
                    <PremiumSelect value={filters.audience_type} onChange={(value) => setFilters((f) => ({ ...f, audience_type: value }))} options={[{ value: "", label: "All Audiences" }, ...AUDIENCE_TYPES]} />
                </div>
            </Card>

            {isLoading ? (
                <Skeleton className="h-96 w-full rounded-3xl" />
            ) : isError ? (
                <Card className="p-8 text-center text-red-600">{apiError(error)}</Card>
            ) : campaigns.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-dailyveg-50 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300"><Bell className="h-7 w-7" /></div>
                    <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-slate-50">No notifications yet</h2>
                    <p className="mt-2 text-sm text-slate-500">Create your first broadcast campaign.</p>
                    <Button asChild className="mt-5"><Link to="/notifications/create">Create Notification</Link></Button>
                </Card>
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:block">
                        <table className="w-full text-sm">
                            <thead className="bg-dailyveg-50/80 text-left dark:bg-dailyveg-950/50">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Notification</th>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Audience</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Targets</th>
                                    <th className="px-4 py-3 font-semibold">Sent / Failed</th>
                                    <th className="px-4 py-3 font-semibold">Scheduled / Sent</th>
                                    <th className="px-4 py-3 font-semibold">Created</th>
                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map((campaign) => {
                                    const editable = EDITABLE_STATUSES.has(String(campaign.status || "draft"));
                                    return (
                                        <tr key={campaign.id} className="border-t border-slate-100 hover:bg-dailyveg-50/50 dark:border-slate-900 dark:hover:bg-dailyveg-950/30">
                                            <td className="max-w-xs px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                                                        {campaign.image_url ? <img src={campaign.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Bell className="h-5 w-5 text-slate-400" /></div>}
                                                    </div>
                                                    <div className="min-w-0"><p className="truncate font-semibold text-slate-950 dark:text-slate-50">{campaign.title}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{campaign.body}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{labelFor(NOTIFICATION_TYPES, campaign.type)}</td>
                                            <td className="px-4 py-3">{labelFor(AUDIENCE_TYPES, campaign.audience_type)}</td>
                                            <td className="px-4 py-3"><NotificationStatusBadge status={campaign.status} /></td>
                                            <td className="px-4 py-3 font-medium">{campaign.total_targets ?? 0}</td>
                                            <td className="px-4 py-3">{campaign.sent_count ?? 0} / {campaign.failed_count ?? 0}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(campaign.scheduled_at || campaign.sent_at)}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(campaign.created_at)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" asChild><Link to={`/notifications/${campaign.id}`}><Eye className="h-4 w-4" /></Link></Button>
                                                    {editable ? <Button variant="ghost" size="icon" asChild><Link to={`/notifications/${campaign.id}/edit`}><Pencil className="h-4 w-4" /></Link></Button> : null}
                                                    {editable ? <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, mode: "send", campaign })}><Send className="h-4 w-4" /></Button> : null}
                                                    {editable ? <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, mode: "delete", campaign })}><Trash2 className="h-4 w-4" /></Button> : null}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="grid gap-4 lg:hidden">
                        {campaigns.map((campaign) => <CampaignMobileCard key={campaign.id} campaign={campaign} onSend={(c) => setConfirm({ open: true, mode: "send", campaign: c })} onDelete={(c) => setConfirm({ open: true, mode: "delete", campaign: c })} />)}
                    </div>
                </>
            )}

            <ConfirmDialog
                open={confirm.open}
                onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
                title={confirm.mode === "send" ? (confirm.campaign?.audience_type === "all_customers" ? "Send to all customers?" : "Send broadcast?") : "Delete campaign?"}
                description={confirm.mode === "send" ? (confirm.campaign?.audience_type === "all_customers" ? "This will send a push notification to all eligible customers." : "This will send a push notification to the selected eligible audience.") : "Only draft or scheduled campaigns can be deleted/cancelled."}
                confirmText={confirm.mode === "send" ? "Send Broadcast" : "Delete"}
                variant={confirm.mode === "send" ? "default" : "destructive"}
                onConfirm={() => confirm.mode === "send" ? sendMut.mutateAsync(confirm.campaign) : deleteMut.mutateAsync(confirm.campaign)}
            />
        </div>
    );
}
