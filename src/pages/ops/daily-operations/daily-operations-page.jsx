import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, addDays, parseISO, isValid } from "date-fns";
import { getIstYyyyMmDd, addDaysYyyyMmDd } from "../../../utils/date.util";
import {
  CalendarDays,
  Warehouse,
  RefreshCw,
  Clock,
  Layers,
  ShoppingCart,
  PackageCheck,
  Truck,
  AlertTriangle,
  Receipt,
  CheckSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useAuth } from "../../../auth/auth-context";
import { useQuery } from "@tanstack/react-query";
import { WarehousesService } from "../../../api/services/warehouses.service";
import { OpsOrdersService } from "../../../api/services/ops-orders.service";
import { listProducts } from "../../../api/services/products.service";
import {
  useDailyOperationsOverview,
  useDailyOperationDetail,
  useDailyOperationsProcurement,
  useDailyOperationsPacking,
  useDailyOperationsRuns,
  useDailyOperationsExceptions,
  useDailyOperationsWaste,
  useDailyOperationsReconciliation,
  useDailyOperationsMutations,
  useDailyOperationsAutomationSummary,
} from "../../../api/services/daily-operations.hooks";

import { PageHeader } from "../../../components/common/page-header";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { StatusBadge } from "../../../components/common/status-badge";
import { PremiumSelect } from "../../../components/ui/premium-select";
import { useToast } from "../../../components/toast/toast-context";
import {
  mapErrorCodeToUserMessage,
  formatPaiseToRupees,
} from "../../../utils/daily-operations-helpers";

import { ControlCenter } from "./tabs/control-center";
import { ProcurementTab } from "./tabs/procurement-tab";
import { PackingTab } from "./tabs/packing-tab";
import { DispatchTab } from "./tabs/dispatch-tab";
import { ExceptionsCloseTab } from "./tabs/exceptions-close-tab";
import { formatIndianDateTime } from "../../../utils/date-formatter";

function toYyyyMmDd(date) {
  if (!date || !isValid(date)) return addDaysYyyyMmDd(getIstYyyyMmDd(), 1);
  return format(date, "yyyy-MM-dd");
}

function parseYyyyMmDd(str) {
  if (!str) return null;
  const d = parseISO(str);
  return isValid(d) ? d : null;
}

function formatDateLabel(value) {
  return formatIndianDateTime(value);
}

// Stable tab URL values mapper
function mapTabKey(key) {
  if (!key) return "control";
  const val = String(key).toLowerCase();
  if (val === "overview" || val === "control") return "control";
  if (val === "procurement") return "procurement";
  if (val === "packing") return "packing";
  if (val === "dispatch") return "dispatch";
  if (val === "exceptions" || val === "reconciliation" || val === "closing" || val === "exceptions-close") {
    return "exceptions-close";
  }
  return "control";
}

const TABS = [
  { key: "control", label: "1. Control Center", icon: Layers },
  { key: "procurement", label: "2. Procurement", icon: ShoppingCart },
  { key: "packing", label: "3. Packing Station", icon: PackageCheck },
  { key: "dispatch", label: "4. Dispatch Board", icon: Truck },
  { key: "exceptions-close", label: "5. Exceptions & Close", icon: AlertTriangle },
];

export function DailyOperationsPage() {
  const { roles, user, booting } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = roles.includes("admin");
  const isWarehouseManager = roles.includes("warehouse_manager") && !isAdmin;
  const [procurementView, setProcurementView] = useState("active");

  // Read URL query params with defaults and tab mapping
  const dateFromUrl = searchParams.get("delivery_date");
  const warehouseIdFromUrl = searchParams.get("warehouse_id");
  const rawTab = searchParams.get("tab");
  const tabFromUrl = useMemo(() => mapTabKey(rawTab), [rawTab]);

  // Initial state setup using URL query params, falling back to localStorage, then default values
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateFromUrl) {
      localStorage.setItem("daily_ops_delivery_date", dateFromUrl);
      return dateFromUrl;
    }
    const saved = localStorage.getItem("daily_ops_delivery_date");
    if (saved) return saved;
    return addDaysYyyyMmDd(getIstYyyyMmDd(), 1);
  });

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(() => {
    if (warehouseIdFromUrl) {
      localStorage.setItem("daily_ops_warehouse_id", warehouseIdFromUrl);
      return warehouseIdFromUrl;
    }
    const saved = localStorage.getItem("daily_ops_warehouse_id");
    if (saved) return saved;
    return "";
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (rawTab) {
      localStorage.setItem("daily_ops_active_tab", tabFromUrl);
      return tabFromUrl;
    }
    const saved = localStorage.getItem("daily_ops_active_tab");
    if (saved) return mapTabKey(saved);
    return tabFromUrl;
  });

  // Update URL helper
  const updateUrlParams = useCallback(
    (newDate, newWhId, newTab) => {
      const params = new URLSearchParams();
      if (newDate) params.set("delivery_date", newDate);
      if (newWhId) params.set("warehouse_id", newWhId);
      if (newTab) params.set("tab", newTab);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  // Sync state back to URL on mount or query param absence
  useEffect(() => {
    if (booting) return;
    const hasDate = searchParams.has("delivery_date");
    const hasWh = searchParams.has("warehouse_id");
    const hasTab = searchParams.has("tab");

    const needsSync = !hasDate || !hasTab || (isAdmin && !hasWh);

    if (needsSync) {
      updateUrlParams(selectedDate, selectedWarehouseId, activeTab);
    }
  }, [searchParams, selectedDate, selectedWarehouseId, activeTab, updateUrlParams, booting, isAdmin]);

  // Sync URL changes back to state and localStorage (e.g. browser back/forward navigation)
  useEffect(() => {
    if (dateFromUrl && dateFromUrl !== selectedDate) {
      setSelectedDate(dateFromUrl);
      localStorage.setItem("daily_ops_delivery_date", dateFromUrl);
    }
  }, [dateFromUrl, selectedDate]);

  useEffect(() => {
    if (booting) return;
    if (warehouseIdFromUrl && warehouseIdFromUrl !== selectedWarehouseId) {
      setSelectedWarehouseId(warehouseIdFromUrl);
      if (warehouseIdFromUrl) {
        localStorage.setItem("daily_ops_warehouse_id", warehouseIdFromUrl);
      } else {
        localStorage.removeItem("daily_ops_warehouse_id");
      }
    }
  }, [warehouseIdFromUrl, selectedWarehouseId, booting]);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
      localStorage.setItem("daily_ops_active_tab", tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  // Fetch warehouses list if Admin
  const { data: warehousesData } = useQuery({
    queryKey: ["admin", "warehouses"],
    queryFn: () => WarehousesService.list(),
    enabled: isAdmin,
  });
  const warehousesList = warehousesData?.warehouses || warehousesData || [];


  // Auto-redirect legacy parameters in URL
  useEffect(() => {
    const mapped = mapTabKey(rawTab);
    if (rawTab !== mapped) {
      updateUrlParams(selectedDate, selectedWarehouseId, mapped);
    }
  }, [rawTab, selectedDate, selectedWarehouseId, updateUrlParams]);

  // Synchronize state changes to URL and Local Storage
  const handleDateChange = (newDateStr) => {
    setSelectedDate(newDateStr);
    localStorage.setItem("daily_ops_delivery_date", newDateStr);
    updateUrlParams(newDateStr, selectedWarehouseId, activeTab);
  };

  const handleWarehouseChange = (whId) => {
    setSelectedWarehouseId(whId);
    if (whId) {
      localStorage.setItem("daily_ops_warehouse_id", whId);
    } else {
      localStorage.removeItem("daily_ops_warehouse_id");
    }
    updateUrlParams(selectedDate, whId, activeTab);
  };

  const handleTabChange = (tabKey) => {
    const mapped = mapTabKey(tabKey);
    setActiveTab(mapped);
    localStorage.setItem("daily_ops_active_tab", mapped);
    updateUrlParams(selectedDate, selectedWarehouseId, mapped);
  };

  // Visibility state for polling check
  const [isTabVisible, setIsTabVisible] = useState(() => {
    return typeof document !== "undefined" ? document.visibilityState === "visible" : true;
  });

  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Fetch Main Overview Data
  const {
    data: overview,
    isLoading: isLoadingOverview,
    error: overviewError,
    refetch: refetchOverview,
    dataUpdatedAt,
  } = useDailyOperationsOverview({
    deliveryDate: selectedDate,
    warehouseId: isAdmin ? selectedWarehouseId : selectedWarehouseId || undefined,
    enabled: Boolean(!booting && selectedDate && (isAdmin ? selectedWarehouseId : true)),
    // Poll approximately every 30 seconds under specific conditions
    refetchInterval: (query) => {
      const status = query.state.data?.operation?.status;
      const isOpen = status && status !== "closed";
      const isWhSelected = isAdmin ? Boolean(selectedWarehouseId) : true;
      return isOpen && isTabVisible && isWhSelected && selectedDate ? 30000 : false;
    },
  });

  // Handle warehouse_manager auto warehouse resolution from overview response
  useEffect(() => {
    if (overview?.operation?.warehouse_id && !selectedWarehouseId) {
      const resolvedWhId = overview.operation.warehouse_id;
      setSelectedWarehouseId(resolvedWhId);
      localStorage.setItem("daily_ops_warehouse_id", resolvedWhId);
      updateUrlParams(selectedDate, resolvedWhId, activeTab);
    }
  }, [overview, selectedWarehouseId, selectedDate, activeTab, updateUrlParams]);

  // Clear incorrect warehouse_id if request fails for a warehouse manager
  useEffect(() => {
    if (booting) return;
    if (isWarehouseManager && overviewError) {
      setSelectedWarehouseId("");
      localStorage.removeItem("daily_ops_warehouse_id");
      updateUrlParams(selectedDate, "", activeTab);
    }
  }, [overviewError, isWarehouseManager, selectedDate, activeTab, updateUrlParams, booting]);

  const operation = overview?.operation || {};
  const operationId = operation.id || null;
  const isClosed = operation.status === "closed";

  // Data Queries for sub-tabs
  const { data: operationDetail } = useDailyOperationDetail(operationId, { enabled: Boolean(operationId) });

  const {
    data: procurementData,
    isLoading: isLoadingProcurement,
    isError: isProcurementError,
    refetch: refetchProcurement,
  } = useDailyOperationsProcurement(operationId, {
    // History must include received portions of products that also have new pending demand.
    view: procurementView === "history" ? "all" : procurementView,
    deliveryDate: selectedDate,
    warehouseId: selectedWarehouseId,
    enabled: Boolean(operationId && activeTab === "procurement"),
  });

  const { data: packingData, isLoading: isLoadingPacking } = useDailyOperationsPacking(operationId, {
    enabled: Boolean(operationId && activeTab === "packing"),
  });

  const { data: runsData, isLoading: isLoadingRuns } = useDailyOperationsRuns(operationId, {
    enabled: Boolean(operationId && (activeTab === "dispatch" || activeTab === "exceptions-close" || activeTab === "control")),
  });

  const { data: exceptionsData, isLoading: isLoadingExceptions } = useDailyOperationsExceptions(operationId, {
    enabled: Boolean(operationId && (activeTab === "exceptions-close" || activeTab === "control")),
  });

  const { data: wasteData } = useDailyOperationsWaste(operationId, {
    enabled: Boolean(operationId && activeTab === "exceptions-close"),
  });

  const { data: reconciliationData, isLoading: isLoadingReconciliation } = useDailyOperationsReconciliation(operationId, {
    enabled: Boolean(operationId && activeTab === "exceptions-close"),
  });

  // Automation Capabilities summary
  const { data: automationSummary } = useDailyOperationsAutomationSummary(operationId, {
    enabled: Boolean(operationId),
  });

  // Supporting Data Queries (Riders & all OPS orders - limit 1000 to avoid silent drop)
  const { data: deliveryPartnersData } = useQuery({
    queryKey: ["ops", "deliveryPartners", selectedWarehouseId],
    queryFn: () => OpsOrdersService.listDeliveryPartners({ warehouse_id: selectedWarehouseId }),
    enabled: Boolean(selectedWarehouseId),
  });
  const deliveryPartners = deliveryPartnersData?.partners || [];

  const { data: opsOrdersData } = useQuery({
    queryKey: ["ops", "orders", "packed", selectedDate, selectedWarehouseId],
    queryFn: () =>
      OpsOrdersService.list({
        delivery_date: selectedDate,
        warehouse_id: selectedWarehouseId,
        limit: 1000,
      }),
    enabled: Boolean(selectedDate && selectedWarehouseId),
  });
  const opsOrders = opsOrdersData?.orders || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", "list"],
    queryFn: () => listProducts({ limit: 1000 }),
    enabled: Boolean(activeTab === "exceptions-close"),
  });
  const products = productsData?.products || productsData || [];

  // Mutations Hook
  const mutations = useDailyOperationsMutations(operationId);

  const handleRefresh = async () => {
    if (!operationId) {
      refetchOverview();
      return;
    }
    try {
      await mutations.refreshMutation.mutateAsync();
      toast.success("Daily Operations refreshed successfully");
    } catch (err) {
      toast.error(mapErrorCodeToUserMessage(err));
    }
  };

  // Quick Date Buttons
  const handleDateToday = () => handleDateChange(getIstYyyyMmDd());
  const handleDateTomorrow = () => handleDateChange(addDaysYyyyMmDd(getIstYyyyMmDd(), 1));
  const handlePrevDay = () => {
    const cur = selectedDate || getIstYyyyMmDd();
    handleDateChange(addDaysYyyyMmDd(cur, -1));
  };
  const handleNextDay = () => {
    const cur = selectedDate || getIstYyyyMmDd();
    handleDateChange(addDaysYyyyMmDd(cur, 1));
  };

  // Badge count lookup for tab pills
  const getTabBadge = (tabKey) => {
    if (!overview) return null;
    if (tabKey === "exceptions-close") {
      const openCount = overview.exception_metrics?.total_open_exceptions || 0;
      return openCount > 0 ? openCount : null;
    }
    if (tabKey === "dispatch") {
      const activeRuns = overview.delivery_run_metrics?.active_runs || 0;
      return activeRuns > 0 ? activeRuns : null;
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Sticky Header and Filters Panel */}
      <div className="sticky top-[61px] lg:top-0 z-30 -mx-4 px-4 sm:-mx-8 sm:px-8 py-3.5 bg-slate-50/80 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all duration-300">
        <div className="max-w-full flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-dailyveg-700 dark:text-dailyveg-200">
              Daily Store Operations
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Automated, exception-driven store controls workspace.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            {/* Quick Date Selector Group */}
            <div className="flex items-center rounded-xl border border-slate-250/60 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-500 hover:text-dailyveg-600 rounded-lg"
                onClick={handlePrevDay}
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant={selectedDate === getIstYyyyMmDd() ? "default" : "ghost"}
                className={`h-7 px-3.5 text-xs font-bold rounded-lg transition-all ${selectedDate === getIstYyyyMmDd()
                    ? "bg-gradient-to-r from-dailyveg-500 to-dailyveg-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-dailyveg-600"
                  }`}
                onClick={handleDateToday}
              >
                Today
              </Button>

              <Button
                size="sm"
                variant={selectedDate === addDaysYyyyMmDd(getIstYyyyMmDd(), 1) ? "default" : "ghost"}
                className={`h-7 px-3.5 text-xs font-bold rounded-lg transition-all ${selectedDate === addDaysYyyyMmDd(getIstYyyyMmDd(), 1)
                    ? "bg-gradient-to-r from-dailyveg-500 to-dailyveg-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-dailyveg-600"
                  }`}
                onClick={handleDateTomorrow}
              >
                Tomorrow
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-500 hover:text-dailyveg-600 rounded-lg"
                onClick={handleNextDay}
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Date Picker Input */}
            <div className="relative shrink-0">
              <DatePicker
                selected={parseYyyyMmDd(selectedDate)}
                onChange={(d) => d && handleDateChange(toYyyyMmDd(d))}
                dateFormat="dd-MM-yyyy"
                className="flex h-[36px] w-36 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 shadow-sm transition-all focus:border-dailyveg-500 focus:outline-none focus:ring-2 focus:ring-dailyveg-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Admin Warehouse Selector */}
            {isAdmin && (
              <div className="w-52 shrink-0">
                <PremiumSelect
                  value={selectedWarehouseId}
                  onChange={(val) => handleWarehouseChange(val)}
                  placeholder="Select Warehouse..."
                  isClearable
                  options={warehousesList.map((w) => ({
                    value: w.id,
                    label: w.name,
                  }))}
                />
              </div>
            )}

            {/* Refresh Action */}
            <Button
              size="sm"
              variant="outline"
              className="h-[36px] px-4 text-xs font-bold gap-2 rounded-xl border-slate-200 bg-white shadow-sm hover:border-dailyveg-300 hover:bg-dailyveg-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-dailyveg-950/50 shrink-0"
              onClick={handleRefresh}
              disabled={mutations.refreshMutation.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 text-dailyveg-600 ${mutations.refreshMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Glassmorphic Context Header Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-dailyveg-50/30 to-emerald-50/40 p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900/60 dark:to-dailyveg-950/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Delivery Date Tag */}
            <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <Calendar className="h-4 w-4 text-dailyveg-600" />
              <span className="text-xs font-semibold text-slate-500">Delivery Date:</span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">{formatDateLabel(selectedDate)}</span>
            </div>

            {/* Warehouse Tag */}
            <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <Warehouse className="h-4 w-4 text-dailyveg-600" />
              <span className="text-xs font-semibold text-slate-500">Warehouse:</span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {operation.warehouse_name || "Assigned Warehouse"}
              </span>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <StatusBadge value={operation.status || "open"} />
            </div>
          </div>

          {/* Real React Query dataUpdatedAt timestamp in IST */}
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-white/60 dark:bg-slate-900/60 px-3 py-1 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Last refreshed IST: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN") : "—"}
          </div>
        </div>
      </div>

      {/* Backend Error State Banner */}
      {overviewError && (
        <Card className="p-4 border-rose-300 bg-rose-50/90 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <h4 className="font-bold text-sm">Operational Request Failed</h4>
              <p className="text-xs mt-1 font-mono">{mapErrorCodeToUserMessage(overviewError)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="grid w-full grid-cols-5 items-center gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            const badge = getTabBadge(tab.key);

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`group relative flex min-w-0 items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${active
                  ? "bg-gradient-to-r from-dailyveg-500 via-dailyveg-600 to-emerald-600 text-white shadow-lg shadow-dailyveg-500/25 scale-[1.02]"
                  : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
                  }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${active ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>

                <span>{tab.label}</span>

                {badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${active
                      ? "bg-white text-dailyveg-700"
                      : "bg-rose-500 text-white shadow-sm"
                      }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Workspaces Component Mapping */}
      <div className="transition-all duration-300">
        {activeTab === "control" && (
          <ControlCenter
            overview={overview}
            deliveryDate={selectedDate}
            warehouseId={selectedWarehouseId}
            onSelectTab={handleTabChange}
            isAdmin={isAdmin}
            capabilitiesRaw={automationSummary}
          />
        )}

        {activeTab === "procurement" && (
          <ProcurementTab
            procurementData={procurementData}
            isLoading={isLoadingProcurement}
            isError={isProcurementError}
            onRetry={refetchProcurement}
            workView={procurementView}
            onWorkViewChange={setProcurementView}
            operation={operation}
            isClosed={isClosed}
            isAdmin={isAdmin}
            isWarehouseManager={isWarehouseManager}
            onUpdateItem={mutations.updateProcurementItemMutation.mutateAsync}
            onBulkUpdate={mutations.bulkProcurementMutation.mutateAsync}
            isUpdating={
              mutations.updateProcurementItemMutation.isPending ||
              mutations.bulkProcurementMutation.isPending
            }
            capabilitiesRaw={automationSummary}
          />
        )}

        {activeTab === "packing" && (
          <PackingTab
            packingData={packingData}
            isLoading={isLoadingPacking}
            operation={operation}
            isClosed={isClosed}
            isAdmin={isAdmin}
            opsOrders={opsOrders}
            onStartPacking={mutations.startPackingMutation.mutateAsync}
            onUpdatePackingItem={mutations.updatePackingItemMutation.mutateAsync}
            onCompletePacking={mutations.completePackingMutation.mutateAsync}
            onConfirmCleanPacking={mutations.confirmCleanPackingMutation.mutateAsync}
            isStarting={mutations.startPackingMutation.isPending}
            isUpdatingItem={mutations.updatePackingItemMutation.isPending}
            isCompleting={mutations.completePackingMutation.isPending}
            isConfirmingClean={mutations.confirmCleanPackingMutation.isPending}
            capabilitiesRaw={automationSummary}
          />
        )}

        {activeTab === "dispatch" && (
          <DispatchTab
            runsData={runsData}
            isLoading={isLoadingRuns}
            operation={operation}
            isClosed={isClosed}
            deliveryPartners={deliveryPartners}
            opsOrders={opsOrders}
            onCreateRun={mutations.createRunMutation.mutateAsync}
            onUpdateRun={mutations.updateRunMutation.mutateAsync}
            onAddRunOrders={mutations.addRunOrdersMutation.mutateAsync}
            onRemoveRunOrder={mutations.removeRunOrderMutation.mutateAsync}
            onReorderRunOrders={mutations.reorderRunOrdersMutation.mutateAsync}
            onHandoverRun={mutations.handoverRunMutation.mutateAsync}
            onGeneratePlan={mutations.generateDeliveryPlanMutation.mutateAsync}
            onApprovePlan={mutations.approveDeliveryPlanMutation.mutateAsync}
            isCreatingRun={mutations.createRunMutation.isPending}
            isHandingOver={mutations.handoverRunMutation.isPending}
            isGeneratingPlan={mutations.generateDeliveryPlanMutation.isPending}
            isApprovingPlan={mutations.approveDeliveryPlanMutation.isPending}
            capabilitiesRaw={automationSummary}
          />
        )}

        {activeTab === "exceptions-close" && (
          <ExceptionsCloseTab
            exceptionsData={exceptionsData}
            isLoadingExceptions={isLoadingExceptions}
            operation={operation}
            isClosed={isClosed}
            isAdmin={isAdmin}
            onSelectTab={handleTabChange}
            onCreateException={mutations.createExceptionMutation.mutateAsync}
            onUpdateException={mutations.updateExceptionMutation.mutateAsync}
            isCreatingException={mutations.createExceptionMutation.isPending}
            isUpdatingException={mutations.updateExceptionMutation.isPending}

            reconciliationData={reconciliationData}
            runsData={runsData}
            wasteData={wasteData}
            products={products}
            onCreateWaste={mutations.createWasteMutation.mutateAsync}
            onReconcileRun={mutations.reconcileRunMutation.mutateAsync}
            onReconcileCodVariance={mutations.reconcileCodVarianceMutation.mutateAsync}
            isCreatingWaste={mutations.createWasteMutation.isPending}
            isReconcilingCod={mutations.reconcileRunMutation.isPending || mutations.reconcileCodVarianceMutation.isPending}

            operationDetail={operationDetail}
            onSaveNotes={mutations.notesMutation.mutateAsync}
            onCloseOperation={mutations.closeOperationMutation.mutateAsync}
            onReopenOperation={mutations.reopenOperationMutation.mutateAsync}
            onEvaluateAutoClose={mutations.evaluateAutoCloseMutation.mutateAsync}
            isSavingNotes={mutations.notesMutation.isPending}
            isClosing={mutations.closeOperationMutation.isPending}
            isReopening={mutations.reopenOperationMutation.isPending}
            isEvaluatingAutoClose={mutations.evaluateAutoCloseMutation.isPending}
            capabilitiesRaw={automationSummary}
          />
        )}
      </div>
    </div>
  );
}
