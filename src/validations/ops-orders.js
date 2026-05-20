import { z } from "zod";

export const opsOrdersFilterSchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.string().optional(),
    warehouse_id: z.string().optional(),
    delivery_date: z.date().nullable().optional(),
    delivery_partner_user_id: z.string().optional(),
    q: z.string().optional(),
});

export const opsOrderUpdateStatusSchema = z.object({
    to_status: z.enum([
        "payment_pending",
        "placed",
        "locked",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
        "confirmed",
        "accepted",
    ]),
    note: z.string().max(250).optional().nullable(),
});