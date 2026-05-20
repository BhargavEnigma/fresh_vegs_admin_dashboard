import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const AdminUsersService = {
    async list(params) {
        const res = await api.get(ENDPOINTS.admin.users.list, { params });
        return res.data?.data;
    },

    async getById(userId) {
        const res = await api.get(ENDPOINTS.admin.users.getById(userId));
        return res.data?.data;
    },

    async create(payload) {
        const res = await api.post(ENDPOINTS.admin.users.create, payload);
        return res.data?.data;
    },

    async setRoles(userId, roles, warehouse_ids = []) {
        const res = await api.put(ENDPOINTS.admin.users.setRoles(userId), {
            roles,
            warehouse_ids,
        });
        return res.data?.data;
    },
};