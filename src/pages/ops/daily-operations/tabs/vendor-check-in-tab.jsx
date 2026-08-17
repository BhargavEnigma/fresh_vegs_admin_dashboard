import { useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  History,
  MapPin,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { VendorService } from "../../../../api/services/vendor.service";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Badge } from "../../../../components/ui/badge";
import { PremiumSelect } from "../../../../components/ui/premium-select";
import { useToast } from "../../../../components/toast/toast-context";
import { VendorWorkflowGuide } from "../../../../components/common/vendor-workflow-guide";
import {
  acceptedPayoutPaise,
  buildFullAcceptanceDraft,
  buildFullRejectionDraft,
  formatQuantityWithUnit,
  formatVendorMoney,
  getVendorAssignmentStatus,
  validateReceiptQuantities,
} from "../../../../utils/vendor-assignment";
import { getIstYyyyMmDd } from "../../../../utils/date.util";
import { cn } from "../../../../lib/utils";

const canReceive = (status) => status === "dispatched";

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  try {
    if (/^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?$/i.test(timeStr)) return timeStr;
    return format(new Date(timeStr), "hh:mm a");
  } catch {
    return timeStr;
  }
};

export function VendorCheckInTab({
  deliveryDate,
  isClosed,
  isAdmin,
  isWarehouseManager,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const date = deliveryDate || getIstYyyyMmDd();
  const [vendorUserId, setVendorUserId] = useState(() => searchParams.get("vendor_user_id") || "");
  const [drafts, setDrafts] = useState({});
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingOverrideEntries, setPendingOverrideEntries] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [expandedHistories, setExpandedHistories] = useState({});
  const lastSubmittedEntries = useRef([]);

  const toggleHistory = (assignmentId) => {
    setExpandedHistories(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  const vendorsQuery = useQuery({
    queryKey: ["ops", "vendorCheckIn", "vendors"],
    queryFn: VendorService.listForCheckIn,
  });
  const assignmentsQuery = useQuery({
    queryKey: ["ops", "vendorCheckIn", date, vendorUserId],
    queryFn: () => VendorService.getCheckIn({ date, vendorUserId }),
    enabled: Boolean(date && vendorUserId),
  });


  const receiveMutation = useMutation({
    mutationFn: async (entries) => {
      const results = [];
      for (const entry of entries) {
        try {
          await VendorService.receive(entry.id, {
            received_quantity: entry.received_quantity || "0",
            rejected_quantity: entry.rejected_quantity || "0",
            admin_override: entry.admin_override || false,
          });
          results.push({ id: entry.id, success: true });
        } catch (error) {
          results.push({ id: entry.id, success: false, error });
        }
      }
      const successes = results.filter((result) => result.success);
      const failures = results.filter((result) => !result.success);
      if (!successes.length && failures.length) throw failures[0].error;
      return { successes, failures };
    },
    onSuccess: async ({ successes, failures }) => {
      if (failures.length) {
        toast.warning(
          `${successes.length} delivery item(s) received; ${failures.length} item(s) need retry`
        );
      } else {
        toast.success("Vendor delivery checked in");
      }
      setDrafts({});
      await Promise.all([
        assignmentsQuery.refetch(),
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ops", "dailyOperations"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "vendorAssignments"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["procurement-cost-items"] }),
        queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["costs-summary"] }),
      ]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || "Failed to receive delivery");
    },
  });

  const vendorOptions = useMemo(
    () =>
      (vendorsQuery.data || [])
        .filter((vendor) => vendor.status === "active")
        .map((vendor) => {
          const userId = vendor.user?.id;
          return {
            value: userId,
            label: `${vendor.company_name} — ${vendor.user?.full_name || "No contact"}`,
          };
        })
        .filter((option) => option.value),
    [vendorsQuery.data]
  );
  const assignments = assignmentsQuery.data || [];
  const pendingAssignments = useMemo(
    () => assignments.filter((assignment) => ["approved", "confirmed", "dispatched"].includes(assignment.status)),
    [assignments]
  );
  const receivedAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === "received"),
    [assignments]
  );
  const receivableAssignments = useMemo(
    () => assignments.filter((assignment) => canReceive(assignment.status)),
    [assignments]
  );
  const preparedCount = useMemo(
    () =>
      receivableAssignments.filter((assignment) => {
        const draft = drafts[assignment.id];
        return draft && (
          draft.received_quantity !== "" ||
          draft.rejected_quantity !== ""
        );
      }).length,
    [drafts, receivableAssignments]
  );

  const updateDraft = (id, field, value) => {
    if (value !== "" && !/^\d*(?:\.\d{0,3})?$/.test(value)) return;
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), [field]: value },
    }));
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setDrafts({});
  };

  const acceptAllSupplied = () => {
    setDrafts(buildFullAcceptanceDraft(receivableAssignments));
    toast.success(`${receivableAssignments.length} item(s) prepared as fully accepted. Review and submit.`);
  };

  const setFullAcceptance = (assignment) => {
    setDrafts((current) => ({
      ...current,
      [assignment.id]: {
        received_quantity: String(assignment.supplied_quantity || "0"),
        rejected_quantity: "0",
      },
    }));
  };

  const setFullRejection = (assignment) => {
    setDrafts((current) => ({
      ...current,
      [assignment.id]: buildFullRejectionDraft(assignment),
    }));
  };

  const submit = () => {
    const entries = assignments
      .filter((assignment) => canReceive(assignment.status))
      .map((assignment) => ({
        ...assignment,
        received_quantity: drafts[assignment.id]?.received_quantity ?? "",
        rejected_quantity: drafts[assignment.id]?.rejected_quantity ?? "",
      }))
      .filter((entry) => entry.received_quantity !== "" || entry.rejected_quantity !== "");

    if (!entries.length) {
      toast.warning("Enter received or rejected quantities for at least one assignment");
      return;
    }
    const invalid = entries.find((entry) => {
      try {
        return validateReceiptQuantities(
          entry.received_quantity || "0",
          entry.rejected_quantity || "0",
          entry.supplied_quantity || "0"
        );
      } catch {
        return true;
      }
    });
    if (invalid) {
      toast.warning(
        `${invalid.product?.name || "Assignment"}: received plus rejected must be greater than 0 and no more than ${formatQuantityWithUnit(invalid.supplied_quantity, invalid.procurement_unit)}`
      );
      return;
    }
    lastSubmittedEntries.current = entries;
    receiveMutation.mutate(entries);
  };

  return (
    <div>
      <Card className="mb-5 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Label>Vendor</Label>
            <PremiumSelect
              value={vendorUserId}
              onChange={(value) => {
                setVendorUserId(value);
                setDrafts({});
                setActiveTab("pending");
                const nextParams = new URLSearchParams(searchParams);
                if (value) {
                  nextParams.set("vendor_user_id", value);
                } else {
                  nextParams.delete("vendor_user_id");
                }
                setSearchParams(nextParams, { replace: true });
              }}
              options={vendorOptions}
              placeholder={vendorsQuery.isLoading ? "Loading vendors…" : "Select vendor"}
              isDisabled={vendorsQuery.isLoading}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              assignmentsQuery.refetch();
            }}
            disabled={!vendorUserId || assignmentsQuery.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${assignmentsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </Card>



      {!vendorUserId ? (
        <Card className="p-10 text-center text-slate-500">
          <ClipboardCheck className="mx-auto mb-3 h-9 w-9 text-slate-400" />
          Select a vendor to see active assignments.
        </Card>
      ) : assignmentsQuery.isLoading ? (
        <Card className="p-10 text-center text-slate-500">Loading assignments…</Card>
      ) : assignmentsQuery.isError ? (
        <Card className="p-10 text-center text-red-600">Could not load vendor assignments.</Card>
      ) : assignments.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">No active assignments for this vendor and date.</Card>
      ) : (
        <div className="space-y-4">
          {/* Navigation Tabs */}
          <div className="rounded-2xl border border-slate-200/85 bg-slate-100/60 p-1.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
            <div className="grid w-full grid-cols-2 items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleTabChange("pending")}
                className={`group relative flex min-w-0 items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
                  activeTab === "pending"
                    ? "bg-gradient-to-r from-dailyveg-500 via-dailyveg-600 to-emerald-600 text-white shadow-lg shadow-dailyveg-500/20 scale-[1.01]"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
                }`}
              >
                <span>Pending ({pendingAssignments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("received")}
                className={`group relative flex min-w-0 items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
                  activeTab === "received"
                    ? "bg-gradient-to-r from-dailyveg-500 via-dailyveg-600 to-emerald-600 text-white shadow-lg shadow-dailyveg-500/20 scale-[1.01]"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
                }`}
              >
                <span>Received ({receivedAssignments.length})</span>
              </button>
            </div>
          </div>

          {activeTab === "pending" ? (
            pendingAssignments.length === 0 ? (
              <Card className="p-10 text-center text-slate-500">No pending assignments for this vendor and date.</Card>
            ) : (
              <div className="space-y-3">
                {receivableAssignments.length > 0 && (
                  <Card className="border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                      {isAdmin ? (
                        <div className="w-[60%]">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Fast warehouse check-in
                          </h3>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            If the delivery is correct, prepare every supplied quantity as received with zero rejection.
                            You can still adjust exceptions below before submitting.
                          </p>
                        </div>
                      ) : null}
                      <div className={cn("flex flex-wrap items-center justify-end gap-2", isAdmin ? "w-[40%]" : "w-full")}>
                        <Badge variant={preparedCount === receivableAssignments.length ? "success" : "secondary"}>
                          {preparedCount}/{receivableAssignments.length} prepared
                        </Badge>
                        {isAdmin && preparedCount > 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setDrafts({})}
                            disabled={receiveMutation.isPending}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Clear
                          </Button>
                        ) : null}
                        {isAdmin ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={acceptAllSupplied}
                            disabled={receiveMutation.isPending}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Accept all supplied
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                )}
                {pendingAssignments.map((assignment) => {
                  const enabled = canReceive(assignment.status);
                  const draft = drafts[assignment.id] || {};
                  const status = getVendorAssignmentStatus(assignment.status);
                  const unit = assignment.procurement_unit || (assignment.procurement_mode === "pack" ? (assignment.pack_label || "pack") : "");
                  const estimatedPayout =
                    assignment.unit_cost_paise === null ||
                    assignment.unit_cost_paise === undefined ||
                    Number(assignment.unit_cost_paise) <= 0 ||
                    draft.received_quantity === "" ||
                    draft.received_quantity === undefined
                      ? null
                      : acceptedPayoutPaise(draft.received_quantity, assignment.unit_cost_paise);
                  const showActualPayout = assignment.status === "received";
                  const actualPayout = assignment.total_cost_paise;

                  let accentColor = "border-l-amber-500 shadow-amber-500/5";
                  if (assignment.status === "dispatched") {
                    accentColor = "border-l-emerald-500 shadow-emerald-500/5";
                  } else if (assignment.status === "confirmed") {
                    accentColor = "border-l-blue-500 shadow-blue-500/5";
                  } else if (assignment.status === "received") {
                    accentColor = "border-l-slate-400 shadow-slate-500/5";
                  }

                  return (
                    <Card key={assignment.id} className={cn("p-6 border-l-4 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br bg-white/80 dark:bg-slate-950/70 backdrop-blur-md shadow-sm hover:shadow-xl hover:scale-[1.006] transition-all duration-300 rounded-2xl relative overflow-hidden space-y-5", accentColor)}>
                      <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl opacity-[0.03] dark:opacity-[0.05] pointer-events-none rounded-bl-full" />
                      
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-900">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">{assignment.product?.name || "Unknown product"}</h3>
                            <Badge variant={status.variant} className="rounded-full font-bold px-2 py-0.5">
                              {status.label}
                            </Badge>
                            {assignment.status === "received" && assignment.outcome && (
                              <Badge
                                variant={
                                  assignment.outcome === "fully_accepted"
                                    ? "success"
                                    : assignment.outcome === "partially_accepted"
                                    ? "warning"
                                    : "danger"
                                }
                                className="capitalize font-bold rounded-full px-2 py-0.5"
                              >
                                {assignment.outcome.replaceAll("_", " ")}
                              </Badge>
                            )}
                            <Badge variant={assignment.procurement_mode === "bulk" ? "success" : "outline"} className="rounded-full font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider">
                              {assignment.procurement_mode === "bulk" ? "Bulk" : "Pack"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {assignment.procurement_mode === "bulk"
                              ? `Product-level bulk supply · ${unit.toUpperCase()}`
                              : (assignment.pack_label || unit.toUpperCase())}
                          </p>
                          {assignment.check_in_override_reason && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg border border-amber-200/20">
                              <span className="font-bold">Check-in Override:</span>
                              <span>"{assignment.check_in_override_reason}"</span>
                              {assignment.override_actor?.full_name && (
                                <span className="text-slate-400 dark:text-slate-500">
                                  (by {assignment.override_actor.full_name})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Allocation ID</span>
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350 mt-0.5 block">#{assignment.id}</span>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-end">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-900/60 dark:bg-slate-900/40">
                          <Label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Allocated</Label>
                          <p className="mt-1.5 text-base font-black text-slate-800 dark:text-slate-200">{formatQuantityWithUnit(assignment.allocated_quantity, unit)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-900/60 dark:bg-slate-900/40">
                          <Label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Vendor Supplied</Label>
                          <p className="mt-1.5 text-base font-black text-indigo-700 dark:text-indigo-400">{formatQuantityWithUnit(assignment.supplied_quantity, unit)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-900/60 dark:bg-slate-900/40">
                          <Label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Locked Price</Label>
                          <p className="mt-1.5 text-base font-black text-slate-800 dark:text-slate-200">{formatVendorMoney(assignment.unit_cost_paise)}/{unit.toUpperCase()}</p>
                        </div>

                        {/* Interactive Quantity Inputs */}
                        <div className="rounded-2xl border border-emerald-100/50 bg-emerald-50/10 p-3.5 dark:border-emerald-950/20 dark:bg-emerald-950/5">
                          <Label htmlFor={`received-${assignment.id}`} className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1.5">Received ({unit.toUpperCase()})</Label>
                          <Input
                            id={`received-${assignment.id}`}
                            type="number"
                            min="0"
                            step="0.001"
                            disabled={!enabled}
                            placeholder={enabled ? "0.000" : (assignment.status === "confirmed" ? "Pending dispatch" : "N/A")}
                            value={draft.received_quantity ?? ""}
                            onChange={(event) => updateDraft(assignment.id, "received_quantity", event.target.value)}
                            className="h-9 text-xs rounded-xl bg-white border-slate-200/80 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed dark:bg-slate-900 dark:border-slate-800"
                          />
                        </div>

                        <div className="rounded-2xl border border-rose-100/50 bg-rose-50/10 p-3.5 dark:border-rose-950/20 dark:bg-rose-950/5">
                          <Label htmlFor={`rejected-${assignment.id}`} className="text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1.5">Rejected ({unit.toUpperCase()})</Label>
                          <Input
                            id={`rejected-${assignment.id}`}
                            type="number"
                            min="0"
                            step="0.001"
                            disabled={!enabled}
                            placeholder={enabled ? "0.000" : (assignment.status === "confirmed" ? "Pending dispatch" : "N/A")}
                            value={draft.rejected_quantity ?? ""}
                            onChange={(event) => updateDraft(assignment.id, "rejected_quantity", event.target.value)}
                            className="h-9 text-xs rounded-xl bg-white border-slate-200/80 focus:ring-rose-500/20 focus:border-rose-500 disabled:opacity-75 disabled:cursor-not-allowed dark:bg-slate-900 dark:border-slate-800"
                          />
                        </div>
                      </div>

                      {/* Footer Actions & Payout Box */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-450">
                            {showActualPayout ? "Final received payout: " : "Estimated accepted payout: "}
                          </span>
                          <span className={cn(
                            "inline-flex items-center justify-center px-3 py-1.5 text-xs font-extrabold rounded-xl border",
                            estimatedPayout !== null || showActualPayout
                              ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-350"
                              : "bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-900/30 dark:border-slate-850 dark:text-slate-400"
                          )}>
                            {assignment.unit_cost_paise === null ||
                            assignment.unit_cost_paise === undefined ||
                            Number(assignment.unit_cost_paise) <= 0
                              ? "Missing vendor price"
                              : showActualPayout
                                ? formatVendorMoney(actualPayout)
                                : !enabled
                                  ? "Pending dispatch"
                                  : estimatedPayout === null
                                    ? "Enter received quantity"
                                    : formatVendorMoney(estimatedPayout)}
                          </span>
                        </div>

                        {enabled && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-auto rounded-xl border-emerald-250 bg-white py-2.5 hover:bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-slate-900 dark:hover:bg-emerald-950/20 dark:border-emerald-900/60"
                              onClick={() => setFullAcceptance(assignment)}
                              disabled={receiveMutation.isPending}
                            >
                              <Check className="mr-1.5 h-4 w-4" />
                              Accept full supply
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-auto rounded-xl border-rose-250 bg-white py-2.5 hover:bg-rose-50 text-xs font-bold text-rose-700 dark:bg-slate-900 dark:hover:bg-rose-950/20 dark:border-rose-900/60"
                              onClick={() => setFullRejection(assignment)}
                              disabled={receiveMutation.isPending}
                            >
                              <XCircle className="mr-1.5 h-4 w-4" />
                              Reject full supply
                            </Button>
                          </div>
                        )}
                      </div>

                      {assignment.status === "confirmed" && (
                        <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 text-xs rounded-xl bg-blue-50/80 border border-blue-100 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-300 font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                          <span>This assignment is confirmed by the vendor, but is pending dispatch. It is read-only until the vendor dispatches.</span>
                        </div>
                      )}
                      {assignment.status === "dispatched" && (
                        <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 text-xs rounded-xl bg-emerald-50/80 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-350 font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>This assignment has been dispatched and is ready to be received. Please verify physical quantities.</span>
                        </div>
                      )}
                      {!enabled && assignment.status !== "confirmed" && assignment.status !== "received" && (
                        <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 text-xs rounded-xl bg-amber-50/80 border border-amber-100 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-300 font-medium">
                          <span>This assignment must be confirmed and dispatched before check-in.</span>
                        </div>
                      )}
                      {assignment.status_history && assignment.status_history.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => toggleHistory(assignment.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          >
                            <History className="h-3 w-3" />
                            {expandedHistories[assignment.id] ? "Hide Transition Logs" : "Show Transition Logs"}
                          </button>

                          {expandedHistories[assignment.id] && (
                            <div className="mt-3 space-y-2 border-l border-slate-200 pl-3.5 dark:border-slate-800 animate-slide-down">
                              {assignment.assigned_at && (
                                <div className="relative text-[11px] leading-relaxed mb-2">
                                  <span className="absolute -left-[19.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-950 dark:bg-slate-650" />
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-slate-700 dark:text-slate-350 uppercase text-[9px] tracking-wider bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                      Assigned
                                    </span>
                                    <span className="text-slate-400 dark:text-slate-500">
                                      {new Date(assignment.assigned_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                                    Assignment created and allocated to vendor
                                  </div>
                                </div>
                              )}
                              {assignment.status_history.map((event) => {
                                const eventStatus = getVendorAssignmentStatus(event.status);
                                return (
                                  <div key={event.id} className="relative text-[11px] leading-relaxed">
                                    <span className="absolute -left-[19.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300 dark:border-slate-950 dark:bg-slate-700" />
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase text-[9px] tracking-wider bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                        {eventStatus.label}
                                      </span>
                                      <span className="text-slate-400 dark:text-slate-500">
                                        {new Date(event.changed_at).toLocaleString()}
                                      </span>
                                      {event.timestamp_source === "estimated" && (
                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200/20">
                                          Estimated
                                        </span>
                                      )}
                                      {event.change_source && (
                                        <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/40 px-1 py-0.2 rounded border border-slate-100/50 dark:border-slate-900/30">
                                          via {event.change_source.toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                                      {event.changed_by?.full_name && (
                                        <span>Actor: <strong className="text-slate-600 dark:text-slate-350">{event.changed_by.full_name}</strong></span>
                                      )}
                                      {event.reason && (
                                        <span className={event.changed_by?.full_name ? "ml-2" : ""}>
                                          Reason: <em className="text-amber-750 dark:text-amber-400">"{event.reason}"</em>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
                <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                  <p className="text-xs text-slate-500">
                    {preparedCount === 0
                      ? "Prepare at least one item to submit."
                      : `${preparedCount} of ${receivableAssignments.length} receivable item(s) will be submitted.`}
                  </p>
                  <Button onClick={submit} disabled={receiveMutation.isPending || preparedCount === 0}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {receiveMutation.isPending ? "Submitting…" : `Submit ${preparedCount} item${preparedCount === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </div>
            )
          ) : (
            receivedAssignments.length === 0 ? (
              <Card className="p-10 text-center text-slate-500">No received assignments for this vendor and date.</Card>
            ) : (
              <div className="space-y-3">
                {receivedAssignments.map((assignment) => {
                  const status = getVendorAssignmentStatus(assignment.status);
                  const unit = assignment.procurement_unit || (assignment.procurement_mode === "pack" ? (assignment.pack_label || "pack") : "");
                  const actualPayout = assignment.total_cost_paise;

                  return (
                    <Card key={assignment.id} className="p-6 border-l-4 border-l-slate-400 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br bg-white/80 dark:bg-slate-950/70 backdrop-blur-md shadow-sm opacity-95 rounded-2xl relative overflow-hidden space-y-5">
                      <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl opacity-[0.03] dark:opacity-[0.05] pointer-events-none rounded-bl-full" />
                      
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-900">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">{assignment.product?.name || "Unknown product"}</h3>
                            <Badge variant={status.variant} className="rounded-full font-bold px-2 py-0.5">
                              {status.label}
                            </Badge>
                            {assignment.status === "received" && assignment.outcome && (
                              <Badge
                                variant={
                                  assignment.outcome === "fully_accepted"
                                    ? "success"
                                    : assignment.outcome === "partially_accepted"
                                    ? "warning"
                                    : "danger"
                                }
                                className="capitalize font-bold rounded-full px-2 py-0.5"
                              >
                                {assignment.outcome.replaceAll("_", " ")}
                              </Badge>
                            )}
                            <Badge variant={assignment.procurement_mode === "bulk" ? "success" : "outline"} className="rounded-full font-bold px-2 py-0.5 text-[9px] uppercase tracking-wider">
                              {assignment.procurement_mode === "bulk" ? "Bulk" : "Pack"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {assignment.procurement_mode === "bulk"
                              ? `Product-level bulk supply · ${unit.toUpperCase()}`
                              : (assignment.pack_label || unit.toUpperCase())}
                          </p>
                          {assignment.check_in_override_reason && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg border border-amber-200/20">
                              <span className="font-bold">Check-in Override:</span>
                              <span>"{assignment.check_in_override_reason}"</span>
                              {assignment.override_actor?.full_name && (
                                <span className="text-slate-400 dark:text-slate-500">
                                  (by {assignment.override_actor.full_name})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Allocation ID</span>
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350 mt-0.5 block">#{assignment.id}</span>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-900/60 dark:bg-slate-900/40">
                          <Label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Allocated</Label>
                          <p className="mt-1.5 text-base font-black text-slate-805 dark:text-slate-200">{formatQuantityWithUnit(assignment.allocated_quantity, unit)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-900/60 dark:bg-slate-900/40">
                          <Label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Vendor Supplied</Label>
                          <p className="mt-1.5 text-base font-black text-indigo-700 dark:text-indigo-400">{formatQuantityWithUnit(assignment.supplied_quantity, unit)}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100/40 bg-emerald-50/5 p-3.5 dark:border-emerald-950/20 dark:bg-emerald-950/5">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received Qty</Label>
                          <p className="mt-1.5 text-base font-black text-emerald-700 dark:text-emerald-300">{formatQuantityWithUnit(assignment.received_quantity, unit)}</p>
                        </div>
                        <div className="rounded-2xl border border-rose-100/40 bg-rose-50/5 p-3.5 dark:border-rose-950/20 dark:bg-rose-950/5">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Rejected Qty</Label>
                          <p className="mt-1.5 text-base font-black text-rose-700 dark:text-rose-300">{formatQuantityWithUnit(assignment.rejected_quantity, unit)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-900/60 dark:bg-slate-900/40">
                          <Label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Locked Price</Label>
                          <p className="mt-1.5 text-base font-black text-slate-805 dark:text-slate-200">{formatVendorMoney(assignment.unit_cost_paise)}/{unit.toUpperCase()}</p>
                        </div>
                      </div>

                      {/* Footer Payout Box */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-450">
                            Final received payout:{" "}
                          </span>
                          <span className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-extrabold rounded-xl border bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-350">
                            {assignment.unit_cost_paise === null ||
                            assignment.unit_cost_paise === undefined ||
                            Number(assignment.unit_cost_paise) <= 0
                              ? "Unavailable because vendor price is missing"
                              : formatVendorMoney(actualPayout)}
                          </span>
                        </div>
                        {assignment.status_history && assignment.status_history.length > 0 && (
                          <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-800 w-full">
                            <button
                              type="button"
                              onClick={() => toggleHistory(assignment.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                              <History className="h-3 w-3" />
                              {expandedHistories[assignment.id] ? "Hide Transition Logs" : "Show Transition Logs"}
                            </button>

                            {expandedHistories[assignment.id] && (
                              <div className="mt-3 space-y-2 border-l border-slate-200 pl-3.5 dark:border-slate-800 animate-slide-down">
                                {assignment.assigned_at && (
                                  <div className="relative text-[11px] leading-relaxed mb-2">
                                    <span className="absolute -left-[19.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 dark:border-slate-950 dark:bg-slate-650" />
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-slate-700 dark:text-slate-350 uppercase text-[9px] tracking-wider bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                        Assigned
                                      </span>
                                      <span className="text-slate-400 dark:text-slate-500">
                                        {new Date(assignment.assigned_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                                      Assignment created and allocated to vendor
                                    </div>
                                  </div>
                                )}
                                {assignment.status_history.map((event) => {
                                  const eventStatus = getVendorAssignmentStatus(event.status);
                                  return (
                                    <div key={event.id} className="relative text-[11px] leading-relaxed">
                                      <span className="absolute -left-[19.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300 dark:border-slate-950 dark:bg-slate-700" />
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-semibold text-slate-700 dark:text-slate-350 uppercase text-[9px] tracking-wider bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                                          {eventStatus.label}
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500">
                                          {new Date(event.changed_at).toLocaleString()}
                                        </span>
                                        {event.timestamp_source === "estimated" && (
                                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200/20">
                                            Estimated
                                          </span>
                                        )}
                                        {event.change_source && (
                                          <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/40 px-1 py-0.2 rounded border border-slate-100/50 dark:border-slate-900/30">
                                            via {event.change_source.toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5 text-slate-505 dark:text-slate-400">
                                        {event.changed_by?.full_name && (
                                          <span>Actor: <strong className="text-slate-600 dark:text-slate-350">{event.changed_by.full_name}</strong></span>
                                        )}
                                        {event.reason && (
                                          <span className={event.changed_by?.full_name ? "ml-2" : ""}>
                                            Reason: <em className="text-amber-750 dark:text-amber-400">"{event.reason}"</em>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
