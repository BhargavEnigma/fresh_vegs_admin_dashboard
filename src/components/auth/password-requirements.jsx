import { CheckCircle2, Circle } from "lucide-react";
import { getPasswordRequirements } from "../../utils/password-policy";

export function PasswordRequirements({ password = "" }) {
  return (
    <ul className="grid gap-2 text-sm sm:grid-cols-2" aria-label="Password requirements">
      {getPasswordRequirements(password).map((item) => (
        <li key={item.id} className={item.met ? "flex gap-2 text-dailyveg-700 dark:text-dailyveg-300" : "flex gap-2 text-slate-600 dark:text-slate-300"}>
          {item.met ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span><span className="sr-only">{item.met ? "Met: " : "Not met: "}</span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
