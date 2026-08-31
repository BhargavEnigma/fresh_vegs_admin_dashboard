import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const OpsReportsService = {
    async procurement({ delivery_date, date, warehouse_id } = {}) {
        const finalDate = delivery_date || date;

        if (!warehouse_id) {
            return { items: [], summary: {}, status_breakdown: [] };
        }

        const res = await api.get(ENDPOINTS.ops.reports.procurement, {
            params: {
                delivery_date: finalDate,
                date: finalDate,
                warehouse_id,
            },
        });

        return res.data?.data;
    },
};
