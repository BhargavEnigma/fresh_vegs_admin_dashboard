import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminProductById, setProductActive } from "../../api/services/products.service";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/common/status-badge";
import { ConfirmDialog } from "../../components/common/confirm-dialog";
import { useToast } from "../../components/toast/toast-context";
import { assetUrl, formatQuantity } from "../../lib/utils";
import { ProductPacksManager } from "../../components/products/product-packs-manager";
import { ImageSizeInfo } from "../../components/common/image-size-info";
import { ProductFreshnessPolicyCard } from "../../components/products/product-freshness-policy-card";
import {
  ArrowLeft,
  Pencil,
  Power,
  Copy,
  Package,
  Tag,
  Layers,
  Sparkles,
  Scale,
  IndianRupee,
  Images,
  ExternalLink,
} from "lucide-react";

export function ProductDetailPage() {
  const { productId } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = React.useState({ open: false, nextActive: true });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getAdminProductById(productId),
    enabled: !!productId,
  });

  const p = data?.data?.product;

  const mutation = useMutation({
    mutationFn: ({ id, is_active }) => setProductActive(id, is_active),
    meta: {
      globalLoaderMessage: "Updating product status...",
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.push({ variant: "success", title: "Updated", description: "Product active flag updated." });
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed";
      toast.push({ variant: "error", title: "Update failed", description: msg });
    },
  });

  const copyToClipboard = (text, label = "Value") => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    toast.push({
      variant: "success",
      title: `${label} copied`,
      description: `${label} has been copied to your clipboard.`,
    });
  };

  const mrp = Number(p?.mrp_paise || 0);
  const selling = Number(p?.selling_price_paise || 0);
  const discount = mrp - selling;
  const discountPercent = discount > 0 && mrp > 0 ? Math.round((discount / mrp) * 100) : 0;

  return (
    <div className="min-w-0 space-y-4 pb-10">
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate">{p?.name || "Product Details"}</span>
            {p && (
              <span className="inline-flex items-center rounded-lg bg-dailyveg-100 px-2.5 py-0.5 text-xs font-bold text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                {p.category?.name || "Uncategorized"}
              </span>
            )}
          </div>
        }
        subtitle={p ? `ID: ${p.id} · Base Unit: ${formatQuantity(p.base_quantity)} ${p.unit || ""}` : `Product #${productId}`}
        actions={
          <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">
            <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm">
              <Link to="/products">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Link>
            </Button>
            {p ? (
              <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm">
                <Link to={`/products/${p.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  <span>Edit</span>
                </Link>
              </Button>
            ) : null}
            {p ? (
              <Button
                variant={p.is_active ? "destructive" : "default"}
                className="w-full sm:w-auto gap-1.5 h-9 rounded-xl text-xs sm:text-sm shadow-sm"
                onClick={() => setConfirm({ open: true, nextActive: !p.is_active })}
              >
                <Power className="h-4 w-4" />
                <span>{p.is_active ? "Deactivate" : "Activate"}</span>
              </Button>
            ) : null}
          </div>
        }
      />

      {isLoading ? <div className="text-sm text-slate-500">Loading product details…</div> : null}
      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-slate-950">
          {error?.response?.data?.error?.message || error?.message || "Failed to load"}
          <div className="mt-2 text-xs text-slate-500">
            Note: backend only returns <span className="font-mono">is_active=true</span> products in GET /v1/products/:id, so inactive products are not viewable.
          </div>
        </div>
      ) : null}

      {p ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* Executive Hero Card */}
            <Card className="relative overflow-hidden rounded-2xl border-dailyveg-200/80 bg-gradient-to-br from-dailyveg-50/60 via-white to-slate-50 p-4 sm:p-5 shadow-sm dark:border-dailyveg-900/60 dark:from-dailyveg-950/30 dark:via-slate-950 dark:to-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <StatusBadge value={p.is_out_of_stock ? "out_of_stock" : "in_stock"} />
                  <StatusBadge value={p.is_active ? "active" : "inactive"} />
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(p.id, "Product ID")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-mono font-semibold text-slate-600 transition hover:text-dailyveg-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                >
                  <span className="truncate max-w-[120px] sm:max-w-none">ID: {p.id}</span>
                  <Copy className="h-3 w-3 opacity-70" />
                </button>
              </div>

              {/* Price & Savings Display */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Selling Price</div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-black text-dailyveg-700 dark:text-dailyveg-400">
                      ₹{(selling / 100).toFixed(2)}
                    </span>
                    {mrp > selling && (
                      <span className="text-sm text-slate-400 line-through">
                        MRP: ₹{(mrp / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {discount > 0 && (
                  <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Save ₹{(discount / 100).toFixed(2)} ({discountPercent}% OFF)</span>
                  </div>
                )}
              </div>

              {/* 4-Tile Quick Specs on Mobile */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Layers className="h-3 w-3 text-indigo-500" /> Category
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                    {p.category?.name || "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Scale className="h-3 w-3 text-emerald-500" /> Base Qty
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {formatQuantity(p.base_quantity)} {p.unit || ""}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Package className="h-3 w-3 text-amber-500" /> Procurement
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white capitalize truncate">
                    {p.procurement_mode === "bulk" ? "Bulk" : "Pack"}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Tag className="h-3 w-3 text-cyan-600" /> Tag
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                    {p.tag || "None"}
                  </div>
                </div>
              </div>
            </Card>

            {/* Images Gallery Card */}
            {(p.images || []).length ? (
              <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <Images className="h-4 w-4 text-dailyveg-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Product Gallery ({p.images.length})
                  </h3>
                </div>
                <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {p.images.map((img, idx) => (
                    <a
                      key={img.id || img.image_url || idx}
                      href={assetUrl(img.image_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xs transition hover:border-dailyveg-300 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="aspect-square">
                        <img
                          src={assetUrl(img.image_url)}
                          alt={p.name}
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <ImageSizeInfo src={assetUrl(img.image_url)} />
                    </a>
                  ))}
                </div>
              </Card>
            ) : null}

            {/* Catalog Info & Keywords */}
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 border-b border-slate-100 pb-3 dark:border-slate-800">
                Catalog & Search Specifications
              </div>
              <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                <Field label="Product Name" value={p.name} />
                <Field label="Category" value={p.category?.name || "—"} />
                <Field label="Base Unit" value={`${formatQuantity(p.base_quantity)} ${p.unit || ""}`} />
                <Field
                  label="Procurement Unit"
                  value={p.procurement_mode === "bulk" ? String(p.procurement_unit || "Not configured").toUpperCase() : "Pack-specific"}
                />
                <div className="sm:col-span-2">
                  <Field label="Search Keywords" value={p.search_keywords || "—"} />
                </div>
              </div>

              {p.description ? (
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs sm:text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</div>
                  <div className="mt-1 leading-relaxed">{p.description}</div>
                </div>
              ) : null}
            </Card>

            {/* Freshness Policy Card */}
            <ProductFreshnessPolicyCard productId={p.id} product={p} />
          </div>

          {/* Right Column: Packs Manager */}
          <div className="space-y-4">
            {p ? <ProductPacksManager productId={p.id} /> : null}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
        title={confirm.nextActive ? "Activate product?" : "Deactivate product?"}
        description="Customers will immediately be able or unable to view and buy this product."
        confirmText={confirm.nextActive ? "Activate" : "Deactivate"}
        variant={confirm.nextActive ? "default" : "destructive"}
        onConfirm={() => mutation.mutateAsync({ id: productId, is_active: confirm.nextActive })}
      />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800/80 dark:bg-slate-900/40">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

