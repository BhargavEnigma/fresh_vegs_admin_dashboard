import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const AdminNotificationsService = {
    async list(params = {}) {
        const res = await api.get(ENDPOINTS.admin.notificationCampaigns.list, { params });
        return res.data;
    },

    async getById(id) {
        const res = await api.get(ENDPOINTS.admin.notificationCampaigns.getById(id));
        return res.data;
    },

    async create(payload) {
        const res = await api.post(ENDPOINTS.admin.notificationCampaigns.create, payload);
        return res.data;
    },

    async update(id, payload) {
        const res = await api.patch(ENDPOINTS.admin.notificationCampaigns.update(id), payload);
        return res.data;
    },

    async remove(id) {
        const res = await api.delete(ENDPOINTS.admin.notificationCampaigns.remove(id));
        return res.data;
    },

    async send(id) {
        const res = await api.post(ENDPOINTS.admin.notificationCampaigns.send(id));
        return res.data;
    },

    async test(id, payload) {
        const res = await api.post(ENDPOINTS.admin.notificationCampaigns.test(id), payload);
        return res.data;
    },

    async schedule(id, payload) {
        const res = await api.post(ENDPOINTS.admin.notificationCampaigns.schedule(id), payload);
        return res.data;
    },
};
