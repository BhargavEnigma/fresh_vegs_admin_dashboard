import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, CheckCircle2, Copy, Eye, Pencil, Send, Target, Trash2, XCircle } from "lucide-react";

import { AdminNotificationsService } from "../../../api/services/admin-notifications.service";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { useToast } from "../../../components/toast/toast-context";
import { NotificationStatusBadge } from "./notification-status-badge";
import {
    AUDIENCE_TYPES,
    campaignFromResponse,
    EDITABLE_STATUSES,
    formatDateTime,
    labelFor,
    NOTIFICATION_TYPES,
} from "./notification-utils";

function apiError(error) {
    return error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Something went wrong.";
}

function InfoItem({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-slate-50">{value || "—"}</p>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, tone = "green" }) {
    const toneClass = tone === "red" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : tone === "blue" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "bg-dailyveg-50 text-dailyveg-700 dark:bg-dailyveg-950/60 dark:text-dailyveg-300";
    return (
        <Card className="p-4">
            <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}><Icon className="h-5 w-5" /></div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">{value}</p>
                </div>
            </div>
        </Card>
    );
}

export function NotificationsDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const qc = useQueryClient();
    const [confirm, setConfirm] = React.useState({ open: false, mode: "send" });
    const [testOpen, setTestOpen] = React.useState(false);
    const [testUserId, setTestUserId] = React.useState("");

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["notification-campaign", id],
        queryFn: () => AdminNotificationsService.getById(id),
        enabled: Boolean(id),
    });
    const campaign = campaignFromResponse(data);
    const editable = EDITABLE_STATUSES.has(String(campaign?.status || "draft"));

    const sendMut = useMutation({
        mutationFn: () => AdminNotificationsService.send(id),
        meta: {
            globalLoaderMessage: "Sending notification...",
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notification-campaign", id] });
            qc.invalidateQueries({ queryKey: ["notification-campaigns"] });
            toast.push({ variant: "success", title: "Broadcast started", description: "Campaign is being sent to eligible customers." });
            setConfirm({ open: false, mode: "send" });
        },
        onError: (e) => toast.push({ variant: "error", title: "Send failed", description: apiError(e) }),
    });

    const deleteMut = useMutation({
        mutationFn: () => AdminNotificationsService.remove(id),
        meta: {
            globalLoaderMessage: "Deleting notification campaign...",
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notification-campaigns"] });
            toast.push({ variant: "success", title: "Campaign removed", description: "Draft/scheduled campaign was deleted or cancelled." });
            navigate("/notifications");
        },
        onError: (e) => toast.push({ variant: "error", title: "Delete failed", description: apiError(e) }),
    });

    const testMut = useMutation({
        mutationFn: () => AdminNotificationsService.test(id, { user_id: testUserId.trim() }),
        meta: {
            globalLoaderMessage: "Testing notification...",
        },
        onSuccess: () => {
            toast.push({ variant: "success", title: "Test sent", description: "Test notification was sent." });
            setTestOpen(false);
        },
        onError: (e) => toast.push({ variant: "error", title: "Test failed", description: apiError(e) }),
    });

    if (isLoading) return <Skeleton className="h-96 w-full rounded-3xl" />;
    if (isError || !campaign) return <Card className="p-8 text-center text-red-600">{apiError(error)}</Card>;

    const total = Number(campaign.total_targets || 0);
    const sent = Number(campaign.sent_count || 0);
    const failed = Number(campaign.failed_count || 0);
    const sentPct = total ? Math.round((sent / total) * 100) : 0;
    const failedPct = total ? Math.round((failed / total) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2"><Link to="/notifications"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{campaign.title}</h1>
                        <NotificationStatusBadge status={campaign.status} />
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{campaign.body}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setTestOpen(true)}>Send Test</Button>
                    {editable ? <Button variant="outline" asChild><Link to={`/notifications/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link></Button> : null}
                    {editable ? <Button onClick={() => setConfirm({ open: true, mode: "send" })}><Send className="mr-2 h-4 w-4" /> Send Now</Button> : null}
                    {editable ? <Button variant="redoutline" onClick={() => setConfirm({ open: true, mode: "delete" })}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button> : null}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard icon={Target} label="Total Targets" value={total} tone="blue" />
                <SummaryCard icon={CheckCircle2} label="Sent" value={sent} />
                <SummaryCard icon={XCircle} label="Failed" value={failed} tone="red" />
                <SummaryCard icon={Eye} label="Sent Rate" value={`${sentPct}%`} />
            </div>

            <Card className="p-5">
                <div className="mb-3 flex items-center justify-between text-sm"><span className="font-semibold text-slate-950 dark:text-slate-50">Delivery Progress</span><span className="text-slate-500">{sentPct}% sent • {failedPct}% failed</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                    <div className="h-full bg-dailyveg-500" style={{ width: `${Math.min(sentPct, 100)}%` }} />
                </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="p-5">
                    <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-slate-50">Campaign Details</h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        <InfoItem label="Type" value={labelFor(NOTIFICATION_TYPES, campaign.type)} />
                        <InfoItem label="Audience" value={labelFor(AUDIENCE_TYPES, campaign.audience_type)} />
                        <InfoItem label="Deep Link" value={`${campaign.deep_link_type || "none"}${campaign.deep_link_value ? ` / ${campaign.deep_link_value}` : ""}`} />
                        <InfoItem label="Created By" value={campaign.created_by || campaign.created_by_user?.full_name || campaign.created_by_user?.email} />
                        <InfoItem label="Created At" value={formatDateTime(campaign.created_at)} />
                        <InfoItem label="Scheduled At" value={formatDateTime(campaign.scheduled_at)} />
                        <InfoItem label="Sent At" value={formatDateTime(campaign.sent_at)} />
                    </div>

                    <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">Payload JSON</h3>
                            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(JSON.stringify(campaign.payload || {}, null, 2))}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
                        </div>
                        <pre className="thin-scrollbar max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(campaign.payload || {}, null, 2)}</pre>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    {campaign.image_url ? <img src={campaign.image_url} alt="" className="h-52 w-full object-cover" /> : <div className="flex h-52 items-center justify-center bg-slate-100 dark:bg-slate-900"><Bell className="h-10 w-10 text-slate-400" /></div>}
                    <div className="p-5">
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Customer Preview</p>
                        <p className="mt-2 text-sm text-slate-500">This is the campaign image and message customers will receive through push notification.</p>
                    </div>
                </Card>
            </div>

            <ConfirmDialog
                open={confirm.open}
                onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
                title={confirm.mode === "send" ? (campaign.audience_type === "all_customers" ? "Send to all customers?" : "Send broadcast?") : "Delete campaign?"}
                description={confirm.mode === "send" ? (campaign.audience_type === "all_customers" ? "This will send a push notification to all eligible customers." : "This will send a push notification to the selected eligible audience.") : "Only draft or scheduled campaigns can be deleted/cancelled."}
                confirmText={confirm.mode === "send" ? "Send Broadcast" : "Delete"}
                variant={confirm.mode === "send" ? "default" : "destructive"}
                onConfirm={() => confirm.mode === "send" ? sendMut.mutateAsync() : deleteMut.mutateAsync()}
            />

            <Dialog open={testOpen} onOpenChange={setTestOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send test notification</DialogTitle>
                        <DialogDescription>Enter a customer/admin user id. This does not mark campaign as sent.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Test User ID</Label>
                        <Input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} placeholder="User UUID" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTestOpen(false)} disabled={testMut.isPending}>Cancel</Button>
                        <Button onClick={() => testUserId.trim() ? testMut.mutate() : toast.push({ variant: "error", title: "Test user required", description: "Enter a customer/admin user id." })} disabled={testMut.isPending}>{testMut.isPending ? "Sending…" : "Send Test"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
