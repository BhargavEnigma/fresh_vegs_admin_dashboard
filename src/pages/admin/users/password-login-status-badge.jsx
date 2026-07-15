import { Badge } from "../../../components/ui/badge";

export function PasswordLoginStatusBadge({ user }) {
  if (user?.password_locked_until && new Date(user.password_locked_until).getTime() > Date.now()) {
    return <Badge variant="destructive">Temporarily Locked</Badge>;
  }
  return user?.password_login_enabled === true
    ? <Badge>Password Enabled</Badge>
    : user?.password_login_enabled === false
      ? <Badge variant="secondary">OTP Only</Badge>
      : <span className="text-xs text-slate-500">View details</span>;
}
