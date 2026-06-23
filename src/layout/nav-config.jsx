import {
  LayoutDashboard,
  Tags,
  Package,
  Warehouse,
  Truck,
  Settings,
  Users,
  FileText,
  Wrench,
  Clock,
  Image,
  BadgePercent,
  IndianRupee,
  Megaphone,
} from "lucide-react";

// Navigation is driven by backend capabilities.
// All links here MUST have a matching route in src/router.jsx
export const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/",
    roles: ["admin", "warehouse_manager"],
  },

  {
    key: "categories",
    label: "Categories",
    icon: Tags,
    to: "/categories",
    roles: ["admin", "warehouse_manager"],
  },

  {
    key: "opsOrders",
    label: "Orders (Ops)",
    icon: Truck,
    to: "/ops/orders",
    roles: ["admin", "warehouse_manager"],
  },
  {
    key: "opsProcurement",
    label: "Procurement",
    icon: FileText,
    to: "/ops/procurement",
    roles: ["admin", "warehouse_manager"],
  },

  {
    key: "products",
    label: "Products",
    icon: Package,
    to: "/products",
    roles: ["admin"],
  },

  {
    key: "costManagement",
    label: "Cost Management",
    to: "/admin/cost",
    icon: IndianRupee,
    roles: ["admin"],
  },

  // {
  //   key: "adminDeliverySlots",
  //   label: "Delivery Slots",
  //   icon: Clock,
  //   to: "/admin/delivery-slots",
  //   roles: ["admin"],
  // },
  {
    key: "adminWarehouses",
    label: "Warehouses",
    icon: Warehouse,
    to: "/admin/warehouses",
    roles: ["admin"],
  },
  {
    key: "adminUsers",
    label: "Admin Users",
    icon: Users,
    to: "/admin/users",
    roles: ["admin"],
  },
  {
    key: "promotions",
    label: "Promotions",
    icon: Megaphone,
    roles: ["admin"],
    children: [
      {
        key: "adminBanners",
        label: "Banners",
        icon: Image,
        to: "/admin/banners",
        roles: ["admin"],
      },
      {
        key: "adminDeals",
        label: "Deals",
        icon: BadgePercent,
        to: "/admin/deals",
        roles: ["admin"],
      },
    ],
  },
  {
    key: "adminSettings",
    label: "Settings",
    icon: Settings,
    to: "/admin/settings",
    roles: ["admin"],
  },

  {
    key: "opsJobs",
    label: "Ops Jobs",
    icon: Wrench,
    to: "/ops/jobs",
    roles: ["admin"],
  }
];