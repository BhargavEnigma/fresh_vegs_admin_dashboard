import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock3,
  Fingerprint,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Warehouse,
} from "lucide-react";

import { getMe } from "../../api/services/auth.service";
import { useAuth } from "../../auth/auth-context";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { formatIndianDateTime } from "../../utils/date-formatter";

const ROLE_LABELS = {
  admin: "Administrator",
  warehouse_manager: "Warehouse Manager",
  support_manager: "Support Manager",
  delivery_partner: "Delivery Partner",
  vendor: "Vendor",
  customer: "Customer",
};

function initials(name) {
  return String(name || "User").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

function DetailItem({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition-colors hover:border-dailyveg-200 hover:bg-dailyveg-50/40 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-dailyveg-900 dark:hover:bg-dailyveg-950/20">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-dailyveg-600 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-950 dark:text-dailyveg-300 dark:ring-slate-800"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className={cn("mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100", mono && "font-mono text-xs select-all")}>{value || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function WarehouseCard({ assignment }) {
  const warehouse = assignment.warehouse;
  const address = [warehouse?.address_line1, warehouse?.address_line2, warehouse?.city, warehouse?.state, warehouse?.pincode].filter(Boolean).join(", ");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-dailyveg-200/80 bg-gradient-to-br from-white via-white to-dailyveg-50 p-5 shadow-sm dark:border-dailyveg-900/80 dark:from-slate-950 dark:via-slate-950 dark:to-dailyveg-950/40">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-dailyveg-200/30 blur-2xl dark:bg-dailyveg-800/20" />
      <div className="relative flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dailyveg-500 text-white shadow-brand"><Warehouse className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{warehouse?.name || "Warehouse details unavailable"}</h3>
            {warehouse ? <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", warehouse.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300")}>{warehouse.is_active ? "Active" : "Inactive"}</span> : null}
          </div>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300"><MapPin className="mt-1 h-4 w-4 shrink-0 text-dailyveg-500" />{address || "Address not available"}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assignment ID</p><p className="mt-1 truncate font-mono text-xs text-slate-700 dark:text-slate-200" title={assignment.id}>{assignment.id || "—"}</p></div>
            <div className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Delivery Capacity</p><p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">{assignment.delivery_capacity_orders ?? "Not limited"}{assignment.delivery_capacity_orders != null ? " orders" : ""}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user: sessionUser } = useAuth();
  const profileQuery = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: getMe,
    staleTime: 60_000,
  });
  const profile = profileQuery.data?.data?.user || profileQuery.data?.user || sessionUser || {};
  const roles = Array.isArray(profile.roles) ? profile.roles.map((role) => typeof role === "string" ? role : role?.role).filter(Boolean) : [];
  const isWarehouseManager = roles.includes("warehouse_manager");
  const assignments = Array.isArray(profile.warehouse_assignments) ? profile.warehouse_assignments : [];

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <PageHeader title="My Profile" subtitle="Your DailyVeg identity, access and operational assignment details." actions={<Button variant="outline" onClick={() => profileQuery.refetch()} disabled={profileQuery.isFetching} className="rounded-xl"><RefreshCw className={cn("mr-2 h-4 w-4", profileQuery.isFetching && "animate-spin")} />Refresh</Button>} />

      {profileQuery.isError ? <div role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Live profile details could not be refreshed. Showing the latest account details saved in this session.</div> : null}

      <Card className="relative mb-6 overflow-hidden border-0 bg-gradient-to-br from-dailyveg-700 via-dailyveg-600 to-emerald-500 p-6 text-white shadow-xl shadow-dailyveg-900/15 sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[36px] border-white/10" />
        <div className="absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/30 bg-white/15 text-2xl font-black shadow-lg backdrop-blur-sm sm:h-24 sm:w-24 sm:text-3xl">{initials(profile.full_name)}</div>
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">DailyVeg account</p><h2 className="mt-1 truncate text-2xl font-black sm:text-3xl">{profile.full_name || "Unnamed User"}</h2><div className="mt-3 flex flex-wrap gap-2">{roles.map((role) => <span key={role} className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm">{ROLE_LABELS[role] || role.replaceAll("_", " ")}</span>)}</div></div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-2xl border border-white/20 bg-black/10 px-4 py-3 backdrop-blur-sm sm:self-auto"><BadgeCheck className="h-5 w-5" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/65">Account status</p><p className="text-sm font-extrabold capitalize">{profile.status || "Unknown"}</p></div></div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300"><UserRound className="h-5 w-5" /></span><div><h2 className="text-lg font-extrabold">Personal information</h2><p className="text-sm text-slate-500">Your core account and contact details.</p></div></div><div className="grid gap-3 sm:grid-cols-2"><DetailItem icon={UserRound} label="Full name" value={profile.full_name} /><DetailItem icon={Phone} label="Phone number" value={profile.phone} /><DetailItem icon={Mail} label="Email address" value={profile.email || "Not provided"} /><DetailItem icon={Fingerprint} label="User ID" value={profile.id} mono /></div></Card>

          {isWarehouseManager ? <Card className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Building2 className="h-5 w-5" /></span><div><h2 className="text-lg font-extrabold">Assigned warehouse{assignments.length === 1 ? "" : "s"}</h2><p className="text-sm text-slate-500">Operational locations assigned to this warehouse manager.</p></div></div>{assignments.length ? <div className="grid gap-4">{assignments.map((assignment) => <WarehouseCard key={assignment.id || assignment.warehouse_id} assignment={assignment} />)}</div> : <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-center dark:border-amber-900 dark:bg-amber-950/20"><Warehouse className="mx-auto h-7 w-7 text-amber-500" /><p className="mt-2 font-bold text-amber-800 dark:text-amber-300">No warehouse assigned</p><p className="mt-1 text-sm text-amber-700/80 dark:text-amber-400">Ask an administrator to assign an operational warehouse.</p></div>}</Card> : null}
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="text-lg font-extrabold">Account & security</h2><p className="text-sm text-slate-500">Login and account activity.</p></div></div><div className="space-y-3"><DetailItem icon={CalendarDays} label="Account created" value={formatIndianDateTime(profile.created_at)} /><DetailItem icon={Clock3} label="Last profile update" value={formatIndianDateTime(profile.updated_at)} /><DetailItem icon={Clock3} label="Last login" value={profile.last_login_at ? formatIndianDateTime(profile.last_login_at) : "No login recorded"} /><DetailItem icon={KeyRound} label="Password login" value={profile.password_login_enabled ? "Enabled" : "Not enabled"} />{profile.password_changed_at ? <DetailItem icon={KeyRound} label="Password last changed" value={formatIndianDateTime(profile.password_changed_at)} /> : null}</div><Button onClick={() => navigate("/account/security")} className="mt-5 w-full rounded-xl"><KeyRound className="mr-2 h-4 w-4" />Manage password</Button></Card>
        </div>
      </div>
    </div>
  );
}
