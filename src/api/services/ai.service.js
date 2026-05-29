import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export async function generateProductDescription(payload) {
    return api.post(
        ENDPOINTS.admin.ai.generateProductDescription,
        payload
    );
}