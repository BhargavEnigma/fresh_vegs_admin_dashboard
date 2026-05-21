import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DatePicker from "react-datepicker";

import { CostsService } from "../../../api/services/cost.service";
import { WarehousesService } from "../../../api/services/warehouses.service";
import { costCreateSchema } from "../../../validations/cost.validation";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { useToast } from "../../../components/toast/toast-context";

const CATEGORIES = [
    { value: "procurement", label: "Procurement" },
    { value: "delivery", label: "Delivery" },
    { value: "packaging", label: "Packaging" },
    { value: "misc", label: "Miscellaneous" },
];

function rupeesToPaise(value) {
    return Math.round(Number(value || 0) * 100);
}

function paiseToRupees(value) {
    return `₹${(Number(value || 0) / 100).toFixed(2)}`;
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

export function CostPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState("overview");

    const [filters, setFilters] = useState({
        from_date: today(),
        to_date: today(),
        category: "",
        warehouse_id: "",
        status: "active",
    });

    const [procurementDate, setProcurementDate] = useState(today());
    const [procurementWarehouseId, setProcurementWarehouseId] = useState("");

    const warehousesQuery = useQuery({
        queryKey: ["warehouses", "cost-page"],
        queryFn: () => WarehousesService.list({ includeInactive: false }),
    });

    const costsQuery = useQuery({
        queryKey: ["costs", filters],
        queryFn: () =>
            CostsService.list({
                ...filters,
                category: filters.category || undefined,
                warehouse_id: filters.warehouse_id || undefined,
                status: filters.status || undefined,
            }),
    });

    const summaryQuery = useQuery({
        queryKey: ["costs-summary", filters],
        queryFn: () =>
            CostsService.summary({
                ...filters,
                category: filters.category || undefined,
                warehouse_id: filters.warehouse_id || undefined,
                status: filters.status || undefined,
            }),
    });

    const profitQuery = useQuery({
        queryKey: ["costs-profit-overview", filters],
        queryFn: () =>
            CostsService.profitOverview({
                from_date: filters.from_date || undefined,
                to_date: filters.to_date || undefined,
                warehouse_id: filters.warehouse_id || undefined,
            }),
    });

    const procurementQuery = useQuery({
        queryKey: ["procurement-cost-items", procurementDate, procurementWarehouseId],
        queryFn: () =>
            CostsService.procurementItems({
                delivery_date: procurementDate,
                warehouse_id: procurementWarehouseId || undefined,
            }),
        enabled: activeTab === "procurement",
    });

    const form = useForm({
        resolver: zodResolver(costCreateSchema),
        defaultValues: {
            cost_date: today(),
            category: "delivery",
            warehouse_id: "",
            related_order_id: "",
            reference_type: "",
            reference_no: "",
            amount_rupees: "",
            notes: "",
        },
    });

    const createMutation = useMutation({
        mutationFn: (values) =>
            CostsService.create({
                cost_date: values.cost_date,
                category: values.category,
                warehouse_id: values.warehouse_id || null,
                related_order_id: values.related_order_id || null,
                reference_type: values.reference_type || null,
                reference_no: values.reference_no || null,
                amount_paise: rupeesToPaise(values.amount_rupees),
                notes: values.notes || null,
            }),
        onSuccess: () => {
            toast.success("Cost entry added");
            form.reset({
                cost_date: today(),
                category: "delivery",
                warehouse_id: "",
                related_order_id: "",
                reference_type: "",
                reference_no: "",
                amount_rupees: "",
                notes: "",
            });
            queryClient.invalidateQueries({ queryKey: ["costs"] });
            queryClient.invalidateQueries({ queryKey: ["costs-summary"] });
            queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] });
        },
        onError: () => toast.error("Failed to add cost entry"),
    });

    const archiveMutation = useMutation({
        mutationFn: (id) => CostsService.remove(id),
        onSuccess: () => {
            toast.success("Cost archived");
            queryClient.invalidateQueries({ queryKey: ["costs"] });
            queryClient.invalidateQueries({ queryKey: ["costs-summary"] });
            queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] });
        },
        onError: () => toast.error("Failed to archive cost"),
    });

    const procurementSaveMutation = useMutation({
        mutationFn: (items) =>
            CostsService.bulkUpsertProcurement({
                delivery_date: procurementDate,
                warehouse_id: procurementWarehouseId || null,
                items,
            }),
        onSuccess: () => {
            toast.success("Procurement costs saved");
            queryClient.invalidateQueries({ queryKey: ["procurement-cost-items"] });
            queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] });
        },
        onError: () => toast.error("Failed to save procurement costs"),
    });

    const costs = costsQuery.data || [];
    const summary = summaryQuery.data || {};
    const profit = profitQuery.data || {};
    const warehouses = warehousesQuery.data || [];
    const procurementItems = procurementQuery.data?.items || [];

    const [procurementDraft, setProcurementDraft] = useState({});

    const procurementRows = useMemo(() => {
        return procurementItems.map((item) => {
            const key = `${item.product_id}-${item.product_pack_id || "base"}`;
            const draft = procurementDraft[key] || {};
            const unitCostPaise =
                draft.unit_cost_paise !== undefined
                    ? Number(draft.unit_cost_paise)
                    : Number(item.unit_cost_paise || 0);

            return {
                ...item,
                key,
                unit_cost_paise: unitCostPaise,
                total_cost_paise: Math.round(Number(item.ordered_quantity || 0) * unitCostPaise),
                notes: draft.notes !== undefined ? draft.notes : item.notes || "",
            };
        });
    }, [procurementItems, procurementDraft]);

    function updateProcurementDraft(key, patch) {
        setProcurementDraft((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                ...patch,
            },
        }));
    }

    function saveProcurement() {
        const items = procurementRows.map((item) => ({
            product_id: item.product_id,
            product_pack_id: item.product_pack_id || null,
            product_name: item.product_name,
            pack_label: item.pack_label || null,
            ordered_quantity: Number(item.ordered_quantity || 0),
            unit_cost_paise: Number(item.unit_cost_paise || 0),
            notes: item.notes || null,
        }));

        procurementSaveMutation.mutate(items);
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cost Management"
                subtitle="Track procurement cost, delivery expenses, packaging, miscellaneous cost and daily profitability."
            />

            <div className="flex flex-wrap gap-2">
                {["overview", "costs", "procurement"].map((tab) => (
                    <Button
                        key={tab}
                        type="button"
                        variant={activeTab === tab ? "default" : "outline"}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === "overview" ? "Overview" : tab === "costs" ? "Manual Costs" : "Procurement"}
                    </Button>
                ))}
            </div>

            <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-5">
                    <div className="grid gap-1.5">
                        <Label>From Date</Label>
                        <DatePicker
                            selected={filters.from_date ? new Date(filters.from_date) : null}
                            onChange={(selectedDate) =>
                                setFilters((p) => ({
                                    ...p,
                                    from_date: selectedDate
                                        ? selectedDate
                                        : "",
                                }))
                            }
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Select from date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            isClearable
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>To Date</Label>
                        <DatePicker
                            selected={filters.to_date ? new Date(filters.to_date) : null}
                            onChange={(selectedDate) =>
                                setFilters((p) => ({
                                    ...p,
                                    to_date: selectedDate
                                        ? selectedDate
                                        : "",
                                }))
                            }
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Select to date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            isClearable
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Category</Label>
                        <select
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                            value={filters.category}
                            onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
                        >
                            <option value="">All</option>
                            {CATEGORIES.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Warehouse</Label>
                        <select
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                            value={filters.warehouse_id}
                            onChange={(e) => setFilters((p) => ({ ...p, warehouse_id: e.target.value }))}
                        >
                            <option value="">All</option>
                            {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Status</Label>
                        <select
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                            value={filters.status}
                            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                        >
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                            <option value="">All</option>
                        </select>
                    </div>
                </div>
            </Card>

            {activeTab === "overview" ? (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="p-4">
                            <div className="text-sm text-slate-500">Revenue</div>
                            <div className="mt-2 text-2xl font-bold">{paiseToRupees(profit.revenue_paise)}</div>
                        </Card>

                        <Card className="p-4">
                            <div className="text-sm text-slate-500">Total Cost</div>
                            <div className="mt-2 text-2xl font-bold">{paiseToRupees(profit.total_cost_paise)}</div>
                        </Card>

                        <Card className="p-4">
                            <div className="text-sm text-slate-500">Net Profit</div>
                            <div className="mt-2 text-2xl font-bold">{paiseToRupees(profit.profit_paise)}</div>
                        </Card>

                        <Card className="p-4">
                            <div className="text-sm text-slate-500">Margin</div>
                            <div className="mt-2 text-2xl font-bold">{profit.margin_percent || 0}%</div>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="p-4">
                            <div className="text-sm text-slate-500">Procurement</div>
                            <div className="mt-2 text-xl font-semibold">{paiseToRupees(profit.procurement_paise)}</div>
                        </Card>

                        <Card className="p-4">
                            <div className="text-sm text-slate-500">Delivery</div>
                            <div className="mt-2 text-xl font-semibold">{paiseToRupees(summary.delivery_paise)}</div>
                        </Card>

                        <Card className="p-4">
                            <div className="text-sm text-slate-500">Packaging</div>
                            <div className="mt-2 text-xl font-semibold">{paiseToRupees(summary.packaging_paise)}</div>
                        </Card>

                        <Card className="p-4">
                            <div className="text-sm text-slate-500">Miscellaneous</div>
                            <div className="mt-2 text-xl font-semibold">{paiseToRupees(summary.misc_paise)}</div>
                        </Card>
                    </div>
                </>
            ) : null}

            {activeTab === "costs" ? (
                <>
                    <Card className="p-4">
                        <form
                            className="grid gap-4 md:grid-cols-4"
                            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
                        >
                            <div>
                                <Label>Date</Label>
                                <Input type="date" {...form.register("cost_date")} />
                            </div>

                            <div>
                                <Label>Category</Label>
                                <select
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                    {...form.register("category")}
                                >
                                    {CATEGORIES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label>Warehouse</Label>
                                <select
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                    {...form.register("warehouse_id")}
                                >
                                    <option value="">No warehouse</option>
                                    {warehouses.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label>Amount ₹</Label>
                                <Input type="number" step="0.01" {...form.register("amount_rupees")} />
                            </div>

                            <div>
                                <Label>Reference Type</Label>
                                <Input placeholder="order / bill / vendor" {...form.register("reference_type")} />
                            </div>

                            <div>
                                <Label>Reference No.</Label>
                                <Input placeholder="Bill no / order no" {...form.register("reference_no")} />
                            </div>

                            <div className="md:col-span-2">
                                <Label>Notes</Label>
                                <Input placeholder="Optional notes" {...form.register("notes")} />
                            </div>

                            <div className="md:col-span-4">
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Saving..." : "Add Cost"}
                                </Button>
                            </div>
                        </form>
                    </Card>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/40">
                                <tr>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Category</th>
                                    <th className="px-4 py-3 text-left">Warehouse</th>
                                    <th className="px-4 py-3 text-left">Reference</th>
                                    <th className="px-4 py-3 text-left">Amount</th>
                                    <th className="px-4 py-3 text-left">Created By</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {costs.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                                            No cost entries found.
                                        </td>
                                    </tr>
                                ) : (
                                    costs.map((cost) => (
                                        <tr key={cost.id} className="border-t border-slate-100 dark:border-slate-900">
                                            <td className="px-4 py-3">{cost.cost_date}</td>
                                            <td className="px-4 py-3 capitalize">{cost.category}</td>
                                            <td className="px-4 py-3">{cost.warehouse?.name || "—"}</td>
                                            <td className="px-4 py-3">
                                                {cost.reference_no || cost.reference_type || "—"}
                                            </td>
                                            <td className="px-4 py-3 font-semibold">
                                                {paiseToRupees(cost.amount_paise)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {cost.creator?.full_name || cost.creator?.phone || "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge>{cost.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {cost.status !== "archived" ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={archiveMutation.isPending}
                                                        onClick={() => archiveMutation.mutate(cost.id)}
                                                    >
                                                        Archive
                                                    </Button>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}

            {activeTab === "procurement" ? (
                <>
                    <Card className="p-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <Label>Delivery Date</Label>
                                <Input
                                    type="date"
                                    value={procurementDate}
                                    onChange={(e) => setProcurementDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label>Warehouse</Label>
                                <select
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                                    value={procurementWarehouseId}
                                    onChange={(e) => setProcurementWarehouseId(e.target.value)}
                                >
                                    <option value="">All Warehouses</option>
                                    {warehouses.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    disabled={procurementSaveMutation.isPending || procurementRows.length === 0}
                                    onClick={saveProcurement}
                                >
                                    {procurementSaveMutation.isPending ? "Saving..." : "Save Procurement Costs"}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/40">
                                <tr>
                                    <th className="px-4 py-3 text-left">Product</th>
                                    <th className="px-4 py-3 text-left">Pack</th>
                                    <th className="px-4 py-3 text-left">Ordered Qty</th>
                                    <th className="px-4 py-3 text-left">Unit Cost ₹</th>
                                    <th className="px-4 py-3 text-left">Total Cost</th>
                                    <th className="px-4 py-3 text-left">Notes</th>
                                </tr>
                            </thead>

                            <tbody>
                                {procurementRows.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-10 text-center text-slate-500">
                                            No order items found for this delivery date.
                                        </td>
                                    </tr>
                                ) : (
                                    procurementRows.map((item) => (
                                        <tr key={item.key} className="border-t border-slate-100 dark:border-slate-900">
                                            <td className="px-4 py-3 font-medium">{item.product_name}</td>
                                            <td className="px-4 py-3">{item.pack_label || "Base"}</td>
                                            <td className="px-4 py-3">{item.ordered_quantity}</td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={(Number(item.unit_cost_paise || 0) / 100).toString()}
                                                    onChange={(e) =>
                                                        updateProcurementDraft(item.key, {
                                                            unit_cost_paise: rupeesToPaise(e.target.value),
                                                        })
                                                    }
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-semibold">
                                                {paiseToRupees(item.total_cost_paise)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    value={item.notes}
                                                    onChange={(e) =>
                                                        updateProcurementDraft(item.key, {
                                                            notes: e.target.value,
                                                        })
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </div>
    );
}