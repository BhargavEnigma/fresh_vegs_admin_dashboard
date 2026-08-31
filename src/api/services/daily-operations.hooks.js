import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DailyOperationsService } from "./daily-operations.service";

export const dailyOperationsKeys = {
  all: ["ops", "dailyOperations"],
  overview: (deliveryDate, warehouseId) => [
    ...dailyOperationsKeys.all,
    "overview",
    deliveryDate || "none",
    warehouseId || "none",
  ],
  operation: (operationId) => [...dailyOperationsKeys.all, "operation", operationId || "none"],
  procurement: (operationId, view, deliveryDate, warehouseId) => [
    ...dailyOperationsKeys.all,
    "procurement",
    operationId || "none",
    view || "active",
    deliveryDate || "none",
    warehouseId || "none",
  ],
  procurementScope: (operationId) => [
    ...dailyOperationsKeys.all,
    "procurement",
    operationId || "none",
  ],
  packing: (operationId) => [...dailyOperationsKeys.all, "packing", operationId || "none"],
  packingOrder: (operationId, orderId) => [
    ...dailyOperationsKeys.all,
    "packingOrder",
    operationId || "none",
    orderId || "none",
  ],
  runs: (operationId) => [...dailyOperationsKeys.all, "runs", operationId || "none"],
  run: (runId) => [...dailyOperationsKeys.all, "run", runId || "none"],
  exceptions: (operationId, status) => [
    ...dailyOperationsKeys.all,
    "exceptions",
    operationId || "none",
    status || "all",
  ],
  waste: (operationId) => [...dailyOperationsKeys.all, "waste", operationId || "none"],
  reconciliation: (operationId) => [...dailyOperationsKeys.all, "reconciliation", operationId || "none"],
  automationSummary: (operationId) => [...dailyOperationsKeys.all, "automationSummary", operationId || "none"],
  proposedDeliveryPlan: (operationId) => [...dailyOperationsKeys.all, "proposedDeliveryPlan", operationId || "none"],
  inventorySummary: (operationId) => [...dailyOperationsKeys.all, "inventorySummary", operationId || "none"],
  lots: (productId, warehouseId, status) => [
    ...dailyOperationsKeys.all,
    "lots",
    productId || "none",
    warehouseId || "none",
    status || "all",
  ],
  lot: (lotId) => [...dailyOperationsKeys.all, "lot", lotId || "none"],
  lotMovements: (lotId) => [...dailyOperationsKeys.all, "lotMovements", lotId || "none"],
};

export function useDailyOperationsOverview({ deliveryDate, warehouseId, enabled = true, ...options }) {
  return useQuery({
    queryKey: dailyOperationsKeys.overview(deliveryDate, warehouseId),
    queryFn: () => DailyOperationsService.getOverview({ delivery_date: deliveryDate, warehouse_id: warehouseId }),
    enabled: Boolean(enabled && deliveryDate),
    staleTime: 60 * 1000,
    retry: false,
    ...options,
  });
}

export function useDailyOperationDetail(operationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.operation(operationId),
    queryFn: () => DailyOperationsService.getById(operationId),
    enabled: Boolean(enabled && operationId),
    staleTime: 60 * 1000,
  });
}

export function useDailyOperationsProcurement(operationId, {
  view = "active",
  deliveryDate,
  warehouseId,
  enabled = true,
} = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.procurement(operationId, view, deliveryDate, warehouseId),
    queryFn: () => DailyOperationsService.getProcurement(operationId, {
      view,
      deliveryDate,
      warehouseId,
    }),
    enabled: Boolean(enabled && operationId),
    staleTime: 60 * 1000,
  });
}

export function useDailyOperationsPacking(operationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.packing(operationId),
    queryFn: () => DailyOperationsService.getPacking(operationId),
    enabled: Boolean(enabled && operationId),
    staleTime: 30 * 1000,
  });
}

export function useDailyOperationsPackingOrder(operationId, orderId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.packingOrder(operationId, orderId),
    queryFn: () => DailyOperationsService.getPackingOrder(operationId, orderId),
    enabled: Boolean(enabled && operationId && orderId),
  });
}

export function useDailyOperationsRuns(operationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.runs(operationId),
    queryFn: () => DailyOperationsService.getDeliveryRuns(operationId),
    enabled: Boolean(enabled && operationId),
    staleTime: 30 * 1000,
  });
}

export function useDailyOperationsRunDetail(runId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.run(runId),
    queryFn: () => DailyOperationsService.getDeliveryRunDetail(runId),
    enabled: Boolean(enabled && runId),
  });
}

export function useDailyOperationsExceptions(operationId, { status, enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.exceptions(operationId, status),
    queryFn: () => DailyOperationsService.getExceptions(operationId, { status }),
    enabled: Boolean(enabled && operationId),
    staleTime: 30 * 1000,
  });
}

export function useDailyOperationsWaste(operationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.waste(operationId),
    queryFn: () => DailyOperationsService.getWaste(operationId),
    enabled: Boolean(enabled && operationId),
    staleTime: 60 * 1000,
  });
}

export function useDailyOperationsReconciliation(operationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.reconciliation(operationId),
    queryFn: () => DailyOperationsService.getReconciliation(operationId),
    enabled: Boolean(enabled && operationId),
    staleTime: 60 * 1000,
  });
}

export function useDailyOperationsAutomationSummary(operationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.automationSummary(operationId),
    queryFn: () => DailyOperationsService.getAutomationSummary(operationId),
    enabled: Boolean(enabled && operationId),
    staleTime: 30 * 1000,
  });
}

export function useDailyOperationsProposedDeliveryPlan(operationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.proposedDeliveryPlan(operationId),
    queryFn: () => DailyOperationsService.getProposedDeliveryPlan(operationId),
    enabled: Boolean(enabled && operationId),
    staleTime: 30 * 1000,
  });
}

export function useDailyOperationsInventorySummary(operationId, { enabled = true } = {}) {
  const isValidId = Boolean(operationId && operationId !== "null" && operationId !== "undefined");
  return useQuery({
    queryKey: dailyOperationsKeys.inventorySummary(operationId),
    queryFn: () => {
      if (!isValidId) return null;
      return DailyOperationsService.getInventorySummary(operationId);
    },
    enabled: Boolean(enabled && isValidId),
    staleTime: 30 * 1000,
  });
}

export function useInventoryLots(productId, { warehouseId, status, expiringBefore, enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.lots(productId, warehouseId, status),
    queryFn: () => DailyOperationsService.listLots(productId, { warehouseId, status, expiringBefore }),
    enabled: Boolean(enabled && productId),
    staleTime: 30 * 1000,
  });
}

export function useInventoryLotDetail(lotId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.lot(lotId),
    queryFn: () => DailyOperationsService.getLot(lotId),
    enabled: Boolean(enabled && lotId),
    staleTime: 30 * 1000,
  });
}

export function useInventoryLotMovements(lotId, { enabled = true } = {}) {
  return useQuery({
    queryKey: dailyOperationsKeys.lotMovements(lotId),
    queryFn: () => DailyOperationsService.getLotMovements(lotId),
    enabled: Boolean(enabled && lotId),
    staleTime: 30 * 1000,
  });
}

export function useDailyOperationsMutations(operationId) {
  const queryClient = useQueryClient();

  const invalidateOverview = () => {
    queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.all });
    queryClient.invalidateQueries({ queryKey: ["ops", "orders"] });
    queryClient.invalidateQueries({ queryKey: ["ops", "reports"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "vendorAssignments"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "vendorAttendance"] });
    queryClient.invalidateQueries({ queryKey: ["ops", "vendorCheckIn"] });
    queryClient.invalidateQueries({ queryKey: ["ops", "vendorAttendance"] });
  };

  const refreshMutation = useMutation({
    mutationFn: () => DailyOperationsService.refreshOperation(operationId),
    onSuccess: (data) => {
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Refreshing daily operation..." },
  });

  const notesMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.updateNotes(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.operation(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
    },
    meta: { globalLoaderMessage: "Saving handover note..." },
  });

  const updateProcurementItemMutation = useMutation({
    mutationFn: ({ itemId, payload }) => DailyOperationsService.updateProcurementItem(operationId, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.procurementScope(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.exceptions(operationId) });
      invalidateOverview();
    },
    onError: () => {
      // A receipt is atomic on the server. Re-read every affected view after an
      // error so a retry is always based on the rolled-back, authoritative row.
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.procurementScope(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.exceptions(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Updating procurement item..." },
  });

  const bulkProcurementMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.bulkUpdateProcurement(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.procurementScope(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.exceptions(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Bulk updating procurement items..." },
  });

  const startPackingMutation = useMutation({
    mutationFn: (orderId) => DailyOperationsService.startPackingOrder(operationId, orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packing(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packingOrder(operationId, orderId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Starting order packing..." },
  });

  const updatePackingItemMutation = useMutation({
    mutationFn: ({ orderId, packingItemId, payload }) =>
      DailyOperationsService.updatePackingItem(operationId, orderId, packingItemId, payload),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packing(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packingOrder(operationId, orderId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Updating packing item..." },
  });

  const completePackingMutation = useMutation({
    mutationFn: ({ orderId, payload }) => DailyOperationsService.completePackingOrder(operationId, orderId, payload),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packing(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packingOrder(operationId, orderId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.exceptions(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Completing order packing..." },
  });

  const confirmCleanPackingMutation = useMutation({
    mutationFn: (orderId) => DailyOperationsService.confirmCleanPacking(operationId, orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packing(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packingOrder(operationId, orderId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Confirming clean order packing..." },
  });

  const createRunMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.createDeliveryRun(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Creating delivery run..." },
  });

  const updateRunMutation = useMutation({
    mutationFn: ({ runId, payload }) => DailyOperationsService.updateDeliveryRun(runId, payload),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
    },
    meta: { globalLoaderMessage: "Updating delivery run..." },
  });

  const addRunOrdersMutation = useMutation({
    mutationFn: ({ runId, payload }) => DailyOperationsService.addRunOrders(runId, payload),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Adding orders to delivery run..." },
  });

  const removeRunOrderMutation = useMutation({
    mutationFn: ({ runId, orderId }) => DailyOperationsService.removeRunOrder(runId, orderId),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Removing order from delivery run..." },
  });

  const reorderRunOrdersMutation = useMutation({
    mutationFn: ({ runId, payload }) => DailyOperationsService.reorderRunOrders(runId, payload),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
    },
    meta: { globalLoaderMessage: "Updating delivery sequence..." },
  });

  const handoverRunMutation = useMutation({
    mutationFn: (runId) => DailyOperationsService.handoverRun(runId),
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Handing over delivery run..." },
  });

  const reconcileRunMutation = useMutation({
    mutationFn: ({ runId, payload }) => DailyOperationsService.reconcileRun(runId, payload),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.exceptions(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Saving COD reconciliation..." },
  });

  const reconcileCodVarianceMutation = useMutation({
    mutationFn: ({ runId, payload }) => DailyOperationsService.reconcileCodVariance(operationId, runId, payload),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.exceptions(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Reconciling COD variance..." },
  });

  const generateDeliveryPlanMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.generateDeliveryPlan(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.proposedDeliveryPlan(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Generating delivery plan..." },
  });

  const approveDeliveryPlanMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.approveDeliveryPlan(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.runs(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.proposedDeliveryPlan(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Approving delivery plan..." },
  });

  const changeProposedRunDeliveryPartnerMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.changeProposedRunDeliveryPartner(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.proposedDeliveryPlan(operationId) });
    },
    meta: { globalLoaderMessage: "Changing proposed delivery partner..." },
  });

  const createExceptionMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.createException(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.exceptions(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Logging exception..." },
  });

  const updateExceptionMutation = useMutation({
    mutationFn: ({ exceptionId, payload }) => DailyOperationsService.updateException(exceptionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.exceptions(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Updating exception..." },
  });

  const createWasteMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.createWaste(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.waste(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.procurementScope(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Recording waste entry..." },
  });

  const closeOperationMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.closeOperation(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.operation(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Closing daily operation..." },
  });

  const reopenOperationMutation = useMutation({
    mutationFn: (payload) => DailyOperationsService.reopenOperation(operationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.operation(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.reconciliation(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Reopening daily operation..." },
  });

  const evaluateAutoCloseMutation = useMutation({
    mutationFn: () => DailyOperationsService.requestAutoCloseEvaluation(operationId),
    onSuccess: () => {
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Requesting auto-close evaluation..." },
  });

  const replanInventoryMutation = useMutation({
    mutationFn: () => DailyOperationsService.replanInventory(operationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.inventorySummary(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.procurementScope(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packing(operationId) });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Optimizing inventory allocation..." },
  });

  const wasteLotMutation = useMutation({
    mutationFn: ({ lotId, quantity, reason }) => DailyOperationsService.wasteLot(lotId, { quantity, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.inventorySummary(operationId) });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lots"] });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lot"] });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Recording lot waste..." },
  });

  const quarantineLotMutation = useMutation({
    mutationFn: ({ lotId, reason }) => DailyOperationsService.quarantineLot(lotId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.inventorySummary(operationId) });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lots"] });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lot"] });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Quarantining lot..." },
  });

  const releaseQuarantineLotMutation = useMutation({
    mutationFn: ({ lotId, reason }) => DailyOperationsService.releaseQuarantineLot(lotId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.inventorySummary(operationId) });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lots"] });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lot"] });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Releasing lot quarantine..." },
  });

  const adjustLotMutation = useMutation({
    mutationFn: ({ lotId, quantity, reason }) => DailyOperationsService.adjustLot(lotId, { quantity, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.inventorySummary(operationId) });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lots"] });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lot"] });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Adjusting lot quantity..." },
  });

  const addStockMutation = useMutation({
    mutationFn: ({ productId, payload }) => DailyOperationsService.addStock(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.inventorySummary(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.procurementScope(operationId) });
      queryClient.invalidateQueries({ queryKey: dailyOperationsKeys.packing(operationId) });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lots"] });
      queryClient.invalidateQueries({ queryKey: [...dailyOperationsKeys.all, "lot"] });
      invalidateOverview();
    },
    meta: { globalLoaderMessage: "Adding stock to warehouse..." },
  });

  return {
    refreshMutation,
    notesMutation,
    updateProcurementItemMutation,
    bulkProcurementMutation,
    startPackingMutation,
    updatePackingItemMutation,
    completePackingMutation,
    confirmCleanPackingMutation,
    createRunMutation,
    updateRunMutation,
    addRunOrdersMutation,
    removeRunOrderMutation,
    reorderRunOrdersMutation,
    handoverRunMutation,
    reconcileRunMutation,
    reconcileCodVarianceMutation,
    generateDeliveryPlanMutation,
    approveDeliveryPlanMutation,
    changeProposedRunDeliveryPartnerMutation,
    createExceptionMutation,
    updateExceptionMutation,
    createWasteMutation,
    closeOperationMutation,
    reopenOperationMutation,
    evaluateAutoCloseMutation,
    replanInventoryMutation,
    wasteLotMutation,
    quarantineLotMutation,
    releaseQuarantineLotMutation,
    adjustLotMutation,
    addStockMutation,
  };
}
