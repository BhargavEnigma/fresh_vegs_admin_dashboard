import * as React from "react";
import { formatIndianDateTime } from "../../../utils/date-formatter";
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
    return formatIndianDateTime(value);
}

function BannerMobileCard({ banner, onMove, onEdit, onToggleActive, onDelete, isReordering }) {
    return (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="relative h-36 w-full bg-slate-100 dark:bg-slate-900">
                {banner.image_url ? (
                    <img
                        src={banner.image_url}
                        alt={banner.title || "banner"}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        No image
                    </div>
                )}

                <div className="absolute right-3 top-3">
                    <StatusBadge value={banner.is_active ? "active" : "inactive"} />
                </div>
            </div>

            <div className="space-y-4 p-4">
                <div>
                    <h3 className="line-clamp-1 text-base font-semibold text-slate-950 dark:text-slate-50">
                        {banner.title || "(No title)"}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {banner.subtitle || "—"}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-900/60">
                    <div>
                        <p className="text-xs text-slate-500">Placement</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                            {banner.placement || "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500">Order</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                            {banner.sort_order ?? 0}
                        </p>
                    </div>

                    <div className="col-span-2">
                        <p className="text-xs text-slate-500">Action</p>
                        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                            {banner.action_type || "—"}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-slate-500">
                            {banner.action_value || "—"}
                        </p>
                    </div>

                    <div className="col-span-2">
                        <p className="text-xs text-slate-500">Schedule</p>
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                            Start: {formatDate(banner.start_at)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                            End: {formatDate(banner.end_at)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMove(banner.id, "up")}
                        disabled={isReordering}
                    >
                        Up
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMove(banner.id, "down")}
                        disabled={isReordering}
                    >
                        Down
                    </Button>

                    <Button variant="outline" size="sm" onClick={() => onEdit(banner)}>
                        Edit
                    </Button>

                    <Button
                        variant={banner.is_active ? "outline" : "default"}
                        size="sm"
                        onClick={() => onToggleActive(banner)}
                    >
                        {banner.is_active ? "Disable" : "Enable"}
                    </Button>

                    <Button
                        variant="destructive"
                        size="sm"
                        className="col-span-2"
                        onClick={() => onDelete(banner)}
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </Card>
    );
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
            if (imageFile) return AdminBannersService.createWithImage(payload, imageFile);
            return AdminBannersService.create(payload);
        },
        meta: {
            globalLoaderMessage: "Creating banner...",
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
            if (imageFile) return AdminBannersService.updateWithImage(bannerId, payload, imageFile);
            return AdminBannersService.update(bannerId, payload);
        },
        meta: {
            globalLoaderMessage: "Saving banner...",
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
        meta: {
            globalLoaderMessage: "Updating banner status...",
        },
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
        meta: {
            globalLoaderMessage: "Deleting banner...",
        },
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
        meta: {
            globalLoaderMessage: "Saving banner order...",
        },
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

        reorderMut.mutate(next.map((r) => r.id));
    }

    const columns = React.useMemo(
        () => [
            {
                header: "Banner",
                id: "banner",
                cell: ({ row }) => {
                    const b = row.original;
                    return (
                        <div className="flex min-w-[220px] items-center gap-3">
                            <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                {b.image_url ? (
                                    <img
                                        src={b.image_url}
                                        alt={b.title || "banner"}
                                        className="h-full w-full object-cover"
                                    />
                                ) : null}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate font-medium">{b.title || "(No title)"}</div>
                                <div className="truncate text-xs text-slate-500">{b.subtitle || "—"}</div>
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
                        <div className="max-w-[180px] text-sm">
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
                        <div className="min-w-[160px] text-xs text-slate-600 dark:text-slate-300">
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
                        <div className="flex min-w-[320px] justify-end gap-2">
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
        [reorderMut.isPending]
    );

    return (
        <div className="min-w-0 space-y-4 sm:space-y-5">
            <PageHeader
                title="Banners"
                subtitle="Manage home banners (offers / ads). Backend: /v1/admin/banners"
                actions={
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Input
                            value={placement}
                            onChange={(e) => setPlacement(e.target.value || "home")}
                            placeholder="home"
                            className="w-full sm:w-[160px]"
                        />
                        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
                            Create Banner
                        </Button>
                    </div>
                }
            />

            {isLoading ? (
                <Card className="p-4 text-sm text-slate-500">Loading…</Card>
            ) : null}

            {isError ? (
                <Card className="border-red-200 p-4 text-sm text-red-700 dark:border-red-900">
                    {error?.response?.data?.error?.message || error?.message || "Failed to load"}
                </Card>
            ) : null}

            {!isLoading && !isError ? (
                <>
                    {/* Mobile premium cards */}
                    <div className="grid gap-3 lg:hidden">
                        {rows.length ? (
                            rows.map((banner) => (
                                <BannerMobileCard
                                    key={banner.id}
                                    banner={banner}
                                    onMove={moveRow}
                                    onEdit={(b) => setEdit({ open: true, banner: b })}
                                    onToggleActive={(b) =>
                                        setConfirm({
                                            open: true,
                                            mode: "active",
                                            banner: b,
                                            nextActive: !b.is_active,
                                        })
                                    }
                                    onDelete={(b) =>
                                        setConfirm({
                                            open: true,
                                            mode: "delete",
                                            banner: b,
                                            nextActive: false,
                                        })
                                    }
                                    isReordering={reorderMut.isPending}
                                />
                            ))
                        ) : (
                            <Card className="p-6 text-center">
                                <h3 className="font-semibold text-slate-950 dark:text-slate-50">
                                    No banners
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Create your first banner for this placement.
                                </p>
                            </Card>
                        )}
                    </div>

                    {/* Desktop / large landscape table */}
                    <Card className="hidden min-w-0 overflow-hidden p-4 lg:block">
                        <div className="w-full max-w-full overflow-x-auto">
                            <div className="min-w-[960px] max-w-full">
                                <DataTable
                                    columns={columns}
                                    data={rows}
                                    searchPlaceholder="Search banner…"
                                />
                            </div>
                        </div>
                    </Card>
                </>
            ) : null}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6 lg:max-w-3xl">
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

            <Dialog open={edit.open} onOpenChange={(open) => setEdit((s) => ({ ...s, open }))}>
                <DialogContent className="max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6 lg:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Banner</DialogTitle>
                    </DialogHeader>

                    {edit.banner ? (
                        <BannerForm
                            mode="edit"
                            defaultValues={{
                                ...edit.banner,
                                sort_order: Number(edit.banner.sort_order) || 0,
                                is_active: Boolean(edit.banner.is_active),
                            }}
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
                        ? "This will permanently delete the banner and its stored image."
                        : "This will update banner active status."
                }
                confirmText={confirm.mode === "delete" ? "Delete" : confirm.nextActive ? "Enable" : "Disable"}
                confirmVariant={confirm.mode === "delete" || !confirm.nextActive ? "destructive" : "default"}
                onConfirm={async () => {
                    const b = confirm.banner;
                    if (!b) return;

                    if (confirm.mode === "delete") {
                        await deleteMut.mutateAsync({ bannerId: b.id });
                        return;
                    }

                    await activeMut.mutateAsync({
                        bannerId: b.id,
                        is_active: confirm.nextActive,
                    });
                }}
                isConfirming={deleteMut.isPending || activeMut.isPending}
            />
        </div>
    );
}
