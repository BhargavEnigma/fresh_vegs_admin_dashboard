import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export const OpsJobsService = {
    async lockOrders(payload) {
        const res = await api.post(ENDPOINTS.ops.jobs.lockOrders, payload);
        return res.data?.data;
    },

    getLockOrdersSchedule: async () => {
        const res = await api.get(ENDPOINTS.ops.scheduler.lockOrders);
        return res.data?.data || res.data;
    },

    getLockOrdersSchedulePresets: async () => {
        const res = await api.get(ENDPOINTS.ops.scheduler.lockOrdersPresets);
        return res.data?.data || res.data;
    },

    updateLockOrdersSchedule: async (payload) => {
        const res = await api.put(ENDPOINTS.ops.scheduler.lockOrders, payload);
        return res.data?.data || res.data;
    },

    listJobRuns: async (params = {}) => {
        const res = await api.get(ENDPOINTS.ops.jobs.runs, { params });
        return res.data?.data || res.data;
    },
};