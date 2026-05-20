import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO, isValid, addDays } from "date-fns";
import DatePicker from "react-datepicker";
import { Link, useNavigate } from "react-router-dom";
import { PDFDownloadLink } from "@react-pdf/renderer";

import "react-datepicker/dist/react-datepicker.css";

import { useAuth } from "../../../auth/auth-context";
import { OpsOrdersService } from "../../../api/services/ops-orders.service";
import { OpsJobsService } from "../../../api/services/ops-jobs.service";
import { opsOrdersFilterSchema } from "../../../validations/ops-orders";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { StatusBadge } from "../../../components/common/status-badge";
import { useToast } from "../../../components/toast/toast-context";

import { OpsOrdersListPdf } from "./ops-orders-list-pdf";
import { exportOrdersCsv } from "./ops-orders-export";
import { downloadBlob } from "../../../utils/download";

function money(paise) {
    const n = Number(paise || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "INR" });
}

function toYyyyMmDd(date) {
    return format(date, "yyyy-MM-dd");
}

function todayDate() {
    return new Date();
}

function tomorrowDate() {
    return addDays(new Date(), 1);
}

function parseDateValue(value) {
    if (!value) return null;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
}

function queueToStatusFilter(queueKey) {
    switch (queueKey) {
        case "before_lock":
            return "placed";
        case "packed":
            return "packed";
        case "out_for_delivery":
            return "out_for_delivery";
        case "delivered":
            return "delivered";
        case "locked":
        case "to_pack":
        case "exceptions":
        case "assigned":
        case "unassigned":
        case "all":
        default:
            return "";
    }
}

function queueToAssignedFilter(queueKey) {
    if (queueKey === "assigned") return true;
    if (queueKey === "unassigned") return false;
    return undefined;
}

function isExceptionOrder(order) {
    const paymentStatus = String(order?.payment_status || "").toLowerCase();
    const paymentMethod = String(order?.payment_method || "").toLowerCase();
    const status = String(order?.status || "").toLowerCase();
    const refundStatus = String(order?.refund_status || "").toLowerCase();

    const isOnlinePayment = paymentMethod && paymentMethod !== "cod";

    return (
        (isOnlinePayment && paymentStatus === "pending") ||
        paymentStatus === "failed" ||
        paymentStatus === "verification_pending" ||
        paymentStatus === "refund_failed" ||
        refundStatus === "refund_failed" ||
        (status === "cancelled" && paymentStatus === "paid")
    );
}

function matchesQueue(order, queueKey) {
    const status = String(order?.status || "").toLowerCase();
    const isLocked = !!order?.is_locked;

    switch (queueKey) {
        case "all":
            return true;

        case "before_lock":
            return status === "placed" && !isLocked;

        case "locked":
            return status === "locked" || (status === "placed" && isLocked);

        case "to_pack":
            return status === "locked" || status === "accepted" || (status === "placed" && isLocked);

        case "packed":
            return status === "packed";

        case "out_for_delivery":
            return status === "out_for_delivery";

        case "delivered":
            return status === "delivered";

        case "exceptions":
            return isExceptionOrder(order);

        case "assigned":
            return !!order?.delivery_partner_user_id;

        case "unassigned":
            return !order?.delivery_partner_user_id;

        default:
            return true;
    }
}

function getNextActions(order) {
    const status = String(order?.status || "").toLowerCase();
    const isLocked = !!order?.is_locked;
    const isDeliveryAssigned = !!order?.delivery_partner_user_id;

    if (status === "locked" || (status === "placed" && isLocked)) {
        return [{ key: "accepted", label: "Accept" }];
    }

    if (status === "accepted") {
        return [{ key: "packed", label: "Mark Packed" }];
    }

    if (status === "packed") {
        return [{ key: "out_for_delivery", label: "Out for Delivery" }];
    }

    if (status === "out_for_delivery") {
        return [{ key: "delivered", label: "Mark Delivered" }];
    }

    return [];
}

function getOrderItemsCount(order) {
    if (typeof order?.item_count === "number") return order.item_count;
    if (typeof order?.items_count === "number") return order.items_count;
    if (typeof order?.total_items === "number") return order.total_items;
    if (Array.isArray(order?.items)) return order.items.length;
    return "—";
}

function getOrderArea(order) {
    return (
        order?.delivery_area ||
        order?.address?.area ||
        order?.delivery_city ||
        order?.address?.city ||
        order?.area ||
        "—"
    );
}

function getOrderTotal(order) {
    return order?.grand_total_paise ?? order?.total_paise ?? 0;
}

function getCustomerName(order) {
    return order?.user?.full_name || order?.delivery_name || "—";
}

function getCustomerPhone(order) {
    return order?.user?.phone || order?.delivery_phone || "—";
}

function getDeliveryPartnerName(order) {
    return order?.delivery_partner?.full_name || "—";
}

function getDeliveryPartnerPhone(order) {
    return order?.delivery_partner?.phone || "";
}

function canAssignDeliveryPartner(order) {
    const status = String(order?.status || "").toLowerCase();
    return !["delivered", "cancelled", "refunded"].includes(status);
}

function canUnassignDeliveryPartner(order) {
    const status = String(order?.status || "").toLowerCase();
    return !!order?.delivery_partner_user_id && !["out_for_delivery", "delivered"].includes(status);
}

const ALLOWED_TRANSITIONS = {
    payment_pending: ["placed", "cancelled"],
    placed: ["locked", "accepted", "cancelled"],
    confirmed: ["locked", "accepted", "cancelled"],
    locked: ["accepted", "cancelled"],
    accepted: ["packed", "cancelled"],
    packed: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
    refunded: [],
};

function canMoveOrderToStatus(order, toStatus) {
    const status = String(order?.status || "").toLowerCase();
    return ALLOWED_TRANSITIONS[status]?.includes(toStatus) || false;
}

function Filters({ value, onApply, deliveryPartners }) {
    const form = useForm({
        resolver: zodResolver(opsOrdersFilterSchema),
        defaultValues: {
            ...value,
            delivery_date: value.delivery_date ? parseDateValue(value.delivery_date) : null,
            delivery_partner_user_id: value.delivery_partner_user_id || "",
        },
    });

    useEffect(() => {
        form.reset({
            ...value,
            delivery_date: value.delivery_date ? parseDateValue(value.delivery_date) : null,
            delivery_partner_user_id: value.delivery_partner_user_id || "",
        });
    }, [value, form]);

    const submit = (v) => {
        onApply({
            warehouse_id: v.warehouse_id ?? "",
            delivery_partner_user_id: v.delivery_partner_user_id ?? "",
            q: v.q ?? "",
            limit: v.limit ?? value.limit ?? 20,
            delivery_date: v.delivery_date ? toYyyyMmDd(v.delivery_date) : "",
        });
    };

    return (
        <form
            onSubmit={form.handleSubmit(submit)}
            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
        >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-1.5">
                    <Label>Search</Label>
                    <Input placeholder="Order no / order id / phone" {...form.register("q")} />
                </div>

                <div className="grid gap-1.5">
                    <Label>Warehouse ID</Label>
                    <Input placeholder="uuid" {...form.register("warehouse_id")} />
                </div>

                <div className="grid gap-1.5">
                    <Label>Delivery Date</Label>
                    <DatePicker
                        selected={form.watch("delivery_date")}
                        onChange={(date) => form.setValue("delivery_date", date, { shouldValidate: true })}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select delivery date"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                        isClearable
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label>Page Size</Label>
                    <Input type="number" min={10} max={100} {...form.register("limit", { valueAsNumber: true })} />
                </div>

                <div className="grid gap-1.5">
                    <Label>Delivery Partner</Label>
                    <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                        {...form.register("delivery_partner_user_id")}
                    >
                        <option value="">All partners</option>
                        {deliveryPartners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                                {partner.full_name || partner.phone || partner.id}
                                {partner.phone ? ` (${partner.phone})` : ""}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        form.reset({
                            warehouse_id: "",
                            delivery_partner_user_id: "",
                            q: "",
                            limit: 20,
                            delivery_date: null,
                        });

                        onApply({
                            warehouse_id: "",
                            delivery_partner_user_id: "",
                            q: "",
                            limit: 20,
                            delivery_date: "",
                        });
                    }}
                >
                    Reset
                </Button>

                <Button type="submit">Apply Filters</Button>
            </div>
        </form>
    );
}

function SummaryCard({ title, value, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "rounded-2xl border p-4 text-left transition",
                active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700",
            ].join(" ")}
        >
            <div className={`text-xs ${active ? "text-white/75 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"}`}>
                {title}
            </div>
            <div className="mt-2 text-2xl font-bold">{value}</div>
        </button>
    );
}

function QueueTabs({ value, onChange }) {
    const tabs = [
        { key: "all", label: "All" },
        { key: "before_lock", label: "Before Lock" },
        { key: "locked", label: "Locked" },
        { key: "to_pack", label: "To Pack" },
        { key: "packed", label: "Packed" },
        { key: "out_for_delivery", label: "Out for Delivery" },
        { key: "delivered", label: "Delivered" },
        { key: "exceptions", label: "Exceptions" },
        { key: "assigned", label: "Assigned" },
        { key: "unassigned", label: "Unassigned" },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
                const active = value === tab.key;

                return (
                    <Button
                        key={tab.key}
                        type="button"
                        variant={active ? "default" : "outline"}
                        onClick={() => onChange(tab.key)}
                    >
                        {tab.label}
                    </Button>
                );
            })}
        </div>
    );
}

function OrderPreviewDialog({
    order,
    open,
    onOpenChange,
    onViewDetails,
    onAssignClick,
    onUnassignClick,
    isAssignPending,
    isUnassignPending,
}) {
    if (!order) return null;

    const deliveryPartnerText = order.delivery_partner
        ? `${getDeliveryPartnerName(order)}${getDeliveryPartnerPhone(order) ? ` (${getDeliveryPartnerPhone(order)})` : ""}`
        : "Not assigned";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Order Preview</DialogTitle>
                </DialogHeader>

                <div className="grid gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <div className="font-semibold">{order.order_number || order.id}</div>
                        <div className="mt-1 text-slate-500 dark:text-slate-400">{order.id}</div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Customer</div>
                            <div className="mt-1 font-medium">{getCustomerName(order)}</div>
                            <div className="text-slate-500 dark:text-slate-400">{getCustomerPhone(order)}</div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Delivery</div>
                            <div className="mt-1 font-medium">{order.delivery_date || "—"}</div>
                            <div className="text-slate-500 dark:text-slate-400">{getOrderArea(order)}</div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Status</div>
                            <div className="mt-2">
                                <StatusBadge value={order.status} />
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Payment</div>
                            <div className="mt-1 font-medium">{order.payment_method || "—"}</div>
                            <div className="text-slate-500 dark:text-slate-400">{order.payment_status || "—"}</div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="text-xs text-slate-500">Total</div>
                            <div className="mt-1 font-medium">{money(getOrderTotal(order))}</div>
                            <div className="text-slate-500 dark:text-slate-400">Items: {getOrderItemsCount(order)}</div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <div className="text-xs text-slate-500">Delivery Partner</div>
                        <div className="mt-1 font-medium">{deliveryPartnerText}</div>
                        <div className="text-slate-500 dark:text-slate-400">
                            Assigned at: {order.delivery_assigned_at || "—"}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        {canAssignDeliveryPartner(order) ? (
                            <Button variant="outline" onClick={() => onAssignClick(order)} disabled={isAssignPending}>
                                {order.delivery_partner_user_id ? "Reassign Partner" : "Assign Partner"}
                            </Button>
                        ) : null}

                        {canUnassignDeliveryPartner(order) ? (
                            <Button variant="outline" onClick={() => onUnassignClick(order)} disabled={isUnassignPending}>
                                {isUnassignPending ? "Removing..." : "Unassign"}
                            </Button>
                        ) : null}

                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>

                        <Button onClick={() => onViewDetails(order.id)}>View Full Details</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AssignDeliveryPartnerDialog({
    open,
    onOpenChange,
    order,
    deliveryPartners,
    selectedPartnerId,
    onChangePartner,
    onAssign,
    isPending,
}) {
    if (!order) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isPending) {
                    onOpenChange(nextOpen);
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {order.delivery_partner_user_id ? "Reassign Delivery Partner" : "Assign Delivery Partner"}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                        <div className="font-medium">{order.order_number || order.id}</div>
                        <div className="mt-1 text-slate-500 dark:text-slate-400">
                            {getCustomerName(order)} · {getCustomerPhone(order)}
                        </div>
                        <div className="mt-1 text-slate-500 dark:text-slate-400">
                            Delivery Date: {order.delivery_date || "—"} · Area: {getOrderArea(order)}
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Delivery Partner</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
                            value={selectedPartnerId}
                            onChange={(e) => onChangePartner(e.target.value)}
                            disabled={isPending}
                        >
                            <option value="">Select delivery partner</option>
                            {deliveryPartners.map((partner) => (
                                <option key={partner.id} value={partner.id}>
                                    {partner.full_name || partner.phone || partner.id}
                                    {partner.phone ? ` (${partner.phone})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Cancel
                        </Button>

                        <Button onClick={onAssign} disabled={!selectedPartnerId || isPending}>
                            {isPending ? "Saving..." : order.delivery_partner_user_id ? "Reassign" : "Assign"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function OpsOrdersPage() {
    const toast = useToast();
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { roles } = useAuth();

    const isAdmin = roles.includes("admin");

    const [queue, setQueue] = useState("all");
    const [previewOrder, setPreviewOrder] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignOrder, setAssignOrder] = useState(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState("");
    const [bulkPartnerId, setBulkPartnerId] = useState("");

    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        warehouse_id: "",
        delivery_partner_user_id: "",
        delivery_date: toYyyyMmDd(tomorrowDate()),
        q: "",
    });

    const [bulkActionDialog, setBulkActionDialog] = useState({
        open: false,
        toStatus: null,
    });

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: "",
        description: "",
        confirmText: "Confirm",
        onConfirm: null,
        loading: false,
    });

    const listQuery = useQuery({
        queryKey: ["opsOrders", filters, queue],
        queryFn: () =>
            OpsOrdersService.list({
                ...filters,
                status: queueToStatusFilter(queue),
                isOrderAssigned: queueToAssignedFilter(queue),
            }),
        keepPreviousData: true,
        refetchInterval: 20000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    const summaryQuery = useQuery({
        queryKey: ["opsOrdersSummaryBase", filters.delivery_date, filters.warehouse_id, filters.q],
        queryFn: () =>
            OpsOrdersService.list({
                page: 1,
                limit: 500,
                warehouse_id: filters.warehouse_id,
                delivery_date: filters.delivery_date,
                q: filters.q,
            }),
        keepPreviousData: true,
        refetchInterval: 10000,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    const deliveryPartnersQuery = useQuery({
        queryKey: ["opsDeliveryPartners", filters.warehouse_id],
        queryFn: () =>
            OpsOrdersService.listDeliveryPartners({
                warehouse_id: filters.warehouse_id || undefined,
            }),
        keepPreviousData: true,
    });

    const rows = listQuery.data?.orders || [];
    const summaryOrders = summaryQuery.data?.orders || listQuery.data?.orders || [];
    const deliveryPartners = deliveryPartnersQuery.data?.partners || [];
    const page = listQuery.data?.page || filters.page;
    const total = listQuery.data?.total || 0;
    const limit = listQuery.data?.limit || filters.limit;

    const visibleRows = useMemo(() => {
        return rows.filter((order) => matchesQueue(order, queue));
    }, [rows, queue]);

    const summary = useMemo(() => {
        return {
            total: summaryOrders.length,
            beforeLock: summaryOrders.filter((order) => matchesQueue(order, "before_lock")).length,
            locked: summaryOrders.filter((order) => matchesQueue(order, "locked")).length,
            toPack: summaryOrders.filter((order) => matchesQueue(order, "to_pack")).length,
            packed: summaryOrders.filter((order) => matchesQueue(order, "packed")).length,
            outForDelivery: summaryOrders.filter((order) => matchesQueue(order, "out_for_delivery")).length,
            delivered: summaryOrders.filter((order) => matchesQueue(order, "delivered")).length,
            exceptions: summaryOrders.filter((order) => matchesQueue(order, "exceptions")).length,
            assigned: summaryOrders.filter((order) => !!order.delivery_partner_user_id).length,
            unassigned: summaryOrders.filter((order) => !order.delivery_partner_user_id).length,
        };
    }, [summaryOrders]);

    const updateStatusMut = useMutation({
        mutationFn: ({ orderId, payload }) => OpsOrdersService.updateStatus(orderId, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
        },
    });

    const assignDeliveryPartnerMut = useMutation({
        mutationFn: ({ orderId, payload }) => OpsOrdersService.assignDeliveryPartner(orderId, payload),
        onSuccess: () => {
            toast.success("Delivery partner assigned successfully");
            setAssignDialogOpen(false);
            setAssignOrder(null);
            setSelectedPartnerId("");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Failed to assign delivery partner");
        },
    });

    const bulkAssignDeliveryPartnerMut = useMutation({
        mutationFn: (payload) => OpsOrdersService.bulkAssignDeliveryPartner(payload),
        onSuccess: (data) => {
            toast.success(`${data?.assigned_count || selectedIds.length} orders assigned successfully`);
            setSelectedIds([]);
            setBulkPartnerId("");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Bulk delivery partner assignment failed");
        },
    });

    const bulkUnassignDeliveryPartnerMut = useMutation({
        mutationFn: (payload) => OpsOrdersService.bulkUnassignDeliveryPartner(payload),
        onSuccess: (data) => {
            toast.success(`${data?.unassigned_count || selectedIds.length} orders unassigned successfully`);
            setSelectedIds([]);
            setBulkPartnerId("");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Bulk delivery partner assignment failed");
        },
    });

    const unassignDeliveryPartnerMut = useMutation({
        mutationFn: ({ orderId, payload }) => OpsOrdersService.unassignDeliveryPartner(orderId, payload),
        onSuccess: () => {
            toast.success("Delivery partner removed successfully");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Failed to unassign delivery partner");
        },
    });

    const bulkUpdateMut = useMutation({
        mutationFn: ({ orderIds, toStatus, note }) =>
            OpsOrdersService.bulkUpdateStatus({
                orderIds: orderIds,
                toStatus: toStatus,
                note,
            }),
        onSuccess: () => {
            toast.success("Bulk update completed");
            setSelectedIds([]);
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Bulk update failed");
        },
    });

    const lockOrdersMut = useMutation({
        mutationFn: () => OpsJobsService.lockOrders({ delivery_date: filters.delivery_date }),
        onSuccess: () => {
            toast.success("Lock job executed successfully");
            qc.invalidateQueries({ queryKey: ["opsOrders"] });
            qc.invalidateQueries({ queryKey: ["opsOrdersSummaryBase"] });
        },
        onError: (e) => {
            toast.error(e?.message || "Failed to run lock job");
        },
    });

    const selectedOrders = useMemo(() => {
        const selectedSet = new Set(selectedIds);
        return visibleRows.filter((order) => selectedSet.has(order.id));
    }, [visibleRows, selectedIds]);

    const hasSelectedOrders = selectedOrders.length > 0;

    const disableBulkAssign =
        !hasSelectedOrders ||
        !bulkPartnerId ||
        bulkAssignDeliveryPartnerMut.isPending ||
        selectedOrders.some((order) => !!order.delivery_partner_user_id || !canAssignDeliveryPartner(order));

    const disableBulkUnassign =
        !hasSelectedOrders ||
        bulkUnassignDeliveryPartnerMut.isPending ||
        selectedOrders.some((order) => !canUnassignDeliveryPartner(order));

    function disableBulkStatus(toStatus) {
        return (
            !hasSelectedOrders ||
            bulkUpdateMut.isPending ||
            selectedOrders.some((order) => !canMoveOrderToStatus(order, toStatus))
        );
    }

    function handleQueueChange(nextQueue) {
        setQueue(nextQueue);
        setSelectedIds([]);

        setFilters((prev) => ({
            ...prev,
            page: 1,
        }));
    }

    function handleApplyFilters(nextValues) {
        setFilters((prev) => ({
            ...prev,
            ...nextValues,
            page: 1,
        }));
        setSelectedIds([]);
    }

    function handleQuickDate(type) {
        const nextDate =
            type === "today"
                ? todayDate()
                : type === "tomorrow"
                    ? tomorrowDate()
                    : addDays(todayDate(), -1);

        setFilters((prev) => ({
            ...prev,
            page: 1,
            delivery_date: toYyyyMmDd(nextDate),
        }));

        if (type === "tomorrow") {
            handleQueueChange("before_lock");
        } else if (type === "today") {
            handleQueueChange("to_pack");
        } else {
            handleQueueChange("all");
        }
    }

    async function handleQuickAction(orderId, toStatus) {
        try {
            await updateStatusMut.mutateAsync({
                orderId,
                payload: { to_status: toStatus },
            });

            toast.success("Order updated");
        } catch (e) {
            toast.error(e?.message || "Failed to update order");
        }
    }

    function handleBulkAction(toStatus) {
        if (!selectedIds.length) {
            toast.warning("Please select at least one order");
            return;
        }

        setBulkActionDialog({
            open: true,
            toStatus,
        });
    }

    function confirmBulkAction() {
        if (!bulkActionDialog.toStatus) return;

        console.log("bulkActionDialog : ", bulkActionDialog.toStatus);

        bulkUpdateMut.mutate({
            orderIds: selectedIds,
            toStatus: bulkActionDialog.toStatus,
            note: `Orders moved to ${bulkActionDialog.toStatus}`
        });

        setBulkActionDialog({
            open: false,
            toStatus: null,
        });
    }

    console.log("selectedIds : ", selectedIds);

    async function handleExportAllCsv() {
        try {
            const { blob, filename } = await OpsOrdersService.exportAllCsv({
                warehouse_id: filters.warehouse_id,
                delivery_partner_user_id: filters.delivery_partner_user_id,
                delivery_date: filters.delivery_date,
                q: filters.q,
                status: queueToStatusFilter(queue),
                isOrderAssigned: queueToAssignedFilter(queue),
            });

            downloadBlob(blob, filename);
        } catch (e) {
            toast.error("Failed to export CSV");
        }
    }

    function isAllVisibleSelected() {
        if (!visibleRows.length) return false;
        return visibleRows.every((row) => selectedIds.includes(row.id));
    }

    function toggleSelectAllVisible() {
        if (!visibleRows.length) return;

        if (isAllVisibleSelected()) {
            setSelectedIds((prev) => prev.filter((id) => !visibleRows.some((row) => row.id === id)));
            return;
        }

        const next = new Set(selectedIds);
        visibleRows.forEach((row) => next.add(row.id));
        setSelectedIds(Array.from(next));
    }

    function toggleRowSelection(orderId) {
        setSelectedIds((prev) =>
            prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
        );
    }

    function openAssignDialog(order) {
        setAssignOrder(order);
        setSelectedPartnerId(order?.delivery_partner_user_id || "");
        setAssignDialogOpen(true);
    }

    async function handleAssignDeliveryPartner() {
        if (!assignOrder?.id) {
            toast.error("Order not found");
            return;
        }

        if (!selectedPartnerId) {
            toast.warning("Please select a delivery partner");
            return;
        }

        assignDeliveryPartnerMut.mutate({
            orderId: assignOrder.id,
            payload: {
                delivery_partner_user_id: selectedPartnerId,
            },
        });
    }

    async function handleUnassignDeliveryPartner(order) {
        setConfirmDialog({
            open: true,
            title: "Unassign Delivery Partner",
            description: "Are you sure you want to unassign this delivery partner?",
            confirmText: "Unassign",
            loading: unassignDeliveryPartnerMut.isPending,
            onConfirm: () => {
                unassignDeliveryPartnerMut.mutate({
                    orderId: order.id,
                    payload: {},
                });

                setConfirmDialog((prev) => ({
                    ...prev,
                    open: false,
                }));
            },
        });
    }

    function handleBulkAssignDeliveryPartner() {
        if (!selectedIds.length) {
            toast.warning("Please select at least one order");
            return;
        }

        if (!bulkPartnerId) {
            toast.warning("Please select a delivery partner");
            return;
        }

        setConfirmDialog({
            open: true,
            title: "Assign Delivery Partner",
            description: `Assign ${selectedIds.length} selected orders to this delivery partner?`,
            confirmText: "Assign",
            loading: bulkAssignDeliveryPartnerMut.isPending,
            onConfirm: () => {
                bulkAssignDeliveryPartnerMut.mutate({
                    order_ids: selectedIds,
                    delivery_partner_user_id: bulkPartnerId,
                    note: `Orders assigned to delivery partner ${bulkPartnerId}`,
                });

                setConfirmDialog((prev) => ({
                    ...prev,
                    open: false,
                }));
            },
        });
    }

    function handleBulkUnassignDeliveryPartner() {
        if (!selectedIds.length) {
            toast.warning("Please select at least one order");
            return;
        }

        if (!bulkPartnerId) {
            toast.warning("Please select a delivery partner");
            return;
        }

        setConfirmDialog({
            open: true,
            title: "Unassign Delivery Partner",
            description: `Unassign ${selectedIds.length} selected orders to this delivery partner?`,
            confirmText: "Unassign",
            loading: bulkUnassignDeliveryPartnerMut.isPending,
            onConfirm: () => {
                bulkUnassignDeliveryPartnerMut.mutate({
                    order_ids: selectedIds,
                    delivery_partner_user_id: bulkPartnerId,
                    note: `Orders unassigned from delivery partner ${bulkPartnerId}`,
                });

                setConfirmDialog((prev) => ({
                    ...prev,
                    open: false,
                }));
            },
        });
    }


    return (
        <div>
            <PageHeader
                title="Orders (Ops)"
                subtitle="Daily delivery operations workspace for admin and warehouse team."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => handleQuickDate("today")}>
                            Today
                        </Button>

                        <Button variant="outline" onClick={() => handleQuickDate("tomorrow")}>
                            Tomorrow
                        </Button>

                        <Button variant="outline" onClick={() => handleQuickDate("yesterday")}>
                            Yesterday
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => navigate(`/ops/procurement?delivery_date=${filters.delivery_date}`)}
                            disabled={!filters.delivery_date}
                        >
                            View Procurement
                        </Button>

                        {isAdmin ? (
                            <Button
                                onClick={() => lockOrdersMut.mutate()}
                                disabled={!filters.delivery_date || lockOrdersMut.isPending}
                            >
                                {lockOrdersMut.isPending ? "Running..." : "Run Lock Job"}
                            </Button>
                        ) : null}
                    </div>
                }
            />

            <Card className="max-w-full overflow-hidden p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Selected Delivery Date</div>
                        <div className="mt-1 text-xl font-semibold">{filters.delivery_date || "—"}</div>
                    </div>

                    <div className="flex max-w-full flex-wrap items-center gap-2 overflow-hidden">
                        <div className="rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-800">
                            Before Lock: <span className="font-semibold">{summary.beforeLock}</span>
                        </div>
                        <div className="rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-800">
                            Locked Queue: <span className="font-semibold">{summary.locked}</span>
                        </div>
                        <div className="rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-800">
                            Exceptions: <span className="font-semibold">{summary.exceptions}</span>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="mt-4">
                <Filters value={filters} onApply={handleApplyFilters} deliveryPartners={deliveryPartners} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <SummaryCard title="Total Orders" value={summary.total} active={queue === "all"} onClick={() => handleQueueChange("all")} />
                <SummaryCard title="Before Lock" value={summary.beforeLock} active={queue === "before_lock"} onClick={() => handleQueueChange("before_lock")} />
                <SummaryCard title="To Pack" value={summary.toPack} active={queue === "to_pack"} onClick={() => handleQueueChange("to_pack")} />
                <SummaryCard title="Packed" value={summary.packed} active={queue === "packed"} onClick={() => handleQueueChange("packed")} />
                <SummaryCard title="Out for Delivery" value={summary.outForDelivery} active={queue === "out_for_delivery"} onClick={() => handleQueueChange("out_for_delivery")} />
                <SummaryCard title="Delivered" value={summary.delivered} active={queue === "delivered"} onClick={() => handleQueueChange("delivered")} />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard title="Locked Queue" value={summary.locked} active={queue === "locked"} onClick={() => handleQueueChange("locked")} />
                <SummaryCard title="Exceptions" value={summary.exceptions} active={queue === "exceptions"} onClick={() => handleQueueChange("exceptions")} />
                <SummaryCard title="Assigned" value={summary.assigned} active={queue === "assigned"} onClick={() => handleQueueChange("assigned")} />
                <SummaryCard title="Unassigned" value={summary.unassigned} active={queue === "unassigned"} onClick={() => handleQueueChange("unassigned")} />
            </div>

            <div className="mt-4">
                <Card className="w-full overflow-hidden p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <QueueTabs value={queue} onChange={handleQueueChange} />

                        <div className="flex max-w-full flex-wrap items-center gap-2 overflow-hidden">
                            <PDFDownloadLink
                                document={<OpsOrdersListPdf orders={visibleRows} filters={{ ...filters, queue }} />}
                                fileName={`ops_orders_${filters.delivery_date || new Date().toISOString().slice(0, 10)}.pdf`}
                            >
                                {({ loading }) => (
                                    <Button variant="outline" disabled={loading || !visibleRows.length}>
                                        {loading ? "Preparing PDF..." : "Export PDF"}
                                    </Button>
                                )}
                            </PDFDownloadLink>

                            <Button
                                variant="outline"
                                disabled={!visibleRows.length}
                                onClick={() => exportOrdersCsv({ orders: visibleRows, filters: { ...filters, queue } })}
                            >
                                Export CSV (Visible)
                            </Button>

                            <Button variant="outline" onClick={handleExportAllCsv}>
                                Export All CSV
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <select
                            className="h-10 min-w-[240px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                            value={bulkPartnerId}
                            onChange={(e) => setBulkPartnerId(e.target.value)}
                            disabled={bulkAssignDeliveryPartnerMut.isPending}
                        >
                            <option value="">Select delivery partner</option>
                            {deliveryPartners.map((partner) => (
                                <option key={partner.id} value={partner.id}>
                                    {partner.full_name || partner.phone || partner.id}
                                    {partner.phone ? ` (${partner.phone})` : ""}
                                </option>
                            ))}
                        </select>

                        <Button
                            variant="outline"
                            disabled={disableBulkAssign}
                            onClick={handleBulkAssignDeliveryPartner}
                        >
                            {bulkAssignDeliveryPartnerMut.isPending ? "Assigning..." : "Assign Selected Rider"}
                        </Button>

                        <Button
                            variant="outline"
                            disabled={disableBulkUnassign}
                            onClick={handleBulkUnassignDeliveryPartner}
                        >
                            {bulkUnassignDeliveryPartnerMut.isPending ? "Unassigning..." : "Unassign Selected Rider"}
                        </Button>

                        <Button variant="outline" disabled={disableBulkStatus("accepted")} onClick={() => handleBulkAction("accepted")}>
                            Bulk Accept
                        </Button>

                        <Button variant="outline" disabled={disableBulkStatus("packed")} onClick={() => handleBulkAction("packed")}>
                            Bulk Packed
                        </Button>

                        <Button variant="outline" disabled={disableBulkStatus("out_for_delivery")} onClick={() => handleBulkAction("out_for_delivery")}>
                            Bulk Out for Delivery
                        </Button>

                        <Button variant="outline" disabled={disableBulkStatus("delivered")} onClick={() => handleBulkAction("delivered")}>
                            Bulk Delivered
                        </Button>

                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Selected: {selectedIds.length}
                        </div>
                    </div>

                    <div className="mt-4 w-[1199px] overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="w-full overflow-x-auto thin-scrollbar">
                            <table className="w-full table-auto whitespace-nowrap text-sm">
                                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/40">
                                    <tr>
                                        <th className="w-10 px-4 py-3 text-left">
                                            <input type="checkbox" checked={isAllVisibleSelected()} onChange={toggleSelectAllVisible} />
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold">Order</th>
                                        <th className="px-4 py-3 text-left font-semibold">Customer</th>
                                        <th className="px-4 py-3 text-left font-semibold">Delivery</th>
                                        <th className="px-4 py-3 text-left font-semibold">Area</th>
                                        <th className="px-4 py-3 text-left font-semibold">Items</th>
                                        <th className="px-4 py-3 text-left font-semibold">Amount</th>
                                        <th className="px-4 py-3 text-left font-semibold">Payment</th>
                                        <th className="px-4 py-3 text-left font-semibold">Delivery Partner</th>
                                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                                        <th className="px-4 py-3 text-left font-semibold">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {listQuery.isLoading ? (
                                        <tr>
                                            <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                                                Loading orders...
                                            </td>
                                        </tr>
                                    ) : visibleRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                                                No orders found for this queue.
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleRows.map((order) => {
                                            const nextActions = getNextActions(order);

                                            return (
                                                <tr key={order.id} className="border-t border-slate-100 dark:border-slate-900">
                                                    <td className="px-4 py-3 align-middle">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(order.id)}
                                                            onChange={() => toggleRowSelection(order.id)}
                                                        />
                                                    </td>

                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="font-medium">{order.order_number || "—"}</div>
                                                        <div className="max-w-[220px] truncate text-xs text-slate-500" title={order.id}>
                                                            {order.id}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="font-medium">{getCustomerName(order)}</div>
                                                        <div className="text-xs text-slate-500">{getCustomerPhone(order)}</div>
                                                    </td>

                                                    <td className="px-4 py-3 align-middle">{order.delivery_date || "—"}</td>
                                                    <td className="px-4 py-3 align-middle">{getOrderArea(order)}</td>
                                                    <td className="px-4 py-3 align-middle">{getOrderItemsCount(order)}</td>

                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="font-medium">{money(getOrderTotal(order))}</div>
                                                    </td>

                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="font-medium">{order.payment_method || "—"}</div>
                                                        <div className="text-xs text-slate-500">{order.payment_status || "—"}</div>
                                                    </td>

                                                    <td className="px-4 py-3 align-middle">
                                                        {order.delivery_partner ? (
                                                            <div>
                                                                <div className="font-medium">{getDeliveryPartnerName(order)}</div>
                                                                <div className="text-xs text-slate-500">
                                                                    {getDeliveryPartnerPhone(order) || "—"}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-500">—</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <StatusBadge value={order.status} />
                                                            <span className="text-xs text-slate-500">
                                                                {order.is_locked ? "Locked" : "Not locked"}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="flex flex-nowrap gap-2">
                                                            <Button variant="outline" size="sm" onClick={() => setPreviewOrder(order)}>
                                                                Preview
                                                            </Button>

                                                            <Button variant="outline" size="sm" asChild>
                                                                <Link to={`/ops/orders/${order.id}`}>View</Link>
                                                            </Button>

                                                            {canAssignDeliveryPartner(order) ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => openAssignDialog(order)}
                                                                    disabled={assignDeliveryPartnerMut.isPending}
                                                                >
                                                                    {order.delivery_partner_user_id ? "Reassign Rider" : "Assign Rider"}
                                                                </Button>
                                                            ) : null}

                                                            {canUnassignDeliveryPartner(order) ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleUnassignDeliveryPartner(order)}
                                                                    disabled={unassignDeliveryPartnerMut.isPending}
                                                                >
                                                                    Unassign
                                                                </Button>
                                                            ) : null}

                                                            {nextActions.map((action) => (
                                                                <Button
                                                                    key={action.key}
                                                                    size="sm"
                                                                    onClick={() => handleQuickAction(order.id, action.key)}
                                                                    disabled={updateStatusMut.isPending}
                                                                >
                                                                    {action.label}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Page {page} · Showing {rows.length} rows · Total {total}
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                disabled={page <= 1 || listQuery.isLoading}
                                onClick={() =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        page: Math.max(1, Number(prev.page || 1) - 1),
                                    }))
                                }
                            >
                                Prev
                            </Button>

                            <Button
                                variant="outline"
                                disabled={rows.length < limit || listQuery.isLoading}
                                onClick={() =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        page: Number(prev.page || 1) + 1,
                                    }))
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            <OrderPreviewDialog
                order={previewOrder}
                open={!!previewOrder}
                onOpenChange={(open) => {
                    if (!open) setPreviewOrder(null);
                }}
                onViewDetails={(orderId) => {
                    setPreviewOrder(null);
                    navigate(`/ops/orders/${orderId}`);
                }}
                onAssignClick={(order) => {
                    setPreviewOrder(null);
                    openAssignDialog(order);
                }}
                onUnassignClick={handleUnassignDeliveryPartner}
                isAssignPending={assignDeliveryPartnerMut.isPending}
                isUnassignPending={unassignDeliveryPartnerMut.isPending}
            />

            <AssignDeliveryPartnerDialog
                open={assignDialogOpen}
                onOpenChange={(open) => {
                    setAssignDialogOpen(open);
                    if (!open && !assignDeliveryPartnerMut.isPending) {
                        setAssignOrder(null);
                        setSelectedPartnerId("");
                    }
                }}
                order={assignOrder}
                deliveryPartners={deliveryPartners}
                selectedPartnerId={selectedPartnerId}
                onChangePartner={setSelectedPartnerId}
                onAssign={handleAssignDeliveryPartner}
                isPending={assignDeliveryPartnerMut.isPending}
            />

            <Dialog
                open={bulkActionDialog.open}
                onOpenChange={(open) => {
                    setBulkActionDialog({
                        open,
                        toStatus: open ? bulkActionDialog.toStatus : null,
                    });
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Confirm Bulk Update
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to update{" "}
                            <span className="font-semibold text-foreground">
                                {selectedIds.length}
                            </span>{" "}
                            selected orders to{" "}
                            <span className="font-semibold text-foreground">
                                "{bulkActionDialog.toStatus}"
                            </span>
                            ?
                        </p>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setBulkActionDialog({
                                        open: false,
                                        toStatus: null,
                                    })
                                }
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={confirmBulkAction}
                                disabled={bulkUpdateMut.isPending}
                            >
                                {bulkUpdateMut.isPending
                                    ? "Updating..."
                                    : "Confirm"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={confirmDialog.open}
                onOpenChange={(open) => {
                    if (!confirmDialog.loading) {
                        setConfirmDialog((prev) => ({
                            ...prev,
                            open,
                        }));
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {confirmDialog.title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {confirmDialog.description}
                        </p>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setConfirmDialog((prev) => ({
                                        ...prev,
                                        open: false,
                                    }))
                                }
                                disabled={confirmDialog.loading}
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={() => {
                                    if (confirmDialog.onConfirm) {
                                        confirmDialog.onConfirm();
                                    }
                                }}
                                disabled={confirmDialog.loading}
                            >
                                {confirmDialog.loading
                                    ? "Processing..."
                                    : confirmDialog.confirmText}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}