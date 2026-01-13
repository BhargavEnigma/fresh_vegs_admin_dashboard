import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProductSchema } from "../../validations/products";
import { getProductById, updateProduct } from "../../api/services/products.service";
import { listCategoriesOps } from "../../api/services/categories.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useToast } from "../../components/toast/toast-context";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { ProductImagePicker } from "../../components/products/product-image-picker";
import { useState } from "react";

function paiseToRupees(paise) {
  return Number(paise || 0) / 100;
}


function rupeesToPaise(rupees) {
  const n = Number(rupees || 0);
  return Math.round(n * 100);
}

export function ProductEditPage() {
  const { productId } = useParams();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  
  const [images, setImages] = useState([]);
  
  const prodQ = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId),
    enabled: !!productId,
  });

  const catsQ = useQuery({
    queryKey: ["categories", "ops"],
    queryFn: () => listCategoriesOps({ include_inactive: true }),
  });

  const p = prodQ.data?.data?.product;
  const categories = catsQ.data?.data?.categories || [];

  const form = useForm({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      category_id: "",
      name: "",
      description: "",
      unit: "kg",
      base_quantity: 1,
      mrp_paise: 0,
      selling_price_paise: 0,
      is_out_of_stock: false,
      is_active: true,
    },
    values: p
      ? {
        category_id: p.category_id,
        name: p.name,
        description: p.description || "",
        unit: p.unit || "kg",
        base_quantity: Number(p.base_quantity || 1),
        mrp_paise: paiseToRupees(p.mrp_paise),
        selling_price_paise: paiseToRupees(p.selling_price_paise),
        is_out_of_stock: !!p.is_out_of_stock,
        is_active: !!p.is_active,
      }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (payload) => updateProduct(productId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.push({ variant: "success", title: "Saved", description: "Product updated." });
      navigate(`/products/${productId}`);
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed";
      toast.push({ variant: "error", title: "Update failed", description: msg });
    },
  });

  return (
    <div>
      <PageHeader
        title="Edit Product"
        subtitle={`PUT /v1/admin/product/${productId}`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/products/${productId}`}>Back</Link>
          </Button>
        }
      />

      {prodQ.isLoading ? <div className="text-sm text-slate-500">Loading…</div> : null}
      {prodQ.isError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-slate-950">
          {prodQ.error?.response?.data?.error?.message || prodQ.error?.message || "Failed to load"}
          <div className="mt-2 text-xs text-slate-500">
            Note: inactive products cannot be fetched by GET /v1/products/:id (backend limitation).
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:max-w-2xl md:grid-cols-2"
            onSubmit={form.handleSubmit((v) =>
              mutation.mutate({
                category_id: v.category_id,
                name: v.name,
                description: v.description || null,
                unit: v.unit,
                base_quantity: Number(v.base_quantity),
                mrp_paise: rupeesToPaise(v.mrp_paise),
                selling_price_paise: rupeesToPaise(v.selling_price_paise),
                is_out_of_stock: !!v.is_out_of_stock,
                is_active: v.is_active ?? true,
              })
            )}
          >
            <div className="space-y-2 md:col-span-2">
              <Label>Category</Label>
              <select
                {...form.register("category_id")}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.category_id ? (
                <p className="text-xs text-red-600">{form.formState.errors.category_id.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name ? <p className="text-xs text-red-600">{form.formState.errors.name.message}</p> : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Input {...form.register("description")} />
              {form.formState.errors.description ? (
                <p className="text-xs text-red-600">{form.formState.errors.description.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Input {...form.register("unit")} />
              {form.formState.errors.unit ? <p className="text-xs text-red-600">{form.formState.errors.unit.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Base quantity</Label>
              <Input type="number" step="0.001" {...form.register("base_quantity", { valueAsNumber: true })} />
              {form.formState.errors.base_quantity ? (
                <p className="text-xs text-red-600">{form.formState.errors.base_quantity.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>MRP (₹)</Label>
              <Input type="number" step="0.01" {...form.register("mrp_paise", { valueAsNumber: true })} />
              {form.formState.errors.mrp_paise ? (
                <p className="text-xs text-red-600">{form.formState.errors.mrp_paise.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Selling price (₹)</Label>
              <Input type="number" step="0.01" {...form.register("selling_price_paise", { valueAsNumber: true })} />
              {form.formState.errors.selling_price_paise ? (
                <p className="text-xs text-red-600">{form.formState.errors.selling_price_paise.message}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("is_out_of_stock")} />
                Out of stock
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("is_active")} />
                Active
              </label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Product Images</Label>
              <ProductImagePicker value={images} onChange={setImages} maxFiles={10} />
              {!images?.length ? <p className="text-xs text-slate-500">At least 1 image is required.</p> : []}
            </div>

            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                  form.reset();
                  setImages([]);
                }}
              >
                Reset
              </Button>
            </div>

            <div className="md:col-span-2 text-xs text-slate-500">
              Backend requires full payload on update (category_id, name, unit, base_quantity, mrp_paise, selling_price_paise).
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
