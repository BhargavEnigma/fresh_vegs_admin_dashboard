import api from "../axios";
import { ENDPOINTS } from "../endpoints";

export async function listProducts({ page, limit, q, category_id, include_out_of_stock } = {}) {
  // Backend supports: page, limit, q, category_id, include_out_of_stock
  const res = await api.get(ENDPOINTS.products.list, {
    params: {
      page: page || undefined,
      limit: limit || undefined,
      q: q || undefined,
      category_id: category_id || undefined,
      include_out_of_stock: include_out_of_stock ? true : undefined,
    },
  });
  return res.data;
}

export async function getProductById(productId) {
  const res = await api.get(ENDPOINTS.products.getById(productId));
  return res.data;
}

// Admin mutations
export async function createProduct(payload) {
  const res = await api.post(ENDPOINTS.admin.product.create, payload);
  return res.data;
}

// Admin create product + images (multipart/form-data)
export async function createProductWithImages(payload, images) {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    formData.append(k, String(v));
  });

  (images || []).forEach((img) => {
    const file = img instanceof File ? img : img?.file; // ✅ supports both
    if (file) formData.append("images", file);
  });

  // ✅ Do NOT set headers here
  const res = await api.post(ENDPOINTS.admin.product.createWithImages, formData);
  return res.data;
}

export async function updateProduct(productId, payload) {
  const res = await api.put(ENDPOINTS.admin.product.update(productId), payload);
  return res.data;
}

export async function uploadProductImages(productId, images) {
  const fd = new FormData();
  (images || []).forEach((f) => fd.append("images", f instanceof File ? f : f?.file));
  const res = await api.post(ENDPOINTS.admin.product.uploadImages(productId), fd);
  return res.data;
}

export async function setProductActive(productId, is_active) {
  const res = await api.patch(ENDPOINTS.admin.product.setActive(productId), { is_active });
  return res.data;
}
