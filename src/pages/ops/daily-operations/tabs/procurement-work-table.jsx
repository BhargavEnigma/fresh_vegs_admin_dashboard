import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Users,
  Warehouse,
} from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { cn } from "../../../../lib/utils";
import { formatPaiseToRupees } from "../../../../utils/daily-operations-helpers";
import {
  PROCUREMENT_VIEWS,
  canStartVendorAssignment,
  completedProcurementPortions,
  groupFullyConfirmedProductRows,
  procurementDisplayTotals,
  procurementItemsForView,
  procurementStepLabel,
} from "../../../../utils/procurement-work-view";
import {
  formatProcurementQuantity,
  formatQuantityWithUnit,
  formatVendorMoney,
  formatVendorPriceUpdatedAt,
  getVendorAssignmentStatus,
  procurementQuantityForDisplay,
} from "../../../../utils/vendor-assignment";

const STEP_STYLES = {
  assign_vendor: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  vendor_confirmation: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  vendor_dispatch: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  warehouse_receipt: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
  receive_remaining: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
  resolve_issue: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function quantity(item, value, field) {
  if (field && item.product_group_rows?.length) {
    const portions = item.product_group_rows.map((row) => {
        const rowValue = field === "effective_allocated_quantity"
          ? row.effective_allocated_quantity ?? row.allocated_quantity ?? 0
          : field === "unassigned_quantity"
            ? row.unassigned_quantity ?? row.quantity_to_assign ?? 0
            : row[field] ?? 0;
        return procurementQuantityForDisplay(row, rowValue);
      }).filter(Boolean);

    const units = new Set(portions.map((portion) => portion.unit));
    if (portions.length && units.size === 1) {
      const total = portions.reduce((sum, portion) => sum + portion.quantity, 0);
      return formatQuantityWithUnit(String(Number(total.toFixed(3))), portions[0].unit, "0");
    }
  }

  return formatProcurementQuantity(item, value, "0");
}

// Assignment API quantities are already physical quantities (KG/G/PC), not
// child pack counts, so applying the pack size here would convert them twice.
function assignmentQuantity(assignment, value, fallback = "0") {
  return formatQuantityWithUnit(
    String(Number(value || 0)),
    assignment?.procurement_unit || "unit",
    fallback
  );
}

function packRequirementsLabel(item) {
  if (item.pack_requirements_label) return item.pack_requirements_label;
  const structured = (item.pack_requirements || []).map((requirement) => {
    const label = String(requirement.pack_label || "Pack").replace(/\s+/g, "");
    return `${label}-${Number(requirement.required_pack_quantity || 0)}x`;
  }).join(", ");
  if (structured) return structured;

  const packLabel = item.pack_label || item.pack?.pack_label || item.pack?.label;
  const packCount = item.ordered_pack_quantity
    ?? (item.procurement_mode === "pack" ? item.required_quantity : null);
  if (packLabel && packCount !== null && packCount !== undefined) {
    return `${String(packLabel).replace(/\s+/g, "")}-${Number(packCount)}x`;
  }
  return packLabel || item.procurement_unit || "unit";
}

function ProductPackRequirements({ item }) {
  const breakdown = packRequirementsLabel(item);
  return (
    <p className="mt-1 max-w-[260px] text-[11px] font-semibold normal-case leading-4 text-slate-500 dark:text-slate-300">
      {breakdown}
    </p>
  );
}

function getOriginalCostDisplay(item) {
  const cost = item.unit_cost_paise || 0;
  const mode = item?.procurement_mode || item?.product?.procurement_mode;

  if (mode === "pack") {
    const pack = item.pack || item.product_pack || item.product?.pack || {};
    let quantityVal = Number(pack.base_quantity);
    let unitVal = String(pack.base_unit || "").trim().toLowerCase();

    if (!Number.isFinite(quantityVal) || quantityVal <= 0 || !unitVal) {
      const label = String(
        item.pack_label || pack.pack_label || pack.label || ""
      ).trim();
      const match = label.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|gm|grams?)\b/i);
      if (match) {
        quantityVal = Number(match[1]);
        unitVal = match[2].toLowerCase();
      }
    }

    const WEIGHT_UNIT_IN_KG = {
      kg: 1,
      kilogram: 1,
      kilograms: 1,
      g: 0.001,
      gm: 0.001,
      gram: 0.001,
      grams: 0.001,
    };

    if (quantityVal > 0 && unitVal && WEIGHT_UNIT_IN_KG[unitVal]) {
      const packSizeKg = quantityVal * WEIGHT_UNIT_IN_KG[unitVal];
      if (packSizeKg > 0) {
        const costPerKg = Math.round(cost / packSizeKg);
        return `${formatPaiseToRupees(costPerKg)} / KG`;
      }
    }

    // Check for pieces
    const label = String(item.pack_label || pack.pack_label || pack.label || "").trim().toLowerCase();
    const isPiece = label.includes("pc") || label.includes("piece") || label.includes("bundle");
    if (isPiece) {
      const pcMatch = label.match(/(\d+)\s*(pcs?|pieces?|bundles?)\b/i);
      if (pcMatch) {
        const piecesCount = Number(pcMatch[1]);
        if (piecesCount > 0) {
          const costPerPc = Math.round(cost / piecesCount);
          return `${formatPaiseToRupees(costPerPc)} / PC`;
        }
      }
      return `${formatPaiseToRupees(cost)} / PC`;
    }
    return `${formatPaiseToRupees(cost)} / PACK`;
  }

  // Bulk mode
  const rawUnit = String(item?.procurement_unit || "").trim().toLowerCase();
  const isPiece = ["piece", "pieces", "pcs", "pc"].includes(rawUnit);
  if (isPiece) {
    return `${formatPaiseToRupees(cost)} / PC`;
  }
  return `${formatPaiseToRupees(cost)} / KG`;
}

function StepBadge({ item }) {
  const Icon = item.next_action_code === "completed"
    ? CheckCircle2
    : item.next_action_code === "resolve_issue" ? AlertTriangle : Clock3;
  return (
    <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold", STEP_STYLES[item.next_action_code])}>
      <Icon className="h-3 w-3" />
      {procurementStepLabel(item)}
    </Badge>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  };
  return (
    <Card className="flex items-center gap-3 rounded-2xl border-slate-200/80 p-4 shadow-sm dark:border-slate-800">
      <span className={cn("grid h-9 w-9 place-items-center rounded-xl", tones[tone])}><Icon className="h-4 w-4" /></span>
      <div><p className="text-xl font-extrabold text-slate-950 dark:text-white">{value}</p><p className="text-[11px] font-semibold text-slate-500">{label}</p></div>
    </Card>
  );
}

function vendorName(assignment) {
  return assignment?.vendor?.vendor_profile?.company_name
    || assignment?.vendor?.company_name
    || assignment?.vendor?.full_name
    || "Assigned vendor";
}

function VendorAssignmentCell({ assignments, item, onOpen }) {
  if (!assignments.length) return <span className="text-slate-300 dark:text-slate-700">—</span>;
  const first = assignments[0];
  return (
    <button
      type="button"
      onClick={() => onOpen({ assignments, item })}
      className="group mx-auto flex h-9 w-[190px] min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 px-2.5 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-indigo-900/70 dark:from-indigo-950/40 dark:via-slate-950 dark:to-emerald-950/30"
      aria-label={`View assigned vendor details for ${item.product_name || item.product?.name || "product"}`}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
        <Users className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-extrabold text-slate-900 dark:text-white">{vendorName(first)}</span>
        <span className="block truncate text-[9px] font-semibold text-slate-500">
          {assignments.length > 1 ? `${assignments.length} assignments · ` : ""}Click for details
        </span>
      </span>
    </button>
  );
}

export function ProcurementWorkTable({
  data,
  isLoading,
  isError,
  onRetry,
  view,
  onViewChange,
  searchTerm,
  onSearchChange,
  isAdmin,
  isWarehouseManager,
  isClosed,
  isUpdating,
  autoAssignDisabled,
  vendorAssignmentsByCost = {},
  onAssignVendor,
  onAutoAssign,
  onReceive,
  onCheckProblem,
  onViewDetails,
}) {
  const [vendorDetails, setVendorDetails] = useState(null);
  const [expandedTimelines, setExpandedTimelines] = useState({});

  const toggleTimeline = (assignmentId) => {
    setExpandedTimelines((prev) => ({
      ...prev,
      [assignmentId]: !prev[assignmentId],
    }));
  };

  const viewItems = useMemo(
    () => {
      const rows = view === PROCUREMENT_VIEWS.HISTORY
        ? completedProcurementPortions(data?.items || [])
        : procurementItemsForView(data?.items || [], view);
      return view === PROCUREMENT_VIEWS.HISTORY || rows.some((item) => item.is_product_group)
        ? rows
        : groupFullyConfirmedProductRows(rows, vendorAssignmentsByCost);
    },
    [data?.items, vendorAssignmentsByCost, view]
  );

  console.log("viewItems : ", viewItems);
  
  const items = useMemo(
    () => viewItems.filter((item) => {
      const term = searchTerm.trim().toLowerCase();
      return !term || [item.product_name, item.product?.name, item.procurement_unit, item.vendor_name, packRequirementsLabel(item)]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    }),
    [searchTerm, viewItems]
  );

  console.log("ITEMS : ", items);
  
  const totals = procurementDisplayTotals(procurementItemsForView(data?.items || [], view));
  const summary = data?.summary || {};
  const isHistory = view === PROCUREMENT_VIEWS.HISTORY;
  const completedCount = isHistory
    ? viewItems.length
    : Number(summary.history_count || 0) + completedProcurementPortions(data?.items || []).length;
  const emptyTitle = isHistory ? "No completed procurement yet" : "All procurement work is complete";
  const emptyDescription = isHistory
    ? "Completed products will appear here after warehouse receipt."
    : "There are no products waiting for vendor or warehouse action.";

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-200/80 p-2 shadow-sm dark:border-slate-800">
        <div className="grid gap-2 md:grid-cols-2">
          {[
            { value: "active", title: "Purchase Pending", description: "Products that still need vendor or warehouse action", count: summary.active_count },
            { value: "history", title: "Completed", description: "Product packs and quantities already received", count: completedCount },
          ].map((option) => (
            <button key={option.value} type="button" onClick={() => onViewChange(option.value)} aria-pressed={view === option.value}
              className={cn("rounded-xl border px-4 py-3 text-left transition-colors", view === option.value ? "border-dailyveg-300 bg-dailyveg-50 dark:border-dailyveg-800 dark:bg-dailyveg-950/30" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900")}>
              <span className="flex items-center justify-between gap-3"><strong className="text-sm text-slate-950 dark:text-white">{option.title}</strong><Badge variant={view === option.value ? "success" : "secondary"}>{Number(option.count || 0)}</Badge></span>
              <span className="mt-1 block text-[11px] text-slate-500">{option.description}</span>
            </button>
          ))}
        </div>
      </Card>

      {!isHistory && !isLoading && !isError ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard icon={Package} label="Products Needing Action" value={viewItems.length} />
          <SummaryCard icon={ShoppingCart} label="Quantity Still to Assign" value={totals.unassigned.toLocaleString("en-IN", { maximumFractionDigits: 3 })} tone="blue" />
          <SummaryCard icon={Store} label="Waiting for Vendor" value={totals.waitingVendor} tone="amber" />
          <SummaryCard icon={Warehouse} label="Waiting at Warehouse" value={totals.waitingWarehouse} tone="indigo" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search product or vendor" className="h-10 rounded-xl pl-9" /></div>
        {!isHistory && isAdmin && !isClosed ? <Button variant="outline" onClick={onAutoAssign} className="rounded-xl" disabled={isUpdating || autoAssignDisabled}><ShoppingCart className="mr-2 h-4 w-4" />Auto Assign</Button> : null}
      </div>

      {isLoading ? (
        <Card className="space-y-3 rounded-2xl p-5">{[1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-12 w-full rounded-xl" />)}</Card>
      ) : isError ? (
        <Card className="rounded-2xl p-10 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-rose-500" /><h3 className="mt-3 font-bold">Procurement data could not be loaded.</h3>{onRetry ? <Button variant="outline" className="mt-4 rounded-xl" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button> : null}</Card>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl p-10 text-center"><CheckCircle2 className={cn("mx-auto h-9 w-9", isHistory ? "text-slate-400" : "text-emerald-500")} /><h3 className="mt-3 font-bold text-slate-950 dark:text-white">{emptyTitle}</h3><p className="mt-1 text-sm text-slate-500">{emptyDescription}</p></Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm dark:border-slate-800">
          <div className="overflow-x-auto thin-scrollbar">
            <table className={cn("w-full text-left text-xs", isHistory ? "min-w-[1280px]" : "min-w-[1140px]")}>
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900"><tr>
                <th className="px-5 py-4">Product</th>
                {isHistory ? (
                  <>
                    <th className="px-4 py-4 text-right">Required Qty</th>
                    <th className="px-4 py-4 text-right">Purchased Qty</th>
                    <th className="px-4 py-4 text-right">Received Qty</th>
                    <th className="px-4 py-4 text-right">Rejected Qty</th>
                    <th className="px-4 py-4 text-right">Waste Qty</th>
                    <th className="w-[220px] px-4 py-4 text-center">Vendor</th>
                    <th className="px-4 py-4 text-right">Unit Cost</th>
                    <th className="px-4 py-4 text-right">Final Cost</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-4 text-right">Total Needed</th>
                    <th className="px-4 py-4 text-right">Vendor Arranged</th>
                    <th className="px-4 py-4 text-right">Received</th>
                    <th className="px-4 py-4 text-right">Still to Assign</th>
                    <th className="w-[220px] px-4 py-4 text-center">Assigned Vendor</th>
                  </>
                )}
                <th className="px-4 py-4">Current Step</th>
                {!isHistory && <th className="px-5 py-4 text-right">Action</th>}
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                  const code = item.next_action_code;
                  const vendorAssignments = item.product_group_assignments
                    || (item.is_product_group
                      ? (item.child_procurement_cost_ids || [])
                          .flatMap((id) => vendorAssignmentsByCost[String(id)] || [])
                          .filter((assignment, index, rows) => (
                            rows.findIndex((row) => row.id === assignment.id) === index
                          ))
                      : vendorAssignmentsByCost[String(item.procurement_cost_id || item.id)] || []);
                  return <tr key={item.id || item.procurement_cost_id} className={cn("bg-white dark:bg-slate-950", isHistory && "bg-emerald-50/20 dark:bg-emerald-950/5")}>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950 dark:text-white">{item.product_name || item.product?.name || "Product"}</p>
                      <ProductPackRequirements item={item} />
                    </td>
                    {isHistory ? (
                      <>
                        <td className="px-4 py-4 text-right font-semibold">{quantity(item, item.required_quantity)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-indigo-600 dark:text-indigo-400">{quantity(item, item.purchased_quantity)}</td>
                        <td className="px-4 py-4 text-right font-extrabold text-emerald-700 dark:text-emerald-405">{quantity(item, item.received_quantity)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-rose-600 dark:text-rose-405">{Number(item.rejected_quantity || 0) > 0 ? quantity(item, item.rejected_quantity) : "—"}</td>
                        <td className="px-4 py-4 text-right font-semibold text-amber-600 dark:text-amber-405">{Number(item.waste_quantity || 0) > 0 ? quantity(item, item.waste_quantity) : "—"}</td>
                        <td className="w-[220px] px-4 py-3 text-center">
                          {vendorAssignments.length > 0 ? (
                            <VendorAssignmentCell assignments={vendorAssignments} item={item} onOpen={setVendorDetails} />
                          ) : item.vendor_name ? (
                            <span className="inline-flex items-center justify-center h-9 w-[190px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-center text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                              {item.vendor_name}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">
                          {getOriginalCostDisplay(item)}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-slate-950 dark:text-white">{formatPaiseToRupees(item.total_cost_paise)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 text-right font-semibold">{quantity(item, item.required_quantity, "required_quantity")}</td>
                        <td className="px-4 py-4 text-right font-semibold">{quantity(item, item.effective_allocated_quantity ?? item.allocated_quantity, "effective_allocated_quantity")}</td>
                        <td className="px-4 py-4 text-right font-semibold">{quantity(item, item.received_quantity, "received_quantity")}</td>
                        <td className="px-4 py-4 text-right"><span className="inline-flex rounded-lg bg-rose-50 px-2.5 py-1.5 text-sm font-extrabold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{quantity(item, item.unassigned_quantity ?? item.quantity_to_assign, "unassigned_quantity")}</span></td>
                        <td className="w-[220px] px-4 py-3 text-center">
                          <VendorAssignmentCell assignments={vendorAssignments} item={item} onOpen={setVendorDetails} />
                        </td>
                      </>
                    )}
                    <td className="px-4 py-4"><StepBadge item={isHistory ? { ...item, next_action_code: "completed" } : item} /></td>
                    {!isHistory && (
                      <td className="px-5 py-4 text-right">
                        {canStartVendorAssignment(item, view) && (isAdmin || isWarehouseManager) && !isClosed ? (
                          <Button size="sm" onClick={() => onAssignVendor(item)} disabled={isUpdating}>
                            {vendorAssignments.length > 0 || Number(item.vendor_assignment_count || 0) > 0
                              ? "Assign Remaining"
                              : "Assign Vendor"}
                          </Button>
                        ) : ["warehouse_receipt", "receive_remaining"].includes(code) && !isClosed ? (
                          <Button size="sm" onClick={() => onReceive(item)} disabled={isUpdating}>Receive Stock</Button>
                        ) : code === "resolve_issue" ? (
                          <Button size="sm" variant="outline" onClick={() => onCheckProblem(item)}>Check Problem</Button>
                        ) : onViewDetails ? (
                          <Button size="sm" variant="ghost" onClick={() => onViewDetails(item)}>View Details</Button>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">No action needed</span>
                        )}
                      </td>
                    )}  
                  </tr>;
                })}</tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={Boolean(vendorDetails)} onOpenChange={(open) => !open && setVendorDetails(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 px-6 py-5 dark:border-slate-800 dark:from-indigo-950/40 dark:via-slate-950 dark:to-emerald-950/30">
            <DialogTitle className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300"><Users className="h-4 w-4" /></span>
              <span>
                <span className="block">Assigned Vendor Details</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500">{vendorDetails?.item?.product_name || vendorDetails?.item?.product?.name || "Procurement item"}</span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-90px)] space-y-3 overflow-y-auto p-5 thin-scrollbar">
            {(vendorDetails?.assignments || []).map((assignment) => {
              const assignmentItem = vendorDetails?.item?.product_group_rows?.find((row) => (
                String(row.procurement_cost_id || row.id) === String(assignment.procurement_cost_id)
              )) || vendorDetails?.item;
              const unit = String(assignment.procurement_unit || assignmentItem?.procurement_unit || "unit").toUpperCase();
              const status = getVendorAssignmentStatus(assignment.status);

              const assignmentsForThisItem = (vendorDetails?.assignments || []).filter(
                (a) => String(a.procurement_cost_id) === String(assignment.procurement_cost_id) && !["cancelled", "rejected"].includes(a.status)
              );
              const totalAllocatedForThisItem = assignmentsForThisItem.reduce((sum, a) => sum + Number(a.allocated_quantity || 0), 0);
              const requiredQtyDisplay = procurementQuantityForDisplay(assignmentItem, assignmentItem?.required_quantity);
              const requiredQty = requiredQtyDisplay ? requiredQtyDisplay.quantity : Number(assignmentItem?.required_quantity || 0);
              const excessQty = totalAllocatedForThisItem - requiredQty;
              
              return (
                <div key={assignment.id || `${assignment.vendor_user_id}-${assignment.allocated_quantity}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-extrabold text-slate-950 dark:text-white">
                        {vendorName(assignment)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <span>ID: #{assignment.id || "—"}</span>
                        {assignment.vendor?.phone && (
                          <>
                            <span>·</span>
                            <span>📞 {assignment.vendor.phone}</span>
                          </>
                        )}
                        {assignment.vendor?.email && (
                          <>
                            <span>·</span>
                            <span>✉️ {assignment.vendor.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant={status.variant} className="shrink-0 rounded-full">{status.label}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Allocated</p>
                      <p className="mt-1 text-sm font-extrabold">{assignmentQuantity(assignment, assignment.allocated_quantity)}</p>
                      {excessQty > 0.0001 && (
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          (+{Number(excessQty.toFixed(3))} {assignment?.procurement_unit || "unit"} extra)
                        </span>
                      )}
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Supplied</p><p className="mt-1 text-sm font-extrabold">{assignmentQuantity(assignment, assignment.supplied_quantity)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Locked Price</p><p className="mt-1 text-sm font-extrabold">{formatVendorMoney(assignment.unit_cost_paise)}/{unit}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Price Locked</p><p className="mt-1 text-xs font-bold">{formatVendorPriceUpdatedAt(assignment.price_locked_at)}</p></div>
                  </div>
                  {(Number(assignment.received_quantity || 0) > 0 || Number(assignment.rejected_quantity || 0) > 0) && (
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-900 pt-3">
                      {Number(assignment.received_quantity || 0) > 0 && (
                        <div className="rounded-xl bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received Qty</p>
                          <p className="mt-1 text-sm font-extrabold text-emerald-700 dark:text-emerald-350">{assignmentQuantity(assignment, assignment.received_quantity)}</p>
                        </div>
                      )}
                      {Number(assignment.rejected_quantity || 0) > 0 && (
                        <div className="rounded-xl bg-rose-50/50 p-3 dark:bg-rose-950/20">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Rejected Qty</p>
                          <p className="mt-1 text-sm font-extrabold text-rose-700 dark:text-rose-350">{assignmentQuantity(assignment, assignment.rejected_quantity)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {Number(assignment.allocation_revision || 1) > 1 ? (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs dark:border-blue-900 dark:bg-blue-950/30">
                      <div><p className="text-[9px] font-bold uppercase text-slate-400">Previous</p><strong>{assignmentQuantity(assignment, assignment.previous_allocated_quantity)}</strong></div>
                      <div><p className="text-[9px] font-bold uppercase text-slate-400">Added</p><strong className="text-blue-700 dark:text-blue-300">+{assignmentQuantity(assignment, assignment.last_allocation_delta)}</strong></div>
                      <div><p className="text-[9px] font-bold uppercase text-slate-400">New Total</p><strong>{assignmentQuantity(assignment, assignment.allocated_quantity)}</strong></div>
                    </div>
                  ) : null}
                  {assignment.notes ? <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><span className="font-bold">Note: </span>{assignment.notes}</div> : null}
                  <div className="border-t border-slate-100 dark:border-slate-900 pt-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Allocation Timeline</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50/50"
                        onClick={() => toggleTimeline(assignment.id || `${assignment.vendor_user_id}-${assignment.allocated_quantity}`)}
                      >
                        {expandedTimelines[assignment.id || `${assignment.vendor_user_id}-${assignment.allocated_quantity}`] ? "Hide Transition Logs" : "Show Transition Logs"}
                      </Button>
                    </div>
                    {expandedTimelines[assignment.id || `${assignment.vendor_user_id}-${assignment.allocated_quantity}`] && (
                      <div className="relative border-l border-slate-200 pl-3.5 dark:border-slate-800 space-y-3.5 mt-2 animate-slide-down">
                        {assignment.assigned_at && (
                          <div className="relative text-[11px] leading-relaxed">
                            <span className="absolute -left-[19.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-950 dark:bg-slate-650" />
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-700 dark:text-slate-350 uppercase text-[9px] tracking-wider bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                Assigned
                              </span>
                              <span className="text-slate-400 dark:text-slate-500">
                                {new Date(assignment.assigned_at).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                              Allocation created and allocated to vendor
                            </div>
                          </div>
                        )}
                        {(assignment.status_history || []).map((event) => {
                          const eventStatus = getVendorAssignmentStatus(event.status);
                          return (
                            <div key={event.id || event.status} className="relative text-[11px] leading-relaxed">
                              <span className="absolute -left-[19.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300 dark:border-slate-950 dark:bg-slate-700" />
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-350 uppercase text-[9px] tracking-wider bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                  {eventStatus.label}
                                </span>
                                <span className="text-slate-400 dark:text-slate-500">
                                  {new Date(event.changed_at || event.timestamp || event.created_at).toLocaleString("en-IN")}
                                </span>
                                {event.timestamp_source === "estimated" && (
                                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200/20">
                                    Estimated
                                  </span>
                                )}
                                {event.change_source && (
                                  <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-100/50 dark:border-slate-900/30">
                                    via {event.change_source.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                {event.changed_by?.full_name && (
                                  <span>Actor: <strong className="text-slate-600 dark:text-slate-350">{event.changed_by.full_name}</strong></span>
                                )}
                                {event.reason && (
                                  <span className={event.changed_by?.full_name ? "ml-2" : ""}>
                                    Reason: <em className="text-amber-700 dark:text-amber-400">"{event.reason}"</em>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
