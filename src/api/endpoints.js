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
      // multipart/form-data (field name: images)
      createWithImages: "/v1/admin/product/with-images",
      uploadImages: (id) => `/v1/admin/product/${id}/images/upload`,
      deleteProduct: (id) => `/v1/admin/product/${id}`,
      update: (productId) => `/v1/admin/product/${productId}`,
      setActive: (productId) => `/v1/admin/product/${productId}/active`,
      createPack: (productId) => `/v1/admin/product/${productId}/packs`,
      updatePack: (packId) => `/v1/admin/product/packs/${packId}`,
      setPackActive: (packId) => `/v1/admin/product/packs/${packId}/active`,
      deletePack: (packId) => `/v1/admin/product/packs/${packId}`,

    },
    deliverySlot: {
      list: "/v1/admin/deliveryslot",
      create: "/v1/admin/deliveryslot",
      update: (id) => `/v1/admin/deliveryslot/${id}`,
      setActive: (id) => `/v1/admin/deliveryslot/${id}/active`,
    },
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
  },

  ops: {
    orders: {
      list: "/v1/opsOrder",
      updateStatus: (orderId) => `/v1/opsOrder/${orderId}/status`,
    },
    reports: {
      procurement: "/v1/opsReports/procurement",
    },
    jobs: {
      lockOrders: "/v1/opsJobs/lock-orders",
    },
    categories: {
      list: "/v1/opsCategories",
      getById: (id) => `/v1/opsCategories/${id}`,
      create: "/v1/opsCategories",
      update: (id) => `/v1/opsCategories/${id}`,
      toggleActive: (id) => `/v1/opsCategories/${id}/toggle-active`,
      reorder: "/v1/opsCategories/reorder",
    },
  },
};
