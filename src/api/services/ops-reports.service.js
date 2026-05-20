import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const OpsReportsService = {
    async procurement({ delivery_date, date } = {}) {
        const finalDate = delivery_date || date;

        const res = await api.get(ENDPOINTS.ops.reports.procurement, {
            params: finalDate
                ? {
                      delivery_date: finalDate,
                      date: finalDate,
                  }
                : {},
        });

        return res.data?.data;
    },
};