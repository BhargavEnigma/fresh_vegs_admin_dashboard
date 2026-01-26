import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCategorySchema } from "../../validations/categories";
import { createCategory } from "../../api/services/categories.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../../components/toast/toast-context";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";

export function CategoryCreatePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", slug: "", sort_order: 0, is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (payload) => createCategory(payload),
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ["categories", "ops"] });
      const id = resp?.data?.category?.id;
      toast.push({ variant: "success", title: "Created", description: "Category created." });
      navigate(id ? `/categories/${id}` : "/categories");
    },
    onError: (e) => {
      const msg = e?.response?.data?.error?.message || e?.message || "Failed";
      toast.push({ variant: "error", title: "Create failed", description: msg });
    },
  });

  return (
    <div>
      <PageHeader
        title="Create Category"
        subtitle="POST /v1/ops/categories"
        actions={
          <Button asChild variant="outline">
            <Link to="/categories">Back</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:max-w-xl"
            onSubmit={form.handleSubmit((v) =>
              mutation.mutate({
                name: v.name,
                slug: v.slug || null,
                sort_order: v.sort_order ?? null,
                is_active: v.is_active ?? true,
              })
            )}
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="Vegetables" />
              {form.formState.errors.name ? <p className="text-xs text-red-600">{form.formState.errors.name.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Slug (optional)</Label>
              <Input {...form.register("slug")} placeholder="vegetables" />
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
                {mutation.isPending ? "Creating…" : "Create"}
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
