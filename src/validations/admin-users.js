import { z } from "zod";

const rolesEnum = z.enum(["admin", "warehouse_manager", "customer", "delivery_partner"]);

const requireWarehouseForStaffRoles = (data, ctx) => {
    const needsWarehouse =
        data.roles?.includes("warehouse_manager") ||
        data.roles?.includes("delivery_partner");

    if (needsWarehouse && (!data.warehouse_ids || data.warehouse_ids.length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["warehouse_ids"],
            message: "Warehouse assignment is required for warehouse manager and delivery partner.",
        });
    }
};

export const adminUserCreateSchema = z.object({
    phone: z.string().min(10).max(15),
    full_name: z.string().min(2).max(120).optional().nullable(),
    email: z.string().email().optional().nullable(),
    roles: z.array(rolesEnum).min(1).default(["warehouse_manager"]),
    warehouse_ids: z.array(z.string().uuid()).optional().default([]),
}).superRefine(requireWarehouseForStaffRoles);

export const adminSetRolesSchema = z.object({
    user_id: z.string().uuid(),
    roles: z.array(rolesEnum).min(1),
    warehouse_ids: z.array(z.string().uuid()).optional().default([]),
}).superRefine(requireWarehouseForStaffRoles);