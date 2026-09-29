import { useMemo, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateCategorySchema } from "../../validations/categories";
import { getCategoryById, updateCategory } from "../../api/services/categories.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useToast } from "../../components/toast/toast-context";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { assetUrl, cn } from "../../lib/utils";
import {
  ChevronLeft,
  Upload,
  ImagePlus,
  Trash2,
  Sparkles,
  Layers3,
  Tag,
  Hash,
  ArrowUpDown,
  CheckCircle2,
  Info,
  Wand2,
} from "lucide-react";

function generateSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CategoryEditPage() {
  const { id } = useParams();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [imageFile, setImageFile] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["category", id],
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  });

  const c = data?.data?.category;

  const previewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  const form = useForm({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: {
      name: "",
      slug: "",
      sort_order: 0,
      is_active: true,
    },
    values: c
      ? {
        name: c.name || "",
        slug: c.slug || "",
        sort_order: c.sort_order ?? 0,
        is_active: !!c.is_active,
      }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (payload) => updateCategory(id, payload),
    meta: {
      globalLoaderMessage: "Saving category changes...",
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", "ops"] });
      qc.invalidateQueries({ queryKey: ["category", id] });
      toast.push({
        variant: "success",
        title: "Category Updated",
        description: "Your category changes have been saved successfully.",
      });
      setImageFile(null);
      navigate(`/categories/${id}`);
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed to update category.";
      toast.push({
        variant: "error",
        title: "Update failed",
        description: msg,
      });
    },
  });

  const handleAutoSlug = () => {
    const currentName = form.getValues("name");
    if (!currentName || !currentName.trim()) {
      toast.push({
        variant: "error",
        title: "Name required",
        description: "Please enter a category name first to generate a slug.",
      });
      return;
    }
    const slug = generateSlug(currentName);
    form.setValue("slug", slug, { shouldValidate: true, shouldDirty: true });
    toast.push({
      variant: "success",
      title: "Slug Generated",
      description: `Updated slug to "/${slug}"`,
    });
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6 pb-12">
      {/* Back button & Page Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/categories/${id}`)}
          className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Category Details</span>
        </Button>
      </div>

      <PageHeader
        title={c ? `Edit ${c.name}` : "Edit Category"}
        subtitle={`Update details, ordering priority, and image for category /categories/${c?.slug || id}`}
        actions={
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={`/categories/${id}`}>Cancel</Link>
          </Button>
        }
      />

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
            <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          </div>
        </div>
      ) : null}

      {/* Error state */}
      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          <div className="font-bold text-base mb-1">Failed to load category</div>
          <p>{error?.response?.data?.error?.message || error?.message || "Please check your network and try again."}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 bg-white dark:bg-slate-900">
            Retry
          </Button>
        </div>
      ) : null}

      {/* Edit Form */}
      {c && (
        <form
          onSubmit={form.handleSubmit((v) => {
            mutation.mutate({
              name: v.name && String(v.name).trim() !== "" ? v.name : undefined,
              slug: v.slug !== undefined ? v.slug : undefined,
              sort_order: v.sort_order ?? undefined,
              is_active: v.is_active ?? undefined,
              image: imageFile || undefined,
            });
          })}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {/* Left 2 columns: General Information */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-2">
            <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
              <div className="border-b border-slate-100 bg-gradient-to-r from-dailyveg-50/50 to-white px-4 py-3.5 sm:px-6 sm:py-4 dark:border-slate-900 dark:from-slate-900/50 dark:to-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                    <Tag className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Category Details
                    </h3>
                    <p className="text-xs text-slate-500">Edit core identifiers and settings</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Category Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Category Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...form.register("name")}
                    placeholder="e.g. Fresh Leafy Vegetables"
                    className="h-11 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-sm focus:bg-white"
                  />
                  {form.formState.errors.name ? (
                    <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                      {form.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>

                {/* Slug with Auto-Generator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      URL Slug
                    </Label>
                    <button
                      type="button"
                      onClick={handleAutoSlug}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-dailyveg-600 hover:text-dailyveg-700 dark:text-dailyveg-400"
                    >
                      <Wand2 className="h-3 w-3" /> Auto-generate from name
                    </button>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                      /
                    </span>
                    <Input
                      {...form.register("slug")}
                      placeholder="fresh-leafy-vegetables"
                      className="pl-7 h-11 rounded-xl font-mono text-sm bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:bg-white"
                    />
                  </div>
                  {form.formState.errors.slug ? (
                    <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                      {form.formState.errors.slug.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Used for catalog URL routing.
                    </p>
                  )}
                </div>

                {/* Sort Order Priority */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-dailyveg-600" /> Catalog Sort Order (Priority Rank)
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <Input
                      type="number"
                      {...form.register("sort_order", { valueAsNumber: true })}
                      placeholder="0"
                      className="h-11 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-sm focus:bg-white"
                    />
                    <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      Lower numbers appear first in the customer mobile catalog.
                    </div>
                  </div>
                  {form.formState.errors.sort_order ? (
                    <p className="text-xs font-medium text-red-600">
                      {form.formState.errors.sort_order.message}
                    </p>
                  ) : null}
                </div>

                {/* Catalog Status Toggle */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-900 space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Catalog Visibility Status
                  </Label>
                  <Controller
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => field.onChange(true)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                            field.value
                              ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500 dark:border-emerald-500 dark:bg-emerald-950/40"
                              : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
                          )}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Active
                          </div>
                          <span className="mt-1 text-[11px] text-slate-500">
                            Visible in the customer catalog
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => field.onChange(false)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                            !field.value
                              ? "border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 dark:border-amber-500 dark:bg-amber-950/40"
                              : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
                          )}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                            <Info className="h-4 w-4 text-amber-600" /> Inactive
                          </div>
                          <span className="mt-1 text-[11px] text-slate-500">
                            Hidden from customer app
                          </span>
                        </button>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right 1 column: Visual Asset / Image Upload */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-1">
            <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
              <div className="border-b border-slate-100 bg-gradient-to-r from-dailyveg-50/50 to-white px-4 py-3.5 sm:px-6 sm:py-4 dark:border-slate-900 dark:from-slate-900/50 dark:to-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
                    <ImagePlus className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Category Photo
                    </h3>
                    <p className="text-xs text-slate-500">Update presentation image</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* If New Preview Selected */}
                {previewUrl ? (
                  <div className="space-y-3">
                    <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-dailyveg-400 bg-slate-50 dark:bg-slate-900 shadow-sm ring-2 ring-dailyveg-400/30">
                      <img
                        src={previewUrl}
                        alt="New Category Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-2 left-2 rounded-lg bg-dailyveg-600/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                        New photo (unsaved)
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setImageFile(f);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full h-9 rounded-xl text-xs pointer-events-none"
                        >
                          <Upload className="mr-1.5 h-3.5 w-3.5" /> Change Photo
                        </Button>
                      </label>

                      <Button
                        type="button"
                        variant="redoutline"
                        size="sm"
                        className="h-9 px-3 rounded-xl text-xs"
                        onClick={() => setImageFile(null)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : c?.image_url ? (
                  /* Existing Saved Image */
                  <div className="space-y-3">
                    <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-inner">
                      <img
                        src={assetUrl(c.image_url)}
                        alt="Current Category Photo"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                        Current photo
                      </div>
                    </div>

                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setImageFile(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-9 rounded-xl text-xs pointer-events-none"
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" /> Replace with New Photo
                      </Button>
                    </label>
                  </div>
                ) : (
                  /* No image uploaded yet */
                  <label className="group flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center transition-all hover:border-dailyveg-500 hover:bg-dailyveg-50/30 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-dailyveg-500">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-xs transition group-hover:scale-110 group-hover:text-dailyveg-600 dark:bg-slate-800 dark:text-slate-400">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                    <span className="mt-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Upload Category Photo
                    </span>
                    <span className="mt-1 text-[11px] text-slate-500">
                      PNG, WebP, or JPG
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setImageFile(f);
                      }}
                    />
                  </label>
                )}

                <div className="rounded-xl bg-dailyveg-50/60 p-3 text-[11px] text-slate-600 dark:bg-dailyveg-950/30 dark:text-slate-400">
                  <span className="font-bold text-dailyveg-800 dark:text-dailyveg-300">💡 Image Guidelines:</span> Square (1:1) images with high resolution look crisp across both Android and iOS customer screens.
                </div>
              </CardContent>
            </Card>

            {/* Save & Reset Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-11 rounded-xl bg-dailyveg-500 text-white font-bold shadow-md shadow-dailyveg-500/25 hover:bg-dailyveg-600 transition-all text-sm flex items-center justify-center gap-2"
              >
                {mutation.isPending ? "Saving Changes…" : "Save Changes"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setImageFile(null);
                }}
                className="w-full h-10 rounded-xl text-xs text-slate-600 dark:text-slate-400"
              >
                Reset to Original
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
