// All endpoints extracted from backend src/app.js + routes/*.js
export const ENDPOINTS = {
  health: "/v1/health",

  auth: {
    passwordLogin: "/v1/auth/password/login",
    changePassword: "/v1/auth/password",
    consoleAccess: "/v1/auth/console-access",
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
      list: "/v1/admin/product",
      getById: (productId) => `/v1/admin/product/${productId}`,
    },
    cost: {
      list: "/v1/admin/cost",
      summary: "/v1/admin/cost/summary",
      profitOverview: "/v1/admin/cost/profit-overview",
      procurementItems: "/v1/admin/cost/procurement-items",
      bulkUpsertProcurement: "/v1/admin/cost/procurement-costs/bulk",
      getById: (id) => `/v1/admin/cost/${id}`,
      create: "/v1/admin/cost",
      update: (id) => `/v1/admin/cost/${id}`,
      remove: (id) => `/v1/admin/cost/${id}`,
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
      passwordLogin: (id) => `/v1/admin/users/${id}/password-login`,
    },
    vendor: {
      list: "/v1/admin/vendor",
      create: "/v1/admin/vendor",
      getById: (id) => `/v1/admin/vendor/${id}`,
      update: (id) => `/v1/admin/vendor/${id}`,
      remove: (id) => `/v1/admin/vendor/${id}`,
      products: (id) => `/v1/admin/vendor/${id}/products`,
      updateProduct: (id, vendorProductId) => `/v1/admin/vendor/${id}/products/${vendorProductId}`,
      removeProduct: (id, vendorProductId) => `/v1/admin/vendor/${id}/products/${vendorProductId}`,
      assignments: "/v1/admin/vendor/assignments",
      bulkAssignments: "/v1/admin/vendor/assignments/bulk",
      groupedAssignments: "/v1/admin/vendor/assignments/grouped",
      autoAssignments: "/v1/admin/vendor/assignments/auto",
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
    deals: {
      list: "/v1/admin/deals",
      create: "/v1/admin/deals",
      getById: (dealId) => `/v1/admin/deals/${dealId}`,
      update: (dealId) => `/v1/admin/deals/${dealId}`,
      remove: (dealId) => `/v1/admin/deals/${dealId}`,
      packSearch: "/v1/admin/deals/packs",
      upsertItems: (dealId) => `/v1/admin/deals/${dealId}/items`,
      removeItem: (dealId, itemId) => `/v1/admin/deals/${dealId}/items/${itemId}`,
    },
    notificationCampaigns: {
      list: "/v1/admin/notification-campaigns",
      create: "/v1/admin/notification-campaigns",
      getById: (id) => `/v1/admin/notification-campaigns/${id}`,
      update: (id) => `/v1/admin/notification-campaigns/${id}`,
      remove: (id) => `/v1/admin/notification-campaigns/${id}`,
      test: (id) => `/v1/admin/notification-campaigns/${id}/test`,
      send: (id) => `/v1/admin/notification-campaigns/${id}/send`,
      schedule: (id) => `/v1/admin/notification-campaigns/${id}/schedule`,
    },
    ai: {
      generateProductDescription: "/v1/admin/ai/product-description",
    }
  },

  ops: {
    vendor: {
      vendors: "/v1/ops/vendor/vendors",
      assignments: "/v1/ops/vendor/assignments",
      checkIn: "/v1/ops/vendor/check-in",
      // checkIns: "/v1/ops/vendor/check-ins",
      receive: (assignmentId) => `/v1/ops/vendor/assignments/${assignmentId}/receive`,
    },
    orders: {
      list: "/v1/ops/orders",
      getById: (orderId) => `/v1/ops/orders/${orderId}`,
      updateStatus: (orderId) => `/v1/ops/orders/${orderId}/status`,
      exportCsv: "/v1/ops/orders/export",

      deliveryPartners: "/v1/ops/orders/delivery-partners",
      assignDeliveryPartner: (orderId) => `/v1/ops/orders/${orderId}/assign-delivery-partner`,
      unassignDeliveryPartner: (orderId) => `/v1/ops/orders/${orderId}/unassign-delivery-partner`,
      bulkAssignDeliveryPartner: "/v1/ops/orders/bulk/assign-delivery-partner",
      bulkUnassignDeliveryPartner: "/v1/ops/orders/bulk/unassign-delivery-partner",
      bulkUpdateStatus: "/v1/ops/orders/bulk/status",
    },
    reports: {
      procurement: "/v1/ops/reports/procurement",
    },
    jobs: {
      lockOrders: "/v1/ops/jobs/lock-orders",
      runs: "/v1/ops/jobs/runs",
    },
    scheduler: {
      lockOrders: "/v1/ops/scheduler/lock-orders",
      lockOrdersPresets: "/v1/ops/scheduler/lock-orders/presets",
    },
    categories: {
      list: "/v1/ops/categories",
      getById: (id) => `/v1/ops/categories/${id}`,
      create: "/v1/ops/categories",
      update: (id) => `/v1/ops/categories/${id}`,
      toggleActive: (id) => `/v1/ops/categories/${id}/toggle-active`,
      reorder: "/v1/ops/categories/reorder",
    },
    dailyOperations: {
      overview: "/v1/ops/daily-operations/overview",
      open: "/v1/ops/daily-operations/open",
      getById: (id) => `/v1/ops/daily-operations/${id}`,
      refresh: (id) => `/v1/ops/daily-operations/${id}/refresh`,
      notes: (id) => `/v1/ops/daily-operations/${id}/notes`,

      procurement: (id) => `/v1/ops/daily-operations/${id}/procurement`,
      updateProcurementItem: (id, itemId) => `/v1/ops/daily-operations/${id}/procurement/${itemId}`,
      bulkProcurement: (id) => `/v1/ops/daily-operations/${id}/procurement/bulk`,

      packing: (id) => `/v1/ops/daily-operations/${id}/packing`,
      packingOrder: (id, orderId) => `/v1/ops/daily-operations/${id}/packing/orders/${orderId}`,
      startPackingOrder: (id, orderId) => `/v1/ops/daily-operations/${id}/packing/orders/${orderId}/start`,
      updatePackingItem: (id, orderId, packingItemId) => `/v1/ops/daily-operations/${id}/packing/orders/${orderId}/items/${packingItemId}`,
      completePackingOrder: (id, orderId) => `/v1/ops/daily-operations/${id}/packing/orders/${orderId}/complete`,
      confirmCleanPacking: (id, orderId) => `/v1/ops/daily-operations/${id}/packing/orders/${orderId}/clean-confirm`,

      deliveryRuns: (id) => `/v1/ops/daily-operations/${id}/delivery-runs`,
      createDeliveryRun: (id) => `/v1/ops/daily-operations/${id}/delivery-runs`,
      deliveryRunDetail: (runId) => `/v1/ops/daily-operations/delivery-runs/${runId}`,
      updateDeliveryRun: (runId) => `/v1/ops/daily-operations/delivery-runs/${runId}`,
      addRunOrders: (runId) => `/v1/ops/daily-operations/delivery-runs/${runId}/orders`,
      removeRunOrder: (runId, orderId) => `/v1/ops/daily-operations/delivery-runs/${runId}/orders/${orderId}`,
      reorderRunOrders: (runId) => `/v1/ops/daily-operations/delivery-runs/${runId}/reorder`,
      handoverRun: (runId) => `/v1/ops/daily-operations/delivery-runs/${runId}/handover`,
      reconcileRun: (runId) => `/v1/ops/daily-operations/delivery-runs/${runId}/reconcile`,
      reconcileCodVariance: (id, runId) => `/v1/ops/daily-operations/${id}/delivery-runs/${runId}/reconcile-variance`,

      exceptions: (id) => `/v1/ops/daily-operations/${id}/exceptions`,
      createException: (id) => `/v1/ops/daily-operations/${id}/exceptions`,
      updateException: (exceptionId) => `/v1/ops/daily-operations/exceptions/${exceptionId}`,

      waste: (id) => `/v1/ops/daily-operations/${id}/waste`,
      createWaste: (id) => `/v1/ops/daily-operations/${id}/waste`,

      reconciliation: (id) => `/v1/ops/daily-operations/${id}/reconciliation`,
      close: (id) => `/v1/ops/daily-operations/${id}/close`,
      reopen: (id) => `/v1/ops/daily-operations/${id}/reopen`,
      automationSummary: (id) => `/v1/ops/daily-operations/${id}/automation-summary`,
      generateDeliveryPlan: (id) => `/v1/ops/daily-operations/${id}/delivery-plan/generate`,
      proposedDeliveryPlan: (id) => `/v1/ops/daily-operations/${id}/delivery-plan/proposed`,
      approveDeliveryPlan: (id) => `/v1/ops/daily-operations/${id}/delivery-plan/approve`,
      evaluateAutoClose: (id) => `/v1/ops/daily-operations/${id}/auto-close/evaluate`,
    },
  },

  support: {
    settings: "/v1/support/admin/settings",
    dashboard: "/v1/support/admin/dashboard",
    analytics: "/v1/support/admin/analytics",
    customers: {
      search: "/v1/support/admin/customers/search",
      context: (userId) => `/v1/support/admin/customers/${userId}/context`,
    },
    orders: {
      context: (orderId) => `/v1/support/admin/orders/${orderId}/context`,
    },
    actionRequests: {
      list: "/v1/support/admin/action-requests",
      approve: (requestId) => `/v1/support/admin/action-requests/${requestId}/approve`,
      reject: (requestId) => `/v1/support/admin/action-requests/${requestId}/reject`,
      execute: (requestId) => `/v1/support/admin/action-requests/${requestId}/execute`,
    },
    tickets: {
      list: "/v1/support/admin/tickets",
      create: "/v1/support/admin/tickets",
      detail: (ticketId) => `/v1/support/admin/tickets/${ticketId}`,
      assign: (ticketId) => `/v1/support/admin/tickets/${ticketId}/assign`,
      status: (ticketId) => `/v1/support/admin/tickets/${ticketId}/status`,
      priority: (ticketId) => `/v1/support/admin/tickets/${ticketId}/priority`,
      messages: (ticketId) => `/v1/support/admin/tickets/${ticketId}/messages`,
      internalNotes: (ticketId) => `/v1/support/admin/tickets/${ticketId}/internal-notes`,
      attachments: (ticketId) => `/v1/support/admin/tickets/${ticketId}/attachments`,
      escalate: (ticketId) => `/v1/support/admin/tickets/${ticketId}/escalate`,
      resolve: (ticketId) => `/v1/support/admin/tickets/${ticketId}/resolve`,
      close: (ticketId) => `/v1/support/admin/tickets/${ticketId}/close`,
      reopen: (ticketId) => `/v1/support/admin/tickets/${ticketId}/reopen`,
      actionRequests: (ticketId) => `/v1/support/admin/tickets/${ticketId}/action-requests`,
    },
  },
};
