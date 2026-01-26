// All endpoints extracted from backend src/app.js + routes/*.js
export const ENDPOINTS = {
  health: "/v1/health",

  auth: {
    sendOtp: "/v1/auth/otp/send",
    verifyOtp: "/v1/auth/otp/verify",
    refresh: "/v1/auth/token/refresh",
    logout: "/v1/auth/logout",
    me: "/v1/auth/me",
  },

  user: {
    me: "/v1/user/me",
    updateProfile: "/v1/user/profile",
  },

  addresses: {
    list: "/v1/address",
    create: "/v1/address",
    update: (id) => `/v1/address/${id}`,
    remove: (id) => `/v1/address/${id}`,
    setDefault: (id) => `/v1/address/${id}/default`,
  },

  products: {
    list: "/v1/products",
    getById: (productId) => `/v1/products/${productId}`,
  },

  cart: {
    get: "/v1/cart",
    addItem: "/v1/cart/items",
    updateItem: (itemId) => `/v1/cart/items/${itemId}`,
    removeItem: (itemId) => `/v1/cart/items/${itemId}`,
    clear: "/v1/cart/clear",
  },

  checkout: {
    checkout: "/v1/checkout",
  },

  deliverySlot: {
    list: "/v1/deliveryslot",
  },

  setting: {
    public: "/v1/setting/public",
  },

  payments: {
    webhook: "/v1/payments/webhook",
  },

  catalog: {
    categories: "/v1/catalog/categories",
  },

  orders: {
    listMy: "/v1/orders",
    getMyById: (id) => `/v1/orders/${id}`,
    cancelMy: (id) => `/v1/orders/${id}/cancel`,
  },

  admin: {
    dashboard: {
      kpis: "/v1/admin/dashboard/kpis",
    },
    product: {
      create: "/v1/admin/product",
      createWithImages: "/v1/admin/product/with-images",
      update: (productId) => `/v1/admin/product/${productId}`,
      updateWithImages: (productId) => `/v1/admin/product/${productId}/with-images`,
      setActive: (productId) => `/v1/admin/product/${productId}/active`,
      deleteProduct: (id) => `/v1/admin/product/${id}`,

      // Packs
      createPack: (productId) => `/v1/admin/product/${productId}/packs`,
      listPacks: (productId) => `/v1/admin/product/${productId}/packs`,
      updatePack: (packId) => `/v1/admin/product/packs/${packId}`,
      setPackActive: (packId) => `/v1/admin/product/packs/${packId}/active`,
      deletePack: (packId) => `/v1/admin/product/packs/${packId}`,

      // Images
      uploadImages: (productId) => `/v1/admin/product/${productId}/images/upload`,
      deleteImage: (imageId) => `/v1/admin/product/images/${imageId}`,
      reorderImages: (productId) => `/v1/admin/product/${productId}/images/reorder`,
    },
    
    // deliverySlot: {
    //   list: "/v1/admin/deliveryslot",
    //   create: "/v1/admin/deliveryslot",
    //   update: (id) => `/v1/admin/deliveryslot/${id}`,
    //   setActive: (id) => `/v1/admin/deliveryslot/${id}/active`,
    // },

    settings: {
      list: "/v1/adminSetting",
      getByKey: (key) => `/v1/adminSetting/${encodeURIComponent(key)}`,
      upsert: (key) => `/v1/adminSetting/${encodeURIComponent(key)}`,
    },
    warehouse: {
      create: "/v1/adminWarehouse",
      list: "/v1/adminWarehouse",
      getById: (id) => `/v1/adminWarehouse/${id}`,
      update: (id) => `/v1/adminWarehouse/${id}`,
      deactivate: (id) => `/v1/adminWarehouse/${id}`,
    },
    users: {
      create: "/v1/admin/users",
      setRoles: (id) => `/v1/admin/users/${id}/roles`,
      list: "/v1/admin/users",
      getById: (id) => `/v1/admin/users/${id}`,
    },

    banners: {
      list: "/v1/admin/banners",
      create: "/v1/admin/banners",
      createWithImage: "/v1/admin/banners/with-image",
      update: (bannerId) => `/v1/admin/banners/${bannerId}`,
      updateWithImage: (bannerId) => `/v1/admin/banners/${bannerId}/with-image`,
      setActive: (bannerId) => `/v1/admin/banners/${bannerId}/active`,
      reorder: "/v1/admin/banners/reorder",
      remove: (bannerId) => `/v1/admin/banners/${bannerId}`,
    },
  },

  ops: {
    orders: {
      list: "/v1/ops/orders",
      getById: (orderId) => `/v1/ops/orders/${orderId}`,
      updateStatus: (orderId) => `/v1/ops/orders/${orderId}/status`,
      exportCsv: "/v1/ops/orders/export",
    },
    reports: {
      procurement: "/v1/ops/reports/procurement",
    },
    jobs: {
      lockOrders: "/v1/ops/jobs/lock-orders",
    },
    categories: {
      list: "/v1/ops/categories",
      getById: (id) => `/v1/ops/categories/${id}`,
      create: "/v1/ops/categories",
      update: (id) => `/v1/ops/categories/${id}`,
      toggleActive: (id) => `/v1/ops/categories/${id}/toggle-active`,
      reorder: "/v1/ops/categories/reorder",
    },
  },
};
