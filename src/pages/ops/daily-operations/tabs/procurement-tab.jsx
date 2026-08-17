import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { PremiumWorkspaceHelper } from "../../../../components/common/premium-workspace-helper";
import { VendorWorkflowGuide } from "../../../../components/common/vendor-workflow-guide";
import {
  Search,
  Printer,
  Check,
  CheckCircle2,
  AlertTriangle,
  Save,
  Filter,
  Package,
  Edit2,
  Trash2,
  Plus,
  ShoppingCart,
  Cpu,
  MoreHorizontal,
  MapPin,
  LayoutGrid,
  Table2,
  ArrowRight,
  Store,
  Lock,
} from "lucide-react";
import { Card } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { ConfirmDialog } from "../../../../components/common/confirm-dialog";
import { StatusBadge } from "../../../../components/common/status-badge";
import { useToast } from "../../../../components/toast/toast-context";
import { formatPaiseToRupees, parseDecimal } from "../../../../utils/daily-operations-helpers";
import { cn, formatQuantity } from "../../../../lib/utils";
import { ProcurementPrintSheet, MandiBuyerPrintSheet } from "../print/procurement-print";
import { PremiumSelect } from "../../../../components/ui/premium-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { normalizeAutomationCapabilities } from "../../../../utils/daily-operations-normalizers";
import { VendorService } from "../../../../api/services/vendor.service";
import {
  acceptedPayoutPaise,
  addQuantities,
  formatProcurementQuantity,
  formatQuantityWithUnit,
  formatVendorPriceUpdatedAt,
  formatVendorMoney,
  getVendorAssignmentStatus,
  parseQuantityScaled,
  remainingAssignmentQuantity,
  vendorUnitCostPaise,
  formatScaledQuantity,
} from "../../../../utils/vendor-assignment";
import {
  getProcurementActionFlow,
  getProcurementDisplayStatus,
} from "../../../../utils/procurement-action-flow";
import { ProcurementWorkTable } from "./procurement-work-table";
import { autoAssignableProcurementCostIds } from "../../../../utils/procurement-work-view";

const emptyAllocation = () => ({
  vendor_user_id: "",
  allocated_quantity: "",
  notes: "",
});

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  try {
    if (/^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?$/i.test(timeStr)) return timeStr;
    return format(new Date(timeStr), "hh:mm a");
  } catch {
    return timeStr;
  }
};

const itemProductId = (item) => item.product_id || item.product?.id;
const itemPackId = (item) =>
  item.product_pack_id || item.pack_id || item.product_pack?.id || item.pack?.id || null;
const catalogueProductId = (entry) => entry.product_id || entry.product?.id;
const cataloguePackId = (entry) =>
  entry.product_pack_id ?? entry.product_pack?.id ?? entry.pack?.id ?? null;
const itemMode = (item) => item.is_product_group || item.quantities_normalized || item.procurement_mode === "bulk" ? "bulk" : "pack";
const itemUnit = (item) => {
  const unit = String(
    item.procurement_unit || (itemMode(item) === "pack" ? (item.pack_label || "pack") : "")
  ).toLowerCase();
  if (["unit", "units", ""].includes(unit)) {
    return itemMode(item) === "pack" ? "pack" : "pc";
  }
  return ["piece", "pieces", "pcs", "pc"].includes(unit) ? "pc" : unit;
};
const formatItemQuantity = (item, value, fallback = "—") =>
  formatProcurementQuantity(item, value, fallback);
const AUTO_ASSIGNMENT_REASONS = {
  already_assigned: "Already assigned",
  no_matching_vendor: "No active vendor is configured for this product and supply format",
  insufficient_vendor_capacity: "Increase this product’s vendor maximum or add another vendor, then run Auto Assign again.",
  lead_time_exceeded: "Vendor lead time exceeds the delivery deadline",
  vendor_price_not_set: "Matching vendor has not set a price for this product",
  vendor_procurement_unit_mismatch: "Vendor price unit does not match this procurement requirement",
  order_not_locked: "Orders containing this product are not locked yet",
};

function VendorAllocationsMenu({ assignments, attendance, fallbackUnit }) {
  const first = assignments[0];
  const firstName =
    first?.vendor?.vendor_profile?.company_name || first?.vendor?.full_name || "Vendor";
  const allocatedTotal = assignments.reduce(
    (total, assignment) => total + Number(assignment.allocated_quantity || 0),
    0
  );
  const unit = first?.procurement_unit || fallbackUnit;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group grid h-10 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-2.5 text-left shadow-sm transition-all hover:border-dailyveg-300 hover:bg-dailyveg-50/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dailyveg-400/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-dailyveg-800 dark:hover:bg-dailyveg-950/30"
          aria-label={`View ${assignments.length} vendor allocation${assignments.length === 1 ? "" : "s"}`}
        >
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-bold text-slate-800 dark:text-slate-100">
              {firstName}
              {assignments.length > 1 ? ` +${assignments.length - 1}` : ""}
            </span>
            <span className="block text-[9px] font-semibold text-slate-400">
              {assignments.length} allocation{assignments.length === 1 ? "" : "s"} · click to view
            </span>
          </span>
          <span className="max-w-[76px] truncate rounded-lg bg-dailyveg-50 px-2 py-1 text-right text-[10px] font-extrabold text-dailyveg-700 transition-colors group-hover:bg-dailyveg-100 dark:bg-dailyveg-950/70 dark:text-dailyveg-300">
            {formatQuantityWithUnit(String(Number(allocatedTotal.toFixed(3))), unit)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        collisionPadding={16}
        className="w-[370px] max-w-[calc(100vw-2rem)] rounded-2xl p-0 shadow-2xl shadow-slate-300/40 dark:shadow-black/50"
      >
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">Vendor allocations</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Complete assignment and pricing details</p>
            </div>
            <Badge variant="secondary">{assignments.length}</Badge>
          </div>
        </div>
        <div className="max-h-[360px] space-y-2 overflow-y-auto p-3 thin-scrollbar">
          {assignments.map((assignment) => {
            const statusInfo = getVendorAssignmentStatus(assignment.status);
            const checkIn = (attendance || []).find(
              (entry) =>
                String(entry.vendor_user_id || entry.vendorUserId || "") ===
                String(assignment.vendor_user_id || assignment.vendor?.id || "")
            );
            const arrivedTime = checkIn
              ? formatTime(checkIn.checked_in_at || checkIn.check_in_time || checkIn.created_at || checkIn.time)
              : null;
            const assignmentUnit = assignment.procurement_unit || fallbackUnit;
            const payoutQuantity =
              Number(assignment.supplied_quantity) > 0
                ? assignment.supplied_quantity
                : assignment.allocated_quantity ?? "0";

            return (
              <div
                key={assignment.id}
                className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {assignment.vendor?.vendor_profile?.company_name ||
                        assignment.vendor?.full_name ||
                        "Vendor"}
                    </p>
                    {arrivedTime ? (
                      <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Arrived {arrivedTime}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={statusInfo.variant} className="shrink-0 text-[9px]">
                    {statusInfo.label}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[10px] dark:border-slate-800">
                  <div>
                    <span className="block text-slate-400">Allocated</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatQuantityWithUnit(assignment.allocated_quantity, assignmentUnit)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">Supplied</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatQuantityWithUnit(assignment.supplied_quantity, assignmentUnit)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">Locked price</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatVendorMoney(assignment.unit_cost_paise)}/{String(assignmentUnit).toUpperCase()}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">Expected payout</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {assignment.unit_cost_paise === null || assignment.unit_cost_paise === undefined
                        ? "—"
                        : formatVendorMoney(
                          acceptedPayoutPaise(payoutQuantity, assignment.unit_cost_paise)
                        )}
                    </strong>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-400">Price locked</span>
                    <strong className="text-slate-700 dark:text-slate-300">
                      {formatVendorPriceUpdatedAt(assignment.price_locked_at)}
                    </strong>
                  </div>
                </div>
                {assignment.notes ? (
                  <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[9px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    {assignment.notes}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProcurementTab({
  procurementData,
  isLoading,
  isError,
  onRetry,
  workView = "active",
  onWorkViewChange,
  operation,
  isClosed,
  isAdmin,
  isWarehouseManager,
  onUpdateItem,
  onBulkUpdate,
  isUpdating,
  capabilitiesRaw,
  onSelectTab,
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activePrintSheet, setActivePrintSheet] = useState("manager");
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === "undefined") return "table";
    const saved = window.localStorage.getItem("freshveg_admin_procurement_view_mode");
    return saved === "grid" ? "grid" : "table";
  });

  const updateViewMode = (nextMode) => {
    setViewMode(nextMode);
    window.localStorage.setItem("freshveg_admin_procurement_view_mode", nextMode);
  };

  const capabilities = useMemo(() => {
    return normalizeAutomationCapabilities(capabilitiesRaw || operation?.automation_capabilities);
  }, [capabilitiesRaw, operation]);

  // Expanded item rows track
  const [expandedItemIds, setExpandedItemIds] = useState({});

  // Edit item modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Bulk edit draft values map: itemId -> item payload
  const [bulkDrafts, setBulkDrafts] = useState({});
  const [assigningItem, setAssigningItem] = useState(null);
  const [allocationRows, setAllocationRows] = useState([emptyAllocation()]);
  const [confirmAutoAssign, setConfirmAutoAssign] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState(null);

  const assignmentsQuery = useQuery({
    queryKey: ["admin", "vendorAssignments", operation?.id],
    queryFn: () => VendorService.getAssignments(operation.id, { logical: true }),
    enabled: Boolean(operation?.id),
  });

  const attendanceQuery = useQuery({
    queryKey: ["admin", "vendorAttendance", operation?.id],
    queryFn: () => VendorService.getAttendance(operation?.delivery_date),
    enabled: Boolean(operation?.id && operation?.delivery_date),
  });
  const vendorCataloguesQuery = useQuery({
    queryKey: ["admin", "vendorCatalogues", operation?.warehouse_id],
    queryFn: async () => {
      const vendors = (await VendorService.listForWarehouse(operation.warehouse_id)).filter(
        (vendor) => vendor.status === "active" && vendor.user?.status !== "inactive"
      );
      return Promise.all(
        vendors.map(async (vendor) => ({
          vendor,
          catalogue: await VendorService.getProducts(vendor.id),
        }))
      );
    },
    enabled: Boolean(assigningItem && operation?.warehouse_id),
    staleTime: 5 * 60 * 1000,
  });


  const assignMutation = useMutation({
    mutationFn: ({ item, procurementCostId, assignments }) => item?.is_product_group
      ? VendorService.groupedAssign({
        group_id: item.group_id,
        daily_operation_id: operation.id,
        product_id: item.product_id,
        child_procurement_cost_ids: item.child_procurement_cost_ids,
        assignments: assignments.map((row) => ({
          vendor_user_id: row.vendor_user_id,
          quantity: Number(row.allocated_quantity),
          notes: row.notes?.trim() || null,
        })),
      })
      : VendorService.bulkAssign({
        procurement_cost_id: procurementCostId,
        allocation_mode: "remaining_quantity",
        assignments: assignments.map((row) => ({
          vendor_user_id: row.vendor_user_id,
          new_cycle_quantity: row.allocated_quantity,
          notes: row.notes?.trim() || null,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendorAssignments", operation?.id] });
      queryClient.invalidateQueries({ queryKey: ["ops", "dailyOperations", "procurement", operation?.id] });
      toast.success("Vendor assignments saved");
      setAssigningItem(null);
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || error?.message || "Failed to assign vendors"),
  });
  const autoAssignMutation = useMutation({
    mutationFn: () => VendorService.autoAssign({
      daily_operation_id: operation.id,
      procurement_cost_ids: autoAssignableIds,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendorAssignments", operation?.id] });
      queryClient.invalidateQueries({ queryKey: ["ops", "dailyOperations", "procurement", operation?.id] });
      const result = data || {};
      setAutoAssignResult(result);
      const created = result.assignments?.length || 0;
      if (result.unassigned?.length) {
        toast.warning(
          `Auto-assigned ${created} assignment${created === 1 ? "" : "s"}; ${result.unassigned.length} item${result.unassigned.length === 1 ? "" : "s"} still need attention`
        );
      } else {
        toast.success(`Auto-assigned ${created} assignment${created === 1 ? "" : "s"}`);
      }
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || error?.message || "Automatic assignment failed"),
  });
  const items = useMemo(() => procurementData?.items || [], [procurementData]);
  const autoAssignableIds = useMemo(
    () => autoAssignableProcurementCostIds(items),
    [items]
  );
  const assignmentsByCost = useMemo(() => {
    return (assignmentsQuery.data || []).reduce((map, assignment) => {
      const costIds = assignment.child_procurement_cost_ids?.length
        ? assignment.child_procurement_cost_ids
        : [assignment.procurement_cost_id];
      costIds.filter(Boolean).forEach((costId) => {
        const key = String(costId);
        if (!map[key]) map[key] = [];
        if (!map[key].some((entry) => entry.id === assignment.id)) map[key].push(assignment);
      });
      return map;
    }, {});
  }, [assignmentsQuery.data]);
  const itemAssignments = (item) => item?.is_product_group
    ? (item.child_procurement_cost_ids || [])
      .flatMap((id) => assignmentsByCost[String(id)] || [])
      .filter((assignment, index, rows) => rows.findIndex((row) => row.id === assignment.id) === index)
    : assignmentsByCost[String(item.procurement_cost_id || item.id)] || [];
  const isVendorManagedItem = (item) =>
    Boolean(
      item.manual_execution_allowed === false ||
      item.is_vendor_managed ||
      itemAssignments(item).length > 0
    );
  const remainingForItem = (item) =>
    remainingAssignmentQuantity(item.required_quantity || "0", itemAssignments(item));

  const hasUnassignedPending = useMemo(() => {
    return items.some((item) => {
      const isPending = item.procurement_status !== "completed" && item.procurement_status !== "not_required";
      return isPending && remainingForItem(item) > 0n;
    });
  }, [items, assignmentsByCost]);
  const hasManualPending = useMemo(
    () => items.some(
      (item) =>
        !isVendorManagedItem(item) &&
        !["completed", "not_required"].includes(item.procurement_status)
    ),
    [items, assignmentsByCost]
  );

  const filterCounts = useMemo(() => {
    return {
      all: items.length,
      needs_confirmation: items.filter(
        (item) => item.procurement_status !== "completed" && item.procurement_status !== "not_required"
      ).length,
      shortage: items.filter((item) => Number(item.shortage_quantity || 0) > 0).length,
      late_delta: items.filter((item) => Number(item.late_order_delta || 0) > 0).length,
      completed: items.filter((item) => item.procurement_status === "completed").length,
      exceptions: items.filter(
        (item) =>
          item.procurement_status === "issue" ||
          Number(item.rejected_quantity || 0) > 0 ||
          Number(item.shortage_quantity || 0) > 0
      ).length,
    };
  }, [items]);

  const getItemAssignments = itemAssignments;

  const completedAssignments = useMemo(() => {
    if (!assigningItem) return [];
    return getItemAssignments(assigningItem).filter((assignment) =>
      ["confirmed", "dispatched", "received"].includes(assignment.status)
    );
  }, [assigningItem, getItemAssignments]);

  const completedTotal = useMemo(() => {
    return completedAssignments.reduce(
      (sum, row) => sum + parseQuantityScaled(row.allocated_quantity || 0),
      0n
    );
  }, [completedAssignments]);

  const activeAssignments = useMemo(() => {
    if (!assigningItem) return [];
    return getItemAssignments(assigningItem).filter((assignment) =>
      ["assigned", "approved", "pending_quote", "quoted"].includes(assignment.status)
    );
  }, [assigningItem, getItemAssignments]);
  const openVendorCheckIn = (item) => {
    const assignment = getItemAssignments(item).find((entry) =>
      entry.status === "dispatched"
    );
    const vendorUserId = assignment?.vendor_user_id || assignment?.vendor?.id;
    if (onSelectTab) {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set("tab", "vendor-check-in");
      if (vendorUserId) {
        nextParams.set("vendor_user_id", vendorUserId);
      } else {
        nextParams.delete("vendor_user_id");
      }
      navigate(`${window.location.pathname}?${nextParams.toString()}`, { replace: true });
      onSelectTab("vendor-check-in");
    } else {
      const params = new URLSearchParams();
      params.set("tab", "vendor-check-in");
      if (operation?.delivery_date) params.set("delivery_date", operation.delivery_date);
      if (vendorUserId) params.set("vendor_user_id", vendorUserId);
      navigate(`/ops/daily-operations?${params.toString()}`);
    }
  };

  const openAssignModal = (item) => {
    // Confirmed/dispatched/received cycles are immutable and remain visible in
    // vendor details. The assignment editor only manages quantities the vendor
    // has not accepted yet; late demand is therefore shown as a separate cycle.
    const existing = getItemAssignments(item).filter((assignment) =>
      ["assigned", "pending_quote", "quoted", "approved"].includes(assignment.status)
    );
    setAssigningItem(item);
    setAllocationRows(
      !item.is_product_group && existing.length
        ? existing.map((assignment) => ({
          vendor_user_id: assignment.vendor?.id || "",
          allocated_quantity: String(assignment.allocated_quantity ?? ""),
          notes: assignment.notes || "",
        }))
        : [emptyAllocation()]
    );
  };

  const submitAssignments = () => {
    const vendorIds = allocationRows.map((row) => row.vendor_user_id).filter(Boolean);
    if (allocationRows.some((row) => {
      try {
        return !row.vendor_user_id || parseQuantityScaled(row.allocated_quantity) <= 0n;
      } catch {
        return true;
      }
    })) {
      toast.warning("Select a vendor and enter a valid quantity for every row");
      return;
    }
    if (new Set(vendorIds).size !== vendorIds.length) {
      toast.warning("The same vendor cannot be selected more than once");
      return;
    }
    const allocated = addQuantities(allocationRows.map((row) => row.allocated_quantity));
    const requiredScaled = parseQuantityScaled(assigningItem?.required_quantity || "0");
    const maxAllowedScaled = (requiredScaled * 125n) / 100n;
    const allocatedScaled = assigningItem?.is_product_group
      ? parseQuantityScaled(assigningItem?.effective_allocated_quantity || "0")
      : completedTotal;
    const availableScaled = maxAllowedScaled > allocatedScaled ? maxAllowedScaled - allocatedScaled : 0n;
    if (allocated > availableScaled) {
      toast.warning(`New allocation cannot exceed the remaining ${formatQuantityWithUnit(formatScaledQuantity(availableScaled), itemUnit(assigningItem))}`);
      return;
    }
    const outOfRange = allocationRows.find((row) => {
      const option = getMatchingVendorOptions(assigningItem).find(
        (candidate) => candidate.vendorUserId === row.vendor_user_id
      );
      const quantity = parseQuantityScaled(row.allocated_quantity);
      return (
        !option ||
        quantity < parseQuantityScaled(option.minimumQuantity || 0) ||
        (option.maximumQuantity !== null && quantity > parseQuantityScaled(option.maximumQuantity))
      );
    });
    if (outOfRange) {
      toast.warning("Each allocation must fit the selected vendor’s configured minimum and maximum");
      return;
    }
    assignMutation.mutate({
      item: assigningItem,
      procurementCostId: assigningItem.procurement_cost_id || assigningItem.id,
      assignments: allocationRows,
    });
  };

  const getMatchingVendorOptions = (item) => {
    const productId = itemProductId(item);
    const packId = itemPackId(item);
    return (vendorCataloguesQuery.data || []).flatMap(({ vendor, catalogue }) => {
      const active = catalogue.filter(
        (entry) =>
          catalogueProductId(entry) === productId &&
          (itemMode(item) === "bulk" ? cataloguePackId(entry) === null : true) &&
          entry.status === "active" &&
          entry.is_available !== false &&
          vendorUnitCostPaise(entry) > 0
      );
      const exact = itemMode(item) === "pack" && packId
        ? active.find((entry) => cataloguePackId(entry) === packId)
        : null;
      const fallback = active.find((entry) => cataloguePackId(entry) === null);
      const match = itemMode(item) === "bulk" ? fallback : (exact || fallback);
      if (!match || !vendor.user?.id) return [];
      return [{
        vendorUserId: vendor.user.id,
        vendor,
        catalogue: match,
        minimumQuantity: String(match.minimum_quantity || 0),
        maximumQuantity:
          match.maximum_quantity === null || match.maximum_quantity === undefined
            ? null
            : String(match.maximum_quantity),
        leadTimeHours: Number(match.lead_time_hours || 0),
        exactPackMatch: Boolean(exact),
        vendorUnitCostPaise: vendorUnitCostPaise(match),
      }];
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const pName = (item.product_name || item.product?.name || "").toLowerCase();
      const pPack = (item.pack_label || item.pack?.pack_label || "").toLowerCase();
      const vendor = (item.vendor_name || "").toLowerCase();
      const matchSearch =
        !searchTerm ||
        pName.includes(searchTerm.toLowerCase()) ||
        pPack.includes(searchTerm.toLowerCase()) ||
        vendor.includes(searchTerm.toLowerCase());

      // Filter modes:
      // "all", "needs_confirmation", "shortage", "late_delta", "completed", "exceptions"
      if (activeFilter === "needs_confirmation") {
        const isPending = item.procurement_status === "pending" || item.procurement_status === "partial" || !item.procurement_status;
        return matchSearch && isPending;
      }
      if (activeFilter === "shortage") {
        const hasShortage = Number(item.shortage_quantity || 0) > 0;
        return matchSearch && hasShortage;
      }
      if (activeFilter === "late_delta") {
        const hasDelta = Number(item.late_order_delta || 0) > 0;
        return matchSearch && hasDelta;
      }
      if (activeFilter === "completed") {
        return matchSearch && item.procurement_status === "completed";
      }
      if (activeFilter === "exceptions") {
        const isException =
          item.procurement_status === "issue" ||
          Number(item.rejected_quantity || 0) > 0 ||
          Number(item.shortage_quantity || 0) > 0;
        return matchSearch && isException;
      }

      return matchSearch;
    });
  }, [items, searchTerm, activeFilter]);

  const isRowExpanded = (item) => {
    if (expandedItemIds[item.id] !== undefined) {
      return expandedItemIds[item.id];
    }
    const hasShortage = Number(item.shortage_quantity || 0) > 0;
    const hasRejection = Number(item.rejected_quantity || 0) > 0;
    const hasExcess = Number(item.excess_quantity || 0) > 0;
    const hasCostOrVendorDiffers = Boolean(
      item.vendor_name ||
      item.unit_cost_paise ||
      item.bill_reference
    );
    return (
      hasShortage ||
      hasRejection ||
      hasExcess ||
      hasCostOrVendorDiffers
    );
  };

  const toggleRowExpand = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    const currentlyExpanded = isRowExpanded(item);
    setExpandedItemIds((prev) => ({
      ...prev,
      [itemId]: !currentlyExpanded,
    }));
  };

  const handleOpenEdit = (item) => {
    if (isVendorManagedItem(item)) {
      toast.info("Vendor-managed procurement must be updated through Vendor Check-In.");
      return;
    }
    setEditingItem(item);
    setEditForm({
      required_quantity: item.required_quantity ?? 0,
      purchased_quantity: item.purchased_quantity ?? 0,
      received_quantity: item.received_quantity ?? 0,
      rejected_quantity: item.rejected_quantity ?? 0,
      waste_quantity: item.waste_quantity ?? 0,
      unit_cost_rupees: item.unit_cost_paise ? (item.unit_cost_paise / 100).toString() : "",
      total_cost_rupees: item.total_cost_paise ? (item.total_cost_paise / 100).toString() : "",
      vendor_name: item.vendor_name || "",
      bill_reference: item.bill_reference || "",
      procurement_status: item.procurement_status || "pending",
      notes: item.notes || "",
    });
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    if (isVendorManagedItem(editingItem)) {
      toast.error("Vendor-managed procurement cannot be manually received.");
      setEditingItem(null);
      return;
    }

    const unitCostPaise = editForm.unit_cost_rupees
      ? Math.round(parseFloat(editForm.unit_cost_rupees) * 100)
      : null;
    const totalCostPaise = editForm.total_cost_rupees
      ? Math.round(parseFloat(editForm.total_cost_rupees) * 100)
      : null;

    const payload = {
      required_quantity: parseDecimal(editForm.required_quantity),
      purchased_quantity: parseDecimal(editForm.purchased_quantity),
      received_quantity: parseDecimal(editForm.received_quantity),
      rejected_quantity: parseDecimal(editForm.rejected_quantity),
      waste_quantity: parseDecimal(editForm.waste_quantity),
      unit_cost_paise: unitCostPaise,
      total_cost_paise: totalCostPaise,
      vendor_name: editForm.vendor_name || null,
      bill_reference: editForm.bill_reference || null,
      procurement_status: editForm.procurement_status,
      notes: editForm.notes || null,
    };

    try {
      await onUpdateItem({ itemId: editingItem.id, payload });
      toast.success("Procurement item updated");
      setEditingItem(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update item");
    }
  };

  const handleShortcutReceivedExact = (item) => {
    if (isVendorManagedItem(item)) {
      toast.info("Receive vendor-managed items through Vendor Check-In.");
      return;
    }
    const targetQty = item.purchased_quantity > 0 ? item.purchased_quantity : item.required_quantity;
    onUpdateItem({
      itemId: item.id,
      payload: {
        purchased_quantity: item.purchased_quantity > 0 ? item.purchased_quantity : item.required_quantity,
        received_quantity: parseDecimal(targetQty),
        rejected_quantity: 0,
        waste_quantity: item.waste_quantity ?? 0,
        procurement_status: "completed",
      },
    });
  };

  const handleShortcutPurchasedExact = (item) => {
    if (isVendorManagedItem(item)) {
      toast.info("Vendor-managed purchased quantity is derived from confirmed assignments.");
      return;
    }
    onUpdateItem({
      itemId: item.id,
      payload: {
        purchased_quantity: parseDecimal(item.required_quantity),
        received_quantity: item.received_quantity ?? 0,
        rejected_quantity: item.rejected_quantity ?? 0,
        waste_quantity: item.waste_quantity ?? 0,
        procurement_status: item.procurement_status || "pending",
      },
    });
  };

  const handleDraftChange = (itemId, field, value) => {
    const item = items.find((entry) => entry.id === itemId);
    if (item && isVendorManagedItem(item)) return;
    setBulkDrafts((prev) => {
      const existing = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleBulkSave = async () => {
    const draftEntries = Object.entries(bulkDrafts);
    if (draftEntries.length === 0) {
      toast.info("No modified draft items to save.");
      return;
    }

    const payloadItems = draftEntries.flatMap(([id, draft]) => {
      const origItem = items.find((i) => i.id === id) || {};
      if (isVendorManagedItem(origItem)) return [];
      const unitCostPaise = draft.unit_cost_rupees !== undefined
        ? (draft.unit_cost_rupees ? Math.round(parseFloat(draft.unit_cost_rupees) * 100) : null)
        : origItem.unit_cost_paise;
      const totalCostPaise = draft.total_cost_rupees !== undefined
        ? (draft.total_cost_rupees ? Math.round(parseFloat(draft.total_cost_rupees) * 100) : null)
        : origItem.total_cost_paise;

      return [{
        id,
        purchased_quantity: parseDecimal(draft.purchased_quantity ?? origItem.purchased_quantity),
        received_quantity: parseDecimal(draft.received_quantity ?? origItem.received_quantity),
        rejected_quantity: parseDecimal(draft.rejected_quantity ?? origItem.rejected_quantity),
        waste_quantity: parseDecimal(draft.waste_quantity ?? origItem.waste_quantity),
        unit_cost_paise: unitCostPaise,
        total_cost_paise: totalCostPaise,
        vendor_name: draft.vendor_name ?? origItem.vendor_name,
        bill_reference: draft.bill_reference ?? origItem.bill_reference,
        procurement_status: draft.procurement_status ?? origItem.procurement_status,
        notes: draft.notes ?? origItem.notes,
      }];
    });
    if (!payloadItems.length) {
      toast.info("Vendor-managed rows are updated through Vendor Check-In.");
      setBulkDrafts({});
      return;
    }

    try {
      await onBulkUpdate({ items: payloadItems });
      toast.success(`Bulk updated ${payloadItems.length} items successfully`);
      setBulkDrafts({});
    } catch (err) {
      toast.error(err?.message || "Failed bulk procurement update");
    }
  };

  const handleConfirmAllReceivedAsPlanned = async () => {
    const pendingItems = items.filter(
      (item) =>
        item.procurement_status !== "completed" &&
        item.procurement_status !== "not_required" &&
        !isVendorManagedItem(item)
    );

    if (pendingItems.length === 0) {
      toast.info("All items are already completed.");
      return;
    }

    const payloadItems = pendingItems.map((item) => {
      const targetQty = item.purchased_quantity > 0 ? item.purchased_quantity : item.required_quantity;
      return {
        id: item.id,
        purchased_quantity: parseDecimal(item.purchased_quantity > 0 ? item.purchased_quantity : item.required_quantity),
        received_quantity: parseDecimal(targetQty),
        rejected_quantity: 0,
        waste_quantity: item.waste_quantity ?? 0,
        procurement_status: "completed",
        vendor_name: item.vendor_name || null,
        bill_reference: item.bill_reference || null,
        notes: item.notes || null,
      };
    });

    try {
      await onBulkUpdate({ items: payloadItems });
      toast.success(`Bulk confirmed ${payloadItems.length} items as received.`);
    } catch (err) {
      toast.error(err?.message || "Bulk confirmation failed.");
    }
  };

  return (
    <div className="space-y-4">
      <ProcurementWorkTable
        data={procurementData}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        view={workView}
        onViewChange={onWorkViewChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isAdmin={isAdmin}
        isWarehouseManager={isWarehouseManager}
        isClosed={isClosed}
        isUpdating={isUpdating || assignMutation.isPending || autoAssignMutation.isPending}
        autoAssignDisabled={autoAssignableIds.length === 0}
        vendorAssignmentsByCost={assignmentsByCost}
        onAssignVendor={openAssignModal}
        onAutoAssign={() => setConfirmAutoAssign(true)}
        onReceive={(item) => isVendorManagedItem(item) ? openVendorCheckIn(item) : handleShortcutReceivedExact(item)}
        onCheckProblem={handleOpenEdit}
      />

      {false && (<>
        <PremiumWorkspaceHelper
          title="Mandi Purchase Guide (Step-by-Step)"
          description="Follow these easy steps to record vegetables purchased from the Mandi / Vendor."
          steps={[
            {
              title: "Check Product List",
              instruction: "Look at the table. It lists all the vegetables and quantities we need to buy.",
            },
            {
              title: "Confirm Perfect Buy",
              instruction: "If we got exactly what was requested, click the green 'Confirm All Received' button at the top.",
            },
            {
              title: "Correct Differences",
              instruction: "If we got less, more, or damaged items, click the Edit button (pencil) on that row.",
            },
            {
              title: "Save Your Work",
              instruction: "Type the actual amount received and vendor details, then click 'Save' or 'Save Drafts' at the top.",
            },
          ]}
        />

        {/* Hidden Print Layout */}
        {activePrintSheet === "buyer" ? (
          <MandiBuyerPrintSheet operation={operation} items={items} />
        ) : (
          <ProcurementPrintSheet operation={operation} items={items} />
        )}

        {/* Live Forecast Capability Diagnostics */}
        {(!capabilities.live_procurement_forecast || !capabilities.procurement_snapshot) && (
          <Card className="p-3 bg-slate-50 dark:bg-slate-900 border text-slate-600 dark:text-slate-400 text-xs flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-slate-500" />
            <div>
              <span className="font-bold">Backend automation pending</span> — Live forecasting and procurement snapshotting are currently offline. Falling back to expected order quantities.
            </div>
          </Card>
        )}

        {/* Header controls & filter tabs */}
        <div className="flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
          {/* Full-width search above */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-dailyveg-500" />
            <Input
              className="w-full pl-9 h-9 text-xs rounded-xl border-slate-200 bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300 focus:border-dailyveg-500 focus:ring-2 focus:ring-dailyveg-500/25 dark:border-slate-800 dark:bg-slate-950"
              placeholder="Search product, pack, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabs and buttons side by side below (enforced single-row without wrapping, no-scrollbar) */}
          <div className="flex flex-row items-center justify-between gap-4 w-full overflow-x-auto no-scrollbar">
            <div className="flex flex-nowrap bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-2xl text-[11px] font-bold border border-slate-200/60 dark:border-slate-800/80 gap-0.5 shadow-sm overflow-x-auto no-scrollbar whitespace-nowrap">
              {[
                { key: "all", label: "All", badgeColor: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
                { key: "needs_confirmation", label: "Confirming", badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
                { key: "shortage", label: "Missing", badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" },
                { key: "late_delta", label: "Late", badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300" },
                { key: "completed", label: "Completed", badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
                { key: "exceptions", label: "Exceptions", badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300" },
              ].map((f) => {
                const count = filterCounts[f.key] || 0;
                const isActive = activeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${isActive
                        ? "bg-white dark:bg-slate-950 text-slate-950 dark:text-white shadow-[0_2px_8px_-3px_rgba(15,23,42,0.15)] scale-[1.01]"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/40 dark:hover:bg-slate-950/40"
                      }`}
                    onClick={() => setActiveFilter(f.key)}
                  >
                    <span>{f.label}</span>
                    {count > 0 && (
                      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${f.badgeColor}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap">
              <VendorWorkflowGuide />
              {!isClosed && isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs rounded-xl shadow-sm border-indigo-200/80 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-indigo-800 dark:hover:bg-indigo-950/50 transition-all duration-200 hover:-translate-y-px hover:shadow"
                  onClick={() => setConfirmAutoAssign(true)}
                  disabled={autoAssignMutation.isPending || !operation?.id || !hasUnassignedPending}
                >
                  <Cpu className="mr-1 h-3.5 w-3.5 text-indigo-500" />
                  Auto-assign
                </Button>
              )}
              {!isClosed && isAdmin && (
                <Button
                  size="sm"
                  className="h-9 text-xs rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-px active:scale-95 gap-1 disabled:opacity-50 disabled:pointer-events-none"
                  onClick={handleConfirmAllReceivedAsPlanned}
                  disabled={isUpdating || !hasManualPending}
                  title="Confirm only manual/off-platform procurement as received"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Manual Received
                </Button>
              )}

              {Object.keys(bulkDrafts).length > 0 && !isClosed && isAdmin && (
                <Button
                  size="sm"
                  className="h-9 text-xs rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-px active:scale-95 gap-1"
                  onClick={handleBulkSave}
                  disabled={isUpdating}
                >
                  <Save className="h-3 w-3" /> Save Drafts ({Object.keys(bulkDrafts).length})
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 transition-all duration-200 hover:-translate-y-px hover:shadow gap-1"
                onClick={() => {
                  setActivePrintSheet("manager");
                  setTimeout(() => window.print(), 100);
                }}
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" /> Print Mandi Sheet
              </Button>

              <div className="grid h-9 grid-cols-2 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900 w-[72px] shrink-0 shadow-sm">
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-dailyveg-700 dark:text-slate-400 dark:hover:text-dailyveg-300",
                    viewMode === "table" &&
                    "bg-white text-dailyveg-700 shadow-sm dark:bg-slate-950 dark:text-dailyveg-300"
                  )}
                  onClick={() => updateViewMode("table")}
                  title="Table view"
                  aria-label="Table view"
                  aria-pressed={viewMode === "table"}
                >
                  <Table2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-dailyveg-700 dark:text-slate-400 dark:hover:text-dailyveg-300",
                    viewMode === "grid" &&
                    "bg-white text-dailyveg-700 shadow-sm dark:bg-slate-950 dark:text-dailyveg-300"
                  )}
                  onClick={() => updateViewMode("grid")}
                  title="Grid view"
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Procurement Data List */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading procurement items...</div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="font-medium">No items found matching the selected filters.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const draft = bulkDrafts[item.id] || {};
                  const isDirty = Boolean(bulkDrafts[item.id]);
                  const expanded = isRowExpanded(item);
                  const vendorAssignments = getItemAssignments(item);
                  const vendorManaged = isVendorManagedItem(item);
                  const assignmentsLocked =
                    vendorAssignments.length > 0 &&
                    vendorAssignments.some(
                      (assignment) =>
                        ["confirmed", "dispatched", "received"].includes(assignment.status)
                    );
                  const displayStatus = getProcurementDisplayStatus(item, vendorAssignments);
                  const actionFlow = getProcurementActionFlow({
                    item: { ...item, procurement_status: displayStatus },
                    isAdmin,
                    isClosed,
                    isUpdating,
                    vendorManaged,
                    assignmentsLocked,
                    assignments: vendorAssignments,
                  });

                  return (
                    <Card key={item.id} className={cn(
                      "overflow-hidden border transition-all duration-300 rounded-2xl bg-white shadow-sm hover:shadow-md dark:bg-slate-950",
                      isDirty ? "border-amber-300 bg-amber-50/10 dark:border-amber-800 dark:bg-amber-950/5" : "border-slate-200/80 dark:border-slate-800"
                    )}>
                      <div className="p-4 space-y-4">
                        {/* Header: Title and Badges */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-extrabold text-slate-950 dark:text-slate-50 text-sm leading-snug">
                              {item.product_name || item.product?.name || "—"}
                            </h4>
                            <div className="mt-1 flex items-center gap-1.5">
                              <Badge variant={itemMode(item) === "bulk" ? "success" : "outline"} className="text-[10px] px-1.5 py-0 font-semibold">
                                {itemMode(item) === "bulk" ? "Bulk" : "Pack"}
                              </Badge>
                              {vendorManaged ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                                  Vendor managed
                                </Badge>
                              ) : null}
                              {item.has_unlocked_orders ? (
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] px-1.5 py-0 font-semibold gap-1">
                                  <Lock className="h-2.5 w-2.5" />
                                  Unlocked orders
                                </Badge>
                              ) : null}
                              <span className="text-[10px] text-slate-505 dark:text-slate-400 font-bold">
                                {itemMode(item) === "bulk"
                                  ? (item.ordered_packs || `Product-level · ${itemUnit(item).toUpperCase()}`)
                                  : (item.pack_label || item.pack?.pack_label || "Pack")}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge value={displayStatus} />
                            {isDirty && (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-100/50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md">
                                Unsaved Draft
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantities & Costs Grid */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                          <div className="text-center">
                            <span className="block text-[9px] font-semibold text-slate-400 uppercase">Est. Sales</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {capabilities.live_procurement_forecast && item.live_forecast_quantity !== undefined
                                ? formatItemQuantity(item, item.live_forecast_quantity)
                                : "—"}
                            </span>
                          </div>
                          <div className="text-center border-x border-slate-200/50 dark:border-slate-800/50">
                            <span className="block text-[9px] font-semibold text-slate-400 uppercase">Target Stock</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {capabilities.procurement_snapshot && item.frozen_procurement_quantity !== undefined
                                ? formatItemQuantity(item, item.frozen_procurement_quantity)
                                : formatItemQuantity(item, item.required_quantity)}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="block text-[9px] font-semibold text-slate-400 uppercase">Late Orders</span>
                            <span className="text-xs font-extrabold text-indigo-600">
                              {Number(item.late_order_delta) > 0 ? `+${formatItemQuantity(item, item.late_order_delta)}` : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Operational Quantities Inputs / Spans */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Purchased / Committed</label>
                            {expanded ? (
                              <Input
                                type="number"
                                step="0.1"
                                disabled={isClosed || !isAdmin || vendorManaged}
                                className="h-8 text-xs font-bold rounded-lg border-slate-200 shadow-sm"
                                value={draft.purchased_quantity ?? item.purchased_quantity ?? 0}
                                onChange={(e) => handleDraftChange(item.id, "purchased_quantity", e.target.value)}
                              />
                            ) : (
                              <div className="h-8 flex items-center font-extrabold text-slate-900 dark:text-slate-100">
                                {formatItemQuantity(item, item.purchased_quantity)}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Received</label>
                            {expanded ? (
                              <Input
                                type="number"
                                step="0.1"
                                disabled={isClosed || !isAdmin || vendorManaged}
                                className="h-8 text-xs font-bold rounded-lg border-slate-200 shadow-sm"
                                value={draft.received_quantity ?? item.received_quantity ?? 0}
                                onChange={(e) => handleDraftChange(item.id, "received_quantity", e.target.value)}
                              />
                            ) : (
                              <div className="h-8 flex items-center font-extrabold text-slate-900 dark:text-slate-100">
                                {formatItemQuantity(item, item.received_quantity)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delta Quantities (Shortage, Extra, Rejected) */}
                        <div className="grid grid-cols-3 gap-2 py-1 text-center border-t border-b border-slate-100 dark:border-slate-800/80 my-2">
                          <div>
                            <span className="block text-[9px] font-semibold text-slate-400">Shortage</span>
                            <span className={cn("text-xs font-bold", Number(item.shortage_quantity) > 0 ? "text-rose-600 animate-pulse" : "text-slate-400")}>
                              {Number(item.shortage_quantity) > 0 ? formatItemQuantity(item, item.shortage_quantity) : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-semibold text-slate-400">Extra</span>
                            <span className={cn("text-xs font-bold", Number(item.excess_quantity) > 0 ? "text-emerald-600" : "text-slate-400")}>
                              {Number(item.excess_quantity) > 0 ? formatItemQuantity(item, item.excess_quantity) : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-semibold text-slate-400">Rejected</span>
                            <span className={cn("text-xs font-bold", Number(item.rejected_quantity) > 0 ? "text-orange-500 animate-pulse" : "text-slate-400")}>
                              {Number(item.rejected_quantity) > 0 ? formatItemQuantity(item, item.rejected_quantity) : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Costs */}
                        <div className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 block">
                              {vendorManaged ? "Weighted actual price" : "Unit Cost"}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-350">
                              {formatPaiseToRupees(item.unit_cost_paise)} / {itemUnit(item).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-slate-400 block">
                              {vendorManaged ? "Actual accepted cost" : "Total Cost"}
                            </span>
                            <span className="font-extrabold text-slate-950 dark:text-slate-50 text-sm">
                              {formatPaiseToRupees(item.total_cost_paise)}
                            </span>
                          </div>
                        </div>

                        {/* Vendor Allocations */}
                        <div className="space-y-2 border-t border-slate-100 dark:border-slate-900 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Vendor Allocations</span>
                            {vendorAssignments.length === 0 && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/50 shadow-sm dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/65">
                                Unassigned
                              </div>
                            )}
                          </div>

                          {vendorAssignments.length > 0 && (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 thin-scrollbar">
                              {vendorAssignments.map((assignment) => {
                                const checkIn = (attendanceQuery.data || []).find(
                                  (c) =>
                                    String(c.vendor_user_id || c.vendorUserId || "") ===
                                    String(assignment.vendor_user_id || assignment.vendor?.id || "")
                                );
                                const arrivedTime = checkIn
                                  ? formatTime(checkIn.checked_in_at || checkIn.check_in_time || checkIn.created_at || checkIn.time)
                                  : null;
                                const lat = checkIn?.latitude ?? checkIn?.lat;
                                const lng = checkIn?.longitude ?? checkIn?.lng;
                                const hasCoords = checkIn && lat !== undefined && lat !== null && lng !== undefined && lng !== null;

                                return (
                                  <div key={assignment.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-[10px] shadow-sm hover:shadow-md transition-shadow dark:border-slate-800/80 dark:bg-slate-900/30">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                          {assignment.vendor?.vendor_profile?.company_name || assignment.vendor?.full_name || "Vendor"}
                                        </span>
                                        {checkIn && (
                                          <span className="relative group cursor-pointer inline-block">
                                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold dark:bg-emerald-950 dark:text-emerald-300 text-[8px]">
                                              <Check className="h-2 w-2 text-emerald-600 dark:text-emerald-400" />
                                              Arrived {arrivedTime}
                                            </span>
                                            {hasCoords && (
                                              <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-36 p-1.5 bg-slate-900 text-white text-[9px] rounded-lg shadow-lg z-50 transition-all duration-200 ease-in-out border border-slate-700/50 text-center">
                                                <span className="block mb-0.5 font-medium">GPS Location Pin</span>
                                                <a
                                                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-emerald-400 hover:text-emerald-350 font-bold underline flex items-center justify-center gap-0.5"
                                                >
                                                  <MapPin className="h-2.5 w-2.5 inline" /> View Maps
                                                </a>
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <Badge
                                        variant={getVendorAssignmentStatus(assignment.status).variant}
                                        className="px-1.5 py-0.5 text-[9px] font-bold tracking-wide rounded-md shadow-sm"
                                      >
                                        {getVendorAssignmentStatus(assignment.status).label}
                                      </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-500 leading-tight">
                                      <div><span className="text-slate-400">Allocated:</span> <strong className="text-slate-600 dark:text-slate-300">{formatQuantityWithUnit(assignment.allocated_quantity, assignment.procurement_unit || itemUnit(item))}</strong></div>
                                      <div><span className="text-slate-400">Supplied:</span> <strong className="text-slate-600 dark:text-slate-300">{formatQuantityWithUnit(assignment.supplied_quantity, assignment.procurement_unit || itemUnit(item))}</strong></div>
                                      <div><span className="text-slate-400">Locked vendor price:</span> <strong className="text-slate-600 dark:text-slate-300">{formatVendorMoney(assignment.unit_cost_paise)}/{(assignment.procurement_unit || itemUnit(item)).toUpperCase()}</strong></div>
                                      <div><span className="text-slate-400">Price locked:</span> <strong className="text-slate-600 dark:text-slate-300">{formatVendorPriceUpdatedAt(assignment.price_locked_at)}</strong></div>
                                      <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 mt-1 flex justify-between items-center text-[10px]">
                                        <span className="text-slate-400 font-medium">Expected Payout:</span>
                                        <span className="font-extrabold text-slate-850 dark:text-slate-200">
                                          {assignment.unit_cost_paise === null || assignment.unit_cost_paise === undefined
                                            ? "—"
                                            : formatVendorMoney(acceptedPayoutPaise(
                                              Number(assignment.supplied_quantity) > 0
                                                ? assignment.supplied_quantity
                                                : assignment.allocated_quantity ?? "0",
                                              assignment.unit_cost_paise
                                            ))}
                                        </span>
                                      </div>
                                      {assignment.notes && <div className="col-span-2 mt-1 bg-amber-50/50 dark:bg-amber-950/20 p-1 rounded text-slate-600 dark:text-slate-400 italic">Notes: {assignment.notes}</div>}
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        {!isClosed && isAdmin && (
                          <div className="flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-900 pt-3">
                            <div className="flex gap-1.5">
                              {vendorManaged ? (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1 rounded-full bg-emerald-600 px-3 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                                  onClick={() => openVendorCheckIn(item)}
                                  disabled={!actionFlow.canOpenVendorCheckIn}
                                  title={actionFlow.canOpenVendorCheckIn ? "Receive dispatched vendor delivery" : "Vendor must dispatch first"}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Receive Goods
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1 rounded-full border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/80 px-2.5 text-[10px] font-bold text-indigo-700 transition-all hover:scale-[1.03] active:scale-95 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none"
                                    onClick={() => handleShortcutPurchasedExact(item)}
                                    disabled={!actionFlow.canMarkPurchasedExact}
                                    title={actionFlow.purchasedExactReason}
                                  >
                                    <ShoppingCart className="h-3 w-3" /> Pur. Exact
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1 rounded-full border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/80 px-2.5 text-[10px] font-bold text-emerald-700 transition-all hover:scale-[1.03] active:scale-95 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 disabled:opacity-40 disabled:pointer-events-none"
                                    onClick={() => handleShortcutReceivedExact(item)}
                                    disabled={!actionFlow.canMarkReceivedExact}
                                    title={actionFlow.receivedExactReason}
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Rec. Exact
                                  </Button>
                                </>
                              )}
                            </div>

                            <div className="flex gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 rounded-lg p-0 shadow-sm transition-all hover:-translate-y-px hover:shadow-md ${expanded ? "border-slate-300 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "bg-white dark:bg-slate-950"}`}
                                onClick={() => toggleRowExpand(item.id)}
                                disabled={!actionFlow.canEditInline}
                                title={actionFlow.editReason}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 rounded-lg bg-white p-0 text-slate-600 shadow-sm transition-all hover:-translate-y-px hover:shadow-md dark:bg-slate-950 dark:text-slate-300"
                                    title="More procurement actions"
                                    disabled={!actionFlow.canEditDetails && !actionFlow.canAssignVendor}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    className="gap-2 py-2 text-xs font-medium"
                                    onSelect={() => handleOpenEdit(item)}
                                    disabled={!actionFlow.canEditDetails}
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-slate-505" />
                                    Cost & vendor details
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <DropdownMenuItem
                                      className="gap-2 py-2 text-xs font-medium"
                                      onSelect={() => openAssignModal(item)}
                                      disabled={!actionFlow.canAssignVendor}
                                      title={actionFlow.assignReason}
                                    >
                                      <ShoppingCart className="h-3.5 w-3.5 text-slate-505" />
                                      {vendorAssignments.length ? "Edit vendors" : "Assign vendor"}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto thin-scrollbar rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950">
                <table className="w-full min-w-[1760px] table-auto border-separate border-spacing-0 text-xs [&_th]:text-center [&_td]:text-center">
                  <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md dark:bg-slate-900/95">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="w-[220px] min-w-[220px] border-b border-slate-200 px-5 py-4 font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Product & Procurement Type</th>
                      <th className="min-w-[112px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Estimated Sales</th>
                      <th className="min-w-[104px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Target Stock</th>
                      <th className="min-w-[100px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Late Orders</th>
                      <th title="Committed supplied quantity from confirmed, dispatched, or received assignments" className="min-w-[92px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Purchased / committed</th>
                      <th className="min-w-[96px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Received</th>
                      <th className="min-w-[88px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Shortage</th>
                      <th className="min-w-[80px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Extra</th>
                      <th className="min-w-[88px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Rejected</th>
                      <th className="min-w-[104px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Unit Cost</th>
                      <th className="min-w-[108px] border-b border-slate-200 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Total Cost</th>
                      <th className="w-[220px] min-w-[220px] max-w-[220px] border-b border-slate-200 px-4 py-4 font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Vendor Allocations</th>
                      <th className="min-w-[110px] border-b border-slate-200 px-4 py-4 text-center font-bold tracking-wider text-slate-500 uppercase text-[10px] dark:border-slate-800 dark:text-slate-400">Status</th>
                      <th className="sticky right-0 z-30 w-[270px] min-w-[270px] border-b border-l border-slate-200 bg-slate-50/95 px-4 py-4 text-right font-bold tracking-wider text-slate-500 uppercase text-[10px] shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.5)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const draft = bulkDrafts[item.id] || {};
                      const isDirty = Boolean(bulkDrafts[item.id]);
                      const expanded = isRowExpanded(item);
                      const vendorAssignments = getItemAssignments(item);
                      const vendorManaged = isVendorManagedItem(item);
                      const assignmentsLocked =
                        vendorAssignments.length > 0 &&
                        vendorAssignments.some(
                          (assignment) =>
                            ["confirmed", "dispatched", "received"].includes(assignment.status)
                        );
                      const displayStatus = getProcurementDisplayStatus(item, vendorAssignments);
                      const actionFlow = getProcurementActionFlow({
                        item: { ...item, procurement_status: displayStatus },
                        isAdmin,
                        isClosed,
                        isUpdating,
                        vendorManaged,
                        assignmentsLocked,
                        assignments: vendorAssignments,
                      });

                      return (
                        <tr
                          key={item.id}
                          className={`align-middle transition-colors [&>td]:border-b [&>td]:border-slate-100 dark:[&>td]:border-slate-900 ${isDirty ? "bg-amber-50/40 dark:bg-amber-950/20" : "hover:bg-slate-50/70 dark:hover:bg-slate-900/30"
                            }`}
                        >
                          <td className="min-w-[220px] px-5 py-3.5">
                            <div className="mx-auto flex max-w-[210px] flex-col items-center">
                              <div
                                className="max-w-full truncate text-[13px] font-extrabold tracking-[-0.01em] text-slate-950 dark:text-white"
                                title={item.product_name || item.product?.name || "—"}
                              >
                                {item.product_name || item.product?.name || "—"}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                                <Badge
                                  variant={itemMode(item) === "bulk" ? "success" : "outline"}
                                  className="h-5 rounded-full px-2 text-[9px] font-bold"
                                >
                                  {itemMode(item) === "bulk" ? "Bulk purchase" : "Retail pack"}
                                </Badge>
                                {vendorManaged ? (
                                  <Badge
                                    variant="secondary"
                                    className="h-5 rounded-full px-2 text-[9px] font-bold"
                                  >
                                    Vendor managed
                                  </Badge>
                                ) : null}
                                {item.has_unlocked_orders ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 rounded-full border-amber-200 bg-amber-50 px-2 text-[9px] font-bold text-amber-700 gap-1 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                                  >
                                    <Lock className="h-2.5 w-2.5" />
                                    Unlocked orders
                                  </Badge>
                                ) : null}
                              </div>
                              <div
                                className="mt-1.5 max-w-full truncate rounded-md bg-slate-100/80 px-2 py-1 text-[9px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                                title={
                                  itemMode(item) === "bulk"
                                    ? (item.ordered_packs || `Product-level · ${itemUnit(item).toUpperCase()}`)
                                    : (item.pack_label || item.pack?.pack_label || "Pack")
                                }
                              >
                                {itemMode(item) === "bulk"
                                  ? (item.ordered_packs || `Product-level · ${itemUnit(item).toUpperCase()}`)
                                  : (item.pack_label || item.pack?.pack_label || "Pack")}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300 font-semibold">
                            {capabilities.live_procurement_forecast && item.live_forecast_quantity !== undefined
                              ? formatItemQuantity(item, item.live_forecast_quantity)
                              : "—"}
                          </td>

                          <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300 font-semibold">
                            {capabilities.procurement_snapshot && item.frozen_procurement_quantity !== undefined
                              ? formatItemQuantity(item, item.frozen_procurement_quantity)
                              : formatItemQuantity(item, item.required_quantity)}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-indigo-600">
                            {Number(item.late_order_delta) > 0 ? `+${formatItemQuantity(item, item.late_order_delta)}` : "—"}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {expanded ? (
                              <Input
                                type="number"
                                step="0.1"
                                disabled={isClosed || !isAdmin || vendorManaged}
                                className="mx-auto h-7 w-16 rounded-md text-center text-xs"
                                value={draft.purchased_quantity ?? item.purchased_quantity ?? 0}
                                onChange={(e) => handleDraftChange(item.id, "purchased_quantity", e.target.value)}
                              />
                            ) : (
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatItemQuantity(item, item.purchased_quantity)}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {expanded ? (
                              <Input
                                type="number"
                                step="0.1"
                                disabled={isClosed || !isAdmin || vendorManaged}
                                className="mx-auto h-7 w-16 rounded-md text-center text-xs"
                                value={draft.received_quantity ?? item.received_quantity ?? 0}
                                onChange={(e) => handleDraftChange(item.id, "received_quantity", e.target.value)}
                              />
                            ) : (
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatItemQuantity(item, item.received_quantity)}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-rose-600">
                            {Number(item.shortage_quantity) > 0 ? formatItemQuantity(item, item.shortage_quantity) : "—"}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-emerald-600">
                            {Number(item.excess_quantity) > 0 ? formatItemQuantity(item, item.excess_quantity) : "—"}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-orange-600">
                            {Number(item.rejected_quantity) > 0 ? formatItemQuantity(item, item.rejected_quantity) : "—"}
                          </td>

                          <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-400">
                            {formatPaiseToRupees(item.unit_cost_paise)} / {itemUnit(item).toUpperCase()}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">
                            {formatPaiseToRupees(item.total_cost_paise)}
                          </td>

                          <td className="w-[220px] min-w-[220px] max-w-[220px] px-4 py-3">
                            {vendorAssignments.length ? (
                              <VendorAllocationsMenu
                                assignments={vendorAssignments}
                                attendance={attendanceQuery.data || []}
                                fallbackUnit={itemUnit(item)}
                              />
                            ) : (
                              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:border-amber-900/65 dark:bg-amber-950/40 dark:text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Unassigned
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <StatusBadge value={displayStatus} />
                          </td>

                          <td className={`sticky right-0 w-[270px] min-w-[270px] border-l border-slate-100 px-4 py-4 text-right shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.35)] dark:border-slate-800 ${isDirty ? "bg-amber-50 dark:bg-amber-950" : "bg-white dark:bg-slate-950"
                            }`}>
                            {!isClosed && isAdmin && (
                              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                {vendorManaged ? (
                                  <Button
                                    size="sm"
                                    className="h-8 gap-1 rounded-full bg-emerald-600 px-3 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                                    onClick={() => openVendorCheckIn(item)}
                                    disabled={!actionFlow.canOpenVendorCheckIn}
                                    title={actionFlow.canOpenVendorCheckIn ? "Receive dispatched vendor delivery" : "Vendor must dispatch first"}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Receive Goods
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 rounded-full border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/80 px-2.5 text-[10px] font-bold text-indigo-700 transition-all hover:scale-[1.03] active:scale-95 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none"
                                      onClick={() => handleShortcutPurchasedExact(item)}
                                      disabled={!actionFlow.canMarkPurchasedExact}
                                      title={actionFlow.purchasedExactReason}
                                    >
                                      <ShoppingCart className="h-3 w-3" />
                                      Pur. Exact
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 rounded-full border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/80 px-2.5 text-[10px] font-bold text-emerald-700 transition-all hover:scale-[1.03] active:scale-95 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 disabled:opacity-40 disabled:pointer-events-none"
                                      onClick={() => handleShortcutReceivedExact(item)}
                                      disabled={!actionFlow.canMarkReceivedExact}
                                      title={actionFlow.receivedExactReason}
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Rec. Exact
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-8 w-8 rounded-lg p-0 shadow-sm transition-all hover:-translate-y-px hover:shadow-md ${expanded ? "border-slate-300 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "bg-white dark:bg-slate-950"}`}
                                  onClick={() => toggleRowExpand(item.id)}
                                  disabled={!actionFlow.canEditInline}
                                  title={actionFlow.editReason}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 rounded-lg bg-white p-0 text-slate-600 shadow-sm transition-all hover:-translate-y-px hover:shadow-md dark:bg-slate-950 dark:text-slate-300"
                                      title="More procurement actions"
                                      disabled={!actionFlow.canEditDetails && !actionFlow.canAssignVendor}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      className="gap-2 py-2 text-xs font-medium"
                                      onSelect={() => handleOpenEdit(item)}
                                      disabled={!actionFlow.canEditDetails}
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                      Cost & vendor details
                                    </DropdownMenuItem>
                                    {isAdmin && (
                                      <DropdownMenuItem
                                        className="gap-2 py-2 text-xs font-medium"
                                        onSelect={() => openAssignModal(item)}
                                        disabled={!actionFlow.canAssignVendor}
                                        title={actionFlow.assignReason}
                                      >
                                        <ShoppingCart className="h-3.5 w-3.5 text-slate-500" />
                                        {vendorAssignments.length ? "Edit vendors" : "Assign vendor"}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs gap-1.5 text-dailyveg-700 border-dailyveg-200 hover:bg-dailyveg-50 hover:text-dailyveg-800 shadow-sm transition-all hover:scale-[1.02]"
                onClick={() => {
                  setActivePrintSheet("buyer");
                  setTimeout(() => window.print(), 100);
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Download Purchase PDF
              </Button>
            </div>
          </div>
        )}
      </>)}

      {/* Edit Item Modal */}
      {editingItem && (
        <Dialog open={Boolean(editingItem)} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Procurement Entry</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border">
                <p className="font-semibold text-sm text-slate-900 dark:text-white">
                  {editingItem.product_name || editingItem.product?.name}
                </p>
                <p className="text-slate-500">{editingItem.pack_label || editingItem.pack?.pack_label}</p>
              </div>
              {isVendorManagedItem(editingItem) ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Vendor-managed quantities and costs are derived from locked assignments and Vendor Check-In receipts.
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Required Qty</Label>
                  <Input type="number" step="0.001" disabled value={editForm.required_quantity} />
                </div>
                <div>
                  <Label className="text-xs">Purchased Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editForm.purchased_quantity}
                    disabled={isVendorManagedItem(editingItem)}
                    onChange={(e) => setEditForm({ ...editForm, purchased_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Received Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editForm.received_quantity}
                    disabled={isVendorManagedItem(editingItem)}
                    onChange={(e) => setEditForm({ ...editForm, received_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rejected Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editForm.rejected_quantity}
                    disabled={isVendorManagedItem(editingItem)}
                    onChange={(e) => setEditForm({ ...editForm, rejected_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Waste Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editForm.waste_quantity}
                    onChange={(e) => setEditForm({ ...editForm, waste_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <PremiumSelect
                    value={editForm.procurement_status}
                    isDisabled={isVendorManagedItem(editingItem)}
                    onChange={(val) => setEditForm({ ...editForm, procurement_status: val })}
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "partial", label: "Partial" },
                      { value: "completed", label: "Completed" },
                      { value: "issue", label: "Issue" },
                      { value: "not_required", label: "Not Required" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Unit Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 25.50"
                    value={editForm.unit_cost_rupees}
                    disabled={isVendorManagedItem(editingItem)}
                    onChange={(e) => setEditForm({ ...editForm, unit_cost_rupees: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Total Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 500.00"
                    value={editForm.total_cost_rupees}
                    disabled={isVendorManagedItem(editingItem)}
                    onChange={(e) => setEditForm({ ...editForm, total_cost_rupees: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Vendor Name</Label>
                  <Input
                    placeholder="Vendor Name"
                    value={editForm.vendor_name}
                    disabled={isVendorManagedItem(editingItem)}
                    onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Bill Reference</Label>
                  <Input
                    placeholder="Bill / Invoice #"
                    value={editForm.bill_reference}
                    disabled={isVendorManagedItem(editingItem)}
                    onChange={(e) => setEditForm({ ...editForm, bill_reference: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  placeholder="Procurement notes..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveItem} disabled={isUpdating}>
                  Save Details
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {assigningItem && (
        <Dialog open onOpenChange={(open) => !open && setAssigningItem(null)}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Vendors</DialogTitle>
            </DialogHeader>
            <div className="rounded-xl border bg-slate-50 p-3 dark:bg-slate-900">
              <p className="font-semibold">{assigningItem.product_name || assigningItem.product?.name || "Product"}</p>
              <p className="text-sm text-slate-500">
                {itemMode(assigningItem) === "bulk"
                  ? `Product-level bulk supply · ${itemUnit(assigningItem).toUpperCase()}`
                  : (assigningItem.pack_label || assigningItem.pack?.pack_label || "Pack")}
              </p>
              <p className="text-sm text-slate-500">
                Total required quantity:{" "}
                <strong>{formatProcurementQuantity(assigningItem, assigningItem.required_quantity)}</strong>{" "}
                · Still to assign:{" "}
                <strong>
                  {formatProcurementQuantity(
                    assigningItem,
                    formatScaledQuantity(
                      assigningItem.is_product_group
                        ? parseQuantityScaled(assigningItem.unassigned_quantity || "0")
                        : remainingForItem(assigningItem)
                    )
                  )}
                </strong>{" "}
                · Max allowed (incl. 25% extra):{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {formatProcurementQuantity(
                    assigningItem,
                    formatScaledQuantity(
                      (parseQuantityScaled(assigningItem.required_quantity || "0") * 125n) / 100n
                    )
                  )}
                </strong>
              </p>
            </div>

            {completedAssignments.length > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">
                  Previously Completed Cycles (Immutable)
                </p>
                <div className="space-y-1.5">
                  {completedAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-350">
                      <span className="font-medium">{assignment.vendor?.company_name || "Unknown Vendor"}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100/70 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">
                          {assignment.status}
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          {formatProcurementQuantity(assigningItem, assignment.allocated_quantity)}
                        </strong>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-blue-200/50 dark:border-blue-900/30 pt-1.5 mt-1.5 flex justify-between items-center text-xs font-bold text-blue-900 dark:text-blue-300">
                    <span>Total Completed:</span>
                    <span>{formatProcurementQuantity(assigningItem, formatScaledQuantity(completedTotal))}</span>
                  </div>
                </div>
              </div>
            )}

            {activeAssignments.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2">
                  Active Assignments (Pending Vendor Confirmation)
                </p>
                <div className="space-y-1.5">
                  {activeAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-350">
                      <span className="font-medium">{assignment.vendor?.company_name || "Unknown Vendor"}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-350 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">
                          {assignment.status}
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          {formatProcurementQuantity(assigningItem, assignment.allocated_quantity)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {allocationRows.map((row, index) => {
                const selectedElsewhere = new Set(
                  allocationRows
                    .filter((_, otherIndex) => otherIndex !== index)
                    .map((entry) => entry.vendor_user_id)
                    .filter(Boolean)
                );
                const matches = getMatchingVendorOptions(assigningItem).filter(
                  (match) => !selectedElsewhere.has(match.vendorUserId)
                );
                const options = matches.map((match) => ({
                  value: match.vendorUserId,
                  label: `${match.vendor.company_name} — min ${formatQuantityWithUnit(match.minimumQuantity, itemUnit(assigningItem))}, max ${match.maximumQuantity === null ? "unlimited" : formatQuantityWithUnit(match.maximumQuantity, itemUnit(assigningItem))
                    }, ${match.leadTimeHours}h · vendor price ${formatVendorMoney(match.vendorUnitCostPaise)}/${itemUnit(assigningItem).toUpperCase()}`,
                }));
                const selectedMatch = matches.find(
                  (match) => match.vendorUserId === row.vendor_user_id
                );
                return (
                  <div key={index} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[2fr_1fr_1.5fr_auto] md:items-end">
                    <div>
                      <Label className="text-xs">Vendor</Label>
                      <PremiumSelect
                        size="sm"
                        value={row.vendor_user_id}
                        onChange={(value) =>
                          setAllocationRows((rows) =>
                            rows.map((entry, rowIndex) =>
                              rowIndex === index ? { ...entry, vendor_user_id: value } : entry
                            )
                          )
                        }
                        options={options}
                        placeholder={vendorCataloguesQuery.isLoading ? "Loading matching vendors…" : "Select vendor"}
                        isDisabled={vendorCataloguesQuery.isLoading || vendorCataloguesQuery.isError}
                      />
                      {selectedMatch && (
                        <p className="mt-1 text-[10px] text-slate-500">
                          Allowed {formatQuantityWithUnit(selectedMatch.minimumQuantity, itemUnit(assigningItem))}–{selectedMatch.maximumQuantity === null ? "Unlimited" : formatQuantityWithUnit(selectedMatch.maximumQuantity, itemUnit(assigningItem))} · Lead {selectedMatch.leadTimeHours}h
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Allocated quantity ({itemUnit(assigningItem).toUpperCase()})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={row.allocated_quantity}
                        onChange={(event) =>
                          setAllocationRows((rows) =>
                            rows.map((entry, rowIndex) =>
                              rowIndex === index ? { ...entry, allocated_quantity: event.target.value } : entry
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Notes (optional)</Label>
                      <Input
                        value={row.notes}
                        onChange={(event) =>
                          setAllocationRows((rows) =>
                            rows.map((entry, rowIndex) =>
                              rowIndex === index ? { ...entry, notes: event.target.value } : entry
                            )
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      disabled={allocationRows.length === 1}
                      onClick={() => setAllocationRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {vendorCataloguesQuery.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Matching vendor catalogues could not be loaded.
                <Button variant="outline" size="sm" className="ml-3" onClick={() => vendorCataloguesQuery.refetch()}>
                  Retry
                </Button>
              </div>
            )}
            {!vendorCataloguesQuery.isLoading &&
              !vendorCataloguesQuery.isError &&
              getMatchingVendorOptions(assigningItem).length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  No eligible vendor has an active mapping and a price greater than ₹0 for this product.
                </div>
              )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => setAllocationRows((rows) => [...rows, emptyAllocation()])}>
                  <Plus className="mr-2 h-4 w-4" /> Add vendor
                </Button>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <div>
                    Previously completed:{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatProcurementQuantity(assigningItem, formatScaledQuantity(completedTotal))}
                    </strong>
                  </div>
                  <div>
                    New allocation:{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatProcurementQuantity(
                        assigningItem,
                        formatScaledQuantity(
                          allocationRows.every((row) => row.allocated_quantity && /^\d+(?:\.\d{1,3})?$/.test(row.allocated_quantity))
                            ? addQuantities(allocationRows.map((row) => row.allocated_quantity))
                            : 0n
                        )
                      )}
                    </strong>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-1 mt-1 font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <span>Total coverage:</span>
                    <span>
                      {formatProcurementQuantity(
                        assigningItem,
                        formatScaledQuantity(
                          completedTotal +
                          (allocationRows.every((row) => row.allocated_quantity && /^\d+(?:\.\d{1,3})?$/.test(row.allocated_quantity))
                            ? addQuantities(allocationRows.map((row) => row.allocated_quantity))
                            : 0n)
                        )
                      )}
                    </span>
                    <span>/ {formatProcurementQuantity(assigningItem, assigningItem.required_quantity)}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    Max allowed allocation (incl. 25% extra):{" "}
                    <strong>
                      {formatProcurementQuantity(
                        assigningItem,
                        formatScaledQuantity(
                          (parseQuantityScaled(assigningItem.required_quantity || "0") * 125n) / 100n
                        )
                      )}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAssigningItem(null)}>Cancel</Button>
                <Button
                  onClick={submitAssignments}
                  disabled={
                    assignMutation.isPending ||
                    vendorCataloguesQuery.isLoading ||
                    vendorCataloguesQuery.isError ||
                    getMatchingVendorOptions(assigningItem).length === 0
                  }
                >
                  {assignMutation.isPending ? "Saving…" : "Save assignments"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <ConfirmDialog
        open={confirmAutoAssign}
        onOpenChange={setConfirmAutoAssign}
        title="Auto-assign vendors?"
        description={`${autoAssignableIds.length} purchase-pending product${autoAssignableIds.length === 1 ? "" : "s"} will be matched by product and procurement unit, then allocated by price, lead time, and available capacity. Completed and already assigned products will not be included.`}
        confirmText="Run auto-assignment"
        onConfirm={async () => {
          try {
            await autoAssignMutation.mutateAsync();
          } catch {
            // Mutation toast already provides the backend error.
          }
        }}
      />
      {autoAssignResult && (
        <Dialog open onOpenChange={(open) => !open && setAutoAssignResult(null)}>
          <DialogContent className="max-h-[98vh] max-w-3xl overflow-hidden border-0 p-0 flex flex-col">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-emerald-950 px-6 py-6 text-white shrink-0">
              <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-xl backdrop-blur">
                  <Cpu className="h-6 w-6 text-indigo-200" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Smart vendor allocation</div>
                  <DialogHeader className="mt-2 text-left">
                    <DialogTitle className="text-2xl text-white">Automatic assignment results</DialogTitle>
                  </DialogHeader>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    Product identity, supply unit, delivery lead time, catalogue price, and capacity were checked in that order.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 px-6 pb-6 pt-5 thin-scrollbar">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Checked", value: autoAssignResult.summary?.evaluated_items ?? 0, tone: "slate" },
                  { label: "New assignments", value: autoAssignResult.summary?.created_assignments ?? autoAssignResult.assignments?.length ?? 0, tone: "emerald" },
                  { label: "Already covered", value: autoAssignResult.summary?.already_fully_allocated ?? 0, tone: "indigo" },
                  { label: "Needs attention", value: autoAssignResult.summary?.attention_required ?? autoAssignResult.unassigned?.length ?? 0, tone: "amber" },
                ].map((metric) => (
                  <div key={metric.label} className={cn(
                    "rounded-2xl border p-3.5",
                    metric.tone === "emerald" && "border-emerald-100 bg-emerald-50 dark:border-emerald-950 dark:bg-emerald-950/20",
                    metric.tone === "indigo" && "border-indigo-100 bg-indigo-50 dark:border-indigo-950 dark:bg-indigo-950/20",
                    metric.tone === "amber" && "border-amber-100 bg-amber-50 dark:border-amber-950 dark:bg-amber-950/20",
                    metric.tone === "slate" && "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                  )}>
                    <div className="text-2xl font-black text-slate-950 dark:text-white">{metric.value}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</div>
                  </div>
                ))}
              </div>

              {(autoAssignResult.unassigned || []).length ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Items needing attention</p>
                      <p className="mt-0.5 text-xs text-slate-500">Resolve the first failing eligibility rule shown for each item.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/admin/vendors")}>
                      <Store className="mr-1.5 h-4 w-4" />
                      Manage vendor capacity
                    </Button>
                  </div>
                  {(autoAssignResult.unassigned || []).some(
                    (entry) => entry.reason === "insufficient_vendor_capacity"
                  ) ? (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200">
                      <strong className="block">The matching vendors are configured below the quantity still needed.</strong>
                      Open vendor capacity, increase the maximum quantity for these products or add another available vendor, save it, and run Auto Assign again. Already received stock remains completed and will not be assigned again.
                    </div>
                  ) : null}
                  <div className="max-h-[320px] overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 thin-scrollbar">
                    <table className="w-full min-w-[650px] text-left text-sm relative">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Remaining</th>
                          <th className="px-4 py-3">Unit check</th>
                          <th className="px-4 py-3">Next action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {autoAssignResult.unassigned.map((entry) => {
                          const procurementItem = items.find((item) =>
                            String(item.procurement_cost_id || item.id) === String(entry.procurement_cost_id)
                          );
                          const requiredUnit = String(entry.procurement_unit || itemUnit(procurementItem || {})).toUpperCase();
                          const vendorUnits = (entry.available_vendor_units || []).map((unit) => String(unit).toUpperCase());
                          return (
                            <tr key={entry.procurement_cost_id} className="align-top">
                              <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{entry.product_name || "Product"}</td>
                              <td className="px-4 py-3.5 font-semibold">
                                {procurementItem
                                  ? formatItemQuantity(procurementItem, entry.remaining_quantity)
                                  : formatQuantityWithUnit(entry.remaining_quantity, entry.procurement_unit || "pack")}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant="outline">Needs {requiredUnit}</Badge>
                                  {vendorUnits.length ? (
                                    <>
                                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                      <Badge variant={entry.reason === "vendor_procurement_unit_mismatch" ? "danger" : "secondary"}>
                                        Vendor {vendorUnits.join(", ")}
                                      </Badge>
                                    </>
                                  ) : (
                                    <span className="text-xs text-slate-400">No catalogue unit</span>
                                  )}
                                </div>
                              </td>
                              <td className="max-w-[280px] px-4 py-3.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                {AUTO_ASSIGNMENT_REASONS[entry.reason] || String(entry.reason || "Unknown reason").replaceAll("_", " ")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-900 dark:text-emerald-200">All procurement demand is covered</p>
                    <p className="mt-1 text-sm text-emerald-800/75 dark:text-emerald-300/75">
                      New assignments were created where needed; existing valid vendor allocations were left unchanged.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setAutoAssignResult(null)}>Done</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
