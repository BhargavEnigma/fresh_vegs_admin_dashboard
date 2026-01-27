import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminBannersService } from "../../../api/services/admin-banners.service";
import { PageHeader } from "../../../components/common/page-header";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { DataTable } from "../../../components/common/data-table";
import { StatusBadge } from "../../../components/common/status-badge";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { useToast } from "../../../components/toast/toast-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

import { BannerForm } from "./banner-form";

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
}

export function AdminBannersPage() {
    const qc = useQueryClient();
    const toast = useToast();

    const [placement, setPlacement] = React.useState("home");

    const [createOpen, setCreateOpen] = React.useState(false);
    const [edit, setEdit] = React.useState({ open: false, banner: null });

    const [confirm, setConfirm] = React.useState({
        open: false,
        mode: "active",
        banner: null,
        nextActive: true,
    });

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin-banners", placement],
        queryFn: () => AdminBannersService.list({ placement }),
    });

    const rows = data?.data?.banners || [];

    const createMut = useMutation({
        mutationFn: async ({ payload, imageFile }) => {
            if (imageFile) {
                return AdminBannersService.createWithImage(payload, imageFile);
            }
            return AdminBannersService.create(payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-banners", placement] });
            toast.push({ variant: "success", title: "Created", description: "Banner created." });
            setCreateOpen(false);
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Create failed", description: msg });
        },
    });

    const updateMut = useMutation({
        mutationFn: async ({ bannerId, payload, imageFile }) => {
            if (imageFile) {
                return AdminBannersService.updateWithImage(bannerId, payload, imageFile);
            }
            return AdminBannersService.update(bannerId, payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-banners", placement] });
            toast.push({ variant: "success", title: "Saved", description: "Banner updated." });
            setEdit({ open: false, banner: null });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Update failed", description: msg });
        },
    });

    const activeMut = useMutation({
        mutationFn: ({ bannerId, is_active }) => AdminBannersService.setActive(bannerId, is_active),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-banners", placement] });
            toast.push({ variant: "success", title: "Updated", description: "Banner status updated." });
            setConfirm({ open: false, mode: "active", banner: null, nextActive: true });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Update failed", description: msg });
        },
    });

    const deleteMut = useMutation({
        mutationFn: ({ bannerId }) => AdminBannersService.remove(bannerId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-banners", placement] });
            toast.push({ variant: "success", title: "Deleted", description: "Banner deleted." });
            setConfirm({ open: false, mode: "active", banner: null, nextActive: true });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Delete failed", description: msg });
        },
    });

    const reorderMut = useMutation({
        mutationFn: (ids) => AdminBannersService.reorder(ids),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin-banners", placement] });
            toast.push({ variant: "success", title: "Reordered", description: "Banner order updated." });
        },
        onError: (e) => {
            const msg = e?.response?.data?.error?.message || e?.message || "Failed";
            toast.push({ variant: "error", title: "Reorder failed", description: msg });
        },
    });

    function moveRow(id, direction) {
        const idx = rows.findIndex((r) => r.id === id);
        if (idx < 0) return;
        const next = [...rows];
        const swapWith = direction === "up" ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= next.length) return;
        const tmp = next[idx];
        next[idx] = next[swapWith];
        next[swapWith] = tmp;
        const ids = next.map((r) => r.id);
        reorderMut.mutate(ids);
    }

    const columns = React.useMemo(
        () => [
            {
                header: "Banner",
                id: "banner",
                cell: ({ row }) => {
                    const b = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                {b.image_url ? (
                                    <img src={b.image_url} alt={b.title || "banner"} className="h-full w-full object-cover" />
                                ) : null}
                            </div>
                            <div>
                                <div className="font-medium">{b.title || "(No title)"}</div>
                                <div className="text-xs text-slate-500">{b.subtitle || "—"}</div>
                            </div>
                        </div>
                    );
                },
            },
            {
                header: "Placement",
                accessorKey: "placement",
                cell: ({ row }) => <span className="text-sm">{row.original.placement || "—"}</span>,
            },
            {
                header: "Action",
                id: "action",
                cell: ({ row }) => {
                    const b = row.original;
                    return (
                        <div className="text-sm">
                            <div className="font-medium">{b.action_type}</div>
                            <div className="truncate text-xs text-slate-500" title={b.action_value || ""}>
                                {b.action_value || "—"}
                            </div>
                        </div>
                    );
                },
            },
            {
                header: "Schedule",
                id: "schedule",
                cell: ({ row }) => {
                    const b = row.original;
                    return (
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                            <div>Start: {formatDate(b.start_at)}</div>
                            <div>End: {formatDate(b.end_at)}</div>
                        </div>
                    );
                },
            },
            {
                header: "Order",
                accessorKey: "sort_order",
                cell: ({ row }) => <span className="text-sm">{row.original.sort_order ?? 0}</span>,
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
                    const b = row.original;
                    return (
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => moveRow(b.id, "up")} disabled={reorderMut.isPending}>
                                Up
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => moveRow(b.id, "down")} disabled={reorderMut.isPending}>
                                Down
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEdit({ open: true, banner: b })}>
                                Edit
                            </Button>
                            <Button
                                variant={b.is_active ? "outline" : "default"}
                                size="sm"
                                onClick={() =>
                                    setConfirm({
                                        open: true,
                                        mode: "active",
                                        banner: b,
                                        nextActive: !b.is_active,
                                    })
                                }
                            >
                                {b.is_active ? "Disable" : "Enable"}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setConfirm({ open: true, mode: "delete", banner: b, nextActive: false })}
                            >
                                Delete
                            </Button>
                        </div>
                    );
                },
            },
        ],
        // rows is used in moveRow only; columns itself does not depend on rows.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [reorderMut.isPending]
    );

    return (
        <div className="">
            <PageHeader
                title="Banners"
                subtitle="Manage home banners (offers / ads). Backend: /v1/admin/banners"
                actions={
                    <div className="flex items-center gap-2">
                        <Input
                            value={placement}
                            onChange={(e) => setPlacement(e.target.value || "home")}
                            placeholder="home"
                            className="w-[160px]"
                        />
                        <Button onClick={() => setCreateOpen(true)}>Create Banner</Button>
                    </div>
                }
            />

            <Card className="p-4">
                {isLoading ? <div className="text-sm text-slate-500">Loading…</div> : null}
                {isError ? (
                    <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-slate-950">
                        {error?.response?.data?.error?.message || error?.message || "Failed to load"}
                    </div>
                ) : null}

                {!isLoading && !isError ? (
                    <DataTable columns={columns} data={rows} searchPlaceholder="Search banner…" />
                ) : null}
            </Card>

            {/* Create */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="
                    w-[calc(100vw-24px)]
                    sm:max-w-2xl
                    lg:max-w-3xl
                    max-h-[calc(100vh-64px)]
                    overflow-y-auto
                    p-4 sm:p-6
                ">
                    <DialogHeader>
                        <DialogTitle>Create Banner</DialogTitle>
                    </DialogHeader>
                    <BannerForm
                        mode="create"
                        defaultValues={{ placement }}
                        isSubmitting={createMut.isPending}
                        onCancel={() => setCreateOpen(false)}
                        onSubmit={({ payload, imageFile }) => createMut.mutate({ payload, imageFile })}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit */}
            <Dialog open={edit.open} onOpenChange={(open) => setEdit((s) => ({ ...s, open }))}>
                <DialogContent className="
                    w-[calc(100vw-24px)]
                    sm:max-w-2xl
                    lg:max-w-3xl
                    max-h-[calc(100vh-64px)]
                    overflow-y-auto
                    p-4 sm:p-6
                ">
                    <DialogHeader>
                        <DialogTitle>Edit Banner</DialogTitle>
                    </DialogHeader>
                    {edit.banner ? (
                        <BannerForm
                            mode="edit"
                            defaultValues={edit.banner}
                            isSubmitting={updateMut.isPending}
                            onCancel={() => setEdit({ open: false, banner: null })}
                            onSubmit={({ payload, imageFile }) =>
                                updateMut.mutate({ bannerId: edit.banner.id, payload, imageFile })
                            }
                        />
                    ) : null}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirm.open}
                onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
                title={
                    confirm.mode === "delete"
                        ? "Delete banner?"
                        : confirm.nextActive
                            ? "Enable banner?"
                            : "Disable banner?"
                }
                description={
                    confirm.mode === "delete"
                        ? "This will permanently delete the banner (and its stored image)."
                        : "This uses PATCH /v1/admin/banners/:bannerId/active"
                }
                confirmText={confirm.mode === "delete" ? "Delete" : confirm.nextActive ? "Enable" : "Disable"}
                variant={confirm.mode === "delete" ? "destructive" : confirm.nextActive ? "default" : "destructive"}
                onConfirm={async () => {
                    const b = confirm.banner;
                    if (!b) return;
                    if (confirm.mode === "delete") {
                        await deleteMut.mutateAsync({ bannerId: b.id });
                        return;
                    }
                    await activeMut.mutateAsync({ bannerId: b.id, is_active: confirm.nextActive });
                }}
            />
        </div>
    );
}
