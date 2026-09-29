import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { WarehousesService } from "../../../api/services/warehouses.service";

import { PageHeader } from "../../../components/common/page-header";
import { DataTable } from "../../../components/common/data-table";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { StatusBadge } from "../../../components/common/status-badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useToast } from "../../../components/toast/toast-context";
import {
    Warehouse,
    Plus,
    Search,
    MapPin,
    Eye,
    Pencil,
    PowerOff,
    Copy,
    CheckCircle2,
    AlertCircle,
    Building2,
    Compass,
    Filter,
} from "lucide-react";

export function WarehousesListPage() {
    const toast = useToast();
    const qc = useQueryClient();
    const [includeInactive, setIncludeInactive] = useState(false);
    const [toDeactivate, setToDeactivate] = useState(null);

    const query = useQuery({
        queryKey: ["warehouses", { includeInactive }],
        queryFn: () => WarehousesService.list({ includeInactive }),
    });

    const warehouses = query.data || [];

    const deactivateMut = useMutation({
        mutationFn: (id) => WarehousesService.deactivate(id),
        meta: {
            globalLoaderMessage: "Deactivating warehouse...",
        },
        onSuccess: () => {
            toast.success("Warehouse deactivated");
            setToDeactivate(null);
            qc.invalidateQueries({ queryKey: ["warehouses"] });
        },
        onError: (e) => toast.error(e?.message || "Failed to deactivate"),
    });

    const columns = useMemo(
        () => [
            {
                id: "name",
                header: "Name",
                cell: ({ row }) => (
                    <div className="min-w-[180px]">
                        <div className="font-medium">{row.original.name}</div>
                        <div className="text-xs text-slate-500">{row.original.id}</div>
                    </div>
                ),
            },
            { accessorKey: "city", header: "City" },
            { accessorKey: "state", header: "State" },
            { accessorKey: "pincode", header: "Pincode" },
            {
                id: "active",
                header: "Active",
                cell: ({ row }) => (
                    <StatusBadge value={row.original.is_active ? "Active" : "Inactive"} />
                ),
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="secondary" size="sm">
                            <Link to={`/admin/warehouses/${row.original.id}`}>View</Link>
                        </Button>
                        <Button asChild variant="secondary" size="sm">
                            <Link to={`/admin/warehouses/${row.original.id}/edit`}>Edit</Link>
                        </Button>
                        {row.original.is_active ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setToDeactivate(row.original)}
                            >
                                Deactivate
                            </Button>
                        ) : null}
                    </div>
                ),
            },
        ],
        []
    );

    const [search, setSearch] = useState("");

    const stats = useMemo(() => {
        const total = warehouses.length;
        const active = warehouses.filter((w) => w.is_active).length;
        const inactive = total - active;
        const cities = new Set(warehouses.map((w) => w.city).filter(Boolean)).size;
        return { total, active, inactive, cities };
    }, [warehouses]);

    const filteredWarehouses = useMemo(() => {
        if (!search.trim()) return warehouses;
        const q = search.toLowerCase().trim();
        return warehouses.filter((w) =>
            (w.name && w.name.toLowerCase().includes(q)) ||
            (w.city && w.city.toLowerCase().includes(q)) ||
            (w.state && w.state.toLowerCase().includes(q)) ||
            (w.pincode && String(w.pincode).toLowerCase().includes(q)) ||
            (w.id && String(w.id).toLowerCase().includes(q))
        );
    }, [warehouses, search]);

    const copyToClipboard = (text, label = "Warehouse ID") => {
        if (!text) return;
        navigator.clipboard.writeText(String(text));
        toast.push({
            variant: "success",
            title: `${label} copied`,
            description: `${label} copied to clipboard.`,
        });
    };

    return (
        <div className="space-y-4 px-0 sm:space-y-5">
            <PageHeader
                title="Warehouses"
                subtitle="Create and manage your warehouse locations."
                actions={(
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Button
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => setIncludeInactive((v) => !v)}
                        >
                            {includeInactive ? "Hide Inactive" : "Show Inactive"}
                        </Button>
                        <Button asChild className="w-full sm:w-auto bg-dailyveg-600 hover:bg-dailyveg-700 font-semibold text-white">
                            <Link to="/admin/warehouses/new">
                                <Plus className="mr-1.5 h-4 w-4" />
                                New Warehouse
                            </Link>
                        </Button>
                    </div>
                )}
            />

            {/* Mobile Executive KPI Strip */}
            {!query.isLoading && warehouses.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:hidden">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Total Hubs</span>
                            <Warehouse className="h-3.5 w-3.5 text-dailyveg-600" />
                        </div>
                        <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                            {stats.total}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {stats.active}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Cities</span>
                            <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                        </div>
                        <div className="mt-1 text-xl font-black text-indigo-600 dark:text-indigo-400">
                            {stats.cities}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Inactive</span>
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="mt-1 text-xl font-black text-amber-600 dark:text-amber-400">
                            {stats.inactive}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Search & Filter Bar */}
            <div className="flex flex-col gap-2 md:hidden">
                <div className="relative w-full">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search warehouses by name, city, pincode…"
                        className="h-10 rounded-xl pl-9 pr-14 text-xs sm:text-sm"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl text-xs gap-1.5"
                        onClick={() => setIncludeInactive((v) => !v)}
                    >
                        <Filter className="h-3.5 w-3.5 text-slate-500" />
                        <span>{includeInactive ? "Hide Inactive" : "Show Inactive"}</span>
                    </Button>

                    <Button asChild size="sm" className="h-9 rounded-xl text-xs gap-1.5 bg-dailyveg-600 font-semibold text-white hover:bg-dailyveg-700">
                        <Link to="/admin/warehouses/new">
                            <Plus className="h-3.5 w-3.5" />
                            <span>New Warehouse</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Mobile / small tablet card layout */}
            <div className="grid gap-3 md:hidden">
                {query.isLoading ? (
                    <Card className="p-4 rounded-2xl">
                        <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    </Card>
                ) : filteredWarehouses.length ? (
                    filteredWarehouses.map((warehouse) => (
                        <Card
                            key={warehouse.id}
                            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition dark:border-slate-800 dark:bg-slate-950"
                        >
                            <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-dailyveg-50 text-dailyveg-600 shrink-0 dark:bg-dailyveg-950/60 dark:text-dailyveg-400">
                                        <Warehouse className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                                            {warehouse.name}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(warehouse.id, "Warehouse ID")}
                                            className="mt-0.5 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 hover:text-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                        >
                                            <span className="truncate max-w-[130px]">{warehouse.id}</span>
                                            <Copy className="h-2.5 w-2.5 opacity-70 shrink-0" />
                                        </button>
                                    </div>
                                </div>

                                <StatusBadge value={warehouse.is_active ? "Active" : "Inactive"} />
                            </div>

                            {/* 3-Tile Specs Grid */}
                            <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-2.5 text-xs dark:bg-slate-900/60">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <MapPin className="h-3 w-3 text-indigo-500 shrink-0" /> City
                                    </div>
                                    <div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {warehouse.city || "—"}
                                    </div>
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <Building2 className="h-3 w-3 text-emerald-500 shrink-0" /> State
                                    </div>
                                    <div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {warehouse.state || "—"}
                                    </div>
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <Compass className="h-3 w-3 text-amber-500 shrink-0" /> PIN
                                    </div>
                                    <div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">
                                        {warehouse.pincode || "—"}
                                    </div>
                                </div>
                            </div>

                            {/* Touch-Friendly Action Buttons */}
                            <div className="mt-3.5 grid grid-cols-3 gap-2">
                                <Button asChild variant="outline" size="sm" className="h-9 rounded-xl text-xs gap-1">
                                    <Link to={`/admin/warehouses/${warehouse.id}`}>
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>View</span>
                                    </Link>
                                </Button>

                                <Button asChild variant="outline" size="sm" className="h-9 rounded-xl text-xs gap-1">
                                    <Link to={`/admin/warehouses/${warehouse.id}/edit`}>
                                        <Pencil className="h-3.5 w-3.5" />
                                        <span>Edit</span>
                                    </Link>
                                </Button>

                                {warehouse.is_active ? (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-9 rounded-xl text-xs gap-1"
                                        onClick={() => setToDeactivate(warehouse)}
                                    >
                                        <PowerOff className="h-3.5 w-3.5" />
                                        <span>Deactivate</span>
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled
                                        className="h-9 rounded-xl text-xs opacity-60"
                                    >
                                        Inactive
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="p-8 text-center rounded-2xl">
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400">
                            <Warehouse className="h-6 w-6" />
                        </div>
                        <h3 className="mt-3 font-bold text-slate-900 dark:text-slate-100">
                            {search ? "No matching warehouses" : "No warehouses found"}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            {search ? `No results found for "${search}". Try clearing the search.` : "Create a warehouse to start fulfilling orders."}
                        </p>
                        {search && (
                            <div className="mt-3">
                                <Button variant="outline" size="sm" onClick={() => setSearch("")} className="rounded-xl text-xs">
                                    Clear Search
                                </Button>
                            </div>
                        )}
                    </Card>
                )}
            </div>

            {/* Desktop / rotated tablet table layout */}
            <Card className="hidden p-4 md:block">
                <div className="w-full overflow-x-auto">
                    <div className="min-w-[760px]">
                        <DataTable
                            columns={columns}
                            data={filteredWarehouses}
                            isLoading={query.isLoading}
                            emptyTitle="No warehouses"
                            emptyDescription="Create a warehouse to start fulfilling orders."
                        />
                    </div>
                </div>
            </Card>

            <ConfirmDialog
                open={!!toDeactivate}
                onOpenChange={(v) => (!v ? setToDeactivate(null) : null)}
                title="Deactivate warehouse?"
                description="This will mark the warehouse as inactive. It will not be used for new allocations."
                confirmText="Deactivate"
                confirmVariant="destructive"
                onConfirm={() => deactivateMut.mutate(toDeactivate.id)}
                isConfirming={deactivateMut.isPending}
            />
        </div>
    );
}