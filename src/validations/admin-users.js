import { z } from "zod";

// Derived from backend: validations/admin/users.admin.validation.js (create + set roles)
export const adminUserCreateSchema = z.object({
    phone: z.string().min(10).max(15),
    full_name: z.string().min(2).max(120).optional().nullable(),
    email: z.string().email().optional().nullable(),
    roles: z.array(z.enum(["admin", "warehouse_manager", "customer"]))
        .min(1)
        .default(["warehouse_manager"]),
});

export const adminSetRolesSchema = z.object({
    user_id: z.string().uuid(),
    roles: z.array(z.enum(["admin", "warehouse_manager", "customer"]))
        .min(1),
});