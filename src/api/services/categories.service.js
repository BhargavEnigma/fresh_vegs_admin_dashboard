import api from "../axios";
import { ENDPOINTS } from "../endpoints";

function isFile(value) {
  if (!value) return false;
  if (typeof File !== "undefined" && value instanceof File) return true;
  return false;
}

function buildCategoryFormData(payload, { isUpdate = false } = {}) {
  const fd = new FormData();

  // NOTE:
  // - For create: include required fields
  // - For update: only include fields that are not undefined/null (so backend doesn't get "null" string)

  if (!isUpdate) {
    fd.append("name", String(payload.name || "").trim());
    if (payload.slug !== undefined && payload.slug !== null && String(payload.slug).trim() !== "") {
      fd.append("slug", String(payload.slug).trim());
    }
    if (payload.sort_order !== undefined && payload.sort_order !== null) {
      fd.append("sort_order", String(payload.sort_order));
    }
    if (payload.is_active !== undefined && payload.is_active !== null) {
      fd.append("is_active", String(!!payload.is_active));
    }
  } else {
    if (payload.name !== undefined && payload.name !== null && String(payload.name).trim() !== "") {
      fd.append("name", String(payload.name).trim());
    }
    if (payload.slug !== undefined && payload.slug !== null) {
      const s = String(payload.slug).trim();
      // allow clearing slug by sending empty string? (usually not needed)
      if (s !== "") fd.append("slug", s);
    }
    if (payload.sort_order !== undefined && payload.sort_order !== null) {
      fd.append("sort_order", String(payload.sort_order));
    }
    if (payload.is_active !== undefined && payload.is_active !== null) {
      fd.append("is_active", String(!!payload.is_active));
    }
  }

  if (isFile(payload.image)) {
    fd.append("image", payload.image);
  }

  return fd;
}

export async function listCategoriesOps({ q = "", include_inactive = true } = {}) {
  const res = await api.get(ENDPOINTS.ops.categories.list, {
    params: { q: q || undefined, include_inactive },
  });
  return res.data;
}

export async function getCategoryById(id) {
  const res = await api.get(ENDPOINTS.ops.categories.getById(id));
  return res.data;
}

export async function createCategory(payload) {
  const hasImage = isFile(payload?.image);

  if (hasImage) {
    const fd = buildCategoryFormData(payload, { isUpdate: false });
    const res = await api.post(ENDPOINTS.ops.categories.create, fd);
    return res.data;
  }

  // JSON (old behavior)
  const res = await api.post(ENDPOINTS.ops.categories.create, payload);
  return res.data;
}

export async function updateCategory(id, payload) {
  const hasImage = isFile(payload?.image);

  if (hasImage) {
    const fd = buildCategoryFormData(payload, { isUpdate: true });
    const res = await api.patch(ENDPOINTS.ops.categories.update(id), fd);
    return res.data;
  }

  // JSON (old behavior)
  const res = await api.patch(ENDPOINTS.ops.categories.update(id), payload);
  return res.data;
}

export async function setCategoryActive(id, is_active) {
  const res = await api.patch(ENDPOINTS.ops.categories.toggleActive(id), { is_active });
  return res.data;
}

export async function reorderCategories(items) {
  const res = await api.put(ENDPOINTS.ops.categories.reorder, { items });
  return res.data;
}
