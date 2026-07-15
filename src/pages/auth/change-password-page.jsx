import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../../api/services/auth.service";
import { useAuth } from "../../auth/auth-context";
import { PasswordField } from "../../components/auth/password-field";
import { PasswordRequirements } from "../../components/auth/password-requirements";
import { PageHeader } from "../../components/common/page-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useToast } from "../../components/toast/toast-context";
import { changePasswordSchema } from "../../validations/auth";

export function getChangePasswordErrorMessage(error) {
  const code = error?.response?.data?.error?.code;
  if (["INVALID_CREDENTIALS", "INVALID_CURRENT_PASSWORD"].includes(code)) return "The current password is incorrect.";
  if (code === "PASSWORD_LOGIN_DISABLED") return "Password login is not enabled for this account.";
  if (code === "WEAK_PASSWORD") return "The new password does not meet the security requirements.";
  if (code === "PASSWORD_REUSE_NOT_ALLOWED") return "Choose a password you have not used before.";
  if (code === "TOO_MANY_LOGIN_ATTEMPTS" || error?.response?.status === 429) return "Too many attempts. Please wait before trying again.";
  if (code === "USER_BLOCKED") return "This account is currently blocked. Contact the system administrator.";
  return "Unable to change your password right now. Please try again.";
}

export function ChangePasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearSession } = useAuth();
  const pendingPayloadRef = useRef(null);
  const form = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { current_password: "", new_password: "", confirm_password: "" } });
  const newPassword = form.watch("new_password");
  const mutation = useMutation({
    mutationFn: () => changePassword(pendingPayloadRef.current),
    meta: { globalLoaderMessage: "Updating password..." },
    onSuccess: (data) => {
      form.reset();
      toast.success("Password changed", data?.reauthentication_required ? "Sign in again with your new password." : "Your password was updated successfully.");
      if (data?.reauthentication_required) {
        clearSession();
        queryClient.clear();
        navigate("/login", { replace: true, state: { passwordChanged: true } });
      }
    },
    onError: (error) => toast.error("Password not changed", getChangePasswordErrorMessage(error)),
    onSettled: () => { pendingPayloadRef.current = null; },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Account Security" subtitle="Manage the password used to access your DailyVeg account." />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card><CardHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300"><KeyRound className="h-5 w-5" /></div><CardTitle>Change Password</CardTitle></CardHeader><CardContent><form className="space-y-5" noValidate onSubmit={form.handleSubmit((values) => { pendingPayloadRef.current = values; mutation.mutate(); })}><PasswordField id="current-password" label="Current password" error={form.formState.errors.current_password} disabled={mutation.isPending} {...form.register("current_password")} /><PasswordField id="new-password" label="New password" autoComplete="new-password" error={form.formState.errors.new_password} disabled={mutation.isPending} {...form.register("new_password")} /><PasswordField id="confirm-password" label="Confirm new password" autoComplete="new-password" error={form.formState.errors.confirm_password} disabled={mutation.isPending} {...form.register("confirm_password")} /><Button className="w-full sm:w-auto" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Updating…" : "Update password"}</Button></form></CardContent></Card>
        <div className="space-y-6"><Card className="p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-dailyveg-600" /><div><h2 className="font-semibold">Security summary</h2><p className="mt-1 text-sm text-slate-500">A strong, unique password helps protect access to operational data.</p></div></div></Card><Card className="p-5"><h2 className="mb-4 font-semibold">Password requirements</h2><PasswordRequirements password={newPassword} /></Card></div>
      </div>
    </div>
  );
}
