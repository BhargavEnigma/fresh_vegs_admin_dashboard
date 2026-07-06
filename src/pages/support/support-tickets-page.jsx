import { useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, RefreshCw } from "lucide-react";

import { SupportService } from "../../api/services/support.service";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { PremiumSelect } from "../../components/ui/premium-select";
import { useToast } from "../../components/toast/toast-context";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_SOURCES, SUPPORT_STATUSES, SUPPORT_TEAMS } from "./support-constants";
import { TicketPriorityBadge, TicketStatusBadge, apiError, formatDate, optionList } from "./support-utils";

function paramsFromSearch(searchParams) {
    return {
        page: Number(searchParams.get("page") || 1),
        limit: 20,
        q: searchParams.get("q") || "",
        status: searchParams.get("status") || "",
        priority: searchParams.get("priority") || "",
        category: searchParams.get("category") || "",
        assigned_team: searchParams.get("assigned_team") || "",
        assigned_to_me: searchParams.get("assigned_to_me") || "",
        unassigned: searchParams.get("unassigned") || "",
        sort_by: "created_at",
        sort_dir: "desc",
    };
}

export function SupportTicketsPage() {
    const toast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [createOpen, setCreateOpen] = useState(searchParams.get("create") === "1");
    const params = useMemo(() => paramsFromSearch(searchParams), [searchParams]);

    const listQuery = useQuery({
        queryKey: ["support", "tickets", params],
        queryFn: () => SupportService.listTickets(params),
        keepPreviousData: true,
    });

    function patchParams(patch) {
        const next = new URLSearchParams(searchParams);
        Object.entries({ ...patch, page: patch.page || 1 }).forEach(([key, value]) => {
            if (value === "" || value === null || value === undefined || value === false) next.delete(key);
            else next.set(key, String(value));
        });
        setSearchParams(next);
    }

    const tickets = listQuery.data?.tickets || [];
    const totalPages = listQuery.data?.total_pages || 1;

    return (
        <div>
            <PageHeader
                title="Support Tickets"
                subtitle="Agents see tickets assigned to them, created by them, or unassigned. Managers and admins see all support tickets."
                actions={
                    <>
                        <Button variant="outline" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Ticket
                        </Button>
                    </>
                }
            />

            <Card className="mb-5 p-4">
                <div className="grid gap-3 md:grid-cols-5">
                    <div className="grid gap-2 md:col-span-2">
                        <Label>Search</Label>
                        <Input value={params.q} onChange={(e) => patchParams({ q: e.target.value })} placeholder="Ticket number, subject, description" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Status</Label>
                        <PremiumSelect value={params.status} onChange={(value) => patchParams({ status: value })} options={[{ value: "", label: "All Statuses" }, ...optionList(SUPPORT_STATUSES)]} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Priority</Label>
                        <PremiumSelect value={params.priority} onChange={(value) => patchParams({ priority: value })} options={[{ value: "", label: "All Priorities" }, ...optionList(SUPPORT_PRIORITIES)]} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Team</Label>
                        <PremiumSelect value={params.assigned_team} onChange={(value) => patchParams({ assigned_team: value })} options={[{ value: "", label: "All Teams" }, ...optionList(SUPPORT_TEAMS)]} />
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => patchParams({ assigned_to_me: "true", unassigned: "" })}>My Tickets</Button>
                    <Button size="sm" variant="outline" onClick={() => patchParams({ unassigned: "true", assigned_to_me: "" })}>Unassigned</Button>
                    <Button size="sm" variant="outline" onClick={() => patchParams({ status: "escalated" })}>Escalations</Button>
                    <Button size="sm" variant="outline" onClick={() => setSearchParams({})}>Reset</Button>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto thin-scrollbar">
                    <table className="w-full text-sm">
                        <thead className="bg-dailyveg-50/80 text-left dark:bg-dailyveg-950/50">
                            <tr>
                                {["Ticket", "Customer", "Order", "Category", "Priority", "Status", "Team", "Assigned", "Updated", ""].map((head) => (
                                    <th key={head} className="whitespace-nowrap px-4 py-3 font-semibold">{head}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {listQuery.isLoading ? (
                                <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={10}>Loading tickets…</td></tr>
                            ) : listQuery.isError ? (
                                <tr><td className="px-4 py-10 text-center text-red-600" colSpan={10}>Unable to load tickets.</td></tr>
                            ) : tickets.length ? tickets.map((ticket) => (
                                <tr key={ticket.id} className="border-t border-slate-100 hover:bg-dailyveg-50/60 dark:border-slate-900 dark:hover:bg-dailyveg-950/30">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">{ticket.ticket_number}</div>
                                        <div className="max-w-xs truncate text-xs text-slate-500">{ticket.subject}</div>
                                    </td>
                                    <td className="px-4 py-3">{ticket.customer?.full_name || "—"}<div className="text-xs text-slate-500">{ticket.customer?.phone_masked || "—"}</div></td>
                                    <td className="px-4 py-3">{ticket.order_id ? <Link className="text-dailyveg-700 dark:text-dailyveg-300" to={`/support/orders/${ticket.order_id}`}>Open</Link> : "—"}</td>
                                    <td className="px-4 py-3">{ticket.category}</td>
                                    <td className="px-4 py-3"><TicketPriorityBadge value={ticket.priority} /></td>
                                    <td className="px-4 py-3"><TicketStatusBadge value={ticket.status} /></td>
                                    <td className="px-4 py-3">{ticket.assigned_team || "—"}</td>
                                    <td className="px-4 py-3">{ticket.assignee?.full_name || "Unassigned"}</td>
                                    <td className="px-4 py-3">{formatDate(ticket.updated_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Button asChild size="sm" variant="outline"><Link to={`/support/tickets/${ticket.id}`}><Eye className="mr-2 h-4 w-4" />Open</Link></Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={10}>No tickets returned by the support API.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm dark:border-slate-800">
                    <span>Page {params.page} of {totalPages} • {listQuery.data?.total || 0} tickets</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={params.page <= 1} onClick={() => patchParams({ page: params.page - 1 })}>Prev</Button>
                        <Button variant="outline" size="sm" disabled={params.page >= totalPages} onClick={() => patchParams({ page: params.page + 1 })}>Next</Button>
                    </div>
                </div>
            </Card>

            <CreateTicketDialog
                open={createOpen}
                onOpenChange={(open) => {
                    setCreateOpen(open);
                    if (!open && searchParams.get("create")) patchParams({ create: "" });
                }}
                onCreated={(ticket) => {
                    queryClient.invalidateQueries({ queryKey: ["support"] });
                    toast.success("Ticket created", ticket?.ticket_number || "");
                    navigate(`/support/tickets/${ticket.id}`);
                }}
            />
        </div>
    );
}

function CreateTicketDialog({ open, onOpenChange, onCreated }) {
    const toast = useToast();
    const [query, setQuery] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [payload, setPayload] = useState({
        category: "order_status",
        source: "admin_panel",
        priority: "normal",
        assigned_team: "support",
        subject: "",
        description: "",
        initial_message: "",
        order_id: "",
    });
    const [files, setFiles] = useState([]);

    const customersQuery = useQuery({
        queryKey: ["support", "customerSearch", query],
        queryFn: ({ signal }) => SupportService.searchCustomers({ q: query, page: 1, limit: 8 }, { signal }),
        enabled: query.trim().length >= 3,
    });

    const contextQuery = useQuery({
        queryKey: ["support", "customerContext", selectedCustomer?.id],
        queryFn: () => SupportService.customerContext(selectedCustomer.id),
        enabled: Boolean(selectedCustomer?.id),
    });

    const createMutation = useMutation({
        mutationFn: () => SupportService.createTicket({
            user_id: selectedCustomer?.id || null,
            order_id: payload.order_id || null,
            category: payload.category,
            source: payload.source,
            priority: payload.priority,
            assigned_team: payload.assigned_team,
            subject: payload.subject,
            description: payload.description || null,
            initial_message: payload.initial_message || null,
        }),
        onSuccess: async (data) => {
            const ticket = data.ticket;
            if (files.length && ticket?.id) {
                try {
                    await SupportService.uploadAttachments(ticket.id, { files, attachment_type: "other" });
                } catch (error) {
                    toast.warning("Ticket created, attachment upload failed", apiError(error));
                }
            }
            onOpenChange(false);
            onCreated(ticket);
        },
        onError: (error) => toast.error("Ticket creation failed", apiError(error)),
    });

    const orders = contextQuery.data?.recent_orders || [];
    const disabled = !selectedCustomer?.id || payload.subject.trim().length < 3 || !payload.category || !payload.source;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>This records the communication in DailyVeg Support. It does not send a WhatsApp message, email, or call.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-5">
                    <div className="grid gap-2">
                        <Label>Customer Search</Label>
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter at least 3 characters: phone, name, email, or UUID" />
                        {query.trim().length > 0 && query.trim().length < 3 ? <div className="text-xs text-amber-600">Enter at least 3 characters.</div> : null}
                        <div className="grid gap-2">
                            {(customersQuery.data?.customers || []).map((customer) => (
                                <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => setSelectedCustomer(customer)}
                                    className={`rounded-xl border p-3 text-left text-sm ${selectedCustomer?.id === customer.id ? "border-dailyveg-500 bg-dailyveg-50 dark:bg-dailyveg-950/40" : "border-slate-200 dark:border-slate-800"}`}
                                >
                                    <div className="font-semibold">{customer.full_name || "Unnamed customer"}</div>
                                    <div className="text-xs text-slate-500">{customer.phone_masked || "—"} • {customer.email_masked || "—"} • {customer.status || "—"}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Related Order</Label>
                            <PremiumSelect value={payload.order_id} onChange={(value) => setPayload((s) => ({ ...s, order_id: value }))} options={[{ value: "", label: "No related order" }, ...orders.map((order) => ({ value: order.id, label: `${order.order_number || order.id} • ${order.status}` }))]} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Category</Label>
                            <PremiumSelect value={payload.category} onChange={(value) => setPayload((s) => ({ ...s, category: value }))} options={optionList(SUPPORT_CATEGORIES)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Source</Label>
                            <PremiumSelect value={payload.source} onChange={(value) => setPayload((s) => ({ ...s, source: value }))} options={optionList(SUPPORT_SOURCES)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Priority</Label>
                            <PremiumSelect value={payload.priority} onChange={(value) => setPayload((s) => ({ ...s, priority: value }))} options={optionList(SUPPORT_PRIORITIES)} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Subject</Label>
                        <Input value={payload.subject} onChange={(e) => setPayload((s) => ({ ...s, subject: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea value={payload.description} onChange={(e) => setPayload((s) => ({ ...s, description: e.target.value }))} rows={4} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Initial Customer Communication</Label>
                        <Textarea value={payload.initial_message} onChange={(e) => setPayload((s) => ({ ...s, initial_message: e.target.value }))} rows={3} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Attachments</Label>
                        <Input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
                        <div className="text-xs text-slate-500">Uploaded after ticket creation through the support attachment API. If upload fails, the created ticket remains available.</div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>Cancel</Button>
                    <Button onClick={() => createMutation.mutate()} disabled={disabled || createMutation.isPending}>{createMutation.isPending ? "Creating…" : "Create Ticket"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
