import { z } from "zod";

export const PROCUREMENT_UNITS = ["kg", "l", "unit", "piece"];

export const createProductSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(2).max(150),
  search_keywords: z.string().trim().max(2000).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  tag: z.string().max(2000).optional().nullable(),
  unit: z.string().max(20),
  base_quantity: z.coerce.number().positive(),
  mrp_paise: z.coerce.number().int().positive(),
  selling_price_paise: z.coerce.number().int().positive(),
  is_out_of_stock: z.boolean().optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  procurement_mode: z.enum(["bulk", "pack"]),
  procurement_unit: z.string().max(10).optional().nullable(),
}).superRefine((value, context) => {
  if (value.procurement_mode === "bulk" && !PROCUREMENT_UNITS.includes(value.procurement_unit)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["procurement_unit"],
      message: "Select a supported procurement unit for bulk purchasing",
    });
  }
});

export const updateProductSchema = createProductSchema; // backend requires these fields on update too
