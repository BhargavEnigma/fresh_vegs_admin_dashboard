import { z } from "zod";

export const opsOrdersFilterSchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),

    // NOTE:
    // Our Filters form keeps "" for empty inputs.
    // Zod would fail validation for uuid/date regex on "" which prevents Apply from working.
    // So we preprocess "" -> undefined for optional filter fields.
    status: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional().nullable()),
    warehouse_id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional().nullable()),
    delivery_date: z.preprocess(
        (v) => (v === "" ? undefined : v),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
    ),
    q: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(80).optional().nullable()),
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