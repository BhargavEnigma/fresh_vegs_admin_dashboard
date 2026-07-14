import * as React from "react";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminDealsService } from "../../../api/services/admin-deals.service";
import { PageHeader } from "../../../components/common/page-header";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { DataTable } from "../../../components/common/data-table";
import { StatusBadge } from "../../../components/common/status-badge";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { useToast } from "../../../components/toast/toast-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

import { DealForm } from "./deal-form";
import { DealItemsDialog } from "./deal-items-dialog";
import { PremiumSelect } from "../../../components/ui/premium-select";
import DatePicker from "react-datepicker";

function formatDateOnly(value) {
    return formatIndianDateTime(value);
}

function formatDateTime(value) {
    return formatIndianDateTime(value);
}

function DealMobileCard({ deal, onItems, onEdit, onDelete }) {
    return (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">
                            {formatDateOnly(deal.deal_date)}
                        </p>
                        <h3 className="mt-1 line-clamp-1 text-base font-semibold text-slate-950 dark:text-slate-50">
                            {deal.name || "Deals of the Day"}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {deal.description || "—"}
                        </p>
                    </div>

                    <StatusBadge value={deal.is_active ? "active" : "inactive"} />
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-900/60">
                    <div>
                        <p className="text-xs text-slate-500">Priority</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                            {deal.priority ?? 0}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500">Date</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                            {formatDateOnly(deal.deal_date)}
                        </p>
                    </div>

                    <div className="col-span-2">
                        <p className="text-xs text-slate-500">Window</p>
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                            Start: {formatDateTime(deal.starts_at)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                            End: {formatDateTime(deal.ends_at)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => onItems(deal)}>
                        Items
                    </Button>

                    <Button variant="outline" size="sm" onClick={() => onEdit(deal)}>
                        Edit
                    </Button>

                    <Button variant="destructive" size="sm" onClick={() => onDelete(deal)}>
                        Delete
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export function AdminDealsPage() {
    const qc = useQueryClient();
    const toast = useToast();

    const [filters, setFilters] = React.useState({
        from: "",
        to: "",
        active: "",
    });

    const [createOpen, setCreateOpen] = React.useState(false);
    const [edit, setEdit] = React.useState({ open: false, deal: null });
    const [itemsDlg, setItemsDlg] = React.useState({ open: false, deal: null });
    const [confirm, setConfirm] = React.useState({ open: false, deal: null });

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin-deals", filters],
        queryFn: () =>
            AdminDealsService.list({
                from: filters.from || undefined,
                to: filters.to || undefined,
                active: filters.active === "" ? undefined : filters.active,
            }),
    });

    const rows = data?.data?.deals || [];

    const createMut = useMutation({
        mutationFn: (payload) => AdminDealsService.create(payload),
        meta: {
            globalLoaderMessage: "Creating deal...",
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-deals"] });
            toast.push({ variant: "success", title: "Created", description: "Deal created." });
            setCreateOpen(false);
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Create failed", description: msg });
        },
    });

    const updateMut = useMutation({
        mutationFn: ({ dealId, payload }) => AdminDealsService.update(dealId, payload),
        meta: {
            globalLoaderMessage: "Saving deal...",
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-deals"] });
            toast.push({ variant: "success", title: "Saved", description: "Deal updated." });
            setEdit({ open: false, deal: null });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Update failed", description: msg });
        },
    });

    const deleteMut = useMutation({
        mutationFn: ({ dealId }) => AdminDealsService.remove(dealId),
        meta: {
            globalLoaderMessage: "Deleting deal...",
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-deals"] });
            toast.push({ variant: "success", title: "Deleted", description: "Deal deleted." });
            setConfirm({ open: false, deal: null });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Delete failed", description: msg });
        },
    });

    function parseDate(value) {
        if (!value) return null;
        const [yyyy, mm, dd] = String(value).split("-").map(Number);
        if (!yyyy || !mm || !dd) return null;
        return new Date(yyyy, mm - 1, dd);
    }

    function formatDate(date) {
        if (!date) return "";
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    const columns = React.useMemo(
        () => [
            {
                header: "Date",
                accessorKey: "deal_date",
                cell: ({ row }) => (
                    <span className="min-w-[110px] text-sm font-medium">
                        {formatDateOnly(row.original.deal_date)}
                    </span>
                ),
            },
            {
                header: "Name",
                id: "name",
                cell: ({ row }) => (
                    <div className="min-w-[260px]">
                        <div className="font-medium">{row.original.name || "Deals of the Day"}</div>
                        <div className="text-xs text-slate-500">{row.original.description || "—"}</div>
                    </div>
                ),
            },
            {
                header: "Window",
                id: "window",
                cell: ({ row }) => (
                    <div className="min-w-[220px] text-xs text-slate-600 dark:text-slate-300">
                        <div>Start: {formatDateTime(row.original.starts_at)}</div>
                        <div>End: {formatDateTime(row.original.ends_at)}</div>
                    </div>
                ),
            },
            {
                header: "Priority",
                accessorKey: "priority",
                cell: ({ row }) => <span className="text-sm">{row.original.priority ?? 0}</span>,
            },
            {
                header: "Active",
                accessorKey: "is_active",
                cell: ({ row }) => <StatusBadge value={row.original.is_active ? "active" : "inactive"} />,
            },
            {
                header: "",
                id: "actions",
                cell: ({ row }) => {
                    const d = row.original;

                    return (
                        <div className="flex min-w-[220px] justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setItemsDlg({ open: true, deal: d })}>
                                Items
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEdit({ open: true, deal: d })}>
                                Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setConfirm({ open: true, deal: d })}>
                                Delete
                            </Button>
                        </div>
                    );
                },
            },
        ],
        []
    );

    return (
        <div className="space-y-4 sm:space-y-5">
            <PageHeader
                title="Deals"
                subtitle="Manage Deals of the Day (pack-based pricing rules)."
                actions={
                    <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)} disabled={createMut.isPending}>
                        + Create Deal
                    </Button>
                }
            />

            <Card className="p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="grid gap-1.5">
                        <div className="text-xs text-slate-500">From Date</div>
                        <DatePicker
                            selected={parseDate(filters.from)}
                            onChange={(selectedDate) =>
                                setFilters((s) => ({
                                    ...s,
                                    from: selectedDate ? formatDate(selectedDate) : "",
                                }))
                            }
                            dateFormat="dd-MM-yyyy"
                            placeholderText="Select from date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-dailyveg-900 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            wrapperClassName="w-full"
                            isClearable
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <div className="text-xs text-slate-500">To Date</div>
                        <DatePicker
                            selected={parseDate(filters.to)}
                            onChange={(selectedDate) =>
                                setFilters((s) => ({
                                    ...s,
                                    to: selectedDate ? formatDate(selectedDate) : "",
                                }))
                            }
                            dateFormat="dd-MM-yyyy"
                            placeholderText="Select to date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-dailyveg-900 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            wrapperClassName="w-full"
                            isClearable
                        />
                    </div>

                    <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
                        <div className="text-xs text-slate-500">Active</div>
                        <PremiumSelect
                            value={filters.active}
                            onChange={(value) =>
                                setFilters((s) => ({
                                    ...s,
                                    active: value || "",
                                }))
                            }
                            options={[
                                { value: "", label: "All" },
                                { value: "true", label: "Active" },
                                { value: "false", label: "Inactive" },
                            ]}
                            placeholder="Select status"
                        />
                    </div>
                </div>

                {isError ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                        Failed to load: {error?.message || "Error"}
                    </div>
                ) : null}
            </Card>

            {isLoading ? (
                <Card className="p-4 text-sm text-slate-500">Loading…</Card>
            ) : null}

            {!isLoading && !isError ? (
                <>
                    {/* Mobile / tablet premium cards */}
                    <div className="grid gap-3 lg:hidden">
                        {rows.length ? (
                            rows.map((deal) => (
                                <DealMobileCard
                                    key={deal.id}
                                    deal={deal}
                                    onItems={(d) => setItemsDlg({ open: true, deal: d })}
                                    onEdit={(d) => setEdit({ open: true, deal: d })}
                                    onDelete={(d) => setConfirm({ open: true, deal: d })}
                                />
                            ))
                        ) : (
                            <Card className="p-6 text-center">
                                <h3 className="font-semibold text-slate-950 dark:text-slate-50">
                                    No deals
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Create your first deal of the day.
                                </p>
                            </Card>
                        )}
                    </div>

                    {/* Desktop / wide landscape table */}
                    <Card className="hidden p-4 lg:block">
                        <div className="w-full overflow-x-auto">
                            <div className="min-w-[980px]">
                                <DataTable
                                    columns={columns}
                                    data={rows}
                                    searchPlaceholder="Search deals…"
                                    initialPageSize={10}
                                    toolbarRight={
                                        <Button
                                            variant="outline"
                                            onClick={() => qc.invalidateQueries({ queryKey: ["admin-deals"] })}
                                        >
                                            Refresh
                                        </Button>
                                    }
                                />
                            </div>
                        </div>
                    </Card>
                </>
            ) : null}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Create Deal</DialogTitle>
                    </DialogHeader>
                    <DealForm
                        mode="create"
                        isSubmitting={createMut.isPending}
                        defaultValues={{
                            name: "Deals of the Day",
                            description: "",
                            deal_date: "",
                            starts_at: "",
                            ends_at: "",
                            is_active: true,
                            priority: 0,
                        }}
                        onSubmit={(values) => createMut.mutate(values)}
                        onCancel={() => setCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={edit.open} onOpenChange={(open) => setEdit((s) => ({ ...s, open }))}>
                <DialogContent className="max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Edit Deal</DialogTitle>
                    </DialogHeader>

                    {edit.deal ? (
                        <DealForm
                            mode="edit"
                            isSubmitting={updateMut.isPending}
                            defaultValues={{
                                name: edit.deal?.name || "Deals of the Day",
                                description: edit.deal?.description || "",
                                deal_date: edit.deal?.deal_date || "",
                                starts_at: edit.deal?.starts_at || "",
                                ends_at: edit.deal?.ends_at || "",
                                is_active: Boolean(edit.deal?.is_active),
                                priority: edit.deal?.priority ?? 0,
                            }}
                            onSubmit={(values) => updateMut.mutate({ dealId: edit.deal.id, payload: values })}
                            onCancel={() => setEdit({ open: false, deal: null })}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>

            <DealItemsDialog
                open={itemsDlg.open}
                deal={itemsDlg.deal}
                onOpenChange={(open) => {
                    if (!open) setItemsDlg({ open: false, deal: null });
                    else setItemsDlg((s) => ({ ...s, open: true }));
                }}
                onClose={() => setItemsDlg({ open: false, deal: null })}
            />

            <ConfirmDialog
                open={confirm.open}
                title="Delete deal?"
                description={`This will delete the deal for ${confirm.deal?.deal_date || "—"} and all its items.`}
                confirmText="Delete"
                confirmVariant="destructive"
                onConfirm={() => deleteMut.mutate({ dealId: confirm.deal.id })}
                onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))}
                isConfirming={deleteMut.isPending}
            />
        </div>
    );
}