import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const AdminDealsService = {
    async list({ from, to, active } = {}) {
        const res = await api.get(ENDPOINTS.admin.deals.list, {
            params: {
                from: from || undefined,
                to: to || undefined,
                active: active !== undefined && active !== null ? active : undefined,
            },
        });
        return res.data;
    },

    async getById(dealId) {
        const res = await api.get(ENDPOINTS.admin.deals.getById(dealId));
        return res.data;
    },

    async create(payload) {
        const res = await api.post(ENDPOINTS.admin.deals.create, payload);
        return res.data;
    },

    async update(dealId, payload) {
        const res = await api.put(ENDPOINTS.admin.deals.update(dealId), payload);
        return res.data;
    },

    async remove(dealId) {
        const res = await api.delete(ENDPOINTS.admin.deals.remove(dealId));
        return res.data;
    },

    async searchPacks({ q, limit } = {}) {
        const res = await api.get(ENDPOINTS.admin.deals.packSearch, {
            params: { q: q || undefined, limit: limit || undefined },
        });
        return res.data;
    },

    async upsertItems(dealId, items) {
        const res = await api.put(ENDPOINTS.admin.deals.upsertItems(dealId), { items });
        return res.data;
    },

    async removeItem(dealId, itemId) {
        const res = await api.delete(ENDPOINTS.admin.deals.removeItem(dealId, itemId));
        return res.data;
    },
};
