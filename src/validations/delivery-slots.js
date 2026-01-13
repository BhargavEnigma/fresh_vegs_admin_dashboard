import { z } from "zod";

// Mirrors backend: src/validations/admin/deliverySlots.admin.validation.js
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

export const deliverySlotCreateSchema = z.object({
    name: z.string().min(2).max(80),
    start_time: z.string().regex(timeRegex),
    end_time: z.string().regex(timeRegex),
    is_active: z.boolean().optional().nullable(),
});

export const deliverySlotUpdateSchema = z.object({
    name: z.string().min(2).max(80).optional(),
    start_time: z.string().regex(timeRegex).optional(),
    end_time: z.string().regex(timeRegex).optional(),
});