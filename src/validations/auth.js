import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => /^\d{10}$/.test(v) || /^91\d{10}$/.test(v), {
    message: "Enter a 10-digit mobile number or 12 digits starting with 91.",
  });

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  otp_request_id: z.string().uuid(),
  phone: phoneSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "Enter a 4–8 digit OTP or admin access code."),
});
