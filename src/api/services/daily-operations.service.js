import api from "../axios";
import { ENDPOINTS } from "../endpoints";
import { normalizeProcurementMode, normalizeProcurementUnit } from "../../utils/vendor-assignment";

function normalizeProcurementPayload(data) {
  const items = Array.isArray(data) ? data : (data?.items || []);
  const normalized = items.map((item) => {
    const mode = normalizeProcurementMode(item.procurement_mode);
    return {
      ...item,
      procurement_mode: mode,
      procurement_unit: normalizeProcurementUnit(
        item.procurement_unit,
        mode,
        item.pack_label || item.pack?.pack_label || item.pack?.label
      ),
    };
  });
  return Array.isArray(data) ? normalized : { ...data, items: normalized };
}

export const DailyOperationsService = {
  async getOverview({ delivery_date, warehouse_id } = {}) {
    const params = {
      ...(delivery_date ? { delivery_date } : {}),
      ...(warehouse_id ? { warehouse_id } : {}),
    };
    const res = await api.get(ENDPOINTS.ops.dailyOperations.overview, { params });
    return res.data?.data;
  },

  async openOperation(payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.open, payload);
    return res.data?.data;
  },

  async getById(operationId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.getById(operationId));
    return res.data?.data;
  },

  async refreshOperation(operationId) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.refresh(operationId));
    return res.data?.data;
  },

  async updateNotes(operationId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.notes(operationId), payload);
    return res.data?.data;
  },

  // Procurement
  async getProcurement(operationId, {
    view = "active",
    deliveryDate,
    warehouseId,
  } = {}) {
    const res = await api.get(ENDPOINTS.admin.cost.procurementItems, {
      params: {
        view,
        grouping: "product",
        ...(deliveryDate ? { delivery_date: deliveryDate } : {}),
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      },
    });
    return normalizeProcurementPayload(res.data?.data);
  },

  async updateProcurementItem(operationId, itemId, payload) {
    const res = await api.patch(ENDPOINTS.ops.dailyOperations.updateProcurementItem(operationId, itemId), payload);
    return res.data?.data;
  },

  async bulkUpdateProcurement(operationId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.bulkProcurement(operationId), payload);
    return res.data?.data;
  },

  // Packing
  async getPacking(operationId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.packing(operationId));
    return res.data?.data;
  },

  async getPackingOrder(operationId, orderId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.packingOrder(operationId, orderId));
    return res.data?.data;
  },

  async startPackingOrder(operationId, orderId) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.startPackingOrder(operationId, orderId));
    return res.data?.data;
  },

  async updatePackingItem(operationId, orderId, packingItemId, payload) {
    const res = await api.patch(
      ENDPOINTS.ops.dailyOperations.updatePackingItem(operationId, orderId, packingItemId),
      payload
    );
    return res.data?.data;
  },

  async completePackingOrder(operationId, orderId, payload = {}) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.completePackingOrder(operationId, orderId), payload);
    return res.data?.data;
  },

  // Delivery Runs
  async getDeliveryRuns(operationId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.deliveryRuns(operationId));
    return res.data?.data;
  },

  async createDeliveryRun(operationId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.createDeliveryRun(operationId), payload);
    return res.data?.data;
  },

  async getDeliveryRunDetail(runId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.deliveryRunDetail(runId));
    return res.data?.data;
  },

  async updateDeliveryRun(runId, payload) {
    const res = await api.patch(ENDPOINTS.ops.dailyOperations.updateDeliveryRun(runId), payload);
    return res.data?.data;
  },

  async addRunOrders(runId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.addRunOrders(runId), payload);
    return res.data?.data;
  },

  async removeRunOrder(runId, orderId) {
    const res = await api.delete(ENDPOINTS.ops.dailyOperations.removeRunOrder(runId, orderId));
    return res.data?.data;
  },

  async reorderRunOrders(runId, payload) {
    const res = await api.put(ENDPOINTS.ops.dailyOperations.reorderRunOrders(runId), payload);
    return res.data?.data;
  },

  async handoverRun(runId) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.handoverRun(runId));
    return res.data?.data;
  },

  async reconcileRun(runId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.reconcileRun(runId), payload);
    return res.data?.data;
  },

  // Exceptions
  async getExceptions(operationId, { status } = {}) {
    const params = status ? { status } : {};
    const res = await api.get(ENDPOINTS.ops.dailyOperations.exceptions(operationId), { params });
    return res.data?.data;
  },

  async createException(operationId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.createException(operationId), payload);
    return res.data?.data;
  },

  async updateException(exceptionId, payload) {
    const res = await api.patch(ENDPOINTS.ops.dailyOperations.updateException(exceptionId), payload);
    return res.data?.data;
  },

  // Waste
  async getWaste(operationId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.waste(operationId));
    return res.data?.data;
  },

  async createWaste(operationId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.createWaste(operationId), payload);
    return res.data?.data;
  },

  // Reconciliation & Closing
  async getReconciliation(operationId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.reconciliation(operationId));
    return res.data?.data;
  },

  async closeOperation(operationId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.close(operationId), payload);
    return res.data?.data;
  },

  async reopenOperation(operationId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.reopen(operationId), payload);
    return res.data?.data;
  },

  // Automation additions
  async getAutomationSummary(operationId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.automationSummary(operationId));
    return res.data?.data;
  },

  async confirmCleanPacking(operationId, orderId, payload = {}) {
    const res = await api.post(
      ENDPOINTS.ops.dailyOperations.confirmCleanPacking(operationId, orderId),
      payload
    );
    return res.data?.data;
  },

  async generateDeliveryPlan(operationId) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.generateDeliveryPlan(operationId));
    return res.data?.data;
  },

  async getProposedDeliveryPlan(operationId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.proposedDeliveryPlan(operationId));
    return res.data?.data;
  },

  async approveDeliveryPlan(operationId, payload = {}) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.approveDeliveryPlan(operationId), payload);
    return res.data?.data;
  },

  async reconcileCodVariance(operationId, runId, payload = {}) {
    const res = await api.post(
      ENDPOINTS.ops.dailyOperations.reconcileCodVariance(operationId, runId),
      payload
    );
    return res.data?.data;
  },

  async requestAutoCloseEvaluation(operationId) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.evaluateAutoClose(operationId));
    return res.data?.data;
  },

  // Fresh Inventory & Lots
  async getWarehouseInventorySummary(warehouseId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.warehouseInventorySummary, {
      params: warehouseId ? { warehouse_id: warehouseId } : {},
    });
    return res.data?.data;
  },

  async getInventorySummary(operationId) {
    if (!operationId || operationId === "null" || operationId === "undefined") {
      return null;
    }
    const res = await api.get(ENDPOINTS.ops.dailyOperations.inventorySummary(operationId));
    return res.data?.data;
  },

  async replanInventory(operationId) {
    if (!operationId || operationId === "null" || operationId === "undefined") {
      throw new Error("Cannot replan inventory without an active daily operation session");
    }
    const res = await api.post(ENDPOINTS.ops.dailyOperations.replanInventory(operationId));
    return res.data?.data;
  },

  async listLots(productId, { warehouseId, status, expiringBefore } = {}) {
    const params = {};
    if (warehouseId) params.warehouse_id = warehouseId;
    if (status) params.status = status;
    if (expiringBefore) params.expiring_before = expiringBefore;
    const res = await api.get(ENDPOINTS.ops.dailyOperations.listLots(productId), { params });
    return res.data?.data?.lots || res.data?.lots || [];
  },

  async addStock(productId, payload) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.addStock(productId), payload);
    return res.data?.data?.lot;
  },


  async getLot(lotId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.getLot(lotId));
    return res.data?.data?.lot;
  },

  async getLotMovements(lotId) {
    const res = await api.get(ENDPOINTS.ops.dailyOperations.getLotMovements(lotId));
    return res.data?.data?.movements || [];
  },

  async wasteLot(lotId, { quantity, reason } = {}) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.wasteLot(lotId), { quantity, reason });
    return res.data?.data?.lot;
  },

  async quarantineLot(lotId, { reason } = {}) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.quarantineLot(lotId), { reason });
    return res.data?.data?.lot;
  },

  async releaseQuarantineLot(lotId, { reason } = {}) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.releaseQuarantineLot(lotId), { reason });
    return res.data?.data?.lot;
  },

  async adjustLot(lotId, { quantity, reason } = {}) {
    const res = await api.post(ENDPOINTS.ops.dailyOperations.adjustLot(lotId), { quantity, reason });
    return res.data?.data?.lot;
  },
};
