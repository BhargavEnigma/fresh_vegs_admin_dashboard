import api from "../axios";
import { ENDPOINTS } from "../endpoints";

function data(response) {
    return response.data?.data;
}

function cleanParams(params = {}) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );
}

export const SupportService = {
    async settings() {
        return data(await api.get(ENDPOINTS.support.settings));
    },

    async dashboard() {
        return data(await api.get(ENDPOINTS.support.dashboard));
    },

    async analytics(params = {}) {
        return data(await api.get(ENDPOINTS.support.analytics, { params: cleanParams(params) }));
    },

    async searchCustomers(params = {}, config = {}) {
        return data(await api.get(ENDPOINTS.support.customers.search, {
            ...config,
            params: cleanParams(params),
        }));
    },

    async customerContext(userId) {
        return data(await api.get(ENDPOINTS.support.customers.context(userId)));
    },

    async orderContext(orderId) {
        return data(await api.get(ENDPOINTS.support.orders.context(orderId)));
    },

    async listTickets(params = {}) {
        return data(await api.get(ENDPOINTS.support.tickets.list, { params: cleanParams(params) }));
    },

    async createTicket(payload) {
        return data(await api.post(ENDPOINTS.support.tickets.create, payload));
    },

    async getTicket(ticketId) {
        return data(await api.get(ENDPOINTS.support.tickets.detail(ticketId)));
    },

    async assignTicket(ticketId, payload) {
        return data(await api.patch(ENDPOINTS.support.tickets.assign(ticketId), payload));
    },

    async updateStatus(ticketId, payload) {
        return data(await api.patch(ENDPOINTS.support.tickets.status(ticketId), payload));
    },

    async updatePriority(ticketId, payload) {
        return data(await api.patch(ENDPOINTS.support.tickets.priority(ticketId), payload));
    },

    async addMessage(ticketId, payload) {
        return data(await api.post(ENDPOINTS.support.tickets.messages(ticketId), payload));
    },

    async addInternalNote(ticketId, payload) {
        return data(await api.post(ENDPOINTS.support.tickets.internalNotes(ticketId), payload));
    },

    async uploadAttachments(ticketId, { files, attachment_type = "other", message_id = null }, onUploadProgress) {
        const form = new FormData();
        Array.from(files || []).forEach((file) => form.append("attachments", file));
        form.append("attachment_type", attachment_type);
        if (message_id) form.append("message_id", message_id);

        return data(await api.post(ENDPOINTS.support.tickets.attachments(ticketId), form, {
            onUploadProgress,
        }));
    },

    async escalate(ticketId, payload) {
        return data(await api.post(ENDPOINTS.support.tickets.escalate(ticketId), payload));
    },

    async resolve(ticketId, payload) {
        return data(await api.post(ENDPOINTS.support.tickets.resolve(ticketId), payload));
    },

    async close(ticketId, payload) {
        return data(await api.post(ENDPOINTS.support.tickets.close(ticketId), payload));
    },

    async reopen(ticketId, payload) {
        return data(await api.post(ENDPOINTS.support.tickets.reopen(ticketId), payload));
    },

    async createActionRequest(ticketId, payload) {
        return data(await api.post(ENDPOINTS.support.tickets.actionRequests(ticketId), payload));
    },

    async listActionRequests(params = {}) {
        return data(await api.get(ENDPOINTS.support.actionRequests.list, { params: cleanParams(params) }));
    },

    async approveActionRequest(requestId, payload) {
        return data(await api.post(ENDPOINTS.support.actionRequests.approve(requestId), payload));
    },

    async rejectActionRequest(requestId, payload) {
        return data(await api.post(ENDPOINTS.support.actionRequests.reject(requestId), payload));
    },

    async executeActionRequest(requestId) {
        return data(await api.post(ENDPOINTS.support.actionRequests.execute(requestId)));
    },
};
