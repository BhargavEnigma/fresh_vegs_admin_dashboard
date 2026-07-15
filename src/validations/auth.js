import { z } from "zod";
import { getPasswordRequirements, isStrongPassword } from "../utils/password-policy.js";

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
    .regex(/^\d{4,8}$/, "Enter the 4–8 digit OTP."),
});

export const passwordLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Phone number or email is required.").max(254, "Phone number or email is too long.").refine(
    (value) => value.includes("@") ? z.string().email().safeParse(value).success : /^\d{10}$|^91\d{10}$/.test(value),
    "Enter a valid email, 10-digit phone number, or 12 digits beginning with 91."
  ),
  password: z.string({ required_error: "Password is required." }).min(1, "Password is required.").max(128, "Password is too long."),
});

function addStrongPasswordIssues(value, ctx, path = ["new_password"]) {
  if (!isStrongPassword(value)) {
    const unmet = getPasswordRequirements(value).find((item) => !item.met);
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: unmet?.label || "Password does not meet the requirements." });
  }
}

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required."),
  new_password: z.string().min(1, "New password is required."),
  confirm_password: z.string().min(1, "Confirm your new password."),
}).superRefine((data, ctx) => {
  addStrongPasswordIssues(data.new_password, ctx);
  if (data.new_password !== data.confirm_password) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm_password"], message: "Passwords do not match." });
  if (data.current_password === data.new_password) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["new_password"], message: "New password must differ from the current password." });
});

export const managedPasswordSchema = z.object({
  password: z.string().min(1, "New password is required."),
  confirm_password: z.string().min(1, "Confirm the new password."),
}).superRefine((data, ctx) => {
  addStrongPasswordIssues(data.password, ctx, ["password"]);
  if (data.password !== data.confirm_password) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm_password"], message: "Passwords do not match." });
});
