import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldAlert } from "lucide-react";
import { AdminUsersService } from "../../../api/services/admin-users.service";
import { PasswordField } from "../../../components/auth/password-field";
import { PasswordRequirements } from "../../../components/auth/password-requirements";
import { ConfirmDialog } from "../../../components/common/confirm-dialog";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { useToast } from "../../../components/toast/toast-context";
import { managedPasswordSchema } from "../../../validations/auth";
import { formatIndianDateTime } from "../../../utils/date-formatter";
import { PasswordLoginStatusBadge } from "./password-login-status-badge";

function normalizeContactValue(value) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim();
}

function maskPhone(value) {
  const phone = normalizeContactValue(value);
  return phone ? `${phone.slice(0, 2)}••••••${phone.slice(-4)}` : "—";
}

function maskEmail(value) {
  const email = normalizeContactValue(value);
  if (!email) return "—";
  const separatorIndex = email.indexOf("@");
  if (separatorIndex <= 0 || separatorIndex === email.length - 1) return "—";
  const name = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);
  return `${name.slice(0, 2)}•••@${domain}`;
}
function errorMessage(error) {
  if (error?.response?.status === 403) return "You do not have permission to manage this user’s password.";
  const code = error?.response?.data?.error?.code;
  if (code === "WEAK_PASSWORD") return "The password does not meet the security requirements.";
  if (code === "PASSWORD_REUSE_NOT_ALLOWED") return "Choose a password the user has not used before.";
  if (code === "USER_BLOCKED") return "This account is currently blocked.";
  if (error?.response?.status === 429) return "Too many attempts. Please wait before trying again.";
  return "Unable to update password login right now. Please try again.";
}

export function UserPasswordLoginDialog({ user, open, onOpenChange }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = React.useState(null);
  const [requestError, setRequestError] = React.useState("");
  const pendingPayloadRef = React.useRef(null);
  const form = useForm({ resolver: zodResolver(managedPasswordSchema), defaultValues: { password: "", confirm_password: "" } });
  const detailQuery = useQuery({
    queryKey: ["adminUsers", "detail", user?.id],
    queryFn: () => AdminUsersService.getById(user.id),
    enabled: open && Boolean(user?.id),
    retry: (count, error) => error?.response?.status !== 403 && count < 1,
  });
  const detail = detailQuery.data?.user || detailQuery.data || user;
  const enabled = detail?.password_login_enabled === true;
  const isCustomer = (detail?.roles || []).some((role) => (typeof role === "string" ? role : role?.name) === "customer");
  const password = form.watch("password");

  const mutation = useMutation({
    mutationFn: () => AdminUsersService.updatePasswordLogin(user.id, pendingPayloadRef.current),
    retry: (count, error) => error?.response?.status !== 403 && count < 1,
    meta: { globalLoaderMessage: "Updating password login..." },
    onSuccess: async () => {
      const payload = pendingPayloadRef.current;
      form.reset(); setRequestError(""); setConfirmation(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] }),
        queryClient.invalidateQueries({ queryKey: ["adminUsers", "detail", user.id] }),
      ]);
      toast.success(payload.enabled ? (enabled ? "Password reset" : "Password login enabled") : "Password login disabled", payload.enabled ? "Share the password through a secure channel and ask the user to change it after signing in." : "OTP authentication remains available.");
      onOpenChange(false);
    },
    onError: (error) => { setConfirmation(null); setRequestError(errorMessage(error)); },
    onSettled: () => { pendingPayloadRef.current = null; },
  });

  React.useEffect(() => {
    if (!open) { form.reset(); pendingPayloadRef.current = null; setRequestError(""); setConfirmation(null); }
  }, [open, form]);

  function requestEnable(values) {
    const payload = { enabled: true, password: values.password, confirm_password: values.confirm_password };
    if (enabled || isCustomer) setConfirmation({ type: enabled ? "reset" : "customer", payload });
    else { pendingPayloadRef.current = payload; mutation.mutate(); }
  }
  function handleOpenChange(next) { if (!mutation.isPending) onOpenChange(next); }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto" onEscapeKeyDown={(event) => { if (mutation.isPending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (mutation.isPending) event.preventDefault(); }}>
          <DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300"><KeyRound className="h-5 w-5" /></div><DialogTitle>Login &amp; Security</DialogTitle><DialogDescription>Enable, reset, or disable password login without changing OTP access or roles.</DialogDescription></DialogHeader>
          {detailQuery.isLoading ? <p className="py-6 text-center text-sm text-slate-500">Loading security details…</p> : null}
          {detailQuery.isError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">Unable to load current security details. No password status has been assumed.</div> : null}
          {!detailQuery.isLoading && !detailQuery.isError ? <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-2"><div><span className="text-slate-500">User</span><p className="font-medium">{detail?.full_name || "Unnamed user"}</p></div><div><span className="text-slate-500">Contact</span><p>{maskPhone(detail?.phone)} · {maskEmail(detail?.email)}</p></div><div><span className="text-slate-500">Roles</span><p>{(detail?.roles || []).map((role) => typeof role === "string" ? role : role?.name).filter(Boolean).join(", ") || "—"}</p></div><div><span className="text-slate-500">Account status</span><p className="capitalize">{detail?.status || "—"}</p></div><div><span className="text-slate-500">Password login</span><div className="mt-1"><PasswordLoginStatusBadge user={detail} /></div></div><div><span className="text-slate-500">Last password change</span><p>{detail?.password_changed_at ? formatIndianDateTime(detail.password_changed_at) : "Not available"}</p></div></div> : null}
          {isCustomer ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><p>This customer normally uses MSG91 OTP. Enabling password login adds another login method and does not disable OTP authentication.</p><p className="mt-2">The customer can use this password only in a client application that supports password login.</p></div></div></div> : null}
          {requestError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{requestError}</div> : null}
          {!detailQuery.isLoading && !detailQuery.isError ? <form className="space-y-4" noValidate onSubmit={form.handleSubmit(requestEnable)}><h3 className="font-semibold">{enabled ? "Reset Password" : "Enable Password Login"}</h3><div className="grid gap-4 sm:grid-cols-2"><PasswordField id="managed-password" label="New password" autoComplete="new-password" error={form.formState.errors.password} disabled={mutation.isPending} {...form.register("password")} /><PasswordField id="managed-confirm-password" label="Confirm new password" autoComplete="new-password" error={form.formState.errors.confirm_password} disabled={mutation.isPending} {...form.register("confirm_password")} /></div><PasswordRequirements password={password} /><DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>{enabled ? <Button type="button" variant="destructive" onClick={() => setConfirmation({ type: "disable", payload: { enabled: false } })} disabled={mutation.isPending}>Disable Password Login</Button> : null}<Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Updating…" : enabled ? "Reset Password" : "Enable Password Login"}</Button></DialogFooter></form> : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={Boolean(confirmation)} onOpenChange={(next) => { if (!next && !mutation.isPending) setConfirmation(null); }} title={confirmation?.type === "reset" ? "Reset user password?" : confirmation?.type === "disable" ? "Disable Password Login?" : "Enable password login for this customer?"} description={confirmation?.type === "reset" ? "This will replace the user’s current password and may revoke active sessions." : confirmation?.type === "disable" ? "This user will no longer be able to sign in using a password. Existing sessions may also be revoked." : "This adds password login as another method. The customer’s normal MSG91 OTP authentication will remain available."} confirmText={confirmation?.type === "reset" ? "Reset Password" : confirmation?.type === "disable" ? "Disable Password Login" : "Enable Password Login"} variant={confirmation?.type === "disable" ? "destructive" : "default"} onConfirm={() => { pendingPayloadRef.current = confirmation.payload; return mutation.mutateAsync(); }} />
    </>
  );
}
