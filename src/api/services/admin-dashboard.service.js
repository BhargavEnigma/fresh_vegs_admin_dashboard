import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const AdminDashboardService = {
    async getKpis(params) {
        const res = await api.get(ENDPOINTS.admin.dashboard.kpis, { params });
        return res.data?.data;
    },
};
