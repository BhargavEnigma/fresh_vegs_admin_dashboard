import { Navigate, Routes, Route } from "react-router-dom";
import { RequireAuth, RequireRole } from "./auth/role-guard";
import { useAuth } from "./auth/auth-context";
import { AppShell } from "./layout/app-shell";

import { LoginPage } from "./pages/auth/login-page";
import { AccessDeniedPage } from "./pages/auth/access-denied-page";
import { ChangePasswordPage } from "./pages/auth/change-password-page";
import { ProfilePage } from "./pages/account/profile-page";
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
import { DailyOperationsPage } from "./pages/ops/daily-operations/daily-operations-page";
import { InventoryPage } from "./pages/ops/inventory/inventory-page";
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
import { VendorsPage } from "./pages/admin/vendors/vendors-page";

import { NotificationsListPage } from "./pages/admin/notifications/notifications-list";
import { NotificationsCreatePage } from "./pages/admin/notifications/notifications-create";
import { NotificationsDetailPage } from "./pages/admin/notifications/notifications-detail";
import { NotificationsEditPage } from "./pages/admin/notifications/notifications-edit";
import { NotFoundPage } from "./pages/system/not-found";
import { SupportDashboardPage } from "./pages/support/support-dashboard-page";
import { SupportTicketsPage } from "./pages/support/support-tickets-page";
import { SupportTicketDetailPage } from "./pages/support/support-ticket-detail-page";
import { SupportCustomersPage } from "./pages/support/support-customers-page";
import { SupportCustomerContextPage } from "./pages/support/support-customer-context-page";
import { SupportOrderContextPage } from "./pages/support/support-order-context-page";
import { SupportActionRequestsPage } from "./pages/support/support-action-requests-page";
import { SupportAnalyticsPage } from "./pages/support/support-analytics-page";

function HomeRoute() {
  const { roles } = useAuth();
  if (roles.some((role) => role === "admin" || role === "warehouse_manager")) return <DashboardPage />;
  if (roles.some((role) => role === "support_manager")) return <Navigate to="/support" replace />;
  return <Navigate to="/access-denied" replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="account/profile" element={<ProfilePage />} />
          <Route path="account/security" element={<ChangePasswordPage />} />

          {/* Admin & Warehouse Manager Routes */}
          <Route element={<RequireRole allowed={["admin", "warehouse_manager"]} />}>
            <Route path="categories" element={<CategoriesListPage />} />
            <Route path="categories/:id" element={<CategoryDetailPage />} />
            <Route path="categories/new" element={<CategoryCreatePage />} />
            <Route path="categories/:id/edit" element={<CategoryEditPage />} />

            <Route path="ops/daily-operations" element={<DailyOperationsPage />} />
            <Route path="ops/inventory" element={<InventoryPage />} />
            <Route path="ops/orders" element={<OpsOrdersPage />} />
            <Route path="ops/orders/:orderId" element={<OpsOrderDetailPage />} />
            <Route path="ops/procurement" element={<ProcurementPage />} />

          </Route>

          {/* Admin Only Routes */}
          <Route element={<RequireRole allowed={["admin"]} />}>
            <Route path="products" element={<ProductsListPage />} />
            <Route path="products/new" element={<ProductCreatePage />} />
            <Route path="products/:productId" element={<ProductDetailPage />} />
            <Route path="products/:productId/edit" element={<ProductEditPage />} />

            <Route path="admin/cost" element={<CostPage />} />

            <Route path="admin/warehouses" element={<WarehousesListPage />} />
            <Route path="admin/warehouses/new" element={<WarehouseCreatePage />} />
            <Route path="admin/warehouses/:id" element={<WarehouseDetailPage />} />
            <Route path="admin/warehouses/:id/edit" element={<WarehouseEditPage />} />

            <Route path="admin/settings" element={<AdminSettingsPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/vendors" element={<VendorsPage />} />
            <Route path="admin/banners" element={<AdminBannersPage />} />
            <Route path="admin/deals" element={<AdminDealsPage />} />
            <Route path="notifications" element={<NotificationsListPage />} />
            <Route path="notifications/create" element={<NotificationsCreatePage />} />
            <Route path="notifications/:id" element={<NotificationsDetailPage />} />
            <Route path="notifications/:id/edit" element={<NotificationsEditPage />} />
            <Route path="ops/jobs" element={<OpsJobsPage />} />
          </Route>

          {/* Support Routes */}
          <Route element={<RequireRole allowed={["admin", "support_manager"]} />}>
            <Route path="support" element={<SupportDashboardPage />} />
            <Route path="support/tickets" element={<SupportTicketsPage />} />
            <Route path="support/tickets/:ticketId" element={<SupportTicketDetailPage />} />
            <Route path="support/customers" element={<SupportCustomersPage />} />
            <Route path="support/customers/:userId" element={<SupportCustomerContextPage />} />
            <Route path="support/orders/:orderId" element={<SupportOrderContextPage />} />
            <Route path="support/action-requests" element={<SupportActionRequestsPage />} />
          </Route>

          <Route element={<RequireRole allowed={["admin", "support_manager"]} />}>
            <Route path="support/analytics" element={<SupportAnalyticsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
