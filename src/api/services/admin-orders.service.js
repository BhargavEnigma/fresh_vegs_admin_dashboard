import api from "../axios";

export const AdminOrdersService = {
    async getPaymentAudit(orderId) {
        const res = await api.get(`/v1/admin/orders/${orderId}/payment`);
        return res.data?.data;
    },

    async initiateRefund(orderId, reason) {
        const res = await api.post(`/v1/admin/orders/${orderId}/refund`, {
            reason: reason || null,
        });
        return res.data?.data;
    },
};