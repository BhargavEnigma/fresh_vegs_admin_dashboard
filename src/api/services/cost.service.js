import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const CostsService = {
    async list(params = {}) {
        const res = await api.get(ENDPOINTS.admin.cost.list, { params });
        return res.data?.data;
    },

    async summary(params = {}) {
        const res = await api.get(ENDPOINTS.admin.cost.summary, { params });
        return res.data?.data;
    },

    async profitOverview(params = {}) {
        const res = await api.get(ENDPOINTS.admin.cost.profitOverview, { params });
        return res.data?.data;
    },

    async procurementItems(params = {}) {
        const res = await api.get(ENDPOINTS.admin.cost.procurementItems, { params });
        return res.data?.data;
    },

    async bulkUpsertProcurement(payload) {
        const res = await api.post(ENDPOINTS.admin.cost.bulkUpsertProcurement, payload);
        return res.data?.data;
    },

    async getById(id) {
        const res = await api.get(ENDPOINTS.admin.cost.getById(id));
        return res.data?.data;
    },

    async create(payload) {
        const res = await api.post(ENDPOINTS.admin.cost.create, payload);
        return res.data?.data;
    },

    async update(id, payload) {
        const res = await api.patch(ENDPOINTS.admin.cost.update(id), payload);
        return res.data?.data;
    },

    async remove(id) {
        const res = await api.delete(ENDPOINTS.admin.cost.remove(id));
        return res.data?.data;
    },
};