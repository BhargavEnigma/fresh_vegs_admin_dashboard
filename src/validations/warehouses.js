import { z } from "zod";

const nullableNumber = z.preprocess(
    (value) => {
        if (value === "" || value === undefined || value === null) return null;
        return Number(value);
    },
    z.number().nullable().optional()
);

const serviceAreaSchema = z.object({
    area_name: z.string().min(2, "Area name is required").max(120),
    city: z.string().min(2, "City is required").max(80),
    pincode: z.string().min(3, "Pincode is required").max(10),
    lat: nullableNumber,
    lng: nullableNumber,
    radius_km: nullableNumber,
    boundary_geojson: z.any().nullable().optional(),
    is_active: z.boolean().optional(),
});

export const warehouseCreateSchema = z.object({
    name: z.string().min(2).max(120),
    address_line1: z.string().min(3).max(250),
    address_line2: z.string().max(250).nullable().optional(),
    city: z.string().max(80).nullable().optional(),
    state: z.string().max(80).nullable().optional(),
    pincode: z.string().max(10).nullable().optional(),
    lat: nullableNumber,
    lng: nullableNumber,
    is_active: z.boolean().optional(),
    service_areas: z.array(serviceAreaSchema).optional(),
});

export const warehouseUpdateSchema = warehouseCreateSchema.partial();