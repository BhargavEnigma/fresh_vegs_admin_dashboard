import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dealUpsertSchema = z.object({
    name: z.string().min(1).max(200).default("Deals of the Day"),
    description: z.string().max(2000).nullable().optional(),
    deal_date: dateOnly,
    starts_at: z.string().optional().nullable(),
    ends_at: z.string().optional().nullable(),
    is_active: z.coerce.boolean().default(true),
    priority: z.coerce.number().int().min(0).default(0),
});

export const dealItemsSchema = z.array(
    z.object({
        id: z.string().uuid().optional(),
        product_pack_id: z.string().uuid(),
        pricing_type: z.enum(["fixed_price", "percent_off", "amount_off"]),

        deal_price_paise: z.coerce.number().int().min(0).optional().nullable(),
        discount_bps: z.coerce.number().int().min(0).max(10000).optional().nullable(),
        discount_paise: z.coerce.number().int().min(0).optional().nullable(),

        max_qty_per_order: z.coerce.number().int().min(1).optional().nullable(),
        sort_order: z.coerce.number().int().min(0).optional().default(0),
        is_active: z.coerce.boolean().optional().default(true),
    })
);
