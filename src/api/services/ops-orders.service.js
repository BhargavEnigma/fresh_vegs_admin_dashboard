import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const OpsOrdersService = {
    async list(filters = {}) {
        const {
            page = 1,
            limit = 20,
            status,
            warehouse_id,
            delivery_date,
            q,
        } = filters;

        const params = {
            page,
            limit,
            ...(status ? { status } : {}),
            ...(warehouse_id ? { warehouse_id } : {}),
            ...(delivery_date ? { delivery_date } : {}),
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
        const { status, warehouse_id, delivery_date, q } = filters;

        const params = {
            ...(status ? { status } : {}),
            ...(warehouse_id ? { warehouse_id } : {}),
            ...(delivery_date ? { delivery_date } : {}),
            ...(q ? { q } : {}),
        };

        // IMPORTANT: responseType blob so browser can download file
        const res = await api.get(ENDPOINTS.ops.orders.exportCsv, {
            params,
            responseType: "blob",
        });

        // Try to read filename from Content-Disposition
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
};