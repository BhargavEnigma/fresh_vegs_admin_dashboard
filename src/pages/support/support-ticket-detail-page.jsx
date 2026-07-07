import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Send, ShieldAlert, UserCheck } from "lucide-react";

import { useAuth } from "../../auth/auth-context";
import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { PremiumSelect } from "../../components/ui/premium-select";
import { useToast } from "../../components/toast/toast-context";
import {
    ACTION_TYPES,
    ATTACHMENT_TYPES,
    AUTOMATED_ACTION_TYPES,
    MESSAGE_CHANNELS,
    RESOLUTION_CODES,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES,
    SUPPORT_TEAMS,
} from "./support-constants";
import {
    ActionTypeBadge,
    ExecutionStatusBadge,
    ReviewStatusBadge,
    SupportNotice,
    TicketPriorityBadge,
    TicketStatusBadge,
    apiError,
    apiErrorCode,
    formatDate,
    isManagerRole,
    labelize,
    money,
    optionList,
} from "./support-utils";

export function SupportTicketDetailPage() {
    const { ticketId } = useParams();
    const { roles } = useAuth();
    const manager = isManagerRole(roles);
    const toast = useToast();
    const queryClient = useQueryClient();
    const [message, setMessage] = useState("");
    const [note, setNote] = useState("");
    const [channel, setChannel] = useState("admin_panel");
    const [actionPayload, setActionPayload] = useState({ action_type: "full_refund", reason: "", requested_payload: "{}" });
    const [lifecycle, setLifecycle] = useState({ status: "", priority: "", reason: "", resolution_code: "information_provided", resolution_summary: "" });
    const [escalation, setEscalation] = useState({ target_team: "warehouse", priority: "high", reason: "" });
    const [files, setFiles] = useState([]);
    const [attachmentType, setAttachmentType] = useState("other");

    const detailQuery = useQuery({
        queryKey: ["support", "ticket", ticketId],
        queryFn: () => SupportService.getTicket(ticketId),
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ["support"] });
    }

    const simpleMutation = (fn, success, loaderMessage) => useMutation({
        mutationFn: fn,
        meta: loaderMessage ? { globalLoaderMessage: loaderMessage } : undefined,
        onSuccess: () => {
            toast.success(success);
            invalidate();
        },
        onError: (error) => toast.error("Support action failed", apiError(error)),
    });

    const assignMe = simpleMutation(() => SupportService.assignTicket(ticketId, { assign_to_me: true }), "Ticket assigned", "Assigning ticket...");
    const addMessage = simpleMutation(() => SupportService.addMessage(ticketId, { message, channel }), "Message recorded", "Saving reply...");
    const addNote = simpleMutation(() => SupportService.addInternalNote(ticketId, { message: note, channel: "admin_panel" }), "Internal note added", "Adding internal note...");
    const updateStatus = simpleMutation(() => SupportService.updateStatus(ticketId, {
        status: lifecycle.status,
        reason: lifecycle.reason || null,
        resolution_code: lifecycle.status === "resolved" ? lifecycle.resolution_code : null,
        resolution_summary: lifecycle.status === "resolved" ? lifecycle.resolution_summary : null,
    }), "Status updated", "Updating ticket status...");
    const updatePriority = simpleMutation(() => SupportService.updatePriority(ticketId, { priority: lifecycle.priority, reason: lifecycle.reason || null }), "Priority updated", "Updating ticket priority...");
    const escalate = simpleMutation(() => SupportService.escalate(ticketId, escalation), "Ticket escalated", "Escalating ticket...");
    const resolve = simpleMutation(() => SupportService.resolve(ticketId, {
        resolution_code: lifecycle.resolution_code,
        resolution_summary: lifecycle.resolution_summary,
    }), "Ticket resolved", "Resolving ticket...");
    const close = simpleMutation(() => SupportService.close(ticketId, { reason: lifecycle.reason || null }), "Ticket closed", "Closing ticket...");
    const reopen = simpleMutation(() => SupportService.reopen(ticketId, { reason: lifecycle.reason }), "Ticket reopened", "Reopening ticket...");
    const requestAction = simpleMutation(() => SupportService.createActionRequest(ticketId, {
        action_type: actionPayload.action_type,
        reason: actionPayload.reason,
        requested_payload: parseJson(actionPayload.requested_payload),
        idempotency_key: crypto.randomUUID(),
    }), "Action request created", "Creating action request...");
    const upload = simpleMutation(() => SupportService.uploadAttachments(ticketId, { files, attachment_type: attachmentType }), "Attachments uploaded", "Uploading attachment...");

    const data = detailQuery.data || {};
    const ticket = data.ticket || {};
    const order = data.order;
    const pendingRequests = (data.action_requests || []).filter((request) => request.status === "pending" || request.execution_status === "processing");

    if (detailQuery.isLoading) return <Card className="p-6">Loading ticket workspace…</Card>;
    if (detailQuery.isError) return <Card className="p-6 text-red-600">Unable to load ticket detail.</Card>;

    return (
        <div>
            <PageHeader
                title={ticket.ticket_number || "Support Ticket"}
                subtitle={ticket.subject}
                actions={<Button variant="outline" asChild><Link to="/support/tickets"><ArrowLeft className="mr-2 h-4 w-4" />Tickets</Link></Button>}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                    <Card>
                        <CardContent className="grid gap-3 p-5 md:grid-cols-4">
                            <Info label="Status" value={<TicketStatusBadge value={ticket.status} />} />
                            <Info label="Priority" value={<TicketPriorityBadge value={ticket.priority} />} />
                            <Info label="Category" value={labelize(ticket.category)} />
                            <Info label="Assigned" value={ticket.assignee?.full_name || "Unassigned"} />
                            <Info label="Team" value={labelize(ticket.assigned_team)} />
                            <Info label="Source" value={labelize(ticket.source)} />
                            <Info label="Created" value={formatDate(ticket.created_at)} />
                            <Info label="Updated" value={formatDate(ticket.updated_at)} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {(data.messages || []).filter((item) => !item.is_internal).map((item) => (
                                <div key={item.id} className="rounded-xl border border-dailyveg-200 bg-dailyveg-50/70 p-3 dark:border-dailyveg-900 dark:bg-dailyveg-950/30">
                                    <div className="text-xs font-semibold text-dailyveg-800 dark:text-dailyveg-200">{labelize(item.sender_type)} • {labelize(item.channel)} • {formatDate(item.created_at)}</div>
                                    <div className="mt-2 whitespace-pre-wrap text-sm">{item.message}</div>
                                </div>
                            ))}
                            <SupportNotice>Customer-facing support record. This does not confirm WhatsApp, email, call, or mobile-app delivery.</SupportNotice>
                            <div className="grid gap-2">
                                <Label>Message</Label>
                                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
                                <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                                    <PremiumSelect value={channel} onChange={setChannel} options={optionList(MESSAGE_CHANNELS)} />
                                    <Button onClick={() => addMessage.mutate()} disabled={!message.trim() || addMessage.isPending}><Send className="mr-2 h-4 w-4" />Record Message</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {(data.messages || []).filter((item) => item.is_internal).map((item) => (
                                <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                                    <div className="text-xs font-semibold text-amber-800 dark:text-amber-200">Internal note - not intended for the customer • {formatDate(item.created_at)}</div>
                                    <div className="mt-2 whitespace-pre-wrap text-sm">{item.message}</div>
                                </div>
                            ))}
                            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add internal note" />
                            <Button variant="outline" onClick={() => addNote.mutate()} disabled={!note.trim() || addNote.isPending}>Add Internal Note</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                {(data.attachments || []).map((attachment) => (
                                    <a key={attachment.id} className="rounded-xl border border-slate-200 p-3 text-sm hover:bg-dailyveg-50 dark:border-slate-800 dark:hover:bg-dailyveg-950/40" href={attachment.file_url} target="_blank" rel="noreferrer">
                                        <Paperclip className="mb-2 h-4 w-4" />
                                        <div className="truncate font-medium">{attachment.original_filename || attachment.file_url}</div>
                                        <div className="text-xs text-slate-500">{attachment.mime_type}</div>
                                    </a>
                                ))}
                            </div>
                            <div className="grid gap-2">
                                <Label>Upload attachments</Label>
                                <Input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
                                <PremiumSelect value={attachmentType} onChange={setAttachmentType} options={optionList(ATTACHMENT_TYPES)} />
                                <Button variant="outline" onClick={() => upload.mutate()} disabled={!files.length || upload.isPending}>Upload</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Action Requests</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {(data.action_requests || []).map((request) => (
                                <ActionRequestRow key={request.id} request={request} manager={manager} ticketId={ticketId} />
                            ))}
                            <SupportNotice tone="warning">Only Full Refund and Notification Resend execute automatically. Other approved actions are authorization records and require manual business handling.</SupportNotice>
                            <div className="grid gap-3 md:grid-cols-2">
                                <PremiumSelect value={actionPayload.action_type} onChange={(value) => setActionPayload((s) => ({ ...s, action_type: value }))} options={optionList(ACTION_TYPES)} />
                                <Input value={actionPayload.reason} onChange={(e) => setActionPayload((s) => ({ ...s, reason: e.target.value }))} placeholder="Reason" />
                                <Textarea className="md:col-span-2" value={actionPayload.requested_payload} onChange={(e) => setActionPayload((s) => ({ ...s, requested_payload: e.target.value }))} rows={3} />
                            </div>
                            {!AUTOMATED_ACTION_TYPES.includes(actionPayload.action_type) ? <SupportNotice tone="warning">Manual execution required after approval.</SupportNotice> : null}
                            <Button onClick={() => requestAction.mutate()} disabled={actionPayload.reason.trim().length < 3 || requestAction.isPending}><ShieldAlert className="mr-2 h-4 w-4" />Request Action</Button>
                        </CardContent>
                    </Card>
                </div>

                <aside className="space-y-5">
                    <Card>
                        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full" variant="outline" onClick={() => assignMe.mutate()} disabled={assignMe.isPending}><UserCheck className="mr-2 h-4 w-4" />Assign to Me</Button>
                            <PremiumSelect value={lifecycle.priority} onChange={(value) => setLifecycle((s) => ({ ...s, priority: value }))} options={[{ value: "", label: "Change priority" }, ...optionList(SUPPORT_PRIORITIES)]} />
                            <Button className="w-full" variant="outline" onClick={() => updatePriority.mutate()} disabled={!lifecycle.priority || updatePriority.isPending}>Update Priority</Button>
                            <PremiumSelect value={lifecycle.status} onChange={(value) => setLifecycle((s) => ({ ...s, status: value }))} options={[{ value: "", label: "Change status" }, ...optionList(SUPPORT_STATUSES)]} />
                            <PremiumSelect value={lifecycle.resolution_code} onChange={(value) => setLifecycle((s) => ({ ...s, resolution_code: value }))} options={optionList(RESOLUTION_CODES)} />
                            <Textarea value={lifecycle.resolution_summary} onChange={(e) => setLifecycle((s) => ({ ...s, resolution_summary: e.target.value }))} placeholder="Resolution summary" />
                            <Input value={lifecycle.reason} onChange={(e) => setLifecycle((s) => ({ ...s, reason: e.target.value }))} placeholder="Reason" />
                            <Button className="w-full" variant="outline" onClick={() => updateStatus.mutate()} disabled={!lifecycle.status || updateStatus.isPending}>Update Status</Button>
                            {pendingRequests.length ? <SupportNotice tone="warning">There are pending or processing action requests. Resolution does not automatically cancel them.</SupportNotice> : null}
                            <Button className="w-full" variant="outline" onClick={() => resolve.mutate()} disabled={lifecycle.resolution_summary.trim().length < 3 || resolve.isPending}>Resolve</Button>
                            <Button className="w-full" variant="outline" onClick={() => close.mutate()} disabled={ticket.status !== "resolved" || close.isPending}>Close Resolved Ticket</Button>
                            <Button className="w-full" variant="outline" onClick={() => reopen.mutate()} disabled={!manager || lifecycle.reason.trim().length < 3 || reopen.isPending}>Reopen</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Escalation</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <SupportNotice>Escalation updates the support ticket's assigned team and audit history. Cross-team notifications are not currently automated.</SupportNotice>
                            <PremiumSelect value={escalation.target_team} onChange={(value) => setEscalation((s) => ({ ...s, target_team: value }))} options={optionList(SUPPORT_TEAMS)} />
                            <PremiumSelect value={escalation.priority} onChange={(value) => setEscalation((s) => ({ ...s, priority: value }))} options={optionList(SUPPORT_PRIORITIES)} />
                            <Textarea value={escalation.reason} onChange={(e) => setEscalation((s) => ({ ...s, reason: e.target.value }))} placeholder="Escalation reason" />
                            <Button className="w-full" variant="outline" onClick={() => escalate.mutate()} disabled={escalation.reason.trim().length < 3 || escalate.isPending}>Escalate</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <Info label="Name" value={data.customer?.full_name || "—"} />
                            <Info label="Phone" value={data.customer?.phone_masked || "—"} />
                            <Info label="Email" value={data.customer?.email_masked || "—"} />
                            {ticket.user_id ? <Button asChild variant="outline" className="mt-2 w-full"><Link to={`/support/customers/${ticket.user_id}`}>Open Customer Context</Link></Button> : null}
                        </CardContent>
                    </Card>

                    {order ? <OrderSummary order={order} /> : null}

                    <Card>
                        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {(data.events || []).slice().reverse().map((event) => (
                                <div key={event.id} className="border-l-2 border-dailyveg-300 pl-3 text-sm dark:border-dailyveg-800">
                                    <div className="font-medium">{labelize(event.event_type)}</div>
                                    <div className="text-xs text-slate-500">{formatDate(event.created_at)} • {labelize(event.actor_role)}</div>
                                    {event.reason ? <div className="mt-1 text-xs">{event.reason}</div> : null}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return <div><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-medium">{value}</div></div>;
}

function OrderSummary({ order }) {
    return (
        <Card>
            <CardHeader><CardTitle>Order Context</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
                <Info label="Order" value={order.order_number || order.id} />
                <Info label="Status" value={labelize(order.status)} />
                <Info label="Payment" value={labelize(order.payment_status)} />
                <Info label="Refund" value={labelize(order.refund_status)} />
                <Info label="Total" value={money(order.totals?.grand_total_paise)} />
                <Button asChild variant="outline" className="mt-2 w-full"><Link to={`/support/orders/${order.id}`}>Open Order Context</Link></Button>
            </CardContent>
        </Card>
    );
}

function ActionRequestRow({ request, manager }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [reason, setReason] = useState("");
    const automated = AUTOMATED_ACTION_TYPES.includes(request.action_type);

    const mutation = useMutation({
        mutationFn: (action) => {
            if (action === "approve") return SupportService.approveActionRequest(request.id, { reason: reason || null });
            if (action === "reject") return SupportService.rejectActionRequest(request.id, { reason });
            return SupportService.executeActionRequest(request.id);
        },
        meta: {
            globalLoaderMessage: "Processing action request...",
        },
        onSuccess: () => {
            toast.success("Action request updated");
            queryClient.invalidateQueries({ queryKey: ["support"] });
        },
        onError: (error) => {
            const code = apiErrorCode(error);
            toast.error(code || "Action request failed", apiError(error));
            queryClient.invalidateQueries({ queryKey: ["support"] });
        },
    });

    return (
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
                <ActionTypeBadge value={request.action_type} />
                <ReviewStatusBadge value={request.status} />
                <ExecutionStatusBadge value={request.execution_status} />
                {!automated ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">Manual execution required</span> : null}
            </div>
            <div className="mt-2 text-xs text-slate-500">{formatDate(request.created_at)}</div>
            {request.failure_code ? <SupportNotice tone="warning">{request.failure_code}: {request.failure_message}</SupportNotice> : null}
            {manager ? (
                <div className="mt-3 grid gap-2">
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Review reason" />
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => mutation.mutate("approve")} disabled={request.status !== "pending" || mutation.isPending}>Approve</Button>
                        <Button size="sm" variant="redoutline" onClick={() => mutation.mutate("reject")} disabled={request.status !== "pending" || reason.trim().length < 3 || mutation.isPending}>Reject</Button>
                        <Button size="sm" onClick={() => mutation.mutate("execute")} disabled={!automated || request.status !== "approved" || request.execution_status === "processing" || request.execution_status === "succeeded" || mutation.isPending}>{automated ? "Execute" : "Manual Only"}</Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function parseJson(value) {
    try {
        const parsed = JSON.parse(value || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}
