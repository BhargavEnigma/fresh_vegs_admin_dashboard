import { z } from "zod";

export const createProductSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional().nullable(),
  tag: z.string().max(2000).optional().nullable(),
  unit: z.string().max(20),
  base_quantity: z.coerce.number().positive(),
  mrp_paise: z.coerce.number().int().positive(),
  selling_price_paise: z.coerce.number().int().positive(),
  is_out_of_stock: z.boolean().optional().nullable(),
  is_active: z.boolean().optional().nullable(),
});

export const updateProductSchema = createProductSchema; // backend requires these fields on update too
