import React, { useState, useMemo } from "react";
import { PremiumWorkspaceHelper } from "../../../../components/common/premium-workspace-helper";
import { Link } from "react-router-dom";
import {
  Truck,
  Plus,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Trash2,
  UserCheck,
  Package,
  Layers,
  FileText,
  Cpu,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { StatusBadge } from "../../../../components/common/status-badge";
import { PremiumSelect } from "../../../../components/ui/premium-select";
import { useToast } from "../../../../components/toast/toast-context";
import {
  formatPaiseToRupees,
  filterEligibleRunOrders,
} from "../../../../utils/daily-operations-helpers";
import { normalizeAutomationCapabilities } from "../../../../utils/daily-operations-normalizers";
import { getDailyOrderLabel, getPrimaryOrderLabel } from "../../../../utils/order-identifier";
import { RunManifestPrint } from "../print/run-manifest-print";
import { DailyOperationsService } from "../../../../api/services/daily-operations.service";
import { useDailyOperationsProposedDeliveryPlan } from "../../../../api/services/daily-operations.hooks";

export function DispatchTab({
  runsData,
  isLoading,
  operation,
  isClosed,
  deliveryPartners = [],
  opsOrders = [],
  onCreateRun,
  onUpdateRun,
  onAddRunOrders,
  onRemoveRunOrder,
  onReorderRunOrders,
  onHandoverRun,
  onGeneratePlan,
  onApprovePlan,
  isCreatingRun,
  isHandingOver,
  isGeneratingPlan,
  isApprovingPlan,
  capabilitiesRaw,
}) {
  const toast = useToast();
  
  const capabilities = useMemo(() => {
    return normalizeAutomationCapabilities(capabilitiesRaw || operation?.automation_capabilities);
  }, [capabilitiesRaw, operation]);

  const [selectedRunId, setSelectedRunId] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Toggle manual override view for planning mode
  const [manualOverrideActive, setManualOverrideActive] = useState(false);

  // Proposed plan query
  const operationId = operation.id || null;
  const { data: proposedPlan, isLoading: isLoadingProposedPlan } = useDailyOperationsProposedDeliveryPlan(operationId, {
    enabled: Boolean(operationId && capabilities.delivery_plan_generation),
  });

  // Print state
  const [printingRunDetail, setPrintingRunDetail] = useState(null);

  // Create Run Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createPartnerId, setCreatePartnerId] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  // Add Orders Modal state
  const [isAddOrdersOpen, setIsAddOrdersOpen] = useState(false);
  const [selectedOrderIdsToAdd, setSelectedOrderIdsToAdd] = useState([]);

  const runsList = runsData?.runs || runsData || [];

  // All order IDs already in any run
  const allRunOrders = useMemo(() => {
    const list = [];
    runsList.forEach((r) => {
      if (Array.isArray(r.run_orders)) {
        list.push(...r.run_orders);
      }
    });
    return list;
  }, [runsList]);

  // Eligible packed orders not in any run
  const eligiblePackedOrders = useMemo(() => {
    return filterEligibleRunOrders(opsOrders, allRunOrders);
  }, [opsOrders, allRunOrders]);

  const loadRunDetail = async (runId) => {
    setSelectedRunId(runId);
    setLoadingDetail(true);
    try {
      const data = await DailyOperationsService.getDeliveryRunDetail(runId);
      setRunDetail(data?.run || data);
    } catch (err) {
      toast.error("Failed to load run details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateRun = async () => {
    if (!createPartnerId || !createPartnerId.trim()) {
      toast.error("Please select a delivery partner");
      return;
    }

    try {
      await onCreateRun({
        warehouse_id: operation.warehouse_id,
        delivery_date: operation.delivery_date,
        delivery_partner_user_id: createPartnerId,
        notes: createNotes || null,
      });
      toast.success("Delivery run created!");
      setIsCreateOpen(false);
      setCreatePartnerId("");
      setCreateNotes("");
    } catch (err) {
      toast.error(err?.message || "Failed to create delivery run");
    }
  };

  const handleAddOrdersSubmit = async () => {
    if (!selectedRunId || selectedOrderIdsToAdd.length === 0) return;

    try {
      await onAddRunOrders({
        runId: selectedRunId,
        payload: { order_ids: selectedOrderIdsToAdd },
      });
      toast.success(`Added ${selectedOrderIdsToAdd.length} order(s) to run`);
      setIsAddOrdersOpen(false);
      setSelectedOrderIdsToAdd([]);
      loadRunDetail(selectedRunId);
    } catch (err) {
      toast.error(err?.message || "Failed to add orders to run");
    }
  };

  const handleRemoveOrder = async (orderId) => {
    if (!selectedRunId) return;

    try {
      await onRemoveRunOrder({ runId: selectedRunId, orderId });
      toast.success("Order removed from run");
      loadRunDetail(selectedRunId);
    } catch (err) {
      toast.error(err?.message || "Failed to remove order from run");
    }
  };

  const handleMoveOrder = async (index, direction) => {
    if (!runDetail || !runDetail.orders) return;
    const currentOrders = [...runDetail.orders];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= currentOrders.length) return;

    const temp = currentOrders[index];
    currentOrders[index] = currentOrders[targetIndex];
    currentOrders[targetIndex] = temp;

    const fullOrderedIds = currentOrders.map((o) => o.id);

    try {
      await onReorderRunOrders({
        runId: selectedRunId,
        payload: { order_ids: fullOrderedIds },
      });
      toast.success("Sequence updated");
      setRunDetail({ ...runDetail, orders: currentOrders });
    } catch (err) {
      toast.error("Failed to reorder run orders");
    }
  };

  const handleHandover = async (runId) => {
    try {
      await onHandoverRun(runId);
      toast.success("Delivery run handed over!");
      if (selectedRunId === runId) {
        loadRunDetail(runId);
      }
    } catch (err) {
      toast.error(err?.message || "Handover failed. Ensure run contains packed orders.");
    }
  };

  const handleGeneratePlan = async () => {
    try {
      const res = await onGeneratePlan();
      if (res?.warnings && res.warnings.length > 0) {
        toast.warning("Proposed Plan Warnings", res.warnings[0]);
      } else if (!res?.proposed_runs || res.proposed_runs.length === 0) {
        toast.warning("Proposed Plan Warnings", "No delivery plan runs were created. Check if you have packed orders and riders.");
      } else {
        toast.success("Proposed delivery plan generated successfully.");
      }
    } catch (err) {
      toast.error(err?.message || "Plan generation failed.");
    }
  };

  const handleApprovePlan = async () => {
    try {
      await onApprovePlan();
      toast.success("Proposed delivery plan approved and dispatch runs created.");
      setManualOverrideActive(true); // switch view to runs detail
    } catch (err) {
      toast.error(err?.message || "Plan approval failed.");
    }
  };

  const isPlanningMode = capabilities.delivery_plan_generation && !manualOverrideActive;

  return (
    <div className="space-y-4">
      <PremiumWorkspaceHelper
        title="Rider Dispatch Guide (Step-by-Step)"
        description="Follow these easy steps to group customer boxes and hand them over to delivery riders."
        steps={[
          {
            title: "Generate Route Plan",
            instruction: "Click 'Generate Plan' at the top to let the system automatically group orders into optimal rider runs.",
          },
          {
            title: "Review Rider Runs",
            instruction: "Check each rider's assigned run. See how many packages they have and where they are going.",
          },
          {
            title: "Approve the Plan",
            instruction: "If the assignments look correct, click the green 'Approve Plan' button to create active runs.",
          },
          {
            title: "Handover packages",
            instruction: "Select a run, print the sheet (manifest) for the rider, and click 'Rider Handover' when they collect.",
          },
        ]}
      />

      {/* Hidden Print Layout */}
      {printingRunDetail && <RunManifestPrint runDetail={printingRunDetail} />}

      {/* Planning Capability Diagnostics */}
      {!capabilities.delivery_plan_generation && (
        <Card className="p-3 bg-slate-50 dark:bg-slate-900 border text-slate-600 dark:text-slate-400 text-xs flex items-center gap-2">
          <Cpu className="h-4.5 w-4.5 text-slate-500" />
          <div>
            <span className="font-bold">Backend automation pending</span> — Proposed delivery plan generation is offline. Falling back to manual runs.
          </div>
        </Card>
      )}

      {/* Workspaces navigation: Proposed Plan vs Manual Runs */}
      {capabilities.delivery_plan_generation && (
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isPlanningMode ? "default" : "outline"}
              className="text-xs"
              onClick={() => setManualOverrideActive(false)}
            >
              Proposed Plan
            </Button>
            <Button
              size="sm"
              variant={!isPlanningMode ? "default" : "outline"}
              className="text-xs"
              onClick={() => setManualOverrideActive(true)}
            >
              Dispatch Board (Manual / Active)
            </Button>
          </div>

          <div className="text-xs text-slate-500 font-bold">
            Delivery Mode: <span className="text-dailyveg-600">Automated Dispatch</span>
          </div>
        </div>
      )}

      {/* WORKSPACE 1: Proposed Planning Mode */}
      {isPlanningMode && (
        <div className="space-y-6">
          <Card className="p-5 border-indigo-100 bg-gradient-to-br from-indigo-50/20 to-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-950 dark:text-white flex items-center gap-1.5">
                  <Cpu className="h-4.5 w-4.5 text-indigo-600" /> Automated Proposed Dispatch Plan
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  The system generates route sequences and assigns riders based on orders and coordinates.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                >
                  {proposedPlan ? "Regenerate Plan" : "Generate Plan"}
                </Button>

                {proposedPlan && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    onClick={handleApprovePlan}
                    disabled={isApprovingPlan}
                  >
                    Approve Plan & Create Runs
                  </Button>
                )}
              </div>
            </div>

            {/* proposedPlan Content */}
            {isLoadingProposedPlan ? (
              <p className="text-xs text-slate-500 text-center py-8">Retrieving proposed plan...</p>
            ) : !proposedPlan ? (
              <div className="text-center py-12 text-slate-500">
                <Truck className="h-10 w-10 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-semibold">No proposed plan generated yet.</p>
                <Button size="sm" className="mt-4 text-xs font-bold" onClick={handleGeneratePlan}>
                  Generate Initial Plan
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {/* Proposed runs metrics list */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(proposedPlan.proposed_runs || []).map((pRun, idx) => (
                    <Card key={idx} className="p-4 border-slate-200/80 bg-white dark:bg-slate-900/50 space-y-3 shadow-sm hover:border-indigo-400 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-indigo-600 uppercase tracking-wider">
                            Proposed Run #{idx + 1}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-950 dark:text-white mt-1">
                            {pRun.rider_name || "Unassigned Rider"}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 text-[10px] font-black rounded-lg">
                          {pRun.orders_count} Packages
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                        <div>
                          <span className="font-semibold">Areas:</span> {pRun.areas_covered?.join(", ") || "—"}
                        </div>
                        <div>
                          <span className="font-semibold">Expected COD:</span> {formatPaiseToRupees(pRun.expected_cod_paise)}
                        </div>
                        {pRun.estimated_duration_mins && (
                          <div>
                            <span className="font-semibold">Est. Duration:</span> {pRun.estimated_duration_mins} mins
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Unassigned orders & Warnings */}
                {proposedPlan.unassigned_orders_count > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" /> Warnings: Unassigned Orders Detected
                    </p>
                    <p>
                      {proposedPlan.unassigned_orders_count} packed order(s) could not be automatically assigned to any rider run due to rider capacity limits or geographical location.
                    </p>
                    <div className="pt-1.5 flex justify-end">
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-amber-300 hover:bg-amber-100/50 text-xs text-amber-900 font-bold"
                        onClick={() => setManualOverrideActive(true)}
                      >
                        Manually Override Runs
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* WORKSPACE 2: Manual / Active Dispatch board */}
      {!isPlanningMode && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-dailyveg-600" />
              Active Dispatch Runs & Rider Handover
            </h3>

            {!isClosed && (
              <Button
                size="sm"
                className="h-9 text-xs gap-1.5"
                onClick={() => setIsCreateOpen(true)}
                disabled={isCreatingRun}
              >
                <Plus className="h-4 w-4" /> Create Delivery Run
              </Button>
            )}
          </div>

          {runsList.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <Truck className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="font-medium">No delivery runs created yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Runs list column */}
              <div className="space-y-3 lg:col-span-1">
                {runsList.map((run) => {
                  const isSelected = selectedRunId === run.id;
                  const partnerName = run.delivery_partner?.full_name || run.delivery_partner?.phone || "Unassigned";
                  const orderCount = run.run_orders?.length ?? 0;

                  return (
                    <Card
                      key={run.id}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "border-dailyveg-500 shadow-md ring-1 ring-dailyveg-500"
                          : "border-slate-200/80 hover:border-dailyveg-300 dark:border-slate-800"
                      }`}
                      onClick={() => loadRunDetail(run.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {run.run_code || `RUN #${run.id.slice(0, 6)}`}
                          </span>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">{partnerName}</p>
                        </div>
                        <StatusBadge value={run.status || "draft"} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-900 font-semibold">
                        <span>{orderCount} Packages</span>
                        <span>COD expected: {formatPaiseToRupees(run.expected_cod_paise)}</span>
                      </div>

                      <div className="flex justify-end gap-1.5 mt-3">
                        {run.status === "ready" || run.status === "draft" ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHandover(run.id);
                            }}
                            disabled={isHandingOver}
                          >
                            Rider Handover
                          </Button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-black flex items-center gap-0.5 px-2 bg-emerald-50 rounded-lg">
                            <Check className="h-3 w-3" /> Dispatched
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Run detail column */}
              <div className="lg:col-span-2">
                {!selectedRunId ? (
                  <Card className="p-8 text-center text-slate-500">
                    <p className="text-xs font-semibold">Select a delivery run to view manifest details.</p>
                  </Card>
                ) : loadingDetail ? (
                  <Card className="p-8 text-center text-slate-500">Loading run detail...</Card>
                ) : !runDetail ? (
                  <Card className="p-8 text-center text-slate-500">Run detail unavailable.</Card>
                ) : (
                  <Card className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                            {runDetail.run_code || `RUN #${runDetail.id.slice(0, 6)}`}
                          </h4>
                          <StatusBadge value={runDetail.status || "draft"} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Rider: <span className="font-semibold text-slate-800 dark:text-slate-200">{runDetail.delivery_partner?.full_name || "Unassigned"}</span> (
                          {runDetail.delivery_partner?.phone || "—"})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isClosed && runDetail.status !== "handed_over" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => setIsAddOrdersOpen(true)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Orders
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => handlePrintManifest(runDetail)}
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Manifest
                        </Button>
                      </div>
                    </div>

                    {/* Orders check */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                        Rider Runs Package Manifest ({(runDetail.orders || []).length})
                      </span>

                      {(runDetail.orders || []).length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No orders added to run yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {(runDetail.orders || []).map((order, index) => {
                            const dailyLabel = getDailyOrderLabel(order);
                            const primaryLabel = getPrimaryOrderLabel(order);
                            const isCod = String(order.payment_method || "").toLowerCase() === "cod";

                            return (
                              <div
                                key={order.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold text-slate-400 w-5 text-center">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {dailyLabel && (
                                        <span className="font-bold text-dailyveg-700 dark:text-dailyveg-300 bg-dailyveg-100 dark:bg-dailyveg-950 px-1.5 py-0.5 rounded">
                                          {dailyLabel}
                                        </span>
                                      )}
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {primaryLabel}
                                      </span>
                                      <span className={`px-1.5 py-0.5 text-[9px] font-black rounded uppercase ${isCod ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                                        {isCod ? "COD" : "Prepaid"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {order.user?.full_name || order.delivery_name} · {order.delivery_area || "—"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  {!isClosed && runDetail.status !== "handed_over" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                                      onClick={() => handleRemoveOrder(order.id)}
                                      title="Remove from Run"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Advanced Manual Edit collapsible */}
                    {!isClosed && runDetail.status !== "handed_over" && (runDetail.orders || []).length > 1 && (
                      <div className="border-t pt-3 mt-3">
                        <details className="text-xs group">
                          <summary className="font-bold cursor-pointer text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
                            <Layers className="h-4 w-4" /> Advanced Route Sequence Override
                          </summary>
                          <div className="pl-6 pt-3 space-y-2">
                            <p className="text-[11px] text-slate-400">
                              Adjust rider delivery sequence sequence:
                            </p>
                            <div className="space-y-1.5">
                              {(runDetail.orders || []).map((order, idx) => (
                                <div key={order.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-900 p-2 rounded">
                                  <span>{idx + 1}. {getPrimaryOrderLabel(order)}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveOrder(idx, -1)}
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      disabled={idx === (runDetail.orders || []).length - 1}
                                      onClick={() => handleMoveOrder(idx, 1)}
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Delivery Run Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Delivery Run</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
              <p className="text-slate-500">
                Warehouse: <span className="font-semibold text-slate-900 dark:text-white">{operation?.warehouse_name}</span>
              </p>
              <p className="text-slate-500 mt-0.5">
                Delivery Date: <span className="font-semibold text-slate-900 dark:text-white">{operation?.delivery_date}</span>
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold">Select Delivery Partner (Rider)</Label>
              <PremiumSelect
                value={createPartnerId}
                onChange={(val) => setCreatePartnerId(val)}
                placeholder="Choose rider..."
                options={deliveryPartners.map((p) => ({
                  value: p.id,
                  label: `${p.full_name || p.phone}${p.phone ? ` (${p.phone})` : ""}`,
                }))}
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Run Notes</Label>
              <Input
                placeholder="Optional delivery instructions..."
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateRun} disabled={isCreatingRun || !createPartnerId}>
                {isCreatingRun ? "Creating..." : "Create Run"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Orders to Run Dialog */}
      <Dialog open={isAddOrdersOpen} onOpenChange={setIsAddOrdersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Packed Orders to Delivery Run</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Showing packed orders available for {operation?.delivery_date} not assigned to any run.
            </p>

            {eligiblePackedOrders.length === 0 ? (
              <p className="py-6 text-center text-slate-500">No unassigned packed orders available.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 border p-2 rounded-xl">
                {eligiblePackedOrders.map((o) => {
                  const dailyLabel = getDailyOrderLabel(o);
                  const primaryLabel = getPrimaryOrderLabel(o);
                  const isChecked = selectedOrderIdsToAdd.includes(o.id);

                  return (
                    <label
                      key={o.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIdsToAdd([...selectedOrderIdsToAdd, o.id]);
                            } else {
                              setSelectedOrderIdsToAdd(selectedOrderIdsToAdd.filter((id) => id !== o.id));
                            }
                          }}
                        />
                        {dailyLabel && <span className="font-bold text-dailyveg-700">{dailyLabel}</span>}
                        <span className="font-semibold text-slate-900 dark:text-white">{primaryLabel}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {o.user?.full_name || o.delivery_name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddOrdersOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddOrdersSubmit}
                disabled={selectedOrderIdsToAdd.length === 0}
              >
                Add Selected ({selectedOrderIdsToAdd.length}) Orders
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
