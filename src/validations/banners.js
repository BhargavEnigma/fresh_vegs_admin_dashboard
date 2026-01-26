import { z } from "zod";

export const bannerActionTypeEnum = z.enum([
    "none",
    "product",
    "category",
    "collection",
    "external_url",
]);

export const bannerPlacementSchema = z.string().min(1).max(50);

// Used for both create + update in the UI.
// Backend will validate again.
export const bannerUpsertSchema = z.object({
    title: z.string().max(200).optional().nullable(),
    subtitle: z.string().max(500).optional().nullable(),
    placement: bannerPlacementSchema.optional().default("home"),
    action_type: bannerActionTypeEnum.optional().default("none"),
    action_value: z.string().max(2000).optional().nullable(),
    sort_order: z.coerce.number().int().min(0).optional().default(0),
    start_at: z.string().optional().nullable(),
    end_at: z.string().optional().nullable(),
    is_active: z.coerce.boolean().optional().default(true),
    image_url: z.string().optional().nullable(),
});
