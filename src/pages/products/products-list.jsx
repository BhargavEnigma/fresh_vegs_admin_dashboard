import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminProducts, setProductActive } from "../../api/services/products.service";
import { useToast } from "../../components/toast/toast-context";
import { listCategoriesOps } from "../../api/services/categories.service";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { StatusBadge } from "../../components/common/status-badge";
import { assetUrl, cn, formatQuantity } from "../../lib/utils";
import {
  Eye,
  LayoutGrid,
  Pencil,
  Power,
  Table2,
  Package,
  Search,
  Plus,
  Sparkles,
  CheckCircle2,
  Layers,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { PremiumSelect } from "../../components/ui/premium-select";

const VIEW_MODES = {
  table: "table",
  grid: "grid",
};
const PRODUCTS_VIEW_MODE_KEY = "freshveg_admin_products_view_mode";

function getSavedViewMode(storageKey) {
  if (typeof window === "undefined") return VIEW_MODES.table;
  const saved = window.localStorage.getItem(storageKey);
  return Object.values(VIEW_MODES).includes(saved) ? saved : VIEW_MODES.table;
}

function formatRupees(paise) {
  return `₹${(Number(paise || 0) / 100).toFixed(2)}`;
}

function getProductImage(product) {
  return product.images?.length ? assetUrl(product.images[0].image_url) : "";
}

function ProductMobileCard({ product, onToggleActive }) {
  const imageUrl = getProductImage(product);
  const isActive = Boolean(product.is_active);
  const mrp = Number(product.mrp_paise || 0);
  const selling = Number(product.selling_price_paise || 0);
  const discount = mrp - selling;
  const discountPercent = discount > 0 && mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-dailyveg-300 dark:border-slate-800/90 dark:bg-slate-950">
      {/* Top Header: Image + Title + Category + Stock Status */}
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-700">
              <Package className="h-8 w-8" />
            </div>
          )}

          {discountPercent > 0 && (
            <div className="absolute top-1 left-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow-xs">
              {discountPercent}% OFF
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            <div className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {product.name}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center rounded-md bg-dailyveg-50 px-2 py-0.5 text-[11px] font-bold text-dailyveg-700 dark:bg-dailyveg-950/60 dark:text-dailyveg-300">
                {product.category?.name || "Uncategorized"}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-medium text-slate-500">
                {formatQuantity(product.base_quantity)} {product.unit || ""}
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge value={product.is_out_of_stock ? "out_of_stock" : "in_stock"} />
            <StatusBadge value={isActive ? "Active" : "Inactive"} />
          </div>
        </div>
      </div>

      {/* Price & Packs Highlight Strip */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-2 border border-slate-100 dark:bg-slate-900/60 dark:border-slate-800/80">
        <div className="flex items-baseline gap-2">
          <div className="text-base font-black text-slate-900 dark:text-white">
            {formatRupees(product.selling_price_paise)}
          </div>
          {mrp > selling && (
            <div className="text-xs text-slate-400 line-through">
              {formatRupees(product.mrp_paise)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Package className="h-3.5 w-3.5 text-slate-400" />
          <span>{product.packs?.length || 0} {product.packs?.length === 1 ? "pack" : "packs"}</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl font-medium text-xs">
          <Link to={`/products/${product.id}`}>
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </Link>
        </Button>

        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl font-medium text-xs">
          <Link to={`/products/${product.id}/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Link>
        </Button>

        <Button
          variant={isActive ? "redoutline" : "outline"}
          size="sm"
          className="h-9 gap-1.5 rounded-xl font-medium text-xs"
          onClick={() => onToggleActive(product)}
        >
          <Power className="h-3.5 w-3.5" />
          <span>{isActive ? "Deactivate" : "Activate"}</span>
        </Button>
      </div>
    </article>
  );
}

function ProductGridCard({ product, onToggleActive }) {
  const imageUrl = getProductImage(product);
  const isActive = Boolean(product.is_active);
  const discount = Number(product.mrp_paise || 0) - Number(product.selling_price_paise || 0);
  const discountPercent =
    discount > 0 && Number(product.mrp_paise) > 0
      ? Math.round((discount / Number(product.mrp_paise)) * 100)
      : 0;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-dailyveg-300 hover:shadow-xl hover:shadow-dailyveg-900/10 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-dailyveg-800 dark:hover:shadow-black/30">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-dailyveg-50 text-sm font-medium text-dailyveg-700 dark:bg-dailyveg-950/40 dark:text-dailyveg-300">
            No Image
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <StatusBadge value={product.is_out_of_stock ? "out_of_stock" : "in_stock"} />
          <StatusBadge value={isActive ? "Active" : "Inactive"} />
        </div>

        {discountPercent > 0 ? (
          <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-dailyveg-700 shadow-sm ring-1 ring-dailyveg-100 dark:bg-slate-950/95 dark:text-dailyveg-300 dark:ring-dailyveg-900">
            {discountPercent}% off
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="min-w-0">
          <div className="line-clamp-2 text-base font-semibold leading-snug text-slate-950 dark:text-slate-50">
            {product.name}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500">
            <span className="truncate">{product.category?.name || "No category"}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="shrink-0">{formatQuantity(product.base_quantity)} {product.unit || ""}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
            <div className="text-[11px] font-medium uppercase text-slate-500">Selling</div>
            <div className="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">
              {formatRupees(product.selling_price_paise)}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
            <div className="text-[11px] font-medium uppercase text-slate-500">MRP</div>
            <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {formatRupees(product.mrp_paise)}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
            <div className="text-[11px] font-medium uppercase text-slate-500">Packs</div>
            <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {product.packs?.length || 0}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-900">
          <div className="min-w-0 text-xs text-slate-500">
            Unit: <span className="font-medium text-slate-700 dark:text-slate-200">{product.unit || "—"}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button asChild variant="outline" size="icon" className="h-9 w-9" title="View product">
              <Link to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="icon" className="h-9 w-9" title="Edit product">
              <Link to={`/products/${product.id}/edit`} aria-label={`Edit ${product.name}`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              variant={isActive ? "redoutline" : "outline"}
              size="icon"
              className="h-9 w-9"
              onClick={() => onToggleActive(product)}
              title={isActive ? "Deactivate product" : "Activate product"}
              aria-label={isActive ? `Deactivate ${product.name}` : `Activate ${product.name}`}
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductsListPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || 1);
  const limit = Number(params.get("limit") || 20);
  const q = params.get("q") || "";
  const category_id = params.get("category_id") || "";
  const include_out_of_stock = params.get("include_out_of_stock") === "true";
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [viewMode, setViewMode] = React.useState(() => getSavedViewMode(PRODUCTS_VIEW_MODE_KEY));

  function updateViewMode(nextViewMode) {
    setViewMode(nextViewMode);
    window.localStorage.setItem(PRODUCTS_VIEW_MODE_KEY, nextViewMode);
  }

  const productsQ = useQuery({
    queryKey: ["products", { page, limit, q, category_id, include_out_of_stock }],
    queryFn: () =>
      listAdminProducts({
        page,
        limit,
        q: q || undefined,
        category_id: category_id || undefined,
        include_inactive: true,
        include_out_of_stock,
      }),
  });

  const catsQ = useQuery({
    queryKey: ["categories", "ops"],
    queryFn: () => listCategoriesOps({ include_inactive: true }),
  });

  const queryClient = useQueryClient();
  const toast = useToast();

  const activeMut = useMutation({
    mutationFn: ({ productId, is_active }) => setProductActive(productId, is_active),
    meta: {
      globalLoaderMessage: "Updating product status...",
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.is_active ? "Product activated" : "Product inactivated"
      );

      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error(
        "Failed to update product",
        error?.response?.data?.error?.message || error?.message || "Please try again"
      );
    },
  });

  const products = productsQ.data?.data?.products || [];
  const total = productsQ.data?.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const categories = catsQ.data?.data?.categories || [];

  function set(key, value) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, String(value));
    if (key !== "page") next.set("page", "1");
    setParams(next);
  }

  return (
    <div className="min-w-0 space-y-3.5 sm:space-y-4 pb-8">
      <PageHeader
        title="Products"
        subtitle="Inventory catalogue & price management"
        actions={
          <Button asChild className="w-full sm:w-auto gap-1.5 h-9 rounded-xl font-bold bg-dailyveg-600 hover:bg-dailyveg-700 text-white shadow-sm">
            <Link to="/products/new">
              <Plus className="h-4 w-4" />
              <span>Create Product</span>
            </Link>
          </Button>
        }
      />

      {/* Quick Summary KPIs on mobile & desktop */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-950">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Package className="h-3.5 w-3.5 text-dailyveg-600" /> Total Listed
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {total}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-950">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Active Now
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            {products.filter((p) => p.is_active).length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-950">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> In Stock
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {products.filter((p) => !p.is_out_of_stock).length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-950">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Layers className="h-3.5 w-3.5 text-indigo-500" /> Categories
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {categories.length}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-3.5 sm:p-5">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(200px,0.7fr)_auto]">
            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Search</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => set("q", e.target.value)}
                  placeholder="Search by product name..."
                  className="h-10 pl-9 rounded-xl text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</div>
              <PremiumSelect
                value={category_id}
                onChange={(value) => set("category_id", value)}
                options={[
                  { value: "", label: "All categories" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                placeholder="All categories"
                isClearable={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 col-span-1 sm:col-span-2 xl:col-span-2 xl:flex xl:items-end">
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 xl:invisible">Filter</div>
                <label className="flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-700 transition hover:border-slate-300 dark:border-slate-800 dark:text-slate-200">
                  <span className="truncate">Out of stock</span>
                  <input
                    type="checkbox"
                    checked={include_out_of_stock}
                    onChange={(e) => set("include_out_of_stock", e.target.checked ? "true" : "")}
                    className="h-4 w-4 rounded accent-dailyveg-600"
                  />
                </label>
              </div>

              <div className="w-full xl:w-[112px]">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 xl:invisible">View</div>
                <div className="grid h-10 w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/70">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-dailyveg-700 dark:text-slate-400 dark:hover:text-dailyveg-300",
                      viewMode === VIEW_MODES.table &&
                      "bg-white text-dailyveg-700 shadow-sm dark:bg-slate-950 dark:text-dailyveg-300"
                    )}
                    onClick={() => updateViewMode(VIEW_MODES.table)}
                    title="Table view"
                    aria-label="Table view"
                    aria-pressed={viewMode === VIEW_MODES.table}
                  >
                    <Table2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-dailyveg-700 dark:text-slate-400 dark:hover:text-dailyveg-300",
                      viewMode === VIEW_MODES.grid &&
                      "bg-white text-dailyveg-700 shadow-sm dark:bg-slate-950 dark:text-dailyveg-300"
                    )}
                    onClick={() => updateViewMode(VIEW_MODES.grid)}
                    title="Grid view"
                    aria-label="Grid view"
                    aria-pressed={viewMode === VIEW_MODES.grid}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {productsQ.isLoading ? <div className="text-sm text-slate-500">Loading…</div> : null}
      {productsQ.isError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-slate-950">
          {productsQ.error?.response?.data?.error?.message || productsQ.error?.message || "Failed to load"}
        </div>
      ) : null}

      {!productsQ.isLoading && !productsQ.isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className={cn("grid gap-3 p-3", viewMode === VIEW_MODES.table ? "md:hidden" : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")}>
            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                No products
              </div>
            ) : (
              products.map((p) =>
                viewMode === VIEW_MODES.grid ? (
                  <ProductGridCard
                    key={p.id}
                    product={p}
                    onToggleActive={(product) => {
                      setSelectedProduct(product);
                      setConfirmOpen(true);
                    }}
                  />
                ) : (
                  <ProductMobileCard
                    key={p.id}
                    product={p}
                    onToggleActive={(product) => {
                      setSelectedProduct(product);
                      setConfirmOpen(true);
                    }}
                  />
                )
              )
            )}
          </div>

          <div className={cn("w-full overflow-x-auto thin-scrollbar", viewMode === VIEW_MODES.table ? "hidden md:block" : "hidden")}>
            <table className="premium-table min-w-[1050px]">
              <thead className="text-left bg-dailyveg-50/80 dark:bg-dailyveg-950/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Image</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Base</th>
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold">MRP</th>
                  <th className="px-4 py-3 font-semibold">Selling</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      No products
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3">
                        {p.images?.length ? (
                          <img
                            src={assetUrl(p.images[0].image_url)}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-900" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.unit} • {p.packs?.length ? `${p.packs.length} packs` : "no packs"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.category?.name || "—"}</td>
                      <td className="px-4 py-3">{formatQuantity(p.base_quantity)}</td>
                      <td className="px-4 py-3">{p.unit ?? "—"}</td>
                      <td className="px-4 py-3">₹{(Number(p.mrp_paise || 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3">₹{(Number(p.selling_price_paise || 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge value={p.is_out_of_stock ? "out_of_stock" : "in_stock"} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={p.is_active ? "Active" : "Inactive"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/products/${p.id}`}>View</Link>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/products/${p.id}/edit`}>Edit</Link>
                          </Button>
                          <Button
                            variant={p.is_active ? "redoutline" : "outline"}
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(p);
                              setConfirmOpen(true);
                            }}
                          >
                            {p.is_active ? "Deactive" : "Active"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center text-xs text-slate-500 sm:text-left">
              Page {page} of {totalPages} • {total} total
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => set("page", Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => set("page", Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>

              <PremiumSelect
                size="sm"
                className="w-full sm:w-28"
                value={limit}
                onChange={(val) => set("limit", val)}
                options={[
                  { value: 10, label: "10/page" },
                  { value: 20, label: "20/page" },
                  { value: 50, label: "50/page" },
                  { value: 100, label: "100/page" },
                ]}
                isSearchable={false}
              />
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct?.is_active
                ? "Deactivate Product"
                : "Activate Product"}
            </DialogTitle>

            <DialogDescription>
              {selectedProduct?.is_active
                ? `Are you sure you want to deactivate "${selectedProduct?.name}"? Customers will not be able to purchase it.`
                : `Are you sure you want to activate "${selectedProduct?.name}"?`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setSelectedProduct(null);
              }}
            >
              Cancel
            </Button>

            <Button
              variant={
                selectedProduct?.is_active
                  ? "destructive"
                  : "default"
              }
              disabled={activeMut.isPending}
              onClick={() => {
                if (!selectedProduct) return;

                activeMut.mutate(
                  {
                    productId: selectedProduct.id,
                    is_active: !selectedProduct.is_active,
                  },
                  {
                    onSuccess: () => {
                      setConfirmOpen(false);
                      setSelectedProduct(null);
                    },
                  }
                );
              }}
            >
              {activeMut.isPending
                ? "Updating..."
                : selectedProduct?.is_active
                  ? "Deactivate"
                  : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
