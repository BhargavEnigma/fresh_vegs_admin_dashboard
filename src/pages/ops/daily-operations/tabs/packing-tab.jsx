import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PremiumWorkspaceHelper } from "../../../../components/common/premium-workspace-helper";
import { Link, useNavigate } from "react-router-dom";
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  CheckSquare,
  Printer,
  ExternalLink,
  Search,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  Cpu,
  RefreshCw,
  Building2,
  Eye,
  Loader2,
  MapPin,
} from "lucide-react";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { StatusBadge } from "../../../../components/common/status-badge";
import { Badge } from "../../../../components/ui/badge";
import { useToast } from "../../../../components/toast/toast-context";
import {
  groupPackingItemsByOrder,
  orderedPackForPackingItem,
  isPackingGroupExactlyPacked,
  mapErrorCodeToUserMessage,
  parseDecimal,
} from "../../../../utils/daily-operations-helpers";
import { ProductAvatar } from "../../../../components/common/product-avatar";
import { normalizeAutomationCapabilities, findOrderForPacking } from "../../../../utils/daily-operations-normalizers";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../../utils/order-identifier";
import { formatQuantity } from "../../../../lib/utils";
import { BatchPackingSlipsPrint, PackingSlipPrint } from "../print/packing-slip-print";
import { VendorService } from "../../../../api/services/vendor.service";
import { useDailyOperationsPackingPlan } from "../../../../api/services/daily-operations.hooks";
import {
  formatQuantityWithUnit,
  formatVendorMoney,
  getVendorAssignmentStatus,
} from "../../../../utils/vendor-assignment";

function formatPackingOrderAddress(order = {}) {
  const address = order.address || order.delivery_address || {};
  const parts = [
    address.address_line1 || order.delivery_address_line1,
    address.address_line2 || order.delivery_address_line2,
    address.landmark || order.delivery_landmark,
    address.area || order.delivery_area,
    address.city || order.delivery_city,
    address.state || order.delivery_state,
    address.pincode || order.delivery_pincode,
  ];

  return [...new Set(parts.filter(Boolean).map((part) => String(part).trim()).filter(Boolean))].join(", ");
}

function deliveryLocation(order = {}) {
  const address = order.address || order.delivery_address || {};
  return {
    area: address.area || order.delivery_area || "",
    city: address.city || order.delivery_city || "",
    pincode: address.pincode || order.delivery_pincode || "",
    lat: Number(address.lat ?? address.latitude ?? order.delivery_lat ?? order.latitude ?? order.lat),
    lng: Number(address.lng ?? address.longitude ?? order.delivery_lng ?? order.longitude ?? order.lng),
  };
}

function distanceKm(from, to) {
  if (![from.lat, from.lng, to.lat, to.lng].every(Number.isFinite)) return null;
  const radians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDifference = radians(to.lat - from.lat);
  const lngDifference = radians(to.lng - from.lng);
  const calculation = Math.sin(latDifference / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDifference / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));
}

// This is a display-only packing aid. It never changes orders, routes, or assignments.
function groupOrdersForPacking(orderGroups, ordersById) {
  const groups = [];
  const maxOrdersPerGroup = 5;
  const nearbyRadiusKm = 2.5;

  orderGroups.forEach((orderGroup) => {
    const order = { ...(orderGroup.order || {}), ...(ordersById.get(orderGroup.order_id) || {}) };
    const location = deliveryLocation(order);
    const localityKey = [location.area, location.city, location.pincode]
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");

    const matchingGroup = groups.find((candidate) => {
      if (candidate.orders.length >= maxOrdersPerGroup) return false;
      if (Number.isFinite(location.lat) && Number.isFinite(location.lng) && candidate.center) {
        return candidate.orders.every((existingGroup) => {
          const existingOrder = { ...(existingGroup.order || {}), ...(ordersById.get(existingGroup.order_id) || {}) };
          const existingLocation = deliveryLocation(existingOrder);
          return distanceKm(location, existingLocation) <= nearbyRadiusKm;
        });
      }
      return localityKey && localityKey === candidate.localityKey;
    });

    const target = matchingGroup || {
      id: `${localityKey || orderGroup.order_id}-${groups.length + 1}`,
      localityKey,
      label: [location.area, location.city].filter(Boolean).join(", ") || "Address needs review",
      usesCoordinates: Number.isFinite(location.lat) && Number.isFinite(location.lng),
      center: Number.isFinite(location.lat) && Number.isFinite(location.lng) ? location : null,
      orders: [],
    };

    if (!matchingGroup) groups.push(target);
    target.orders.push(orderGroup);
    if (target.center && Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
      const count = target.orders.length;
      target.center = {
        lat: ((target.center.lat * (count - 1)) + location.lat) / count,
        lng: ((target.center.lng * (count - 1)) + location.lng) / count,
      };
    }
  });

  return groups;
}

export function PackingTab({
  packingData,
  isLoading,
  operation,
  isClosed,
  isAdmin,
  opsOrders = [],
  onStartPacking,
  onUpdatePackingItem,
  onCompletePacking,
  onConfirmCleanPacking,
  isStarting,
  isUpdatingItem,
  isCompleting,
  isConfirmingClean,
  capabilitiesRaw,
}) {
  const toast = useToast();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activePackingStage, setActivePackingStage] = useState("ready");
  const [showNearbyGroups, setShowNearbyGroups] = useState(true);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);

  const capabilities = useMemo(() => {
    return normalizeAutomationCapabilities(capabilitiesRaw || operation?.automation_capabilities);
  }, [capabilitiesRaw, operation]);

  // Keep scanner input focused
  const scanInputRef = useRef(null);
  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);

  // Print slip state
  const [printingGroup, setPrintingGroup] = useState(null);
  const [batchPrintingGroups, setBatchPrintingGroups] = useState([]);

  // Item edit / Report Exception dialog
  const [editingPackingItem, setEditingPackingItem] = useState(null);
  const [isReportingException, setIsReportingException] = useState(false);
  const [itemForm, setItemForm] = useState({});

  // Complete packing dialog
  const [completingGroup, setCompletingGroup] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");

  const flatItems = packingData?.items || packingData || [];
  const orderGroups = useMemo(() => groupPackingItemsByOrder(flatItems), [flatItems]);
  const editingPack = useMemo(
    () => orderedPackForPackingItem(editingPackingItem),
    [editingPackingItem],
  );

  const vendorAssignmentsQuery = useQuery({
    queryKey: ["admin", "vendorAssignments", operation?.id, "child"],
    queryFn: () => VendorService.getAssignments(operation.id, { logical: false }),
    enabled: Boolean(operation?.id),
    staleTime: 30 * 1000,
  });
  const packingPlanQuery = useDailyOperationsPackingPlan(operation?.id, {
    enabled: Boolean(operation?.id && !isClosed),
  });

  const vendorAssignmentsForItem = (item) => {
    const embedded = item.vendor_assignments || item.assignments || [];
    const allAssignments = embedded.length ? embedded : (vendorAssignmentsQuery.data || []);
    const procurementCostId = item.procurement_cost_id || item.procurement?.id;
    const productId = item.product_id || item.product?.id;
    const packId = item.pack_id || item.pack?.id || item.product_pack_id;

    return allAssignments.filter((assignment) => {
      if (["cancelled", "rejected"].includes(String(assignment.status).toLowerCase())) return false;
      if (procurementCostId && assignment.procurement_cost_id) {
        return String(assignment.procurement_cost_id) === String(procurementCostId);
      }
      const assignmentProductId = assignment.product_id || assignment.product?.id;
      if (!productId || String(assignmentProductId) !== String(productId)) return false;
      const assignmentPackId = assignment.pack_id || assignment.pack?.id || assignment.product_pack_id;
      return assignment.procurement_mode === "bulk" || !assignmentPackId || !packId || String(assignmentPackId) === String(packId);
    });
  };

  const vendorName = (assignment) =>
    assignment?.vendor?.vendor_profile?.company_name ||
    assignment?.vendor?.company_name ||
    assignment?.vendor?.full_name ||
    assignment?.vendor_name ||
    "Assigned vendor";

  // Create lookup for ops orders by ID to enrich details
  const opsOrdersMap = useMemo(() => {
    const map = new Map();
    (opsOrders || []).forEach((o) => map.set(o.id, o));
    return map;
  }, [opsOrders]);

  // Search Submit
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    const matched = findOrderForPacking(orderGroups, searchTerm);
    if (matched) {
      const matchedStage = ["ready", "inProgress", "exceptions", "packed"].find((stage) =>
        queues[stage].some((group) => group.order_id === matched.order_id),
      );
      if (matchedStage) setActivePackingStage(matchedStage);
      setExpandedOrderId(matched.order_id);
      setSearchTerm("");
      toast.success(`Matched Order: ${getPrimaryOrderLabel(matched.order) || matched.order_id}`);
      if (scanInputRef.current) scanInputRef.current.focus();
    } else {
      toast.error("No order matching barcode or code was found.");
    }
  };

  // Filter groups
  const filteredGroups = useMemo(() => {
    return orderGroups;
  }, [orderGroups]);

  // Group into queues
  const queues = useMemo(() => {
    const ready = [];
    const inProgress = [];
    const exceptions = [];
    const packed = [];

    filteredGroups.forEach((group) => {
      const opsOrder = opsOrdersMap.get(group.order_id) || {};
      const status = String(group.order?.status || opsOrder.status || "").toLowerCase();
      
      const isStatusPacked = ["packed", "out_for_delivery", "delivered", "delivery_failed"].includes(status);
      const hasIssue = group.issue_count > 0 || status === "issue" || status === "failed";

      if (isStatusPacked) {
        packed.push(group);
      } else if (hasIssue) {
        exceptions.push(group);
      } else if (group.progress_percent > 0 && group.progress_percent < 100) {
        inProgress.push(group);
      } else {
        ready.push(group);
      }
    });

    return { ready, inProgress, exceptions, packed };
  }, [filteredGroups, opsOrdersMap]);

  const packingStages = [
    { key: "ready", label: "Ready to Pack", icon: Box, count: queues.ready.length },
    { key: "inProgress", label: "In Progress", icon: RefreshCw, count: queues.inProgress.length },
    { key: "exceptions", label: "Exceptions", icon: AlertTriangle, count: queues.exceptions.length },
    { key: "packed", label: "Packed & Verified", icon: CheckCircle2, count: queues.packed.length },
  ];

  const handleStart = async (orderId) => {
    try {
      await onStartPacking(orderId);
      toast.success("Packing started for order");
    } catch (err) {
      toast.error(err?.message || "Failed to start packing");
    }
  };

  const handleCleanConfirm = async (orderId) => {
    try {
      setConfirmingOrderId(orderId);
      await onConfirmCleanPacking(orderId);
      toast.success("Clean packing confirmed for order");
      setExpandedOrderId(null);
    } catch (err) {
      toast.error("Packing could not be finalized", mapErrorCodeToUserMessage(err));
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleOpenEditItem = (item, group, isException = false) => {
    setEditingPackingItem({ ...item, group });
    setIsReportingException(isException);
    setItemForm({
      packed_quantity: item.packed_quantity ?? 0,
      missing_quantity: item.missing_quantity ?? 0,
      damaged_quantity: item.damaged_quantity ?? 0,
      note: item.note || "",
    });
  };

  const handleSavePackingItem = async () => {
    if (!editingPackingItem) return;

    const payload = {
      packed_quantity: parseDecimal(itemForm.packed_quantity),
      missing_quantity: parseDecimal(itemForm.missing_quantity),
      damaged_quantity: parseDecimal(itemForm.damaged_quantity),
      note: itemForm.note || null,
    };

    try {
      await onUpdatePackingItem({
        orderId: editingPackingItem.order_id || editingPackingItem.group.order_id,
        packingItemId: editingPackingItem.id,
        payload,
      });
      toast.success("Packing item updated");
      setEditingPackingItem(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update packing item");
    }
  };

  const handlePackedExactShortcut = (item, group) => {
    const targetQty = item.ordered_quantity ?? item.required_quantity ?? 1;
    onUpdatePackingItem({
      orderId: item.order_id || group.order_id,
      packingItemId: item.id,
      payload: {
        packed_quantity: parseDecimal(targetQty),
        missing_quantity: 0,
        damaged_quantity: 0,
        note: item.note || null,
      },
    });
  };

  const handleCompleteOrder = async () => {
    if (!completingGroup) return;

    try {
      await onCompletePacking({
        orderId: completingGroup.order_id,
        payload: {
          override_reason: overrideReason ? overrideReason.trim() : null,
        },
      });
      toast.success("Order packing completed!");
      setCompletingGroup(null);
      setOverrideReason("");
    } catch (err) {
      toast.error(err?.message || "Failed to complete packing");
    }
  };

  const handlePrintSlip = (group) => {
    setPrintingGroup(group);
    setBatchPrintingGroups([]);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleBatchPrint = () => {
    // This is an operational pack list, so it must include every order for the
    // selected day: ready, in progress, exception, and already packed.
    if (orderGroups.length === 0) {
      toast.info("No packing orders are available to print.");
      return;
    }
    setBatchPrintingGroups(orderGroups);
    setPrintingGroup(null);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const renderOrderCard = (group) => {
    const order = group.order || {};
    const opsOrder = opsOrdersMap.get(group.order_id) || {};
    const isExpanded = expandedOrderId === group.order_id;
    const status = String(order.status || opsOrder.status || "").toLowerCase();
    const dailyLabel = getDailyOrderLabel(order) || getDailyOrderLabel(opsOrder);
    const primaryLabel = getPrimaryOrderLabel(order) || getPrimaryOrderLabel(opsOrder) || group.order_id;
    const deliveryAddress = formatPackingOrderAddress({ ...order, ...opsOrder });
    const itemVendorAssignments = new Map(
      group.items.map((item) => [item.id, vendorAssignmentsForItem(item)]),
    );
    const showVendorColumn = Array.from(itemVendorAssignments.values()).some((assignments) => assignments.length > 0);

    // Check if there is an issue status
    const hasIssue = group.issue_count > 0 || status === "issue";
    const isChecklistExactlyPacked = isPackingGroupExactlyPacked(group);

    // Style card dynamic colors based on state
    let cardAccentBorder = "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-dailyveg-300 dark:hover:border-dailyveg-800 shadow-[0_2px_8px_rgba(0,0,0,0.015)]";
    let progressColor = "bg-gradient-to-r from-dailyveg-400 to-emerald-500";
    
    if (status === "packed") {
      cardAccentBorder = "border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/10 dark:border-emerald-950/60 dark:from-slate-950 dark:to-emerald-950/10 hover:border-emerald-300/80 shadow-[0_4px_12px_rgba(16,185,129,0.035)]";
      progressColor = "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]";
    } else if (hasIssue) {
      cardAccentBorder = "border-rose-200/80 bg-gradient-to-br from-white to-rose-50/10 dark:border-rose-950/60 dark:from-slate-950 dark:to-rose-950/10 hover:border-rose-300/80 shadow-[0_4px_12px_rgba(244,63,94,0.035)]";
      progressColor = "bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_0_8px_rgba(244,63,94,0.25)]";
    } else if (status === "accepted") {
      cardAccentBorder = "border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/10 dark:border-indigo-950/60 dark:from-slate-950 dark:to-indigo-950/10 hover:border-indigo-300/80 shadow-[0_4px_12px_rgba(99,102,241,0.035)]";
      progressColor = "bg-gradient-to-r from-indigo-500 to-dailyveg-500 shadow-[0_0_8px_rgba(99,102,241,0.25)]";
    } else if (status === "locked") {
      cardAccentBorder = "border-violet-200 bg-gradient-to-br from-white to-violet-50/15 dark:border-violet-950/50 dark:from-slate-950 dark:to-violet-950/10 hover:border-violet-300 dark:hover:border-violet-800 shadow-[0_4px_12px_rgba(139,92,246,0.035)]";
      progressColor = "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.25)]";
    }

    return (
      <Card
        key={group.order_id}
        className={`p-3.5 sm:p-5 transition-all duration-300 border ${cardAccentBorder} ${
          isExpanded 
            ? "shadow-lg border-dailyveg-500/50 dark:border-dailyveg-500/40 ring-1 ring-dailyveg-500/15" 
            : "shadow-sm hover:shadow-md hover:scale-[1.01]"
        }`}
      >
        <div className="flex flex-col gap-3 sm:gap-3.5">
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {dailyLabel && (
                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-mono font-black text-[11px] sm:text-xs rounded-xl shadow-md shadow-emerald-500/10 shrink-0 tracking-wide border border-white/10 dark:border-white/5">
                  {dailyLabel}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-[15px] tracking-tight truncate max-w-[150px] sm:max-w-xs" title={primaryLabel}>
                    {primaryLabel}
                  </span>
                  <StatusBadge value={status || "locked"} />
                  {group.sourcing_status === "not_assigned" && (
                    <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-white bg-rose-600 rounded-lg flex items-center gap-0.5 shrink-0">
                      <AlertTriangle className="h-3 w-3" /> Sourcing Pending
                    </span>
                  )}
                  {group.sourcing_status === "pending_dispatch" && (
                    <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-slate-900 bg-amber-400 rounded-lg flex items-center gap-0.5 shrink-0">
                      <Building2 className="h-3 w-3" /> Awaiting Dispatch
                    </span>
                  )}
                  {hasIssue && (
                    <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-white bg-rose-500 rounded-lg flex items-center gap-0.5 shrink-0 animate-pulse">
                      <AlertTriangle className="h-3 w-3" /> Exception
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-[13px] text-slate-500 mt-1 font-semibold truncate max-w-full sm:max-w-xs" title={`${opsOrder.user?.full_name || opsOrder.delivery_name || "Customer"} · ${opsOrder.delivery_area || ""}`}>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{opsOrder.user?.full_name || opsOrder.delivery_name || "Customer"}</span>
                  {opsOrder.delivery_area ? (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      {" • "}{opsOrder.delivery_area}
                    </span>
                  ) : ""}
                </p>
                {deliveryAddress && (
                  <p
                    className="mt-1 flex max-w-full items-start gap-1.5 text-[11px] sm:text-xs leading-4 text-slate-500 sm:max-w-xl"
                    title={deliveryAddress}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dailyveg-600" aria-hidden="true" />
                    <span className="truncate sm:whitespace-normal">{deliveryAddress}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right hidden sm:block">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs font-black text-slate-700 dark:text-slate-350 shadow-inner">
                  <span className={`h-1.5 w-1.5 rounded-full ${group.packed_count === group.total_items ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
                  {group.packed_count}/{group.total_items} Packed
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-dailyveg-600 dark:hover:text-dailyveg-400 transition-all duration-200 active:scale-90"
                onClick={() => setExpandedOrderId(isExpanded ? null : group.order_id)}
              >
                {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
              </Button>
            </div>
          </div>

          {/* Premium Thin Progress Bar (Visible even when collapsed) */}
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex justify-between items-center text-[10px] sm:text-[11px] sm:hidden font-extrabold text-slate-400/90 uppercase tracking-wider">
              <span>Progress: {group.progress_percent}%</span>
              <span>{group.packed_count}/{group.total_items} items</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 sm:h-2.5 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-800/20 shadow-inner relative">
              <div 
                className={`h-full transition-all duration-500 rounded-full relative ${progressColor}`}
                style={{ width: `${group.progress_percent}%` }}
              />
            </div>
          </div>

          {/* Quick inline status actions on collapsed cards (for easy flow) */}
          {!isExpanded && !isClosed && (
            <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-2 border-t border-slate-100/50 dark:border-slate-900/50 mt-0.5 sm:mt-1">
              {status === "locked" && (
                <Button
                  size="xs"
                  className="flex-1 sm:flex-initial h-8 px-3.5 text-[11px] font-black uppercase tracking-wider gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.97] transition-all duration-200 cursor-pointer"
                  onClick={() => handleStart(group.order_id)}
                  disabled={isStarting || group.sourcing_status !== "ready"}
                >
                  <Play className="h-3 w-3 fill-current stroke-[3]" /> Start Packing
                </Button>
              )}
              {capabilities.atomic_clean_packing && (status === "accepted" || status === "locked") && (
                <Button
                  size="xs"
                  className="flex-1 sm:flex-initial h-8 px-3.5 text-[11px] font-black uppercase tracking-wider gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.97] transition-all duration-200 cursor-pointer"
                  onClick={() => handleCleanConfirm(group.order_id)}
                  disabled={isConfirmingClean || group.sourcing_status !== "ready"}
                >
                  {isConfirmingClean && confirmingOrderId === group.order_id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin stroke-[3]" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 stroke-[3]" /> {isChecklistExactlyPacked ? "Finalize Order" : "Clean Confirm"}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Collapsible details */}
        {isExpanded && (
          <div className="mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-slate-900 space-y-3.5 sm:space-y-4 animate-in fade-in duration-200 min-w-0">
            {group.sourcing_status !== "ready" && (
              <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2 shadow-sm animate-pulse">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                <span>
                  {group.sourcing_status === "not_assigned"
                    ? "Packing is locked because sourcing for this order's items has not yet been assigned to any vendor."
                    : "Packing is locked because the vendor has not yet shipped/dispatched the required items."}
                </span>
              </div>
            )}
            {/* Clean packing workflow summary if capability is available */}
            {capabilities.atomic_clean_packing ? (
              <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3 sm:p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-2.5 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="font-extrabold text-[11px] sm:text-xs uppercase tracking-wider text-slate-500">
                    {isChecklistExactlyPacked ? "Checklist resolved — ready to finalize" : "Expecting clean verification"}
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    className="w-full sm:w-auto h-7 text-[11px] font-bold gap-1 rounded-lg border-slate-200 hover:bg-slate-100 bg-white"
                    onClick={() => handlePrintSlip(group)}
                  >
                    <Printer className="h-3 w-3" /> Print Packing Slip
                  </Button>
                </div>

                {/* Expected Item Summary */}
                <div className="bg-white/80 dark:bg-slate-950/80 p-2.5 sm:p-3 rounded-xl border border-slate-200/50 text-xs sm:text-[13px] shadow-inner max-h-48 overflow-y-auto">
                  <span className="font-black text-slate-400 uppercase tracking-wider text-[10px] block mb-2">
                    Box Content Manifest
                  </span>
                  <ul className="space-y-1.5">
                    {group.items.map((it) => (
                      <li key={it.id} className="flex justify-between font-medium border-b border-slate-50 dark:border-slate-900 pb-1.5 last:border-b-0 last:pb-0">
                        <span className="truncate max-w-[200px] sm:max-w-md" title={it.product?.name || it.product_name}>
                          {it.product?.name || it.product_name} <span className="text-[11px] text-slate-400">({it.pack?.pack_label || it.pack_label})</span>
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 shrink-0">
                          x {formatQuantity(it.ordered_quantity || it.required_quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  {!isClosed && (status === "accepted" || status === "locked") && (
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white font-black rounded-xl shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 text-xs sm:text-[13px] h-9 sm:h-9.5 active:scale-[0.98] transition-all"
                      onClick={() => handleCleanConfirm(group.order_id)}
                      disabled={isConfirmingClean || group.sourcing_status !== "ready"}
                    >
                      {isConfirmingClean && confirmingOrderId === group.order_id ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <Loader2 className="h-4 w-4 animate-spin stroke-[3]" /> Finalizing Order...
                        </span>
                      ) : (
                        isChecklistExactlyPacked ? "Finalize Packed Order" : "Confirm Clean Packing"
                      )}
                    </Button>
                  )}
                  {!isClosed && (
                    <Button
                      size="sm"
                      className="w-full sm:w-auto bg-gradient-to-r from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 text-rose-700 border border-rose-200/80 dark:from-rose-950/20 dark:to-rose-900/10 dark:text-rose-300 dark:border-rose-900/60 font-black rounded-xl text-xs sm:text-[13px] h-9 sm:h-9.5 px-4 shadow-sm active:scale-[0.98] transition-all"
                      onClick={() => {
                        if (group.items.length > 0) {
                          handleOpenEditItem(group.items[0], group, true);
                        }
                      }}
                    >
                      Report Issue
                    </Button>
                  )}
                </div>

                {/* Manager approval indicator */}
                {hasIssue && (
                  <div className="p-2.5 bg-rose-50/50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300 rounded-lg text-xs font-bold border border-rose-100/60 dark:border-rose-900/40 flex items-center gap-1.5 leading-relaxed">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>Manager Override required. Discrepancies have been logged as Exception.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 text-xs font-bold text-slate-500 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Backend auto-confirm capability is offline. Please pack items manually.</span>
              </div>
            )}

            {/* Manual fallback item checklist section */}
            <div className="space-y-2.5 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-bold gap-1.5 sm:gap-2">
                <span className="uppercase text-slate-450 text-[10px] tracking-wider">
                  Manual Checklist / overrides
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {!capabilities.atomic_clean_packing && (
                    <Button
                      size="xs"
                      variant="outline"
                      className="h-7 text-[11px] font-bold gap-1 rounded-lg"
                      onClick={() => handlePrintSlip(group)}
                    >
                      <Printer className="h-3 w-3" /> Print Slip
                    </Button>
                  )}
                  <Link
                    to={`/ops/orders/${group.order_id}`}
                    className="text-xs text-dailyveg-600 hover:underline flex items-center gap-0.5"
                  >
                    Timeline <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-950 scrollbar-thin">
                <table className={`w-full text-left border-collapse text-[13px] table-fixed ${showVendorColumn ? "min-w-[760px]" : "min-w-[550px]"}`}>
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 font-bold uppercase tracking-wider">
                      <th className={`py-2.5 px-3 font-bold ${showVendorColumn ? "w-[24%]" : "w-[32%]"}`}>Product & Pack</th>
                      {showVendorColumn && <th className="w-[20%] px-2 py-2.5 font-bold">Assigned Vendor</th>}
                      <th className={`py-2.5 px-2 font-bold text-right ${showVendorColumn ? "w-[9%]" : "w-[11%]"}`}>Ordered</th>
                      <th className={`py-2.5 px-2 font-bold text-right ${showVendorColumn ? "w-[9%]" : "w-[11%]"}`}>Packed</th>
                      <th className={`py-2.5 px-2 font-bold text-right text-rose-600 ${showVendorColumn ? "w-[8%]" : "w-[10%]"}`}>Miss</th>
                      <th className={`py-2.5 px-2 font-bold text-right text-amber-600 ${showVendorColumn ? "w-[8%]" : "w-[10%]"}`}>Dmg</th>
                      <th className={`py-2.5 px-3 font-bold text-right ${showVendorColumn ? "w-[22%]" : "w-[26%]"}`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => {
                      const assignments = itemVendorAssignments.get(item.id) || [];
                      const firstAssignment = assignments[0];
                      return (
                      <tr key={item.id} className="h-12 border-b border-slate-100 dark:border-slate-900 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white block truncate" title={item.product?.name || item.product_name}>
                            {item.product?.name || item.product_name}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {item.pack?.pack_label || item.pack_label}
                          </span>
                        </td>
                        {showVendorColumn && (
                          <td className="px-2 py-1.5">
                            {firstAssignment && (
                              <button
                                type="button"
                                onClick={() => setVendorDetail({ item, assignments })}
                                className="group flex h-8 w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-violet-200/80 bg-gradient-to-r from-violet-50 to-indigo-50 px-2.5 text-left shadow-sm transition-all hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 dark:border-violet-900/70 dark:from-violet-950/40 dark:to-indigo-950/40"
                                title="Click to view complete vendor details"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
                                  <Building2 className="h-3 w-3" />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold text-violet-900 dark:text-violet-100">
                                  {vendorName(firstAssignment)}{assignments.length > 1 ? ` +${assignments.length - 1}` : ""}
                                </span>
                                <Eye className="h-3 w-3 shrink-0 text-violet-500 opacity-70 transition-opacity group-hover:opacity-100" />
                              </button>
                            )}
                          </td>
                        )}
                        <td className="py-2.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                          {formatQuantity(item.ordered_quantity || item.required_quantity)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-slate-900 dark:text-white">
                          {formatQuantity(item.packed_quantity, "0")}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-rose-600">
                          {Number(item.missing_quantity) > 0 ? formatQuantity(item.missing_quantity) : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-amber-600">
                          {Number(item.damaged_quantity) > 0 ? formatQuantity(item.damaged_quantity) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {!isClosed && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="xs"
                                variant="ghost"
                                className="h-7 px-2 text-[10px] font-black text-dailyveg-600 hover:bg-dailyveg-50 hover:text-dailyveg-700"
                                onClick={() => handlePackedExactShortcut(item, group)}
                                disabled={isUpdatingItem || group.sourcing_status !== "ready"}
                              >
                                Exact
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                className="h-7 px-2 text-[10px] font-bold"
                                onClick={() => handleOpenEditItem(item, group, false)}
                                disabled={group.sourcing_status !== "ready"}
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="sm:hidden space-y-2.5">
                {group.items.map((item) => {
                  const assignments = itemVendorAssignments.get(item.id) || [];
                  const firstAssignment = assignments[0];
                  const orderedQty = item.ordered_quantity || item.required_quantity;
                  const packedQty = item.packed_quantity ?? 0;
                  const isFullyPacked = Number(packedQty) >= Number(orderedQty) && Number(orderedQty) > 0;
                  const hasMissing = Number(item.missing_quantity) > 0;
                  const hasDamaged = Number(item.damaged_quantity) > 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isFullyPacked
                          ? "bg-emerald-50/25 border-emerald-200/80 dark:bg-emerald-950/15 dark:border-emerald-900/40"
                          : hasMissing || hasDamaged
                          ? "bg-rose-50/25 border-rose-200/80 dark:bg-rose-950/15 dark:border-rose-900/40"
                          : "bg-white border-slate-200/80 dark:bg-slate-950 dark:border-slate-800/80 shadow-xs"
                      }`}
                    >
                      {/* Top: Product & Vendor */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white text-xs truncate" title={item.product?.name || item.product_name}>
                            {item.product?.name || item.product_name}
                          </p>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {item.pack?.pack_label || item.pack_label}
                          </span>
                        </div>
                        {showVendorColumn && firstAssignment && (
                          <button
                            type="button"
                            onClick={() => setVendorDetail({ item, assignments })}
                            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg border border-violet-200 bg-violet-50 text-[10px] font-bold text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300"
                          >
                            <Building2 className="h-2.5 w-2.5 text-violet-600" />
                            <span className="truncate max-w-[80px]">{vendorName(firstAssignment)}</span>
                          </button>
                        )}
                      </div>

                      {/* Middle: 4 stat chips */}
                      <div className="grid grid-cols-4 gap-1.5 mt-2">
                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60 text-center">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Ordered</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate mt-0.5">
                            {formatQuantity(orderedQty)}
                          </span>
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          isFullyPacked 
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/80 text-emerald-800 dark:text-emerald-300" 
                            : "bg-slate-50 dark:bg-slate-900/80 border-slate-100 dark:border-slate-800/60 text-slate-900 dark:text-white"
                        }`}>
                          <span className="text-[9px] font-black block uppercase">Packed</span>
                          <span className="text-xs font-black block truncate mt-0.5">
                            {formatQuantity(item.packed_quantity, "0")}
                          </span>
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          hasMissing 
                            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-700 dark:text-rose-300" 
                            : "bg-slate-50 dark:bg-slate-900/80 border-slate-100 dark:border-slate-800/60 text-slate-400"
                        }`}>
                          <span className="text-[9px] font-bold block uppercase">Miss</span>
                          <span className="text-xs font-bold block truncate mt-0.5">
                            {hasMissing ? formatQuantity(item.missing_quantity) : "—"}
                          </span>
                        </div>
                        <div className={`p-1.5 rounded-lg text-center border ${
                          hasDamaged 
                            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-700 dark:text-amber-300" 
                            : "bg-slate-50 dark:bg-slate-900/80 border-slate-100 dark:border-slate-800/60 text-slate-400"
                        }`}>
                          <span className="text-[9px] font-bold block uppercase">Dmg</span>
                          <span className="text-xs font-bold block truncate mt-0.5">
                            {hasDamaged ? formatQuantity(item.damaged_quantity) : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Bottom actions on mobile item */}
                      {!isClosed && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-900">
                          <Button
                            size="xs"
                            className="flex-1 h-7 text-[11px] font-bold bg-dailyveg-50 hover:bg-dailyveg-100 text-dailyveg-700 border border-dailyveg-200/80 dark:bg-dailyveg-950/30 dark:border-dailyveg-900/40 dark:text-dailyveg-300"
                            onClick={() => handlePackedExactShortcut(item, group)}
                            disabled={isUpdatingItem || group.sourcing_status !== "ready"}
                          >
                            <Check className="h-3 w-3 mr-1" /> Exact
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="flex-1 h-7 text-[11px] font-bold"
                            onClick={() => handleOpenEditItem(item, group, false)}
                            disabled={group.sourcing_status !== "ready"}
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isClosed && !group.is_complete && status !== "locked" && (
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm h-8"
                    onClick={() => setCompletingGroup(group)}
                    disabled={isCompleting}
                  >
                    Mark Packing Complete
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  };

  const renderQueueOrders = (queueOrders) => {
    if (!showNearbyGroups) return <div className="space-y-3">{queueOrders.map(renderOrderCard)}</div>;

    const plannedGroups = queueOrders === queues.ready
      ? (packingPlanQuery.data?.proposed_groups || []).map((plannedGroup) => ({
          id: `planned-${plannedGroup.group_number}`,
          label: plannedGroup.areas_covered?.join(", ") || `Packing group ${plannedGroup.group_number}`,
          usesCoordinates: true,
          planned: true,
          estimatedDistanceKm: plannedGroup.estimated_distance_km,
          estimatedDurationMins: plannedGroup.estimated_duration_mins,
          orders: (plannedGroup.orders || [])
            .map((plannedOrder) => queueOrders.find((orderGroup) => String(orderGroup.order_id) === String(plannedOrder.order_id)))
            .filter(Boolean),
        })).filter((plannedGroup) => plannedGroup.orders.length > 0)
      : [];
    const plannedOrderIds = new Set(plannedGroups.flatMap((plannedGroup) => plannedGroup.orders.map((orderGroup) => String(orderGroup.order_id))));
    const unplannedOrders = queueOrders.filter((orderGroup) => !plannedOrderIds.has(String(orderGroup.order_id)));
    const nearbyGroups = plannedGroups.length
      ? [...plannedGroups, ...groupOrdersForPacking(unplannedOrders, opsOrdersMap)]
      : groupOrdersForPacking(queueOrders, opsOrdersMap);
    return (
      <div className="space-y-4 sm:space-y-5">
        {nearbyGroups.map((nearbyGroup, index) => (
          <section key={nearbyGroup.id} className="overflow-hidden rounded-2xl border-2 border-dailyveg-300/80 bg-dailyveg-50/30 shadow-sm dark:border-dailyveg-800/80 dark:bg-dailyveg-950/10">
            <div className="flex flex-col gap-3 border-b border-dailyveg-200/80 bg-gradient-to-r from-dailyveg-100 via-emerald-50 to-white p-3.5 sm:px-4 sm:py-3.5 dark:border-dailyveg-900/70 dark:from-dailyveg-950/70 dark:via-emerald-950/20 dark:to-slate-950 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-dailyveg-600 text-xs font-black text-white shadow-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-dailyveg-700 dark:text-dailyveg-300">{nearbyGroup.planned ? "Priority packing batch" : "Pack together"} · Group {index + 1}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    <MapPin className="h-4 w-4 shrink-0 text-dailyveg-600" /> {nearbyGroup.label}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
                    {nearbyGroup.planned
                      ? `Priority ${nearbyGroup.planned ? index + 1 : ""} from warehouse · ${nearbyGroup.estimatedDistanceKm ?? "—"} km · ${nearbyGroup.estimatedDurationMins ?? "—"} min estimated route`
                      : nearbyGroup.usesCoordinates ? "Every order in this group is within 2.5 km of the others" : "Same delivery area and pincode"}
                  </p>
                </div>
              </div>
              <div className="flex self-start sm:self-auto gap-2">
                {nearbyGroup.planned && Number.isFinite(Number(nearbyGroup.estimatedDistanceKm)) && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 sm:px-3 sm:py-2 text-center shadow-sm dark:border-indigo-900/70 dark:bg-indigo-950/30">
                    <span className="block text-sm sm:text-base font-black leading-none text-indigo-700 dark:text-indigo-300">
                      {Number(nearbyGroup.estimatedDistanceKm).toFixed(1)} km
                    </span>
                    <span className="mt-0.5 sm:mt-1 block text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">total route</span>
                  </div>
                )}
                <div className="rounded-xl border border-dailyveg-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-center shadow-sm dark:border-dailyveg-900 dark:bg-slate-900">
                  <span className="block text-sm sm:text-base font-black leading-none text-dailyveg-700 dark:text-dailyveg-300">{nearbyGroup.orders.length}</span>
                  <span className="mt-0.5 sm:mt-1 block text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-slate-500">orders inside</span>
                </div>
              </div>
            </div>
            <div className="relative space-y-3 p-3 sm:p-4">
              <div className="pointer-events-none absolute bottom-4 left-4 sm:left-5 top-4 w-0.5 bg-dailyveg-200 dark:bg-dailyveg-900/80" />
              {nearbyGroup.orders.map((orderGroup, orderIndex) => (
                <div key={orderGroup.order_id} className="relative pl-3.5 sm:pl-5">
                  <span className="absolute left-0 top-6 sm:top-7 flex h-2.5 w-2.5 sm:h-3 sm:w-3 items-center justify-center rounded-full border-2 border-white bg-dailyveg-500 shadow-sm dark:border-slate-950" />
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-dailyveg-700 dark:text-dailyveg-300">
                    Group {index + 1} · Order {orderIndex + 1} of {nearbyGroup.orders.length}
                  </span>
                  {renderOrderCard(orderGroup)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Printable Slips */}
      {printingGroup && (
        <PackingSlipPrint
          operation={operation}
          orderGroup={printingGroup}
          opsOrderContext={opsOrdersMap.get(printingGroup.order_id)}
        />
      )}

      {batchPrintingGroups.length > 0 && (
        <BatchPackingSlipsPrint
          operation={operation}
          orderGroups={batchPrintingGroups}
          opsOrdersMap={opsOrdersMap}
        />
      )}

      {/* Prominent Scanner Search Input */}
      <Card className="p-3.5 sm:p-5 border border-slate-200/80 bg-gradient-to-r from-dailyveg-50/40 via-white to-emerald-50/20 dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900/60 dark:to-emerald-950/20 shadow-sm backdrop-blur-md rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between sm:justify-end pb-2 sm:pb-0 sm:absolute sm:top-0 sm:right-0 sm:p-3 text-[10px] font-black text-slate-400/80 uppercase tracking-widest sm:bg-slate-100/50 dark:sm:bg-slate-900/50 sm:rounded-bl-xl sm:border-l sm:border-b">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Scanner Active
          </span>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-2xl mx-auto sm:mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dailyveg-600" />
            <Input
              ref={scanInputRef}
              className="pl-10 pr-8 h-10 sm:h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white/90 text-xs sm:text-sm shadow-inner focus:ring-2 focus:ring-dailyveg-500/20 focus:border-dailyveg-500 dark:bg-slate-950 font-mono tracking-wide"
              placeholder="Scan Barcode / QR or search daily order #, operational code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full sm:w-auto h-10 sm:h-11 bg-gradient-to-r from-dailyveg-500 via-dailyveg-600 to-emerald-600 text-white font-extrabold rounded-xl shadow-md shadow-dailyveg-500/25 px-6 sm:px-8 text-xs uppercase tracking-wider scale-100 active:scale-95 duration-200 transition-all cursor-pointer"
          >
            Match Scan
          </Button>
        </form>
      </Card>

      {/* Packing Stage Tabs */}
      <div className="space-y-3 sm:space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1 sm:p-1.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="grid w-full grid-cols-2 gap-1 sm:gap-1.5 lg:grid-cols-4" role="tablist" aria-label="Packing stages">
            {packingStages.map((stage) => {
              const Icon = stage.icon;
              const active = activePackingStage === stage.key;

              return (
                <button
                  key={stage.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActivePackingStage(stage.key)}
                  className={`flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-200 ${active
                    ? "bg-gradient-to-r from-dailyveg-500 via-dailyveg-600 to-emerald-600 text-white shadow-md shadow-dailyveg-500/25"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
                    }`}
                >
                  <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${stage.key === "inProgress" && active ? "animate-spin" : ""}`} />
                  <span className="truncate">{stage.label}</span>
                  <span className={`flex h-4.5 min-w-4.5 sm:h-5 sm:min-w-5 shrink-0 items-center justify-center rounded-full px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-black ${active
                    ? "bg-white text-dailyveg-700"
                    : stage.key === "exceptions" && stage.count > 0
                      ? "bg-rose-500 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {stage.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div role="tabpanel" className="space-y-3">
          {activePackingStage === "ready" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
                <h4 className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  <Box className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-dailyveg-600" /> Ready to Pack ({queues.ready.length})
                </h4>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 sm:flex-initial h-8 rounded-xl text-xs font-bold"
                    onClick={() => setShowNearbyGroups((current) => !current)}
                  >
                    {showNearbyGroups ? "Standard List" : "Group Nearby Orders"}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 sm:flex-initial h-8 gap-1 rounded-xl text-xs font-bold" onClick={handleBatchPrint}>
                    <Printer className="h-3 w-3" /> Batch Print Slips
                  </Button>
                </div>
              </div>
              {queues.ready.length === 0
                ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs italic text-slate-500 dark:border-slate-800 dark:bg-slate-900">No orders waiting to pack.</p>
                : renderQueueOrders(queues.ready)}
            </>
          )}

          {activePackingStage === "inProgress" && (
            <>
              <h4 className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-indigo-600">
                <RefreshCw className="h-4 sm:h-4.5 w-4 sm:w-4.5 animate-spin" /> Packing in Progress ({queues.inProgress.length})
              </h4>
              {queues.inProgress.length === 0
                ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs italic text-slate-500 dark:border-slate-800 dark:bg-slate-900">No orders currently packing.</p>
                : renderQueueOrders(queues.inProgress)}
            </>
          )}

          {activePackingStage === "exceptions" && (
            <>
              <h4 className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-600">
                <AlertTriangle className="h-4 sm:h-4.5 w-4 sm:w-4.5" /> Packing Exceptions ({queues.exceptions.length})
              </h4>
              {queues.exceptions.length === 0
                ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs italic text-slate-500 dark:border-slate-800 dark:bg-slate-900">No active packing exceptions.</p>
                : renderQueueOrders(queues.exceptions)}
            </>
          )}

          {activePackingStage === "packed" && (
            <>
              <h4 className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-600">
                <CheckCircle2 className="h-4 sm:h-4.5 w-4 sm:w-4.5" /> Packed & Verified ({queues.packed.length})
              </h4>
              {queues.packed.length === 0
                ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs italic text-slate-500 dark:border-slate-800 dark:bg-slate-900">No packed orders recorded.</p>
                : renderQueueOrders(queues.packed)}
            </>
          )}
        </div>
      </div>

      {/* Edit Packing Item Dialog / Exception Report */}
      {editingPackingItem && (
        <Dialog open={Boolean(editingPackingItem)} onOpenChange={() => setEditingPackingItem(null)}>
          <DialogContent className="w-[95vw] sm:max-w-sm rounded-2xl p-4 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">
                {isReportingException ? "Report Missing or Damaged Item" : "Update Packing Item"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-lime-50 p-3.5 shadow-sm dark:border-emerald-900/60 dark:from-slate-950 dark:via-emerald-950/30 dark:to-slate-900">
                <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-emerald-200/30 blur-2xl dark:bg-emerald-700/20" />
                <div className="relative flex items-center gap-3.5">
                  <ProductAvatar
                    item={editingPackingItem}
                    size="lg"
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-2 border-white shadow-md ring-1 ring-emerald-100 dark:border-slate-800 dark:ring-emerald-900"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm sm:text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                      {editingPackingItem.product?.name || editingPackingItem.product_name}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                      Editing pack
                    </p>
                    <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1.5">
                      {editingPack && (
                        <span
                          className="inline-flex items-baseline gap-1 rounded-full border border-emerald-200/80 bg-white/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-slate-600 shadow-sm dark:border-emerald-900 dark:bg-slate-900/90 dark:text-slate-300"
                        >
                          <span>{editingPack.label}</span>
                          <strong className="text-xs font-black text-emerald-700 dark:text-emerald-400">× {Number(editingPack.quantity).toLocaleString("en-IN", { maximumFractionDigits: 3 })}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350 p-2.5 rounded-xl border border-emerald-100/60 dark:border-emerald-900/40 text-[11px] font-bold leading-relaxed flex items-start gap-1.5 shadow-sm">
                <span className="text-emerald-600 font-extrabold shrink-0 mt-0.5">ℹ</span>
                <span>
                  Enter pack counts only for the selected <strong>{editingPack?.label || "pack"}</strong> row. This will not change any other pack row.
                </span>
              </div>

              {!isReportingException ? (
                // Full override form
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Packed</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="rounded-xl h-9 text-xs"
                      value={itemForm.packed_quantity}
                      onChange={(e) => setItemForm({ ...itemForm, packed_quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Missing</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="rounded-xl h-9 text-xs"
                      value={itemForm.missing_quantity}
                      onChange={(e) => setItemForm({ ...itemForm, missing_quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Damaged</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="rounded-xl h-9 text-xs"
                      value={itemForm.damaged_quantity}
                      onChange={(e) => setItemForm({ ...itemForm, damaged_quantity: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                // Exception focus form
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-bold text-rose-600">Missing Packs</Label>
                      <Input
                        type="number"
                        step="0.001"
                        className="rounded-xl mt-1 h-9 text-xs border-rose-300 focus:ring-rose-500"
                        value={itemForm.missing_quantity}
                        onChange={(e) => setItemForm({ ...itemForm, missing_quantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-amber-600">Damaged Packs</Label>
                      <Input
                        type="number"
                        step="0.001"
                        className="rounded-xl mt-1 h-9 text-xs border-amber-300 focus:ring-amber-500"
                        value={itemForm.damaged_quantity}
                        onChange={(e) => setItemForm({ ...itemForm, damaged_quantity: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Remaining Packed Packs</Label>
                    <Input
                      type="number"
                      step="0.001"
                      className="rounded-xl mt-1 h-9 text-xs"
                      value={itemForm.packed_quantity}
                      onChange={(e) => setItemForm({ ...itemForm, packed_quantity: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold">Reason / Note</Label>
                <Input
                  className="rounded-xl h-9 text-xs"
                  placeholder="Reason for packing issue..."
                  value={itemForm.note}
                  onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl flex-1 sm:flex-initial" onClick={() => setEditingPackingItem(null)}>
                  Cancel
                </Button>
                <Button size="sm" className="rounded-xl font-bold flex-1 sm:flex-initial" onClick={handleSavePackingItem} disabled={isUpdatingItem}>
                  {isUpdatingItem ? "Saving..." : "Save Issue Details"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Complete Packing Confirmation Dialog */}
      {completingGroup && (
        <Dialog open={Boolean(completingGroup)} onOpenChange={() => setCompletingGroup(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">Complete Order Packing Override</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Are you sure you want to mark order{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {getPrimaryOrderLabel(completingGroup.order)}
                </span>{" "}
                as fully packed?
              </p>

              {!completingGroup.is_complete && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Warning: Packing Incomplete
                  </div>
                  <p className="text-[11px]">
                    Only {completingGroup.packed_count} of {completingGroup.total_items} items have been marked packed.
                  </p>
                </div>
              )}

              {isAdmin && !completingGroup.is_complete && (
                <div>
                  <Label className="text-xs font-bold text-rose-600">
                    Admin Override Reason (Mandatory if incomplete)
                  </Label>
                  <Input
                    className="rounded-xl mt-1 h-9 text-xs"
                    placeholder="Enter reason to override incomplete packing..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl flex-1 sm:flex-initial" onClick={() => setCompletingGroup(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl font-bold flex-1 sm:flex-initial"
                  onClick={handleCompleteOrder}
                  disabled={isCompleting || (!completingGroup.is_complete && isAdmin && !overrideReason.trim())}
                >
                  {isCompleting ? "Completing..." : "Complete Packing"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Assigned Vendor Details Dialog */}
      {vendorDetail && (
        <Dialog open={Boolean(vendorDetail)} onOpenChange={() => setVendorDetail(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md max-h-[85dvh] overflow-hidden rounded-2xl p-0">
            <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-violet-50 via-white to-indigo-50 px-4 sm:px-6 py-3.5 sm:py-4 dark:border-slate-800 dark:from-violet-950/40 dark:via-slate-950 dark:to-indigo-950/30">
              <DialogTitle className="flex items-center gap-3">
                <ProductAvatar item={vendorDetail?.item} size="md" fallbackIcon={Package} />
                <div className="min-w-0">
                  <span className="block text-sm sm:text-base font-bold">Assigned Vendor Details</span>
                  <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                    {vendorDetail?.item?.product_name || vendorDetail?.item?.product?.name || "Packing item"}
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(85dvh-80px)] space-y-3 overflow-y-auto p-3.5 sm:p-4">
              {(vendorDetail?.assignments || []).map((assignment) => {
                const status = getVendorAssignmentStatus(assignment.status);
                const unit = String(assignment.procurement_unit || "unit").toUpperCase();
                return (
                  <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {vendorName(assignment)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: …{String(assignment.id).slice(-8)}</p>
                      </div>
                      <Badge variant={status.variant} className="text-[10px] px-2 py-0.5 rounded-full">
                        {status.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Allocated</span>
                        <span className="font-black text-slate-800 dark:text-slate-200">
                          {formatQuantityWithUnit(assignment.allocated_quantity, unit)}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Price</span>
                        <span className="font-black text-slate-800 dark:text-slate-200">
                          {formatVendorMoney(assignment.unit_cost_paise)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
