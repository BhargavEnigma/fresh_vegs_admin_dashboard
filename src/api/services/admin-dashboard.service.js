import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const AdminDashboardService = {
    async getKpis({ start_date, end_date } = {}) {
        const params = {
            ...(start_date ? { start_date } : {}),
            ...(end_date ? { end_date } : {}),
        };
        const res = await api.get(ENDPOINTS.admin.dashboard.kpis, { params });
        return res.data?.data;
    },
};
