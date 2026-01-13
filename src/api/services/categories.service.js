import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export async function listCategoriesOps({ q = "", include_inactive = true } = {}) {
  const res = await api.get(ENDPOINTS.ops.categories.list, { params: { q: q || undefined, include_inactive } });
  return res.data;
}

export async function getCategoryById(id) {
  const res = await api.get(ENDPOINTS.ops.categories.getById(id));
  return res.data;
}

export async function createCategory(payload) {
  const res = await api.post(ENDPOINTS.ops.categories.create, payload);
  return res.data;
}

export async function updateCategory(id, payload) {
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
