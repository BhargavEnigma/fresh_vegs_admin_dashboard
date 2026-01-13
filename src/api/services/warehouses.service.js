import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const WarehousesService = {
    async list({ includeInactive = false } = {}) {
        const res = await api.get(ENDPOINTS.admin.warehouse.list, {
            params: includeInactive ? { include_inactive: "true" } : {},
        });
        return res.data?.data;
    },

    async getById(id) {
        const res = await api.get(ENDPOINTS.admin.warehouse.getById(id));
        return res.data?.data;
    },

    async create(payload) {
        const res = await api.post(ENDPOINTS.admin.warehouse.create, payload);
        return res.data?.data;
    },

    async update(id, payload) {
        const res = await api.patch(ENDPOINTS.admin.warehouse.update(id), payload);
        return res.data?.data;
    },

    async deactivate(id) {
        const res = await api.delete(ENDPOINTS.admin.warehouse.deactivate(id));
        return res.data?.data;
    },
};
