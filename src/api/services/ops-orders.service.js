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

    async updateStatus(orderId, payload) {
        const res = await api.patch(ENDPOINTS.ops.orders.updateStatus(orderId), payload);
        return res.data?.data;
    },
};