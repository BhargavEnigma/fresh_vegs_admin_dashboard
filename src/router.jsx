import { Routes, Route } from "react-router-dom";
import { RequireAuth, RequireRole } from "./auth/role-guard";
import { AppShell } from "./layout/app-shell";

import { LoginPage } from "./pages/auth/login-page";
import { DashboardPage } from "./pages/dashboard/dashboard-page";

import { CategoriesListPage } from "./pages/categories/categories-list";
import { CategoryCreatePage } from "./pages/categories/category-create";
import { CategoryEditPage } from "./pages/categories/category-edit";
import { CategoryDetailPage } from "./pages/categories/category-detail";

import { ProductsListPage } from "./pages/products/products-list";
import { ProductCreatePage } from "./pages/products/product-create";
import { ProductEditPage } from "./pages/products/product-edit";
import { ProductDetailPage } from "./pages/products/product-detail";

import { CostPage } from "./pages/admin/cost/cost-page";

import { OpsOrdersPage } from "./pages/ops/orders/ops-orders-page";
import { OpsOrderDetailPage } from "./pages/ops/orders/ops-order-detail-page";
import { ProcurementPage } from "./pages/ops/procurement/procurement-page";
import { OpsJobsPage } from "./pages/ops/jobs/jobs-page";

import { DeliverySlotsAdminPage } from "./pages/admin/delivery-slots/delivery-slots-page";
import { WarehousesListPage } from "./pages/admin/warehouses/warehouses-list";
import { WarehouseCreatePage } from "./pages/admin/warehouses/warehouse-create";
import { WarehouseEditPage } from "./pages/admin/warehouses/warehouse-edit";
import { WarehouseDetailPage } from "./pages/admin/warehouses/warehouse-detail";
import { AdminSettingsPage } from "./pages/admin/settings/settings-page";
import { AdminUsersPage } from "./pages/admin/users/admin-users-page";
import { AdminBannersPage } from "./pages/admin/banners/banners-page";
import { AdminDealsPage } from "./pages/admin/deals/deals-page";
import { NotFoundPage } from "./pages/system/not-found";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {/* Shared: admin + warehouse_manager */}
          <Route element={<RequireRole allowed={["admin", "warehouse_manager"]} />}>
            <Route index element={<DashboardPage />} />

            <Route path="categories" element={<CategoriesListPage />} />
            <Route path="categories/:id" element={<CategoryDetailPage />} />

            <Route path="ops/orders" element={<OpsOrdersPage />} />
            <Route path="ops/orders/:orderId" element={<OpsOrderDetailPage />} />
            <Route path="ops/procurement" element={<ProcurementPage />} />
          </Route>

          {/* Admin only */}
          <Route element={<RequireRole allowed={["admin"]} />}>
            <Route path="categories/new" element={<CategoryCreatePage />} />
            <Route path="categories/:id/edit" element={<CategoryEditPage />} />

            <Route path="products" element={<ProductsListPage />} />
            <Route path="products/new" element={<ProductCreatePage />} />
            <Route path="products/:productId" element={<ProductDetailPage />} />
            <Route path="products/:productId/edit" element={<ProductEditPage />} />

            <Route path="products/:productId/edit" element={<ProductEditPage />} />

            <Route path="/admin/cost" element={<CostPage />} />

            <Route path="admin/warehouses" element={<WarehousesListPage />} />
            <Route path="admin/warehouses/new" element={<WarehouseCreatePage />} />
            <Route path="admin/warehouses/:id" element={<WarehouseDetailPage />} />
            <Route path="admin/warehouses/:id/edit" element={<WarehouseEditPage />} />

            <Route path="admin/settings" element={<AdminSettingsPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/banners" element={<AdminBannersPage />} />
            <Route path="admin/deals" element={<AdminDealsPage />} />
            <Route path="ops/jobs" element={<OpsJobsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}