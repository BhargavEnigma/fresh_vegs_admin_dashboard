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

export async function updateProductWithImages(productId, payload, images) {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    formData.append(k, String(v));
  });

  (images || []).forEach((img) => {
    const file = img instanceof File ? img : img?.file;
    if (file) formData.append("images", file);
  });

  const res = await api.put(ENDPOINTS.admin.product.updateWithImages(productId), formData);
  return res.data;
}

export async function uploadProductImages(productId, images) {
  const formData = new FormData();
  (images || []).forEach((img) => {
    const file = img instanceof File ? img : img?.file;
    if (file) formData.append("images", file);
  });
  const res = await api.post(ENDPOINTS.admin.product.uploadImages(productId), formData);
  return res.data;
}

export async function deleteProductImage(imageId) {
  const res = await api.delete(ENDPOINTS.admin.product.deleteImage(imageId));
  return res.data;
}

export async function setProductActive(productId, is_active) {
  const res = await api.patch(ENDPOINTS.admin.product.setActive(productId), { is_active });
  return res.data;
}

export async function listProductPacksAdmin(productId, { include_inactive } = {}) {
  const res = await api.get(ENDPOINTS.admin.product.listPacks(productId), {
    params: { include_inactive: include_inactive ? true : undefined },
  });
  return res.data;
}

export async function createProductPack(productId, payload) {
  const res = await api.post(ENDPOINTS.admin.product.createPack(productId), payload);
  return res.data;
}

export async function updateProductPack(packId, payload) {
  const res = await api.put(ENDPOINTS.admin.product.updatePack(packId), payload);
  return res.data;
}

export async function setProductPackActive(packId, is_active) {
  const res = await api.patch(ENDPOINTS.admin.product.setPackActive(packId), { is_active });
  return res.data;
}

export async function deleteProductPack(packId) {
  const res = await api.delete(ENDPOINTS.admin.product.deletePack(packId));
  return res.data;
}

export async function reorderProductImages(productId, images) {
  const res = await api.put(ENDPOINTS.admin.product.reorderImages(productId), { images });
  return res.data;
}

export async function listAdminProducts({
  page,
  limit,
  q,
  category_id,
  include_inactive = true,
  include_out_of_stock = true,
} = {}) {
  const res = await api.get(ENDPOINTS.admin.product.list, {
    params: {
      page: page || undefined,
      limit: limit || undefined,
      q: q || undefined,
      category_id: category_id || undefined,
      include_inactive: include_inactive ? true : undefined,
      include_out_of_stock: include_out_of_stock ? true : undefined,
    },
  });
  return res.data;
}

export async function getAdminProductById(productId) {
  const res = await api.get(ENDPOINTS.admin.product.getById(productId));
  return res.data;
}

export async function setProductFreshnessPolicy(productId, payload) {
  const res = await api.put(ENDPOINTS.admin.product.setFreshnessPolicy(productId), payload);
  return res.data;
}