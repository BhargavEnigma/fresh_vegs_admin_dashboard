import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const OpsJobsService = {
    async lockOrders() {
        const res = await api.post(ENDPOINTS.ops.jobs.lockOrders);
        return res.data?.data;
    },
};