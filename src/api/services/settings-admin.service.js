import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const SettingsAdminService = {
    async list() {
        const res = await api.get(ENDPOINTS.admin.settings.list);
        return res.data?.data;
    },

    async getByKey(key) {
        const res = await api.get(ENDPOINTS.admin.settings.getByKey(key));
        return res.data?.data;
    },

    async upsert(key, value) {
        const res = await api.put(ENDPOINTS.admin.settings.upsert(key), { value });
        return res.data?.data;
    },
};