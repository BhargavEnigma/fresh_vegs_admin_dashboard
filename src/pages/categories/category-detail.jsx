import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategoryById } from "../../api/services/categories.service";
import { PageHeader } from "../../components/common/page-header";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/common/status-badge";

export function CategoryDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["category", id],
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  });

  const c = data?.data?.category;

  return (
    <div>
      <PageHeader
        title="Category Detail"
        subtitle={`GET /v1/opsCategories/${id}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/categories">Back</Link>
            </Button>
            {c ? (
              <Button asChild>
                <Link to={`/categories/${c.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </>
        }
      />

      {isLoading ? <div className="text-sm text-slate-500">Loading…</div> : null}
      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-slate-950">
          {error?.response?.data?.error?.message || error?.message || "Failed to load"}
        </div>
      ) : null}

      {c ? (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ID" value={<span className="font-mono text-xs">{c.id}</span>} />
              <Field label="Name" value={c.name} />
              <Field label="Slug" value={c.slug || "—"} />
              <Field label="Sort order" value={c.sort_order ?? "—"} />
              <Field label="Active" value={<StatusBadge value={c.is_active ? "active" : "inactive"} />} />
              <Field label="Created" value={c.created_at ? new Date(c.created_at).toLocaleString() : "—"} />
            </div>
          </CardContent>
        </Card>
      ) : null}
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
