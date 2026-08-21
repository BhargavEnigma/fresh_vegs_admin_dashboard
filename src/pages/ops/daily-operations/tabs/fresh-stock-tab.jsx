import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Boxes,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  Trash2,
  Lock,
  Unlock,
  Sliders,
  History,
  Info,
  Calendar,
  Warehouse,
  ShoppingBag,
  Plus,
  User as UserIcon,
  Tag,
} from "lucide-react";

import { Card } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../../components/ui/dialog";
import { ConfirmDialog } from "../../../../components/common/confirm-dialog";
import { StatusBadge } from "../../../../components/common/status-badge";
import { useToast } from "../../../../components/toast/toast-context";
import {
  useDailyOperationsInventorySummary,
  useInventoryLots,
  useInventoryLotMovements,
  useDailyOperationsMutations,
} from "../../../../api/services/daily-operations.hooks";
import { formatPaiseToRupees } from "../../../../utils/daily-operations-helpers";
import { formatIndianDateTime } from "../../../../utils/date-formatter";
import { cn } from "../../../../lib/utils";
import { ProductAvatar } from "../../../../components/common/product-avatar";

function FreshnessBadge({ status }) {
  const configs = {
    fresh: {
      label: "Fresh",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      icon: CheckCircle2,
    },
    use_first: {
      label: "Use First",
      className: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      icon: Clock,
    },
    expiring_soon: {
      label: "Expiring Soon",
      className: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      icon: AlertTriangle,
    },
    quarantined: {
      label: "Quarantined",
      className: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      icon: ShieldAlert,
    },
    expired: {
      label: "Expired",
      className: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
      icon: AlertTriangle,
    },
    depleted: {
      label: "Empty",
      className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
      icon: CheckCircle2,
    },
    configuration_required: {
      label: "Policy Needed",
      className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      icon: Info,
    },
  };

  const config = configs[status] || {
    label: status || "Unknown",
    className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    icon: Info,
  };
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold tracking-wide whitespace-nowrap shadow-2xs", config.className)}>
      <Icon className="h-3 w-3 flex-shrink-0" />
      {config.label}
    </span>
  );
}

function NextActionBadge({ code }) {
  const configs = {
    covered_from_fresh_stock: {
      label: "Covered From Stock",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      icon: CheckCircle2,
    },
    vendor_purchase_needed: {
      label: "Vendor Purchase Needed",
      className: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      icon: ShoppingBag,
    },
    reconcile_received_stock: {
      label: "Reconcile Received Stock",
      className: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      icon: RefreshCw,
    },
    configure_freshness_policy: {
      label: "Configure Policy",
      className: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      icon: AlertTriangle,
    },
  };

  const config = configs[code] || {
    label: code || "Check Details",
    className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300",
    icon: Info,
  };
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold tracking-wide whitespace-nowrap shadow-2xs", config.className)}>
      <Icon className="h-3 w-3 flex-shrink-0" />
      {config.label}
    </span>
  );
}


export function FreshStockTab({ operationId, warehouseId, isClosed }) {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addStockProduct, setAddStockProduct] = useState(null);

  // Lot action dialog states
  const [actionDialog, setActionDialog] = useState({ open: false, lot: null, action: null });
  const [actionQuantity, setActionQuantity] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [viewMovementsLot, setViewMovementsLot] = useState(null);

  // Queries & Mutations
  const summaryQuery = useDailyOperationsInventorySummary(operationId);
  const {
    replanInventoryMutation,
    wasteLotMutation,
    quarantineLotMutation,
    releaseQuarantineLotMutation,
    adjustLotMutation,
  } = useDailyOperationsMutations(operationId);

  const inventoryData = summaryQuery.data;
  const summary = inventoryData?.summary || {
    usable_today_quantity: 0,
    reserved_for_orders_quantity: 0,
    extra_available_quantity: 0,
    vendor_purchase_needed_quantity: 0,
  };
  const products = inventoryData?.products || [];

  // Filtered product rows
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const name = String(item.product_name || "").toLowerCase();
      const matchSearch = name.includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (filterAction === "covered") return item.next_action_code === "covered_from_fresh_stock";
      if (filterAction === "vendor_needed") return item.next_action_code === "vendor_purchase_needed";
      if (filterAction === "policy_needed") return item.next_action_code === "configure_freshness_policy";
      return true;
    });
  }, [products, searchTerm, filterAction]);

  const handleReplan = async () => {
    if (!operationId || operationId === "null") {
      toast.warning("Operation Not Open", "Please open the daily operation from Overview tab before replanning.");
      return;
    }
    try {
      await replanInventoryMutation.mutateAsync();
      toast.success("Inventory Replanned", "Order allocations and procurement targets updated from fresh inventory.");
    } catch (err) {
      toast.error("Replan Failed", err?.response?.data?.message || err.message);
    }
  };

  const handleExecuteLotAction = async () => {
    const { lot, action } = actionDialog;
    if (!lot || !action) return;
    if (!operationId || operationId === "null") {
      toast.warning("Operation Not Open", "Please open the daily operation from Overview tab before performing actions.");
      return;
    }

    try {
      if (action === "waste") {
        await wasteLotMutation.mutateAsync({
          lotId: lot.id,
          quantity: parseFloat(actionQuantity) || 0,
          reason: actionReason || "Physical inspection waste",
        });
        toast.success("Waste Recorded", "Quantity subtracted from usable stock.");
      } else if (action === "quarantine") {
        await quarantineLotMutation.mutateAsync({
          lotId: lot.id,
          reason: actionReason || "Quality check quarantine",
        });
        toast.success("Lot Quarantined", "Stock quarantined from order allocations.");
      } else if (action === "release_quarantine") {
        await releaseQuarantineLotMutation.mutateAsync({
          lotId: lot.id,
          reason: actionReason || "Quality check passed",
        });
        toast.success("Quarantine Released", "Stock returned to available inventory.");
      } else if (action === "adjust") {
        await adjustLotMutation.mutateAsync({
          lotId: lot.id,
          actualQuantity: parseFloat(actionQuantity) || 0,
          reason: actionReason || "Physical audit adjustment",
        });
        toast.success("Stock Adjusted", "Physical lot quantity updated.");
      }
      setActionDialog({ open: false, lot: null, action: null });
      setActionQuantity("");
      setActionReason("");
      summaryQuery.refetch();
    } catch (err) {
      toast.error("Action Failed", err?.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      {!operationId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-xs font-bold">Daily operation is not open yet</p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                Please open the day in the Overview tab to initialize fresh inventory planning for this delivery date.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Usable Fresh Stock</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {Number(summary.usable_today_quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-400">{Number(summary.usable_today_quantity || 0) >= 1 ? "KG" : "g"} available</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Live unexpired physical stock in warehouse</p>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Reserved For Today</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Lock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {Number(summary.reserved_for_orders_quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-400">{Number(summary.reserved_for_orders_quantity || 0) >= 1 ? "KG" : "g"} committed</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Allocated via FEFO for today&apos;s customer orders</p>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Free / Excess Stock</span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {Number(summary.extra_available_quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-400">{Number(summary.extra_available_quantity || 0) >= 1 ? "KG" : "g"} free</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Remaining extra stock for new or subsequent orders</p>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Vendor Purchase</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {Number(summary.vendor_purchase_needed_quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-slate-400">{Number(summary.vendor_purchase_needed_quantity || 0) >= 1 ? "KG" : "g"} shortfall</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Uncovered order demand to buy from vendors</p>
        </Card>
      </div>

      {/* Action and Filter Bar */}
      <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search fresh products..."
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              {[
                { key: "all", label: "All Items" },
                { key: "covered", label: "Covered by Stock" },
                { key: "vendor_needed", label: "To Procure" },
                { key: "policy_needed", label: "Policy Required" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterAction(tab.key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    filterAction === tab.key
                      ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-950 dark:hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (operationId && operationId !== "null") {
                  summaryQuery.refetch();
                } else {
                  toast.warning("Operation Not Open", "Please open the daily operation from Overview tab first.");
                }
              }}
              disabled={summaryQuery.isFetching || !operationId || operationId === "null"}
              className="rounded-xl"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", summaryQuery.isFetching && "animate-spin")} />
              Refresh
            </Button>
            {!isClosed && (
              <Button
                size="sm"
                onClick={handleReplan}
                disabled={replanInventoryMutation.isPending || !operationId || operationId === "null"}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {replanInventoryMutation.isPending ? "Replanning..." : "Replan & Re-allocate Stock"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Stock Table */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="max-h-[calc(100vh-280px)] min-h-[540px] overflow-auto thin-scrollbar">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md dark:bg-slate-900/95">
              <tr className="border-b border-slate-200/80 dark:border-slate-800">
                <th className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 whitespace-nowrap">
                  Product & Canonical Unit
                </th>
                <th className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 px-4 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 whitespace-nowrap">
                  Gross Demand
                </th>
                <th className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 px-4 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 whitespace-nowrap">
                  Covered From Stock
                </th>
                <th className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 px-4 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 whitespace-nowrap">
                  Available Stock
                </th>
                <th className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 px-4 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 whitespace-nowrap">
                  Vendor Required
                </th>
                <th className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 whitespace-nowrap">
                  Earliest Expiry
                </th>
                <th className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/95 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 whitespace-nowrap">
                  Status & Next Action
                </th>
                <th className="sticky top-0 right-0 z-30 border-b border-l border-slate-200/80 bg-slate-50/95 px-5 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.5)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-400 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {summaryQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-500" />
                    <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">Loading warehouse fresh inventory...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Boxes className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">No inventory products found</p>
                    <p className="mt-0.5 text-xs text-slate-500">Run Replan to sync current order demand with fresh lots.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((row) => {
                  const unit = row.tracking_unit || "KG";
                  const grossDemand = Number(row.gross_order_demand_quantity || 0);
                  const reserved = Number(row.reserved_from_stock_quantity || 0);
                  const usable = Number(row.usable_stock_quantity || 0);
                  const vendorNeeded = Number(row.net_vendor_required_quantity || 0);
                  const isFullyCovered = grossDemand > 0 && vendorNeeded === 0;

                  return (
                    <tr
                      key={row.product_id}
                      className={cn(
                        "group bg-white transition-all hover:bg-slate-50/80 dark:bg-slate-950 dark:hover:bg-slate-900/60",
                        isFullyCovered && "bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
                      )}
                    >
                      <td className="border-b border-slate-100 px-5 py-4 whitespace-nowrap dark:border-slate-800/70">
                        <div className="flex items-center gap-3">
                          <ProductAvatar item={row} size="md" fallbackIcon={Boxes} />
                          <div className="min-w-0 max-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-950 dark:text-white truncate text-sm" title={row.product_name}>
                                {row.product_name}
                              </span>
                              <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {unit}
                              </span>
                            </div>
                            {row.safety_stock_quantity > 0 ? (
                              <p className="mt-0.5 text-[10px] font-medium text-slate-400 truncate">
                                Buffer: {row.safety_stock_quantity} {unit}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[10px] text-slate-400">Canonical tracking</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap font-mono text-xs dark:border-slate-800/70">
                        {grossDemand > 0 ? (
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {grossDemand.toFixed(2)}{" "}
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">{unit}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-normal">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap dark:border-slate-800/70">
                        {reserved > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/80 bg-blue-50/80 px-2.5 py-1 font-mono text-xs font-black text-blue-700 shadow-2xs dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                            <Lock className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            {reserved.toFixed(2)}{" "}
                            <span className="text-[10px] font-bold uppercase opacity-80">{unit}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap dark:border-slate-800/70">
                        {usable > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 font-mono text-xs font-black text-emerald-700 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                            {usable.toFixed(2)}{" "}
                            <span className="text-[10px] font-bold uppercase opacity-80">{unit}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400 dark:text-slate-600">0.00 <span className="text-[10px] uppercase">{unit}</span></span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap dark:border-slate-800/70">
                        {vendorNeeded > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-2.5 py-1 font-mono text-xs font-black text-amber-800 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
                            <ShoppingBag className="h-3 w-3 text-amber-600 flex-shrink-0" />
                            {vendorNeeded.toFixed(2)}{" "}
                            <span className="text-[10px] font-bold uppercase opacity-80">{unit}</span>
                          </span>
                        ) : isFullyCovered ? (
                          <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" /> Covered
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 whitespace-nowrap dark:border-slate-800/70">
                        {row.earliest_expiry ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            {formatIndianDateTime(row.earliest_expiry)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 whitespace-nowrap dark:border-slate-800/70">
                        <div className="flex flex-col gap-1.5 items-start">
                          <FreshnessBadge status={row.freshness_status} />
                          <NextActionBadge code={row.next_action_code} />
                        </div>
                      </td>

                      <td className="sticky right-0 z-10 border-b border-l border-slate-100 bg-white/95 px-5 py-4 text-right whitespace-nowrap shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.25)] backdrop-blur-md group-hover:bg-slate-50/95 dark:border-slate-800/70 dark:bg-slate-950/95 dark:group-hover:bg-slate-900/95">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isClosed && (
                            <Button
                              size="sm"
                              onClick={() => setAddStockProduct(row)}
                              className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all inline-flex items-center gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Stock
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedProduct(row)}
                            className="h-8 rounded-xl border-slate-200/80 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 active:scale-95 transition-all inline-flex items-center gap-1"
                          >
                            <Boxes className="h-3.5 w-3.5" />
                            View Lots
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>


      {/* Add Stock Dialog */}
      {addStockProduct && (
        <AddStockDialog
          product={addStockProduct}
          warehouseId={warehouseId || inventoryData?.warehouse_id}
          operationId={operationId}
          isClosed={isClosed}
          onClose={() => setAddStockProduct(null)}
          onStockAdded={() => {
            summaryQuery.refetch();
          }}
        />
      )}

      {/* Lot Inspection Drawer / Modal */}
      {selectedProduct && (
        <ProductLotsDrawer
          product={selectedProduct}
          warehouseId={warehouseId || inventoryData?.warehouse_id}
          isClosed={isClosed}
          onClose={() => setSelectedProduct(null)}
          onAddStock={() => {
            setAddStockProduct(selectedProduct);
          }}
          onAction={(lot, action) => {
            setActionDialog({ open: true, lot, action });
            setActionQuantity("");
            setActionReason("");
          }}
          onViewMovements={(lot) => setViewMovementsLot(lot)}
        />
      )}

      {/* Lot Action Dialog (Waste / Quarantine / Adjust) */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, lot: null, action: null })}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {actionDialog.action === "waste" && <Trash2 className="h-5 w-5 text-rose-500" />}
              {actionDialog.action === "quarantine" && <ShieldAlert className="h-5 w-5 text-amber-500" />}
              {actionDialog.action === "release_quarantine" && <ShieldCheck className="h-5 w-5 text-emerald-500" />}
              {actionDialog.action === "adjust" && <Sliders className="h-5 w-5 text-blue-500" />}
              <span>
                {actionDialog.action === "waste" && "Record Physical Waste"}
                {actionDialog.action === "quarantine" && "Quarantine Inventory Lot"}
                {actionDialog.action === "release_quarantine" && "Release Lot Quarantine"}
                {actionDialog.action === "adjust" && "Manual Stock Adjustment"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
              <p className="font-bold text-slate-900 dark:text-white">
                Lot #{actionDialog.lot?.id?.slice(0, 8)} · {actionDialog.lot?.unit}
              </p>
              <p className="text-slate-500">
                Available: {Number(actionDialog.lot?.available_quantity || 0)} {actionDialog.lot?.unit} | Reserved: {Number(actionDialog.lot?.reserved_quantity || 0)} {actionDialog.lot?.unit}
              </p>
            </div>

            {["waste", "adjust"].includes(actionDialog.action) && (
              <div>
                <Label className="text-xs font-bold">
                  {actionDialog.action === "waste" ? "Waste Quantity" : "Adjustment Quantity (±)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={actionQuantity}
                  onChange={(e) => setActionQuantity(e.target.value)}
                  placeholder={actionDialog.action === "waste" ? "e.g. 1.5" : "e.g. +2.0 or -1.0"}
                  className="mt-1 rounded-xl"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-bold">Reason / Note</Label>
              <Input
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Explain why this action is being taken..."
                className="mt-1 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setActionDialog({ open: false, lot: null, action: null })} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleExecuteLotAction} className="rounded-xl">
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lot Movements Audit Modal */}
      {viewMovementsLot && (
        <LotMovementsModal lot={viewMovementsLot} onClose={() => setViewMovementsLot(null)} />
      )}
    </div>
  );
}

function AddStockDialog({ product, warehouseId, operationId, isClosed, onClose, onStockAdded }) {
  const toast = useToast();
  const { addStockMutation } = useDailyOperationsMutations(operationId);

  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [batchReference, setBatchReference] = useState("");
  const [reason, setReason] = useState("Direct Mandi Purchase");
  const [customReason, setCustomReason] = useState("");
  const [useCustomExpiry, setUseCustomExpiry] = useState(false);
  const [customExpiry, setCustomExpiry] = useState("");
  const [autoReplan, setAutoReplan] = useState(true);

  const reasonPresets = [
    "Direct Mandi Purchase",
    "Physical Count Correction",
    "Farmer Direct Delivery",
    "Opening Stock Balance",
    "Excess Morning Inward",
    "Other",
  ];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast.error("Invalid Quantity", "Please enter a stock quantity greater than zero.");
      return;
    }

    const finalReason = reason === "Other" ? (customReason.trim() || "Manual stock addition") : reason;
    const costPaise = unitCost ? Math.round(parseFloat(unitCost) * 100) : null;

    try {
      await addStockMutation.mutateAsync({
        productId: product.product_id,
        payload: {
          warehouse_id: warehouseId,
          quantity: qty,
          unit_cost_paise: costPaise,
          batch_reference: batchReference.trim() || null,
          reason: finalReason,
          usable_until: useCustomExpiry && customExpiry ? new Date(customExpiry).toISOString() : null,
          daily_operation_id: operationId || null,
          auto_replan: autoReplan,
        },
      });

      toast.success("Stock Added", `Successfully added ${qty} ${product.tracking_unit || "units"} to warehouse.`);
      if (onStockAdded) onStockAdded();
      onClose();
    } catch (err) {
      toast.error("Failed to Add Stock", err?.response?.data?.message || err.message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-emerald-50/80 via-white to-slate-50 px-6 py-4 dark:border-slate-800 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <ProductAvatar item={product} size="md" fallbackIcon={Boxes} />
            <div>
              <DialogTitle className="text-base font-bold text-slate-950 dark:text-white">
                Add Stock: {product.product_name}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Tracking Unit: <strong className="uppercase text-emerald-600 dark:text-emerald-400">{product.tracking_unit || "KG"}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 text-xs">
          {/* Quantity Input */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Quantity to Inward <span className="text-rose-500">*</span>
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 10.50"
                className="h-10 rounded-xl pr-14 text-sm font-semibold"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {product.tracking_unit || "KG"}
                </span>
              </div>
            </div>
          </div>

          {/* Unit Cost (Optional) */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Unit Purchase Cost (₹ / {product.tracking_unit || "KG"}) <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-bold">
                ₹
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="e.g. 25.50"
                className="h-10 rounded-xl pl-8 text-sm"
              />
            </div>
          </div>

          {/* Reason Preset Chips */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Source / Reason
            </Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {reasonPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                    reason === preset
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-bold dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            {reason === "Other" && (
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify reason or note..."
                className="mt-2 h-9 rounded-xl"
              />
            )}
          </div>

          {/* Batch / Reference (Optional) */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Batch Reference / Invoice Code <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              value={batchReference}
              onChange={(e) => setBatchReference(e.target.value)}
              placeholder="e.g. MANDI-INV-8910 or leave blank for auto"
              className="mt-1 h-9 rounded-xl font-mono text-xs"
            />
          </div>

          {/* Expiry Customization Toggle */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Freshness Policy auto-calculates expiry based on shelf life.
              </span>
              <button
                type="button"
                onClick={() => setUseCustomExpiry(!useCustomExpiry)}
                className="text-[11px] font-bold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {useCustomExpiry ? "Use Policy Default" : "Set Custom Expiry"}
              </button>
            </div>
            {useCustomExpiry && (
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  Custom Usable Until Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            )}
          </div>

          {/* Auto Allocate Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoReplan"
              checked={autoReplan}
              onChange={(e) => setAutoReplan(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
            />
            <label htmlFor="autoReplan" className="text-[11px] font-medium text-slate-600 dark:text-slate-400 select-none cursor-pointer">
              Auto-allocate to today&apos;s pending orders & reduce vendor purchase
            </label>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl"
              disabled={addStockMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addStockMutation.isPending}
              className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
            >
              {addStockMutation.isPending ? "Adding Stock..." : "Confirm & Inward Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductLotsDrawer({ product, warehouseId, isClosed, onClose, onAddStock, onAction, onViewMovements }) {
  const productId = product?.product_id || product?.id;
  const lotsQuery = useInventoryLots(productId, { warehouseId });
  const lots = lotsQuery.data || [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-emerald-50/80 via-white to-slate-50 px-6 py-5 dark:border-slate-800 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-900">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <ProductAvatar item={product} size="lg" fallbackIcon={Boxes} />
              <div>
                <DialogTitle className="text-base font-bold text-slate-950 dark:text-white">
                  {product.product_name} · Physical Inventory Lots
                </DialogTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tracking Unit: <strong className="uppercase">{product.tracking_unit}</strong> · FEFO (Earliest Usable First)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isClosed && onAddStock && (
                <Button
                  size="sm"
                  onClick={onAddStock}
                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Stock
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => lotsQuery.refetch()} className="rounded-xl">
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", lotsQuery.isFetching && "animate-spin")} />
                Refresh Lots
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-100px)] space-y-3 overflow-y-auto p-6 thin-scrollbar">
          {lotsQuery.isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500" />
              <p className="mt-2 text-xs font-semibold">Loading lots...</p>
            </div>
          ) : lotsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
              <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-300">Failed to load inventory lots</p>
              <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80">
                {lotsQuery.error?.response?.data?.message || lotsQuery.error?.message || "An error occurred while fetching lots."}
              </p>
              <Button size="sm" variant="outline" onClick={() => lotsQuery.refetch()} className="mt-4 rounded-xl">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : lots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <Boxes className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">No physical lots recorded</p>
              <p className="text-xs text-slate-500">Stock will appear here when goods are inwarded or checked in from vendors.</p>
            </div>
          ) : (
            lots.map((lot) => {
              const free = Number(lot.available_quantity || 0) - Number(lot.reserved_quantity || 0);
              const isQuarantined = lot.status === "quarantined";
              const isExpired = lot.status === "expired" || (lot.usable_until && new Date(lot.usable_until) <= new Date());

              return (
                <div
                  key={lot.id}
                  className={cn(
                    "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-950",
                    isQuarantined && "border-amber-300 bg-amber-50/20 dark:border-amber-800",
                    isExpired && "border-rose-300 bg-rose-50/20 dark:border-rose-800"
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          Lot #{lot.id.slice(0, 8)}
                        </span>
                        <FreshnessBadge status={lot.freshness_status || lot.status} />
                        {lot.unit_cost_paise > 0 && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Cost: {formatPaiseToRupees(lot.unit_cost_paise)} / {lot.unit}
                          </span>
                        )}
                        {lot.batch_reference && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Ref: {lot.batch_reference}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>Received: {lot.received_at ? formatIndianDateTime(lot.received_at) : "—"}</span>
                        <span>Usable Until: <strong>{lot.usable_until ? formatIndianDateTime(lot.usable_until) : "—"}</strong></span>
                        {lot.creator && (
                          <span className="text-slate-600 dark:text-slate-400">
                            Inwarded by: <strong>{lot.creator.name || lot.creator.email}</strong> ({lot.creator.role || "Admin"})
                          </span>
                        )}
                        {lot.remaining_freshness_hours != null && (
                          <span className={cn(
                            "font-bold",
                            lot.remaining_freshness_hours < 12 ? "text-rose-600" : "text-emerald-600"
                          )}>
                            ({lot.remaining_freshness_hours.toFixed(1)}h remaining)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewMovements(lot)}
                        className="h-8 rounded-lg text-xs"
                      >
                        <History className="mr-1 h-3.5 w-3.5" />
                        Ledger
                      </Button>
                      {!isClosed && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAction(lot, "waste")}
                            disabled={free <= 0}
                            className="h-8 rounded-lg text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Waste
                          </Button>
                          {isQuarantined ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction(lot, "release_quarantine")}
                              className="h-8 rounded-lg text-xs text-emerald-600"
                            >
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Release
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction(lot, "quarantine")}
                              disabled={Number(lot.reserved_quantity) > 0}
                              className="h-8 rounded-lg text-xs text-amber-600"
                            >
                              <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                              Quarantine
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAction(lot, "adjust")}
                            className="h-8 rounded-lg text-xs"
                          >
                            <Sliders className="mr-1 h-3.5 w-3.5" />
                            Adjust
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Lot Balances Grid */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:grid-cols-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">Received</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {lot.received_quantity} {lot.unit}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">Available</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {lot.available_quantity} {lot.unit}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">Reserved</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {lot.reserved_quantity} {lot.unit}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">Consumed</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {lot.consumed_quantity} {lot.unit}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">Waste</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {lot.waste_quantity} {lot.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LotMovementsModal({ lot, onClose }) {
  const movementsQuery = useInventoryLotMovements(lot.id);
  const movements = movementsQuery.data || [];

  const getMovementBadge = (type) => {
    switch (type) {
      case "manual_inward":
        return { label: "Manual Inward", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
      case "vendor_receipt":
        return { label: "Vendor Receipt", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" };
      case "order_reservation":
        return { label: "Order Reservation", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" };
      case "reservation_release":
        return { label: "Reservation Released", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
      case "packing_consumption":
        return { label: "Packed / Consumed", className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" };
      case "waste":
        return { label: "Waste Recorded", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" };
      case "manual_adjustment":
        return { label: "Manual Adjustment", className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300" };
      case "quarantine":
        return { label: "Quarantined", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
      case "release_quarantine":
        return { label: "Quarantine Released", className: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" };
      case "expiry":
        return { label: "Expired", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" };
      default:
        return { label: String(type || "Movement").replace(/_/g, " "), className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" };
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              <div>
                <DialogTitle className="text-base font-bold">
                  Audit History: Lot #{lot.id.slice(0, 8)}
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Unit: {lot.unit} · Initial Inward: {lot.received_quantity} {lot.unit}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => movementsQuery.refetch()} className="rounded-xl">
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", movementsQuery.isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(85vh-90px)] space-y-3 overflow-y-auto p-6 thin-scrollbar">
          {movementsQuery.isLoading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500" />
              <p className="mt-2 text-xs">Loading audit ledger...</p>
            </div>
          ) : movements.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">No movement events logged for this lot.</p>
          ) : (
            movements.map((movement) => {
              const badge = getMovementBadge(movement.movement_type);
              const isPositive = ["manual_inward", "vendor_receipt", "reservation_release", "release_quarantine"].includes(movement.movement_type);

              return (
                <div
                  key={movement.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider", badge.className)}>
                          {badge.label}
                        </span>
                        <span className={cn("font-mono text-xs font-black", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300")}>
                          {isPositive ? "+" : ""}{movement.quantity} {movement.unit}
                        </span>
                      </div>

                      {movement.reason && (
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {movement.reason}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-500">
                        {movement.creator ? (
                          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            By: <strong>{movement.creator.name || movement.creator.email}</strong> ({movement.creator.role || "User"})
                          </span>
                        ) : (
                          <span className="text-slate-400">System automated</span>
                        )}
                        <span>·</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatIndianDateTime(movement.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-right text-[11px] dark:bg-slate-900">
                      <span className="block text-[9px] font-bold uppercase text-slate-400">Available Balance</span>
                      <span className="font-mono text-slate-500">
                        {movement.previous_available_quantity} → <strong className="text-slate-900 dark:text-white">{movement.new_available_quantity}</strong> {movement.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

