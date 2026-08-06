import { useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  History,
  MapPin,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { VendorService } from "../../../api/services/vendor.service";
import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { PremiumSelect } from "../../../components/ui/premium-select";
import { useToast } from "../../../components/toast/toast-context";
import { VendorWorkflowGuide } from "../../../components/common/vendor-workflow-guide";
import {
  acceptedPayoutPaise,
  buildFullAcceptanceDraft,
  buildFullRejectionDraft,
  formatQuantityWithUnit,
  formatVendorMoney,
  getVendorAssignmentStatus,
  validateReceiptQuantities,
} from "../../../utils/vendor-assignment";
import { addDaysYyyyMmDd, getIstYyyyMmDd } from "../../../utils/date.util";

const canReceive = (status) => status === "confirmed" || status === "dispatched";

const parseYyyyMmDd = (value) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const toYyyyMmDd = (value) =>
  value && isValid(value) ? format(value, "yyyy-MM-dd") : getIstYyyyMmDd();

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  try {
    if (/^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?$/i.test(timeStr)) return timeStr;
    return format(new Date(timeStr), "hh:mm a");
  } catch {
    return timeStr;
  }
};

export function VendorCheckInPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => searchParams.get("date") || getIstYyyyMmDd());
  const [vendorUserId, setVendorUserId] = useState(() => searchParams.get("vendor_user_id") || "");
  const [drafts, setDrafts] = useState({});
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

  const changeDate = (nextDate) => {
    setDate(nextDate);
    setDrafts({});
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("date", nextDate);
    if (vendorUserId) nextParams.set("vendor_user_id", vendorUserId);
    setSearchParams(nextParams, { replace: true });
  };

  const today = getIstYyyyMmDd();
  const tomorrow = addDaysYyyyMmDd(today, 1);

  const vendorsQuery = useQuery({
    queryKey: ["ops", "vendorCheckIn", "vendors"],
    queryFn: VendorService.listForCheckIn,
  });
  const assignmentsQuery = useQuery({
    queryKey: ["ops", "vendorCheckIn", date, vendorUserId],
    queryFn: () => VendorService.getCheckIn({ date, vendorUserId }),
    enabled: Boolean(date && vendorUserId),
  });
  const attendanceQuery = useQuery({
    queryKey: ["ops", "vendorAttendance", date],
    queryFn: () => VendorService.getAttendance(date),
    enabled: Boolean(date),
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
        attendanceQuery.refetch(),
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ops", "dailyOperations"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "vendorAssignments"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["ops", "vendorAttendance"] }),
        queryClient.invalidateQueries({ queryKey: ["procurement-cost-items"] }),
        queryClient.invalidateQueries({ queryKey: ["costs-profit-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["costs-summary"] }),
      ]);
    },
    onError: (error) => {
      if (error?.response?.data?.code === "VENDOR_NOT_CHECKED_IN") {
        setPendingOverrideEntries(lastSubmittedEntries.current);
      } else {
        toast.error(error?.response?.data?.message || error?.message || "Failed to receive delivery");
      }
    },
  });

  const checkedInUserIds = useMemo(() => {
    return new Set(
      (attendanceQuery.data || []).map((item) => String(item.vendor_user_id || item.vendorUserId || "")).filter(Boolean)
    );
  }, [attendanceQuery.data]);

  const vendorOptions = useMemo(
    () =>
      (vendorsQuery.data || [])
        .filter((vendor) => vendor.status === "active")
        .map((vendor) => {
          const userId = vendor.user?.id;
          const isCheckedIn = userId && checkedInUserIds.has(String(userId));
          const suffix = isCheckedIn ? " (Checked In)" : "";
          return {
            value: userId,
            label: `${vendor.company_name}${suffix} — ${vendor.user?.full_name || "No contact"}`,
          };
        })
        .filter((option) => option.value),
    [vendorsQuery.data, checkedInUserIds]
  );
  const assignments = assignmentsQuery.data || [];
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
      <PageHeader
        title="Vendor Check-In"
        subtitle="Receive confirmed vendor deliveries into the warehouse."
        actions={<VendorWorkflowGuide />}
      />
      <Card className="mb-5 p-4">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(260px,1fr)_auto] lg:items-end">
          <div>
            <Label>Delivery date</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="flex shrink-0 items-center rounded-xl border border-slate-250/60 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg p-0 text-slate-500 hover:text-dailyveg-600"
                  onClick={() => changeDate(addDaysYyyyMmDd(date || today, -1))}
                  title="Previous day"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={date === today ? "default" : "ghost"}
                  className={`h-7 rounded-lg px-3.5 text-xs font-bold transition-all ${
                    date === today
                      ? "bg-gradient-to-r from-dailyveg-500 to-dailyveg-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-dailyveg-600 dark:text-slate-300"
                  }`}
                  onClick={() => changeDate(today)}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={date === tomorrow ? "default" : "ghost"}
                  className={`h-7 rounded-lg px-3.5 text-xs font-bold transition-all ${
                    date === tomorrow
                      ? "bg-gradient-to-r from-dailyveg-500 to-dailyveg-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-dailyveg-600 dark:text-slate-300"
                  }`}
                  onClick={() => changeDate(tomorrow)}
                >
                  Tomorrow
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg p-0 text-slate-500 hover:text-dailyveg-600"
                  onClick={() => changeDate(addDaysYyyyMmDd(date || today, 1))}
                  title="Next day"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <DatePicker
                selected={parseYyyyMmDd(date)}
                onChange={(selected) => selected && changeDate(toYyyyMmDd(selected))}
                dateFormat="dd-MM-yyyy"
                className="flex h-[36px] w-36 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 shadow-sm transition-all focus:border-dailyveg-500 focus:outline-none focus:ring-2 focus:ring-dailyveg-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <Label>Vendor</Label>
            <PremiumSelect
              value={vendorUserId}
              onChange={(value) => {
                setVendorUserId(value);
                setDrafts({});
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
              attendanceQuery.refetch();
            }}
            disabled={!vendorUserId || assignmentsQuery.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${assignmentsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Today's Digital Check-Ins Panel */}
      <Card className="mb-5 p-5 border-emerald-100/50 bg-emerald-50/10 dark:border-emerald-950/20 dark:bg-emerald-950/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg dark:bg-emerald-950 dark:text-emerald-350">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Today's Digital Check-Ins
            </h3>
          </div>
          <Badge variant="success" className="px-2 py-0.5 text-[10px] font-bold">
            {(attendanceQuery.data || []).length} Checked In
          </Badge>
        </div>

        {attendanceQuery.isLoading ? (
          <p className="text-xs text-slate-500 italic py-2">Loading check-ins…</p>
        ) : attendanceQuery.isError ? (
          <p className="text-xs text-red-600 italic py-2">Failed to load digital check-ins.</p>
        ) : (attendanceQuery.data || []).length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No digital check-ins recorded for this date.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(attendanceQuery.data || []).map((checkIn) => {
              const vendorName =
                checkIn.vendor?.company_name ||
                checkIn.company_name ||
                checkIn.vendor?.vendor_profile?.company_name ||
                checkIn.vendor_name ||
                "Unknown Vendor";
              const contactName =
                checkIn.vendor?.user?.full_name ||
                checkIn.vendor_user_name ||
                checkIn.user?.full_name ||
                "";
              const time =
                checkIn.checked_in_at ||
                checkIn.check_in_time ||
                checkIn.created_at ||
                checkIn.time;
              const formattedTime = formatTime(time);
              const lat = checkIn.latitude ?? checkIn.lat;
              const lng = checkIn.longitude ?? checkIn.lng;
              const hasCoords = lat !== undefined && lat !== null && lng !== undefined && lng !== null;
              const accuracy = checkIn.location_accuracy ?? checkIn.locationAccuracy;
              const warehouseName = checkIn.warehouse?.name || "";

              return (
                <div
                  key={checkIn.id || checkIn.vendor_user_id}
                  className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="mb-2">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {vendorName}
                      </h4>
                      {warehouseName && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200/60 font-medium">
                          {warehouseName}
                        </Badge>
                      )}
                    </div>
                    {contactName && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">
                        {contactName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 border-t border-slate-50 dark:border-slate-800/80 pt-2 mt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-slate-500 dark:text-slate-450">
                        Arrived: {formattedTime}
                      </span>
                      {accuracy !== undefined && accuracy !== null && (
                        <span className="font-medium text-slate-400 dark:text-slate-500 text-[9px]">
                          Accuracy: ±{Math.round(accuracy)}m
                        </span>
                      )}
                    </div>
                    {hasCoords && (
                      <div className="flex justify-end pt-0.5">
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline flex items-center gap-0.5"
                        >
                          <MapPin className="h-3 w-3 inline" /> View Location
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {!vendorUserId ? (
        <Card className="p-10 text-center text-slate-500">
          <ClipboardCheck className="mx-auto mb-3 h-9 w-9 text-slate-400" />
          Select a date and vendor to see active assignments.
        </Card>
      ) : assignmentsQuery.isLoading ? (
        <Card className="p-10 text-center text-slate-500">Loading assignments…</Card>
      ) : assignmentsQuery.isError ? (
        <Card className="p-10 text-center text-red-600">Could not load vendor assignments.</Card>
      ) : assignments.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">No active assignments for this vendor and date.</Card>
      ) : (
        <div className="space-y-3">
          {receivableAssignments.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                <div className="w-[60%]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Fast warehouse check-in
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    If the delivery is correct, prepare every supplied quantity as received with zero rejection.
                    You can still adjust exceptions below before submitting.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 w-[40%]">
                  <Badge variant={preparedCount === receivableAssignments.length ? "success" : "secondary"}>
                    {preparedCount}/{receivableAssignments.length} prepared
                  </Badge>
                  {preparedCount > 0 && (
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
                  )}
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
                </div>
              </div>
            </Card>
          )}
          {assignments.map((assignment) => {
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
            return (
              <Card key={assignment.id} className="p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(210px,1.4fr)_repeat(2,minmax(90px,.55fr))_repeat(2,minmax(115px,.7fr))_minmax(150px,.9fr)] xl:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{assignment.product?.name || "Unknown product"}</h3>
                      <Badge variant={status.variant}>
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
                          className="capitalize font-bold"
                        >
                          {assignment.outcome.replaceAll("_", " ")}
                        </Badge>
                      )}
                      <Badge variant={assignment.procurement_mode === "bulk" ? "success" : "outline"}>
                        {assignment.procurement_mode === "bulk" ? "Bulk" : "Pack"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {assignment.procurement_mode === "bulk"
                        ? `Product-level bulk supply · ${unit.toUpperCase()}`
                        : (assignment.pack_label || unit.toUpperCase())}
                    </p>
                    {assignment.check_in_override_reason && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg border border-amber-100/40 dark:border-amber-900/30">
                        <span className="font-semibold text-amber-800">Check-in Override:</span>
                        <span className="text-amber-700">"{assignment.check_in_override_reason}"</span>
                        {assignment.override_actor?.full_name && (
                          <span className="text-slate-400 dark:text-slate-500">
                            (by {assignment.override_actor.full_name})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Allocated bulk quantity</Label>
                    <p className="mt-2 font-semibold">{formatQuantityWithUnit(assignment.allocated_quantity, unit)}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Vendor supplied quantity</Label>
                    <p className="mt-2 font-semibold">{formatQuantityWithUnit(assignment.supplied_quantity, unit)}</p>
                  </div>
                  <div>
                    <Label htmlFor={`received-${assignment.id}`} className="text-xs">Received quantity ({unit.toUpperCase()})</Label>
                    <Input
                      id={`received-${assignment.id}`}
                      type="number"
                      min="0"
                      step="0.001"
                      disabled={!enabled}
                      value={draft.received_quantity ?? ""}
                      onChange={(event) => updateDraft(assignment.id, "received_quantity", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`rejected-${assignment.id}`} className="text-xs">Rejected quantity ({unit.toUpperCase()})</Label>
                    <Input
                      id={`rejected-${assignment.id}`}
                      type="number"
                      min="0"
                      step="0.001"
                      disabled={!enabled}
                      value={draft.rejected_quantity ?? ""}
                      onChange={(event) => updateDraft(assignment.id, "rejected_quantity", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Locked vendor price / {unit.toUpperCase()}</Label>
                    <p className="mt-2 font-semibold">{formatVendorMoney(assignment.unit_cost_paise)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm dark:border-slate-800">
                  <span className="text-slate-500">
                    Estimated accepted payout:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {assignment.unit_cost_paise === null ||
                      assignment.unit_cost_paise === undefined ||
                      Number(assignment.unit_cost_paise) <= 0
                        ? "Unavailable because vendor price is missing"
                        : estimatedPayout === null
                          ? "Enter received quantity"
                          : formatVendorMoney(estimatedPayout)}
                    </strong>
                  </span>
                  {(assignment.unit_cost_paise === null ||
                    assignment.unit_cost_paise === undefined ||
                    Number(assignment.unit_cost_paise) <= 0) && (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      Vendor price is missing
                    </span>
                  )}
                  {enabled && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setFullAcceptance(assignment)}
                        disabled={receiveMutation.isPending}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Accept full supply
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                        onClick={() => setFullRejection(assignment)}
                        disabled={receiveMutation.isPending}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Reject full supply
                      </Button>
                    </div>
                  )}
                </div>
                {!enabled && assignment.status !== "received" && (
                  <p className="mt-3 text-xs text-amber-700">This assignment must be confirmed or dispatched before check-in.</p>
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
      )}
      {pendingOverrideEntries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-md p-6 border-slate-200/80 shadow-2xl bg-white dark:border-slate-800 dark:bg-slate-950 animate-scale-in">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <MapPin className="h-6 w-6 stroke-[2.5]" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Vendor Check-In Required
              </h3>
            </div>
            <p className="text-xs text-slate-650 dark:text-slate-400 mb-4 leading-relaxed">
              This vendor has not recorded a valid digital check-in at this warehouse today. 
              Under company policy, check-ins must be validated within the geofence before receiving goods.
              <br /><br />
              Do you want to apply an <strong>Admin Override</strong> to bypass this check?
            </p>
            <div className="mb-5">
              <Label htmlFor="override-reason" className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                Reason for Override <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="override-reason"
                placeholder="e.g. Goods delivered by replacement driver"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPendingOverrideEntries(null);
                  setOverrideReason("");
                }}
                disabled={receiveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const overridden = pendingOverrideEntries.map(e => ({
                    ...e,
                    admin_override: true,
                    check_in_override_reason: overrideReason.trim()
                  }));
                  receiveMutation.mutate(overridden);
                  setPendingOverrideEntries(null);
                  setOverrideReason("");
                }}
                disabled={receiveMutation.isPending || !overrideReason.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {receiveMutation.isPending ? "Submitting..." : "Override & Confirm"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
