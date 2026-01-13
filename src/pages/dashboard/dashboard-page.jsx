import { useQuery } from "@tanstack/react-query";

import { AdminDashboardService } from "../../api/services/admin-dashboard.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";

export function DashboardPage() {
  const kpisQuery = useQuery({
    queryKey: ["adminDashboardKpis"],
    queryFn: () => AdminDashboardService.getKpis(),
    staleTime: 15 * 1000,
  });

  const k = kpisQuery.data || null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Operational KPIs for admin/warehouse management."
      />

      <div className="mb-4 flex items-center justify-end">
        <Button variant="outline" onClick={() => kpisQuery.refetch()} disabled={kpisQuery.isFetching}>
          {kpisQuery.isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {kpisQuery.isError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          Failed to load dashboard KPIs.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Orders (Created)</CardTitle>
            <CardDescription>Orders created in selected day range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{k ? k.orders_created : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">Range: {k ? `${k.range.start_date} → ${k.range.end_date}` : "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders (For Delivery)</CardTitle>
            <CardDescription>Orders scheduled for delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{k ? k.orders_for_delivery : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">Based on delivery_date</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Packing Queue</CardTitle>
            <CardDescription>Locked/Accepted/Packed (delivery range)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{k ? k.packing_queue : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">Helps warehouse planning</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Pending</CardTitle>
            <CardDescription>Orders created with pending payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{k ? k.payment_pending : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">UPI/COD capture in progress</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue (Paid)</CardTitle>
            <CardDescription>Sum of paid orders total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{k ? `₹${(k.revenue_paid_paise / 100).toFixed(2)}` : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">Computed from total_paise</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
            <CardDescription>Users with status=active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{k ? k.active_users : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">All time</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
