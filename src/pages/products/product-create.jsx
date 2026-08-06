import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductSchema, PROCUREMENT_UNITS } from "../../validations/products";
import { createProductWithImages } from "../../api/services/products.service";
import { listCategoriesOps } from "../../api/services/categories.service";
import { generateProductDescription } from "../../api/services/ai.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../../components/toast/toast-context";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { ProductImagePicker } from "../../components/products/product-image-picker";
import { useState } from "react";
import { PremiumSelect } from "../../components/ui/premium-select";
import { Textarea } from "../../components/ui/textarea";
import { RiGeminiFill } from "react-icons/ri";

function rupeesToPaise(rupees) {
  const n = Number(rupees || 0);
  return Math.round(n * 100);
}

export function ProductCreatePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);

  const catsQ = useQuery({
    queryKey: ["categories", "ops"],
    queryFn: () => listCategoriesOps({ include_inactive: false }),
  });

  const categories = catsQ.data?.data?.categories || [];

  const form = useForm({
    resolver: zodResolver(createProductSchema),
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
      tag: "",
      procurement_mode: "bulk",
      procurement_unit: "kg",
    },
  });

  const generateDescriptionMutation = useMutation({
    mutationFn: (payload) => generateProductDescription(payload),
    meta: {
      globalLoaderMessage: "Generating product description...",
    },
    onSuccess: (resp) => {
      const description = resp?.data?.data?.description;

      if (description) {
        form.setValue("description", description, {
          shouldDirty: true,
          shouldValidate: true,
        });

        toast.push({
          variant: "success",
          title: "Generated",
          description: "Product description generated successfully.",
        });
      }
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.error?.message ||
        e?.message ||
        "Failed to generate description";

      toast.push({
        variant: "error",
        title: "AI generation failed",
        description: msg,
      });
    },
  });

  const mutation = useMutation({
    mutationFn: ({ payload, images }) => createProductWithImages(payload, images),
    meta: {
      globalLoaderMessage: "Creating product...",
    },
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      const id = resp?.data?.product?.id;
      toast.push({ variant: "success", title: "Created", description: "Product created." });
      navigate(id ? `/products/${id}` : "/products");
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed";
      toast.push({ variant: "error", title: "Create failed", description: msg });
    },
  });

  return (
    <div>
      <PageHeader
        title="Create Product"
        subtitle="POST /v1/admin/product/with-images (multipart)"
        actions={
          <Button asChild variant="outline">
            <Link to="/products">Back</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:max-w-full md:grid-cols-2"
            onSubmit={form.handleSubmit((v) => {
              if (!images?.length) {
                toast.push({
                  variant: "error",
                  title: "Images required",
                  description: "Please select at least 1 product image.",
                });
                return;
              }

              mutation.mutate({
                payload: {
                  category_id: v.category_id,
                  name: v.name,
                  description: v.description || null,
                  tag: v.tag,
                  unit: v.unit,
                  base_quantity: Number(v.base_quantity),
                  mrp_paise: rupeesToPaise(v.mrp_paise),
                  selling_price_paise: rupeesToPaise(v.selling_price_paise),
                  is_out_of_stock: !!v.is_out_of_stock,
                  is_active: v.is_active ?? true,
                  procurement_mode: "bulk",
                  procurement_unit: v.procurement_unit,
                },
                images,
              });
            })}
          >
            <div className="space-y-2 md:col-span-2">
              <Label>Category</Label>
              <Controller
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <PremiumSelect
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select category…"
                      options={[
                        { value: "", label: "Select category…" },
                        ...categories.map((c) => ({
                          value: c.id,
                          label: c.name,
                        })),
                      ]}
                    />

                    {form.formState.errors.category_id ? (
                      <p className="text-xs text-red-600">
                        {form.formState.errors.category_id.message}
                      </p>
                    ) : null}
                  </div>
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="Tomato" />
              {form.formState.errors.name ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Tag (optional)</Label>
              <Input {...form.register("tag")} placeholder="e.g. organic, fresh, premium" />
              {form.formState.errors.tag ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.tag.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea
                {...form.register("description")}
                placeholder="Fresh farm tomatoes"
              />

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  disabled={generateDescriptionMutation.isPending}
                  onClick={() => {
                    const name = form.getValues("name")?.trim();

                    if (!name) {
                      toast.push({
                        variant: "error",
                        title: "Product name required",
                        description: "Please enter product name first.",
                      });
                      return;
                    }

                    generateDescriptionMutation.mutate({ name });
                  }}
                  className="flex items-center text-xs font-semibold text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  <span><RiGeminiFill className="text-lg me-1"/></span> {generateDescriptionMutation.isPending ? "Generating…" : "Generate with AI"}
                </button>
              </div>

              {form.formState.errors.description ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Controller
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <PremiumSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select unit"
                    options={[
                      { value: "kg", label: "kg" },
                      { value: "g", label: "g" },
                      { value: "pc", label: "pc" },
                    ]}
                  />
                )}
              />
              {form.formState.errors.unit ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.unit.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Base quantity</Label>
              <Input type="number" step="0.001" {...form.register("base_quantity", { valueAsNumber: true })} />
              {form.formState.errors.base_quantity ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.base_quantity.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Procurement unit</Label>
              <Controller
                control={form.control}
                name="procurement_unit"
                render={({ field }) => (
                  <PremiumSelect
                    value={field.value || ""}
                    onChange={(value) => field.onChange(value)}
                    placeholder="Select procurement unit"
                    options={PROCUREMENT_UNITS.map((unit) => ({
                      value: unit,
                      label: unit === "piece" ? "PC" : unit.toUpperCase(),
                    }))}
                  />
                )}
              />
              {form.formState.errors.procurement_unit ? (
                <p className="text-xs text-red-600">{form.formState.errors.procurement_unit.message}</p>
              ) : null}
            </div>

            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300 md:col-span-2">
              Products are procured in bulk by weight/loose units. Packing into retail packets is done inside the warehouse.
            </p>

            <div className="space-y-2">
              <Label>MRP (₹)</Label>
              <Input type="number" step="0.01" {...form.register("mrp_paise", { valueAsNumber: true })} />
              {form.formState.errors.mrp_paise ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.mrp_paise.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Selling price (₹)</Label>
              <Input type="number" step="0.01" {...form.register("selling_price_paise", { valueAsNumber: true })} />
              {form.formState.errors.selling_price_paise ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.selling_price_paise.message}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("is_out_of_stock")} />
                Out of stock
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked {...form.register("is_active")} />
                Active
              </label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Product Images</Label>
              <ProductImagePicker value={images} onChange={setImages} maxFiles={10} />
              {!images?.length ? (
                <p className="text-xs text-slate-500">
                  At least 1 image is required.
                </p>
              ) : null}
            </div>

            <div className="flex gap-2 md:col-span-2 justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setImages([]);
                }}
              >
                Reset
              </Button>
            </div>

            <div className="md:col-span-2 text-xs text-slate-500 text-right">
              Note: Backend Product model requires{" "}
              <span className="font-mono">category_id</span> and{" "}
              <span className="font-mono">unit</span>.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
