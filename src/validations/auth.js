import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => /^\d{10}$/.test(v) || /^91\d{10}$/.test(v), {
    message: "Phone must be 10 digits or 91 + 10 digits",
  });

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  otp_request_id: z.string().uuid(),
  phone: phoneSchema,
  otp: z.string().min(4).max(8),
});
