import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const OpsReportsService = {
    async procurement({ date } = {}) {
        const res = await api.get(ENDPOINTS.ops.reports.procurement, {
            params: date ? { date } : {},
        });
        return res.data?.data;
    },
};