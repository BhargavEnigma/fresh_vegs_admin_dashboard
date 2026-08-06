import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AtSign, Phone, UserRound, RefreshCw } from "lucide-react";
import { z } from "zod";

import { AdminUsersService } from "../../../api/services/admin-users.service";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { useToast } from "../../../components/toast/toast-context";
import { PremiumSelect } from "../../../components/ui/premium-select";

const editUserSchema = z.object({
  phone: z.string()
    .min(12, "Phone must be exactly 12 digits (including country code, e.g. 91XXXXXXXXXX).")
    .max(12, "Phone must be exactly 12 digits."),
  full_name: z.string()
    .min(2, "Name must be at least 2 characters.")
    .max(120, "Name must be at most 120 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.string()
    .email("Invalid email format.")
    .optional()
    .nullable()
    .or(z.literal("")),
  status: z.enum(["active", "blocked"]),
});

export function EditUserDialog({ user, open, onOpenChange, onSuccess }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = React.useState("");

  const form = useForm({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      phone: "",
      full_name: "",
      email: "",
      status: "active",
    },
  });

  React.useEffect(() => {
    if (open && user) {
      form.reset({
        phone: user.phone || "",
        full_name: user.full_name || "",
        email: user.email || "",
        status: user.status || "active",
      });
      setRequestError("");
    }
  }, [open, user, form]);

  const mutation = useMutation({
    mutationFn: (values) => {
      // Clean up values
      const payload = {
        phone: values.phone,
        full_name: values.full_name || null,
        email: values.email || null,
        status: values.status,
      };
      return AdminUsersService.update(user.id, payload);
    },
    meta: { globalLoaderMessage: "Updating user details..." },
    onSuccess: async () => {
      toast.success("User details updated successfully");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] }),
        queryClient.invalidateQueries({ queryKey: ["adminUsers", "detail", user?.id] }),
      ]);
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      setRequestError(error?.response?.data?.error?.message || error?.message || "Failed to update user details.");
    },
  });

  function handleOpenChange(next) {
    if (!mutation.isPending) {
      onOpenChange(next);
    }
  }

  const onSubmit = (values) => {
    setRequestError("");
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
        onEscapeKeyDown={(event) => { if (mutation.isPending) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (mutation.isPending) event.preventDefault(); }}
      >
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-dailyveg-100 text-dailyveg-700 dark:bg-dailyveg-950 dark:text-dailyveg-300">
            <UserRound className="h-5 w-5" />
          </div>
          <DialogTitle>Edit User Details</DialogTitle>
          <DialogDescription>Update this user's personal identity, contact details, or account status.</DialogDescription>
        </DialogHeader>

        {requestError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {requestError}
          </div>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-user-name">Full name</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="edit-user-name"
                  className="h-11 pl-10"
                  placeholder="Full name"
                  disabled={mutation.isPending}
                  {...form.register("full_name")}
                />
              </div>
              {form.formState.errors.full_name ? (
                <p className="text-xs font-medium text-red-600">{form.formState.errors.full_name.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-user-phone">Phone number *</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="edit-user-phone"
                  className="h-11 pl-10"
                  placeholder="91XXXXXXXXXX"
                  disabled={mutation.isPending}
                  {...form.register("phone")}
                />
              </div>
              <p className="text-xs text-slate-500">Must include country code, e.g. 918128635446</p>
              {form.formState.errors.phone ? (
                <p className="text-xs font-medium text-red-600">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="edit-user-email"
                  className="h-11 pl-10"
                  placeholder="email@example.com"
                  disabled={mutation.isPending}
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email ? (
                <p className="text-xs font-medium text-red-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Account status</Label>
              <PremiumSelect
                value={form.watch("status")}
                onChange={(value) => form.setValue("status", value || "active")}
                options={[
                  { value: "active", label: "Active" },
                  { value: "blocked", label: "Blocked" },
                ]}
                disabled={mutation.isPending}
              />
              {form.formState.errors.status ? (
                <p className="text-xs font-medium text-red-600">{form.formState.errors.status.message}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)} 
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
