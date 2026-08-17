import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number with country code");

const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .or(z.literal(""));

export const vendorCreateSchema = z.object({
  phone,
  full_name: z.string().trim().min(2, "Contact name is required"),
  email: optionalEmail,
  company_name: z.string().trim().min(2, "Company name is required"),
  status: z.enum(["active", "inactive"]),
  warehouse_id: z.string().uuid("Select a valid warehouse").optional().nullable().or(z.literal("")),
});

export const vendorEditSchema = vendorCreateSchema.omit({ phone: true });

const nullableMaximum = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number()
    .positive("Maximum quantity must be greater than 0")
    .refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-9, "Use at most 3 decimal places")
    .nullable()
);
const optionalQuantity = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number()
    .min(0, "Quantity cannot be negative")
    .refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-9, "Use at most 3 decimal places")
    .nullable()
);
const optionalLeadTime = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce
    .number()
    .int("Lead time must be a whole number")
    .min(0, "Lead time cannot be negative")
    .nullable()
);

export const vendorProductSchema = z
  .object({
    product_id: z.string().uuid("Select a product"),
    product_pack_id: z.string().uuid("Select a valid pack").nullable(),
    is_available: z.boolean(),
    minimum_quantity: optionalQuantity,
    maximum_quantity: nullableMaximum,
    lead_time_hours: optionalLeadTime,
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((values, context) => {
    if (
      values.maximum_quantity !== null &&
      values.minimum_quantity !== null &&
      values.maximum_quantity < values.minimum_quantity
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maximum_quantity"],
        message: "Maximum quantity must be at least the minimum quantity",
      });
    }
  });
