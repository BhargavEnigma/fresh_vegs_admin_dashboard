import api from "../axios";
import { ENDPOINTS } from "../endpoints";
import {
  normalizeVendorAssignment,
  vendorUnitCostPaise,
} from "../../utils/vendor-assignment";

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export const VendorService = {
  async list() {
    const data = unwrap(await api.get(ENDPOINTS.admin.vendor.list));
    return Array.isArray(data) ? data : data?.vendors ?? [];
  },

  async listForWarehouse(warehouseId) {
    const data = unwrap(await api.get(ENDPOINTS.ops.vendor.vendors, {
      params: { warehouse_id: warehouseId },
    }));
    return Array.isArray(data) ? data : data?.vendors ?? [];
  },

  async create(payload) {
    return unwrap(await api.post(ENDPOINTS.admin.vendor.create, payload));
  },

  async get(id) {
    const data = unwrap(await api.get(ENDPOINTS.admin.vendor.getById(id)));
    return data?.vendor ?? data;
  },

  async update(id, payload) {
    return unwrap(await api.patch(ENDPOINTS.admin.vendor.update(id), payload));
  },

  async remove(id) {
    return unwrap(await api.delete(ENDPOINTS.admin.vendor.remove(id)));
  },

  async getProducts(vendorProfileId) {
    const data = unwrap(await api.get(ENDPOINTS.admin.vendor.products(vendorProfileId)));
    const rows = Array.isArray(data) ? data : data?.products ?? [];
    return rows.map((row) => ({
      ...row,
      procurement_mode: row.product?.procurement_mode === "bulk" ? "bulk" : "pack",
      procurement_unit:
        row.procurement_unit || row.product?.procurement_unit || (row.product?.procurement_mode === "bulk" ? "" : "pack"),
      vendor_unit_cost_paise: vendorUnitCostPaise(row),
    }));
  },

  async getCatalogues({ warehouseId = null, vendorProfileIds = null, vendorUserIds = null } = {}) {
    const params = {};
    if (warehouseId) params.warehouse_id = warehouseId;
    if (vendorProfileIds?.length) {
      params.vendor_profile_ids = Array.isArray(vendorProfileIds) ? vendorProfileIds.join(",") : vendorProfileIds;
    }
    if (vendorUserIds?.length) {
      params.vendor_user_ids = Array.isArray(vendorUserIds) ? vendorUserIds.join(",") : vendorUserIds;
    }
    const data = unwrap(await api.get(ENDPOINTS.admin.vendor.catalogues, { params }));
    const rows = Array.isArray(data) ? data : data?.catalogues ?? [];
    return rows.map((entry) => ({
      vendor: entry.vendor,
      catalogue: (entry.products || entry.catalogue || []).map((row) => ({
        ...row,
        procurement_mode: row.product?.procurement_mode === "bulk" ? "bulk" : "pack",
        procurement_unit:
          row.procurement_unit || row.product?.procurement_unit || (row.product?.procurement_mode === "bulk" ? "" : "pack"),
        vendor_unit_cost_paise: vendorUnitCostPaise(row),
      })),
    }));
  },

  async createProduct(vendorProfileId, payload) {
    return unwrap(await api.post(ENDPOINTS.admin.vendor.products(vendorProfileId), payload));
  },

  async updateProduct(vendorProfileId, vendorProductId, payload) {
    return unwrap(
      await api.patch(ENDPOINTS.admin.vendor.updateProduct(vendorProfileId, vendorProductId), payload)
    );
  },

  async removeProduct(vendorProfileId, vendorProductId) {
    return unwrap(
      await api.delete(ENDPOINTS.admin.vendor.removeProduct(vendorProfileId, vendorProductId))
    );
  },

  async getAssignments(dailyOperationId, {
    logical = false,
    includeHistory = false,
    vendorUserId = null,
    productId = null,
    warehouseId = null,
    status = null,
    procurementCostIds = null,
  } = {}) {
    const params = {
      daily_operation_id: dailyOperationId,
      include_history: includeHistory,
      view: logical ? "logical" : "child",
    };
    if (vendorUserId) params.vendor_user_id = vendorUserId;
    if (productId) params.product_id = productId;
    if (warehouseId) params.warehouse_id = warehouseId;
    if (status?.length) params.status = Array.isArray(status) ? status.join(",") : status;
    if (procurementCostIds?.length) {
      params.procurement_cost_ids = Array.isArray(procurementCostIds)
        ? procurementCostIds.join(",")
        : procurementCostIds;
    }

    const data = unwrap(
      await api.get(ENDPOINTS.admin.vendor.assignments, { params })
    );
    const rows = Array.isArray(data)
      ? data
      : logical
        ? data?.logical_assignments ?? data?.assignments ?? []
        : data?.assignments ?? data?.logical_assignments ?? [];
    return rows.map(normalizeVendorAssignment);
  },

  async bulkAssign(payload) {
    return unwrap(await api.post(ENDPOINTS.admin.vendor.bulkAssignments, payload));
  },

  async groupedAssign(payload) {
    return unwrap(await api.post(ENDPOINTS.admin.vendor.groupedAssignments, payload));
  },

  async autoAssign(payload) {
    return unwrap(await api.post(ENDPOINTS.admin.vendor.autoAssignments, payload));
  },

  async listForCheckIn() {
    const data = unwrap(await api.get(ENDPOINTS.ops.vendor.vendors));
    return Array.isArray(data) ? data : data?.vendors ?? [];
  },

  async getCheckIn({
    date,
    vendorUserId,
    warehouseId = null,
    statuses = null,
    includeHistory = false,
  }) {
    const params = {
      date,
      vendor_user_id: vendorUserId,
      include_history: includeHistory,
    };
    if (warehouseId) params.warehouse_id = warehouseId;
    if (statuses?.length) params.status = Array.isArray(statuses) ? statuses.join(",") : statuses;
    const data = unwrap(
      await api.get(ENDPOINTS.ops.vendor.checkIn, {
        params,
      })
    );
    const rows = Array.isArray(data) ? data : data?.assignments ?? [];
    return rows.map(normalizeVendorAssignment);
  },

  // async getAttendance(date) {
  //   const data = unwrap(
  //     await api.get(ENDPOINTS.ops.vendor.checkIns, {
  //       params: { date },
  //     })
  //   );
  //   return Array.isArray(data) ? data : data?.check_ins ?? data?.checkIns ?? [];
  // },

  async receive(assignmentId, payload) {
    return unwrap(await api.post(ENDPOINTS.ops.vendor.receive(assignmentId), payload));
  },

  async receiveMany(assignments) {
    return unwrap(await api.post(ENDPOINTS.ops.vendor.receiveMany, { assignments }));
  },
};
