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
  ClipboardCheck,
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
import { FreshStockTab } from "./tabs/fresh-stock-tab";
import { PackingTab } from "./tabs/packing-tab";
import { DispatchTab } from "./tabs/dispatch-tab";
import { ExceptionsCloseTab } from "./tabs/exceptions-close-tab";
import { VendorCheckInTab } from "./tabs/vendor-check-in-tab";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { Boxes } from "lucide-react";

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
  if (val === "stock" || val === "fresh-stock" || val === "inventory") return "stock";
  if (val === "vendor-check-in" || val === "check-in" || val === "vendorcheckin" || val === "checkin") return "vendor-check-in";
  if (val === "packing") return "packing";
  if (val === "dispatch") return "dispatch";
  if (val === "exceptions" || val === "reconciliation" || val === "closing" || val === "exceptions-close") {
    return "exceptions-close";
  }
  return "control";
}

const TABS = [
  { key: "control", label: "Overview", shortLabel: "Overview", icon: Layers },
  { key: "procurement", label: "Purchase", shortLabel: "Buy", icon: ShoppingCart },
  { key: "stock", label: "Stock", shortLabel: "Stock", icon: Boxes },
  { key: "vendor-check-in", label: "Receive", shortLabel: "Receive", icon: ClipboardCheck },
  { key: "packing", label: "Pack", shortLabel: "Pack", icon: PackageCheck },
  { key: "dispatch", label: "Dispatch", shortLabel: "Dispatch", icon: Truck },
  { key: "exceptions-close", label: "Close Day", shortLabel: "Close", icon: AlertTriangle },
];

export function DailyOperationsPage() {
  const { roles, user, booting } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = roles.includes("admin");
  const isWarehouseManager = roles.includes("warehouse_manager") && !isAdmin;
  const [procurementView, setProcurementView] = useState("active");
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 639px)").matches : false
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const syncViewport = () => setIsMobileViewport(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

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
    queryKey: ["ops", "orders", "full", selectedDate, selectedWarehouseId],
    queryFn: () =>
      OpsOrdersService.list({
        delivery_date: selectedDate,
        warehouse_id: selectedWarehouseId,
        limit: 1000,
        // The Pack tab needs the address snapshot chosen at checkout, not only
        // the compact area/city fields used by list views.
        view: "full",
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
    <div className="space-y-4 animate-in fade-in duration-300 sm:space-y-6">
      {/* Sticky Header and Filters Panel */}
      <div className="sticky top-[61px] lg:top-0 z-30 -mx-4 border-b border-slate-200/80 bg-slate-50/90 px-4 py-3.5 shadow-sm backdrop-blur-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950/90 sm:-mx-8 sm:px-8">
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

          <div className="grid w-full grid-cols-[minmax(0,1fr)_104px] items-center gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-2.5 shrink-0">
            {/* Quick Date Selector Group */}
            <div className="flex min-w-0 items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:justify-start shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 shrink-0 p-0 text-slate-500 hover:text-dailyveg-600 rounded-lg"
                onClick={handlePrevDay}
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant={selectedDate === getIstYyyyMmDd() ? "default" : "ghost"}
                className={`h-8 min-w-0 flex-1 px-2 text-xs font-bold rounded-xl transition-all sm:h-7 sm:flex-none sm:px-3.5 ${selectedDate === getIstYyyyMmDd()
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
                className={`h-8 min-w-0 flex-1 px-2 text-xs font-bold rounded-xl transition-all sm:h-7 sm:flex-none sm:px-3.5 ${selectedDate === addDaysYyyyMmDd(getIstYyyyMmDd(), 1)
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
                className="h-7 w-7 shrink-0 p-0 text-slate-500 hover:text-dailyveg-600 rounded-lg"
                onClick={handleNextDay}
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Date Picker Input */}
            <div className="relative min-w-0 sm:shrink-0">
              <DatePicker
                selected={parseYyyyMmDd(selectedDate)}
                onChange={(d) => d && handleDateChange(toYyyyMmDd(d))}
                dateFormat="dd-MM-yyyy"
                withPortal={isMobileViewport}
                className="flex h-[38px] w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-800 shadow-sm transition-all focus:border-dailyveg-500 focus:outline-none focus:ring-2 focus:ring-dailyveg-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:h-[36px] sm:w-36 sm:px-3.5 sm:text-xs"
              />
            </div>

            {/* Admin Warehouse Selector */}
            {isAdmin && (
              <div className="w-full min-w-0 sm:w-52 sm:shrink-0">
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
              className="h-[38px] w-full px-2 text-xs font-bold gap-1.5 rounded-xl border-slate-200 bg-white shadow-sm hover:border-dailyveg-300 hover:bg-dailyveg-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-dailyveg-950/50 shrink-0 sm:h-[36px] sm:w-auto sm:gap-2 sm:px-4"
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
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-dailyveg-50/30 to-emerald-50/40 p-3.5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900/60 dark:to-dailyveg-950/20 sm:bg-gradient-to-r sm:p-4">
        <div className="grid grid-cols-2 items-center gap-x-1 gap-y-2 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="contents sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
            {/* Delivery Date Tag */}
            <div className="col-span-2 flex min-w-0 items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/80 sm:py-1.5">
              <Calendar className="h-4 w-4 text-dailyveg-600" />
              <span className="text-xs font-semibold text-slate-500">Delivery Date:</span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">{formatDateLabel(selectedDate)}</span>
            </div>

            {/* Warehouse Tag */}
            <div className="col-span-2 flex min-w-0 items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/80 sm:py-1.5">
              <Warehouse className="h-4 w-4 text-dailyveg-600" />
              <span className="text-xs font-semibold text-slate-500">Warehouse:</span>
              <span className="truncate text-xs font-extrabold text-slate-900 dark:text-white">
                {operation.warehouse_name || "Assigned Warehouse"}
              </span>
            </div>

            {/* Status Badge */}
            <div className="col-span-1 flex min-w-0 items-center gap-2 px-1 sm:px-0">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <StatusBadge value={operation.status || "open"} />
            </div>
          </div>

          {/* Real React Query dataUpdatedAt timestamp in IST */}
          <div className="col-span-1 flex min-w-0 items-center gap-1 rounded-xl bg-white/60 px-1.5 py-2 text-[9px] font-semibold text-slate-500 whitespace-nowrap dark:bg-slate-900/60 dark:text-slate-400 sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="sm:hidden">Last Refreshed IST:</span>
            <span className="hidden sm:inline">Last refreshed IST:</span>
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN") : "—"}
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
      <div className="rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1.5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="grid grid-cols-2 min-[430px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 items-center gap-1.5 xl:gap-2">
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const activeIndex = TABS.findIndex((t) => t.key === activeTab);
            const active = activeIndex === index;
            const completed = index < activeIndex;
            const badge = getTabBadge(tab.key);

            return (
              <div key={tab.key} className="relative flex items-center justify-center min-w-0">
                <button
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex min-h-12 w-full items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-bold rounded-xl transition-all duration-300 min-w-0 sm:min-h-0 sm:text-xs xl:gap-2 xl:px-3 xl:py-2.5 xl:text-sm ${active
                    ? "bg-gradient-to-r from-dailyveg-500 to-emerald-600 text-white shadow-md shadow-dailyveg-500/20 scale-[1.02] border border-emerald-500/20"
                    : completed
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/10 hover:bg-emerald-100/40 dark:hover:bg-emerald-950/30"
                      : "text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white border border-transparent"
                    }`}
                >
                  {/* Step Circle Badge */}
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-all ${active
                      ? "bg-white text-dailyveg-700 shadow-sm"
                      : completed
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-slate-300 dark:group-hover:bg-slate-700"
                      }`}
                  >
                    {completed ? "✓" : `0${index + 1}`}
                  </span>

                  {/* Icon */}
                  <Icon
                    className={`hidden h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110 min-[430px]:block ${active
                      ? "text-white"
                      : completed
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                      }`}
                  />

                  {/* Label */}
                  <span className="min-w-0 truncate">
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="inline lg:hidden">{tab.shortLabel}</span>
                  </span>

                  {/* Notification Badge */}
                  {badge && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${active
                        ? "bg-white text-dailyveg-700"
                        : "bg-rose-500 text-white shadow-sm"
                        }`}
                    >
                      {badge}
                    </span>
                  )}

                  {/* Pulse Indicator on Active */}
                  {active && (
                    <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                    </span>
                  )}
                </button>
              </div>
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
            onSelectTab={handleTabChange}
            operation={operation}
            warehouseId={selectedWarehouseId || operation?.warehouse_id}
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

        {activeTab === "stock" && (
          <FreshStockTab
            operationId={operation?.id}
            warehouseId={selectedWarehouseId || operation?.warehouse_id}
            isClosed={isClosed}
          />
        )}

        {activeTab === "vendor-check-in" && (
          <VendorCheckInTab
            deliveryDate={selectedDate}
            warehouseId={selectedWarehouseId}
            isClosed={isClosed}
            isAdmin={isAdmin}
            isWarehouseManager={isWarehouseManager}
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
            onChangeProposedRunPartner={mutations.changeProposedRunDeliveryPartnerMutation.mutateAsync}
            isCreatingRun={mutations.createRunMutation.isPending}
            isHandingOver={mutations.handoverRunMutation.isPending}
            isGeneratingPlan={mutations.generateDeliveryPlanMutation.isPending}
            isApprovingPlan={mutations.approveDeliveryPlanMutation.isPending}
            isChangingProposedRunPartner={mutations.changeProposedRunDeliveryPartnerMutation.isPending}
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
