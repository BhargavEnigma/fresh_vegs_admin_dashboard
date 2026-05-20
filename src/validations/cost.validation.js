import { z } from "zod";

export const costCreateSchema = z.object({
    cost_date: z.string().min(1, "Date is required"),
    category: z.enum(["procurement", "delivery", "packaging", "misc"]),
    warehouse_id: z.string().optional().nullable(),
    related_order_id: z.string().optional().nullable(),
    reference_type: z.string().optional().nullable(),
    reference_no: z.string().optional().nullable(),
    amount_rupees: z.coerce.number().positive("Amount is required"),
    notes: z.string().optional().nullable(),
});

export const costFilterSchema = z.object({
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    category: z.string().optional(),
    warehouse_id: z.string().optional(),
    status: z.string().optional(),
});