import * as React from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const PasswordField = React.forwardRef(function PasswordField({
  id,
  label,
  error,
  description,
  autoComplete = "current-password",
  value,
  onChange,
  onBlur,
  name,
  disabled,
  ...props
}, ref) {
  const [visible, setVisible] = React.useState(false);
  const [capsLock, setCapsLock] = React.useState(false);
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const capsId = `${id}-caps`;
  const describedBy = [description && helpId, error && errorId, capsLock && capsId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          {...props}
          ref={ref}
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete={autoComplete}
          className="pl-10 pr-11"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
          onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dailyveg-500/35 disabled:opacity-50 dark:hover:bg-slate-800"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {description ? <p id={helpId} className="text-xs text-slate-500">{description}</p> : null}
      {capsLock ? <p id={capsId} role="status" className="text-xs font-medium text-amber-700 dark:text-amber-300">Caps Lock is on.</p> : null}
      {error ? <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">{error.message || error}</p> : null}
    </div>
  );
});
