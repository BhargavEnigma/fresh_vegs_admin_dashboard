import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const AdminBannersService = {
    async list({ placement } = {}) {
        const res = await api.get(ENDPOINTS.admin.banners.list, {
            params: { placement: placement || undefined },
        });
        return res.data;
    },

    async create(payload) {
        const res = await api.post(ENDPOINTS.admin.banners.create, payload);
        return res.data;
    },

    async createWithImage(payload, imageFile) {
        const formData = new FormData();

        Object.entries(payload || {}).forEach(([k, v]) => {
            if (v === undefined || v === null || v === "") return;
            formData.append(k, String(v));
        });

        if (imageFile) {
            formData.append("image", imageFile);
        }

        const res = await api.post(ENDPOINTS.admin.banners.createWithImage, formData);
        return res.data;
    },

    async update(bannerId, payload) {
        const res = await api.put(ENDPOINTS.admin.banners.update(bannerId), payload);
        return res.data;
    },

    async updateWithImage(bannerId, payload, imageFile) {
        const formData = new FormData();

        Object.entries(payload || {}).forEach(([k, v]) => {
            if (v === undefined || v === null || v === "") return;
            formData.append(k, String(v));
        });

        if (imageFile) {
            formData.append("image", imageFile);
        }

        const res = await api.put(ENDPOINTS.admin.banners.updateWithImage(bannerId), formData);
        return res.data;
    },

    async setActive(bannerId, is_active) {
        const res = await api.patch(ENDPOINTS.admin.banners.setActive(bannerId), { is_active });
        return res.data;
    },

    async reorder(ids) {
        const res = await api.put(ENDPOINTS.admin.banners.reorder, { ids });
        return res.data;
    },

    async remove(bannerId) {
        const res = await api.delete(ENDPOINTS.admin.banners.remove(bannerId));
        return res.data;
    },

    async listActionProducts() {
        return api.get("/v1/admin/banners/options/products");
    },

    async listActionCategories() {
        return api.get("/v1/admin/banners/options/categories");
    },
};
