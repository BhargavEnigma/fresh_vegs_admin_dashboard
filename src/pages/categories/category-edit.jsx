import { useForm } from "react-hook-form";
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

export function CategoryEditPage() {
  const { id } = useParams();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["category", id],
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  });

  const c = data?.data?.category;

  const form = useForm({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: { name: "", slug: "", sort_order: 0, is_active: true },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", "ops"] });
      qc.invalidateQueries({ queryKey: ["category", id] });
      toast.push({ variant: "success", title: "Saved", description: "Category updated." });
      navigate(`/categories/${id}`);
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed";
      toast.push({ variant: "error", title: "Update failed", description: msg });
    },
  });

  return (
    <div>
      <PageHeader
        title="Edit Category"
        subtitle={`PATCH /v1/ops/categories/${id}`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/categories/${id}`}>Back</Link>
          </Button>
        }
      />

      {isLoading ? <div className="text-sm text-slate-500">Loading…</div> : null}

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:max-w-xl"
            onSubmit={form.handleSubmit((v) =>
              mutation.mutate({
                name: v.name || null,
                slug: v.slug || null,
                sort_order: v.sort_order ?? null,
                is_active: v.is_active ?? null,
              })
            )}
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name ? <p className="text-xs text-red-600">{form.formState.errors.name.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input {...form.register("slug")} />
              {form.formState.errors.slug ? <p className="text-xs text-red-600">{form.formState.errors.slug.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input type="number" {...form.register("sort_order", { valueAsNumber: true })} />
              {form.formState.errors.sort_order ? (
                <p className="text-xs text-red-600">{form.formState.errors.sort_order.message}</p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
