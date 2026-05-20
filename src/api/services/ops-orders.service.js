import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const OpsOrdersService = {
    async list(filters = {}) {
        const {
            page = 1,
            limit = 20,
            status,
            warehouse_id,
            delivery_partner_user_id,
            delivery_date,
            assigned,
            unassigned,
            q,
        } = filters;

        const params = {
            page,
            limit,
            ...(status ? { status } : {}),
            ...(warehouse_id ? { warehouse_id } : {}),
            ...(delivery_partner_user_id ? { delivery_partner_user_id } : {}),
            ...(delivery_date ? { delivery_date } : {}),
            ...(assigned ? { assigned } : {}),
            ...(unassigned ? { unassigned } : {}),
            ...(q ? { q } : {}),
        };

        const res = await api.get(ENDPOINTS.ops.orders.list, { params });
        return res.data?.data;
    },

    async getById(orderId) {
        const res = await api.get(ENDPOINTS.ops.orders.getById(orderId));
        return res.data?.data;
    },

    async exportAllCsv(filters = {}) {
        const { status, warehouse_id, delivery_partner_user_id, delivery_date, q } = filters;

        const params = {
            ...(status ? { status } : {}),
            ...(warehouse_id ? { warehouse_id } : {}),
            ...(delivery_partner_user_id ? { delivery_partner_user_id } : {}),
            ...(delivery_date ? { delivery_date } : {}),
            ...(q ? { q } : {}),
        };

        const res = await api.get(ENDPOINTS.ops.orders.exportCsv, {
            params,
            responseType: "blob",
        });

        const cd = res.headers?.["content-disposition"] || res.headers?.["Content-Disposition"];
        let filename = null;

        if (cd && typeof cd === "string") {
            const match = cd.match(/filename="([^"]+)"/);
            if (match && match[1]) filename = match[1];
        }

        return {
            blob: res.data,
            filename: filename || `ops_orders_${new Date().toISOString().slice(0, 10)}.csv`,
        };
    },

    async updateStatus(orderId, payload) {
        const res = await api.patch(ENDPOINTS.ops.orders.updateStatus(orderId), payload);
        return res.data?.data;
    },

    // ================= DELIVERY PARTNER =================
    async listDeliveryPartners(params = {}) {
        const res = await api.get(ENDPOINTS.ops.orders.deliveryPartners, { params });
        return res.data?.data;
    },

    async assignDeliveryPartner(orderId, payload) {
        const res = await api.post(ENDPOINTS.ops.orders.assignDeliveryPartner(orderId), payload);
        return res.data?.data;
    },

    async unassignDeliveryPartner(orderId, payload = {}) {
        const res = await api.post(ENDPOINTS.ops.orders.unassignDeliveryPartner(orderId), payload);
        return res.data?.data;
    },

    async bulkAssignDeliveryPartner(payload) {
        const res = await api.post(ENDPOINTS.ops.orders.bulkAssignDeliveryPartner, payload);
        return res.data?.data;
    },

    async bulkUnassignDeliveryPartner(payload) {
        const res = await api.post(ENDPOINTS.ops.orders.bulkUnassignDeliveryPartner, payload);
        return res.data?.data;
    },

    async bulkUpdateStatus({ orderIds, toStatus, note }) {
        console.log('{ orderIds, toStatus, note } : ', orderIds, toStatus, note);
        return api.post(ENDPOINTS.ops.orders.bulkUpdateStatus, {
            order_ids: Array.isArray(orderIds) ? orderIds : orderIds.split(",").map(id => id.trim()),
            to_status: toStatus,
            note: note ?? null,
        });
    },
};