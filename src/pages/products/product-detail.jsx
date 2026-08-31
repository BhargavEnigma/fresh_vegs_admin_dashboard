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

  return (
    <div>
      <PageHeader
        title="Product Detail"
        subtitle={`GET /v1/products/${productId}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/products">Back</Link>
            </Button>
            {p ? (
              <Button asChild variant="outline">
                <Link to={`/products/${p.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            {p ? (
              <Button
                variant={p.is_active ? "destructive" : "default"}
                onClick={() => setConfirm({ open: true, nextActive: !p.is_active })}
              >
                {p.is_active ? "Deactivate" : "Activate"}
              </Button>
            ) : null}
          </>
        }
      />

      {isLoading ? <div className="text-sm text-slate-500">Loading…</div> : null}
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
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              {(p.images || []).length ? (
                <div className="mb-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Images</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {p.images.map((img) => (
                      <a
                        key={img.id || img.image_url}
                        href={assetUrl(img.image_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 group"
                      >
                        <div className="aspect-square bg-slate-50 dark:bg-slate-900">
                          <img
                            src={assetUrl(img.image_url)}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <ImageSizeInfo src={assetUrl(img.image_url)} />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="ID" value={<span className="font-mono text-xs">{p.id}</span>} />
                <Field label="Name" value={p.name} />
                <Field label="Search keywords" value={p.search_keywords || "—"} />
                <Field label="Category" value={p.category?.name || "—"} />
                <Field label="Unit" value={p.unit} />
                <Field label="Base quantity" value={formatQuantity(p.base_quantity)} />
                <Field label="Procurement mode" value={p.procurement_mode === "bulk" ? "Bulk" : "Ready-packed / Pack"} />
                <Field
                  label="Procurement unit"
                  value={p.procurement_mode === "bulk" ? String(p.procurement_unit || "Not configured").toUpperCase() : "Pack-specific"}
                />
                <Field label="MRP" value={`₹${(Number(p.mrp_paise || 0) / 100).toFixed(2)}`} />
                <Field label="Selling price" value={`₹${(Number(p.selling_price_paise || 0) / 100).toFixed(2)}`} />
                <Field label="Active" value={<StatusBadge value={p.is_active ? "active" : "inactive"} />} />
                <Field label="Out of stock" value={<StatusBadge value={p.is_out_of_stock ? "out_of_stock" : "in_stock"} />} />
                <Field label="Tag" value={p.tag || "—"} />
              </div>

              {p.description ? (
                <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  <div className="text-xs text-slate-500">Description</div>
                  <div className="mt-2">{p.description}</div>
                </div>
              ) : null}

              <div className="mt-4">
                <ProductFreshnessPolicyCard productId={p.id} product={p} />
              </div>
            </CardContent>
          </Card>

          {p ? <ProductPacksManager productId={p.id} /> : null}
          
          {/* <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-semibold">Packs</div>
              <div className="mt-2 text-xs text-slate-500">
                Backend list returns only active packs. Admin pack create/update endpoints exist, but backend has inconsistent payload keys.
              </div>

              <div className="mt-4 space-y-2">
                {(p.packs || []).length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-800">
                    No active packs
                  </div>
                ) : (
                  p.packs.map((pk) => (
                    <div key={pk.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{pk.label}</div>
                        <StatusBadge value={pk.is_active ? "active" : "inactive"} />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatQuantity(pk.base_quantity)} {pk.base_unit} • ₹{(Number(pk.selling_price_paise || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card> */}
        </div>
      ) : null}


      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
        title={confirm.nextActive ? "Activate product?" : "Deactivate product?"}
        description="PATCH /v1/admin/product/:productId/active"
        confirmText={confirm.nextActive ? "Activate" : "Deactivate"}
        variant={confirm.nextActive ? "default" : "destructive"}
        onConfirm={() => mutation.mutateAsync({ id: productId, is_active: confirm.nextActive })}
      />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
