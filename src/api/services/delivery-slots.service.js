import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const DeliverySlotsService = {
    async list() {
        const res = await api.get(ENDPOINTS.admin.deliverySlot.list);
        return res.data?.data;
    },

    async create(payload) {
        const res = await api.post(ENDPOINTS.admin.deliverySlot.create, payload);
        return res.data?.data;
    },

    async update(id, payload) {
        const res = await api.put(ENDPOINTS.admin.deliverySlot.update(id), payload);
        return res.data?.data;
    },

    async setActive(id, is_active) {
        const res = await api.patch(ENDPOINTS.admin.deliverySlot.setActive(id), { is_active });
        return res.data?.data;
    },
};
