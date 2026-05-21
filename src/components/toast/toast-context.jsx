import * as React from "react";

const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = React.useState([]);

    const remove = React.useCallback((id) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    const push = React.useCallback((toast) => {
        const id = toast.id || crypto.randomUUID();
        const next = {
            id,
            variant: "default",
            title: "",
            description: "",
            durationMs: 3500,
            ...toast,
        };
        setToasts((t) => [...t, next]);
        window.setTimeout(() => remove(id), next.durationMs);
        return id;
    }, [remove]);

    const success = React.useCallback((title, description = "", options = {}) => {
        if (description && typeof description === "object") {
            return push({ variant: "success", title, ...description });
        }
        return push({ variant: "success", title, description, ...options });
    }, [push]);

    const error = React.useCallback((title, description = "", options = {}) => {
        if (description && typeof description === "object") {
            return push({ variant: "error", title, ...description });
        }
        return push({ variant: "error", title, description, ...options });
    }, [push]);

    const warning = React.useCallback((title, description = "", options = {}) => {
        if (description && typeof description === "object") {
            return push({ variant: "warning", title, ...description });
        }
        return push({ variant: "warning", title, description, ...options });
    }, [push]);

    const api = React.useMemo(
        () => ({ push, remove, success, error, warning }),
        [push, remove, success, error, warning]
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <ToastViewport toasts={toasts} onClose={remove} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

function ToastViewport({ toasts, onClose }) {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
            {toasts.map((t) => (
                <ToastCard key={t.id} toast={t} onClose={() => onClose(t.id)} />
            ))}
        </div>
    );
}

function ToastCard({ toast, onClose }) {
    const border =
        toast.variant === "success"
            ? "border-dailyveg-500/50 bg-dailyveg-50 dark:bg-dailyveg-950/70"
            : toast.variant === "error"
                ? "border-red-500/40 bg-red-50 dark:bg-red-950/30"
                : toast.variant === "warning"
                    ? "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";

    return (
        <div className={`rounded-2xl border ${border} p-4 shadow-xl shadow-slate-200/60 dark:shadow-black/30`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    {toast.title ? <div className="text-sm font-semibold">{toast.title}</div> : null}
                    {toast.description ? (
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{toast.description}</div>
                    ) : null}
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-dailyveg-100 hover:text-dailyveg-800 dark:hover:bg-dailyveg-950 dark:hover:text-dailyveg-300"
                >
                    Close
                </button>
            </div>
        </div>
    );
}