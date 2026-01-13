import * as React from "react";

import { cn } from "../../lib/utils";

export const Textarea = React.forwardRef(function Textarea(
    { className, ...props },
    ref
) {
    return (
        <textarea
            ref={ref}
            className={cn(
                "flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500",
                className
            )}
            {...props}
        />
    );
});