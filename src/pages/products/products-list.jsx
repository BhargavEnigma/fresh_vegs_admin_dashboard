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
import { Eye, LayoutGrid, Pencil, Power, Table2 } from "lucide-react";
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
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex gap-3">
        {product.images?.length ? (
          <img
            src={assetUrl(product.images[0].image_url)}
            alt={product.name}
            className="h-16 w-16 rounded-2xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-900" />
        )}

        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 font-semibold">{product.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {product.category?.name || "—"} · {product.unit || "—"}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={product.is_out_of_stock ? "out_of_stock" : "in_stock"} />
            <StatusBadge value={product.is_active ? "Active" : "Inactive"} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
          <div className="text-xs text-slate-500">MRP</div>
          <div className="font-semibold">₹{(Number(product.mrp_paise || 0) / 100).toFixed(2)}</div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
          <div className="text-xs text-slate-500">Selling</div>
          <div className="font-semibold">₹{(Number(product.selling_price_paise || 0) / 100).toFixed(2)}</div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
          <div className="text-xs text-slate-500">Packs</div>
          <div className="font-semibold">{product.packs?.length || 0}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${product.id}`}>View</Link>
        </Button>

        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${product.id}/edit`}>Edit</Link>
        </Button>

        <Button
          variant={product.is_active ? "redoutline" : "outline"}
          size="sm"
          onClick={() => onToggleActive(product)}
        >
          {product.is_active ? "Deactive" : "Active"}
        </Button>
      </div>
    </div>
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
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Products"
        subtitle="List uses GET /v1/products (active products only). Create/Update uses /v1/admin/product/*"
        actions={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/products/new">Create Product</Link>
          </Button>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(220px,0.7fr)_auto]">
            <div className="min-w-0">
              <div className="mb-1 text-xs text-slate-500">Search</div>
              <Input
                value={q}
                onChange={(e) => set("q", e.target.value)}
                placeholder="Search products…"
              />
            </div>

            <div className="min-w-0">
              <div className="mb-1 text-xs text-slate-500">Category</div>
              <PremiumSelect
                value={category_id}
                onChange={(value) => set("category_id", value)}
                options={[
                  { value: "", label: "All" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                placeholder="All categories"
                isClearable={false}
              />
            </div>

            <div className="flex items-end">
              <label className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={include_out_of_stock}
                  onChange={(e) => set("include_out_of_stock", e.target.checked ? "true" : "")}
                />
                Include out of stock
              </label>
            </div>

            <div className="flex items-end">
              <div className="grid h-10 w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/70 xl:w-[112px]">
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
                className="w-28"
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
