import { useMemo, useState } from "react";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import {
    ArrowDownRight,
    ArrowUpRight,
    Eye,
    Package,
    Pencil,
    PlusCircle,
    ReceiptText,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Truck,
    Wallet,
} from "lucide-react";
import { CostsService } from "../../../api/services/cost.service";
import { WarehousesService } from "../../../api/services/warehouses.service";
import { costCreateSchema } from "../../../validations/cost.validation";

import { PageHeader } from "../../../components/common/page-header";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { useToast } from "../../../components/toast/toast-context";
import { PremiumSelect } from "../../../components/ui/premium-select";
import { HiOutlineLightBulb } from "react-icons/hi";

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
    return formatDateForApi(new Date());
}

function formatDateForApi(date) {
    return date ? format(date, "yyyy-MM-dd") : "";
}

function parseApiDate(value) {
    if (!value) return null;
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function getApiErrorMessage(error, fallback) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        fallback
    );
}

function costToFormValues(cost) {
    return {
        cost_date: cost?.cost_date || today(),
        category: cost?.category || "delivery",
        warehouse_id: cost?.warehouse_id || "",
        related_order_id: cost?.related_order_id || "",
        reference_type: cost?.reference_type || "",
        reference_no: cost?.reference_no || "",
        amount_rupees:
            cost?.amount_paise === undefined || cost?.amount_paise === null
                ? ""
                : (Number(cost.amount_paise || 0) / 100).toString(),
        notes: cost?.notes || "",
    };
}

function StatCard({ title, value, subtitle, highlight, icon: Icon, accent = "amber" }) {
    const accentClasses = {
        emerald: "from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-700 dark:text-emerald-300",
        amber: "from-amber-500/15 via-amber-500/5 to-transparent text-amber-700 dark:text-amber-300",
        slate: "from-slate-500/15 via-slate-500/5 to-transparent text-slate-700 dark:text-slate-300",
    };

    return (
        <Card className="group relative overflow-hidden border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-4 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/70">
            <div className={`absolute inset-y-0 right-0 w-24 bg-gradient-to-br ${accentClasses[accent]} opacity-90`} />
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                        {title}
                    </div>

                    <div
                        className={[
                            "mt-3 break-words text-2xl font-semibold sm:text-3xl",
                            highlight ? "text-dailyveg-600 dark:text-dailyveg-300" : "text-slate-900 dark:text-slate-100",
                        ].join(" ")}
                    >
                        {value}
                    </div>

                    {subtitle ? (
                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </div>
                    ) : null}
                </div>

                <div className={`rounded-2xl border border-white/80 bg-white/80 p-2.5 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80 ${highlight ? "text-dailyveg-600" : "text-slate-600 dark:text-slate-300"}`}>
                    {Icon ? <Icon size={18} /> : <Wallet size={18} />}
                </div>
            </div>
        </Card>
    );
}

function CostFormFields({ form, warehouses, disabled = false }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
                <Label>Date</Label>
                <DatePicker
                    selected={parseApiDate(form.watch("cost_date"))}
                    onChange={(selectedDate) =>
                        form.setValue("cost_date", formatDateForApi(selectedDate), {
                            shouldValidate: true,
                            shouldDirty: true,
                            shouldTouch: true,
                        })
                    }
                    dateFormat="dd-MM-yyyy"
                    placeholderText="Select cost date"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                    isClearable
                    disabled={disabled}
                />
                {form.formState.errors.cost_date ? (
                    <p className="text-xs text-red-600">{form.formState.errors.cost_date.message}</p>
                ) : null}
            </div>

            <div>
                <Label>Category</Label>
                <PremiumSelect
                    value={form.watch("category")}
                    onChange={(value) =>
                        form.setValue("category", value, {
                            shouldValidate: true,
                            shouldDirty: true,
                            shouldTouch: true,
                        })
                    }
                    options={CATEGORIES.map((item) => ({
                        value: item.value,
                        label: item.label,
                    }))}
                    placeholder="Select category"
                    isDisabled={disabled}
                />
            </div>

            <div>
                <Label>Warehouse</Label>
                <PremiumSelect
                    value={form.watch("warehouse_id")}
                    onChange={(value) =>
                        form.setValue("warehouse_id", value, {
                            shouldValidate: true,
                            shouldDirty: true,
                            shouldTouch: true,
                        })
                    }
                    options={[
                        { value: "", label: "No warehouse" },
                        ...warehouses.map((warehouse) => ({
                            value: warehouse.id,
                            label: warehouse.name,
                        })),
                    ]}
                    placeholder="Select warehouse"
                    isDisabled={disabled}
                />
            </div>

            <div>
                <Label>Amount ₹</Label>
                <Input type="number" step="0.01" disabled={disabled} {...form.register("amount_rupees")} />
                {form.formState.errors.amount_rupees ? (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.amount_rupees.message}</p>
                ) : null}
            </div>

            <div>
                <Label>Reference Type</Label>
                <Input placeholder="order / bill / vendor" disabled={disabled} {...form.register("reference_type")} />
            </div>

            <div>
                <Label>Reference No.</Label>
                <Input placeholder="Bill no / order no" disabled={disabled} {...form.register("reference_no")} />
            </div>

            <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" disabled={disabled} {...form.register("notes")} />
            </div>
        </div>
    );
}

function CostDetails({ cost }) {
    const rows = [
        ["Date", formatIndianDateTime(cost?.cost_date)],
        ["Category", cost?.category],
        ["Warehouse", cost?.warehouse?.name || "No warehouse"],
        ["Amount", paiseToRupees(cost?.amount_paise)],
        ["Reference Type", cost?.reference_type || "—"],
        ["Reference No.", cost?.reference_no || "—"],
        ["Related Order", cost?.related_order_id || "—"],
        ["Status", cost?.status],
        ["Created By", cost?.creator?.full_name || cost?.creator?.phone || "—"],
        ["Created At", formatIndianDateTime(cost?.created_at)],
        ["Updated At", formatIndianDateTime(cost?.updated_at)],
        ["Notes", cost?.notes || "—"],
    ];

    return (
        <div className="grid gap-3 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="grid gap-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                    <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
                    <div className="break-words font-medium text-slate-900 dark:text-slate-100">{value}</div>
                </div>
            ))}
        </div>
    );
}

function CostMobileCard({ cost, onArchive, onEdit, onView, onReactivate, isBusy }) {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/80 to-white p-4 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="font-semibold capitalize text-slate-900 dark:text-slate-100">{cost.category}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatIndianDateTime(cost.cost_date)}
                    </div>
                </div>

                <Badge variant="secondary">{cost.status}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="text-xs text-slate-500">Amount</div>
                    <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {paiseToRupees(cost.amount_paise)}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="text-xs text-slate-500">Warehouse</div>
                    <div className="mt-1 truncate font-medium text-slate-900 dark:text-slate-100">
                        {cost.warehouse?.name || "—"}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="text-xs text-slate-500">Reference</div>
                    <div className="mt-1 truncate font-medium text-slate-900 dark:text-slate-100">
                        {cost.reference_no || cost.reference_type || "—"}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="text-xs text-slate-500">Created By</div>
                    <div className="mt-1 truncate font-medium text-slate-900 dark:text-slate-100">
                        {cost.creator?.full_name || cost.creator?.phone || "—"}
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" disabled={isBusy} onClick={() => onView(cost)}>
                    View
                </Button>
                <Button size="sm" variant="outline" disabled={isBusy || cost.status === "archived"} onClick={() => onEdit(cost)}>
                    Edit
                </Button>
                {cost.status !== "archived" ? (
                    <Button className="col-span-2" size="sm" variant="outline" disabled={isBusy} onClick={() => onArchive(cost)}>
                        Archive
                    </Button>
                ) : (
                    <Button className="col-span-2" size="sm" disabled={isBusy} onClick={() => onReactivate(cost)}>
                        Reactivate
                    </Button>
                )}
            </div>
        </div>
    );
}

function ProcurementMobileCard({ item, onChange }) {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/80 to-white p-4 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{item.product_name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.pack_label || "Base"}
                    </div>
                </div>

                <div className="rounded-full bg-dailyveg-50 px-3 py-1 text-sm font-semibold text-dailyveg-700 dark:bg-dailyveg-950/60 dark:text-dailyveg-300">
                    {item.ordered_quantity}
                </div>
            </div>

            <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <Label>Unit Cost ₹</Label>
                    <Input
                        type="number"
                        step="0.01"
                        className="mt-2"
                        value={(Number(item.unit_cost_paise || 0) / 100).toString()}
                        onChange={(e) =>
                            onChange(item.key, {
                                unit_cost_paise: rupeesToPaise(e.target.value),
                            })
                        }
                    />
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <Label>Notes</Label>
                    <Input
                        className="mt-2"
                        value={item.notes}
                        onChange={(e) =>
                            onChange(item.key, {
                                notes: e.target.value,
                            })
                        }
                    />
                </div>
            </div>

            <div className="mt-4 rounded-xl border border-dailyveg-200/70 bg-dailyveg-50/80 p-3 dark:border-dailyveg-900/60 dark:bg-dailyveg-950/40">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Cost</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {paiseToRupees(item.total_cost_paise)}
                </div>
            </div>
        </div>
    );
}

export function CostPage() {
    const {
        success: showSuccess,
        error: showError,
    } = useToast();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState("overview");
    const [search, setSearch] = useState("");
    const [costPage, setCostPage] = useState(1);
    const [archiveTarget, setArchiveTarget] = useState(null);
    const [viewCost, setViewCost] = useState(null);
    const [editCost, setEditCost] = useState(null);

    const [filters, setFilters] = useState({
        from_date: today(),
        to_date: today(),
        category: "",
        warehouse_id: "",
        status: "active",
    });

    const [procurementDate, setProcurementDate] = useState("");
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
        queryKey: [
            "procurement-cost-items",
            procurementDate,
            procurementWarehouseId,
            filters.from_date,
            filters.to_date,
            filters.warehouse_id,
        ],
        queryFn: () => {
            const params = {
                warehouse_id: procurementWarehouseId || filters.warehouse_id || undefined,
            };

            if (procurementDate) {
                params.delivery_date = procurementDate;
            } else {
                params.from_date = filters.from_date || undefined;
                params.to_date = filters.to_date || undefined;
            }

            return CostsService.procurementItems(params);
        },
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

    const editForm = useForm({
        resolver: zodResolver(costCreateSchema),
        defaultValues: costToFormValues(null),
    });

    function openEditDialog(cost) {
        setEditCost(cost);
        editForm.reset(costToFormValues(cost));
    }

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
        meta: {
            globalLoaderMessage: "Adding cost entry...",
        },
        onSuccess: () => {
            showSuccess("Cost entry added");
            form.reset({
                cost_date: today(),
                category: "dailyveg",
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
        onError: (error) => showError(getApiErrorMessage(error, "Failed to add cost entry")),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }) =>
            CostsService.update(id, {
                cost_date: values.cost_date,
                category: values.category,
                warehouse_id: values.warehouse_id || null,
                related_order_id: values.related_order_id || null,
                reference_type: values.reference_type || null,
                reference_no: values.reference_no || null,
                amount_paise: rupeesToPaise(values.amount_rupees),
                notes: values.notes || null,
            }),
        meta: {
            globalLoaderMessage: "Updating cost entry...",
        },
        onSuccess: (updatedCost) => {
            showSuccess("Cost entry updated");
            setEditCost(null);
            setViewCost((current) => (current?.id === updatedCost?.id ? updatedCost : current));
            queryClient.invalidateQueries({ queryKey: ["costs"] });
            queryClient.invalidateQueries({ queryKey: ["costs-summary"] });
            queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] });
        },
        onError: (error) => showError(getApiErrorMessage(error, "Failed to update cost entry")),
    });

    const archiveMutation = useMutation({
        mutationFn: (id) => CostsService.remove(id),
        meta: {
            globalLoaderMessage: "Archiving cost...",
        },
        onSuccess: () => {
            showSuccess("Cost archived");
            setArchiveTarget(null);
            queryClient.invalidateQueries({ queryKey: ["costs"] });
            queryClient.invalidateQueries({ queryKey: ["costs-summary"] });
            queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] });
        },
        onError: (error) => showError(getApiErrorMessage(error, "Failed to archive cost")),
    });

    const reactivateMutation = useMutation({
        mutationFn: (id) => CostsService.update(id, { status: "active" }),
        meta: {
            globalLoaderMessage: "Reactivating cost...",
        },
        onSuccess: () => {
            showSuccess("Cost reactivated");
            queryClient.invalidateQueries({ queryKey: ["costs"] });
            queryClient.invalidateQueries({ queryKey: ["costs-summary"] });
            queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] });
        },
        onError: (error) => showError(getApiErrorMessage(error, "Failed to reactivate cost")),
    });

    const procurementSaveMutation = useMutation({
        mutationFn: (items) => {
            const payload = {
                warehouse_id: procurementWarehouseId || filters.warehouse_id || null,
                items,
            };

            if (procurementDate) {
                payload.delivery_date = procurementDate;
            } else {
                payload.from_date = filters.from_date || null;
                payload.to_date = filters.to_date || null;
            }

            return CostsService.bulkUpsertProcurement(payload);
        },
        meta: {
            globalLoaderMessage: "Saving procurement costs...",
        },
        onSuccess: () => {
            showSuccess("Procurement costs saved");
            queryClient.invalidateQueries({ queryKey: ["procurement-cost-items"] });
            queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] });
        },
        onError: (error) => showError(getApiErrorMessage(error, "Failed to save procurement costs")),
    });

    const costsData = costsQuery.data;
    const costs = Array.isArray(costsData)
        ? costsData
        : Array.isArray(costsData?.rows)
            ? costsData.rows
            : Array.isArray(costsData?.items)
                ? costsData.items
                : Array.isArray(costsData?.data)
                    ? costsData.data
                    : [];
    const summary = summaryQuery.data || {};
    const profit = profitQuery.data || {};
    const warehouses = warehousesQuery.data || [];
    const procurementItems = procurementQuery.data?.items || [];

    const [procurementDraft, setProcurementDraft] = useState({});

    const filteredCosts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return costs;

        return costs.filter((cost) =>
            [
                cost.cost_date,
                cost.category,
                cost.status,
                cost.warehouse?.name,
                cost.reference_type,
                cost.reference_no,
                cost.creator?.full_name,
                cost.creator?.phone,
                cost.notes,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q))
        );
    }, [costs, search]);

    const costPageSize = 10;
    const totalCostPages = Math.max(1, Math.ceil(filteredCosts.length / costPageSize));
    const currentCostPage = Math.min(costPage, totalCostPages);
    const pagedCosts = filteredCosts?.slice(
        (currentCostPage - 1) * costPageSize,
        currentCostPage * costPageSize
    );

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
        <div className="min-w-0 space-y-4 sm:space-y-6">
            <PageHeader
                title="Cost Management"
                subtitle="Track procurement cost, delivery expenses, packaging, miscellaneous cost and daily profitability."
            />

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                {["overview", "costs", "procurement"].map((tab) => (
                    <Button
                        key={tab}
                        type="button"
                        className="w-full sm:w-auto"
                        variant={activeTab === tab ? "default" : "outline"}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === "overview" ? "Overview" : tab === "costs" ? "Manual Costs" : "Procurement"}
                    </Button>
                ))}
            </div>

            <Card className="overflow-hidden p-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="grid gap-1.5">
                        <Label>From Date</Label>
                        <DatePicker
                            selected={parseApiDate(filters.from_date)}
                            onChange={(selectedDate) =>
                                setFilters((p) => ({
                                    ...p,
                                    from_date: formatDateForApi(selectedDate),
                                }))
                            }
                            dateFormat="dd-MM-yyyy"
                            placeholderText="Select from date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            isClearable
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>To Date</Label>
                        <DatePicker
                            selected={parseApiDate(filters.to_date)}
                            onChange={(selectedDate) =>
                                setFilters((p) => ({
                                    ...p,
                                    to_date: formatDateForApi(selectedDate),
                                }))
                            }
                            dateFormat="dd-MM-yyyy"
                            placeholderText="Select to date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            isClearable
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Category</Label>
                        <PremiumSelect
                            value={filters.category}
                            onChange={(value) =>
                                setFilters((p) => ({
                                    ...p,
                                    category: value || "",
                                }))
                            }
                            options={[
                                { value: "", label: "All Categories" },
                                ...CATEGORIES.map((item) => ({
                                    value: item.value,
                                    label: item.label,
                                })),
                            ]}
                            placeholder="Select category"
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Warehouse</Label>
                        <PremiumSelect
                            value={filters.warehouse_id}
                            onChange={(value) =>
                                setFilters((p) => ({
                                    ...p,
                                    warehouse_id: value || "",
                                }))
                            }
                            options={[
                                { value: "", label: "All Warehouses" },
                                ...warehouses.map((warehouse) => ({
                                    value: warehouse.id,
                                    label: warehouse.name,
                                })),
                            ]}
                            placeholder="Select warehouse"
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Status</Label>
                        <PremiumSelect
                            value={filters.status}
                            onChange={(value) =>
                                setFilters((p) => ({
                                    ...p,
                                    status: value || "",
                                }))
                            }
                            options={[
                                { value: "active", label: "Active" },
                                { value: "archived", label: "Archived" },
                                { value: "", label: "All Status" },
                            ]}
                            placeholder="Select status"
                        />
                    </div>
                </div>
            </Card>

            {activeTab === "overview" ? (
                <>
                    <div className="grid gap-3 sm:gap-4 xl:grid-cols-4">
                        <StatCard
                            title="Revenue"
                            value={paiseToRupees(profit.revenue_paise)}
                            subtitle="Gross sales captured"
                            highlight
                            icon={TrendingUp}
                            accent="emerald"
                        />

                        <StatCard
                            title="Total Cost"
                            value={paiseToRupees(profit.total_cost_paise)}
                            subtitle="All recorded expenses"
                            icon={ReceiptText}
                            accent="amber"
                        />

                        <StatCard
                            title="Net Profit"
                            value={paiseToRupees(profit.profit_paise)}
                            subtitle="Revenue minus expenses"
                            highlight
                            icon={Wallet}
                            accent="emerald"
                        />

                        <StatCard
                            title="Margin"
                            value={`${profit.margin_percent || 0}%`}
                            subtitle="Profitability ratio"
                            icon={ShieldCheck}
                            accent="slate"
                        />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <Card className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                        Cost breakdown
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        Where your spend is concentrated
                                    </div>
                                </div>
                                <Badge variant="secondary">Live</Badge>
                            </div>

                            <div className="mt-5 space-y-3">
                                {[
                                    {
                                        label: "Procurement",
                                        value: profit.procurement_paise,
                                        icon: Package,
                                    },
                                    {
                                        label: "Delivery",
                                        value: summary.delivery_paise,
                                        icon: Truck,
                                    },
                                    {
                                        label: "Packaging",
                                        value: summary.packaging_paise,
                                        icon: Package,
                                    },
                                    {
                                        label: "Miscellaneous",
                                        value: summary.misc_paise,
                                        icon: ReceiptText,
                                    },
                                ].map((item, index) => {
                                    const totalCostPaise = Number(profit.total_cost_paise || 0);
                                    const itemValuePaise = Number(item.value || 0);

                                    const percent =
                                        totalCostPaise > 0 && itemValuePaise > 0
                                            ? Math.round((itemValuePaise / totalCostPaise) * 100)
                                            : 0;

                                    return (
                                        <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="rounded-xl bg-white p-2 shadow-sm dark:bg-slate-950">
                                                        <item.icon size={16} className="text-dailyveg-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-slate-100">
                                                            {item.label}
                                                        </div>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                                            {paiseToRupees(item.value)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {percent}%
                                                </div>
                                            </div>

                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-dailyveg-500 to-emerald-500"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>

                                            {index === 0 ? (
                                                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                    Largest share of operational spend
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        <Card className="p-4 sm:p-5">
                            <div className="flex items-center gap-2">
                                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                        Performance insight
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        A quick read on the current period
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                        {Number(profit.margin_percent || 0) >= 10 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                        {Number(profit.margin_percent || 0) >= 10 ? "Healthy margin" : "Watch the margin"}
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                        {Number(profit.margin_percent || 0) >= 10
                                            ? "Your profitability is in a strong position for this period."
                                            : "Margins are tighter than ideal, so reviewing cost allocation can help."}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Suggested next move
                                    </div>
                                    <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-2 w-2 rounded-full bg-dailyveg-500" />
                                            Review the highest-cost category before the next cycle.
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-2 w-2 rounded-full bg-dailyveg-500" />
                                            Compare current margins against the previous reporting window.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    </div>
                </>
            ) : null}

            {activeTab === "costs" ? (
                <>
                    <Card className="overflow-hidden border border-dailyveg-200/70 bg-gradient-to-br from-white via-dailyveg-50/50 to-white shadow-[0_16px_45px_-24px_rgba(15,23,42,0.24)] dark:border-dailyveg-900/50 dark:from-slate-950 dark:via-dailyveg-950/30 dark:to-slate-950">
                        <div className="border-b border-dailyveg-100/80 bg-gradient-to-r from-dailyveg-50/70 to-white p-4 sm:p-5 dark:border-dailyveg-900/50 dark:from-dailyveg-950/40 dark:to-slate-950">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-dailyveg-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-dailyveg-700 dark:border-dailyveg-800 dark:bg-slate-900/70 dark:text-dailyveg-300">
                                        <PlusCircle size={14} /> Manual cost entry
                                    </div>
                                    <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
                                        Capture manual expenses with clarity
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                        Add and manage delivery, packaging, procurement, and miscellaneous costs in a workspace that feels polished and easy to scan.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-dailyveg-200/70 bg-white/80 px-4 py-3 shadow-sm dark:border-dailyveg-800/70 dark:bg-slate-900/70">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                                        Total visible
                                    </div>
                                    <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                                        {filteredCosts.length} entries
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5">
                            <form
                                className="grid gap-4"
                                onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
                            >
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 sm:p-5">
                                    <CostFormFields form={form} warehouses={warehouses} disabled={createMutation.isPending} />
                                </div>

                                <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Add one cost entry at a time and keep your records organized.
                                    </p>
                                    <Button type="submit" disabled={createMutation.isPending}>
                                        {createMutation.isPending ? "Saving..." : "Add Cost"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_45px_-24px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-3 sm:p-4 dark:border-slate-900 dark:from-slate-900/50 dark:to-slate-950">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                        Cost records
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        Manage saved entries and keep your reporting up to date.
                                    </div>
                                </div>

                                <div className="relative w-full sm:max-w-sm">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={search}
                                        className="pl-10"
                                        onChange={(event) => {
                                            setSearch(event.target.value);
                                            setCostPage(1);
                                        }}
                                        placeholder="Search costs by category, warehouse, reference, creator or notes"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 p-3 lg:hidden">
                            {filteredCosts.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                                    No cost entries found.
                                </div>
                            ) : (
                                pagedCosts.map((cost) => (
                                    <CostMobileCard
                                        key={cost.id}
                                        cost={cost}
                                        isBusy={archiveMutation.isPending || reactivateMutation.isPending}
                                        onArchive={setArchiveTarget}
                                        onEdit={openEditDialog}
                                        onView={setViewCost}
                                        onReactivate={(item) => reactivateMutation.mutate(item.id)}
                                    />
                                ))
                            )}
                        </div>

                        <div className="hidden overflow-x-auto thin-scrollbar lg:block">
                            <table className="min-w-[1050px] w-full text-sm">
                                <thead className="bg-slate-50/90 dark:bg-slate-900/40">
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
                                    {filteredCosts.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                                                No cost entries found.
                                            </td>
                                        </tr>
                                    ) : (
                                        pagedCosts.map((cost) => (
                                            <tr key={cost.id} className="border-t border-slate-100 bg-white/70 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:bg-slate-950/60 dark:hover:bg-slate-900/80">
                                                <td className="px-4 py-3">{formatIndianDateTime(cost.cost_date)}</td>
                                                <td className="px-4 py-3 capitalize">{cost.category}</td>
                                                <td className="px-4 py-3">{cost.warehouse?.name || "—"}</td>
                                                <td className="px-4 py-3">
                                                    {cost.reference_no || cost.reference_type || "—"}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                                    {paiseToRupees(cost.amount_paise)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {cost.creator?.full_name || cost.creator?.phone || "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary">{cost.status}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            title="View"
                                                            onClick={() => setViewCost(cost)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            title="Edit"
                                                            disabled={cost.status === "archived"}
                                                            onClick={() => openEditDialog(cost)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        {cost.status !== "archived" ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={archiveMutation.isPending}
                                                                onClick={() => setArchiveTarget(cost)}
                                                            >
                                                                Archive
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="icon"
                                                                title="Reactivate"
                                                                disabled={reactivateMutation.isPending}
                                                                onClick={() => reactivateMutation.mutate(cost.id)}
                                                            >
                                                                <RotateCcw className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredCosts.length > 0 ? (
                            <div className="flex flex-col gap-3 border-t border-slate-100 p-3 text-sm text-slate-500 dark:border-slate-900 sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    Showing {(currentCostPage - 1) * costPageSize + 1}-
                                    {Math.min(currentCostPage * costPageSize, filteredCosts.length)} of {filteredCosts.length}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={currentCostPage === 1}
                                        onClick={() => setCostPage((page) => Math.max(1, page - 1))}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={currentCostPage === totalCostPages}
                                        onClick={() => setCostPage((page) => Math.min(totalCostPages, page + 1))}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </>
            ) : null}

            {activeTab === "procurement" ? (
                <>
                    <Card className="overflow-hidden border border-dailyveg-200/70 bg-gradient-to-br from-white via-dailyveg-50/50 to-white shadow-[0_16px_45px_-24px_rgba(15,23,42,0.24)] dark:border-dailyveg-900/50 dark:from-slate-950 dark:via-dailyveg-950/30 dark:to-slate-950">
                        <div className="border-b border-dailyveg-100/80 bg-gradient-to-r from-dailyveg-50/70 to-white p-4 sm:p-5 dark:border-dailyveg-900/50 dark:from-dailyveg-950/40 dark:to-slate-950">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-dailyveg-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-dailyveg-700 dark:border-dailyveg-800 dark:bg-slate-900/70 dark:text-dailyveg-300">
                                        <Sparkles size={14} /> Procurement planner
                                    </div>
                                    <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
                                        Review procurement costs with a refined workflow
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                        Set delivery date and warehouse filters, then update unit costs and notes with a premium, easy-to-scan layout.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-dailyveg-200/70 bg-white/80 px-4 py-3 shadow-sm dark:border-dailyveg-800/70 dark:bg-slate-900/70">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                                        Items ready
                                    </div>
                                    <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                                        {procurementRows.length} rows
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5">
                            <div className="inline-block mb-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-2 text-sm text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                                <div className="flex items-center gap-2">
                                    <HiOutlineLightBulb className="text-lg" />
                                    <span>
                                        Procurement items load for the selected Delivery Date. If Delivery Date is empty, items will use the top From/To date range and warehouse filter.
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 sm:grid-cols-2 xl:grid-cols-3">
                                <div className="grid gap-1.5">
                                    <Label>Delivery Date</Label>
                                    <DatePicker
                                        selected={parseApiDate(procurementDate)}
                                        onChange={(selectedDate) =>
                                            setProcurementDate(formatDateForApi(selectedDate))
                                        }
                                        dateFormat="dd-MM-yyyy"
                                        placeholderText="Select procurement date"
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                                        isClearable
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
                                        className="w-full sm:w-auto"
                                        disabled={
                                            procurementSaveMutation.isPending ||
                                            procurementRows.length === 0
                                        }
                                        onClick={saveProcurement}
                                    >
                                        {procurementSaveMutation.isPending ? "Saving..." : "Save Procurement Costs"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_45px_-24px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-3 sm:p-4 dark:border-slate-900 dark:from-slate-900/50 dark:to-slate-950">
                            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Procurement items
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                Review quantity, unit cost, and notes in one place.
                            </div>
                        </div>

                        <div className="grid gap-3 p-3 lg:hidden">
                            {procurementRows.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                                    {procurementDate
                                        ? "No order items found for this delivery date."
                                        : "No procurement items found for the selected From/To range. Select a Delivery Date or adjust the top filters."}
                                </div>
                            ) : (
                                procurementRows.map((item) => (
                                    <ProcurementMobileCard
                                        key={item.key}
                                        item={item}
                                        onChange={updateProcurementDraft}
                                    />
                                ))
                            )}
                        </div>

                        <div className="hidden overflow-x-auto thin-scrollbar lg:block">
                            <table className="min-w-[950px] w-full text-sm">
                                <thead className="bg-slate-50/90 dark:bg-slate-900/40">
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
                                                {procurementDate
                                                    ? "No order items found for this delivery date."
                                                    : "No procurement items found for the selected From/To date range."}
                                            </td>
                                        </tr>
                                    ) : (
                                        procurementRows.map((item) => (
                                            <tr key={item.key} className="border-t border-slate-100 bg-white/70 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:bg-slate-950/60 dark:hover:bg-slate-900/80">
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.product_name}</td>
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
                                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
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
                    </div>
                </>
            ) : null}

            <Dialog open={Boolean(viewCost)} onOpenChange={(open) => !open && setViewCost(null)}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Cost Details</DialogTitle>
                    </DialogHeader>
                    <CostDetails cost={viewCost} />
                    <DialogFooter>
                        {viewCost?.status !== "archived" ? (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    openEditDialog(viewCost);
                                    setViewCost(null);
                                }}
                            >
                                Edit
                            </Button>
                        ) : (
                            <Button
                                disabled={reactivateMutation.isPending}
                                onClick={() => reactivateMutation.mutate(viewCost.id)}
                            >
                                {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(editCost)} onOpenChange={(open) => !open && setEditCost(null)}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Cost</DialogTitle>
                    </DialogHeader>
                    <form
                        className="grid gap-4"
                        onSubmit={editForm.handleSubmit((values) =>
                            updateMutation.mutate({ id: editCost.id, values })
                        )}
                    >
                        <CostFormFields
                            form={editForm}
                            warehouses={warehouses}
                            disabled={updateMutation.isPending}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={updateMutation.isPending}
                                onClick={() => setEditCost(null)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={Boolean(archiveTarget)}
                onOpenChange={(open) => !open && setArchiveTarget(null)}
                title="Archive cost entry?"
                description="This cost will be removed from the active cost view and active summaries. You can reactivate it later from the archived status filter."
                confirmText="Archive"
                variant="destructive"
                onConfirm={() => archiveMutation.mutateAsync(archiveTarget.id)}
            />
        </div>
    );
}
