import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PremiumWorkspaceHelper } from "../../../../components/common/premium-workspace-helper";
import {
  Lock,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  CheckSquare,
  Users,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Zap,
  Activity,
  Cpu,
} from "lucide-react";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { StatusBadge } from "../../../../components/common/status-badge";
import { formatPaiseToRupees, mapEventToFriendlyLabel } from "../../../../utils/daily-operations-helpers";
import { normalizeAutomationCapabilities } from "../../../../utils/daily-operations-normalizers";

const STAGE_ICON_MAP = {
  order_lock: Lock,
  procurement: ShoppingCart,
  packing: Package,
  dispatch: Truck,
  delivery: CheckCircle2,
  exceptions: AlertTriangle,
  reconciliation: Receipt,
  daily_close: CheckSquare,
};

const STAGE_ACCENT_BAR = {
  completed: "bg-gradient-to-r from-emerald-500 to-teal-500",
  in_progress: "bg-gradient-to-r from-blue-500 to-indigo-500",
  attention: "bg-gradient-to-r from-amber-500 to-orange-500",
  not_started: "bg-slate-300 dark:bg-slate-700",
};

function getStageStatusVariant(status) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900";
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900";
    case "attention":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900";
    case "not_started":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
  }
}

export function ControlCenter({
  overview,
  deliveryDate,
  warehouseId,
  onSelectTab,
  isAdmin,
  capabilitiesRaw,
}) {
  const navigate = useNavigate();

  const capabilities = useMemo(() => {
    return normalizeAutomationCapabilities(capabilitiesRaw || overview?.automation_capabilities);
  }, [capabilitiesRaw, overview]);

  const {
    stages = [],
    order_metrics: orderMetrics = {},
    procurement_metrics: procMetrics = {},
    delivery_run_metrics: runMetrics = {},
    exception_metrics: excMetrics = {},
    reconciliation_metrics: recMetrics = {},
    delivery_partner_workload: partnerWorkload = [],
    financial_summary: finSummary = null,
    operation = {},
  } = overview || {};

  const statusCounts = orderMetrics.status_counts || {};

  // Compute automation/confirmation metrics
  const autoCompletedCount = useMemo(() => {
    let count = 0;
    if (capabilities.automatic_operation_open) count++;
    if (capabilities.automatic_order_lock) count++;
    if (capabilities.automatic_exception_detection) count++;
    if (capabilities.automatic_cod_reconciliation && recMetrics.cod_variance_paise === 0) count++;
    if (capabilities.automatic_operation_close && operation.status === "closed") count++;
    return count;
  }, [capabilities, recMetrics, operation]);

  const physicalConfirmationsCount = useMemo(() => {
    let count = 0;
    // Procurement confirms required
    if (procMetrics.total_items > 0 && procMetrics.pending_items > 0) {
      count += procMetrics.pending_items;
    }
    // Packing confirms required (not packed count)
    const totalToPack = orderMetrics.total_orders ?? 0;
    const packedCount = statusCounts.packed ?? 0;
    const unpacked = totalToPack - packedCount;
    if (unpacked > 0) {
      count += unpacked;
    }
    // Run dispatches waiting
    const unhandedRuns = runMetrics.total_runs - (runMetrics.dispatched_runs || 0);
    if (unhandedRuns > 0) {
      count += unhandedRuns;
    }
    return count;
  }, [procMetrics, orderMetrics, statusCounts, runMetrics]);

  const exceptionsCount = excMetrics.total_open_exceptions || 0;

  // Determine Recommended Next Action
  const nextAction = useMemo(() => {
    const isClosed = operation.status === "closed";
    if (isClosed) {
      return {
        title: "Operations Closed",
        message: "No action required — operations are closed for today.",
        tab: "exceptions-close",
        severity: "info",
      };
    }

    // 1. Check open exceptions
    if (exceptionsCount > 0) {
      return {
        title: "Resolve Exceptions",
        message: `Resolve ${exceptionsCount} open operational exception(s) hindering operations.`,
        tab: "exceptions-close",
        severity: "attention",
      };
    }

    // 2. Check procurement receipt
    if (procMetrics.total_items > 0 && procMetrics.pending_items > 0) {
      return {
        title: "Confirm Procurement Receipt",
        message: "vegetable stock has arrived. Confirm Mandi purchases and shortages.",
        tab: "procurement",
        severity: "action",
      };
    }

    // 3. Check packing
    const totalToPack = orderMetrics.total_orders ?? 0;
    const packedCount = statusCounts.packed ?? 0;
    const readyToPack = totalToPack - packedCount;
    if (readyToPack > 0) {
      return {
        title: "Pack Orders",
        message: `${readyToPack} customer orders are locked and ready to pack.`,
        tab: "packing",
        severity: "action",
      };
    }

    // 4. Proposed Delivery Plan
    if (runMetrics.total_runs === 0 && totalToPack > 0) {
      return {
        title: "Review Generated Delivery Plan",
        message: "Rider dispatch runs need to be planned or generated.",
        tab: "dispatch",
        severity: "action",
      };
    }

    // 5. COD Variances
    if (recMetrics.cod_variance_paise && recMetrics.cod_variance_paise !== 0) {
      return {
        title: "Resolve COD Variances",
        message: "Cash variances detected on driver handovers. Reconcile differences.",
        tab: "exceptions-close",
        severity: "attention",
      };
    }

    // 6. Close readiness
    const canClose = overview?.can_close || recMetrics.can_close;
    if (canClose) {
      return {
        title: "Close Daily Operations",
        message: "All checklist conditions passed. Operations are ready to close.",
        tab: "exceptions-close",
        severity: "success",
      };
    }

    return {
      title: "All Work Complete",
      message: "No action required — waiting for order lock cutoff.",
      tab: "control",
      severity: "info",
    };
  }, [operation, exceptionsCount, procMetrics, orderMetrics, statusCounts, runMetrics, recMetrics, overview]);

  const handleOpsOrdersLink = (statusFilter, extraParams = {}) => {
    const params = new URLSearchParams();
    if (deliveryDate) params.set("delivery_date", deliveryDate);
    if (warehouseId) params.set("warehouse_id", warehouseId);
    if (statusFilter) params.set("status", statusFilter);

    Object.entries(extraParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        params.set(k, v);
      }
    });

    navigate(`/ops/orders?${params.toString()}`);
  };

  if (!overview) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No active operations data found. Please select a valid Date & Warehouse.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PremiumWorkspaceHelper
        title="Control Center Step-by-Step Guide"
        description="Follow these easy steps to see what is happening in the store today."
        steps={[
          {
            title: "Check Action Box",
            instruction: "Look at the 'Recommended Next Action' box. It tells you the most important task to do right now.",
          },
          {
            title: "Press Quick Buttons",
            instruction: "If the next action has a button, click it! It will open the exact workspace you need.",
          },
          {
            title: "Watch Stage Colors",
            instruction: "Green stages are completed. Blue stages are in-progress. Slate/gray stages are not started.",
          },
          {
            title: "Review Alert Timelines",
            instruction: "Check the 'Timeline' box at the bottom to see who performed which action today.",
          },
        ]}
      />

      {/* Control Center Summary & Next Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Next Action */}
        <Card className="lg:col-span-2 p-5 border-dailyveg-200 bg-gradient-to-br from-white to-dailyveg-50/20 dark:border-dailyveg-800 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Cpu className="h-24 w-24" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-dailyveg-600 bg-dailyveg-50 dark:bg-dailyveg-950 px-2.5 py-1 rounded-lg">
              ✨ recommended next action
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-3.5 flex items-center gap-2">
              {nextAction.severity === "attention" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              {nextAction.severity === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {nextAction.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium">
              {nextAction.message}
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            {nextAction.tab !== "control" && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-dailyveg-500 to-dailyveg-600 hover:from-dailyveg-600 hover:to-dailyveg-700 text-white font-bold rounded-xl shadow-md shadow-dailyveg-500/20 gap-1.5"
                onClick={() => onSelectTab(nextAction.tab)}
              >
                Go to Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </Card>

        {/* Operational Flow Stats */}
        <Card className="p-5 space-y-4">
          <h4 className="font-bold text-slate-950 dark:text-white text-xs uppercase tracking-wider">
            Operational Checkpoints
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 block uppercase">
                System Handled
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-300 mt-1 block">
                {autoCompletedCount}
              </span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50">
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 block uppercase">
                Needs Confirms
              </span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-300 mt-1 block">
                {physicalConfirmationsCount}
              </span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-100 dark:border-rose-900/50">
              <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 block uppercase">
                Attention Required
              </span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-300 mt-1 block">
                {exceptionsCount}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Automation Capabilities Health Card */}
      {/* <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-2 border-b pb-3 mb-3 border-slate-100 dark:border-slate-900">
          <Cpu className="h-4.5 w-4.5 text-dailyveg-600" />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Backend Automation & Capabilities Status
            </h4>
            <p className="text-[11px] text-slate-500">
              Automation status gated by the capability endpoints.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {Object.entries(capabilities).map(([key, val]) => (
            <div
              key={key}
              className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between gap-1.5 ${
                val
                  ? "bg-emerald-50/50 text-emerald-800 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900"
                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
              }`}
            >
              <span className="truncate" title={key.replace(/_/g, " ")}>
                {key.replace(/_/g, " ")}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${val ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
              />
            </div>
          ))}
        </div>
      </Card> */}

      {/* Workflow Stage Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-dailyveg-600" />
            Operational Workflow Stages
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map((stage) => {
            const IconComponent = STAGE_ICON_MAP[stage.key] || Layers;
            const badgeStyle = getStageStatusVariant(stage.status);
            const barStyle = STAGE_ACCENT_BAR[stage.status] || STAGE_ACCENT_BAR.not_started;

            // Map stage keys to tabs
            let targetTab = "control";
            if (stage.key === "procurement") targetTab = "procurement";
            else if (stage.key === "packing") targetTab = "packing";
            else if (stage.key === "dispatch" || stage.key === "delivery") targetTab = "dispatch";
            else if (
              stage.key === "exceptions" ||
              stage.key === "reconciliation" ||
              stage.key === "daily_close"
            ) {
              targetTab = "exceptions-close";
            }

            return (
              <div
                key={stage.key}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-dailyveg-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-950 dark:hover:border-dailyveg-800 flex flex-col justify-between"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${barStyle}`} />
                <div>
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-transform group-hover:scale-110 dark:bg-slate-900 dark:text-slate-300 group-hover:bg-dailyveg-50 group-hover:text-dailyveg-600 dark:group-hover:bg-dailyveg-950">
                      <IconComponent className="h-5 w-5" />
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeStyle}`}>
                      {stage.status ? stage.status.replace("_", " ") : "not started"}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{stage.label}</h3>
                  {stage.message && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {stage.message}
                    </p>
                  )}

                  {typeof stage.completed_count === "number" && typeof stage.total_count === "number" && (
                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center justify-between">
                      <span>Progress:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {stage.completed_count} / {stage.total_count}
                      </span>
                    </div>
                  )}

                  {stage.blockers && stage.blockers.length > 0 && (
                    <div className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-lg">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {stage.blockers.length} blocker{stage.blockers.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-900 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs font-bold text-dailyveg-600 hover:text-dailyveg-700 hover:bg-dailyveg-50 dark:hover:bg-dailyveg-950/50 gap-1 p-1.5 h-auto rounded-lg"
                    onClick={() => onSelectTab(targetTab)}
                  >
                    View Workspace <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Metrics Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Daily Operational Metrics
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Click card to filter orders</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          <button
            type="button"
            onClick={() => handleOpsOrdersLink("")}
            className="group text-left rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-dailyveg-400 hover:shadow-brand dark:border-slate-800/80 dark:bg-slate-950"
          >
            <div className="text-xs text-slate-500 font-semibold">Total Orders</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-dailyveg-600 transition-colors">
              {orderMetrics.total_orders ?? 0}
            </div>
            <div className="text-[10px] font-bold text-dailyveg-600 mt-2 flex items-center gap-0.5">
              Open List <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleOpsOrdersLink("locked")}
            className="group text-left rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400 dark:border-slate-800/80 dark:bg-slate-950"
          >
            <div className="text-xs text-slate-500 font-semibold">Locked</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {orderMetrics.locked_count ?? statusCounts.locked ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-medium">Finalized Demand</div>
          </button>

          <button
            type="button"
            onClick={() => handleOpsOrdersLink("placed")}
            className="group text-left rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 dark:border-slate-800/80 dark:bg-slate-950"
          >
            <div className="text-xs text-slate-500 font-semibold">Unlocked</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {orderMetrics.unlocked_count ?? statusCounts.placed ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-medium">Draft Placed State</div>
          </button>

          <button
            type="button"
            onClick={() => handleOpsOrdersLink("accepted")}
            className="group text-left rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 dark:border-slate-800/80 dark:bg-slate-950"
          >
            <div className="text-xs text-slate-500 font-semibold">Packing</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {statusCounts.accepted ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-medium">Being Packed</div>
          </button>

          <button
            type="button"
            onClick={() => handleOpsOrdersLink("packed")}
            className="group text-left rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 dark:border-slate-800/80 dark:bg-slate-950"
          >
            <div className="text-xs text-slate-500 font-semibold">Packed</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {statusCounts.packed ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-medium">Ready for Dispatch</div>
          </button>

          <button
            type="button"
            onClick={() => handleOpsOrdersLink("out_for_delivery")}
            className="group text-left rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 dark:border-slate-800/80 dark:bg-slate-950"
          >
            <div className="text-xs text-slate-500 font-semibold">Dispatched</div>
            <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
              {statusCounts.out_for_delivery ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-medium">With Riders</div>
          </button>
        </div>
      </div>

      {/* Admin Cost Overview - Compact */}
      {isAdmin && finSummary && (
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="flex items-center justify-between border-b pb-2 mb-3 border-slate-100 dark:border-slate-900">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Financial Snapshot
            </h4>
            <Link to="/admin/cost" className="text-xs text-dailyveg-600 font-bold hover:underline">
              Manage Costs & Profitability →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
            <div className="bg-slate-50/50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block font-medium">Total Sales</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {formatPaiseToRupees(finSummary.total_sales_paise)}
              </span>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block font-medium">Expected COD</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {formatPaiseToRupees(finSummary.cod_expected_paise)}
              </span>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block font-medium">Procurement Cost</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {formatPaiseToRupees(finSummary.procurement_cost_paise)}
              </span>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block font-medium">Operations Cost</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {formatPaiseToRupees(finSummary.total_cost_paise)}
              </span>
            </div>
            <div className="lg:col-span-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold">
                Operating Margin
              </span>
              <span className="font-black text-sm text-emerald-600 dark:text-emerald-300">
                {formatPaiseToRupees(finSummary.estimated_margin_paise)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Audit Event Log */}
      <Card className="p-5">
        <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-dailyveg-600" />
          Recent Audit Event Timeline
        </h4>

        {stages.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No recent audit events.</p>
        ) : (
          <div className="space-y-3 relative pl-4 border-l border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[250px] thin-scrollbar">
            {(operation.events || []).slice(0, 10).map((evt, idx) => (
              <div key={evt.id || idx} className="relative group">
                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-dailyveg-500 bg-white dark:bg-slate-950" />
                <div className="text-xs ms-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {mapEventToFriendlyLabel(evt.event_type)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {evt.created_at ? new Date(evt.created_at).toLocaleTimeString("en-IN") : ""}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                    Actor: {evt.actor?.full_name || "System"}{evt.note ? ` — "${evt.note}"` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
