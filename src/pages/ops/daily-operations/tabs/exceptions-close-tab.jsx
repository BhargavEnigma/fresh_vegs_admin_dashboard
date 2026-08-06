import React, { useState, useMemo } from "react";
import { PremiumWorkspaceHelper } from "../../../../components/common/premium-workspace-helper";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Search,
  Receipt,
  Trash2,
  CheckSquare,
  Lock,
  RotateCcw,
  Printer,
  History,
  Save,
  Cpu,
  RefreshCw,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { StatusBadge } from "../../../../components/common/status-badge";
import { useToast } from "../../../../components/toast/toast-context";
import { PremiumSelect } from "../../../../components/ui/premium-select";
import {
  canReconcileRunCod,
  canResolveRunCodVariance,
  formatPaiseToRupees,
  parseDecimal,
  mapEventToFriendlyLabel,
} from "../../../../utils/daily-operations-helpers";
import { normalizeAutomationCapabilities, normalizeProductListResponse } from "../../../../utils/daily-operations-normalizers";
import { formatIndianDateTime } from "../../../../utils/date-formatter";
import { ClosingSummaryPrint } from "../print/closing-summary-print";

const SEVERITY_STYLES = {
  critical: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800",
  high: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-800",
  medium: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
  low: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800",
};

export function ExceptionsCloseTab({
  exceptionsData,
  isLoadingExceptions,
  operation,
  isClosed,
  isAdmin,
  onSelectTab,
  onCreateException,
  onUpdateException,
  isCreatingException,
  isUpdatingException,

  // Reconciliation
  reconciliationData,
  runsData,
  wasteData,
  products = [],
  onCreateWaste,
  onReconcileRun,
  onReconcileCodVariance,
  isCreatingWaste,
  isReconcilingCod,

  // Closing
  operationDetail,
  onSaveNotes,
  onCloseOperation,
  onReopenOperation,
  onEvaluateAutoClose,
  isSavingNotes,
  isClosing,
  isReopening,
  isEvaluatingAutoClose,
  capabilitiesRaw,
}) {
  const toast = useToast();
  const navigate = useNavigate();

  const capabilities = useMemo(() => {
    return normalizeAutomationCapabilities(capabilitiesRaw || operation?.automation_capabilities);
  }, [capabilitiesRaw, operation]);

  // Exception list states
  const [excSearchTerm, setExcSearchTerm] = useState("");
  const [excStatusFilter, setExcStatusFilter] = useState("all");

  // Create Exception Modal
  const [isExcCreateOpen, setIsExcCreateOpen] = useState(false);
  const [excCreateCategory, setExcCreateCategory] = useState("stuck_order");
  const [excCreateSeverity, setExcCreateSeverity] = useState("medium");
  const [excCreateTitle, setExcCreateTitle] = useState("");
  const [excCreateDescription, setExcCreateDescription] = useState("");

  // Resolve Exception Modal
  const [resolvingException, setResolvingException] = useState(null);
  const [excTargetStatus, setExcTargetStatus] = useState("resolved");
  const [excResolutionNote, setExcResolutionNote] = useState("");

  // Waste modal state
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [wasteProductId, setWasteProductId] = useState("");
  const [wastePackId, setWastePackId] = useState("");
  const [wasteQuantity, setWasteQuantity] = useState("");
  const [wasteReason, setWasteReason] = useState("spoilage");
  const [wasteEstimatedLossRupees, setWasteEstimatedLossRupees] = useState("");
  const [wasteNote, setWasteNote] = useState("");

  // Reconcile COD Variance Modal state
  const [reconcilingRun, setReconcilingRun] = useState(null);
  const [reportedCodRupees, setReportedCodRupees] = useState("");
  const [handedOverCodRupees, setHandedOverCodRupees] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");

  // Handover Note state
  const [handoverNote, setHandoverNote] = useState(operation?.handover_note || "");

  // Normal / Force Close Modal state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [forceCloseReason, setForceCloseReason] = useState("");
  const [isForceCloseMode, setIsForceCloseMode] = useState(false);

  // Reopen Modal state
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  // Print summary state
  const [printingSummary, setPrintingSummary] = useState(false);

  // Compute lists
  const exceptionsList = useMemo(() => {
    return Array.isArray(exceptionsData?.exceptions)
      ? exceptionsData.exceptions
      : Array.isArray(exceptionsData)
      ? exceptionsData
      : [];
  }, [exceptionsData]);

  // Sort exceptions: critical > high > medium > low. System-generated first.
  const sortedExceptions = useMemo(() => {
    const severityScore = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return [...exceptionsList].sort((a, b) => {
      // System generated vs manual (source_type !== undefined is often system)
      const aIsSystem = a.source_type ? 1 : 0;
      const bIsSystem = b.source_type ? 1 : 0;
      if (aIsSystem !== bIsSystem) return bIsSystem - aIsSystem;

      // Severity sort
      const aScore = severityScore[a.severity] || 0;
      const bScore = severityScore[b.severity] || 0;
      return bScore - aScore;
    });
  }, [exceptionsList]);

  const filteredExceptions = useMemo(() => {
    return sortedExceptions.filter((item) => {
      const matchStatus = excStatusFilter === "all" || item.status === excStatusFilter;
      const matchSearch =
        !excSearchTerm ||
        (item.title || "").toLowerCase().includes(excSearchTerm.toLowerCase()) ||
        (item.exception_code || "").toLowerCase().includes(excSearchTerm.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [sortedExceptions, excStatusFilter, excSearchTerm]);

  const recMetrics = reconciliationData?.reconciliation_metrics || {};
  const finSummary = reconciliationData?.financial_summary || null;
  const runsList = Array.isArray(runsData?.runs)
    ? runsData.runs
    : Array.isArray(runsData)
    ? runsData
    : [];
  const wasteList = Array.isArray(wasteData?.waste_entries)
    ? wasteData.waste_entries
    : Array.isArray(wasteData)
    ? wasteData
    : [];

  // Product List Response Normalization
  const normalizedProducts = useMemo(() => {
    return normalizeProductListResponse(products);
  }, [products]);

  // Find pack options for waste entry
  const selectedProductObj = useMemo(() => {
    return normalizedProducts.find((p) => p.id === wasteProductId);
  }, [normalizedProducts, wasteProductId]);
  const availablePacks = selectedProductObj?.packs || selectedProductObj?.product_packs || [];

  const canClose = reconciliationData?.can_close ?? operationDetail?.can_close ?? false;
  const blockers = reconciliationData?.blockers || operationDetail?.blockers || [];

  // Exception handlings
  const handleCreateException = async () => {
    if (!excCreateTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await onCreateException({
        category: excCreateCategory,
        severity: excCreateSeverity,
        title: excCreateTitle.trim(),
        description: excCreateDescription.trim() || null,
      });
      toast.success("Operational exception logged!");
      setIsExcCreateOpen(false);
      setExcCreateTitle("");
      setExcCreateDescription("");
    } catch (err) {
      toast.error(err?.message || "Failed to create exception");
    }
  };

  const handleResolveException = async () => {
    if (!resolvingException) return;
    try {
      await onUpdateException({
        exceptionId: resolvingException.id,
        payload: {
          status: excTargetStatus,
          resolution_note: excResolutionNote ? excResolutionNote.trim() : null,
        },
      });
      toast.success(`Exception marked as ${excTargetStatus}`);
      setResolvingException(null);
      setExcResolutionNote("");
    } catch (err) {
      toast.error(err?.message || "Failed to update exception status");
    }
  };

  // Reconcile COD variance
  const handleOpenReconcile = (run) => {
    setReconcilingRun(run);
    setReportedCodRupees(
      run.reported_cod_paise !== null && run.reported_cod_paise !== undefined
        ? (run.reported_cod_paise / 100).toString()
        : ""
    );
    setHandedOverCodRupees(
      run.handed_over_cod_paise !== null && run.handed_over_cod_paise !== undefined
        ? (run.handed_over_cod_paise / 100).toString()
        : ""
    );
    setReconcileNotes(run.notes || "");
  };

  const handleReconcileSubmit = async () => {
    if (!reconcilingRun) return;
    const reportedPaise = reportedCodRupees !== "" ? Math.round(parseFloat(reportedCodRupees) * 100) : null;
    const handedOverPaise = handedOverCodRupees !== "" ? Math.round(parseFloat(handedOverCodRupees) * 100) : null;

    try {
      if (canResolveRunCodVariance(reconcilingRun)) {
        await onReconcileCodVariance({
          runId: reconcilingRun.id,
          payload: { notes: reconcileNotes || null },
        });
        toast.success("COD variance resolved successfully.");
      } else {
        await onReconcileRun({
          runId: reconcilingRun.id,
          payload: {
            reported_cod_paise: reportedPaise,
            handed_over_cod_paise: handedOverPaise,
            notes: reconcileNotes || null,
          },
        });
        toast.success("COD handover saved successfully.");
      }
      setReconcilingRun(null);
    } catch (err) {
      toast.error(err?.message || "Failed to resolve COD variance");
    }
  };

  // Waste Entry
  const handleCreateWaste = async () => {
    if (!wasteProductId || !wasteQuantity) {
      toast.error("Product and Quantity are required");
      return;
    }
    const lossPaise = wasteEstimatedLossRupees ? Math.round(parseFloat(wasteEstimatedLossRupees) * 100) : null;

    try {
      await onCreateWaste({
        warehouse_id: operation.warehouse_id,
        product_id: wasteProductId,
        product_pack_id: wastePackId || null,
        quantity: parseDecimal(wasteQuantity),
        reason: wasteReason,
        estimated_loss_paise: lossPaise,
        note: wasteNote ? wasteNote.trim() : null,
      });
      toast.success("Inventory waste entry recorded!");
      setIsWasteOpen(false);
      setWasteProductId("");
      setWastePackId("");
      setWasteQuantity("");
      setWasteReason("spoilage");
      setWasteEstimatedLossRupees("");
      setWasteNote("");
    } catch (err) {
      toast.error(err?.message || "Failed to record waste");
    }
  };

  // Handover Note
  const handleSaveHandoverNote = async () => {
    try {
      await onSaveNotes({ handover_note: handoverNote });
      toast.success("Handover note updated!");
    } catch (err) {
      toast.error(err?.message || "Failed to save note");
    }
  };

  // Close Operation
  const handleCloseSubmit = async () => {
    if (isForceCloseMode && !forceCloseReason.trim()) {
      toast.error("Force close reason is required");
      return;
    }
    try {
      await onCloseOperation({
        close_note: closeNote ? closeNote.trim() : null,
        override_reason: isForceCloseMode ? forceCloseReason.trim() : null,
      });
      toast.success(isForceCloseMode ? "Operation force-closed!" : "Operation closed successfully!");
      setIsCloseModalOpen(false);
      setCloseNote("");
      setForceCloseReason("");
    } catch (err) {
      toast.error(err?.message || "Failed to close operation");
    }
  };

  // Reopen Operation
  const handleReopenSubmit = async () => {
    if (!reopenReason.trim()) {
      toast.error("Reopen reason is required");
      return;
    }
    try {
      await onReopenOperation({ reason: reopenReason.trim() });
      toast.success("Operation reopened.");
      setIsReopenModalOpen(false);
      setReopenReason("");
    } catch (err) {
      toast.error(err?.message || "Failed to reopen");
    }
  };

  // Evaluate Auto-Close
  const handleAutoCloseEvaluate = async () => {
    try {
      await onEvaluateAutoClose();
      toast.success("Auto-close evaluation requested.");
    } catch (err) {
      toast.error("Failed to request auto-close evaluation.");
    }
  };

  return (
    <div className="space-y-6">
      <PremiumWorkspaceHelper
        title="Exceptions & Closing Guide (Step-by-Step)"
        description="Follow these easy steps to resolve issues, match rider cash, and close the store for today."
        steps={[
          {
            title: "Resolve Order Issues",
            instruction: "Look at the 'Exceptions Inbox' on the left. Click 'Resolve' once you fix any listed problems.",
          },
          {
            title: "Match Driver Cash",
            instruction: "Look at 'Driver Reconciliation' on the right. If cash collected has variance, click 'Reconcile' to fix it.",
          },
          {
            title: "Record Waste Stock",
            instruction: "If any vegetables were spoiled, wasted, or returned by customers, click 'Log Waste' to save it.",
          },
          {
            title: "Close Daily Store",
            instruction: "Look at the Checklist. If everything is green, click the 'Close Store Daily Operations' button.",
          },
        ]}
      />

      {/* Printable summary */}
      {printingSummary && (
        <ClosingSummaryPrint
          operation={operation}
          overview={reconciliationData}
          reconciliation={reconciliationData}
        />
      )}

      {/* Premium Header Dashboard Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/50 to-slate-100/50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-slate-950 dark:text-white text-lg tracking-tight">
              Exceptions & Closure Board
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Consolidate COD reconciliations, waste logs, checklists, and manual exceptions.
            </p>
          </div>

          <div className="flex gap-2.5 shrink-0">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-9 font-bold rounded-xl border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all hover:scale-[1.02] shrink-0" 
              onClick={() => { setPrintingSummary(true); setTimeout(() => window.print(), 100); }}
            >
              <Printer className="h-4 w-4 mr-1.5 text-slate-500" /> Summary Report
            </Button>
            
            {operation.status === "closed" && isAdmin && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs h-9 font-bold rounded-xl text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-300 shadow-sm transition-all hover:scale-[1.02] shrink-0" 
                onClick={() => setIsReopenModalOpen(true)}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reopen Operations
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: Left Exceptions & Waste, Right COD & Closing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMN 1: Exceptions Inbox & Spoilage Waste */}
        <div className="space-y-6">
          
          {/* Exceptions Inbox */}
          <Card className="p-6 space-y-4 rounded-2xl border border-slate-200/80 shadow-sm dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4">
              <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" /> Exceptions Inbox
              </h4>
              {!isClosed && (
                <Button 
                  size="sm" 
                  className="h-8 text-xs font-bold gap-1 rounded-xl bg-gradient-to-r from-dailyveg-500 to-dailyveg-600 hover:from-dailyveg-600 hover:to-dailyveg-700 text-white shadow-sm transition-all hover:scale-[1.02]" 
                  onClick={() => setIsExcCreateOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Log Manual
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Search exceptions code, title..."
                value={excSearchTerm}
                onChange={(e) => setExcSearchTerm(e.target.value)}
                className="h-9 text-xs rounded-xl focus:ring-dailyveg-500/20"
              />
              <PremiumSelect
                size="sm"
                value={excStatusFilter}
                onChange={(val) => setExcStatusFilter(val)}
                className="min-w-[100px]"
                options={[
                  { value: "all", label: "All" },
                  { value: "open", label: "Open" },
                  { value: "resolved", label: "Resolved" },
                  { value: "ignored", label: "Ignored" },
                ]}
              />
            </div>

            {filteredExceptions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-semibold italic text-xs">No active exceptions in inbox.</div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto thin-scrollbar pr-1">
                {filteredExceptions.map((item) => {
                  const severityStyle = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.medium;
                  const leftBorderColor = 
                    item.severity === "high" 
                      ? "border-l-rose-500" 
                      : item.severity === "medium" 
                        ? "border-l-amber-500" 
                        : "border-l-blue-500";

                  return (
                    <div 
                      key={item.id} 
                      className={`p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-2 relative border-l-4 ${leftBorderColor} hover:shadow-sm transition-all duration-200`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase border ${severityStyle}`}>
                              {item.severity}
                            </span>
                            <span className="font-mono font-bold text-slate-400">{item.exception_code}</span>
                          </div>
                          <h5 className="font-bold text-slate-900 dark:text-white mt-1.5">{item.title}</h5>
                        </div>
                        <StatusBadge value={item.status} />
                      </div>

                      {item.description && (
                        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-1">{item.description}</p>
                      )}

                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-900 text-[10px] text-slate-400 font-semibold">
                        <span>Category: {item.category?.replace(/_/g, " ")}</span>
                        {!isClosed && item.status !== "resolved" && item.status !== "ignored" && (
                          <div className="flex gap-2">
                            <button
                              className="text-emerald-600 font-extrabold hover:text-emerald-700 hover:underline transition-colors"
                              onClick={() => { setResolvingException(item); setExcTargetStatus("resolved"); }}
                            >
                              Resolve
                            </button>
                            <button
                              className="text-slate-500 font-extrabold hover:text-slate-600 hover:underline transition-colors"
                              onClick={() => { setResolvingException(item); setExcTargetStatus("ignored"); }}
                            >
                              Ignore
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Spoilage waste logs */}
          <Card className="p-6 space-y-4 rounded-2xl border border-slate-200/80 shadow-sm dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4">
              <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Trash2 className="h-4.5 w-4.5 text-slate-500" /> Waste & Spoilage Ledger
              </h4>
              {!isClosed && (
                <Button 
                  size="sm" 
                  className="h-8 text-xs font-bold gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:scale-[1.02]" 
                  onClick={() => setIsWasteOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Log Waste
                </Button>
              )}
            </div>

            {wasteList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-semibold italic text-xs">No inventory waste logs reported.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800">
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Product</th>
                      <th className="py-3 px-2 font-bold text-slate-700 dark:text-slate-300 text-right">Qty</th>
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Reason</th>
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-right">Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wasteList.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-200/40 dark:border-slate-800/40 last:border-0 hover:bg-slate-50/55 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          {entry.product?.name || entry.product_name}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-slate-900 dark:text-white">
                          {entry.quantity}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-rose-50 dark:bg-rose-950/20 text-rose-700 border border-rose-150/30 uppercase">
                            {entry.reason}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                          {formatPaiseToRupees(entry.estimated_loss_paise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* COLUMN 2: consolidated COD Cash Reconciliation & Closing portal */}
        <div className="space-y-6">
          
          {/* Driver COD Reconciliation */}
          <Card className="p-6 space-y-4 rounded-2xl border border-slate-200/80 shadow-sm dark:border-slate-800 bg-white dark:bg-slate-950">
            <h4 className="font-black text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-900 pb-4 flex items-center gap-2">
              <Receipt className="h-4.5 w-4.5 text-emerald-500" /> Driver COD Reconciliation
            </h4>

            {runsList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-semibold italic text-xs">No runs generated to reconcile.</div>
            ) : (
              <div className="space-y-3">
                {runsList.map((run) => {
                  const hasVariance = run.cod_variance_paise !== null && run.cod_variance_paise !== 0;
                  const isNotEntered = run.reported_cod_paise === null || run.handed_over_cod_paise === null;
                  const isReconciled = (!isNotEntered && !hasVariance) || run.cod_reconciliation_status === "matched" || Number(run.expected_cod_paise || 0) === 0;
                  const canReconcile = canReconcileRunCod(run);

                  return (
                    <div 
                      key={run.id} 
                      className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs flex justify-between items-center gap-3 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-slate-850 dark:text-white text-xs">
                            {run.run_code || `RUN #${run.id.slice(0,6)}`}
                          </span>
                          <span className="text-slate-500 font-semibold">({run.delivery_partner?.full_name || "Rider"})</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 font-semibold mt-0.5">
                          <span>Expected: <span className="font-extrabold text-slate-850 dark:text-slate-200">{formatPaiseToRupees(run.expected_cod_paise)}</span></span>
                          {!isNotEntered && (
                            <>
                              <span>Reported: <span className="font-extrabold text-slate-800 dark:text-slate-300">{formatPaiseToRupees(run.reported_cod_paise)}</span></span>
                              <span>Handed Over: <span className="font-extrabold text-slate-800 dark:text-slate-300">{formatPaiseToRupees(run.handed_over_cod_paise)}</span></span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right min-w-[120px]">
                        {isReconciled ? (
                          <span className="inline-flex px-2.5 py-1 text-[10px] font-black text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/20 border border-emerald-200/40 rounded-lg items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> Reconciled
                          </span>
                        ) : hasVariance ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="px-2 py-0.5 text-[9px] font-black text-rose-800 bg-rose-100 dark:bg-rose-950/20 border border-rose-200/40 rounded-lg">
                              Variance: {formatPaiseToRupees(run.cod_variance_paise)}
                            </span>
                            {!isClosed && canReconcile && (
                              <Button 
                                variant="outline" 
                                className="h-7 px-3 text-[10px] font-extrabold rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.03] transition-all duration-200 shadow-sm" 
                                onClick={() => handleOpenReconcile(run)}
                              >
                                Reconcile
                              </Button>
                            )}
                          </div>
                        ) : (
                          // Pending entry
                          !isClosed && canReconcile ? (
                            <Button 
                              className="h-7.5 px-4 text-[10px] font-black rounded-xl bg-gradient-to-r from-dailyveg-500 to-dailyveg-600 hover:from-dailyveg-600 hover:to-dailyveg-700 text-white shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200" 
                              onClick={() => handleOpenReconcile(run)}
                            >
                              Input Handovers
                            </Button>
                          ) : !isClosed ? (
                            <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                              Awaiting deliveries
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* End-of-Day closing controls */}
          <Card className="p-6 space-y-5 rounded-2xl border border-slate-200/80 shadow-sm dark:border-slate-800 bg-white dark:bg-slate-950">
            <h4 className="font-black text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-900 pb-4 flex items-center gap-2">
              <CheckSquare className="h-4.5 w-4.5 text-teal-500" /> Store Closure Checklist
            </h4>

            {/* Auto-Close status display */}
            {capabilities.automatic_operation_close ? (
              <div className="p-4 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 dark:from-slate-900/60 dark:to-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 text-teal-900 dark:text-teal-300 rounded-xl text-xs space-y-1.5 shadow-sm">
                <p className="font-black flex items-center gap-1.5">
                  <Cpu className="h-4.5 w-4.5 text-teal-500 animate-pulse" /> Auto-Closure Mode Active
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
                  The system will close operations automatically once all checklist criteria and delivery dispatches are complete.
                </p>
                <div className="pt-2 flex justify-end">
                  <Button 
                    variant="outline" 
                    className="text-teal-700 border-teal-200 dark:border-teal-800 hover:border-teal-300 hover:bg-teal-50/60 dark:hover:bg-teal-950/20 h-7.5 px-4 rounded-xl text-[11px] font-extrabold shadow-sm transition-all hover:scale-[1.03] duration-200" 
                    onClick={handleAutoCloseEvaluate} 
                    disabled={isEvaluatingAutoClose}
                  >
                    Request Close Check
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs space-y-1 font-semibold flex items-center gap-2 shadow-sm">
                <Cpu className="h-4 w-4 text-slate-500" />
                <span>Backend auto-close capability unavailable. Store requires manual closure trigger.</span>
              </div>
            )}

            {/* Checklist status */}
            <div className={`p-4 rounded-xl border text-xs shadow-sm ${canClose ? "bg-emerald-50/60 text-emerald-800 border-emerald-200/70 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400" : "bg-rose-50/60 text-rose-800 border-rose-200/70 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400"}`}>
              <span className="font-black text-sm flex items-center gap-1.5">
                {canClose ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> : <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />}
                {canClose ? "Store Ready for Closure" : "Closure Blocked"}
              </span>
              <p className="mt-1.5 leading-relaxed font-semibold">
                {canClose ? "All runs reconciled and packing finished." : `${blockers.length} active blockers prevent normal closure.`}
              </p>
            </div>

            {blockers.length > 0 && (
              <div className="space-y-2 p-3.5 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-200/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 shadow-sm">
                <span className="font-black uppercase text-[10px] tracking-wider font-extrabold">Active Blocker Details:</span>
                <ul className="space-y-1.5 text-[11px] font-semibold">
                  {blockers.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-[13px] leading-none text-rose-500 select-none">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                
                {isAdmin && !isClosed && (
                  <div className="pt-2 border-t border-rose-200/30 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs text-rose-700 hover:text-white border-rose-300 dark:border-rose-900 hover:bg-rose-600 font-bold rounded-xl transition-all hover:scale-[1.02] shadow-sm" 
                      onClick={() => { setIsForceCloseMode(true); setIsCloseModalOpen(true); }}
                    >
                      Force Close (Admin Override)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Handover note text */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Handover Notes for Tomorrow's Team</Label>
              <textarea
                className="w-full h-24 p-3.5 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 font-sans focus:outline-none focus:ring-2 focus:ring-dailyveg-500/25 mt-1 transition-all focus:border-dailyveg-500"
                placeholder="Enter instructions, notes, or shift comments..."
                disabled={isClosed}
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
              />
              {!isClosed && (
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    className="text-xs font-bold gap-1 rounded-xl bg-gradient-to-r from-dailyveg-500 to-dailyveg-600 hover:from-dailyveg-600 hover:to-dailyveg-700 text-white shadow-sm transition-all hover:scale-[1.02]" 
                    onClick={handleSaveHandoverNote} 
                    disabled={isSavingNotes}
                  >
                    <Save className="h-3.5 w-3.5" /> Save Note
                  </Button>
                </div>
              )}
            </div>

            {!isClosed && !capabilities.automatic_operation_close && (
              <Button 
                size="sm" 
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black rounded-xl py-2.5 shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.01] hover:shadow-lg" 
                onClick={() => { setIsForceCloseMode(false); setIsCloseModalOpen(true); }} 
                disabled={isClosing}
              >
                Close Store Daily Operations
              </Button>
            )}
          </Card>
        </div>
      </div>

      {/* LOG EXCEPTIONS MODAL */}
      <Dialog open={isExcCreateOpen} onOpenChange={setIsExcCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Operational Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <PremiumSelect
                  value={excCreateCategory}
                  onChange={(val) => setExcCreateCategory(val)}
                  options={[
                    { value: "stuck_order", label: "Stuck Order" },
                    { value: "payment", label: "Payment Issue" },
                    { value: "refund", label: "Refund Issue" },
                    { value: "unassigned_order", label: "Unassigned Order" },
                    { value: "delivery_failure", label: "Delivery Failure" },
                    { value: "procurement_shortage", label: "Procurement Shortage" },
                    { value: "packing_mismatch", label: "Packing Mismatch" },
                    { value: "run_cod_variance", label: "Run COD Variance" },
                  ]}
                />
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <PremiumSelect
                  value={excCreateSeverity}
                  onChange={(val) => setExcCreateSeverity(val)}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "critical", label: "Critical" },
                  ]}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Exception Title</Label>
              <Input
                placeholder="Brief summary..."
                value={excCreateTitle}
                onChange={(e) => setExcCreateTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Detailed explanations..."
                value={excCreateDescription}
                onChange={(e) => setExcCreateDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsExcCreateOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateException} disabled={isCreatingException}>
                Log Exception
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RESOLVE EXCEPTION MODAL */}
      {resolvingException && (
        <Dialog open={Boolean(resolvingException)} onOpenChange={() => setResolvingException(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Exception as {excTargetStatus}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border">
                <p className="font-semibold text-slate-900 dark:text-white">{resolvingException.title}</p>
                <p className="text-slate-500 mt-0.5">{resolvingException.exception_code}</p>
              </div>

              <div>
                <Label className="text-xs">Resolution Note</Label>
                <Input
                  placeholder="Explain actions taken..."
                  value={excResolutionNote}
                  onChange={(e) => setExcResolutionNote(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setResolvingException(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleResolveException} disabled={isUpdatingException}>
                  Confirm Status
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* RECONCILE COD VARIANCE MODAL */}
      {reconcilingRun && (
        <Dialog open={Boolean(reconcilingRun)} onOpenChange={() => setReconcilingRun(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reconcile COD Variance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">
                  {reconcilingRun.run_code || `RUN #${reconcilingRun.id.slice(0, 6)}`}
                </p>
                <p className="text-slate-500">
                  Expected COD: <span className="font-bold text-slate-900 dark:text-white">{formatPaiseToRupees(reconcilingRun.expected_cod_paise)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Reported COD (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Reported amount"
                    value={reportedCodRupees}
                    onChange={(e) => setReportedCodRupees(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Handed-Over Cash (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Handed over cash"
                    value={handedOverCodRupees}
                    onChange={(e) => setHandedOverCodRupees(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Reconciliation Notes</Label>
                <Input
                  placeholder="Notes regarding cash collection or variance..."
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setReconcilingRun(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleReconcileSubmit} disabled={isReconcilingCod}>
                  Save Reconciliation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* RECORD WASTE MODAL */}
      <Dialog open={isWasteOpen} onOpenChange={setIsWasteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Inventory Waste Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs">Product</Label>
              <PremiumSelect
                value={wasteProductId}
                onChange={(val) => {
                  setWasteProductId(val);
                  setWastePackId("");
                }}
                options={[
                  { value: "", label: "Select Product..." },
                  ...normalizedProducts.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                ]}
                placeholder="Select Product..."
              />
            </div>

            {availablePacks.length > 0 && (
              <div>
                <Label className="text-xs">Product Pack (Optional)</Label>
                <PremiumSelect
                  value={wastePackId}
                  onChange={(val) => setWastePackId(val)}
                  options={[
                    { value: "", label: "Select Pack..." },
                    ...availablePacks.map((pack) => ({
                      value: pack.id,
                      label: pack.pack_label,
                    })),
                  ]}
                  placeholder="Select Pack..."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="e.g. 5"
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Reason</Label>
                <PremiumSelect
                  value={wasteReason}
                  onChange={(val) => setWasteReason(val)}
                  options={[
                    { value: "spoilage", label: "Spoilage" },
                    { value: "damage", label: "Damage" },
                    { value: "quality_reject", label: "Quality Reject" },
                    { value: "excess", label: "Excess" },
                    { value: "packing_loss", label: "Packing Loss" },
                    { value: "customer_return", label: "Customer Return" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Estimated Loss (₹)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 250"
                value={wasteEstimatedLossRupees}
                onChange={(e) => setWasteEstimatedLossRupees(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Note</Label>
              <Input
                placeholder="Observation or comments..."
                value={wasteNote}
                onChange={(e) => setWasteNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsWasteOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateWaste} disabled={isCreatingWaste}>
                Record Waste
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CLOSE OPERATION DIALOG */}
      <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isForceCloseMode ? "Admin Force Close Daily Operation" : "Close Daily Operation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Closing store operations locks all workflow screens for this date.
            </p>

            {isForceCloseMode && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> Force Close Override Active
                </p>
                <p className="text-[11px]">
                  You are overriding {blockers.length} active blocker(s). A mandatory explanation is required.
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">Closing Note (Optional)</Label>
              <Input
                placeholder="Closing note or summary..."
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
              />
            </div>

            {isForceCloseMode && (
              <div>
                <Label className="text-xs font-semibold text-rose-600">Override Explanation (Mandatory)</Label>
                <Input
                  placeholder="Reason for overriding blockers..."
                  value={forceCloseReason}
                  onChange={(e) => setForceCloseReason(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCloseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className={isForceCloseMode ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                onClick={handleCloseSubmit}
                disabled={isClosing || (isForceCloseMode && !forceCloseReason.trim())}
              >
                Confirm Closing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* REOPEN DIALOG */}
      <Dialog open={isReopenModalOpen} onOpenChange={setIsReopenModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reopen Daily Operations</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Reopening allows store operators to continue editing dispatches and collections.
            </p>

            <div>
              <Label className="text-xs font-semibold text-amber-700">Reopen Reason (Mandatory)</Label>
              <Input
                placeholder="Reason..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsReopenModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold" onClick={handleReopenSubmit} disabled={isReopening || !reopenReason.trim()}>
                Confirm Reopen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
