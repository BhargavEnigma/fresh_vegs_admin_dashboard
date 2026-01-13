import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  sort_order: z.number().int().min(0).max(100000).optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(80).optional().nullable(),
  slug: z.string().min(2).max(80).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  sort_order: z.number().int().min(0).max(100000).optional().nullable(),
});
