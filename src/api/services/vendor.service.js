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

  async getAssignments(dailyOperationId) {
    const data = unwrap(
      await api.get(ENDPOINTS.ops.vendor.assignments, {
        params: { daily_operation_id: dailyOperationId },
      })
    );
    const rows = Array.isArray(data) ? data : data?.assignments ?? [];
    return rows.map(normalizeVendorAssignment);
  },

  async bulkAssign(payload) {
    return unwrap(await api.post(ENDPOINTS.admin.vendor.bulkAssignments, payload));
  },

  async autoAssign(payload) {
    return unwrap(await api.post(ENDPOINTS.admin.vendor.autoAssignments, payload));
  },

  async listForCheckIn() {
    const data = unwrap(await api.get(ENDPOINTS.ops.vendor.vendors));
    return Array.isArray(data) ? data : data?.vendors ?? [];
  },

  async getCheckIn({ date, vendorUserId }) {
    const data = unwrap(
      await api.get(ENDPOINTS.ops.vendor.checkIn, {
        params: { date, vendor_user_id: vendorUserId },
      })
    );
    const rows = Array.isArray(data) ? data : data?.assignments ?? [];
    return rows.map(normalizeVendorAssignment);
  },

  async getAttendance(date) {
    const data = unwrap(
      await api.get(ENDPOINTS.ops.vendor.checkIns, {
        params: { date },
      })
    );
    return Array.isArray(data) ? data : data?.check_ins ?? data?.checkIns ?? [];
  },

  async receive(assignmentId, payload) {
    return unwrap(await api.post(ENDPOINTS.ops.vendor.receive(assignmentId), payload));
  },
};
